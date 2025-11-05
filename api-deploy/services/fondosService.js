const { fondosPool } = require('../config/database');

class FondosService {
  
  // Obtener lista de tablas disponibles
  async getTables() {
    try {
      const client = await fondosPool.connect();
      const result = await client.query(`
        SELECT table_name, table_type
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      client.release();
      
      return {
        success: true,
        data: result.rows,
        count: result.rowCount
      };
    } catch (error) {
      console.error('❌ Error obteniendo tablas de fondos:', error);
      throw new Error(`Error al obtener tablas: ${error.message}`);
    }
  }

  // Obtener estructura de una tabla específica
  async getTableStructure(tableName) {
    try {
      const client = await fondosPool.connect();
      
      // Validar que el nombre de tabla sea seguro
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
        throw new Error('Nombre de tabla inválido');
      }
      
      const result = await client.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      
      client.release();
      
      if (result.rowCount === 0) {
        throw new Error('Tabla no encontrada');
      }
      
      return {
        success: true,
        table: tableName,
        columns: result.rows,
        count: result.rowCount
      };
    } catch (error) {
      console.error('❌ Error obteniendo estructura de tabla:', error);
      throw new Error(`Error al obtener estructura de tabla: ${error.message}`);
    }
  }

  // Consultar datos de una tabla con paginación y filtros
  async queryTable(tableName, options = {}) {
    try {
      const client = await fondosPool.connect();
      
      // Validar nombre de tabla
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
        throw new Error('Nombre de tabla inválido');
      }

      // Parámetros de paginación
      const limit = Math.min(parseInt(options.limit) || 100, 1000); // Máximo 1000 registros
      const offset = parseInt(options.offset) || 0;
      
      // Construir consulta base
      let query = `SELECT * FROM ${tableName}`;
      let countQuery = `SELECT COUNT(*) as total FROM ${tableName}`;
      let queryParams = [];
      let paramIndex = 1;

      // Agregar filtros básicos si se proporcionan
      if (options.where && Array.isArray(options.where)) {
        const whereConditions = [];
        
        for (const condition of options.where) {
          if (condition.column && condition.value !== undefined) {
            // Validar nombre de columna
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(condition.column)) {
              continue; // Saltar condiciones inválidas
            }
            
            const operator = condition.operator || '=';
            // Solo permitir operadores seguros
            if (['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'ILIKE'].includes(operator)) {
              whereConditions.push(`${condition.column} ${operator} $${paramIndex}`);
              queryParams.push(condition.value);
              paramIndex++;
            }
          }
        }
        
        if (whereConditions.length > 0) {
          const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
          query += whereClause;
          countQuery += whereClause;
        }
      }

      // Agregar ordenamiento
      if (options.orderBy && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(options.orderBy)) {
        const order = options.order === 'DESC' ? 'DESC' : 'ASC';
        query += ` ORDER BY ${options.orderBy} ${order}`;
      }

      // Agregar límite y offset
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      // Ejecutar consultas
      const [dataResult, countResult] = await Promise.all([
        client.query(query, queryParams),
        client.query(countQuery, queryParams.slice(0, -2)) // Remover limit y offset para count
      ]);

      client.release();
      
      return {
        success: true,
        data: dataResult.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit,
          offset,
          hasMore: offset + limit < parseInt(countResult.rows[0].total)
        }
      };
      
    } catch (error) {
      console.error('❌ Error consultando tabla:', error);
      throw new Error(`Error al consultar tabla: ${error.message}`);
    }
  }

  // Buscar fondos por criterios específicos
  async searchFunds(searchTerm, options = {}) {
    try {
      const client = await fondosPool.connect();
      
      const limit = Math.min(parseInt(options.limit) || 50, 200);
      const offset = parseInt(options.offset) || 0;
      
      // Esta consulta asume que existe una tabla con información de fondos
      // Ajustar según la estructura real de la base de datos
      const query = `
        SELECT *
        FROM fondos 
        WHERE 
          nombre_fondo ILIKE $1 
          OR codigo_fondo ILIKE $1 
          OR descripcion ILIKE $1
          OR tipo_fondo ILIKE $1
        ORDER BY nombre_fondo
        LIMIT $2 OFFSET $3
      `;
      
      const searchPattern = `%${searchTerm}%`;
      const result = await client.query(query, [searchPattern, limit, offset]);
      
      client.release();
      
      return {
        success: true,
        data: result.rows,
        searchTerm,
        count: result.rowCount
      };
      
    } catch (error) {
      console.error('❌ Error buscando fondos:', error);
      // Si la tabla no existe o hay error, devolver resultado vacío
      return {
        success: true,
        data: [],
        searchTerm,
        count: 0,
        error: 'Tabla de fondos no disponible o error en consulta'
      };
    }
  }

  // Obtener resumen financiero de fondos
  async getFinancialSummary(options = {}) {
    try {
      const client = await fondosPool.connect();
      
      // Consultas para obtener resumen financiero
      // Ajustar según las tablas reales disponibles
      const queries = [
        {
          name: 'total_funds',
          query: `SELECT COUNT(*) as count FROM fondos`
        },
        {
          name: 'total_amount',
          query: `SELECT COALESCE(SUM(monto), 0) as total FROM movimientos_fondos`
        },
        {
          name: 'funds_by_type',
          query: `
            SELECT 
              tipo_fondo, 
              COUNT(*) as count,
              COALESCE(SUM(monto_total), 0) as total_amount
            FROM fondos 
            GROUP BY tipo_fondo 
            ORDER BY count DESC
          `
        }
      ];
      
      const summary = {};
      
      for (const { name, query } of queries) {
        try {
          const result = await client.query(query);
          summary[name] = name === 'funds_by_type' ? result.rows : result.rows[0];
        } catch (error) {
          summary[name] = { error: error.message };
        }
      }
      
      client.release();
      
      return {
        success: true,
        summary,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo resumen financiero:', error);
      throw new Error(`Error al obtener resumen financiero: ${error.message}`);
    }
  }

  // Obtener movimientos de fondos con filtros de fecha
  async getMovements(options = {}) {
    try {
      const client = await fondosPool.connect();
      
      const limit = parseInt(options.limit) || 10000; // Remover límite para permitir cargar todos los registros
      const offset = parseInt(options.offset) || 0;
      
      let query = `
        SELECT 
          m.*,
          f.nombre_fondo,
          f.tipo_fondo
        FROM movimientos_fondos m
        LEFT JOIN fondos f ON m.fondo_id = f.id
      `;
      
      let countQuery = `SELECT COUNT(*) as total FROM movimientos_fondos m`;
      let queryParams = [];
      let paramIndex = 1;
      let whereConditions = [];

      // Filtro por fecha de inicio
      if (options.fechaInicio) {
        whereConditions.push(`m.fecha >= $${paramIndex}`);
        queryParams.push(options.fechaInicio);
        paramIndex++;
      }

      // Filtro por fecha fin
      if (options.fechaFin) {
        whereConditions.push(`m.fecha <= $${paramIndex}`);
        queryParams.push(options.fechaFin);
        paramIndex++;
      }

      // Filtro por tipo de movimiento
      if (options.tipoMovimiento) {
        whereConditions.push(`m.tipo_movimiento = $${paramIndex}`);
        queryParams.push(options.tipoMovimiento);
        paramIndex++;
      }

      // Agregar WHERE clause si hay condiciones
      if (whereConditions.length > 0) {
        const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
        query += whereClause;
        countQuery += whereClause;
      }

      // Ordenar por fecha más reciente
      query += ` ORDER BY m.fecha DESC, m.id DESC`;
      
      // Agregar límite y offset
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      // Ejecutar consultas
      const [dataResult, countResult] = await Promise.all([
        client.query(query, queryParams),
        client.query(countQuery, queryParams.slice(0, -2))
      ]);

      client.release();
      
      return {
        success: true,
        data: dataResult.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit,
          offset,
          hasMore: offset + limit < parseInt(countResult.rows[0].total)
        },
        filters: {
          fechaInicio: options.fechaInicio,
          fechaFin: options.fechaFin,
          tipoMovimiento: options.tipoMovimiento
        }
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo movimientos:', error);
      // Si las tablas no existen, devolver resultado vacío
      return {
        success: true,
        data: [],
        pagination: { total: 0, limit, offset, hasMore: false },
        error: 'Tablas de movimientos no disponibles o error en consulta'
      };
    }
  }

  // Consultar específicamente fondos_data
  async getFondosDataInfo() {
    try {
      const client = await fondosPool.connect();
      
      // Verificar si la tabla existe
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'fondos_data'
        ) as exists;
      `;
      
      const tableExists = await client.query(tableExistsQuery);
      
      if (!tableExists.rows[0].exists) {
        client.release();
        return {
          success: false,
          exists: false,
          message: 'Tabla fondos_data no encontrada'
        };
      }
      
      // Obtener conteo total
      const countResult = await client.query('SELECT COUNT(*) as total FROM fondos_data');
      const totalRecords = parseInt(countResult.rows[0].total);
      
      // Obtener estructura de la tabla
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'fondos_data'
        ORDER BY ordinal_position;
      `;
      
      const columns = await client.query(columnsQuery);
      
      let uniqueAnalysis = {};
      
      if (totalRecords > 0) {
        // Muestra de datos
        const sample = await client.query('SELECT * FROM fondos_data LIMIT 5');
        
        // Análisis de campos únicos
        const hasRFC = columns.rows.some(col => col.column_name.toLowerCase().includes('rfc'));
        const hasCURP = columns.rows.some(col => col.column_name.toLowerCase().includes('curp'));
        const hasEmpleado = columns.rows.some(col => col.column_name.toLowerCase().includes('empleado'));
        
        if (hasRFC) {
          try {
            const uniqueRFC = await client.query('SELECT COUNT(DISTINCT rfc) as count FROM fondos_data WHERE rfc IS NOT NULL');
            uniqueAnalysis.unique_rfc = parseInt(uniqueRFC.rows[0].count);
          } catch (err) {}
        }
        
        if (hasCURP) {
          try {
            const uniqueCURP = await client.query('SELECT COUNT(DISTINCT curp) as count FROM fondos_data WHERE curp IS NOT NULL');
            uniqueAnalysis.unique_curp = parseInt(uniqueCURP.rows[0].count);
          } catch (err) {}
        }
        
        if (hasEmpleado) {
          try {
            const uniqueEmpleado = await client.query('SELECT COUNT(DISTINCT empleado_id) as count FROM fondos_data WHERE empleado_id IS NOT NULL');
            uniqueAnalysis.unique_empleado_id = parseInt(uniqueEmpleado.rows[0].count);
          } catch (err) {}
        }
        
        // Buscar otros campos de identificación únicos
        const possibleIdFields = columns.rows.filter(col => 
          col.column_name.toLowerCase().includes('id') || 
          col.column_name.toLowerCase().includes('numero')
        ).map(col => col.column_name);
        
        for (const field of possibleIdFields.slice(0, 5)) { // Limitar a 5 campos
          try {
            const uniqueCount = await client.query(`SELECT COUNT(DISTINCT ${field}) as count FROM fondos_data WHERE ${field} IS NOT NULL`);
            uniqueAnalysis[`unique_${field}`] = parseInt(uniqueCount.rows[0].count);
          } catch (err) {
            // Ignorar errores en campos específicos
          }
        }
        
        client.release();
        
        return {
          success: true,
          exists: true,
          totalRecords,
          columns: columns.rows,
          sampleData: sample.rows,
          uniqueAnalysis,
          message: `Tabla fondos_data encontrada con ${totalRecords.toLocaleString()} registros`
        };
      } else {
        client.release();
        
        return {
          success: true,
          exists: true,
          totalRecords: 0,
          columns: columns.rows,
          message: 'Tabla fondos_data existe pero está vacía'
        };
      }
      
    } catch (error) {
      console.error('❌ Error consultando fondos_data:', error);
      throw new Error(`Error al consultar fondos_data: ${error.message}`);
    }
  }

  // Consultar específicamente historico_fondos_gsau
  async getHistoricoFondosData() {
    try {
      const client = await fondosPool.connect();
      
      // Verificar si la tabla existe
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'historico_fondos_gsau'
        ) as exists;
      `;
      
      const tableExists = await client.query(tableExistsQuery);
      
      if (!tableExists.rows[0].exists) {
        // Buscar en otros esquemas
        const otherSchemasQuery = `
          SELECT table_schema, table_name 
          FROM information_schema.tables 
          WHERE table_name = 'historico_fondos_gsau'
        `;
        
        const otherSchemas = await client.query(otherSchemasQuery);
        
        client.release();
        
        return {
          success: false,
          exists: false,
          message: 'Tabla historico_fondos_gsau no encontrada en esquema public',
          otherSchemas: otherSchemas.rows
        };
      }
      
      // Obtener conteo total
      const countResult = await client.query('SELECT COUNT(*) as total FROM historico_fondos_gsau');
      const totalRecords = parseInt(countResult.rows[0].total);
      
      // Obtener estructura de la tabla
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'historico_fondos_gsau'
        ORDER BY ordinal_position;
      `;
      
      const columns = await client.query(columnsQuery);
      
      let uniqueAnalysis = {};
      
      if (totalRecords > 0) {
        // Muestra de datos
        const sample = await client.query('SELECT * FROM historico_fondos_gsau LIMIT 5');
        
        // Análisis de campos únicos
        const hasRFC = columns.rows.some(col => col.column_name.toLowerCase().includes('rfc'));
        const hasCURP = columns.rows.some(col => col.column_name.toLowerCase().includes('curp'));
        
        if (hasRFC) {
          const uniqueRFC = await client.query('SELECT COUNT(DISTINCT rfc) as count FROM historico_fondos_gsau WHERE rfc IS NOT NULL');
          uniqueAnalysis.unique_rfc = parseInt(uniqueRFC.rows[0].count);
        }
        
        if (hasCURP) {
          const uniqueCURP = await client.query('SELECT COUNT(DISTINCT curp) as count FROM historico_fondos_gsau WHERE curp IS NOT NULL');
          uniqueAnalysis.unique_curp = parseInt(uniqueCURP.rows[0].count);
        }
        
        // Buscar otros campos de identificación únicos
        const possibleIdFields = columns.rows.filter(col => 
          col.column_name.toLowerCase().includes('id') || 
          col.column_name.toLowerCase().includes('empleado') ||
          col.column_name.toLowerCase().includes('numero')
        ).map(col => col.column_name);
        
        for (const field of possibleIdFields) {
          try {
            const uniqueCount = await client.query(`SELECT COUNT(DISTINCT ${field}) as count FROM historico_fondos_gsau WHERE ${field} IS NOT NULL`);
            uniqueAnalysis[`unique_${field}`] = parseInt(uniqueCount.rows[0].count);
          } catch (err) {
            // Ignorar errores en campos específicos
          }
        }
        
        client.release();
        
        return {
          success: true,
          exists: true,
          totalRecords,
          columns: columns.rows,
          sampleData: sample.rows,
          uniqueAnalysis,
          message: `Tabla historico_fondos_gsau encontrada con ${totalRecords.toLocaleString()} registros`
        };
      } else {
        client.release();
        
        return {
          success: true,
          exists: true,
          totalRecords: 0,
          columns: columns.rows,
          message: 'Tabla historico_fondos_gsau existe pero está vacía'
        };
      }
      
    } catch (error) {
      console.error('❌ Error consultando historico_fondos_gsau:', error);
      throw new Error(`Error al consultar historico_fondos_gsau: ${error.message}`);
    }
  }

  // NUEVO: Obtener fechas FPL calculadas usando Antigüedad en Fondo
  async getFechasFPLCalculadas(rfc) {
    try {
      const client = await fondosPool.connect();
      
      console.log('🔍 Calculando fechas FPL para RFC:', rfc);
      
      // Verificar si la tabla existe
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'historico_fondos_gsau'
        ) as exists;
      `;
      
      const tableExists = await client.query(tableExistsQuery);
      
      if (!tableExists.rows[0].exists) {
        client.release();
        return {
          success: false,
          error: 'Tabla historico_fondos_gsau no encontrada',
          data: []
        };
      }
      
      // Identificar columna de Antigüedad en Fondo
      const allColumnsQuery = `
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'historico_fondos_gsau'
        ORDER BY ordinal_position
      `;
      
      const allColumnsResult = await client.query(allColumnsQuery);
      console.log('📋 Columnas disponibles:', allColumnsResult.rows.map(r => r.column_name).join(', '));
      
      let antiguedadColumn = null;
      
      // Estrategia 1: Buscar por nombre exacto
      const exactNames = [
        'Antiguedad en Fondo', 'ANTIGUEDAD EN FONDO', 'antiguedad_en_fondo',
        'AntiguedadEnFondo', 'antiguedad_fondo', 'AntiguedadFondo',
        'ant_fondo', 'Ant Fondo', 'ANT FONDO'
      ];
      
      for (const exactName of exactNames) {
        const found = allColumnsResult.rows.find(row => row.column_name === exactName);
        if (found) {
          antiguedadColumn = found.column_name;
          console.log(`✅ Columna encontrada: "${antiguedadColumn}"`);
          break;
        }
      }
      
      // Estrategia 2: Buscar por palabras clave
      if (!antiguedadColumn) {
        const keywordMatches = allColumnsResult.rows.filter(row => {
          const colLower = row.column_name.toLowerCase();
          return colLower.includes('antiguedad') || colLower.includes('fondo');
        });
        
        if (keywordMatches.length > 0) {
          antiguedadColumn = keywordMatches[0].column_name;
          console.log(`✅ Columna encontrada por palabras clave: "${antiguedadColumn}"`);
        }
      }
      
      // Estrategia 3: Analizar columnas numéricas
      if (!antiguedadColumn) {
        const numericColumns = allColumnsResult.rows.filter(row => 
          ['numeric', 'double precision', 'real', 'integer', 'smallint', 'bigint'].includes(row.data_type) &&
          !['numrfc', 'fecpla'].includes(row.column_name.toLowerCase())
        );
        
        for (const numCol of numericColumns.slice(0, 5)) {
          try {
            const analysisQuery = `
              SELECT 
                COUNT(*) FILTER (WHERE "${numCol.column_name}" > 0) as positivos,
                MIN("${numCol.column_name}") as min_val,
                MAX("${numCol.column_name}") as max_val,
                AVG("${numCol.column_name}") as avg_val
              FROM historico_fondos_gsau
              WHERE "${numCol.column_name}" IS NOT NULL
            `;
            
            const analysisResult = await client.query(analysisQuery);
            const stats = analysisResult.rows[0];
            
            // Si parece datos de años (rango 0-50, promedio razonable)
            if (stats.positivos > 0 && stats.min_val >= 0 && stats.max_val <= 50 && stats.avg_val <= 15) {
              antiguedadColumn = numCol.column_name;
              console.log(`✅ Columna detectada por análisis: "${antiguedadColumn}"`);
              console.log(`   📊 Estadísticas: ${stats.positivos} registros, rango: ${stats.min_val}-${stats.max_val}`);
              break;
            }
          } catch (e) {
            // Continuar con siguiente columna
          }
        }
      }
      
      if (!antiguedadColumn) {
        client.release();
        return {
          success: false,
          error: 'No se encontró la columna de Antigüedad en Fondo',
          availableColumns: allColumnsResult.rows.map(r => r.column_name)
        };
      }
      
      // Consulta con cálculo de fechas FPL
      const query = `
        SELECT 
          fecpla,
          "${antiguedadColumn}" as antiguedad_anos_raw,
          CAST("${antiguedadColumn}" AS NUMERIC) as antiguedad_anos,
          (fecpla + INTERVAL '1 day' * (CAST(COALESCE("${antiguedadColumn}", 0) AS NUMERIC) * 365.25))::date as fecha_fpl_base,
          CASE 
            WHEN EXTRACT(DAY FROM (fecpla + INTERVAL '1 day' * (CAST(COALESCE("${antiguedadColumn}", 0) AS NUMERIC) * 365.25))::date) >= 28 
            THEN DATE_TRUNC('month', (fecpla + INTERVAL '1 day' * (CAST(COALESCE("${antiguedadColumn}", 0) AS NUMERIC) * 365.25))::date) + INTERVAL '1 month'
            ELSE (fecpla + INTERVAL '1 day' * (CAST(COALESCE("${antiguedadColumn}", 0) AS NUMERIC) * 365.25))::date
          END as fecha_fpl_calculada
        FROM historico_fondos_gsau
        WHERE (rfc = $1 OR "RFC" = $1 OR numrfc = $1)
          AND fecpla IS NOT NULL
          AND "${antiguedadColumn}" IS NOT NULL
          AND CAST("${antiguedadColumn}" AS NUMERIC) >= 0
        ORDER BY CAST("${antiguedadColumn}" AS NUMERIC) ASC, fecha_fpl_calculada DESC
      `;
      
      console.log(`🔍 Ejecutando cálculo FPL para RFC: ${rfc}`);
      console.log(`📊 Columna de antigüedad: ${antiguedadColumn}`);
      
      const result = await client.query(query, [rfc]);
      
      client.release();
      
      if (result.rows.length === 0) {
        return {
          success: true,
          data: [],
          message: `No se encontraron datos para cálculo FPL del RFC: ${rfc}`
        };
      }
      
      console.log(`📈 Registros encontrados para cálculo: ${result.rows.length}`);
      
      // Procesar fechas calculadas
      const fechasCalculadas = new Map();
      
      result.rows.forEach((row, index) => {
        const fechaBase = row.fecpla;
        const antiguedadAnos = parseFloat(row.antiguedad_anos) || 0;
        const fechaCalculada = row.fecha_fpl_calculada;
        
        console.log(`${index + 1}: Base: ${fechaBase}, +${antiguedadAnos} años = FPL: ${fechaCalculada}`);
        
        const fechaKey = fechaCalculada.toISOString().split('T')[0];
        
        if (!fechasCalculadas.has(fechaKey)) {
          fechasCalculadas.set(fechaKey, {
            fechaCalculada: fechaCalculada,
            fechaBase: fechaBase,
            antiguedadAnos: antiguedadAnos,
            count: 0
          });
        }
        
        fechasCalculadas.get(fechaKey).count++;
      });
      
      const uniqueFechas = Array.from(fechasCalculadas.values())
        .sort((a, b) => new Date(b.fechaCalculada) - new Date(a.fechaCalculada));
      
      console.log(`📅 Fechas FPL únicas calculadas: ${uniqueFechas.length}`);
      
      return {
        success: true,
        data: uniqueFechas.map(item => ({
          value: item.fechaCalculada.toISOString().split('T')[0],
          label: item.fechaCalculada.toISOString().split('T')[0],
          count: item.count,
          metadata: {
            fechaBase: item.fechaBase.toISOString().split('T')[0],
            antiguedadAnos: item.antiguedadAnos,
            calculoAplicado: `${item.fechaBase.toISOString().split('T')[0]} + ${item.antiguedadAnos} años`,
            originalFecpla: item.fechaBase.toISOString().split('T')[0],
            originalAntiguedad: item.antiguedadAnos
          }
        }))
      };
      
    } catch (error) {
      console.error('❌ Error en cálculo de fechas FPL:', error);
      throw new Error(`Error calculando fechas FPL: ${error.message}`);
    }
  }

  // Obtener datos FPL específicos por RFC desde historico_fondos_gsau
  async getFPLDataByRFC(rfc, cveper = null) {
    try {
      const client = await fondosPool.connect();
      
      console.log('🏦 Consultando FPL data por RFC:', rfc, 'Fecha:', cveper);
      
      // Verificar si la tabla existe
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'historico_fondos_gsau'
        ) as exists;
      `;
      
      const tableExists = await client.query(tableExistsQuery);
      
      if (!tableExists.rows[0].exists) {
        client.release();
        return {
          success: false,
          error: 'Tabla historico_fondos_gsau no encontrada',
          data: []
        };
      }
      
      // Construir consulta para buscar por RFC
      let query = `SELECT * FROM historico_fondos_gsau WHERE `;
      let queryParams = [];
      let paramIndex = 1;
      let whereConditions = [];
      
      // Buscar por RFC (puede estar en diferentes columnas)
      whereConditions.push(`(
        rfc = $${paramIndex} OR 
        "RFC" = $${paramIndex} OR 
        numrfc = $${paramIndex} OR 
        numero_rfc = $${paramIndex}
      )`);
      queryParams.push(rfc);
      paramIndex++;
      
      // Filtro por fecha FPL calculada - CONVERTIR A FACTORIAL DE ANTIGÜEDAD EN FONDO
      if (cveper) {
        console.log('🗓️ Procesando filtro de fecha FPL calculada (convertir a factorial):', cveper);
        
        // Normalizar fecha de entrada a formato YYYY-MM-DD
        let fechaFPL = cveper;
        if (typeof fechaFPL === 'string') {
          // Remover componente de tiempo si existe
          if (fechaFPL.includes('T')) {
            fechaFPL = fechaFPL.split('T')[0];
          }
          // Validar formato YYYY-MM-DD
          if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaFPL)) {
            console.warn('⚠️ Formato de fecha FPL no válido:', fechaFPL);
          }
        }
        
        console.log('📅 Fecha FPL para convertir a factorial de antigüedad:', fechaFPL);
        
        // Identificar columna de Antigüedad en Fondo dinámicamente
        const antiguedadColumnQuery = `
          SELECT column_name
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'historico_fondos_gsau'
          AND (
            column_name = 'Antiguedad en Fondo' OR 
            column_name = 'ANTIGUEDAD EN FONDO' OR
            column_name = 'antiguedad_en_fondo' OR
            column_name ILIKE '%antiguedad%fondo%' OR
            column_name ILIKE '%ant%fondo%'
          )
          LIMIT 1
        `;
        
        const antiguedadCol = await client.query(antiguedadColumnQuery);
        let antiguedadColumn = 'Antiguedad en Fondo'; // Default más probable
        
        if (antiguedadCol.rows.length > 0) {
          antiguedadColumn = antiguedadCol.rows[0].column_name;
          console.log('✅ Columna de antigüedad encontrada:', antiguedadColumn);
        } else {
          console.log('⚠️ Usando columna de antigüedad por defecto:', antiguedadColumn);
        }
        
        // METODOLOGÍA CORRECTA: Calcular factorial de antigüedad desde fecha FPL
        // Si fecha FPL se calculó como: fechaBase + (factorial * 365.25 días)
        // Entonces: factorial = (fechaFPL - fechaBase) / 365.25 días
        // Donde: 1.0 = 1 año, 0.5 = 6 meses, 2.5 = 2 años y 6 meses, etc.
        
        console.log(`🔢 Búsqueda por factorial de antigüedad usando columna: ${antiguedadColumn}`);
        
        // Buscar registros donde el factorial de antigüedad coincida
        // Usamos un rango de tolerancia de ±0.1 años (~36 días) para compensar redondeo
        whereConditions.push(`(
          (
            fecpla IS NOT NULL AND \"${antiguedadColumn}\" IS NOT NULL AND
            ABS(
              EXTRACT(EPOCH FROM ($${paramIndex}::date - fecpla::date)) / (365.25 * 24 * 3600) - 
              CAST(\"${antiguedadColumn}\" AS NUMERIC)
            ) <= 0.1
          )
        )`);
        queryParams.push(fechaFPL);
        paramIndex++;
        
        console.log('📋 Ejemplo de cálculo factorial:');
        console.log('  - Fecha FPL:', fechaFPL);
        console.log('  - Si fechaBase = "2020-01-01" y fechaFPL = "2022-07-01"');
        console.log('  - Factorial = (2022-07-01 - 2020-01-01) / 365.25 = ~2.5 años');
        console.log('  - Buscará registros donde "' + antiguedadColumn + '" = 2.5 (±0.1)');
      }
      
      query += whereConditions.join(' AND ');
      query += ` ORDER BY cveper DESC, fecha_calculo DESC`;
      query += ` LIMIT 100`; // Limitar resultados para evitar sobrecarga
      
      console.log('📊 Ejecutando consulta FPL:', query);
      console.log('📊 Parámetros:', queryParams);
      
      const result = await client.query(query, queryParams);
      
      client.release();
      
      if (result.rows.length === 0) {
        return {
          success: true,
          data: [],
          message: `No se encontraron datos FPL para RFC: ${rfc}`,
          filters: { rfc, cveper }
        };
      }
      
      // Log detallado para debugging
      console.log(`🏦 Datos FPL encontrados: ${result.rows.length} registros`);
      if (result.rows.length > 0) {
        console.log('🔍 PRIMER REGISTRO FPL - TODAS LAS PROPIEDADES:');
        console.log('📋 Total propiedades:', Object.keys(result.rows[0]).length);
        console.log('📝 Lista de propiedades:', Object.keys(result.rows[0]));
        console.log('💾 Objeto completo:', result.rows[0]);
      }
      
      return {
        success: true,
        data: result.rows,
        count: result.rows.length,
        filters: { rfc, cveper },
        message: `Encontrados ${result.rows.length} registros FPL para RFC: ${rfc}`
      };
      
    } catch (error) {
      console.error('❌ Error consultando datos FPL por RFC:', error);
      throw new Error(`Error al consultar datos FPL: ${error.message}`);
    }
  }

  // Obtener estadísticas básicas de fondos
  async getStats() {
    try {
      const client = await fondosPool.connect();
      
      const queries = [
        {
          name: 'tables_count',
          query: `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
        },
        {
          name: 'database_size',
          query: `SELECT pg_size_pretty(pg_database_size(current_database())) as size`
        }
      ];
      
      const stats = {};
      
      for (const { name, query } of queries) {
        try {
          const result = await client.query(query);
          stats[name] = result.rows[0];
        } catch (error) {
          stats[name] = { error: error.message };
        }
      }
      
      client.release();
      
      return {
        success: true,
        stats,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }
}

module.exports = new FondosService();

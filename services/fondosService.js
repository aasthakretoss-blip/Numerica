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
      
      const limit = Math.min(parseInt(options.limit) || 100, 500);
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

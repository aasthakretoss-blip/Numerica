const { nominasPool } = require('../config/database');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class NominasService {
  constructor() {
    this.puestoCategorizadoMap = null; // Cache para la tabla de categorizaciones
    this.loadPuestoCategorizado(); // Cargar automáticamente al inicializar
  }
  
  // Cargar la tabla de categorización de puestos desde CSV
  async loadPuestoCategorizado() {
    try {
      const csvPath = path.join(__dirname, '../data/Puesto_Index.csv');
      
      if (!fs.existsSync(csvPath)) {
        console.warn('⚠️ Archivo Puesto_Index.csv no encontrado, creando mapa por defecto');
        this.puestoCategorizadoMap = new Map();
        return;
      }

      this.puestoCategorizadoMap = new Map();
      
      return new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
          .pipe(csv())
          .on('data', (row) => {
            const puesto = row.Puesto?.trim();
            const categoria = row['Puesto Categorizado']?.trim();
            if (puesto && categoria) {
              this.puestoCategorizadoMap.set(puesto.toUpperCase(), categoria);
            }
          })
          .on('end', () => {
            console.log(`✅ Cargadas ${this.puestoCategorizadoMap.size} categorizaciones de puestos`);
            resolve();
          })
          .on('error', (error) => {
            console.error('❌ Error cargando Puesto_Index.csv:', error);
            this.puestoCategorizadoMap = new Map();
            reject(error);
          });
      });
    } catch (error) {
      console.error('❌ Error inicializando categorización de puestos:', error);
      this.puestoCategorizadoMap = new Map();
    }
  }

  // Obtener categoría de un puesto específico
  getPuestoCategorizado(puesto) {
    if (!this.puestoCategorizadoMap || !puesto) {
      return 'Sin Categorizar';
    }
    
    const puestoUpper = puesto.trim().toUpperCase();
    return this.puestoCategorizadoMap.get(puestoUpper) || 'Sin Categorizar';
  }

  // Obtener todas las categorías únicas disponibles
  getPuestosCategorias() {
    if (!this.puestoCategorizadoMap) {
      return ['Sin Categorizar'];
    }
    
    const categorias = [...new Set(this.puestoCategorizadoMap.values())];
    return categorias.sort();
  }

  // Obtener todos los puestos que pertenecen a una categoría específica
  getPuestosPorCategoria(categoria) {
    if (!this.puestoCategorizadoMap || !categoria) {
      return [];
    }
    
    const puestos = [];
    for (const [puesto, cat] of this.puestoCategorizadoMap.entries()) {
      if (cat === categoria) {
        // Retornar los puestos en el formato original (tal como aparecen en la BD)
        puestos.push(puesto);
      }
    }
    
    return puestos;
  }
  
  // Obtener lista de tablas disponibles
  async getTables() {
    try {
      const client = await nominasPool.connect();
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
      console.error('❌ Error obteniendo tablas de nóminas:', error);
      throw new Error(`Error al obtener tablas: ${error.message}`);
    }
  }

  // Obtener estructura de una tabla específica
  async getTableStructure(tableName) {
    try {
      const client = await nominasPool.connect();
      
      // Validar que el nombre de tabla sea seguro (solo letras, números y guiones bajos)
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
      const client = await nominasPool.connect();
      
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

  // Buscar empleados (función específica para búsquedas comunes)
  async searchEmployees(searchTerm, options = {}) {
    try {
      const client = await nominasPool.connect();
      
      const limit = Math.min(parseInt(options.limit) || 50, 200);
      const offset = parseInt(options.offset) || 0;
      
      // Esta consulta asume que existe una tabla con información de empleados
      // Ajustar según la estructura real de la base de datos
      const query = `
        SELECT *
        FROM empleados 
        WHERE 
          nombre ILIKE $1 
          OR apellido ILIKE $1 
          OR numero_empleado::text ILIKE $1
          OR cedula ILIKE $1
        ORDER BY apellido, nombre
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
      console.error('❌ Error buscando empleados:', error);
      // Si la tabla no existe o hay error, devolver resultado vacío
      return {
        success: true,
        data: [],
        searchTerm,
        count: 0,
        error: 'Tabla de empleados no disponible o error en consulta'
      };
    }
  }

  // Obtener valores únicos de una columna específica
  async getUniqueValues(tableName, columnName, options = {}) {
    try {
      const client = await nominasPool.connect();
      
      // Validar nombres de tabla y columna
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName) || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(columnName)) {
        throw new Error('Nombre de tabla o columna inválido');
      }

      const limit = parseInt(options.limit) || 50000; // Remover límite para permitir cargar todos los registros
      const searchTerm = options.search ? `%${options.search}%` : null;
      
      let query = `
        SELECT DISTINCT ${columnName} as value, COUNT(*) as count
        FROM ${tableName} 
        WHERE ${columnName} IS NOT NULL
      `;
      
      let queryParams = [];
      let paramIndex = 1;
      
      if (searchTerm) {
        query += ` AND ${columnName}::text ILIKE $${paramIndex}`;
        queryParams.push(searchTerm);
        paramIndex++;
      }
      
      query += `
        GROUP BY ${columnName}
        ORDER BY count DESC, ${columnName}
        LIMIT $${paramIndex}
      `;
      queryParams.push(limit);
      
      const result = await client.query(query, queryParams);
      client.release();
      
      return {
        success: true,
        data: result.rows,
        column: columnName,
        table: tableName,
        count: result.rowCount
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo valores únicos:', error);
      throw new Error(`Error al obtener valores únicos: ${error.message}`);
    }
  }

  // Obtener último periodo disponible
  async getLatestPeriod() {
    try {
      const client = await nominasPool.connect();
      
      const result = await client.query(`
        SELECT MAX(cveper) as latest_period
        FROM historico_nominas_gsau
        WHERE cveper IS NOT NULL
      `);
      
      client.release();
      
      return {
        success: true,
        latestPeriod: result.rows[0]?.latest_period || null
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo último periodo:', error);
      // Devolver un valor por defecto si hay error
      return {
        success: false,
        latestPeriod: null,
        error: error.message
      };
    }
  }

  // Obtener datos de empleados con filtros avanzados
  async getEmployeesData(filters = {}) {
    try {
      const client = await nominasPool.connect();
      
      const limit = Math.min(parseInt(filters.limit) || 100, 1000);
      const offset = parseInt(filters.offset) || 0;
      
      // Query base usando la tabla real historico_nominas_gsau
      let query = `
        SELECT 
          "CURP" as curp,
          "Nombre completo" as nombre,
          "Puesto" as puesto,
          "Compañía" as sucursal,
          DATE(cveper)::text as periodo,
          "Mes" as mes,
          COALESCE(" SUELDO CLIENTE ", 0) as sueldo,
          COALESCE(" COMISIONES CLIENTE ", 0) + COALESCE(" COMISIONES FACTURADAS ", 0) as comisiones,
          COALESCE(" TOTAL DE PERCEPCIONES ", 0) as "totalPercepciones",
          CASE 
            WHEN "Status" = 'A' THEN 'Activo'
            WHEN "Status" = 'B' THEN 'Baja'
            WHEN "Status" = 'F' THEN 'Finiquito'
            ELSE 'N/A'
          END as estado
        FROM historico_nominas_gsau
        WHERE 1=1
      `;
      
      let countQuery = `SELECT COUNT(*) as total FROM historico_nominas_gsau WHERE 1=1`;
      let queryParams = [];
      let paramIndex = 1;
      
      // Aplicar filtros usando los nombres reales de columnas
      if (filters.search) {
        const searchPattern = `%${filters.search}%`;
        query += ` AND ("Nombre completo" ILIKE $${paramIndex} OR "CURP" ILIKE $${paramIndex})`;
        countQuery += ` AND ("Nombre completo" ILIKE $${paramIndex} OR "CURP" ILIKE $${paramIndex})`;
        queryParams.push(searchPattern);
        paramIndex++;
      }
      
      if (filters.puesto) {
        query += ` AND "Puesto" ILIKE $${paramIndex}`;
        countQuery += ` AND "Puesto" ILIKE $${paramIndex}`;
        queryParams.push(`%${filters.puesto}%`);
        paramIndex++;
      }
      
      if (filters.compania) {
        query += ` AND "Compañía" ILIKE $${paramIndex}`;
        countQuery += ` AND "Compañía" ILIKE $${paramIndex}`;
        queryParams.push(`%${filters.compania}%`);
        paramIndex++;
      }
      
      if (filters.status) {
        query += ` AND "Status" = $${paramIndex}`;
        countQuery += ` AND "Status" = $${paramIndex}`;
        queryParams.push(filters.status);
        paramIndex++;
      }
      
      // ✅ DEFAULT: ASC order by periodo (cveper ASC) - as requested by user
      query += ` ORDER BY cveper ASC, "Nombre completo" ASC`;
      
      // Paginación
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
        filters: filters
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo datos de empleados:', error);
      throw new Error(`Error al obtener datos de empleados: ${error.message}`);
    }
  }

  // Obtener datos de nómina formateados para el frontend con filtros múltiples
  async getPayrollData(options = {}) {
    try {
      const client = await nominasPool.connect();
      
      // Validar y limitar parámetros de paginación para manejar grandes volúmenes
      const pageSize = Math.min(Math.max(parseInt(options.pageSize) || 100, 1), 1000); // Entre 1 y 1000
      const page = Math.max(parseInt(options.page) || 1, 1);
      const offset = (page - 1) * pageSize;
      
      console.log(`🔍 Solicitando página ${page}, tamaño ${pageSize}, offset ${offset}`);
      
      // Query base para obtener datos de la tabla historico_nominas_gsau
      // MAPEO ACTUALIZADO: Empleado=Nombre completo, CURP=CURP, Puesto=Puesto, Sucursal=Compañía, Período=cveper (solo fecha)
      let query = `
        SELECT 
          "CURP" as curp,
          "Nombre completo" as nombre,
          "Puesto" as puesto,
          "Compañía" as sucursal,
          "RFC" as rfc,
          TO_CHAR(cveper, 'YYYY-MM-DD') as periodo,
          TO_CHAR(cveper, 'YYYY-MM-DD') as mes,
          COALESCE(" SUELDO CLIENTE ", 0) as sueldo,
          COALESCE(" SUELDO CLIENTE ", 0) as salary,
          COALESCE(" COMISIONES CLIENTE ", 0) as "comisionesCliente",
          COALESCE(" COMISIONES FACTURADAS ", 0) as "comisionesFacturadas",
          COALESCE(" COMISIONES CLIENTE ", 0) + COALESCE(" COMISIONES FACTURADAS ", 0) as comisiones,
          COALESCE(" COMISIONES CLIENTE ", 0) + COALESCE(" COMISIONES FACTURADAS ", 0) as commissions,
          COALESCE(" TOTAL DE PERCEPCIONES ", 0) as totalpercepciones,
          COALESCE(" TOTAL DE PERCEPCIONES ", 0) as "totalPercepciones",
          COALESCE(" TOTAL DE PERCEPCIONES ", 0) as " TOTAL DE PERCEPCIONES ",
          CASE 
            WHEN "Status" = 'A' THEN 'Activo'
            WHEN "Status" = 'B' THEN 'Baja'
            WHEN "Status" = 'F' THEN 'Finiquito'
            ELSE 'N/A'
          END as estado
        FROM historico_nominas_gsau
        WHERE 1=1
      `;
      let countQuery = `SELECT COUNT(*) as total FROM historico_nominas_gsau WHERE 1=1`;
      let queryParams = [];
      let paramIndex = 1;
      
      // MEJORADO: Búsqueda por nombre completo O CURP indistintamente
      if (options.search) {
        const searchPattern = `%${options.search}%`;
        query += ` AND ("Nombre completo" ILIKE $${paramIndex} OR "CURP" ILIKE $${paramIndex})`;
        countQuery += ` AND ("Nombre completo" ILIKE $${paramIndex} OR "CURP" ILIKE $${paramIndex})`;
        queryParams.push(searchPattern);
        paramIndex++;
      }
      
      // MEJORADO: Soporte para filtros múltiples de puestos
      if (options.puesto) {
        if (Array.isArray(options.puesto)) {
          const puestoConditions = options.puesto.map((_, index) => `$${paramIndex + index}`).join(', ');
          query += ` AND "Puesto" IN (${puestoConditions})`;
          countQuery += ` AND "Puesto" IN (${puestoConditions})`;
          queryParams.push(...options.puesto);
          paramIndex += options.puesto.length;
        } else {
          query += ` AND "Puesto" ILIKE $${paramIndex}`;
          countQuery += ` AND "Puesto" ILIKE $${paramIndex}`;
          queryParams.push(`%${options.puesto}%`);
          paramIndex++;
        }
      }
      
      // MEJORADO: Soporte para filtros múltiples de sucursales
      if (options.sucursal) {
        if (Array.isArray(options.sucursal)) {
          const sucursalConditions = options.sucursal.map((_, index) => `$${paramIndex + index}`).join(', ');
          query += ` AND "Compañía" IN (${sucursalConditions})`;
          countQuery += ` AND "Compañía" IN (${sucursalConditions})`;
          queryParams.push(...options.sucursal);
          paramIndex += options.sucursal.length;
        } else {
          query += ` AND "Compañía" ILIKE $${paramIndex}`;
          countQuery += ` AND "Compañía" ILIKE $${paramIndex}`;
          queryParams.push(`%${options.sucursal}%`);
          paramIndex++;
        }
      }
      
      // MEJORADO: Soporte para filtros múltiples de estados (incluyendo 'Finiquito')
      if (options.status) {
        if (Array.isArray(options.status)) {
          // Mapear estados de frontend a códigos de base de datos
          const statusCodes = options.status.map(estado => {
            switch(estado) {
              case 'Activo': return 'A';
              case 'Baja': return 'B';
              case 'Finiquito': return 'F';
              default: return estado; // Por si viene el código directo
            }
          });
          const statusConditions = statusCodes.map((_, index) => `$${paramIndex + index}`).join(', ');
          query += ` AND "Status" IN (${statusConditions})`;
          countQuery += ` AND "Status" IN (${statusConditions})`;
          queryParams.push(...statusCodes);
          paramIndex += statusCodes.length;
        } else {
          // Mapear estado individual
          let statusCode = options.status;
          switch(options.status) {
            case 'Activo': statusCode = 'A'; break;
            case 'Baja': statusCode = 'B'; break;
            case 'Finiquito': statusCode = 'F'; break;
          }
          query += ` AND "Status" = $${paramIndex}`;
          countQuery += ` AND "Status" = $${paramIndex}`;
          queryParams.push(statusCode);
          paramIndex++;
        }
      }
      
      // ACTUALIZADO: Filtrar por período usando cveper (acepta formato YYYY-MM-DD)
      if (options.cveper) {
        // Si viene en formato YYYY-MM-DD, comparar solo la fecha
        if (options.cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
          query += ` AND DATE(cveper) = $${paramIndex}`;
          countQuery += ` AND DATE(cveper) = $${paramIndex}`;
          queryParams.push(options.cveper);
        } else {
          // Si viene en formato timestamp completo
          query += ` AND cveper = $${paramIndex}`;
          countQuery += ` AND cveper = $${paramIndex}`;
          queryParams.push(options.cveper);
        }
        paramIndex++;
      }
      
      // NUEVO: Ordenamiento dinámico (server-side sorting)
      
      // 🔍 LOG: Show sorting options received
      console.log('\n\n═══════════════════════════════════════════════════════════════');
      console.log('🔍 [SORTING DEBUG - nominasService START] Sorting Configuration:');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📋 options.orderBy:', options.orderBy || 'UNDEFINED (will use default)');
      console.log('📋 options.orderDirection:', options.orderDirection || 'UNDEFINED (will use default)');
      console.log('📋 options.page:', options.page);
      console.log('📋 options.pageSize:', options.pageSize);
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      let orderClause = '';
      if (options.orderBy) {
        console.log('🎯 Configurando ordenamiento:', { orderBy: options.orderBy, orderDirection: options.orderDirection });
        
        // Mapear campos del frontend a columnas de la base de datos
        // IMPORTANTE: Convertir a NUMERIC para campos monetarios para ordenamiento correcto
        const fieldMapping = {
          'nombre': '"Nombre completo"',
          'curp': '"CURP"',
          'puesto': '"Puesto"',
          'sucursal': '"Compa\u00f1\u00eda"',
          'periodo': 'cveper',  // Sort by full timestamp for periodo
          'mes': 'cveper',  // Sort by full timestamp for mes
          'fecha': 'cveper',  // Sort by full timestamp
          'cveper': 'cveper',  // Direct cveper sorting
          // ✅ FIXED: Salario/Salary/Sueldo sorting - MUST match SELECT query exactly (line 484)
          // SELECT uses: COALESCE(" SUELDO CLIENTE ", 0) - but ORDER BY needs ::NUMERIC for proper sorting
          'salario': 'COALESCE(" SUELDO CLIENTE "::NUMERIC, 0)',
          'salary': 'COALESCE(" SUELDO CLIENTE "::NUMERIC, 0)',
          'sueldo': 'COALESCE(" SUELDO CLIENTE "::NUMERIC, 0)',
          // ✅ FIXED: Comisiones sorting - MUST match SELECT query exactly (line 488)
          // SELECT uses: COALESCE(" COMISIONES CLIENTE ", 0) + COALESCE(" COMISIONES FACTURADAS ", 0)
          'comisiones': '(COALESCE(" COMISIONES CLIENTE "::NUMERIC, 0) + COALESCE(" COMISIONES FACTURADAS "::NUMERIC, 0))',
          'commissions': '(COALESCE(" COMISIONES CLIENTE "::NUMERIC, 0) + COALESCE(" COMISIONES FACTURADAS "::NUMERIC, 0))',
          // ✅ FIXED: Total Percepciones sorting - MUST match SELECT query exactly (line 490)
          // SELECT uses: COALESCE(" TOTAL DE PERCEPCIONES ", 0)
          'percepcionestotales': 'COALESCE(" TOTAL DE PERCEPCIONES "::NUMERIC, 0)',
          'totalpercepciones': 'COALESCE(" TOTAL DE PERCEPCIONES "::NUMERIC, 0)',
          'costoNomina': 'CAST("COSTO DE NOMINA" AS NUMERIC)',
          'estado': '"Status"',
          'status': '"Status"'
        };
        
        // Normalize orderBy field name
        const normalizedOrderBy = String(options.orderBy || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const dbField = fieldMapping[normalizedOrderBy];
        
        // 🔍 LOG: Show what field mapping is being used
        console.log('\n🔵 [FIELD MAPPING DEBUG - nominasService]');
        console.log('🔵 Original orderBy:', options.orderBy);
        console.log('🔵 Normalized orderBy:', normalizedOrderBy);
        console.log('🔵 Mapped to dbField:', dbField || 'NOT FOUND IN MAPPING');
        if (dbField) {
          const direction = options.orderDirection === 'desc' ? 'DESC' : 'ASC';
          orderClause = ` ORDER BY ${dbField} ${direction}`;
          console.log('✅ Clausula ORDER BY generada:', orderClause);
        } else {
          // Default ordering - ASC by periodo
          orderClause = ` ORDER BY cveper ASC, "Nombre completo" ASC`;
          console.log('⚠️ Campo no reconocido, usando orden por defecto:', orderClause);
        }
      } else {
        // ✅ DEFAULT: ASC order by periodo (cveper ASC) - as requested by user
        orderClause = ` ORDER BY cveper ASC, "Nombre completo" ASC`;
      }
      
      query += orderClause;
      
      // Paginación
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      const finalParams = [...queryParams, pageSize, offset];
      
      // 🔍 DETAILED LOGGING: Show complete query structure - ALWAYS LOG THIS
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('🔍 [SORTING DEBUG - nominasService FINAL] Complete Query Structure:');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📋 Order By Field:', options.orderBy || 'DEFAULT (periodo ASC)');
      console.log('📋 Order Direction:', options.orderDirection || 'ASC (default)');
      console.log('📋 ORDER BY Clause:', orderClause);
      console.log('📋 Pagination:', JSON.stringify({ page, pageSize, offset }, null, 2));
      console.log('📋 Total Query Params (before pagination):', queryParams.length);
      console.log('📋 Final Params Count (with pagination):', finalParams.length);
      console.log('═══════════════════════════════════════════════════════════════');
      
      // 🔍 LOG COMPLETE FINAL QUERY - Show ORDER BY and LIMIT/OFFSET position
      const orderByIndex = query.indexOf('ORDER BY');
      const limitIndex = query.indexOf('LIMIT');
      const orderBySection = orderByIndex !== -1 ? query.substring(orderByIndex, limitIndex !== -1 ? limitIndex : query.length).trim() : 'NOT FOUND';
      const limitSection = limitIndex !== -1 ? query.substring(limitIndex).trim() : 'NOT FOUND';
      
      console.log('\n📝 [QUERY STRUCTURE] Ordering and Pagination:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ ORDER BY Position:', orderByIndex !== -1 ? `Found at index ${orderByIndex}` : '❌ NOT FOUND');
      console.log('✅ ORDER BY Section:', orderBySection);
      console.log('✅ LIMIT/OFFSET Position:', limitIndex !== -1 ? `Found at index ${limitIndex}` : '❌ NOT FOUND');
      console.log('✅ LIMIT/OFFSET Section:', limitSection);
      console.log('✅ VERIFICATION: ORDER BY comes BEFORE LIMIT:', orderByIndex !== -1 && limitIndex !== -1 && orderByIndex < limitIndex ? '✅ YES - CORRECT!' : '❌ NO - WRONG ORDER!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Show full query (truncated)
      const queryPreview = query.length > 3000 ? query.substring(0, 3000) + '\n... [TRUNCATED - Query is ' + query.length + ' chars long]' : query;
      console.log('\n📝 [FINAL QUERY - nominasService] Complete SQL Query:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(queryPreview);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 Final Parameters:', JSON.stringify(finalParams, null, 2));
      console.log('═══════════════════════════════════════════════════════════════\n\n');
      
      // Ejecutar consultas
      const [dataResult, countResult] = await Promise.all([
        client.query(query, finalParams),
        client.query(countQuery, queryParams)
      ]);
      
      client.release();
      
      // Agregar categorización de puestos a los datos
      const enrichedData = dataResult.rows.map(employee => ({
        ...employee,
        puestoCategorizado: this.getPuestoCategorizado(employee.puesto)
      }));
      
      // Si hay filtro por puesto categorizado, aplicarlo después de la consulta
      let filteredData = enrichedData;
      if (options.puestoCategorizado) {
        if (Array.isArray(options.puestoCategorizado)) {
          filteredData = enrichedData.filter(emp => 
            options.puestoCategorizado.includes(emp.puestoCategorizado)
          );
        } else {
          filteredData = enrichedData.filter(emp => 
            emp.puestoCategorizado === options.puestoCategorizado
          );
        }
      }
      
      return {
        success: true,
        data: filteredData,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          page,
          pageSize,
          totalPages: Math.ceil(parseInt(countResult.rows[0].total) / pageSize)
        }
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo datos de nómina:', error);
      throw new Error(`Error al obtener datos de nómina: ${error.message}`);
    }
  }

  // Obtener periodos únicos para dropdown de filtros (desde columna cveper)
  async getUniquePayrollPeriods() {
    try {
      const client = await nominasPool.connect();
      const result = await client.query(`
        SELECT 
          TO_CHAR(cveper, 'YYYY-MM-DD') AS value, 
          COUNT(*) as count
        FROM historico_nominas_gsau
        WHERE cveper IS NOT NULL
        GROUP BY TO_CHAR(cveper, 'YYYY-MM-DD')
        ORDER BY TO_CHAR(cveper, 'YYYY-MM-DD') DESC
      `);
      client.release();
      return {
        success: true,
        data: result.rows,
        count: result.rowCount
      };
    } catch (error) {
      console.error('❌ Error obteniendo periodos únicos desde cveper:', error);
      throw new Error(`Error al obtener periodos únicos desde cveper: ${error.message}`);
    }
  }

  // Obtener estadísticas completas del dataset
  async getDatasetStats() {
    try {
      const client = await nominasPool.connect();
      
      console.log('📊 Calculando estadísticas completas del dataset...');
      
      // 1. Total de registros
      const totalQuery = `SELECT COUNT(*) as total FROM historico_nominas_gsau`;
      const totalResult = await client.query(totalQuery);
      const totalRecords = parseInt(totalResult.rows[0].total);
      
      // 2. Primer dato cronológico existente en cveper (Datos desde:)
      const earliestPeriodQuery = `
        SELECT MIN(cveper) as earliest_period
        FROM historico_nominas_gsau 
        WHERE cveper IS NOT NULL
      `;
      const earliestPeriodResult = await client.query(earliestPeriodQuery);
      const earliestPeriod = earliestPeriodResult.rows[0]?.earliest_period || 'N/A';
      
      // 3. Último dato cronológico existente en cveper (Último Período Cargado:)
      const latestPeriodQuery = `
        SELECT MAX(cveper) as latest_period
        FROM historico_nominas_gsau 
        WHERE cveper IS NOT NULL
      `;
      const latestPeriodResult = await client.query(latestPeriodQuery);
      const latestPeriod = latestPeriodResult.rows[0]?.latest_period || 'N/A';
      
      // 4. Empleados activos en el último mes (CURPs únicas con Status='A' en últimos 30 días)
      // Criterio: CURPs únicas con Status='A' en el rango [MAX(cveper) - 30 días, MAX(cveper)]
      const activeEmployeesQuery = `
        SELECT COUNT(DISTINCT "CURP") as active_employees
        FROM historico_nominas_gsau
        WHERE "CURP" IS NOT NULL 
          AND "CURP" != ''
          AND "Status" = 'A'
          AND cveper IS NOT NULL
          AND cveper >= (
            SELECT MAX(cveper) - INTERVAL '30 days'
            FROM historico_nominas_gsau
            WHERE cveper IS NOT NULL
          )
          AND cveper <= (
            SELECT MAX(cveper)
            FROM historico_nominas_gsau
            WHERE cveper IS NOT NULL
          )
      `;
      const activeEmployeesResult = await client.query(activeEmployeesQuery);
      const activeEmployees = parseInt(activeEmployeesResult.rows[0].active_employees);
      
      // 5. Total de registros en historico_fondos_gsau
      let totalFondosRecords = 0;
      try {
        const totalFondosQuery = `SELECT COUNT(*) as total FROM historico_fondos_gsau`;
        const totalFondosResult = await client.query(totalFondosQuery);
        totalFondosRecords = parseInt(totalFondosResult.rows[0].total);
      } catch (error) {
        console.warn('⚠️ Tabla historico_fondos_gsau no encontrada o error al consultar:', error.message);
        totalFondosRecords = 0;
      }
      
      client.release();
      
      const stats = {
        totalRecords, // Total de registros en historico_nominas_gsau
        activeEmployees, // CURPs únicas con Status='A' en últimos 30 días
        uniqueEmployees: activeEmployees, // Alias para compatibilidad
        earliestPeriod, // Primer dato cronológico
        latestPeriod, // Último dato cronológico (más reciente)
        totalFondosRecords, // Total de datapoints en historico_fondos_gsau
        uniquePeriods: 0, // No solicitado, mantenido para compatibilidad
        averageRecordsPerEmployee: activeEmployees > 0 ? Math.round(totalRecords / activeEmployees) : 0
      };
      
      console.log(`✅ Estadísticas AWS Historic: ${totalRecords.toLocaleString('es-MX')} registros nóminas, ${activeEmployees.toLocaleString('es-MX')} empleados activos (últimos 30 días, Status='A'), ${totalFondosRecords.toLocaleString('es-MX')} registros fondos, desde: ${earliestPeriod}, hasta: ${latestPeriod}`);
      
      return {
        success: true,
        stats,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas del dataset:', error);
      throw new Error(`Error al obtener estadísticas del dataset: ${error.message}`);
    }
  }

  // Obtener estadísticas básicas de nóminas
  async getStats() {
    try {
      const client = await nominasPool.connect();
      
      // Consultas de estadísticas básicas
      // Ajustar según las tablas reales disponibles
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

module.exports = new NominasService();

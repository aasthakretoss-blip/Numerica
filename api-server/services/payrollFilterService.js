const { nominasPool } = require('../config/database');
const nominasService = require('./nominasService');

class PayrollFilterService {
  constructor() {
    this.filterCache = {
      sucursales: new Map(),
      puestos: new Map(),
      estados: new Map(),
      categorias: new Map(),
      periodos: new Map(),
      lastUpdated: null
    };
    // Disable cache in production to ensure fresh data
    this.cacheValidDuration = process.env.NODE_ENV === 'production' 
      ? 0  // No cache in production
      : 5 * 60 * 1000; // 5 minutes in development
  }

  // Obtener filtros con cardinalidad actualizada en tiempo real
  async getFiltersWithCardinality(activeFilters = {}) {
    try {
      // Skip cache in production to ensure fresh data
      if (process.env.NODE_ENV === 'production') {
        this.filterCache.lastUpdated = null;
      }
      
      const client = await nominasPool.connect();
      
      
      // Construir WHERE clause base usando los filtros activos
      let baseWhere = 'WHERE 1=1';
      let baseParams = [];
      let paramIndex = 1;
      
      // Aplicar filtros activos para calcular cardinalidad correcta
      if (activeFilters.search) {
        const searchPattern = `%${activeFilters.search}%`;
        baseWhere += ` AND ("Nombre completo" ILIKE $${paramIndex} OR "CURP" ILIKE $${paramIndex})`;
        baseParams.push(searchPattern);
        paramIndex++;
      }
      
      // Para cada filtro, crear una consulta que NO incluya ese filtro específico,
      // pero sí incluya todos los demás filtros activos
      
      // 1. Sucursales (Compañía)
      let sucursalWhere = baseWhere;
      let sucursalParams = [...baseParams];
      let sucursalParamIndex = paramIndex;
      
      if (activeFilters.puesto && Array.isArray(activeFilters.puesto)) {
        const puestoConditions = activeFilters.puesto.map((_, index) => `$${sucursalParamIndex + index}`).join(', ');
        sucursalWhere += ` AND "Puesto" IN (${puestoConditions})`;
        sucursalParams.push(...activeFilters.puesto);
        sucursalParamIndex += activeFilters.puesto.length;
      } else if (activeFilters.puesto) {
        sucursalWhere += ` AND "Puesto" ILIKE $${sucursalParamIndex}`;
        sucursalParams.push(`%${activeFilters.puesto}%`);
        sucursalParamIndex++;
      }
      
      if (activeFilters.status && Array.isArray(activeFilters.status)) {
        const statusConditions = activeFilters.status.map((_, index) => `$${sucursalParamIndex + index}`).join(', ');
        sucursalWhere += ` AND "Status" IN (${statusConditions})`;
        sucursalParams.push(...activeFilters.status);
        sucursalParamIndex += activeFilters.status.length;
      } else if (activeFilters.status) {
        sucursalWhere += ` AND "Status" = $${sucursalParamIndex}`;
        sucursalParams.push(activeFilters.status);
        sucursalParamIndex++;
      }
      
      if (activeFilters.cveper) {
        // Manejar cveper como array o string único
        const cveperArray = Array.isArray(activeFilters.cveper) ? activeFilters.cveper : [activeFilters.cveper];
        
        if (cveperArray.length > 0) {
          const cveperConditions = [];
          
          cveperArray.forEach(cveper => {
            if (cveper.match(/^\d{4}-\d{2}$/)) {
              // Filtro por mes completo (formato YYYY-MM)
              cveperConditions.push(`DATE_TRUNC('month', cveper) = $${sucursalParamIndex}`);
              sucursalParams.push(`${cveper}-01`);
              sucursalParamIndex++;
            } else if (cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // Filtro por fecha exacta (formato YYYY-MM-DD)
              cveperConditions.push(`DATE(cveper) = $${sucursalParamIndex}`);
              sucursalParams.push(cveper);
              sucursalParamIndex++;
            } else {
              // Filtro por timestamp completo
              cveperConditions.push(`cveper = $${sucursalParamIndex}`);
              sucursalParams.push(cveper);
              sucursalParamIndex++;
            }
          });
          
          if (cveperConditions.length > 0) {
            sucursalWhere += ` AND (${cveperConditions.join(' OR ')})`;
          }
        }
      }
      
      const sucursalQuery = `
        SELECT "Compañía" as value, COUNT(*) as count
        FROM historico_nominas_gsau
        ${sucursalWhere} AND "Compañía" IS NOT NULL
        GROUP BY "Compañía"
        ORDER BY count DESC, "Compañía"
      `;
      
      // 2. Puestos
      let puestoWhere = baseWhere;
      let puestoParams = [...baseParams];
      let puestoParamIndex = paramIndex;
      
      if (activeFilters.sucursal && Array.isArray(activeFilters.sucursal)) {
        const sucursalConditions = activeFilters.sucursal.map((_, index) => `$${puestoParamIndex + index}`).join(', ');
        puestoWhere += ` AND "Compañía" IN (${sucursalConditions})`;
        puestoParams.push(...activeFilters.sucursal);
        puestoParamIndex += activeFilters.sucursal.length;
      } else if (activeFilters.sucursal) {
        puestoWhere += ` AND "Compañía" ILIKE $${puestoParamIndex}`;
        puestoParams.push(`%${activeFilters.sucursal}%`);
        puestoParamIndex++;
      }
      
      if (activeFilters.status && Array.isArray(activeFilters.status)) {
        const statusConditions = activeFilters.status.map((_, index) => `$${puestoParamIndex + index}`).join(', ');
        puestoWhere += ` AND "Status" IN (${statusConditions})`;
        puestoParams.push(...activeFilters.status);
        puestoParamIndex += activeFilters.status.length;
      } else if (activeFilters.status) {
        puestoWhere += ` AND "Status" = $${puestoParamIndex}`;
        puestoParams.push(activeFilters.status);
        puestoParamIndex++;
      }
      
      if (activeFilters.cveper) {
        // Manejar cveper como array o string único
        const cveperArray = Array.isArray(activeFilters.cveper) ? activeFilters.cveper : [activeFilters.cveper];
        
        if (cveperArray.length > 0) {
          const cveperConditions = [];
          
          cveperArray.forEach(cveper => {
            if (cveper.match(/^\d{4}-\d{2}$/)) {
              // Filtro por mes completo (formato YYYY-MM)
              cveperConditions.push(`DATE_TRUNC('month', cveper) = $${puestoParamIndex}`);
              puestoParams.push(`${cveper}-01`);
              puestoParamIndex++;
            } else if (cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // Filtro por fecha exacta (formato YYYY-MM-DD)
              cveperConditions.push(`DATE(cveper) = $${puestoParamIndex}`);
              puestoParams.push(cveper);
              puestoParamIndex++;
            } else {
              // Filtro por timestamp completo
              cveperConditions.push(`cveper = $${puestoParamIndex}`);
              puestoParams.push(cveper);
              puestoParamIndex++;
            }
          });
          
          if (cveperConditions.length > 0) {
            puestoWhere += ` AND (${cveperConditions.join(' OR ')})`;
          }
        }
      }
      
      const puestoQuery = `
        SELECT "Puesto" as value, COUNT(*) as count
        FROM historico_nominas_gsau
        ${puestoWhere} AND "Puesto" IS NOT NULL
        GROUP BY "Puesto"
        ORDER BY count DESC, "Puesto"
      `;
      
      // 3. Estados (Status) - Incluir 'Finiquito'
      let estadoWhere = baseWhere;
      let estadoParams = [...baseParams];
      let estadoParamIndex = paramIndex;
      
      if (activeFilters.sucursal && Array.isArray(activeFilters.sucursal)) {
        const sucursalConditions = activeFilters.sucursal.map((_, index) => `$${estadoParamIndex + index}`).join(', ');
        estadoWhere += ` AND "Compañía" IN (${sucursalConditions})`;
        estadoParams.push(...activeFilters.sucursal);
        estadoParamIndex += activeFilters.sucursal.length;
      } else if (activeFilters.sucursal) {
        estadoWhere += ` AND "Compañía" ILIKE $${estadoParamIndex}`;
        estadoParams.push(`%${activeFilters.sucursal}%`);
        estadoParamIndex++;
      }
      
      if (activeFilters.puesto && Array.isArray(activeFilters.puesto)) {
        const puestoConditions = activeFilters.puesto.map((_, index) => `$${estadoParamIndex + index}`).join(', ');
        estadoWhere += ` AND "Puesto" IN (${puestoConditions})`;
        estadoParams.push(...activeFilters.puesto);
        estadoParamIndex += activeFilters.puesto.length;
      } else if (activeFilters.puesto) {
        estadoWhere += ` AND "Puesto" ILIKE $${estadoParamIndex}`;
        estadoParams.push(`%${activeFilters.puesto}%`);
        estadoParamIndex++;
      }
      
      if (activeFilters.cveper) {
        // Manejar cveper como array o string único
        const cveperArray = Array.isArray(activeFilters.cveper) ? activeFilters.cveper : [activeFilters.cveper];
        
        if (cveperArray.length > 0) {
          const cveperConditions = [];
          
          cveperArray.forEach(cveper => {
            if (cveper.match(/^\d{4}-\d{2}$/)) {
              // Filtro por mes completo (formato YYYY-MM)
              cveperConditions.push(`DATE_TRUNC('month', cveper) = $${estadoParamIndex}`);
              estadoParams.push(`${cveper}-01`);
              estadoParamIndex++;
            } else if (cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // Filtro por fecha exacta (formato YYYY-MM-DD)
              cveperConditions.push(`DATE(cveper) = $${estadoParamIndex}`);
              estadoParams.push(cveper);
              estadoParamIndex++;
            } else {
              // Filtro por timestamp completo
              cveperConditions.push(`cveper = $${estadoParamIndex}`);
              estadoParams.push(cveper);
              estadoParamIndex++;
            }
          });
          
          if (cveperConditions.length > 0) {
            estadoWhere += ` AND (${cveperConditions.join(' OR ')})`;
          }
        }
      }
      
      const estadoQuery = `
        SELECT 
          CASE 
            WHEN "Status" = 'A' THEN 'Activo'
            WHEN "Status" = 'B' THEN 'Baja'
            WHEN "Status" = 'F' THEN 'Finiquito'
            ELSE 'N/A'
          END as value, 
          COUNT(*) as count
        FROM historico_nominas_gsau
        ${estadoWhere} AND "Status" IS NOT NULL
        GROUP BY "Status"
        ORDER BY count DESC
      `;
      
      // 4. Períodos (cveper)
      let periodoWhere = baseWhere;
      let periodoParams = [...baseParams];
      let periodoParamIndex = paramIndex;
      
      if (activeFilters.sucursal && Array.isArray(activeFilters.sucursal)) {
        const sucursalConditions = activeFilters.sucursal.map((_, index) => `$${periodoParamIndex + index}`).join(', ');
        periodoWhere += ` AND "Compañía" IN (${sucursalConditions})`;
        periodoParams.push(...activeFilters.sucursal);
        periodoParamIndex += activeFilters.sucursal.length;
      } else if (activeFilters.sucursal) {
        periodoWhere += ` AND "Compañía" ILIKE $${periodoParamIndex}`;
        periodoParams.push(`%${activeFilters.sucursal}%`);
        periodoParamIndex++;
      }
      
      if (activeFilters.puesto && Array.isArray(activeFilters.puesto)) {
        const puestoConditions = activeFilters.puesto.map((_, index) => `$${periodoParamIndex + index}`).join(', ');
        periodoWhere += ` AND "Puesto" IN (${puestoConditions})`;
        periodoParams.push(...activeFilters.puesto);
        periodoParamIndex += activeFilters.puesto.length;
      } else if (activeFilters.puesto) {
        periodoWhere += ` AND "Puesto" ILIKE $${periodoParamIndex}`;
        periodoParams.push(`%${activeFilters.puesto}%`);
        periodoParamIndex++;
      }
      
      if (activeFilters.status && Array.isArray(activeFilters.status)) {
        const statusConditions = activeFilters.status.map((_, index) => `$${periodoParamIndex + index}`).join(', ');
        periodoWhere += ` AND "Status" IN (${statusConditions})`;
        periodoParams.push(...activeFilters.status);
        periodoParamIndex += activeFilters.status.length;
      } else if (activeFilters.status) {
        periodoWhere += ` AND "Status" = $${periodoParamIndex}`;
        periodoParams.push(activeFilters.status);
        periodoParamIndex++;
      }
      
      const periodoQuery = `
        SELECT 
          TO_CHAR(cveper, 'YYYY-MM-DD') as value, 
          COUNT(*) as count
        FROM historico_nominas_gsau
        ${periodoWhere} AND cveper IS NOT NULL
        GROUP BY TO_CHAR(cveper, 'YYYY-MM-DD')
        ORDER BY TO_CHAR(cveper, 'YYYY-MM-DD') DESC
      `;
      
      // Ejecutar todas las consultas en paralelo
      const [sucursalResult, puestoResult, estadoResult, periodoResult] = await Promise.all([
        client.query(sucursalQuery, sucursalParams),
        client.query(puestoQuery, puestoParams),
        client.query(estadoQuery, estadoParams),
        client.query(periodoQuery, periodoParams)
      ]);
      
      // Obtener categorías de puestos con conteos globales
      const puestosCategorias = await this.getPuestoCategoriasWithGlobalCounts(client, activeFilters);
      
      client.release();
      
      const result = {
        success: true,
        data: {
          sucursales: sucursalResult.rows,
          puestos: puestoResult.rows,
          estados: estadoResult.rows,
          puestosCategorias: puestosCategorias,
          periodos: periodoResult.rows
        },
        timestamp: new Date().toISOString(),
        activeFilters
      };
      
      
      return result;
      
    } catch (error) {
      console.error('❌ Error calculando filtros con cardinalidad:', error);
      throw new Error(`Error al calcular filtros: ${error.message}`);
    }
  }
  
  // Obtener categorías de puestos con conteos globales
  async getPuestoCategoriasWithGlobalCounts(client, activeFilters = {}) {
    try {
      // Construir WHERE para categorías de puestos (excluyendo el filtro de categoría de puestos)
      let categoriaWhere = 'WHERE 1=1';
      let categoriaParams = [];
      let categoriaParamIndex = 1;
      
      if (activeFilters.search) {
        const searchPattern = `%${activeFilters.search}%`;
        categoriaWhere += ` AND ("Nombre completo" ILIKE $${categoriaParamIndex} OR "CURP" ILIKE $${categoriaParamIndex})`;
        categoriaParams.push(searchPattern);
        categoriaParamIndex++;
      }
      
      if (activeFilters.sucursal && Array.isArray(activeFilters.sucursal)) {
        const sucursalConditions = activeFilters.sucursal.map((_, index) => `$${categoriaParamIndex + index}`).join(', ');
        categoriaWhere += ` AND "Compañía" IN (${sucursalConditions})`;
        categoriaParams.push(...activeFilters.sucursal);
        categoriaParamIndex += activeFilters.sucursal.length;
      } else if (activeFilters.sucursal) {
        categoriaWhere += ` AND "Compañía" ILIKE $${categoriaParamIndex}`;
        categoriaParams.push(`%${activeFilters.sucursal}%`);
        categoriaParamIndex++;
      }
      
      if (activeFilters.puesto && Array.isArray(activeFilters.puesto)) {
        const puestoConditions = activeFilters.puesto.map((_, index) => `$${categoriaParamIndex + index}`).join(', ');
        categoriaWhere += ` AND "Puesto" IN (${puestoConditions})`;
        categoriaParams.push(...activeFilters.puesto);
        categoriaParamIndex += activeFilters.puesto.length;
      } else if (activeFilters.puesto) {
        categoriaWhere += ` AND "Puesto" ILIKE $${categoriaParamIndex}`;
        categoriaParams.push(`%${activeFilters.puesto}%`);
        categoriaParamIndex++;
      }
      
      if (activeFilters.status && Array.isArray(activeFilters.status)) {
        const statusConditions = activeFilters.status.map((_, index) => `$${categoriaParamIndex + index}`).join(', ');
        categoriaWhere += ` AND "Status" IN (${statusConditions})`;
        categoriaParams.push(...activeFilters.status);
        categoriaParamIndex += activeFilters.status.length;
      } else if (activeFilters.status) {
        categoriaWhere += ` AND "Status" = $${categoriaParamIndex}`;
        categoriaParams.push(activeFilters.status);
        categoriaParamIndex++;
      }
      
      if (activeFilters.cveper) {
        // Manejar cveper como array o string único
        const cveperArray = Array.isArray(activeFilters.cveper) ? activeFilters.cveper : [activeFilters.cveper];
        
        if (cveperArray.length > 0) {
          const cveperConditions = [];
          
          cveperArray.forEach(cveper => {
            if (cveper.match(/^\d{4}-\d{2}$/)) {
              // Filtro por mes completo (formato YYYY-MM)
              cveperConditions.push(`DATE_TRUNC('month', cveper) = $${categoriaParamIndex}`);
              categoriaParams.push(`${cveper}-01`);
              categoriaParamIndex++;
            } else if (cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // Filtro por fecha exacta (formato YYYY-MM-DD)
              cveperConditions.push(`DATE(cveper) = $${categoriaParamIndex}`);
              categoriaParams.push(cveper);
              categoriaParamIndex++;
            } else {
              // Filtro por timestamp completo
              cveperConditions.push(`cveper = $${categoriaParamIndex}`);
              categoriaParams.push(cveper);
              categoriaParamIndex++;
            }
          });
          
          if (cveperConditions.length > 0) {
            categoriaWhere += ` AND (${cveperConditions.join(' OR ')})`;
          }
        }
      }
      
      // Obtener todos los puestos únicos con sus conteos
      const puestosQuery = `
        SELECT "Puesto" as puesto, COUNT(*) as count
        FROM historico_nominas_gsau
        ${categoriaWhere} AND "Puesto" IS NOT NULL
        GROUP BY "Puesto"
      `;
      
      const puestosResult = await client.query(puestosQuery, categoriaParams);
      
      // Mapear puestos a categorías y calcular conteos
      const categoriaConteos = new Map();
      
      // Inicializar categorías disponibles con conteo 0
      const categoriasDisponibles = nominasService.getPuestosCategorias();
      categoriasDisponibles.forEach(categoria => {
        categoriaConteos.set(categoria, 0);
      });
      
      // Sumar conteos por categoría
      puestosResult.rows.forEach(row => {
        const categoria = nominasService.getPuestoCategorizado(row.puesto);
        const currentCount = categoriaConteos.get(categoria) || 0;
        categoriaConteos.set(categoria, currentCount + parseInt(row.count));
      });
      
      // Convertir a formato de array, solo mostrar categorías con empleados
      const result = Array.from(categoriaConteos.entries())
        .filter(([categoria, count]) => count > 0)
        .map(([categoria, count]) => ({ value: categoria, count }))
        .sort((a, b) => a.value.localeCompare(b.value));
      
      return result;
      
    } catch (error) {
      console.error('❌ Error calculando categorías de puestos:', error);
      return [];
    }
  }
  
  // NUEVO: Obtener datos de payroll con filtros y sorting integrado
  async getPayrollDataWithFiltersAndSorting(options = {}) {
    try {
      const client = await nominasPool.connect();
      
      // Handle fullData flag - if true, skip pagination
      const fullData = options.fullData === true || options.fullData === 'true';
      const pageSize = fullData ? 999999 : Math.max(parseInt(options.pageSize) || 100, 1);
      const page = Math.max(parseInt(options.page) || 1, 1);
      const offset = fullData ? 0 : (page - 1) * pageSize;
      
      // Query base para obtener datos de la tabla historico_nominas_gsau
      // MAPEO CORRECTO: usando los nombres exactos de las columnas como aparecen en la BD
      let query = `
        SELECT 
          "RFC" as rfc,
          "CURP" as curp,
          "Nombre completo" as nombre,
          "Nombre completo" as name,
          "Puesto" as puesto,
          "Compañía" as sucursal,
          TO_CHAR(cveper, 'YYYY-MM-DD') as mes,
          cveper as cveper,
          cveper as periodo,
          cveper as fecha,
          COALESCE(" SUELDO CLIENTE "::NUMERIC, 0)::NUMERIC as sueldo,
          COALESCE(" SUELDO CLIENTE "::NUMERIC, 0)::NUMERIC as " SUELDO CLIENTE ",
          COALESCE(" SUELDO CLIENTE "::NUMERIC, 0)::NUMERIC as salary,
          COALESCE(" COMISIONES CLIENTE ", 0) + COALESCE(" COMISIONES FACTURADAS ", 0) as comisiones,
          COALESCE(" TOTAL DE PERCEPCIONES ", 0) as "totalPercepciones",
          COALESCE(" TOTAL DE PERCEPCIONES ", 0) as " TOTAL DE PERCEPCIONES ",
          "Status" as status,
          CASE 
            WHEN "Status" = 'A' THEN 'Activo'
            WHEN "Status" = 'B' THEN 'Baja'
            WHEN "Status" = 'F' THEN 'Finiquito'
            ELSE 'N/A'
          END as estado,
          -- NUEVOS CAMPOS AGREGADOS usando nombres exactos de la tabla:
          "Periodicidad" as periodicidad,
          "Clave trabajador" as "claveTrabajador",
          "Número IMSS" as "numeroIMSS",
          "Fecha antigüedad" as "fechaAntiguedad",
          "Antigüedad en FPL" as "antiguedadFPL"
        FROM historico_nominas_gsau
        WHERE 1=1
      `;
      let countQuery = `SELECT COUNT(*) as total FROM historico_nominas_gsau WHERE 1=1`;
      let queryParams = [];
      let paramIndex = 1;
      
      // Aplicar filtro por puesto categorizado
      if (options.puestoCategorizado) {
        const puestosIncluidos = Array.isArray(options.puestoCategorizado)
          ? options.puestoCategorizado
          : [options.puestoCategorizado];

        const puestosParaCategorias = puestosIncluidos.flatMap(categoria => {
          return nominasService.getPuestosPorCategoria(categoria);
        });

        if (puestosParaCategorias.length > 0) {
          const puestosConditions = puestosParaCategorias.map((_, index) => `$${paramIndex + index}`).join(', ');
          const sqlFragment = ` AND "Puesto" IN (${puestosConditions})`;
          
          query += sqlFragment;
          countQuery += sqlFragment;
          queryParams.push(...puestosParaCategorias);
          paramIndex += puestosParaCategorias.length;
        }
      }

      // ✅ FIXED: Aplicar filtro de búsqueda (following the fixed pattern)
      // CRITICAL: Only apply search filter if search term is provided and not empty
      if (options.search) {
        // Clean search term (should already be cleaned in server.js, but double-check)
        let cleanedSearch = String(options.search).trim();
        
        // Only apply if search term is not empty
        if (cleanedSearch && cleanedSearch.length > 0) {
          const searchPattern = `%${cleanedSearch}%`;
          // Search in nombre completo, CURP, and RFC (using ILIKE for case-insensitive search)
          const searchCondition = ` AND ("Nombre completo" ILIKE $${paramIndex} OR "CURP" ILIKE $${paramIndex} OR "RFC" ILIKE $${paramIndex})`;
          query += searchCondition;
          countQuery += searchCondition;
          queryParams.push(searchPattern);
          
          console.log('✅ PayrollFilterService: Aplicando filtro de búsqueda:', {
            searchTerm: cleanedSearch,
            searchPattern: searchPattern,
            paramIndex: paramIndex,
            condition: searchCondition
          });
          
          paramIndex++;
        } else {
          console.warn('⚠️ PayrollFilterService: Search term está vacío, NO aplicando filtro');
        }
      }
      
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
      
      if (options.status) {
        if (Array.isArray(options.status)) {
          // Mapear estados de frontend a códigos de base de datos
          const statusCodes = options.status.map(estado => {
            switch(estado) {
              case 'Activo': return 'A';
              case 'Baja': return 'B';
              case 'Finiquito': return 'F';
              default: return estado;
            }
          });
          const statusConditions = statusCodes.map((_, index) => `$${paramIndex + index}`).join(', ');
          query += ` AND "Status" IN (${statusConditions})`;
          countQuery += ` AND "Status" IN (${statusConditions})`;
          queryParams.push(...statusCodes);
          paramIndex += statusCodes.length;
        } else {
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
      
      if (options.cveper) {
        // Manejar array de periodos o periodo único
        const cveperArray = Array.isArray(options.cveper) ? options.cveper : [options.cveper];
        
        if (cveperArray.length > 0) {
          const cveperConditions = [];
          
          // Mapeo de nombres de meses en español a números
          const monthMap = {
            'ENERO': '01', 'FEBRERO': '02', 'MARZO': '03', 'ABRIL': '04',
            'MAYO': '05', 'JUNIO': '06', 'JULIO': '07', 'AGOSTO': '08',
            'SEPTIEMBRE': '09', 'OCTUBRE': '10', 'NOVIEMBRE': '11', 'DICIEMBRE': '12'
          };
          
          cveperArray.forEach(cveper => {
            // Si es un nombre de mes (ej: "SEPTIEMBRE"), buscar por mes usando TO_CHAR
            const cveperUpper = typeof cveper === 'string' ? cveper.toUpperCase().trim() : String(cveper).toUpperCase().trim();
            if (monthMap[cveperUpper]) {
              const monthNum = monthMap[cveperUpper];
              // Filtrar por mes usando TO_CHAR para extraer el mes del cveper (cveper es timestamp)
              // Usar CAST con NULL check para evitar errores - usar DATE() para compatibilidad
              cveperConditions.push(`(cveper IS NOT NULL AND TO_CHAR(DATE(cveper), 'MM') = $${paramIndex})`);
              queryParams.push(monthNum);
              paramIndex++;
            } else if (typeof cveper === 'string' && cveper.match(/^\d{4}-\d{2}$/)) {
              // Filtro por mes completo (formato YYYY-MM)
              cveperConditions.push(`DATE_TRUNC('month', cveper) = $${paramIndex}`);
              queryParams.push(`${cveper}-01`);
              paramIndex++;
            } else if (cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // Filtro por fecha exacta (formato YYYY-MM-DD)
              cveperConditions.push(`DATE(cveper) = $${paramIndex}::date`);
              queryParams.push(cveper);
              paramIndex++;
            } else if (cveper.includes && cveper.includes('T') && cveper.includes('Z')) {
              // Filtro por timestamp ISO (formato: 2025-06-30T00:00:00.000Z)
              // Comparar directamente con timestamp o por fecha
              cveperConditions.push(`DATE(cveper) = DATE($${paramIndex}::timestamp)`);
              queryParams.push(cveper);
              paramIndex++;
            } else {
              // Filtro por timestamp completo o intentar parsear como fecha
              try {
                // Intentar parsear como fecha ISO
                const date = new Date(cveper);
                if (!isNaN(date.getTime())) {
                  // Si es un timestamp válido, comparar por fecha
                  cveperConditions.push(`DATE(cveper) = DATE($${paramIndex}::timestamp)`);
                  queryParams.push(date.toISOString());
                  paramIndex++;
                } else {
                  // Si no se puede parsear, usar comparación directa
                  cveperConditions.push(`cveper = $${paramIndex}`);
                  queryParams.push(cveper);
                  paramIndex++;
                }
              } catch (e) {
                // Si falla, usar comparación directa
                cveperConditions.push(`cveper = $${paramIndex}`);
                queryParams.push(cveper);
                paramIndex++;
              }
            }
          });
          
          if (cveperConditions.length > 0) {
            const cveperClause = ` AND (${cveperConditions.join(' OR ')})`;
            query += cveperClause;
            countQuery += cveperClause;
          }
        }
      }
      
      // Ordenamiento dinámico con conversión numérica adecuada
      let orderClause = '';
      if (options.orderBy) {
        
        // Mapear campos del frontend a expresiones SQL correctas
        const fieldMapping = {
          'nombre': '"Nombre completo"',
          'name': '"Nombre completo"',
          'curp': '"CURP"',
          'rfc': '"RFC"',
          'puesto': '"Puesto"',
          'sucursal': '"Compañía"',
          'compania': '"Compañía"',
          'department': '"Compañía"',
          'mes': 'cveper',
          'periodo': 'cveper',
          'fecha': 'cveper',
          'salario': '(" SUELDO CLIENTE "::NUMERIC)',
          'salary': '(" SUELDO CLIENTE "::NUMERIC)',
          'sueldo': '(" SUELDO CLIENTE "::NUMERIC)',
          'comisiones': '((COALESCE(" COMISIONES CLIENTE ", 0) + COALESCE(" COMISIONES FACTURADAS ", 0))::DECIMAL)',
          'commissions': '((COALESCE(" COMISIONES CLIENTE ", 0) + COALESCE(" COMISIONES FACTURADAS ", 0))::DECIMAL)',
          'totalPercepciones': '(" TOTAL DE PERCEPCIONES "::DECIMAL)',
          'percepcionesTotales': '(" TOTAL DE PERCEPCIONES "::DECIMAL)',
          'estado': '"Status"',
          'status': '"Status"'
        };
        
        // Normalizar el campo de ordenamiento (trim y lowercase para matching)
        const normalizedOrderBy = String(options.orderBy || '').trim().toLowerCase();
        let dbField = fieldMapping[normalizedOrderBy];
        
        if (dbField) {
          const direction = (String(options.orderDirection || 'asc').toLowerCase() === 'desc') ? 'DESC' : 'ASC';
          orderClause = ` ORDER BY ${dbField} ${direction}, "Nombre completo" ASC, "CURP" ASC, cveper DESC`;
        } else {
          orderClause = ` ORDER BY "Nombre completo" ASC, "CURP" ASC, cveper DESC`;
        }
      } else {
        orderClause = ` ORDER BY "Nombre completo" ASC, "CURP" ASC, cveper DESC`;
      }
      
      query += orderClause || ` ORDER BY "Nombre completo" ASC, "CURP" ASC, cveper DESC`;
      
      // Apply LIMIT and OFFSET (always apply, even for fullData - we use large limit)
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      const finalParams = [...queryParams, pageSize, offset];
      
      // 🔍 FILTERING/SORTING LOG: Only log when filtering or sorting is active
      if (options.search || options.orderBy || options.puesto || options.sucursal || options.status || options.puestoCategorizado || options.cveper) {
        console.log('🔍 SQL FILTER/SORT:', {
          search: options.search || null,
          orderBy: options.orderBy || null,
          orderDirection: options.orderDirection || null,
          filters: {
            puesto: options.puesto || null,
            sucursal: options.sucursal || null,
            status: options.status || null,
            puestoCategorizado: options.puestoCategorizado || null,
            cveper: options.cveper || null
          },
          results: { rows: 0, total: 0 } // Will update after query
        });
      }
      
      // CRITICAL DEBUG: Always log search-related queries
      if (options.search) {
        let cleanedSearch = String(options.search);
        try {
          cleanedSearch = decodeURIComponent(cleanedSearch);
        } catch (e) {
          // If already decoded or invalid, continue with original
        }
        cleanedSearch = cleanedSearch.replace(/\+/g, ' ').trim().replace(/\s+/g, ' ');
        const searchPattern = cleanedSearch ? `%${cleanedSearch}%` : null;
        
        const searchInQuery = query.includes('Nombre completo" ILIKE') || query.includes('CURP" ILIKE') || query.includes('RFC" ILIKE');
        const searchInCountQuery = countQuery.includes('Nombre completo" ILIKE') || countQuery.includes('CURP" ILIKE') || countQuery.includes('RFC" ILIKE');
        const searchParamInFinalParams = searchPattern ? finalParams.includes(searchPattern) : false;
        const searchParamInQueryParams = searchPattern ? queryParams.includes(searchPattern) : false;
        
        console.log('🚀 PayrollFilterService (api-server): Ejecutando consulta con búsqueda:');
        console.log('📝 Query (first 800 chars):', query.substring(0, 800));
        console.log('📝 Count Query (first 800 chars):', countQuery.substring(0, 800));
        console.log('📋 Final Query Params (length):', finalParams.length, 'Values:', finalParams);
        console.log('📋 Count Query Params (length):', queryParams.length, 'Values:', queryParams);
        console.log('✅ Search condition in main query:', searchInQuery ? 'YES' : 'NO');
        console.log('✅ Search condition in count query:', searchInCountQuery ? 'YES' : 'NO');
        console.log('✅ Search pattern in finalParams:', searchParamInFinalParams ? 'YES' : 'NO');
        console.log('✅ Search pattern in queryParams:', searchParamInQueryParams ? 'YES' : 'NO');
        console.log('🔍 Search term details:', {
          original: options.search,
          cleaned: cleanedSearch,
          pattern: searchPattern
        });
        
        if (!searchInQuery || !searchInCountQuery) {
          console.error('❌ ERROR CRÍTICO: Search parameter presente pero NO en la query SQL!');
          console.error('   Main query has search:', searchInQuery);
          console.error('   Count query has search:', searchInCountQuery);
        }
        if (!searchParamInFinalParams || !searchParamInQueryParams) {
          console.error('❌ ERROR CRÍTICO: Search pattern NO encontrado en parámetros de query!');
          console.error('   Pattern in finalParams:', searchParamInFinalParams);
          console.error('   Pattern in queryParams:', searchParamInQueryParams);
        }
      } else if (process.env.NODE_ENV === 'development' && options.cveper) {
        console.log('🔍 Final SQL Query:', query.substring(0, 500) + '...');
        console.log('🔍 Query Params:', finalParams);
      }
      
      const [dataResult, countResult] = await Promise.all([
        client.query(query, finalParams).catch(err => {
          console.error('❌ SQL Query Error:', err.message);
          console.error('❌ Query:', query);
          console.error('❌ Params:', finalParams);
          throw err;
        }),
        client.query(countQuery, queryParams).catch(err => {
          console.error('❌ SQL Count Query Error:', err.message);
          console.error('❌ Count Query:', countQuery);
          console.error('❌ Params:', queryParams);
          throw err;
        })
      ]);
      
      // Update results in log if filtering/sorting was active
      if (options.search || options.orderBy || options.puesto || options.sucursal || options.status || options.puestoCategorizado || options.cveper) {
        console.log('🔍 SQL FILTER/SORT RESULTS:', {
          rows: dataResult.rows.length,
          total: parseInt(countResult.rows[0]?.total || 0),
          searchApplied: options.search ? 'YES' : 'NO',
          searchTerm: options.search || 'N/A'
        });
        
        // Verify search results match the search term
        if (options.search && dataResult.rows.length > 0) {
          const firstRecord = dataResult.rows[0];
          const searchTermUpper = String(options.search).trim().toUpperCase();
          const matches = 
            (firstRecord.nombre && firstRecord.nombre.toUpperCase().includes(searchTermUpper)) ||
            (firstRecord.curp && firstRecord.curp && firstRecord.curp.toUpperCase().includes(searchTermUpper)) ||
            (firstRecord.rfc && firstRecord.rfc && firstRecord.rfc.toUpperCase().includes(searchTermUpper));
          
          console.log('🔍 Verificación de búsqueda en resultados:', {
            searchTerm: options.search,
            firstResultName: firstRecord.nombre,
            firstResultCurp: firstRecord.curp,
            firstResultRfc: firstRecord.rfc,
            matches: matches ? 'YES' : 'NO'
          });
          
          if (!matches && dataResult.rows.length >= 100) {
            console.warn('⚠️ ADVERTENCIA: Búsqueda aplicada pero resultados no coinciden. Posible problema con el filtro SQL.');
            console.warn('⚠️ Esto sugiere que el filtro de búsqueda NO está funcionando correctamente.');
          }
        }
      }
      
      client.release();
      
      const enrichedData = dataResult.rows.map(employee => ({
        ...employee,
        puestoCategorizado: nominasService.getPuestoCategorizado(employee.puesto)
      }));
      
      const total = parseInt(countResult.rows[0].total);
      
      return {
        success: true,
        total: total,
        data: enrichedData,
        pagination: {
          total: total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        }
      };
      
    } catch (error) {
      console.error('Error obteniendo datos con filtros y sorting:', error);
      throw error;
    }
  }

  // Obtener conteo de CURPs únicos con los mismos filtros aplicados
  async getUniqueCurpCount(options = {}) {
    try {
      const client = await nominasPool.connect();
      
      // Query para contar CURPs únicos con los mismos filtros
      // CORREGIDA: Usar dígito de género de la CURP (posición 11, índice 10) en lugar de columna Sexo
      let countQuery = `SELECT 
        COUNT(DISTINCT "CURP") as unique_curps,
        COUNT(DISTINCT CASE WHEN LENGTH("CURP") >= 11 AND SUBSTRING("CURP", 11, 1) = 'H' THEN "CURP" END) as unique_males,
        COUNT(DISTINCT CASE WHEN LENGTH("CURP") >= 11 AND SUBSTRING("CURP", 11, 1) = 'M' THEN "CURP" END) as unique_females
      FROM historico_nominas_gsau WHERE 1=1 AND "CURP" IS NOT NULL AND "CURP" != '' AND LENGTH("CURP") >= 11`;
      let queryParams = [];
      let paramIndex = 1;
      
      // Aplicar filtro por puesto categorizado PRIMERO (igual que en getPayrollDataWithFiltersAndSorting)
      if (options.puestoCategorizado) {
        const puestosIncluidos = Array.isArray(options.puestoCategorizado)
          ? options.puestoCategorizado
          : [options.puestoCategorizado];

        // Obtener todos los puestos que corresponden a las categorías incluidas
        const puestosParaCategorias = puestosIncluidos.flatMap(categoria =>
          nominasService.getPuestosPorCategoria(categoria)
        );

        // Si tenemos puestos específicos, agregarlos como filtro SQL
        if (puestosParaCategorias.length > 0) {
          const puestosConditions = puestosParaCategorias.map((_, index) => `$${paramIndex + index}`).join(', ');
          countQuery += ` AND "Puesto" IN (${puestosConditions})`;
          queryParams.push(...puestosParaCategorias);
          paramIndex += puestosParaCategorias.length;
        }
      }

      // Aplicar filtro de búsqueda
      if (options.search) {
        let cleanedSearch = String(options.search);
        try {
          cleanedSearch = decodeURIComponent(cleanedSearch);
        } catch (e) {
          // If already decoded or invalid, continue with original
        }
        cleanedSearch = cleanedSearch.replace(/\+/g, ' ');
        cleanedSearch = cleanedSearch.trim().replace(/\s+/g, ' ');
        
        if (cleanedSearch && cleanedSearch.length > 0) {
          const searchPattern = `%${cleanedSearch}%`;
          countQuery += ` AND ("Nombre completo" ILIKE $${paramIndex} OR "CURP" ILIKE $${paramIndex})`;
          queryParams.push(searchPattern);
          paramIndex++;
        }
      }
      
      if (options.puesto) {
        // Decode and clean puesto parameter
        let cleanedPuesto = Array.isArray(options.puesto) 
          ? options.puesto.map(p => {
              try {
                return decodeURIComponent(String(p).replace(/\+/g, ' ')).trim();
              } catch (e) {
                return String(p).replace(/\+/g, ' ').trim();
              }
            })
          : (() => {
              try {
                return decodeURIComponent(String(options.puesto).replace(/\+/g, ' ')).trim();
              } catch (e) {
                return String(options.puesto).replace(/\+/g, ' ').trim();
              }
            })();

        if (Array.isArray(cleanedPuesto)) {
          const puestoConditions = cleanedPuesto.map((_, index) => `$${paramIndex + index}`).join(', ');
          countQuery += ` AND "Puesto" IN (${puestoConditions})`;
          queryParams.push(...cleanedPuesto);
          paramIndex += cleanedPuesto.length;
        } else if (cleanedPuesto && cleanedPuesto.length > 0) {
          // Use ILIKE with wildcards (same as getPayrollDataWithFiltersAndSorting)
          const puestoPattern = `%${cleanedPuesto}%`;
          countQuery += ` AND "Puesto" ILIKE $${paramIndex}`;
          queryParams.push(puestoPattern);
          paramIndex++;
        }
      }
      
      if (options.sucursal) {
        // Decode and clean sucursal parameter
        let cleanedSucursal = Array.isArray(options.sucursal)
          ? options.sucursal.map(s => {
              try {
                return decodeURIComponent(String(s).replace(/\+/g, ' ')).trim();
              } catch (e) {
                return String(s).replace(/\+/g, ' ').trim();
              }
            })
          : (() => {
              try {
                return decodeURIComponent(String(options.sucursal).replace(/\+/g, ' ')).trim();
              } catch (e) {
                return String(options.sucursal).replace(/\+/g, ' ').trim();
              }
            })();

        if (Array.isArray(cleanedSucursal)) {
          const sucursalConditions = cleanedSucursal.map((_, index) => `$${paramIndex + index}`).join(', ');
          countQuery += ` AND "Compañía" IN (${sucursalConditions})`;
          queryParams.push(...cleanedSucursal);
          paramIndex += cleanedSucursal.length;
        } else if (cleanedSucursal && cleanedSucursal.length > 0) {
          // Use ILIKE with wildcards (same as getPayrollDataWithFiltersAndSorting)
          const sucursalPattern = `%${cleanedSucursal}%`;
          countQuery += ` AND "Compañía" ILIKE $${paramIndex}`;
          queryParams.push(sucursalPattern);
          paramIndex++;
        }
      }
      
      if (options.status) {
        if (Array.isArray(options.status)) {
          // Mapear estados de frontend a códigos de base de datos
          const statusCodes = options.status.map(estado => {
            switch(estado) {
              case 'Activo': return 'A';
              case 'Baja': return 'B';
              case 'Finiquito': return 'F';
              default: return estado;
            }
          });
          const statusConditions = statusCodes.map((_, index) => `$${paramIndex + index}`).join(', ');
          countQuery += ` AND "Status" IN (${statusConditions})`;
          queryParams.push(...statusCodes);
          paramIndex += statusCodes.length;
        } else {
          let statusCode = options.status;
          switch(options.status) {
            case 'Activo': statusCode = 'A'; break;
            case 'Baja': statusCode = 'B'; break;
            case 'Finiquito': statusCode = 'F'; break;
          }
          countQuery += ` AND "Status" = $${paramIndex}`;
          queryParams.push(statusCode);
          paramIndex++;
        }
      }
      
      if (options.cveper) {
        // Manejar array de periodos o periodo único
        const cveperArray = Array.isArray(options.cveper) ? options.cveper : [options.cveper];
        
        if (cveperArray.length > 0) {
          const cveperConditions = [];
          
          cveperArray.forEach(cveper => {
            if (cveper.match(/^\d{4}-\d{2}$/)) {
              // Filtro por mes completo (formato YYYY-MM)
              cveperConditions.push(`DATE_TRUNC('month', cveper) = $${paramIndex}`);
              queryParams.push(`${cveper}-01`);
              paramIndex++;
            } else if (cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // Filtro por fecha exacta (formato YYYY-MM-DD)
              cveperConditions.push(`DATE(cveper) = $${paramIndex}`);
              queryParams.push(cveper);
              paramIndex++;
            } else {
              // Filtro por timestamp completo
              cveperConditions.push(`cveper = $${paramIndex}`);
              queryParams.push(cveper);
              console.log('⏰ PayrollFilterService: Aplicando filtro por timestamp completo para conteo CURP:', cveper);
              paramIndex++;
            }
          });
          
          if (cveperConditions.length > 0) {
            const cveperClause = ` AND (${cveperConditions.join(' OR ')})`;
            countQuery += cveperClause;
            console.log('✅ PayrollFilterService: Clausula cveper generada para conteo CURP:', cveperClause);
          }
        }
      }
      
      console.log('🚀 PayrollFilterService: Ejecutando consulta de conteo CURPs únicos:');
      console.log('📝 SQL Query:', countQuery);
      console.log('📋 Query Parameters:', JSON.stringify(queryParams, null, 2));
      console.log('📊 Parameter count:', queryParams.length);
      console.log('🔍 Options received:', JSON.stringify(options, null, 2));
      
      // Ejecutar consulta
      const result = await client.query(countQuery, queryParams);
      
      console.log('📥 Query result rows:', result.rows);
      console.log('📥 Query result count:', result.rows[0]?.unique_curps);
      client.release();
      
      const uniqueCurpCount = parseInt(result.rows[0].unique_curps) || 0;
      const uniqueMaleCount = parseInt(result.rows[0].unique_males) || 0;
      const uniqueFemaleCount = parseInt(result.rows[0].unique_females) || 0;
      
      console.log('✅ PayrollFilterService: CURPs únicos encontrados:', {
        total: uniqueCurpCount,
        hombres: uniqueMaleCount,
        mujeres: uniqueFemaleCount
      });
      
      return {
        success: true,
        uniqueCurpCount,
        uniqueMaleCount,
        uniqueFemaleCount
      };
      
    } catch (error) {
      console.error('❌ PayrollFilterService: Error obteniendo conteo de CURPs únicos:', error);
      throw new Error(`Error al obtener conteo de CURPs únicos: ${error.message}`);
    }
  }
}

module.exports = new PayrollFilterService();

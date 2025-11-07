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
      console.error('❌ Error calculating position categories:', error);
      return [];
    }
  }
  
  // NUEVO: Obtener datos de payroll con filtros y sorting integrado
  async getPayrollDataWithFiltersAndSorting(options = {}) {
    console.log('\n\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔵🔵🔵 [SERVICE START] getPayrollDataWithFiltersAndSorting 🔵🔵🔵');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Options received:', JSON.stringify(options, null, 2));
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n');
    
    try {
      const client = await nominasPool.connect();
      console.log('✅ [STEP 1] Database connection established');
      
      // ✅ FIXED: Set UTF-8 encoding and ensure unaccent extension is available
      try {
        await client.query("SET client_encoding TO 'UTF8'");
        console.log('✅ [STEP 2] UTF-8 encoding set');
        // Try to create unaccent extension if it doesn't exist (may fail if no permissions, that's OK)
        await client.query("CREATE EXTENSION IF NOT EXISTS unaccent").catch(() => {
          // Extension might already exist or user might not have permission - that's OK
          console.log('ℹ️ [STEP 2.1] unaccent extension check completed (may already exist)');
        });
      } catch (encodingError) {
        console.warn('⚠️ [STEP 2] Could not set encoding or create unaccent extension:', encodingError.message);
        // Continue anyway - unaccent might not be available but ILIKE will still work
      }
      
      // Handle fullData flag - if true, use larger page size but still limit it
      const fullData = options.fullData === true || options.fullData === 'true';
      // Limit fullData to max 5000 rows to prevent timeouts
      const pageSize = fullData ? Math.min(5000, parseInt(options.pageSize) || 5000) : Math.max(parseInt(options.pageSize) || 100, 1);
      const page = Math.max(parseInt(options.page) || 1, 1);
      const offset = fullData ? 0 : (page - 1) * pageSize;
      
      console.log('✅ [STEP 3] Pagination calculated:', {
        fullData,
        pageSize,
        page,
        offset
      });
      
      // ✅ FIXED: Check if includeAllFields is requested - if so, use SELECT * to return ALL fields
      const includeAllFields = options.includeAllFields === true || options.includeAllFields === 'true';
      console.log('🔵 [STEP 4] Building base SELECT query - includeAllFields:', includeAllFields);
      
      let query;
      if (includeAllFields) {
        // ✅ Return ALL fields from database when includeAllFields=true
        query = `
          SELECT *
          FROM historico_nominas_gsau
          WHERE 1=1
        `;
        console.log('✅ [STEP 4] Using SELECT * to return ALL fields from database');
      } else {
        // Use specific fields for normal queries (performance optimization)
        query = `
        SELECT 
            "RFC" as rfc,
          "CURP" as curp,
          "Nombre completo" as nombre,
            "Nombre completo" as name,
          "Puesto" as puesto,
          "Compañía" as sucursal,
            TO_CHAR(cveper, 'YYYY-MM-DD') as mes,
          cveper as cveper,
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
        console.log('✅ [STEP 4] Using specific field SELECT (normal mode)');
      }
      let countQuery = `SELECT COUNT(*) as total FROM historico_nominas_gsau WHERE 1=1`;
      let queryParams = [];
      let paramIndex = 1;
      
      console.log('✅ [STEP 4] Base query initialized:', {
        queryLength: query.length,
        countQueryLength: countQuery.length,
        paramIndex: paramIndex,
        queryParamsCount: queryParams.length
      });
      
      // Aplicar filtro por puesto categorizado
      console.log('🔵 [STEP 5] Checking puestoCategorizado filter:', options.puestoCategorizado || 'NONE');
      if (options.puestoCategorizado) {
        const puestosIncluidos = Array.isArray(options.puestoCategorizado)
          ? options.puestoCategorizado
          : [options.puestoCategorizado];

        console.log('  → [STEP 5.1] Puestos incluidos:', puestosIncluidos);

        const puestosParaCategorias = puestosIncluidos.flatMap(categoria => {
          return nominasService.getPuestosPorCategoria(categoria);
        });

        console.log('  → [STEP 5.2] Puestos para categorías:', puestosParaCategorias.length, 'puestos');

        if (puestosParaCategorias.length > 0) {
          const puestosConditions = puestosParaCategorias.map((_, index) => `$${paramIndex + index}`).join(', ');
          const sqlFragment = ` AND "Puesto" IN (${puestosConditions})`;
          
          query += sqlFragment;
          countQuery += sqlFragment;
          queryParams.push(...puestosParaCategorias);
          paramIndex += puestosParaCategorias.length;
          
          console.log('  ✅ [STEP 5.3] puestoCategorizado filter applied:', {
            sqlFragment,
            paramIndex: paramIndex - puestosParaCategorias.length,
            paramsAdded: puestosParaCategorias.length,
            newParamIndex: paramIndex
          });
        }
        } else {
        console.log('  ⏭️ [STEP 5] No puestoCategorizado filter, skipping');
      }

      // ✅ FIXED: Aplicar filtro de búsqueda global con unaccent para búsqueda sin acentos
      // CRITICAL: Only apply search filter if search term is provided and not empty
      // Search applies to ENTIRE dataset before pagination
      console.log('🔵 [STEP 6] Checking search filter:', {
        hasSearch: !!options.search,
        searchValue: options.search || 'NONE',
        searchType: typeof options.search
      });
      
      if (options.search) {
        // Clean search term (should already be cleaned in server.js, but double-check)
        let cleanedSearch = String(options.search).trim();
        console.log('  → [STEP 6.1] Search term cleaned:', {
          original: options.search,
          cleaned: cleanedSearch,
          length: cleanedSearch.length
        });
        
        // Only apply if search term is not empty
        if (cleanedSearch && cleanedSearch.length > 0) {
          const searchPattern = `%${cleanedSearch}%`;
          console.log('  → [STEP 6.2] Search pattern created:', searchPattern);
          
          // ✅ FIXED: Use unaccent() for accent-insensitive search on nombre and CURP
          const searchCondition = ` AND (
            unaccent(LOWER("Nombre completo")) ILIKE unaccent(LOWER($${paramIndex})) 
            OR unaccent(LOWER("CURP")) ILIKE unaccent(LOWER($${paramIndex}))
            OR "RFC" ILIKE $${paramIndex}
          )`;
          
          console.log('  → [STEP 6.3] Search condition SQL:', searchCondition);
          console.log('  → [STEP 6.4] Current paramIndex before search:', paramIndex);
          
          query += searchCondition;
          countQuery += searchCondition;
        queryParams.push(searchPattern);
          
          console.log('  ✅ [STEP 6.5] Search filter applied:', {
            searchTerm: cleanedSearch,
            searchPattern: searchPattern,
            paramIndex: paramIndex,
            condition: searchCondition,
            queryLength: query.length,
            countQueryLength: countQuery.length,
            queryParamsCount: queryParams.length,
            lastParam: queryParams[queryParams.length - 1]
          });
          
        paramIndex++;
          console.log('  → [STEP 6.6] paramIndex incremented to:', paramIndex);
        } else {
          console.warn('  ⚠️ [STEP 6] Search term is empty after cleaning, NOT applying filter');
        }
      } else {
        console.log('  ⏭️ [STEP 6] No search filter, skipping');
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
      
      // ✅ FIXED: Ordenamiento dinámico aplicado a TODO el dataset filtrado (antes de paginación)
      // Sorting is applied to ENTIRE filtered dataset, not just current page
      
      // 🔍 LOG: Show sorting options received
      console.log('\n\n═══════════════════════════════════════════════════════════════');
      console.log('🔍 [SORTING DEBUG - START] Sorting Configuration Received:');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📋 options.orderBy:', options.orderBy || 'UNDEFINED (will use default)');
      console.log('📋 options.orderDirection:', options.orderDirection || 'UNDEFINED (will use default)');
      console.log('📋 options.page:', options.page);
      console.log('📋 options.pageSize:', options.pageSize);
      console.log('📋 options.fullData:', options.fullData);
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      let orderClause = '';
      if (options.orderBy) {
        
        // Mapear campos del frontend a expresiones SQL correctas
        // IMPORTANT: These expressions must match the SELECT clause for consistent sorting
        // ✅ COMPLETE FIELD MAPPING: All columns can be sorted individually
        const fieldMapping = {
          // Text fields
          'nombre': '"Nombre completo"',
          'name': '"Nombre completo"',
          'curp': '"CURP"',
          'rfc': '"RFC"',
          'puesto': '"Puesto"',
          'sucursal': '"Compañía"',
          'compania': '"Compañía"',
          'department': '"Compañía"',
          'estado': '"Status"',
          'status': '"Status"',
          
          // Date/Period fields - sort by full timestamp
          'periodo': 'cveper',
          'mes': 'cveper',
          'fecha': 'cveper',
          'cveper': 'cveper',
          'date': 'cveper',
          'period': 'cveper',
          
          // Salary fields - all variations
          'salario': 'COALESCE(" SUELDO CLIENTE "::NUMERIC, 0)',
          'salary': 'COALESCE(" SUELDO CLIENTE "::NUMERIC, 0)',
          'sueldo': 'COALESCE(" SUELDO CLIENTE "::NUMERIC, 0)',
          'sueldo cliente': 'COALESCE(" SUELDO CLIENTE "::NUMERIC, 0)',
          ' sueldo cliente ': 'COALESCE(" SUELDO CLIENTE "::NUMERIC, 0)',
          
          // Comisiones fields - sum of both commission types
          'comisiones': '(COALESCE(" COMISIONES CLIENTE ", 0)::NUMERIC + COALESCE(" COMISIONES FACTURADAS ", 0)::NUMERIC)',
          'commissions': '(COALESCE(" COMISIONES CLIENTE ", 0)::NUMERIC + COALESCE(" COMISIONES FACTURADAS ", 0)::NUMERIC)',
          'comision': '(COALESCE(" COMISIONES CLIENTE ", 0)::NUMERIC + COALESCE(" COMISIONES FACTURADAS ", 0)::NUMERIC)',
          'commission': '(COALESCE(" COMISIONES CLIENTE ", 0)::NUMERIC + COALESCE(" COMISIONES FACTURADAS ", 0)::NUMERIC)',
          
          // Total Percepciones fields - all variations
          'totalpercepciones': 'COALESCE(" TOTAL DE PERCEPCIONES "::NUMERIC, 0)',
          'percepcionestotales': 'COALESCE(" TOTAL DE PERCEPCIONES "::NUMERIC, 0)',
          'percepciones totales': 'COALESCE(" TOTAL DE PERCEPCIONES "::NUMERIC, 0)',
          'total percepciones': 'COALESCE(" TOTAL DE PERCEPCIONES "::NUMERIC, 0)',
          ' total de percepciones ': 'COALESCE(" TOTAL DE PERCEPCIONES "::NUMERIC, 0)',
          'totalpercepcion': 'COALESCE(" TOTAL DE PERCEPCIONES "::NUMERIC, 0)',
          'percepcion': 'COALESCE(" TOTAL DE PERCEPCIONES "::NUMERIC, 0)'
        };
        
        // Normalizar el campo de ordenamiento (trim y lowercase para matching)
        const originalOrderBy = String(options.orderBy || '').trim();
        const normalizedOrderBy = originalOrderBy.toLowerCase().replace(/\s+/g, ' ');
        let dbField = fieldMapping[normalizedOrderBy];
        
        // 🔍 LOG: Show what field mapping is being used
        console.log('\n🔵 [FIELD MAPPING DEBUG]');
        console.log('🔵 Original orderBy (raw):', JSON.stringify(options.orderBy));
        console.log('🔵 Original orderBy (string):', originalOrderBy);
        console.log('🔵 Normalized orderBy:', normalizedOrderBy);
        console.log('🔵 orderDirection:', options.orderDirection);
        console.log('🔵 Mapped to dbField:', dbField || 'NOT FOUND IN MAPPING');
        console.log('🔵 Available mappings:', Object.keys(fieldMapping).join(', '));
        
        // Try alternative matching if not found (for flexible field name matching)
        if (!dbField) {
          // Try without spaces
          const noSpaces = normalizedOrderBy.replace(/\s/g, '');
          dbField = fieldMapping[noSpaces];
        if (dbField) {
            console.log('🔵 Found match without spaces:', noSpaces);
          }
        }
        
        if (!dbField) {
          // Try camelCase variations (e.g., "percepcionesTotales" -> "percepcionestotales")
          const camelCase = normalizedOrderBy.replace(/\s+([a-z])/g, (_, letter) => letter.toUpperCase());
          dbField = fieldMapping[camelCase];
          if (dbField) {
            console.log('🔵 Found match with camelCase:', camelCase);
          }
        }
        
        if (!dbField) {
          // Try PascalCase variations
          const pascalCase = normalizedOrderBy.replace(/\b\w/g, (char) => char.toUpperCase()).replace(/\s/g, '');
          dbField = fieldMapping[pascalCase.toLowerCase()];
          if (dbField) {
            console.log('🔵 Found match with PascalCase:', pascalCase);
          }
        }
        
        if (!dbField) {
          // Try with underscores instead of spaces
          const withUnderscores = normalizedOrderBy.replace(/\s/g, '_');
          dbField = fieldMapping[withUnderscores];
          if (dbField) {
            console.log('🔵 Found match with underscores:', withUnderscores);
          }
        }
        
        if (dbField) {
          const direction = (String(options.orderDirection || 'asc').toLowerCase() === 'desc') ? 'DESC' : 'ASC';
          
          // ✅ CRITICAL FIX: Add secondary sort fields to ensure DETERMINISTIC ordering
          // Without secondary sorts, PostgreSQL can return rows with same primary sort value in ANY order
          // This causes inconsistent results between queries
          // Secondary sorts: CURP (unique identifier) + cveper (period) for complete determinism
          // Note: Secondary sorts are always ASC/DESC regardless of primary sort direction (they're tie-breakers)
          let secondarySortFields = '';
          
          // Only add CURP as secondary if we're not already sorting by CURP
          if (!dbField.includes('"CURP"') && !dbField.includes('curp')) {
            secondarySortFields += `, "CURP" ASC`;
          }
          
          // Only add cveper as secondary if we're not already sorting by cveper/periodo
          if (!dbField.includes('cveper') && !dbField.includes('periodo') && !dbField.includes('mes') && !dbField.includes('fecha')) {
            secondarySortFields += `, cveper DESC`;
          }
          
          // Always add "Nombre completo" as final tie-breaker if not already sorting by it
          if (!dbField.includes('"Nombre completo"') && !dbField.includes('nombre')) {
            secondarySortFields += `, "Nombre completo" ASC`;
          }
          
          orderClause = ` ORDER BY ${dbField} ${direction}${secondarySortFields}`;
          
          // ✅ ENHANCED LOGGING: Special logging for salario, comisiones, percepcionesTotales
          const isNumericField = normalizedOrderBy.includes('salario') || 
                                  normalizedOrderBy.includes('sueldo') || 
                                  normalizedOrderBy.includes('comision') || 
                                  normalizedOrderBy.includes('percepcion');
          
          if (isNumericField) {
            console.log('\n💰💰💰 [NUMERIC SORTING ACTIVE] 💰💰💰');
            console.log('💰 Field:', normalizedOrderBy);
            console.log('💰 Direction:', direction);
            console.log('💰 SQL Expression:', dbField);
            console.log('💰 This sorting applies to ENTIRE DATASET (not just current page)');
            console.log('💰 ORDER BY comes BEFORE LIMIT/OFFSET, so all rows are sorted first');
            console.log('💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰\n');
          }
          
          console.log('✅ [FIELD MAPPING] Using mapped field:', dbField, 'Direction:', direction);
          console.log('✅ [FIELD MAPPING] Secondary sort fields added for deterministic ordering:', secondarySortFields || ' (none needed - primary field is unique)');
          console.log('✅ [FIELD MAPPING] Final ORDER BY clause:', orderClause);
        } else {
          // Default ordering if field not recognized - ASC by periodo with deterministic secondary sorts
          console.log('❌ [FIELD MAPPING] Field not found in mapping, using default');
          console.log('❌ [FIELD MAPPING] Tried:', normalizedOrderBy, 'but no match found');
          orderClause = ` ORDER BY cveper ASC, "Nombre completo" ASC, "CURP" ASC`;
        }
      } else {
        // ✅ DEFAULT: ASC order by periodo (cveper ASC) - latest date first means DESC, but user wants ASC
        // User requested: "asc order me periodo k basis pe default"
        // ✅ FIXED: Added CURP as secondary sort for deterministic ordering
        orderClause = ` ORDER BY cveper ASC, "Nombre completo" ASC, "CURP" ASC`;
      }
      
      // ✅ CRITICAL: Ordering is applied BEFORE pagination (LIMIT/OFFSET)
      // This ensures sorting works across ALL pages, not just current page
      // IMPORTANT: ORDER BY must come BEFORE LIMIT/OFFSET for sorting entire dataset
      // 
      // ✅ VERIFIED: For salario, comisiones, percepcionesTotales:
      //   1. ORDER BY clause is added here (line ~948)
      //   2. LIMIT/OFFSET is added AFTER (line ~965)
      //   3. This means PostgreSQL sorts ALL rows first, then applies pagination
      //   4. Result: Sorting applies to ENTIRE dataset, not just current page
      
      // Store query before ORDER BY for verification
      const queryBeforeOrderBy = query;
      query += orderClause;
      
      // 🔍 LOG IMMEDIATELY AFTER ORDER BY IS ADDED
      console.log('\n\n🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴');
      console.log('🔴 [SORTING DEBUG - IMMEDIATE] ORDER BY ADDED TO QUERY:');
      console.log('🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴');
      console.log('🔴 Order By Field:', options.orderBy || 'DEFAULT (periodo ASC)');
      console.log('🔴 Order Direction:', options.orderDirection || 'ASC (default)');
      console.log('🔴 ORDER BY Clause:', orderClause);
      console.log('🔴 Query length BEFORE ORDER BY:', queryBeforeOrderBy.length);
      console.log('🔴 Query length AFTER ORDER BY:', query.length);
      console.log('🔴 Has ORDER BY in query:', query.includes('ORDER BY') ? '✅ YES' : '❌ NO');
      console.log('🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴\n');
      
      // Apply LIMIT and OFFSET (always apply, even for fullData - we use large limit)
      // ✅ CRITICAL: LIMIT/OFFSET comes AFTER ORDER BY - this ensures entire dataset is sorted first
      const queryBeforeLimit = query;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      const finalParams = [...queryParams, pageSize, offset];
      
      // 🔍 VERIFY: ORDER BY comes before LIMIT
      const orderByPos = query.indexOf('ORDER BY');
      const limitPos = query.indexOf('LIMIT');
      console.log('\n🔵 [QUERY STRUCTURE VERIFICATION]');
      console.log('🔵 ORDER BY position:', orderByPos !== -1 ? orderByPos : 'NOT FOUND');
      console.log('🔵 LIMIT position:', limitPos !== -1 ? limitPos : 'NOT FOUND');
      console.log('🔵 ORDER BY before LIMIT:', (orderByPos !== -1 && limitPos !== -1 && orderByPos < limitPos) ? '✅ YES - CORRECT!' : '❌ NO - WRONG!');
      console.log('🔵 This means:', (orderByPos !== -1 && limitPos !== -1 && orderByPos < limitPos) ? '✅ Entire dataset will be sorted before pagination' : '❌ ERROR: Pagination happens before sorting!');
      
      // 🔍 DETAILED LOGGING: Show complete query structure - ALWAYS LOG THIS
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('🔍 [SORTING DEBUG - FINAL] Complete Query Structure:');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📋 Order By Field:', options.orderBy || 'DEFAULT (periodo ASC)');
      console.log('📋 Order Direction:', options.orderDirection || 'ASC (default)');
      console.log('📋 ORDER BY Clause:', orderClause);
      console.log('📋 Pagination:', JSON.stringify({ page, pageSize, offset, fullData }, null, 2));
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
      
      // Show the END of query (where ORDER BY and LIMIT should be)
      const queryEnd = query.length > 500 ? query.substring(Math.max(0, query.length - 500)) : query;
      console.log('\n📝 [QUERY END] Last 500 chars of query (should show ORDER BY and LIMIT):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(queryEnd);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Show full query (truncated)
      const queryPreview = query.length > 3000 ? query.substring(0, 3000) + '\n... [TRUNCATED - Query is ' + query.length + ' chars long]' : query;
      console.log('\n📝 [FINAL QUERY] Complete SQL Query (first 3000 chars):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(queryPreview);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 Final Parameters:', JSON.stringify(finalParams, null, 2));
      console.log('═══════════════════════════════════════════════════════════════\n\n');
      
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
        
        const searchInQuery = query.includes('unaccent') || query.includes('Nombre completo" ILIKE') || query.includes('CURP" ILIKE') || query.includes('RFC" ILIKE');
        const searchInCountQuery = countQuery.includes('unaccent') || countQuery.includes('Nombre completo" ILIKE') || countQuery.includes('CURP" ILIKE') || countQuery.includes('RFC" ILIKE');
        const searchParamInFinalParams = searchPattern ? finalParams.includes(searchPattern) : false;
        const searchParamInQueryParams = searchPattern ? queryParams.includes(searchPattern) : false;
        
        console.log('🚀 PayrollFilterService (api-server): Executing query with search:');
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
          console.error('❌ CRITICAL ERROR: Search parameter present but NOT in SQL query!');
          console.error('   Main query has search:', searchInQuery);
          console.error('   Count query has search:', searchInCountQuery);
        }
        if (!searchParamInFinalParams || !searchParamInQueryParams) {
          console.error('❌ CRITICAL ERROR: Search pattern NOT found in query parameters!');
          console.error('   Pattern in finalParams:', searchParamInFinalParams);
          console.error('   Pattern in queryParams:', searchParamInQueryParams);
        }
      } else if (process.env.NODE_ENV === 'development' && options.cveper) {
        console.log('🔍 Final SQL Query:', query.substring(0, 500) + '...');
        console.log('🔍 Query Params:', finalParams);
      }
      
      // ✅ FIXED: Execute queries with fallback if unaccent extension is not available
      let dataResult, countResult;
      
      // 🔍 DETAILED LOGGING: Log query execution details
      console.log('🔍 [QUERY EXECUTION] Starting query execution:', {
        hasSearch: !!options.search,
        searchTerm: options.search || 'NONE',
        orderBy: options.orderBy || 'DEFAULT (cveper DESC)',
        orderDirection: options.orderDirection || 'DEFAULT',
        filters: {
          puesto: options.puesto || 'NONE',
          sucursal: options.sucursal || 'NONE',
          status: options.status || 'NONE',
          puestoCategorizado: options.puestoCategorizado || 'NONE',
          cveper: options.cveper || 'NONE'
        },
        pagination: {
          page,
          pageSize,
          offset
        },
        queryParamsCount: queryParams.length,
        finalParamsCount: finalParams.length
      });
      
      // 🔍 Show query with ORDER BY and LIMIT visible
      const queryWithOrderBy = query.includes('ORDER BY') ? query : query + ' [NO ORDER BY FOUND!]';
      const queryEndPart = query.length > 800 ? query.substring(Math.max(0, query.length - 800)) : query;
      
      console.log('🔍 [QUERY DETAILS] Main query (first 1000 chars):', query.substring(0, 1000));
      console.log('🔍 [QUERY DETAILS] Main query END (last 800 chars - should show ORDER BY and LIMIT):', queryEndPart);
      console.log('🔍 [QUERY DETAILS] Has ORDER BY?', query.includes('ORDER BY') ? '✅ YES' : '❌ NO');
      console.log('🔍 [QUERY DETAILS] Has LIMIT?', query.includes('LIMIT') ? '✅ YES' : '❌ NO');
      console.log('🔍 [QUERY DETAILS] Count query:', countQuery.substring(0, 1000));
      console.log('🔍 [QUERY DETAILS] Query parameters:', queryParams);
      console.log('🔍 [QUERY DETAILS] Final parameters (with pagination):', finalParams);
      
      try {
        [dataResult, countResult] = await Promise.all([
        client.query(query, finalParams),
        client.query(countQuery, queryParams)
      ]);
        
        console.log('✅ [STEP 12] Query executed successfully:', {
          rowsReturned: dataResult.rows.length,
          totalCount: parseInt(countResult.rows[0]?.total || 0),
          firstRowSample: dataResult.rows.length > 0 ? {
            nombre: dataResult.rows[0].nombre,
            curp: dataResult.rows[0].curp,
            rfc: dataResult.rows[0].rfc
          } : 'NO RESULTS'
        });
        
        // 🔍 VERIFY: Check if search results match search term
        if (options.search && dataResult.rows.length > 0) {
          const firstRecord = dataResult.rows[0];
          const searchTermUpper = String(options.search).trim().toUpperCase();
          const matches = 
            (firstRecord.nombre && firstRecord.nombre.toUpperCase().includes(searchTermUpper)) ||
            (firstRecord.curp && firstRecord.curp && firstRecord.curp.toUpperCase().includes(searchTermUpper)) ||
            (firstRecord.rfc && firstRecord.rfc && firstRecord.rfc.toUpperCase().includes(searchTermUpper));
          
          console.log('🔍 [STEP 13] Verifying search results match search term:', {
            searchTerm: options.search,
            firstResultName: firstRecord.nombre,
            firstResultCurp: firstRecord.curp,
            firstResultRfc: firstRecord.rfc,
            matches: matches ? 'YES ✅' : 'NO ❌'
          });
          
          if (!matches && dataResult.rows.length >= 100) {
            console.warn('⚠️ [STEP 13] WARNING: Search applied but results do not match. Possible issue with SQL filter.');
          }
        }
      } catch (queryError) {
        // If error is due to unaccent not being available, retry with fallback query
        if (queryError.message && queryError.message.includes('unaccent')) {
          console.warn('⚠️ unaccent extension not available, using fallback search without unaccent');
          
          // Replace unaccent() calls with LOWER() for fallback
          const fallbackQuery = query.replace(/unaccent\(LOWER\([^)]+\)\)/g, (match) => {
            // Extract the column name from unaccent(LOWER("Column"))
            const columnMatch = match.match(/"([^"]+)"/);
            if (columnMatch) {
              return `LOWER("${columnMatch[1]}")`;
            }
            return match.replace(/unaccent\(/g, '').replace(/\)/g, '');
          });
          
          const fallbackCountQuery = countQuery.replace(/unaccent\(LOWER\([^)]+\)\)/g, (match) => {
            const columnMatch = match.match(/"([^"]+)"/);
            if (columnMatch) {
              return `LOWER("${columnMatch[1]}")`;
            }
            return match.replace(/unaccent\(/g, '').replace(/\)/g, '');
          });
          
          [dataResult, countResult] = await Promise.all([
            client.query(fallbackQuery, finalParams),
            client.query(fallbackCountQuery, queryParams)
          ]);
        } else {
          // Other errors - log and rethrow
          console.error('❌ SQL Query Error:', queryError.message);
          console.error('❌ Query:', query);
          console.error('❌ Params:', finalParams);
          throw queryError;
        }
      }
      
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
          
          console.log('🔍 Search verification in results:', {
            searchTerm: options.search,
            firstResultName: firstRecord.nombre,
            firstResultCurp: firstRecord.curp,
            firstResultRfc: firstRecord.rfc,
            matches: matches ? 'YES' : 'NO'
          });
          
          if (!matches && dataResult.rows.length >= 100) {
            console.warn('⚠️ WARNING: Search applied but results do not match. Possible issue with SQL filter.');
            console.warn('⚠️ This suggests the search filter is NOT working correctly.');
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
        totalRecords: total, // ✅ Added for compatibility with expected response format
        data: enrichedData,
        pagination: {
          total: total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        }
      };
      
    } catch (error) {
      console.error('❌ Error getting data with filters and sorting:', error);
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
        if (Array.isArray(options.puesto)) {
          const puestoConditions = options.puesto.map((_, index) => `$${paramIndex + index}`).join(', ');
          countQuery += ` AND "Puesto" IN (${puestoConditions})`;
          queryParams.push(...options.puesto);
          paramIndex += options.puesto.length;
        } else {
          countQuery += ` AND "Puesto" ILIKE $${paramIndex}`;
          queryParams.push(`%${options.puesto}%`);
          paramIndex++;
        }
      }
      
      if (options.sucursal) {
        if (Array.isArray(options.sucursal)) {
          const sucursalConditions = options.sucursal.map((_, index) => `$${paramIndex + index}`).join(', ');
          countQuery += ` AND "Compañía" IN (${sucursalConditions})`;
          queryParams.push(...options.sucursal);
          paramIndex += options.sucursal.length;
        } else {
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
              console.log('⏰ PayrollFilterService: Applying full timestamp filter for CURP count:', cveper);
              paramIndex++;
            }
          });
          
          if (cveperConditions.length > 0) {
            const cveperClause = ` AND (${cveperConditions.join(' OR ')})`;
            countQuery += cveperClause;
            console.log('✅ PayrollFilterService: cveper clause generated for CURP count:', cveperClause);
          }
        }
      }
      
      console.log('🚀 PayrollFilterService: Executing unique CURP count query:', countQuery);
      console.log('📋 Parameters:', queryParams);
      
      // Ejecutar consulta
      const result = await client.query(countQuery, queryParams);
      client.release();
      
      const uniqueCurpCount = parseInt(result.rows[0].unique_curps) || 0;
      const uniqueMaleCount = parseInt(result.rows[0].unique_males) || 0;
      const uniqueFemaleCount = parseInt(result.rows[0].unique_females) || 0;
      
      console.log('✅ PayrollFilterService: Unique CURPs found:', {
        total: uniqueCurpCount,
        males: uniqueMaleCount,
        females: uniqueFemaleCount
      });
      
      return {
        success: true,
        uniqueCurpCount,
        uniqueMaleCount,
        uniqueFemaleCount
      };
      
    } catch (error) {
      console.error('❌ PayrollFilterService: Error getting unique CURP count:', error);
      throw new Error(`Error getting unique CURP count: ${error.message}`);
    }
  }
}

module.exports = new PayrollFilterService();

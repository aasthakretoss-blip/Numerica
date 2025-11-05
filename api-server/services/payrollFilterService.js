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
      
      console.log('🔍 Calculando cardinalidad de filtros con filtros activos:', activeFilters);
      
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
        GROUP BY cveper
        ORDER BY cveper DESC
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
      
      console.log('✅ Filtros calculados con cardinalidad actualizada:', {
        sucursales: sucursalResult.rows.length,
        puestos: puestoResult.rows.length,
        estados: estadoResult.rows.length,
        categorias: puestosCategorias.length,
        periodos: periodoResult.rows.length
      });
      
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
      
      // Validar parámetros de paginación - SIN LÍMITE SUPERIOR para permitir cargar todos los registros
      const pageSize = Math.max(parseInt(options.pageSize) || 100, 1); // Mínimo 1, sin máximo
      const page = Math.max(parseInt(options.page) || 1, 1);
      const offset = (page - 1) * pageSize;
      
      console.log('🎯 PayrollFilterService: Obteniendo datos con filtros y sorting:', {
        page, pageSize, offset,
        orderBy: options.orderBy,
        orderDirection: options.orderDirection
      });
      
      // Query base para obtener datos de la tabla historico_nominas_gsau
      // MAPEO CORRECTO: usando los nombres exactos de las columnas como aparecen en la BD
      let query = `
        SELECT 
          "CURP" as curp,
          "Nombre completo" as nombre,
          "Puesto" as puesto,
          "Compañía" as sucursal,
          DATE(cveper)::text as mes,
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
      let countQuery = `SELECT COUNT(*) as total FROM historico_nominas_gsau WHERE 1=1`;
      let queryParams = [];
      let paramIndex = 1;
      
      // Aplicar filtro por puesto categorizado PRIMERO a nivel SQL usando puestos específicos
      if (options.puestoCategorizado) {
        console.log('🔍 DEBUGGING: Recibido puestoCategorizado:', JSON.stringify(options.puestoCategorizado));
        
        const puestosIncluidos = Array.isArray(options.puestoCategorizado)
          ? options.puestoCategorizado
          : [options.puestoCategorizado];

        console.log('🔍 DEBUGGING: Puestos incluidos procesados:', puestosIncluidos);

        // Obtener todos los puestos que corresponden a las categorías incluidas
        const puestosParaCategorias = puestosIncluidos.flatMap(categoria => {
          const puestosDeCategoria = nominasService.getPuestosPorCategoria(categoria);
          console.log(`🔍 DEBUGGING: Categoria "${categoria}" -> ${puestosDeCategoria.length} puestos:`, puestosDeCategoria.slice(0, 5), '...');
          return puestosDeCategoria;
        });

        console.log('🔍 DEBUGGING: Total puestos para filtrar:', puestosParaCategorias.length);
        console.log('🔍 DEBUGGING: Primeros 10 puestos:', puestosParaCategorias.slice(0, 10));

        // Si tenemos puestos específicos, agregarlos como filtro SQL
        if (puestosParaCategorias.length > 0) {
          const puestosConditions = puestosParaCategorias.map((_, index) => `$${paramIndex + index}`).join(', ');
          const sqlFragment = ` AND "Puesto" IN (${puestosConditions})`;
          
          query += sqlFragment;
          countQuery += sqlFragment;
          queryParams.push(...puestosParaCategorias);
          paramIndex += puestosParaCategorias.length;
          
          console.log(`🎯 PayrollFilterService: Aplicando filtro por categoría de puesto SQL:`, puestosIncluidos, `-> ${puestosParaCategorias.length} puestos específicos`);
          console.log('🔍 DEBUGGING: SQL Fragment agregado:', sqlFragment);
          console.log('🔍 DEBUGGING: Parámetros agregados:', puestosParaCategorias.slice(0, 5), '...');
        } else {
          console.log('⚠️ DEBUGGING: No se encontraron puestos para las categorías:', puestosIncluidos);
        }
      }

      // Aplicar filtros (igual que en nominasService pero consolidado)
      if (options.search) {
        const searchPattern = `%${options.search}%`;
        query += ` AND ("Nombre completo" ILIKE $${paramIndex} OR "CURP" ILIKE $${paramIndex})`;
        countQuery += ` AND ("Nombre completo" ILIKE $${paramIndex} OR "CURP" ILIKE $${paramIndex})`;
        queryParams.push(searchPattern);
        paramIndex++;
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
          
          cveperArray.forEach(cveper => {
            if (cveper.match(/^\d{4}-\d{2}$/)) {
              // Filtro por mes completo (formato YYYY-MM)
              cveperConditions.push(`DATE_TRUNC('month', cveper) = $${paramIndex}`);
              queryParams.push(`${cveper}-01`);
              console.log('🗓️ PayrollFilterService: Aplicando filtro por mes completo:', cveper);
              paramIndex++;
            } else if (cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // Filtro por fecha exacta (formato YYYY-MM-DD)
              cveperConditions.push(`DATE(cveper) = $${paramIndex}`);
              queryParams.push(cveper);
              console.log('📅 PayrollFilterService: Aplicando filtro por fecha exacta:', cveper);
              paramIndex++;
            } else {
              // Filtro por timestamp completo
              cveperConditions.push(`cveper = $${paramIndex}`);
              queryParams.push(cveper);
              console.log('⏰ PayrollFilterService: Aplicando filtro por timestamp completo:', cveper);
              paramIndex++;
            }
          });
          
          if (cveperConditions.length > 0) {
            const cveperClause = ` AND (${cveperConditions.join(' OR ')})`;
            query += cveperClause;
            countQuery += cveperClause;
            console.log('✅ PayrollFilterService: Clausula cveper generada:', cveperClause);
          }
        }
      }
      
      // CORREGIDO: Ordenamiento dinámico con conversión numérica adecuada
      let orderClause = '';
      if (options.orderBy) {
        console.log('🎯 PayrollFilterService: Configurando ordenamiento:', { orderBy: options.orderBy, orderDirection: options.orderDirection });
        
        // Mapear campos del frontend a expresiones SQL correctas
        const fieldMapping = {
          'nombre': '"Nombre completo"',
          'curp': '"CURP"',
          'puesto': '"Puesto"',
          'sucursal': '"Compañía"',
          'mes': 'DATE(cveper)',
          'salario': '(" SUELDO CLIENTE "::NUMERIC)',
          ' SUELDO CLIENTE ': '(" SUELDO CLIENTE "::NUMERIC)',
          'salary': '(" SUELDO CLIENTE "::NUMERIC)',
          'comisiones': '((COALESCE(" COMISIONES CLIENTE ", 0) + COALESCE(" COMISIONES FACTURADAS ", 0))::DECIMAL)',
          ' COMISIONES CLIENTE ': '((COALESCE(" COMISIONES CLIENTE ", 0) + COALESCE(" COMISIONES FACTURADAS ", 0))::DECIMAL)',
          'totalPercepciones': '(" TOTAL DE PERCEPCIONES "::DECIMAL)',
          ' TOTAL DE PERCEPCIONES ': '(" TOTAL DE PERCEPCIONES "::DECIMAL)',
          'percepcionesTotales': '(" TOTAL DE PERCEPCIONES "::DECIMAL)',
          'estado': '"Status"'
        };
        
        // Buscar el campo tanto con la clave original como con trim() por si tiene espacios extra
        let dbField = fieldMapping[options.orderBy] || fieldMapping[options.orderBy.trim()];
        
        if (dbField) {
          const direction = options.orderDirection === 'desc' ? 'DESC' : 'ASC';
          orderClause = ` ORDER BY ${dbField} ${direction}`;
          console.log('✅ PayrollFilterService: Clausula ORDER BY generada:', orderClause);
        } else {
          // Sin fallback - si el campo no existe, NO ordenar
          console.log('⚠️ PayrollFilterService: Campo no reconocido:', options.orderBy);
        }
      } else {
        // Default sort: by nombre (name) ascending for consistent ordering
        orderClause = ` ORDER BY "Nombre completo" ASC`;
        console.log('✅ PayrollFilterService: Aplicando orden por defecto (nombre ASC)');
      }
      
      // Always ensure there's an order clause for consistent results
      query += orderClause || ` ORDER BY "Nombre completo" ASC`;
      
      // Paginación
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      const finalParams = [...queryParams, pageSize, offset];
      
      console.log('🚀 PayrollFilterService: Ejecutando consulta SQL:', query);
      console.log('📋 Parámetros:', finalParams);
      
      // Ejecutar consultas
      const [dataResult, countResult] = await Promise.all([
        client.query(query, finalParams),
        client.query(countQuery, queryParams)
      ]);
      
      client.release();
      
      // Agregar categorización de puestos a los datos
      const enrichedData = dataResult.rows.map(employee => ({
        ...employee,
        puestoCategorizado: nominasService.getPuestoCategorizado(employee.puesto)
      }));
      
      // El filtro por puesto categorizado ya se aplicó a nivel de SQL antes de la consulta
      // Solo devolvemos los datos enriquecidos
      
      console.log('✅ PayrollFilterService: Datos obtenidos y procesados:', {
        totalFromDB: dataResult.rows.length,
        afterEnrichment: enrichedData.length,
        totalRecords: parseInt(countResult.rows[0].total)
      });
      
      return {
        success: true,
        data: enrichedData,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          page,
          pageSize,
          totalPages: Math.ceil(parseInt(countResult.rows[0].total) / pageSize)
        }
      };
      
    } catch (error) {
      console.error('❌ PayrollFilterService: Error obteniendo datos con filtros y sorting:', error);
      throw new Error(`Error al obtener datos con filtros y sorting: ${error.message}`);
    }
  }

  // NUEVO: Obtener conteo de CURPs únicos con los mismos filtros aplicados
  async getUniqueCurpCount(options = {}) {
    try {
      const client = await nominasPool.connect();
      
      console.log('🔢 PayrollFilterService: Obteniendo conteo de CURPs únicos con filtros:', options);
      
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
          console.log(`🎯 PayrollFilterService (CURP count): Aplicando filtro por categoría de puesto SQL:`, puestosIncluidos, `-> ${puestosParaCategorias.length} puestos específicos`);
        }
      }

      // Aplicar exactamente los mismos filtros que en getPayrollDataWithFiltersAndSorting
      if (options.search) {
        const searchPattern = `%${options.search}%`;
        countQuery += ` AND ("Nombre completo" ILIKE $${paramIndex} OR "CURP" ILIKE $${paramIndex})`;
        queryParams.push(searchPattern);
        paramIndex++;
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
              console.log('🗓️ PayrollFilterService: Aplicando filtro por mes completo para conteo CURP:', cveper);
              paramIndex++;
            } else if (cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // Filtro por fecha exacta (formato YYYY-MM-DD)
              cveperConditions.push(`DATE(cveper) = $${paramIndex}`);
              queryParams.push(cveper);
              console.log('📅 PayrollFilterService: Aplicando filtro por fecha exacta para conteo CURP:', cveper);
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
      
      console.log('🚀 PayrollFilterService: Ejecutando consulta de conteo CURPs únicos:', countQuery);
      console.log('📋 Parámetros:', queryParams);
      
      // Ejecutar consulta
      const result = await client.query(countQuery, queryParams);
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

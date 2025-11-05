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
    this.cacheValidDuration = 5 * 60 * 1000; // 5 minutos
  }

  // Obtener filtros con cardinalidad actualizada en tiempo real
  async getFiltersWithCardinality(activeFilters = {}) {
    try {
      const client = await nominasPool.connect();
      
      console.log('📊 [getFiltersWithCardinality] INICIO - Calculando dropdowns');
      console.log('🔍 [getFiltersWithCardinality] Filtros activos recibidos:', JSON.stringify(activeFilters, null, 2));
      
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
        if (activeFilters.cveper.match(/^\d{4}-\d{2}$/)) {
          // Filtro por mes completo (formato YYYY-MM)
          sucursalWhere += ` AND DATE_TRUNC('month', cveper) = $${sucursalParamIndex}`;
          sucursalParams.push(`${activeFilters.cveper}-01`);
        } else if (activeFilters.cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Filtro por fecha exacta (formato YYYY-MM-DD)
          sucursalWhere += ` AND DATE(cveper) = $${sucursalParamIndex}`;
          sucursalParams.push(activeFilters.cveper);
        } else {
          // Filtro por timestamp completo
          sucursalWhere += ` AND cveper = $${sucursalParamIndex}`;
          sucursalParams.push(activeFilters.cveper);
        }
        sucursalParamIndex++;
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
        if (activeFilters.cveper.match(/^\d{4}-\d{2}$/)) {
          // Filtro por mes completo (formato YYYY-MM)
          puestoWhere += ` AND DATE_TRUNC('month', cveper) = $${puestoParamIndex}`;
          puestoParams.push(`${activeFilters.cveper}-01`);
        } else if (activeFilters.cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Filtro por fecha exacta (formato YYYY-MM-DD)
          puestoWhere += ` AND DATE(cveper) = $${puestoParamIndex}`;
          puestoParams.push(activeFilters.cveper);
        } else {
          // Filtro por timestamp completo
          puestoWhere += ` AND cveper = $${puestoParamIndex}`;
          puestoParams.push(activeFilters.cveper);
        }
        puestoParamIndex++;
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
        if (activeFilters.cveper.match(/^\d{4}-\d{2}$/)) {
          // Filtro por mes completo (formato YYYY-MM)
          estadoWhere += ` AND DATE_TRUNC('month', cveper) = $${estadoParamIndex}`;
          estadoParams.push(`${activeFilters.cveper}-01`);
        } else if (activeFilters.cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Filtro por fecha exacta (formato YYYY-MM-DD)
          estadoWhere += ` AND DATE(cveper) = $${estadoParamIndex}`;
          estadoParams.push(activeFilters.cveper);
        } else {
          // Filtro por timestamp completo
          estadoWhere += ` AND cveper = $${estadoParamIndex}`;
          estadoParams.push(activeFilters.cveper);
        }
        estadoParamIndex++;
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
      console.log('🔍 [getFiltersWithCardinality] Ejecutando 4 queries en paralelo...');
      
      const [sucursalResult, puestoResult, estadoResult, periodoResult] = await Promise.all([
        client.query(sucursalQuery, sucursalParams),
        client.query(puestoQuery, puestoParams),
        client.query(estadoQuery, estadoParams),
        client.query(periodoQuery, periodoParams)
      ]);
      
      console.log('✅ [getFiltersWithCardinality] Queries ejecutadas exitosamente');
      console.log('📊 [DROPDOWN SUCURSAL] ${sucursalResult.rows.length} opciones | Primeras 3:', sucursalResult.rows.slice(0, 3));
      console.log('📊 [DROPDOWN PUESTO] ${puestoResult.rows.length} opciones | Primeras 3:', puestoResult.rows.slice(0, 3));
      console.log('📊 [DROPDOWN ESTADO] ${estadoResult.rows.length} opciones | Todas:', estadoResult.rows);
      console.log('📊 [DROPDOWN PERIODO] ${periodoResult.rows.length} opciones | Primeras 5:', periodoResult.rows.slice(0, 5));
      
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
      
      console.log('✅ [getFiltersWithCardinality] Filtros calculados con cardinalidad actualizada:', {
        sucursales: sucursalResult.rows.length,
        puestos: puestoResult.rows.length,
        estados: estadoResult.rows.length,
        categorias: puestosCategorias.length,
        periodos: periodoResult.rows.length
      });
      console.log('🎯 [getFiltersWithCardinality] FIN - Retornando resultado al frontend');
      
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
        if (activeFilters.cveper.match(/^\d{4}-\d{2}$/)) {
          // Filtro por mes completo (formato YYYY-MM)
          categoriaWhere += ` AND DATE_TRUNC('month', cveper) = $${categoriaParamIndex}`;
          categoriaParams.push(`${activeFilters.cveper}-01`);
        } else if (activeFilters.cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Filtro por fecha exacta (formato YYYY-MM-DD)
          categoriaWhere += ` AND DATE(cveper) = $${categoriaParamIndex}`;
          categoriaParams.push(activeFilters.cveper);
        } else {
          // Filtro por timestamp completo
          categoriaWhere += ` AND cveper = $${categoriaParamIndex}`;
          categoriaParams.push(activeFilters.cveper);
        }
        categoriaParamIndex++;
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
      // USAR NOMBRES ORIGINALES DE BD CON ALIAS PARA FRONTEND
      let query = `
        SELECT 
          "CURP" as curp,
          "Nombre completo" as nombre,
          "Puesto" as puesto,
          "Compañía" as sucursal,
          cveper,
          cveper as periodo,
          DATE(cveper)::text as mes,
          COALESCE(" SUELDO CLIENTE ", 0) as salario,
          COALESCE(" COMISIONES CLIENTE ", 0) + COALESCE(" COMISIONES FACTURADAS ", 0) as comisiones,
          COALESCE(" TOTAL DE PERCEPCIONES ", 0) as totalPercepciones,
          "Status" as status,
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
      
      if (options.curp) {
        // ✅ CORRECCIÓN: Agregar filtro por CURP específico
        query += ` AND "CURP" = $${paramIndex}`;
        countQuery += ` AND "CURP" = $${paramIndex}`;
        queryParams.push(options.curp);
        paramIndex++;
        console.log('🎯 PayrollFilterService: Aplicando filtro por CURP específico:', options.curp);
      }
      
      if (options.cveper) {
        if (options.cveper.match(/^\d{4}-\d{2}$/)) {
          // Filtro por mes completo (formato YYYY-MM)
          query += ` AND DATE_TRUNC('month', cveper) = $${paramIndex}`;
          countQuery += ` AND DATE_TRUNC('month', cveper) = $${paramIndex}`;
          queryParams.push(`${options.cveper}-01`);
          console.log('🗓️ PayrollFilterService: Aplicando filtro por mes completo:', options.cveper);
        } else if (options.cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Filtro por fecha exacta (formato YYYY-MM-DD)
          query += ` AND DATE(cveper) = $${paramIndex}`;
          countQuery += ` AND DATE(cveper) = $${paramIndex}`;
          queryParams.push(options.cveper);
          console.log('📅 PayrollFilterService: Aplicando filtro por fecha exacta:', options.cveper);
        } else {
          // Filtro por timestamp completo
          query += ` AND cveper = $${paramIndex}`;
          countQuery += ` AND cveper = $${paramIndex}`;
          queryParams.push(options.cveper);
          console.log('⏰ PayrollFilterService: Aplicando filtro por timestamp completo:', options.cveper);
        }
        paramIndex++;
      }
      
      // CORREGIDO: Ordenamiento dinámico con conversión numérica adecuada
      let orderClause = '';
      if (options.orderBy) {
        console.log('🎯 PayrollFilterService: Configurando ordenamiento:', { orderBy: options.orderBy, orderDirection: options.orderDirection });
        
        // LOG ESPECIAL PARA PERCEPCIONES TOTALES
        if (options.orderBy === 'percepcionesTotales' || options.orderBy === 'totalPercepciones') {
          console.log('💰 PayrollFilterService - PERCEPCIONES TOTALES detected:', {
            receivedOrderBy: options.orderBy,
            receivedDirection: options.orderDirection,
            allOptions: options
          })
        }
        
        // Mapear campos del frontend a expresiones SQL correctas
        // IMPORTANTE: Los nombres de columnas tienen espacios AL PRINCIPIO Y AL FINAL
        const fieldMapping = {
          'nombre': '"Nombre completo"',
          'curp': '"CURP"',
          'puesto': '"Puesto"',
          'sucursal': '"Compañía"',
          'mes': 'DATE(cveper)',
          'sueldo': '(" SUELDO CLIENTE "::DECIMAL)',
          'salario': '(" SUELDO CLIENTE "::DECIMAL)',
          'comisiones': '((COALESCE(" COMISIONES CLIENTE ", 0) + COALESCE(" COMISIONES FACTURADAS ", 0))::DECIMAL)',
          'percepcionesTotales': '(" TOTAL DE PERCEPCIONES "::DECIMAL)',
          'totalPercepciones': '(" TOTAL DE PERCEPCIONES "::DECIMAL)',
          'estado': '"Status"'
        };
        
        const dbField = fieldMapping[options.orderBy];
        if (dbField) {
          const direction = options.orderDirection === 'desc' ? 'DESC' : 'ASC';
          orderClause = ` ORDER BY ${dbField} ${direction}`;
          console.log('✅ PayrollFilterService: Clausula ORDER BY generada:', orderClause);
          
          // LOG ESPECIAL PARA PERCEPCIONES TOTALES
          if (options.orderBy === 'percepcionesTotales' || options.orderBy === 'totalPercepciones') {
            console.log('💰 PERCEPCIONES TOTALES - ORDER BY final:', {
              frontendKey: options.orderBy,
              dbField,
              direction,
              fullOrderClause: orderClause
            })
          }
        } else {
          orderClause = ` ORDER BY "Nombre completo" ASC`; // Fallback por defecto
          console.log('⚠️ PayrollFilterService: Campo no reconocido, usando orden por defecto:', orderClause);
          
          // LOG ESPECIAL si percepciones totales no se encontró
          if (options.orderBy === 'percepcionesTotales' || options.orderBy === 'totalPercepciones') {
            console.error('❌ PERCEPCIONES TOTALES - Campo NO encontrado en fieldMapping!', {
              receivedKey: options.orderBy,
              availableKeys: Object.keys(fieldMapping)
            })
          }
        }
      } else {
        orderClause = ` ORDER BY "Nombre completo" ASC`; // Orden por defecto
      }
      
      query += orderClause;
      
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
      
      // LOG: Verificar valores de salario en los primeros registros
      if (dataResult.rows.length > 0) {
        console.log('💰 BACKEND - Primeros 3 registros con valores de salario:');
        dataResult.rows.slice(0, 3).forEach((row, idx) => {
          console.log(`  [${idx + 1}] ${row.nombre}:`);
          console.log(`      - salario (alias): ${row.salario} (tipo: ${typeof row.salario})`);
          console.log(`      - Todos los campos con 'SUELDO': ${JSON.stringify(Object.keys(row).filter(k => k.toUpperCase().includes('SUELDO')).reduce((obj, k) => ({...obj, [k]: row[k]}), {}))}`);
        });
      }
      
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
      
      if (options.curp) {
        // ✅ CORRECCIÓN: Agregar filtro por CURP específico también en getUniqueCurpCount
        countQuery += ` AND "CURP" = $${paramIndex}`;
        queryParams.push(options.curp);
        paramIndex++;
        console.log('🎯 PayrollFilterService (CURP count): Aplicando filtro por CURP específico:', options.curp);
      }
      
      if (options.cveper) {
        if (options.cveper.match(/^\d{4}-\d{2}$/)) {
          // Filtro por mes completo (formato YYYY-MM)
          countQuery += ` AND DATE_TRUNC('month', cveper) = $${paramIndex}`;
          queryParams.push(`${options.cveper}-01`);
          console.log('🗓️ PayrollFilterService: Aplicando filtro por mes completo para conteo CURP:', options.cveper);
        } else if (options.cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Filtro por fecha exacta (formato YYYY-MM-DD)
          countQuery += ` AND DATE(cveper) = $${paramIndex}`;
          queryParams.push(options.cveper);
          console.log('📅 PayrollFilterService: Aplicando filtro por fecha exacta para conteo CURP:', options.cveper);
        } else {
          // Filtro por timestamp completo
          countQuery += ` AND cveper = $${paramIndex}`;
          queryParams.push(options.cveper);
          console.log('⏰ PayrollFilterService: Aplicando filtro por timestamp completo para conteo CURP:', options.cveper);
        }
        paramIndex++;
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

  // Método para obtener estadísticas básicas del payroll
  async getPayrollStats(options = {}) {
    try {
      const client = await nominasPool.connect();
      
      console.log('📊 PayrollFilterService: Obteniendo estadísticas completas del dataset...');
      
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
      // OPTIMIZADO: Usando CTE para calcular MAX(cveper) una sola vez
      const activeEmployeesQuery = `
        WITH max_period AS (
          SELECT MAX(cveper) as max_cveper
          FROM historico_nominas_gsau
          WHERE cveper IS NOT NULL
        )
        SELECT COUNT(DISTINCT "CURP") as active_employees
        FROM historico_nominas_gsau, max_period
        WHERE "CURP" IS NOT NULL 
          AND "CURP" != ''
          AND "Status" = 'A'
          AND cveper IS NOT NULL
          AND cveper >= max_period.max_cveper - INTERVAL '30 days'
          AND cveper <= max_period.max_cveper
      `;
      const activeEmployeesResult = await client.query(activeEmployeesQuery);
      const activeEmployees = parseInt(activeEmployeesResult.rows[0].active_employees);
      
      // 5. Total de registros en historico_fondos_gsau (usando fondosPool)
      let totalFondosRecords = 0;
      try {
        const { fondosPool } = require('../config/database');
        const fondosClient = await fondosPool.connect();
        const totalFondosQuery = `SELECT COUNT(*) as total FROM historico_fondos_gsau`;
        const totalFondosResult = await fondosClient.query(totalFondosQuery);
        totalFondosRecords = parseInt(totalFondosResult.rows[0].total);
        fondosClient.release();
      } catch (error) {
        console.warn('⚠️ Tabla historico_fondos_gsau no encontrada o error al consultar:', error.message);
        totalFondosRecords = 0;
      }
      
      client.release();
      
      const stats = {
        totalRecords,
        uniqueEmployees: activeEmployees, // CURPs únicas con Status='A' en últimos 30 días
        earliestPeriod, // Primer dato cronológico
        latestPeriod, // Último dato cronológico (más reciente)
        totalFondosRecords, // Total de datapoints en historico_fondos_gsau
        uniquePeriods: 0, // Mantenido para compatibilidad
        averageRecordsPerEmployee: activeEmployees > 0 ? Math.round(totalRecords / activeEmployees) : 0
      };
      
      console.log(`✅ Estadísticas AWS Historic: ${totalRecords.toLocaleString('es-MX')} registros nóminas, ${activeEmployees.toLocaleString('es-MX')} empleados activos (últimos 30 días, Status='A'), ${totalFondosRecords.toLocaleString('es-MX')} registros fondos, desde: ${earliestPeriod}, hasta: ${latestPeriod}`);
      
      return stats;
      
    } catch (error) {
      console.error('❌ PayrollFilterService: Error obteniendo estadísticas:', error);
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }

  // Método para obtener períodos disponibles
  async getAvailablePeriods(options = {}) {
    try {
      const client = await nominasPool.connect();
      
      console.log('📅 PayrollFilterService: Obteniendo períodos disponibles...');
      
      const periodsQuery = `
        SELECT 
          DATE_TRUNC('month', cveper) as period,
          TO_CHAR(DATE_TRUNC('month', cveper), 'YYYY-MM') as period_string,
          COUNT(*) as record_count,
          COUNT(DISTINCT "CURP") as employee_count,
          MIN(cveper) as period_start,
          MAX(cveper) as period_end
        FROM historico_nominas_gsau
        WHERE cveper IS NOT NULL
        GROUP BY DATE_TRUNC('month', cveper)
        ORDER BY period DESC
        LIMIT 36
      `;
      
      const result = await client.query(periodsQuery);
      client.release();
      
      const periods = result.rows.map(row => ({
        period: row.period,
        periodString: row.period_string, // YYYY-MM format from SQL
        recordCount: parseInt(row.record_count) || 0,
        employeeCount: parseInt(row.employee_count) || 0,
        periodStart: row.period_start,
        periodEnd: row.period_end
      }));
      
      console.log('✅ PayrollFilterService: Períodos obtenidos:', periods.length);
      console.log('📅 Primeros 3 períodos:', periods.slice(0, 3).map(p => p.periodString));
      
      return periods;
      
    } catch (error) {
      console.error('❌ PayrollFilterService: Error obteniendo períodos:', error);
      throw new Error(`Error al obtener períodos: ${error.message}`);
    }
  }
  
  // Método para obtener categorías de puestos disponibles
  async getCategoriasPuestos() {
    try {
      console.log('📋 PayrollFilterService: Obteniendo categorías de puestos...');
      
      // Obtener las categorías desde el servicio de nóminas
      const categorias = nominasService.getPuestosCategorias();
      
      console.log('✅ PayrollFilterService: Categorías obtenidas:', categorias.length);
      
      return categorias;
      
    } catch (error) {
      console.error('❌ PayrollFilterService: Error obteniendo categorías de puestos:', error);
      throw new Error(`Error al obtener categorías de puestos: ${error.message}`);
    }
  }
}

module.exports = new PayrollFilterService();

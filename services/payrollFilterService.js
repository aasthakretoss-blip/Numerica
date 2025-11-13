const { nominasPool } = require("../config/database");
const nominasService = require("./nominasService");

class PayrollFilterService {
  constructor() {
    this.filterCache = {
      sucursales: new Map(),
      puestos: new Map(),
      estados: new Map(),
      categorias: new Map(),
      periodos: new Map(),
      lastUpdated: null,
    };
    this.cacheValidDuration = 5 * 60 * 1000; // 5 minutos
  }

  // Obtener filtros con cardinalidad actualizada en tiempo real
  async getFiltersWithCardinality(activeFilters = {}) {
    try {
      const client = await nominasPool.connect();

      console.log(
        "🔍 Calculando cardinalidad de filtros con filtros activos:",
        activeFilters
      );

      // Construir WHERE clause base usando los filtros activos
      let baseWhere = "WHERE 1=1";
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
        const puestoConditions = activeFilters.puesto
          .map((_, index) => `$${sucursalParamIndex + index}`)
          .join(", ");
        sucursalWhere += ` AND "Puesto" IN (${puestoConditions})`;
        sucursalParams.push(...activeFilters.puesto);
        sucursalParamIndex += activeFilters.puesto.length;
      } else if (activeFilters.puesto) {
        sucursalWhere += ` AND "Puesto" ILIKE $${sucursalParamIndex}`;
        sucursalParams.push(`%${activeFilters.puesto}%`);
        sucursalParamIndex++;
      }

      if (activeFilters.status && Array.isArray(activeFilters.status)) {
        const statusConditions = activeFilters.status
          .map((_, index) => `$${sucursalParamIndex + index}`)
          .join(", ");
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
        const sucursalConditions = activeFilters.sucursal
          .map((_, index) => `$${puestoParamIndex + index}`)
          .join(", ");
        puestoWhere += ` AND "Compañía" IN (${sucursalConditions})`;
        puestoParams.push(...activeFilters.sucursal);
        puestoParamIndex += activeFilters.sucursal.length;
      } else if (activeFilters.sucursal) {
        puestoWhere += ` AND "Compañía" ILIKE $${puestoParamIndex}`;
        puestoParams.push(`%${activeFilters.sucursal}%`);
        puestoParamIndex++;
      }

      if (activeFilters.status && Array.isArray(activeFilters.status)) {
        const statusConditions = activeFilters.status
          .map((_, index) => `$${puestoParamIndex + index}`)
          .join(", ");
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
        const sucursalConditions = activeFilters.sucursal
          .map((_, index) => `$${estadoParamIndex + index}`)
          .join(", ");
        estadoWhere += ` AND "Compañía" IN (${sucursalConditions})`;
        estadoParams.push(...activeFilters.sucursal);
        estadoParamIndex += activeFilters.sucursal.length;
      } else if (activeFilters.sucursal) {
        estadoWhere += ` AND "Compañía" ILIKE $${estadoParamIndex}`;
        estadoParams.push(`%${activeFilters.sucursal}%`);
        estadoParamIndex++;
      }

      if (activeFilters.puesto && Array.isArray(activeFilters.puesto)) {
        const puestoConditions = activeFilters.puesto
          .map((_, index) => `$${estadoParamIndex + index}`)
          .join(", ");
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
        const sucursalConditions = activeFilters.sucursal
          .map((_, index) => `$${periodoParamIndex + index}`)
          .join(", ");
        periodoWhere += ` AND "Compañía" IN (${sucursalConditions})`;
        periodoParams.push(...activeFilters.sucursal);
        periodoParamIndex += activeFilters.sucursal.length;
      } else if (activeFilters.sucursal) {
        periodoWhere += ` AND "Compañía" ILIKE $${periodoParamIndex}`;
        periodoParams.push(`%${activeFilters.sucursal}%`);
        periodoParamIndex++;
      }

      if (activeFilters.puesto && Array.isArray(activeFilters.puesto)) {
        const puestoConditions = activeFilters.puesto
          .map((_, index) => `$${periodoParamIndex + index}`)
          .join(", ");
        periodoWhere += ` AND "Puesto" IN (${puestoConditions})`;
        periodoParams.push(...activeFilters.puesto);
        periodoParamIndex += activeFilters.puesto.length;
      } else if (activeFilters.puesto) {
        periodoWhere += ` AND "Puesto" ILIKE $${periodoParamIndex}`;
        periodoParams.push(`%${activeFilters.puesto}%`);
        periodoParamIndex++;
      }

      if (activeFilters.status && Array.isArray(activeFilters.status)) {
        const statusConditions = activeFilters.status
          .map((_, index) => `$${periodoParamIndex + index}`)
          .join(", ");
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
      const [sucursalResult, puestoResult, estadoResult, periodoResult] =
        await Promise.all([
          client.query(sucursalQuery, sucursalParams),
          client.query(puestoQuery, puestoParams),
          client.query(estadoQuery, estadoParams),
          client.query(periodoQuery, periodoParams),
        ]);

      // Obtener categorías de puestos con conteos globales
      const puestosCategorias = await this.getPuestoCategoriasWithGlobalCounts(
        client,
        activeFilters
      );

      client.release();

      const result = {
        success: true,
        data: {
          sucursales: sucursalResult.rows,
          puestos: puestoResult.rows,
          estados: estadoResult.rows,
          puestosCategorias: puestosCategorias,
          periodos: periodoResult.rows,
        },
        timestamp: new Date().toISOString(),
        activeFilters,
      };

      console.log("✅ Filtros calculados con cardinalidad actualizada:", {
        sucursales: sucursalResult.rows.length,
        puestos: puestoResult.rows.length,
        estados: estadoResult.rows.length,
        categorias: puestosCategorias.length,
        periodos: periodoResult.rows.length,
      });

      return result;
    } catch (error) {
      console.error("❌ Error calculando filtros con cardinalidad:", error);
      throw new Error(`Error al calcular filtros: ${error.message}`);
    }
  }

  // Obtener categorías de puestos con conteos globales
  async getPuestoCategoriasWithGlobalCounts(client, activeFilters = {}) {
    try {
      // Construir WHERE para categorías de puestos (excluyendo el filtro de categoría de puestos)
      let categoriaWhere = "WHERE 1=1";
      let categoriaParams = [];
      let categoriaParamIndex = 1;

      if (activeFilters.search) {
        const searchPattern = `%${activeFilters.search}%`;
        categoriaWhere += ` AND ("Nombre completo" ILIKE $${categoriaParamIndex} OR "CURP" ILIKE $${categoriaParamIndex})`;
        categoriaParams.push(searchPattern);
        categoriaParamIndex++;
      }

      if (activeFilters.sucursal && Array.isArray(activeFilters.sucursal)) {
        const sucursalConditions = activeFilters.sucursal
          .map((_, index) => `$${categoriaParamIndex + index}`)
          .join(", ");
        categoriaWhere += ` AND "Compañía" IN (${sucursalConditions})`;
        categoriaParams.push(...activeFilters.sucursal);
        categoriaParamIndex += activeFilters.sucursal.length;
      } else if (activeFilters.sucursal) {
        categoriaWhere += ` AND "Compañía" ILIKE $${categoriaParamIndex}`;
        categoriaParams.push(`%${activeFilters.sucursal}%`);
        categoriaParamIndex++;
      }

      if (activeFilters.puesto && Array.isArray(activeFilters.puesto)) {
        const puestoConditions = activeFilters.puesto
          .map((_, index) => `$${categoriaParamIndex + index}`)
          .join(", ");
        categoriaWhere += ` AND "Puesto" IN (${puestoConditions})`;
        categoriaParams.push(...activeFilters.puesto);
        categoriaParamIndex += activeFilters.puesto.length;
      } else if (activeFilters.puesto) {
        categoriaWhere += ` AND "Puesto" ILIKE $${categoriaParamIndex}`;
        categoriaParams.push(`%${activeFilters.puesto}%`);
        categoriaParamIndex++;
      }

      if (activeFilters.status && Array.isArray(activeFilters.status)) {
        const statusConditions = activeFilters.status
          .map((_, index) => `$${categoriaParamIndex + index}`)
          .join(", ");
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
      categoriasDisponibles.forEach((categoria) => {
        categoriaConteos.set(categoria, 0);
      });

      // Sumar conteos por categoría
      puestosResult.rows.forEach((row) => {
        let categoria = nominasService.getPuestoCategorizado(row.puesto);
        // ✅ FIX: Normalizar "Categorizar" a "Sin Categorizar" si viene del CSV
        if (categoria === "Categorizar") {
          categoria = "Sin Categorizar";
        }
        const currentCount = categoriaConteos.get(categoria) || 0;
        categoriaConteos.set(categoria, currentCount + parseInt(row.count));
      });

      // ✅ FIX: Asegurar que "Sin Categorizar" esté en el mapa si no existe
      if (!categoriaConteos.has("Sin Categorizar")) {
        categoriaConteos.set("Sin Categorizar", 0);
      }

      // ✅ FIXED: Convertir a formato de array, MOSTRAR TODAS las categorías (incluso con count 0)
      // Esto asegura que el dropdown siempre muestre todas las opciones disponibles
      const result = Array.from(categoriaConteos.entries())
        .map(([categoria, count]) => ({ value: categoria, count: count || 0 }))
        .sort((a, b) => a.value.localeCompare(b.value));

      console.log(
        "✅ [Puesto Categorizado] Categorías encontradas:",
        result.length
      );
      console.log(
        "✅ [Puesto Categorizado] Categorías:",
        result.map((c) => `${c.value} (${c.count})`).join(", ")
      );

      return result;
    } catch (error) {
      console.error("❌ Error calculando categorías de puestos:", error);
      return [];
    }
  }

  // NUEVO: Obtener datos de payroll con filtros y sorting integrado
  async getPayrollDataWithFiltersAndSorting(options = {}) {
    try {
      const client = await nominasPool.connect();

      // ✅ FIXED: Set UTF-8 encoding and ensure unaccent extension is available
      try {
        await client.query("SET client_encoding TO 'UTF8'");
        // Try to create unaccent extension if it doesn't exist (may fail if no permissions, that's OK)
        await client
          .query("CREATE EXTENSION IF NOT EXISTS unaccent")
          .catch(() => {
            // Extension might already exist or user might not have permission - that's OK
            console.log(
              "ℹ️ unaccent extension check completed (may already exist)"
            );
          });
      } catch (encodingError) {
        console.warn(
          "⚠️ Could not set encoding or create unaccent extension:",
          encodingError.message
        );
        // Continue anyway - unaccent might not be available but ILIKE will still work
      }

      // Validar y limitar parámetros de paginación
      const pageSize = Math.min(
        Math.max(parseInt(options.pageSize) || 100, 1),
        1000
      ); // Entre 1 y 1000
      const page = Math.max(parseInt(options.page) || 1, 1);
      const offset = (page - 1) * pageSize;

      console.log(
        "🎯 PayrollFilterService: Obteniendo datos con filtros y sorting:",
        {
          page,
          pageSize,
          offset,
          orderBy: options.orderBy,
          orderDirection: options.orderDirection,
          search: options.search || "NO SEARCH",
          puesto: options.puesto || "NO PUESTO",
          sucursal: options.sucursal || "NO SUCURSAL",
          status: options.status || "NO STATUS",
        }
      );

      // Query base para obtener datos de la tabla historico_nominas_gsau
      // MAPEO CORRECTO: usando los nombres exactos de las columnas como aparecen en la BD
      let query = `
        SELECT 
  "CURP" AS curp,
  "cvecia" AS cvecia,
  "Nombre completo" AS nombre,
  "RFC" AS rfc,
  "Puesto" AS puesto,
  "Compañía" AS sucursal,
  DATE(cveper)::text AS mes,
  cveper AS periodo,
  cveper AS cveper,
  TO_CHAR(COALESCE(" SUELDO CLIENTE "::NUMERIC, 0), 'FM999999990.00') AS salario,
  TO_CHAR((COALESCE(" COMISIONES CLIENTE "::NUMERIC, 0) + COALESCE(" COMISIONES FACTURADAS "::NUMERIC, 0)), 'FM999999990.00') AS comisiones,
  TO_CHAR(COALESCE(" TOTAL DE PERCEPCIONES "::NUMERIC, 0), 'FM999999990.00') AS totalpercepciones,
  "Status" AS status,
  CASE 
    WHEN "Status" = 'A' THEN 'Activo'
    WHEN "Status" = 'B' THEN 'Baja'
    WHEN "Status" = 'F' THEN 'Finiquito'
    ELSE 'N/A'
  END AS estado,
  "Periodicidad" AS periodicidad,
  "Clave trabajador" AS "claveTrabajador",
  "Número IMSS" AS "numeroIMSS",
  "Fecha antigüedad" AS "fechaAntiguedad",
  "Antigüedad en FPL" AS "antiguedadFPL"
FROM historico_nominas_gsau
WHERE 1=1
      `;
      let countQuery = `SELECT COUNT(*) as total FROM historico_nominas_gsau WHERE 1=1`;
      let queryParams = [];
      let paramIndex = 1;

      // Aplicar filtro por puesto categorizado PRIMERO a nivel SQL usando puestos específicos
      if (options.puestoCategorizado) {
        console.log(
          "🔍 DEBUGGING: Recibido puestoCategorizado:",
          JSON.stringify(options.puestoCategorizado)
        );

        const puestosIncluidos = Array.isArray(options.puestoCategorizado)
          ? options.puestoCategorizado
          : [options.puestoCategorizado];

        console.log(
          "🔍 DEBUGGING: Puestos incluidos procesados:",
          puestosIncluidos
        );

        // Obtener todos los puestos que corresponden a las categorías incluidas
        const puestosParaCategorias = puestosIncluidos.flatMap((categoria) => {
          const puestosDeCategoria =
            nominasService.getPuestosPorCategoria(categoria);
          console.log(
            `🔍 DEBUGGING: Categoria "${categoria}" -> ${puestosDeCategoria.length} puestos:`,
            puestosDeCategoria.slice(0, 5),
            "..."
          );
          return puestosDeCategoria;
        });

        console.log(
          "🔍 DEBUGGING: Total puestos para filtrar:",
          puestosParaCategorias.length
        );
        console.log(
          "🔍 DEBUGGING: Primeros 10 puestos:",
          puestosParaCategorias.slice(0, 10)
        );

        // Si tenemos puestos específicos, agregarlos como filtro SQL
        if (puestosParaCategorias.length > 0) {
          const puestosConditions = puestosParaCategorias
            .map((_, index) => `$${paramIndex + index}`)
            .join(", ");
          const sqlFragment = ` AND "Puesto" IN (${puestosConditions})`;

          query += sqlFragment;
          countQuery += sqlFragment;
          queryParams.push(...puestosParaCategorias);
          paramIndex += puestosParaCategorias.length;

          console.log(
            `🎯 PayrollFilterService: Aplicando filtro por categoría de puesto SQL:`,
            puestosIncluidos,
            `-> ${puestosParaCategorias.length} puestos específicos`
          );
          console.log("🔍 DEBUGGING: SQL Fragment agregado:", sqlFragment);
          console.log(
            "🔍 DEBUGGING: Parámetros agregados:",
            puestosParaCategorias.slice(0, 5),
            "..."
          );
        } else {
          console.log(
            "⚠️ DEBUGGING: No se encontraron puestos para las categorías:",
            puestosIncluidos
          );
        }
      }

      // Aplicar filtros (igual que en nominasService pero consolidado)
      // CRITICAL: Only apply search filter if search term is provided and not empty
      // ✅ FIXED: Aplicar filtro de búsqueda global con unaccent para búsqueda sin acentos
      // CRITICAL: Only apply search filter if search term is provided and not empty
      // Search applies to ENTIRE dataset before pagination
      if (options.search) {
        // Clean search term (should already be cleaned in server.js, but double-check)
        let cleanedSearch = String(options.search).trim();

        // Only apply if search term is not empty
        if (cleanedSearch && cleanedSearch.length > 0) {
          const searchPattern = `%${cleanedSearch}%`;

          // ✅ FIXED: Use unaccent() for accent-insensitive search on nombre and CURP
          // Note: unaccent extension should be installed for best results
          const searchCondition = ` AND (
            unaccent(LOWER("Nombre completo")) ILIKE unaccent(LOWER($${paramIndex})) 
            OR unaccent(LOWER("CURP")) ILIKE unaccent(LOWER($${paramIndex}))
            OR "RFC" ILIKE $${paramIndex}
          )`;

          query += searchCondition;
          countQuery += searchCondition;
          queryParams.push(searchPattern);

          console.log(
            "✅ PayrollFilterService: Aplicando filtro de búsqueda global (con unaccent):",
            {
              searchTerm: cleanedSearch,
              searchPattern: searchPattern,
              paramIndex: paramIndex,
              condition: searchCondition,
              note: "Search applies to ENTIRE dataset before pagination",
            }
          );

          paramIndex++;
        } else {
          console.warn(
            "⚠️ PayrollFilterService: Search term está vacío, NO aplicando filtro"
          );
        }
      }

      if (options.puesto) {
        if (Array.isArray(options.puesto)) {
          const puestoConditions = options.puesto
            .map((_, index) => `$${paramIndex + index}`)
            .join(", ");
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
          const sucursalConditions = options.sucursal
            .map((_, index) => `$${paramIndex + index}`)
            .join(", ");
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
          const statusCodes = options.status.map((estado) => {
            switch (estado) {
              case "Activo":
                return "A";
              case "Baja":
                return "B";
              case "Finiquito":
                return "F";
              default:
                return estado;
            }
          });
          const statusConditions = statusCodes
            .map((_, index) => `$${paramIndex + index}`)
            .join(", ");
          query += ` AND "Status" IN (${statusConditions})`;
          countQuery += ` AND "Status" IN (${statusConditions})`;
          queryParams.push(...statusCodes);
          paramIndex += statusCodes.length;
        } else {
          let statusCode = options.status;
          switch (options.status) {
            case "Activo":
              statusCode = "A";
              break;
            case "Baja":
              statusCode = "B";
              break;
            case "Finiquito":
              statusCode = "F";
              break;
          }
          query += ` AND "Status" = $${paramIndex}`;
          countQuery += ` AND "Status" = $${paramIndex}`;
          queryParams.push(statusCode);
          paramIndex++;
        }
      }

      if (options.cveper) {
        if (options.cveper.match(/^\d{4}-\d{2}$/)) {
          // Filtro por mes completo (formato YYYY-MM)
          query += ` AND DATE_TRUNC('month', cveper) = $${paramIndex}`;
          countQuery += ` AND DATE_TRUNC('month', cveper) = $${paramIndex}`;
          queryParams.push(`${options.cveper}-01`);
          console.log(
            "🗓️ PayrollFilterService: Aplicando filtro por mes completo:",
            options.cveper
          );
        } else if (options.cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Filtro por fecha exacta (formato YYYY-MM-DD)
          query += ` AND DATE(cveper) = $${paramIndex}`;
          countQuery += ` AND DATE(cveper) = $${paramIndex}`;
          queryParams.push(options.cveper);
          console.log(
            "📅 PayrollFilterService: Aplicando filtro por fecha exacta:",
            options.cveper
          );
        } else {
          // Filtro por timestamp completo
          query += ` AND cveper = $${paramIndex}`;
          countQuery += ` AND cveper = $${paramIndex}`;
          queryParams.push(options.cveper);
          console.log(
            "⏰ PayrollFilterService: Aplicando filtro por timestamp completo:",
            options.cveper
          );
        }
        paramIndex++;
      }

      // CORREGIDO: Ordenamiento dinámico con conversión numérica adecuada
      let orderClause = "";
      if (options.orderBy) {
        // ✅ BACKEND LOGGING: Log incoming sort parameters
        console.log("\n🔵🔵🔵 [BACKEND SORTING DEBUG] 🔵🔵🔵");
        console.log(
          "🔵 Incoming orderBy parameter:",
          JSON.stringify(options.orderBy)
        );
        console.log(
          "🔵 Incoming orderDirection parameter:",
          JSON.stringify(options.orderDirection)
        );
        console.log("🔵 Type of orderBy:", typeof options.orderBy);
        console.log("🔵 orderBy length:", String(options.orderBy || "").length);

        // Mapear campos del frontend a expresiones SQL correctas
        // ✅ FIXED: Normalize orderBy to handle case variations (frontend sends lowercase)
        const normalizedOrderBy = String(options.orderBy || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "")
          .replace(/_/g, "");
        console.log("🔵 Normalized orderBy:", normalizedOrderBy);

        const fieldMapping = {
          nombre: '"Nombre completo"',
          cvecia: '"cvecia"',
          name: '"Nombre completo"',
          curp: '"CURP"',
          rfc: '"RFC"',
          puesto: '"Puesto"',
          sucursal: '"Compañía"',
          compania: '"Compañía"',
          mes: "DATE(cveper)",
          cveper: "cveper",
          periodo: "cveper",
          salario: 'COALESCE(" SUELDO CLIENTE "::NUMERIC, 0)',
          salary: 'COALESCE(" SUELDO CLIENTE "::NUMERIC, 0)',
          sueldo: 'COALESCE(" SUELDO CLIENTE "::NUMERIC, 0)',
          // ✅ FIXED: Comisiones sorting uses sum of both commission fields with proper casting
          comisiones:
            '(COALESCE(" COMISIONES CLIENTE "::NUMERIC, 0) + COALESCE(" COMISIONES FACTURADAS "::NUMERIC, 0))',
          commissions:
            '(COALESCE(" COMISIONES CLIENTE "::NUMERIC, 0) + COALESCE(" COMISIONES FACTURADAS "::NUMERIC, 0))',
          // ✅ CRITICAL FIX: Add all variations (case-insensitive)
          totalpercepciones: 'COALESCE(" TOTAL DE PERCEPCIONES "::NUMERIC, 0)',
          percepcionestotales:
            'COALESCE(" TOTAL DE PERCEPCIONES "::NUMERIC, 0)',
          totalpercepcion: 'COALESCE(" TOTAL DE PERCEPCIONES "::NUMERIC, 0)',
          percepcion: 'COALESCE(" TOTAL DE PERCEPCIONES "::NUMERIC, 0)',
          estado: '"Status"',
          status: '"Status"',
        };

        console.log(
          "🔵 Available field mappings:",
          Object.keys(fieldMapping).join(", ")
        );

        // Try direct match first
        let dbField = fieldMapping[normalizedOrderBy];
        console.log("🔵 Direct match result:", dbField || "NOT FOUND");

        // ✅ CRITICAL FIX: If not found, try fallback for percepciones
        if (
          !dbField &&
          (normalizedOrderBy.includes("percepcion") ||
            normalizedOrderBy.includes("total"))
        ) {
          dbField = 'COALESCE(" TOTAL DE PERCEPCIONES "::NUMERIC, 0)';
          console.log("🔵 ✅ FORCED MATCH for percepciones field");
        }

        if (dbField) {
          const direction = options.orderDirection === "desc" ? "DESC" : "ASC";
          // ✅ FIXED: Secondary sort by cveper DESC to ensure consistent ordering across pages
          orderClause = ` ORDER BY ${dbField} ${direction}, cveper DESC, "Nombre completo" ASC, "CURP" ASC`;
          console.log(
            "✅ PayrollFilterService: Clausula ORDER BY generada:",
            orderClause
          );
          console.log("✅ SQL Expression for sorting:", dbField);
          console.log("✅ Sort direction:", direction);
        } else {
          // ✅ FIXED: Default ordering by latest cveper (descending) when field not recognized
          orderClause = ` ORDER BY cveper DESC, "Nombre completo" ASC, "CURP" ASC`;
          console.log(
            "⚠️ PayrollFilterService: Campo no reconocido, usando orden por defecto:",
            orderClause
          );
          console.log("⚠️ Tried normalized orderBy:", normalizedOrderBy);
          console.log(
            "⚠️ Available mappings:",
            Object.keys(fieldMapping).join(", ")
          );
        }
        console.log(
          "🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵\n"
        );
      } else {
        // ✅ FIXED: Default sorting: latest payroll period (cveper) descending, then by name
        orderClause = ` ORDER BY cveper DESC, "Nombre completo" ASC, "CURP" ASC`;
      }

      // ✅ CRITICAL: Ordering is applied BEFORE pagination (LIMIT/OFFSET)
      // This ensures sorting works across ALL pages, not just current page
      query += orderClause;

      // Paginación
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      const finalParams = [...queryParams, pageSize, offset];

      // CRITICAL DEBUG: Verify search parameter is in finalParams if search was applied
      if (options.search) {
        const searchTerm = String(options.search).trim();
        if (searchTerm && searchTerm.length > 0) {
          const searchPattern = `%${searchTerm}%`;
          const searchParamIndex = queryParams.findIndex(
            (p) => p === searchPattern
          );
          console.log(
            "🔍 DEBUG CRÍTICO - Verificación de parámetro de búsqueda:",
            {
              searchTerm: searchTerm,
              searchPattern: searchPattern,
              searchParamInQueryParams:
                searchParamIndex >= 0
                  ? `YES (index ${searchParamIndex})`
                  : "NO FOUND!",
              queryParamsLength: queryParams.length,
              finalParamsLength: finalParams.length,
              queryParams: queryParams.slice(0, 5),
              searchConditionInQuery: query.includes('Nombre completo" ILIKE')
                ? "YES"
                : "NO",
            }
          );

          if (searchParamIndex < 0) {
            console.error(
              "❌ ERROR CRÍTICO: Search pattern NO encontrado en queryParams!"
            );
          }
          if (!query.includes('Nombre completo" ILIKE')) {
            console.error(
              "❌ ERROR CRÍTICO: Search condition NO encontrado en query SQL!"
            );
          }
        }
      }

      console.log("🚀 PayrollFilterService: Ejecutando consulta SQL completa:");
      console.log("📝 Query:", query);
      console.log("📝 Count Query:", countQuery);
      console.log("📋 Parámetros:", finalParams);
      console.log("📋 Count Query Parámetros:", queryParams);
      console.log("🔍 Total parámetros:", finalParams.length);

      // CRITICAL: Verify search filter is in the query (check for unaccent or ILIKE)
      const searchInQuery =
        query.includes("unaccent") ||
        query.includes('Nombre completo" ILIKE') ||
        query.includes('CURP" ILIKE') ||
        query.includes('RFC" ILIKE');
      if (options.search) {
        console.log("✅ Filtro de búsqueda ACTIVO:", options.search);
        if (!searchInQuery) {
          console.error(
            "❌ ERROR CRÍTICO: Search parameter presente pero NO en la query SQL!"
          );
          console.error("Query actual:", query.substring(0, 500));
        } else {
          console.log("✅ Verificado: Filtro de búsqueda está en la query SQL");
        }
      } else {
        console.log("⚠️ Filtro de búsqueda NO ACTIVO");
      }

      // ✅ FIXED: Execute queries with fallback if unaccent extension is not available
      let dataResult, countResult;
      try {
        [dataResult, countResult] = await Promise.all([
          client.query(query, finalParams),
          client.query(countQuery, queryParams),
        ]);
      } catch (queryError) {
        // If error is due to unaccent not being available, retry with fallback query
        if (queryError.message && queryError.message.includes("unaccent")) {
          console.warn(
            "⚠️ unaccent extension not available, using fallback search without unaccent"
          );

          // Replace unaccent() calls with LOWER() for fallback
          const fallbackQuery = query.replace(
            /unaccent\(LOWER\([^)]+\)\)/g,
            (match) => {
              // Extract the column name from unaccent(LOWER("Column"))
              const columnMatch = match.match(/"([^"]+)"/);
              if (columnMatch) {
                return `LOWER("${columnMatch[1]}")`;
              }
              return match.replace(/unaccent\(/g, "").replace(/\)/g, "");
            }
          );

          const fallbackCountQuery = countQuery.replace(
            /unaccent\(LOWER\([^)]+\)\)/g,
            (match) => {
              const columnMatch = match.match(/"([^"]+)"/);
              if (columnMatch) {
                return `LOWER("${columnMatch[1]}")`;
              }
              return match.replace(/unaccent\(/g, "").replace(/\)/g, "");
            }
          );

          [dataResult, countResult] = await Promise.all([
            client.query(fallbackQuery, finalParams),
            client.query(fallbackCountQuery, queryParams),
          ]);
        } else {
          // Other errors - log and rethrow
          console.error("❌ SQL Query Error:", queryError.message);
          console.error("❌ Query:", query);
          console.error("❌ Params:", finalParams);
          throw queryError;
        }
      }

      console.log("📊 PayrollFilterService: Resultados de la consulta:", {
        recordsReturned: dataResult.rows.length,
        totalRecords: parseInt(countResult.rows[0].total),
        searchApplied: options.search ? "YES" : "NO",
        searchTerm: options.search || "N/A",
      });

      // ✅ BACKEND LOGGING: Log SQL query being executed
      console.log("\n🔵🔵🔵 [BACKEND SQL QUERY DEBUG] 🔵🔵🔵");
      console.log(
        "🔵 Full SQL Query (last 500 chars):",
        query.substring(Math.max(0, query.length - 500))
      );
      console.log("🔵 Query Parameters:", finalParams);
      console.log(
        "🔵 Has ORDER BY:",
        query.includes("ORDER BY") ? "YES" : "NO"
      );
      if (query.includes("ORDER BY")) {
        const orderByIndex = query.indexOf("ORDER BY");
        console.log(
          "🔵 ORDER BY clause:",
          query.substring(
            orderByIndex,
            Math.min(orderByIndex + 200, query.length)
          )
        );
      }

      // ✅ BACKEND LOGGING: Log first 10 rows of DB response BEFORE sending to frontend
      console.log("\n🔵🔵🔵 [BACKEND DB RESPONSE DEBUG] 🔵🔵🔵");
      console.log("🔵 Total rows from PostgreSQL:", dataResult.rows.length);
      if (dataResult.rows.length > 0) {
        console.log(
          "🔵 First 10 rows from PostgreSQL (BEFORE any transformation):"
        );
        dataResult.rows.slice(0, 10).forEach((row, idx) => {
          const totalPercepciones =
            row.totalPercepciones ||
            row[" TOTAL DE PERCEPCIONES "] ||
            row["totalPercepciones"] ||
            "NOT FOUND";
          const sueldo = row.sueldo || row[" SUELDO CLIENTE "] || "NOT FOUND";
          const comisiones = row.comisiones || "NOT FOUND";
          console.log(
            `  [${idx + 1}] nombre: ${
              row.nombre || "N/A"
            }, totalPercepciones: ${totalPercepciones} (type: ${typeof totalPercepciones}), sueldo: ${sueldo}, comisiones: ${comisiones}`
          );
          console.log(`      All keys in row: ${Object.keys(row).join(", ")}`);
          // Check if field exists
          const hasTotalPercepciones = "totalPercepciones" in row;
          const hasTotalDePercepciones = " TOTAL DE PERCEPCIONES " in row;
          console.log(
            `      Has 'totalPercepciones' key: ${hasTotalPercepciones}, Has ' TOTAL DE PERCEPCIONES ' key: ${hasTotalDePercepciones}`
          );
        });
      } else {
        console.log("⚠️ No rows returned from PostgreSQL!");
      }
      console.log(
        "🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵\n"
      );

      // Si hay búsqueda activa, verificar que los resultados coinciden
      if (options.search && dataResult.rows.length > 0) {
        const firstRecord = dataResult.rows[0];
        const searchTerm = String(options.search).trim().toUpperCase();
        const matchesSearch =
          (firstRecord.nombre &&
            firstRecord.nombre.toUpperCase().includes(searchTerm)) ||
          (firstRecord.curp &&
            firstRecord.curp.toUpperCase().includes(searchTerm)) ||
          (firstRecord.rfc &&
            firstRecord.rfc.toUpperCase().includes(searchTerm));

        console.log("🔍 Verificación de búsqueda en primer resultado:", {
          searchTerm: searchTerm,
          nombre: firstRecord.nombre,
          curp: firstRecord.curp,
          rfc: firstRecord.rfc,
          matchesSearch: matchesSearch,
        });
      }

      client.release();

      // Agregar categorización de puestos a los datos
      const enrichedData = dataResult.rows.map((employee) => ({
        ...employee,
        puestoCategorizado: nominasService.getPuestoCategorizado(
          employee.puesto
        ),
      }));

      // El filtro por puesto categorizado ya se aplicó a nivel de SQL antes de la consulta
      // Solo devolvemos los datos enriquecidos

      console.log("✅ PayrollFilterService: Datos obtenidos y procesados:", {
        totalFromDB: dataResult.rows.length,
        afterEnrichment: enrichedData.length,
        totalRecords: parseInt(countResult.rows[0].total),
      });

      return {
        success: true,
        data: enrichedData,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          page,
          pageSize,
          totalPages: Math.ceil(parseInt(countResult.rows[0].total) / pageSize),
        },
      };
    } catch (error) {
      console.error(
        "❌ PayrollFilterService: Error obteniendo datos con filtros y sorting:",
        error
      );
      throw new Error(
        `Error al obtener datos con filtros y sorting: ${error.message}`
      );
    }
  }

  // NUEVO: Obtener conteo de CURPs únicos con los mismos filtros aplicados
  async getUniqueCurpCount(options = {}) {
    try {
      const client = await nominasPool.connect();

      console.log(
        "🔢 PayrollFilterService: Obteniendo conteo de CURPs únicos con filtros:",
        options
      );

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
        const puestosParaCategorias = puestosIncluidos.flatMap((categoria) =>
          nominasService.getPuestosPorCategoria(categoria)
        );

        // Si tenemos puestos específicos, agregarlos como filtro SQL
        if (puestosParaCategorias.length > 0) {
          const puestosConditions = puestosParaCategorias
            .map((_, index) => `$${paramIndex + index}`)
            .join(", ");
          countQuery += ` AND "Puesto" IN (${puestosConditions})`;
          queryParams.push(...puestosParaCategorias);
          paramIndex += puestosParaCategorias.length;
          console.log(
            `🎯 PayrollFilterService (CURP count): Aplicando filtro por categoría de puesto SQL:`,
            puestosIncluidos,
            `-> ${puestosParaCategorias.length} puestos específicos`
          );
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
          const puestoConditions = options.puesto
            .map((_, index) => `$${paramIndex + index}`)
            .join(", ");
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
          const sucursalConditions = options.sucursal
            .map((_, index) => `$${paramIndex + index}`)
            .join(", ");
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
          const statusCodes = options.status.map((estado) => {
            switch (estado) {
              case "Activo":
                return "A";
              case "Baja":
                return "B";
              case "Finiquito":
                return "F";
              default:
                return estado;
            }
          });
          const statusConditions = statusCodes
            .map((_, index) => `$${paramIndex + index}`)
            .join(", ");
          countQuery += ` AND "Status" IN (${statusConditions})`;
          queryParams.push(...statusCodes);
          paramIndex += statusCodes.length;
        } else {
          let statusCode = options.status;
          switch (options.status) {
            case "Activo":
              statusCode = "A";
              break;
            case "Baja":
              statusCode = "B";
              break;
            case "Finiquito":
              statusCode = "F";
              break;
          }
          countQuery += ` AND "Status" = $${paramIndex}`;
          queryParams.push(statusCode);
          paramIndex++;
        }
      }

      if (options.cveper) {
        if (options.cveper.match(/^\d{4}-\d{2}$/)) {
          // Filtro por mes completo (formato YYYY-MM)
          countQuery += ` AND DATE_TRUNC('month', cveper) = $${paramIndex}`;
          queryParams.push(`${options.cveper}-01`);
          console.log(
            "🗓️ PayrollFilterService: Aplicando filtro por mes completo para conteo CURP:",
            options.cveper
          );
        } else if (options.cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Filtro por fecha exacta (formato YYYY-MM-DD)
          countQuery += ` AND DATE(cveper) = $${paramIndex}`;
          queryParams.push(options.cveper);
          console.log(
            "📅 PayrollFilterService: Aplicando filtro por fecha exacta para conteo CURP:",
            options.cveper
          );
        } else {
          // Filtro por timestamp completo
          countQuery += ` AND cveper = $${paramIndex}`;
          queryParams.push(options.cveper);
          console.log(
            "⏰ PayrollFilterService: Aplicando filtro por timestamp completo para conteo CURP:",
            options.cveper
          );
        }
        paramIndex++;
      }

      console.log(
        "🚀 PayrollFilterService: Ejecutando consulta de conteo CURPs únicos:",
        countQuery
      );
      console.log("📋 Parámetros:", queryParams);

      // Ejecutar consulta
      const result = await client.query(countQuery, queryParams);
      client.release();

      const uniqueCurpCount = parseInt(result.rows[0].unique_curps) || 0;
      const uniqueMaleCount = parseInt(result.rows[0].unique_males) || 0;
      const uniqueFemaleCount = parseInt(result.rows[0].unique_females) || 0;

      console.log("✅ PayrollFilterService: CURPs únicos encontrados:", {
        total: uniqueCurpCount,
        hombres: uniqueMaleCount,
        mujeres: uniqueFemaleCount,
      });

      return {
        success: true,
        uniqueCurpCount,
        uniqueMaleCount,
        uniqueFemaleCount,
      };
    } catch (error) {
      console.error(
        "❌ PayrollFilterService: Error obteniendo conteo de CURPs únicos:",
        error
      );
      throw new Error(
        `Error al obtener conteo de CURPs únicos: ${error.message}`
      );
    }
  }
}

module.exports = new PayrollFilterService();

const express = require("express");
const cors = require("cors");
const { Client } = require("pg");
require("dotenv").config({ path: ".env.database" });
const authService = require("./api-server/services/authService");
const googleDriveService = require("./services/googleDriveService");
const { authenticate: verifyToken } = require("./middleware/auth");
// Try to load payrollFilterService - check both possible paths
let payrollFilterService;
try {
  payrollFilterService = require("./services/payrollFilterService");
  console.log(
    "✅ Loaded payrollFilterService from ./services/payrollFilterService"
  );
} catch (e1) {
  try {
    payrollFilterService = require("./api-server/services/payrollFilterService");
    console.log(
      "✅ Loaded payrollFilterService from ./api-server/services/payrollFilterService"
    );
  } catch (e2) {
    console.error(
      "❌ Could not load payrollFilterService from either path:",
      e1.message,
      e2.message
    );
    throw new Error("payrollFilterService not found");
  }
}

// ✅ FIX: Load nominasService to get puesto categorizado mapping
let nominasService;
try {
  nominasService = require("./services/nominasService");
  console.log("✅ Loaded nominasService from ./services/nominasService");
} catch (e1) {
  try {
    nominasService = require("./api-server/services/nominasService");
    console.log(
      "✅ Loaded nominasService from ./api-server/services/nominasService"
    );
  } catch (e2) {
    console.error(
      "❌ Could not load nominasService from either path:",
      e1.message,
      e2.message
    );
  }
}

// ✅ FIX: Initialize puesto categorizado mapping on startup
if (nominasService) {
  nominasService
    .loadPuestoCategorizado()
    .then(() => {
      const categorias = nominasService.getPuestosCategorias();
      console.log(
        `✅ Cargadas ${categorias.length} categorías de puestos:`,
        categorias.join(", ")
      );
    })
    .catch((err) => {
      console.error("⚠️ Error cargando categorías de puestos:", err.message);
    });
}

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Debug middleware to log all incoming requests (for troubleshooting)
app.use((req, res, next) => {
  // Only log payroll-related routes for debugging
  if (req.path.startsWith("/api/payroll/")) {
    console.log(`[ROUTE DEBUG] ${req.method} ${req.path} - Query:`, req.query);
  }
  next();
});

// Database config for main DB (postgres)
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
};

// Database config for Historic
const gsauDbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: "Historic",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }, // Always use SSL for AWS RDS
};

// Database config for Fondos
const fondosDbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_FONDOS || "Fondos",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }, // Always use SSL for AWS RDS
};

// Helper function to get database client
async function getClient() {
  const client = new Client(dbConfig);
  await client.connect();
  return client;
}

// Helper function to get Historic client
async function getHistoricClient() {
  const client = new Client(gsauDbConfig);
  await client.connect();
  return client;
}

// Helper function to get Fondos client
async function getFondosClient() {
  const client = new Client(fondosDbConfig);
  await client.connect();
  return client;
}

// GET /api/employees - List employees with filters, sorting, and pagination
app.get("/api/employees", verifyToken, async (req, res) => {
  try {
    const {
      q,
      department,
      role,
      status,
      location,
      sortBy = "first_name",
      sortDir = "asc",
      page = 1,
      pageSize = 20,
    } = req.query;

    const client = await getClient();

    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (q) {
      conditions.push(
        `(LOWER(first_name) LIKE $${paramIndex} OR LOWER(last_name) LIKE $${
          paramIndex + 1
        } OR LOWER(email) LIKE $${paramIndex + 2})`
      );
      const searchTerm = `%${q.toLowerCase()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      paramIndex += 3;
    }

    if (department) {
      conditions.push(`department = $${paramIndex}`);
      params.push(department);
      paramIndex++;
    }

    if (role) {
      conditions.push(`role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (location) {
      conditions.push(`location = $${paramIndex}`);
      params.push(location);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Validate and sanitize sort parameters
    const validSortColumns = {
      fullName: "first_name || ' ' || last_name",
      firstName: "first_name",
      lastName: "last_name",
      first_name: "first_name",
      last_name: "last_name",
      department: "department",
      role: "role",
      status: "status",
      location: "location",
      hire_date: "hire_date",
    };

    const sortColumn = validSortColumns[sortBy] || "first_name";
    const sortDirection = sortDir.toLowerCase() === "desc" ? "DESC" : "ASC";

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM employees ${whereClause}`;
    const countResult = await client.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const dataQuery = `
      SELECT 
        id,
        first_name,
        last_name,
        (first_name || ' ' || last_name) as full_name,
        email,
        phone,
        department,
        role,
        location,
        status,
        hire_date,
        tags,
        avatar_url
      FROM employees 
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      OFFSET $${paramIndex} LIMIT $${paramIndex + 1}
    `;

    const dataResult = await client.query(dataQuery, [
      ...params,
      offset,
      parseInt(pageSize),
    ]);

    await client.end();

    res.json({
      data: dataResult.rows.map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        department: row.department,
        role: row.role,
        location: row.location,
        status: row.status,
        hireDate: row.hire_date,
        tags: row.tags,
        avatarUrl: row.avatar_url,
      })),
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total: total,
    });
  } catch (error) {
    console.error("Error in /api/employees:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/user/profile - Get current user profile from Numerica_Users
app.get("/api/user/profile", verifyToken, async (req, res) => {
  try {
    const userEmail = req.headers["x-user-email"]; // Email del usuario logueado

    if (!userEmail) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const client = await getHistoricClient();

    const result = await client.query(
      `
      SELECT 
        id,
        email,
        first_name,
        last_name,
        phone_number,
        phone_verified,
        status,
        created_at,
        last_login
      FROM numerica_users 
      WHERE email = $1
    `,
      [userEmail]
    );

    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone_number,
        phoneVerified: user.phone_verified,
        status: user.status,
        createdAt: user.created_at,
        lastLogin: user.last_login,
      },
    });
  } catch (error) {
    console.error("Error in /api/user/profile:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// PUT /api/user/profile - Update current user profile
app.put("/api/user/profile", verifyToken, async (req, res) => {
  try {
    const userEmail = req.headers["x-user-email"];
    const { firstName, lastName, phoneNumber } = req.body;

    if (!userEmail) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    // Validaciones básicas
    if (!firstName || !lastName) {
      return res
        .status(400)
        .json({ error: "Nombre y apellido son requeridos" });
    }

    if (phoneNumber && !/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
      return res.status(400).json({ error: "Formato de teléfono inválido" });
    }

    const client = await getHistoricClient();

    const result = await client.query(
      `
      UPDATE numerica_users 
      SET 
        first_name = $1,
        last_name = $2,
        phone_number = $3,
        profile_completed = TRUE,
        updated_at = NOW()
      WHERE email = $4
      RETURNING id, email, first_name, last_name, phone_number, phone_verified
    `,
      [firstName, lastName, phoneNumber, userEmail]
    );

    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const updatedUser = result.rows[0];

    res.json({
      success: true,
      message: "Perfil actualizado exitosamente",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        phoneNumber: updatedUser.phone_number,
        phoneVerified: updatedUser.phone_verified,
      },
    });
  } catch (error) {
    console.error("Error in PUT /api/user/profile:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// FALLBACK: Simple query fallback if service fails
async function fallbackSimpleQuery(req, res, serviceOptions) {
  try {
    console.log("🔄 [FALLBACK] Using simple query fallback");
    const {
      search,
      sucursal,
      puesto,
      status,
      cveper,
      orderBy,
      orderDirection,
      pageSize,
      page,
    } = serviceOptions;

    const client = await getHistoricClient();

    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(
        `(LOWER("Nombre completo") LIKE $${paramIndex} OR LOWER("CURP") LIKE $${paramIndex})`
      );
      const searchTerm = `%${search.toLowerCase()}%`;
      params.push(searchTerm);
      paramIndex++;
    }

    if (sucursal) {
      conditions.push(`"Compañía" = $${paramIndex}`);
      params.push(sucursal);
      paramIndex++;
    }

    if (puesto) {
      conditions.push(`"Puesto" = $${paramIndex}`);
      params.push(puesto);
      paramIndex++;
    }

    if (status) {
      conditions.push(`"Status" = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM historico_nominas_gsau ${whereClause}`;
    const countResult = await client.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const sortColumn =
      orderBy === "nombre" ? '"Nombre completo"' : '"Nombre completo"';
    const sortDirection = orderDirection === "desc" ? "DESC" : "ASC";

    const dataQuery = `
      SELECT 
        "RFC" as rfc,
        "Nombre completo" as nombre,
        "CURP" as curp,
        "Compañía" as sucursal,
        "Puesto" as puesto,
        cveper,
        COALESCE(" SUELDO CLIENTE ", 0) as sueldo,
        "Status" as status
      FROM historico_nominas_gsau 
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      OFFSET $${paramIndex} LIMIT $${paramIndex + 1}
    `;

    const dataResult = await client.query(dataQuery, [
      ...params,
      offset,
      parseInt(pageSize),
    ]);
    await client.end();

    const transformedData = dataResult.rows.map((row) => ({
      rfc: row.rfc,
      nombre: row.nombre,
      name: row.nombre,
      curp: row.curp,
      sucursal: row.sucursal,
      puesto: row.puesto,
      sueldo: parseFloat(row.sueldo || 0),
      status: row.status,
      estado:
        row.status === "A" ? "Activo" : row.status === "B" ? "Baja" : "N/A",
    }));

    console.log("✅ [FALLBACK] Fallback query completed:", {
      total,
      dataLength: transformedData.length,
    });

    res.json({
      success: true,
      data: transformedData,
      pagination: {
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 100,
        total: total,
        totalPages: Math.ceil(total / (parseInt(pageSize) || 100)),
      },
    });
  } catch (fallbackError) {
    console.error(
      "❌ [FALLBACK ERROR] Fallback query also failed:",
      fallbackError
    );
    throw fallbackError;
  }
}

// GET /api/payroll - List mapped employees from historico_nominas_gsau with new structure
app.get("/api/payroll", verifyToken, async (req, res) => {
  // COMMENTED OUT: Verbose logging - keeping only FPL/fondos logs active
  // console.error('========================================');
  // console.error('PAYROLL ENDPOINT CALLED - ' + new Date().toISOString());
  // console.error('URL:', req.url);
  // console.error('SEARCH PARAM (q):', req.query.q);
  // console.error('SEARCH PARAM (search):', req.query.search);
  // console.error('ALL QUERY:', JSON.stringify(req.query));
  // console.error('========================================');

  try {
    // Support both 'q' and 'search' parameters (frontend might use 'search')
    const {
      q,
      search,
      sucursal,
      puesto,
      status,
      cveper,
      sortBy = "nombre",
      sortDir = "asc",
      page = 1,
      pageSize = 50,
      orderBy,
      orderDirection,
      fullData,
    } = req.query;

    // Use 'search' if provided, otherwise use 'q'
    const searchTerm = search || q;

    // COMMENTED OUT: Verbose logging
    // console.log('📥 [API REQUEST] Raw query parameters received:', {...});

    // ✅ FIXED: Clean and decode search parameter
    let cleanedSearch = null;
    if (searchTerm) {
      try {
        // Decode URL encoding and handle + signs
        let decoded = decodeURIComponent(String(searchTerm));
        decoded = decoded.replace(/\+/g, " ");
        cleanedSearch = decoded.trim();
        // Only use if not empty after cleaning
        if (cleanedSearch.length === 0) {
          cleanedSearch = null;
        }
      } catch (e) {
        // If decode fails, just clean the string
        cleanedSearch = String(searchTerm).replace(/\+/g, " ").trim();
        if (cleanedSearch.length === 0) {
          cleanedSearch = null;
        }
      }
    }

    // COMMENTED OUT: Verbose logging
    // console.log('🔍 [SEARCH PROCESSING] Processing search parameter:', {...});

    // Use orderBy/orderDirection if provided, otherwise fallback to sortBy/sortDir
    const finalOrderBy = orderBy || sortBy;
    const finalOrderDirection = orderDirection || sortDir;

    // Build service options to use payrollFilterService
    const serviceOptions = {
      pageSize: parseInt(pageSize) || 100,
      page: parseInt(page) || 1,
      search: cleanedSearch, // Use cleaned search
      puesto,
      sucursal,
      status,
      cveper: (() => {
        if (!cveper) return null;
        try {
          const decoded = decodeURIComponent(cveper);
          const parsedDate = new Date(decoded);
          if (isNaN(parsedDate)) return null;

          // Keep only the date portion (YYYY-MM-DD) without timezone drift
          const year = parsedDate.getUTCFullYear();
          const month = String(parsedDate.getUTCMonth() + 1).padStart(2, "0");
          const day = String(parsedDate.getUTCDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        } catch {
          return null;
        }
      })(),
      orderBy: finalOrderBy,
      orderDirection: finalOrderDirection,
      fullData: fullData === "true" || fullData === true,
    };

    // COMMENTED OUT: Verbose logging
    // console.log('🔍 [FILTER/SORT] Active filters and sorting:', {...});
    // console.log('🚀 [SERVICE CALL] Calling payrollFilterService...', {...});

    // Use payrollFilterService for proper search, filtering, and sorting
    let result;
    try {
      // COMMENTED OUT: Verbose logging
      // console.log('🚀 [SERVICE CALL] About to call payrollFilterService...');

      if (
        !payrollFilterService ||
        typeof payrollFilterService.getPayrollDataWithFiltersAndSorting !==
          "function"
      ) {
        throw new Error(
          "payrollFilterService.getPayrollDataWithFiltersAndSorting is not a function"
        );
      }

      // Add timeout to prevent hanging
      const servicePromise =
        payrollFilterService.getPayrollDataWithFiltersAndSorting(
          serviceOptions
        );
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Service call timed out after 30 seconds")),
          30000
        )
      );

      result = await Promise.race([servicePromise, timeoutPromise]);
      // COMMENTED OUT: Verbose logging
      // console.log('✅ [SERVICE CALL] Service call completed successfully');
    } catch (serviceError) {
      console.error(
        "❌ [PAYROLL ERROR] Error calling payrollFilterService:",
        serviceError.message
      );

      // FALLBACK: Use simple query if service fails
      return await fallbackSimpleQuery(req, res, serviceOptions);
    }

    // COMMENTED OUT: Verbose logging
    // console.log('🟢 [AFTER SERVICE] Service returned...', {...});

    // Validate result
    if (!result) {
      throw new Error("Service returned null or undefined result");
    }

    if (!result.success) {
      // COMMENTED OUT: Verbose logging
      // console.warn('⚠️ [SERVICE WARNING] Service returned success: false');
    }

    if (!result.data) {
      // COMMENTED OUT: Verbose logging
      // console.warn('⚠️ [SERVICE WARNING] Service returned no data array');
      result.data = [];
    }

    // Transform data to match expected format
    const transformedData = result.data.map((row) => ({
      // Core identifiers
      rfc: row.rfc,
      nombre: row.nombre,
      name: row.name || row.nombre,
      curp: row.curp,
      cvecia: row.cvecia,
      sucursal: row.sucursal,
      department: row.sucursal,
      puesto: row.puesto,
      position: row.puesto,
      compania: row.compania,
      cvetno: row.cvetno,
      sexo: row.sexo,
      localidad: row.localidad,
      periodicidad: row.periodicidad,
      clave_trabajador: row.clave_trabajador,
      numero_imss: row.numero_imss,
      antiguedad_fpl: row.antiguedad_fpl,
      fecha_antiguedad: row.fecha_antiguedad,
      fecha_baja: row.fecha_baja,
      status: row.status,
      estado: row.estado || row.status,
      periodo: row.periodo || row.mes,
      mes: row.mes || "Enero 2024",
      tipo: row.tipo,
      " TOTAL DE PERCEPCIONES ": parseFloat(row.total_percepciones || 0),

      // Payroll / numeric fields
      sdi: parseFloat(row.sdi || 0),
      sdi_es: parseFloat(row.sdi_es || 0),
      sd: parseFloat(row.sd || 0),
      sdim: parseFloat(row.sdim || 0),
      sueldo_cliente: parseFloat(row.sueldo_cliente || 0),
      sueldo: parseFloat(row.sueldo || 0),
      comisions_cliente: parseFloat(row.comisions_cliente || 0),
      comisions_facturadas: parseFloat(row.comisions_facturadas || 0),
      comisiones: parseFloat(row.comisiones || row.comisiones_extra || 0),
      commissions: parseFloat(row.comisiones || row.comisiones_extra || 0),
      destajo_informado: parseFloat(row.destajo_informado || 0),
      premio_puntualidad: parseFloat(row.premio_puntualidad || 0),
      premio_asistencia: parseFloat(row.premio_asistencia || 0),
      vales_despensa: parseFloat(row.vales_despensa || 0),
      descuento_indebido: parseFloat(row.descuento_indebido || 0),
      bono: parseFloat(row.bono || 0),
      comisiones_extra: parseFloat(row.comisiones_extra || 0),
      dia_festivo_trabajado: parseFloat(row.dia_festivo_trabajado || 0),
      sueldo_vacaciones: parseFloat(row.sueldo_vacaciones || 0),
      prima_vacacional: parseFloat(row.prima_vacacional || 0),
      aguinaldo: parseFloat(row.aguinaldo || 0),
      gratificacion: parseFloat(row.gratificacion || 0),
      compensacion: parseFloat(row.compensacion || 0),
      prima_dominical: parseFloat(row.prima_dominical || 0),
      prima_antiguedad: parseFloat(row.prima_antiguedad || 0),
      pago_separacion: parseFloat(row.pago_separacion || 0),
      vacaciones_pendientes: parseFloat(row.vacaciones_pendientes || 0),
      subsidio_incapacidad: parseFloat(row.subsidio_incapacidad || 0),
      subsidio_empleo: parseFloat(row.subsidio_empleo || 0),
      destajo: parseFloat(row.destajo || 0),
      horas_extra_doble: parseFloat(row.horas_extra_doble || 0),
      horas_extra_doble3: parseFloat(row.horas_extra_doble3 || 0),
      horas_extra_triple: parseFloat(row.horas_extra_triple || 0),
      dias_promedio: parseFloat(row.dias_promedio || 0),
      dias_pendientes_ingreso: parseFloat(row.dias_pendientes_ingreso || 0),
      septimo_dia: parseFloat(row.septimo_dia || 0),
      reintegro_isr: parseFloat(row.reintegro_isr || 0),
      isr_anual_favor: parseFloat(row.isr_anual_favor || 0),
      diferencia_fonacot: parseFloat(row.diferencia_fonacot || 0),
      diferencia_infonavit: parseFloat(row.diferencia_infonavit || 0),
      indemnizacion_90_dias: parseFloat(row.indemnizacion_90_dias || 0),
      vacaciones_finiquito: parseFloat(row.vacaciones_finiquito || 0),
      vales_despensa_neto: parseFloat(row.vales_despensa_neto || 0),
      vales_despensa_pension: parseFloat(row.vales_despensa_pension || 0),
      pfpl: parseFloat(row.pfpl || 0),
      ayuda_incapacidad: parseFloat(row.ayuda_incapacidad || 0),
      aportacion_compra_prestacion: parseFloat(
        row.aportacion_compra_prestacion || 0
      ),
      ap_comp_primas_seguro: parseFloat(row.ap_comp_primas_seguro || 0),
      imss_patronal: parseFloat(row.imss_patronal || 0),
      infonavit: parseFloat(row.infonavit || 0),
      impuesto_nomina: parseFloat(row.impuesto_nomina || 0),
      prestamos_personales: parseFloat(row.prestamos_personales || 0),
      total_percepciones: parseFloat(row.total_percepciones || 0),
      total_deducciones: parseFloat(row.total_deducciones || 0),
      neto_antes_vales: parseFloat(row.neto_antes_vales || 0),
      neto_a_pagar: parseFloat(row.neto_a_pagar || 0),
      subtotal_costo_nomina: parseFloat(row.subtotal_costo_nomina || 0),
      regalias: parseFloat(row.regalias || 0),
      costo_nomina: parseFloat(row.costo_nomina || 0),
      iva: parseFloat(row.iva || 0),
      total_facturar: parseFloat(row.total_facturar || 0),
      ptu: parseFloat(row.ptu || 0),
      isr: parseFloat(row.isr || 0),
      descuento_imss: parseFloat(row.descuento_imss || 0),
      retardos: parseFloat(row.retardos || 0),
      descuento_infonavit: parseFloat(row.descuento_infonavit || 0),
      diferencia_infonavit4: parseFloat(row.diferencia_infonavit4 || 0),
      seguro_vivienda: parseFloat(row.seguro_vivienda || 0),
      fonacot: parseFloat(row.fonacot || 0),
      diferencia_fonacot5: parseFloat(row.diferencia_fonacot5 || 0),
      prestamos_personales6: parseFloat(row.prestamos_personales6 || 0),
      pension_alimenticia: parseFloat(row.pension_alimenticia || 0),
      anticipo_nomina: parseFloat(row.anticipo_nomina || 0),
      cuota_sindical: parseFloat(row.cuota_sindical || 0),
      dcto_pension_vales: parseFloat(row.dcto_pension_vales || 0),
      otros_descuentos: parseFloat(row.otros_descuentos || 0),
      descuentos_varios: parseFloat(row.descuentos_varios || 0),
      isr_indemnizacion: parseFloat(row.isr_indemnizacion || 0),
      destruccion_herramientas: parseFloat(row.destruccion_herramientas || 0),
      descuento_uniformes: parseFloat(row.descuento_uniformes || 0),
      aportacion_caja_ahorro: parseFloat(row.aportacion_caja_ahorro || 0),
      prestamo_fpl: parseFloat(row.prestamo_fpl || 0),
      pension_alimenticia_fpl: parseFloat(row.pension_alimenticia_fpl || 0),
      ajuste_subsidio_empleo: parseFloat(row.ajuste_subsidio_empleo || 0),
      ayuda_fpl: parseFloat(row.ayuda_fpl || 0),

      // Default placeholder for URL
      perfilUrl: null,
    }));

    // COMMENTED OUT: Verbose logging
    // console.log('✅ [RESPONSE] Sending response:', {...});

    res.json({
      success: result.success,
      data: transformedData,
      pagination: result.pagination || {
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 100,
        total: result.total || 0,
        totalPages: Math.ceil(
          (result.total || 0) / (parseInt(pageSize) || 100)
        ),
      },
    });
  } catch (error) {
    console.error("❌ [ERROR] Error in /api/payroll:", error);
    console.error("❌ [ERROR] Error stack:", error.stack);
    console.error("❌ [ERROR] Error message:", error.message);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    });
  }
});

// GET /api/payroll/stats - Get statistics for payroll data
app.get("/api/payroll/stats", verifyToken, async (req, res) => {
  try {
    const client = await getHistoricClient();

    // Get statistics in old format (data property)
    // 1. Total records
    const totalResult = await client.query(
      `SELECT COUNT(*) as total FROM historico_nominas_gsau`
    );
    const totalRecords = parseInt(totalResult.rows[0].total);

    // 2. Unique employees (CURPs únicas)
    const uniqueCurpResult = await client.query(`
      SELECT COUNT(DISTINCT "CURP") as unique_curps 
      FROM historico_nominas_gsau 
      WHERE "CURP" IS NOT NULL AND "CURP" != ''
    `);
    const uniqueEmployees = parseInt(uniqueCurpResult.rows[0].unique_curps);

    // 3. Earliest and latest periods
    const periodResult = await client.query(`
      SELECT 
        MIN(cveper) as earliest_period,
        MAX(cveper) as latest_period
      FROM historico_nominas_gsau 
      WHERE cveper IS NOT NULL
    `);
    const earliestPeriod = periodResult.rows[0]?.earliest_period || null;
    const latestPeriod = periodResult.rows[0]?.latest_period || null;

    // 4. Total fondos records
    let totalFondosRecords = 0;
    try {
      const fondosResult = await client.query(
        `SELECT COUNT(*) as total FROM historico_fondos_gsau`
      );
      totalFondosRecords = parseInt(fondosResult.rows[0].total);
    } catch (error) {
      console.warn(
        "⚠️ Tabla historico_fondos_gsau no encontrada:",
        error.message
      );
      totalFondosRecords = 0;
    }

    await client.end();

    // Calculate average records per employee
    const averageRecordsPerEmployee =
      uniqueEmployees > 0 ? Math.round(totalRecords / uniqueEmployees) : 0;

    // Return in old format (data property) for frontend compatibility
    res.json({
      success: true,
      data: {
        totalRecords,
        uniqueEmployees,
        earliestPeriod,
        latestPeriod,
        totalFondosRecords,
        uniquePeriods: 0,
        averageRecordsPerEmployee,
      },
    });
  } catch (error) {
    console.error("Error in /api/payroll/stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/payroll/filters - Get filter options and counts for the payroll data
app.get("/api/payroll/filters", verifyToken, async (req, res) => {
  try {
    const client = await getHistoricClient();

    // Build filter parameters for dynamic counting
    const { search, sucursal, puesto, status, cveper, puestoCategorizado } =
      req.query;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Apply filters if provided (for dynamic counts)
    if (search) {
      conditions.push(
        `(LOWER("Nombre completo") LIKE $${paramIndex} OR LOWER("CURP") LIKE $${
          paramIndex + 1
        })`
      );
      const searchTerm = `%${search.toLowerCase()}%`;
      params.push(searchTerm, searchTerm);
      paramIndex += 2;
    }

    if (sucursal) {
      if (Array.isArray(sucursal)) {
        const placeholders = sucursal.map(() => `$${paramIndex++}`).join(", ");
        conditions.push(`"Compañía" IN (${placeholders})`);
        params.push(...sucursal);
      } else {
        conditions.push(`"Compañía" = $${paramIndex}`);
        params.push(sucursal);
        paramIndex++;
      }
    }

    if (puesto) {
      if (Array.isArray(puesto)) {
        const placeholders = puesto.map(() => `$${paramIndex++}`).join(", ");
        conditions.push(`"Puesto" IN (${placeholders})`);
        params.push(...puesto);
      } else {
        conditions.push(`"Puesto" = $${paramIndex}`);
        params.push(puesto);
        paramIndex++;
      }
    }

    if (status) {
      if (Array.isArray(status)) {
        const placeholders = status.map(() => `$${paramIndex++}`).join(", ");
        conditions.push(`"Status" IN (${placeholders})`);
        params.push(...status);
      } else {
        conditions.push(`"Status" = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }
    }

    if (cveper) {
      // Detectar formato de cveper y aplicar filtro apropiado
      if (cveper.match(/^\d{4}-\d{2}$/)) {
        // Formato YYYY-MM: filtrar por mes completo
        conditions.push(`DATE_TRUNC('month', "cveper") = $${paramIndex}`);
        params.push(`${cveper}-01`);
      } else if (cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Formato YYYY-MM-DD: filtrar por fecha exacta
        conditions.push(`DATE("cveper") = $${paramIndex}`);
        params.push(cveper);
      } else {
        // Timestamp completo
        conditions.push(`"cveper" = $${paramIndex}`);
        params.push(cveper);
      }
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get distinct values and counts for each filter
    const [puestosResult, sucursalesResult, estadosResult, periodosResult] =
      await Promise.all([
        // Puestos
        client.query(
          `
        SELECT "Puesto" as value, COUNT(*) as count
        FROM historico_nominas_gsau
        ${whereClause}
        GROUP BY "Puesto"
        ORDER BY "Puesto"
      `,
          params
        ),

        // Sucursales
        client.query(
          `
        SELECT "Compañía" as value, COUNT(*) as count
        FROM historico_nominas_gsau
        ${whereClause}
        GROUP BY "Compañía"
        ORDER BY "Compañía"
      `,
          params
        ),

        // Estados
        client.query(
          `
        SELECT "Status" as value, COUNT(*) as count
        FROM historico_nominas_gsau
        ${whereClause}
        GROUP BY "Status"
        ORDER BY "Status"
      `,
          params
        ),

        // Periodos
        client.query(
          `
        SELECT "cveper" as value, COUNT(*) as count
        FROM historico_nominas_gsau
        ${whereClause}
        GROUP BY "cveper"
        ORDER BY "cveper" DESC
      `,
          params
        ),
      ]);

    // ✅ FIX: Calculate puestosCategorias using nominasService
    let puestosCategorias = [];
    if (nominasService) {
      try {
        // Get all unique puestos with counts
        // ✅ FIX: Handle WHERE clause properly - use WHERE if empty, AND if not empty
        const puestoWhereClause = whereClause
          ? `${whereClause} AND "Puesto" IS NOT NULL`
          : `WHERE "Puesto" IS NOT NULL`;

        const puestosQuery = `
          SELECT "Puesto" as puesto, COUNT(*) as count
          FROM historico_nominas_gsau
          ${puestoWhereClause}
          GROUP BY "Puesto"
        `;
        const puestosForCategorias = await client.query(puestosQuery, params);

        // Map puestos to categories and calculate counts
        const categoriaConteos = new Map();

        // Initialize all available categories with count 0
        const categoriasDisponibles = nominasService.getPuestosCategorias();
        categoriasDisponibles.forEach((categoria) => {
          categoriaConteos.set(categoria, 0);
        });

        // Sum counts by category
        puestosForCategorias.rows.forEach((row) => {
          let categoria = nominasService.getPuestoCategorizado(row.puesto);
          // ✅ FIX: Normalize "Categorizar" to "Sin Categorizar"
          if (categoria === "Categorizar") {
            categoria = "Sin Categorizar";
          }
          const currentCount = categoriaConteos.get(categoria) || 0;
          categoriaConteos.set(categoria, currentCount + parseInt(row.count));
        });

        // ✅ FIX: Ensure "Sin Categorizar" exists
        if (!categoriaConteos.has("Sin Categorizar")) {
          categoriaConteos.set("Sin Categorizar", 0);
        }

        // Convert to array format - SHOW ALL categories (even with count 0)
        puestosCategorias = Array.from(categoriaConteos.entries())
          .map(([categoria, count]) => ({
            value: categoria,
            count: count || 0,
          }))
          .sort((a, b) => a.value.localeCompare(b.value));

        console.log(
          "✅ [Puesto Categorizado] Categorías calculadas:",
          puestosCategorias.length
        );
        console.log(
          "✅ [Puesto Categorizado] Categorías:",
          puestosCategorias.map((c) => `${c.value} (${c.count})`).join(", ")
        );
        console.log(
          "✅ [Puesto Categorizado] Full array:",
          JSON.stringify(puestosCategorias, null, 2)
        );
      } catch (catError) {
        console.error("❌ Error calculando categorías de puestos:", catError);
        console.error("❌ Error stack:", catError.stack);
        // Fallback: return empty array if error
        puestosCategorias = [];
      }
    } else {
      console.warn(
        "⚠️ nominasService no disponible, puestosCategorias será vacío"
      );
    }

    // ✅ FIX: Ensure client is closed even if there was an error in puestosCategorias calculation
    try {
      await client.end();
    } catch (closeError) {
      console.error("⚠️ Error closing database connection:", closeError);
    }

    const responseData = {
      success: true,
      data: {
        puestos: puestosResult.rows.map((row) => ({
          value: row.value,
          label: row.value,
          count: parseInt(row.count),
        })),
        sucursales: sucursalesResult.rows.map((row) => ({
          value: row.value,
          label: row.value,
          count: parseInt(row.count),
        })),
        estados: estadosResult.rows.map((row) => ({
          value: row.value,
          label: row.value,
          count: parseInt(row.count),
        })),
        periodos: periodosResult.rows.map((row) => ({
          value: row.value,
          label: row.value,
          count: parseInt(row.count),
        })),
        puestosCategorias: puestosCategorias, // ✅ FIXED: Now returns actual categories
      },
    };

    console.log(
      "✅ [API Response] puestosCategorias count:",
      responseData.data.puestosCategorias.length
    );
    if (responseData.data.puestosCategorias.length > 0) {
      console.log(
        "✅ [API Response] puestosCategorias sample:",
        JSON.stringify(
          responseData.data.puestosCategorias.slice(
            0,
            Math.min(3, responseData.data.puestosCategorias.length)
          ),
          null,
          2
        )
      );
    } else {
      console.log("⚠️ [API Response] puestosCategorias is empty");
    }

    res.json(responseData);
  } catch (error) {
    console.error("Error in /api/payroll/filters:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/payroll/filter-options - Alias for /api/payroll/filters (compatibility)
app.get("/api/payroll/filter-options", verifyToken, async (req, res) => {
  try {
    const client = await getHistoricClient();

    // Build filter parameters for dynamic counting
    const { search, sucursal, puesto, status, cveper, puestoCategorizado } =
      req.query;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Apply filters if provided (for dynamic counts)
    if (search) {
      conditions.push(
        `(LOWER("Nombre completo") LIKE $${paramIndex} OR LOWER("CURP") LIKE $${
          paramIndex + 1
        })`
      );
      const searchTerm = `%${search.toLowerCase()}%`;
      params.push(searchTerm, searchTerm);
      paramIndex += 2;
    }

    if (sucursal) {
      if (Array.isArray(sucursal)) {
        const placeholders = sucursal.map(() => `$${paramIndex++}`).join(", ");
        conditions.push(`"Compañía" IN (${placeholders})`);
        params.push(...sucursal);
      } else {
        conditions.push(`"Compañía" = $${paramIndex}`);
        params.push(sucursal);
        paramIndex++;
      }
    }

    if (puesto) {
      if (Array.isArray(puesto)) {
        const placeholders = puesto.map(() => `$${paramIndex++}`).join(", ");
        conditions.push(`"Puesto" IN (${placeholders})`);
        params.push(...puesto);
      } else {
        conditions.push(`"Puesto" = $${paramIndex}`);
        params.push(puesto);
        paramIndex++;
      }
    }

    if (status) {
      if (Array.isArray(status)) {
        const placeholders = status.map(() => `$${paramIndex++}`).join(", ");
        conditions.push(`"Status" IN (${placeholders})`);
        params.push(...status);
      } else {
        conditions.push(`"Status" = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }
    }

    if (cveper) {
      // Detectar formato de cveper y aplicar filtro apropiado
      if (cveper.match(/^\d{4}-\d{2}$/)) {
        // Formato YYYY-MM: filtrar por mes completo
        conditions.push(`DATE_TRUNC('month', "cveper") = $${paramIndex}`);
        params.push(`${cveper}-01`);
      } else if (cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Formato YYYY-MM-DD: filtrar por fecha exacta
        conditions.push(`DATE("cveper") = $${paramIndex}`);
        params.push(cveper);
      } else {
        // Timestamp completo
        conditions.push(`"cveper" = $${paramIndex}`);
        params.push(cveper);
      }
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get distinct values and counts for each filter
    const [puestosResult, sucursalesResult, estadosResult, periodosResult] =
      await Promise.all([
        // Puestos
        client.query(
          `
        SELECT "Puesto" as value, COUNT(*) as count
        FROM historico_nominas_gsau
        ${whereClause}
        GROUP BY "Puesto"
        ORDER BY "Puesto"
      `,
          params
        ),

        // Sucursales
        client.query(
          `
        SELECT "Compañía" as value, COUNT(*) as count
        FROM historico_nominas_gsau
        ${whereClause}
        GROUP BY "Compañía"
        ORDER BY "Compañía"
      `,
          params
        ),

        // Estados
        client.query(
          `
        SELECT "Status" as value, COUNT(*) as count
        FROM historico_nominas_gsau
        ${whereClause}
        GROUP BY "Status"
        ORDER BY "Status"
      `,
          params
        ),

        // Periodos
        client.query(
          `
        SELECT "cveper" as value, COUNT(*) as count
        FROM historico_nominas_gsau
        ${whereClause}
        GROUP BY "cveper"
        ORDER BY "cveper" DESC
      `,
          params
        ),
      ]);

    // ✅ FIX: Calculate puestosCategorias using nominasService (same logic as /api/payroll/filters)
    let puestosCategorias = [];
    if (nominasService) {
      try {
        // ✅ FIX: Handle WHERE clause properly - use WHERE if empty, AND if not empty
        const puestoWhereClause = whereClause
          ? `${whereClause} AND "Puesto" IS NOT NULL`
          : `WHERE "Puesto" IS NOT NULL`;

        const puestosQuery = `
          SELECT "Puesto" as puesto, COUNT(*) as count
          FROM historico_nominas_gsau
          ${puestoWhereClause}
          GROUP BY "Puesto"
        `;
        const puestosForCategorias = await client.query(puestosQuery, params);

        const categoriaConteos = new Map();
        const categoriasDisponibles = nominasService.getPuestosCategorias();
        categoriasDisponibles.forEach((categoria) => {
          categoriaConteos.set(categoria, 0);
        });

        puestosForCategorias.rows.forEach((row) => {
          let categoria = nominasService.getPuestoCategorizado(row.puesto);
          if (categoria === "Categorizar") {
            categoria = "Sin Categorizar";
          }
          const currentCount = categoriaConteos.get(categoria) || 0;
          categoriaConteos.set(categoria, currentCount + parseInt(row.count));
        });

        if (!categoriaConteos.has("Sin Categorizar")) {
          categoriaConteos.set("Sin Categorizar", 0);
        }

        puestosCategorias = Array.from(categoriaConteos.entries())
          .map(([categoria, count]) => ({
            value: categoria,
            count: count || 0,
          }))
          .sort((a, b) => a.value.localeCompare(b.value));

        console.log(
          "✅ [filter-options] Puesto Categorizado - Categorías:",
          puestosCategorias.length
        );
      } catch (catError) {
        console.error(
          "❌ Error calculando categorías en filter-options:",
          catError
        );
        puestosCategorias = [];
      }
    }

    // ✅ FIX: Ensure client is closed even if there was an error in puestosCategorias calculation
    try {
      await client.end();
    } catch (closeError) {
      console.error("⚠️ Error closing database connection:", closeError);
    }

    res.json({
      success: true,
      data: {
        puestos: puestosResult.rows.map((row) => ({
          value: row.value,
          label: row.value,
          count: parseInt(row.count),
        })),
        sucursales: sucursalesResult.rows.map((row) => ({
          value: row.value,
          label: row.value,
          count: parseInt(row.count),
        })),
        estados: estadosResult.rows.map((row) => ({
          value: row.value,
          label: row.value,
          count: parseInt(row.count),
        })),
        periodos: periodosResult.rows.map((row) => ({
          value: row.value,
          label: row.value,
          count: parseInt(row.count),
        })),
        puestosCategorias: puestosCategorias, // ✅ FIXED: Now returns actual categories
      },
    });
  } catch (error) {
    console.error("Error in /api/payroll/filter-options:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/payroll/periodos - Get available periods
app.get("/api/payroll/periodos", verifyToken, async (req, res) => {
  try {
    const client = await getHistoricClient();

    const result = await client.query(`
      SELECT DISTINCT "cveper" as value, COUNT(*) as count
      FROM historico_nominas_gsau
      WHERE "cveper" IS NOT NULL
      GROUP BY "cveper"
      ORDER BY "cveper" DESC
    `);

    await client.end();

    res.json({
      success: true,
      data: result.rows.map((row) => ({
        value: row.value,
        count: parseInt(row.count),
      })),
    });
  } catch (error) {
    console.error("Error in /api/payroll/periodos:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/payroll/demographic - Get demographic data with pagination and filters
app.get("/api/payroll/demographic", verifyToken, async (req, res) => {
  try {
    const {
      q,
      sucursal,
      puesto,
      status,
      cveper,
      sortBy = "nombre",
      sortDir = "asc",
      page = 1,
      pageSize = 50,
    } = req.query;

    const maxPageSize = 1000;
    const validatedPageSize = Math.min(parseInt(pageSize), maxPageSize);
    const validatedPage = Math.max(1, parseInt(page));

    const client = await getHistoricClient();

    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (q) {
      conditions.push(
        `(LOWER("Nombre completo") LIKE $${paramIndex} OR LOWER("CURP") LIKE $${
          paramIndex + 1
        })`
      );
      const searchTerm = `%${q.toLowerCase()}%`;
      params.push(searchTerm, searchTerm);
      paramIndex += 2;
    }

    if (sucursal) {
      conditions.push(`"Compañía" = $${paramIndex}`);
      params.push(sucursal);
      paramIndex++;
    }

    if (puesto) {
      conditions.push(`"Puesto" = $${paramIndex}`);
      params.push(puesto);
      paramIndex++;
    }

    if (status) {
      conditions.push(`"Status" = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (cveper) {
      // Handle cveper as date range if it's in YYYY-MM format
      if (/^\d{4}-\d{2}$/.test(cveper)) {
        // Convert 2025-06 to a date range for the entire month
        const startDate = `${cveper}-01`;
        const endDate = `${cveper}-31`; // Using 31 to cover all possible days in month
        conditions.push(
          `"cveper" >= $${paramIndex} AND "cveper" < ($${
            paramIndex + 1
          }::date + INTERVAL '1 month')`
        );
        params.push(startDate, startDate);
        paramIndex += 2;
      } else {
        // Handle as exact date if it's in a different format
        conditions.push(`"cveper" = $${paramIndex}`);
        params.push(cveper);
        paramIndex++;
      }
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM historico_nominas_gsau ${whereClause}`;
    const countResult = await client.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Validate and sanitize sort parameters
    const validSortColumns = {
      nombre: '"Nombre completo"',
      curp: '"CURP"',
      sucursal: '"Compañía"',
      puesto: '"Puesto"',
      cveper: '"cveper"',
      sueldo: '" SUELDO CLIENTE "',
    };

    const sortColumn = validSortColumns[sortBy] || '"Nombre completo"';
    const sortDirection = sortDir.toLowerCase() === "desc" ? "DESC" : "ASC";

    // Get paginated results
    const offset = (validatedPage - 1) * validatedPageSize;
    const dataQuery = `
      SELECT 
        "RFC" as rfc,
        "Nombre completo" as nombre,
        "CURP" as curp,
        "Compañía" as sucursal,
        "Puesto" as puesto,
        "cveper" as fecha,
        "Sexo" as sexo,
        COALESCE(" SUELDO CLIENTE ", 0) as sueldo,
        COALESCE(" TOTAL DE PERCEPCIONES ", 0) as totalPercepciones,
        COALESCE(" TOTAL DEDUCCIONES ", 0) as totalDeducciones,
        "Status" as status
      FROM historico_nominas_gsau 
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      OFFSET $${paramIndex} LIMIT $${paramIndex + 1}
    `;

    const dataResult = await client.query(dataQuery, [
      ...params,
      offset,
      validatedPageSize,
    ]);

    await client.end();

    res.json({
      success: true,
      data: dataResult.rows,
      page: validatedPage,
      pageSize: validatedPageSize,
      total: total,
    });
  } catch (error) {
    console.error("Error in /api/payroll/demographic:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/payroll/demographic/unique-count - Get unique CURP count
app.get(
  "/api/payroll/demographic/unique-count",
  verifyToken,
  async (req, res) => {
    try {
      // Helper to decode URL parameters (handle + as space)
      const decodeParam = (param) => {
        if (!param) return param;
        if (Array.isArray(param)) {
          return param.map((p) => {
            try {
              return decodeURIComponent(String(p).replace(/\+/g, " "));
            } catch (e) {
              return String(p).replace(/\+/g, " ");
            }
          });
        }
        try {
          return decodeURIComponent(String(param).replace(/\+/g, " "));
        } catch (e) {
          return String(param).replace(/\+/g, " ");
        }
      };

      // Extract and decode parameters
      const search = req.query.search
        ? decodeParam(req.query.search)
        : undefined;
      const puesto = req.query.puesto
        ? decodeParam(req.query.puesto)
        : undefined;
      const sucursal = req.query.sucursal
        ? decodeParam(req.query.sucursal)
        : undefined;
      const status = req.query.status
        ? decodeParam(req.query.status)
        : undefined;
      let puestoCategorizado = req.query.puestoCategorizado
        ? decodeParam(req.query.puestoCategorizado)
        : undefined;
      const cveper = req.query.cveper;

      // Normalize puestoCategorizado: "Categorizar" -> "Sin Categorizar"
      if (puestoCategorizado) {
        if (Array.isArray(puestoCategorizado)) {
          puestoCategorizado = puestoCategorizado.map((cat) =>
            cat === "Categorizar" ? "Sin Categorizar" : cat
          );
        } else if (puestoCategorizado === "Categorizar") {
          puestoCategorizado = "Sin Categorizar";
        }
      }

      // Use the payrollFilterService which handles all filters correctly
      const result = await payrollFilterService.getUniqueCurpCount({
        search,
        puesto,
        sucursal,
        status,
        puestoCategorizado,
        cveper,
      });

      res.json({
        success: true,
        uniqueCurpCount: result.uniqueCurpCount,
      });
    } catch (error) {
      console.error("❌ Error obteniendo conteo de CURPs únicos:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// GET /api/percepciones - Get employee payroll data (percepciones) by CURP
app.get("/api/percepciones", verifyToken, async (req, res) => {
  try {
    const { curp, cveper, pageSize = 1000, page = 1 } = req.query;

    if (!curp) {
      return res.status(400).json({
        success: false,
        error: "CURP parameter is required",
      });
    }

    const maxPageSize = 1000;
    const validatedPageSize = Math.min(parseInt(pageSize), maxPageSize);
    const validatedPage = Math.max(1, parseInt(page));

    const client = await getHistoricClient();

    // Build WHERE clause - always filter by CURP
    const conditions = ['"CURP" = $1'];
    const params = [curp];
    let paramIndex = 2;

    // Add cveper filter if provided
    if (cveper) {
      conditions.push(`"Mes" = $${paramIndex}`);
      params.push(cveper);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Get total count for this CURP
    const countQuery = `SELECT COUNT(*) FROM historico_nominas_gsau ${whereClause}`;
    const countResult = await client.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    console.log(
      `🔍 API /percepciones - CURP: ${curp}, cveper: ${
        cveper || "ALL"
      }, total: ${total}`
    );

    // Get paginated results with all payroll fields
    const offset = (validatedPage - 1) * validatedPageSize;
    const dataQuery = `
      SELECT *
      FROM historico_nominas_gsau 
      ${whereClause}
      ORDER BY "Mes" DESC, "cveper" DESC
      OFFSET $${paramIndex} LIMIT $${paramIndex + 1}
    `;

    const dataResult = await client.query(dataQuery, [
      ...params,
      offset,
      validatedPageSize,
    ]);

    await client.end();

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: validatedPage,
        pageSize: validatedPageSize,
        total: total,
        totalPages: Math.ceil(total / validatedPageSize),
      },
    });
  } catch (error) {
    console.error("Error in /api/percepciones:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

// GET /api/payroll/data - Get payroll data for charts and analysis
app.get("/api/payroll/data", verifyToken, async (req, res) => {
  try {
    const { status, cveper, pageSize = 1000, page = 1 } = req.query;

    const maxPageSize = 1000;
    const validatedPageSize = Math.min(parseInt(pageSize), maxPageSize);
    const validatedPage = Math.max(1, parseInt(page));

    const client = await getHistoricClient();

    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`"Status" = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (cveper) {
      conditions.push(`"cveper" = $${paramIndex}`);
      params.push(cveper);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get paginated results
    const offset = (validatedPage - 1) * validatedPageSize;
    const dataQuery = `
      SELECT 
        "RFC" as rfc,
        "Nombre completo" as nombre,
        "CURP" as curp,
        "Compañía" as sucursal,
        "Puesto" as puesto,
        "cveper" as fecha,
        "Sexo" as sexo,
        COALESCE(" SUELDO CLIENTE ", 0) as sueldo,
        COALESCE(" TOTAL DE PERCEPCIONES ", 0) as totalPercepciones,
        COALESCE(" TOTAL DEDUCCIONES ", 0) as totalDeducciones,
        "Status" as status
      FROM historico_nominas_gsau 
      ${whereClause}
      ORDER BY "Nombre completo" ASC
      OFFSET $${paramIndex} LIMIT $${paramIndex + 1}
    `;

    const dataResult = await client.query(dataQuery, [
      ...params,
      offset,
      validatedPageSize,
    ]);

    await client.end();

    res.json({
      success: true,
      data: dataResult.rows,
    });
  } catch (error) {
    console.error("Error in /api/payroll/data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// RUTAS DE AUTENTICACIÓN (SIN PROTECCIÓN)
// ============================================================================

// Validar email contra numerica_users
app.post("/api/auth/validate-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email es requerido",
      });
    }

    console.log("🔍 Validando email:", email);
    const result = await authService.validateEmail(email);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Error validando email:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Confirmar registro en backend
app.post("/api/auth/confirm-registration", async (req, res) => {
  try {
    const { email, firstName, lastName, phoneNumber } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email es requerido",
      });
    }

    console.log("✅ Confirmando registro para:", email);
    const result = await authService.confirmRegistration(
      email,
      firstName || "",
      lastName || "",
      phoneNumber || ""
    );

    res.json(result);
  } catch (error) {
    console.error("❌ Error confirmando registro:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Verificar usuario con código manual
app.post("/api/auth/verify-code", async (req, res) => {
  try {
    const { username, code } = req.body;

    if (!username || !code) {
      return res.status(400).json({
        success: false,
        error: "Username y código son requeridos",
      });
    }

    console.log("🔐 Verificando código para usuario:", username);
    const result = await authService.confirmUserWithCode(username, code);

    // Si la verificación fue exitosa, activar usuario en BD
    if (result.success) {
      await authService.activateUser(username);
    }

    res.json(result);
  } catch (error) {
    console.error("❌ Error verificando código:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Activar usuario (después de verificación exitosa)
app.post("/api/auth/activate-user", verifyToken, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email es requerido",
      });
    }

    console.log("✅ Activando usuario:", email);
    const result = await authService.activateUser(email);

    res.json(result);
  } catch (error) {
    console.error("❌ Error activando usuario:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Local API server running" });
});

// Debug endpoint to list all registered routes
app.get("/api/debug/routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
      });
    } else if (middleware.name === "router") {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods),
          });
        }
      });
    }
  });

  const payrollRoutes = routes.filter((r) => r.path.includes("/api/payroll"));

  res.json({
    success: true,
    totalRoutes: routes.length,
    payrollRoutes: payrollRoutes,
    allRoutes: routes,
  });
});

app.get("/api/payroll/periodos-from-curp", verifyToken, async (req, res) => {
  try {
    const { curp } = req.query;

    console.log(`🔍 Buscando períodos para CURP: ${curp}`);

    // Conectar directamente a la base de datos historico_nominas_gsau
    const { nominasPool } = require("./config/database");
    const client = await nominasPool.connect();

    try {
      // Buscar todos los registros con este CURP específico
      const query = `
        SELECT cveper
        FROM historico_nominas_gsau
        WHERE "CURP" = $1
        ORDER BY cveper
      `;

      console.log(`🔍 Ejecutando query para CURP: ${curp}`);
      const result = await client.query(query, [curp]);

      console.log(`📈 TOTAL DE DATAPOINTS ENCONTRADOS: ${result.rows.length}`);

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          data: [],
          total: 0,
          curp: curp,
          message: `No se encontraron registros para el CURP: ${curp}`,
        });
      }

      // Extraer valores únicos de cveper
      const cveperSet = new Set();
      const allCvepers = [];

      result.rows.forEach((row, index) => {
        allCvepers.push(row.cveper);
        cveperSet.add(row.cveper);
        console.log(`${index + 1}: ${row.cveper}`);
      });

      // Convertir a array y ordenar
      const uniqueCvepers = Array.from(cveperSet).sort();

      console.log(
        `📅 VALORES ÚNICOS DE CVEPER (${uniqueCvepers.length} períodos):`
      );
      uniqueCvepers.forEach((cveper, index) => {
        console.log(`${index + 1}: ${cveper}`);
      });

      // Formatear para dropdown (similar a getUniquePayrollPeriods)
      const formattedPeriods = uniqueCvepers.map((cveper) => {
        let labelValue = cveper;
        let valuePlusOne = cveper;

        try {
          const date = new Date(cveper);
          if (!isNaN(date.getTime())) {
            // Add +1 day in UTC (milliseconds)
            const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);

            // Label → formatted YYYY-MM-DD
            const formatDateUTC = (d) =>
              `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
                2,
                "0"
              )}-${String(d.getUTCDate()).padStart(2, "0")}`;
            labelValue = formatDateUTC(nextDay);

            // Value → ISO string (UTC)
            valuePlusOne = nextDay.toISOString();
          }
        } catch (err) {
          labelValue = cveper;
          valuePlusOne = cveper;
        }

        return {
          value: valuePlusOne, // 👈 ISO format (e.g. 2023-12-15T00:00:00.000Z)
          label: labelValue, // 👈 formatted display date (e.g. 2023-12-15)
          count: allCvepers.filter((c) => c === cveper).length,
        };
      });

      console.log(`🎯 METODOLOGÍA APLICADA:`);
      console.log(`1. ✅ Buscado CURP ${curp} en historico_nominas_gsau`);
      console.log(`2. ✅ Extraídos ${result.rows.length} datapoints`);
      console.log(
        `3. ✅ Identificados ${uniqueCvepers.length} períodos únicos`
      );
      console.log(`4. ✅ Formateados para dropdown`);

      res.json({
        success: true,
        data: formattedPeriods,
        total: uniqueCvepers.length,
        datapoints: result.rows.length,
        curp: curp,
        methodology: {
          step1: `Búsqueda de CURP ${curp}`,
          step2: `${result.rows.length} datapoints encontrados`,
          step3: `${uniqueCvepers.length} períodos únicos extraídos`,
          step4: "Formateados para dropdown",
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Error obteniendo períodos desde CURP:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Catch-all routes - These MUST come after all specific routes to avoid conflicts

// ============================================================================
// PAYROLL SPECIFIC ROUTES - MUST BE BEFORE /api/payroll/:rfc
// These routes must come BEFORE the parameterized /api/payroll/:rfc route
// ============================================================================

app.get("/api/payroll/name-from-curp", verifyToken, async (req, res) => {
  try {
    const { curp } = req.query;

    if (!curp) {
      return res.status(400).json({
        success: false,
        error: "CURP es requerido",
      });
    }

    console.log(`🔍 Buscando nombre completo para CURP: ${curp}`);

    // Conectar directamente a la base de datos historico_nominas_gsau
    const { nominasPool } = require("./config/database");
    const client = await nominasPool.connect();

    try {
      // Buscar nombre completo correspondiente al CURP específico
      const query = `
        SELECT DISTINCT "Nombre completo"
        FROM historico_nominas_gsau
        WHERE "CURP" = $1
        AND "Nombre completo" IS NOT NULL
        AND "Nombre completo" != ''
        LIMIT 1
      `;

      console.log(
        `🔍 Ejecutando query para buscar nombre completo de CURP: ${curp}`
      );
      const result = await client.query(query, [curp]);

      if (result.rows.length === 0) {
        console.log(`⚠️ No se encontró nombre completo para CURP: ${curp}`);
        return res.json({
          success: true,
          data: null,
          curp: curp,
          message: `No se encontró nombre completo para el CURP: ${curp}`,
        });
      }

      const nombreCompleto = result.rows[0]["Nombre completo"];
      console.log(
        `✅ Nombre completo encontrado para CURP ${curp}: ${nombreCompleto}`
      );

      res.json({
        success: true,
        data: {
          curp: curp,
          nombreCompleto: nombreCompleto,
        },
        message: `Nombre completo encontrado exitosamente`,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Error obteniendo nombre completo desde CURP:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/api/documents/search-by-name", verifyToken, async (req, res) => {
  try {
    const { employeeName } = req.query;

    if (!employeeName) {
      return res.status(400).json({
        success: false,
        error: "employeeName es requerido",
      });
    }

    console.log(`🔍 Buscando documentos para empleado: ${employeeName}`);

    // Usar el servicio de Google Drive para buscar archivos
    const result = await googleDriveService.searchWithNameVariations(
      employeeName
    );

    if (result.success) {
      console.log(
        `📁 Encontrados ${result.files.length} documentos para ${employeeName}`
      );

      res.json({
        success: true,
        files: result.files,
        total: result.files.length,
        employeeName: employeeName,
        searchVariations: result.searchVariations,
        message: `Se encontraron ${result.files.length} documentos para ${employeeName}`,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Error buscando documentos en Google Drive",
        details: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Error en búsqueda de documentos:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// NUEVO: Obtener URL de descarga directa para un documento
app.get("/api/documents/download/:fileId", verifyToken, async (req, res) => {
  try {
    const { fileId } = req.params;

    console.log(`📥 Generando URL de descarga para archivo: ${fileId}`);

    const result = await googleDriveService.generateDownloadUrl(fileId);

    if (result.success) {
      res.json({
        success: true,
        downloadUrl: result.downloadUrl,
        expiresIn: result.expiresIn,
        fileId: fileId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Error generando URL de descarga",
        details: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Error generando URL de descarga:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// NUEVO: Obtener metadatos de un documento específico
app.get("/api/documents/metadata/:fileId", verifyToken, async (req, res) => {
  try {
    const { fileId } = req.params;

    console.log(`📋 Obteniendo metadatos para archivo: ${fileId}`);

    const result = await googleDriveService.getFileMetadata(fileId);

    if (result.success) {
      res.json({
        success: true,
        file: result.file,
        fileId: fileId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Error obteniendo metadatos del archivo",
        details: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Error obteniendo metadatos:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// NUEVO: Endpoint para búsqueda en subcarpetas de Google Drive
app.get("/api/documents/search-subfolders", verifyToken, async (req, res) => {
  try {
    const { employeeName } = req.query;

    if (!employeeName) {
      return res.status(400).json({
        success: false,
        error: "employeeName es requerido",
      });
    }

    console.log(`🔍 Buscando en subcarpetas para empleado: ${employeeName}`);

    const result = await googleDriveService.searchInSubfolders(employeeName);

    if (result.success) {
      console.log(
        `📁 Encontrados ${result.files.length} documentos en subcarpetas`
      );

      res.json({
        success: true,
        files: result.files,
        total: result.files.length,
        employeeName: employeeName,
        message: `Se encontraron ${result.files.length} documentos en subcarpetas para ${employeeName}`,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Error buscando en subcarpetas",
        details: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Error en búsqueda de subcarpetas:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/payroll/rfc-from-curp - Get RFC from CURP
// NOTE: This route MUST be BEFORE /api/payroll/:rfc to avoid route conflicts
app.get("/api/payroll/rfc-from-curp", verifyToken, async (req, res) => {
  const requestId = Date.now();
  console.log(
    `\n[RFC-FROM-CURP API] [${requestId}] ==========================================`
  );
  console.log(
    `[RFC-FROM-CURP API] [${requestId}] Endpoint: GET /api/payroll/rfc-from-curp`
  );
  console.log(
    `[RFC-FROM-CURP API] [${requestId}] Timestamp: ${new Date().toISOString()}`
  );
  console.log(
    `[RFC-FROM-CURP API] [${requestId}] Full URL: ${req.protocol}://${req.get(
      "host"
    )}${req.originalUrl}`
  );
  console.log(
    `[RFC-FROM-CURP API] [${requestId}] Query Parameters:`,
    JSON.stringify(req.query, null, 2)
  );

  try {
    const { curp } = req.query;

    console.log(
      `[RFC-FROM-CURP API] [${requestId}] Processing request - CURP: ${
        curp || "MISSING"
      }`
    );

    if (!curp) {
      console.log(
        `[RFC-FROM-CURP API] [${requestId}] ERROR: CURP parameter is required`
      );
      return res.status(400).json({
        success: false,
        error: "CURP parameter is required",
      });
    }

    const cleanedCurp = String(curp).trim();
    console.log(
      `[RFC-FROM-CURP API] [${requestId}] Searching RFC for CURP: ${cleanedCurp}`
    );

    console.log(
      `[RFC-FROM-CURP API] [${requestId}] Connecting to Historic database...`
    );
    const client = await getHistoricClient();

    try {
      const query = `
        SELECT DISTINCT "RFC"
        FROM historico_nominas_gsau
        WHERE UPPER(TRIM("CURP")) = UPPER(TRIM($1))
        AND "RFC" IS NOT NULL
        AND TRIM("RFC") != ''
        LIMIT 1
      `;

      console.log(`[RFC-FROM-CURP API] [${requestId}] Executing query...`);
      console.log(`[RFC-FROM-CURP API] [${requestId}] SQL Query: ${query}`);
      console.log(
        `[RFC-FROM-CURP API] [${requestId}] Query Parameters: [${cleanedCurp}]`
      );

      const result = await client.query(query, [cleanedCurp]);

      console.log(
        `[RFC-FROM-CURP API] [${requestId}] Query executed successfully`
      );
      console.log(
        `[RFC-FROM-CURP API] [${requestId}] Records found: ${result.rows.length}`
      );

      if (result.rows.length === 0) {
        console.log(
          `[RFC-FROM-CURP API] [${requestId}] No RFC found for CURP: ${cleanedCurp}`
        );
        console.log(
          `[RFC-FROM-CURP API] [${requestId}] ==========================================\n`
        );
        return res.status(404).json({
          success: false,
          error: `RFC not found for CURP: ${cleanedCurp}`,
        });
      }

      const rfc = result.rows[0].RFC;
      console.log(
        `[RFC-FROM-CURP API] [${requestId}] RFC found for CURP ${cleanedCurp}: ${rfc}`
      );
      console.log(`[RFC-FROM-CURP API] [${requestId}] Sending response`);
      console.log(
        `[RFC-FROM-CURP API] [${requestId}] ==========================================\n`
      );

      res.json({
        success: true,
        data: {
          curp: cleanedCurp,
          rfc: rfc,
        },
      });
    } catch (dbError) {
      console.error(
        `[RFC-FROM-CURP API] [${requestId}] Database error:`,
        dbError
      );
      console.error(
        `[RFC-FROM-CURP API] [${requestId}] Error message:`,
        dbError.message
      );
      console.error(
        `[RFC-FROM-CURP API] [${requestId}] Error stack:`,
        dbError.stack
      );
      throw dbError;
    } finally {
      client.end();
      console.log(
        `[RFC-FROM-CURP API] [${requestId}] Database connection closed`
      );
    }
  } catch (error) {
    console.error(
      `[RFC-FROM-CURP API] [${requestId}] ERROR: Failed to get RFC from CURP`
    );
    console.error(
      `[RFC-FROM-CURP API] [${requestId}] Error message:`,
      error.message
    );
    console.error(
      `[RFC-FROM-CURP API] [${requestId}] Error stack:`,
      error.stack
    );
    console.log(
      `[RFC-FROM-CURP API] [${requestId}] ==========================================\n`
    );

    res.status(500).json({
      success: false,
      error: error.message,
      details: "Error retrieving RFC from CURP",
    });
  }
});

// GET /api/payroll/fecpla-from-rfc - Get calculated FPL dates from RFC
// NOTE: This route MUST be BEFORE /api/payroll/:rfc to avoid route conflicts
app.get("/api/payroll/fecpla-from-rfc", verifyToken, async (req, res) => {
  const requestId = Date.now();
  console.log(
    `\n[FECPLA API] [${requestId}] ==========================================`
  );
  console.log(
    `[FECPLA API] [${requestId}] Endpoint: GET /api/payroll/fecpla-from-rfc`
  );
  console.log(
    `[FECPLA API] [${requestId}] Timestamp: ${new Date().toISOString()}`
  );
  console.log(
    `[FECPLA API] [${requestId}] Full URL: ${req.protocol}://${req.get(
      "host"
    )}${req.originalUrl}`
  );
  console.log(
    `[FECPLA API] [${requestId}] Query Parameters:`,
    JSON.stringify(req.query, null, 2)
  );

  try {
    const { rfc } = req.query;

    console.log(
      `[FECPLA API] [${requestId}] Processing request - RFC: ${
        rfc || "MISSING"
      }`
    );

    if (!rfc) {
      console.log(
        `[FECPLA API] [${requestId}] ERROR: RFC parameter is required`
      );
      return res.status(400).json({
        success: false,
        error: "RFC parameter is required",
      });
    }

    console.log(`[FECPLA API] [${requestId}] Connecting to Fondos database...`);
    const client = await getFondosClient();

    try {
      // First, identify all columns in the table
      console.log(`[FECPLA API] [${requestId}] Analyzing table structure...`);
      const allColumnsQuery = `
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'historico_fondos_gsau'
        ORDER BY ordinal_position
      `;

      const allColumnsResult = await client.query(allColumnsQuery);
      console.log(
        `[FECPLA API] [${requestId}] Available columns:`,
        allColumnsResult.rows.map((r) => r.column_name).join(", ")
      );

      // Find Antigüedad en Fondo column with multiple strategies
      let antiguedadColumn = null;

      // Strategy 1: Search by exact name
      const exactNames = [
        "Antiguedad en Fondo",
        "ANTIGUEDAD EN FONDO",
        "antiguedad_en_fondo",
        "AntiguedadEnFondo",
        "antiguedad_fondo",
        "AntiguedadFondo",
        "ant_fondo",
        "Ant Fondo",
        "ANT FONDO",
      ];

      for (const exactName of exactNames) {
        const found = allColumnsResult.rows.find(
          (row) => row.column_name === exactName
        );
        if (found) {
          antiguedadColumn = found.column_name;
          console.log(
            `[FECPLA API] [${requestId}] Found column by exact name: "${antiguedadColumn}"`
          );
          break;
        }
      }

      // Strategy 2: Search by keywords
      if (!antiguedadColumn) {
        const keywordMatches = allColumnsResult.rows.filter((row) => {
          const colLower = row.column_name.toLowerCase();
          return (
            colLower.includes("antiguedad") ||
            colLower.includes("fondo") ||
            (colLower.includes("ant") && colLower.includes("fondo"))
          );
        });

        if (keywordMatches.length > 0) {
          antiguedadColumn = keywordMatches[0].column_name;
          console.log(
            `[FECPLA API] [${requestId}] Found column by keyword: "${antiguedadColumn}"`
          );
        }
      }

      // Strategy 3: Analyze numeric columns by content
      if (!antiguedadColumn) {
        console.log(
          `[FECPLA API] [${requestId}] Analyzing numeric columns by content...`
        );
        const numericColumns = allColumnsResult.rows.filter(
          (row) =>
            [
              "numeric",
              "double precision",
              "real",
              "integer",
              "smallint",
              "bigint",
            ].includes(row.data_type) &&
            !["numrfc", "fecpla"].includes(row.column_name.toLowerCase())
        );

        for (const numCol of numericColumns.slice(0, 10)) {
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

            // If it looks like years data (range 0-50, reasonable average)
            if (
              stats.positivos > 0 &&
              stats.min_val >= 0 &&
              stats.max_val <= 50 &&
              stats.avg_val <= 15
            ) {
              antiguedadColumn = numCol.column_name;
              console.log(
                `[FECPLA API] [${requestId}] Detected column by content analysis: "${antiguedadColumn}"`
              );
              break;
            }
          } catch (e) {
            // Continue with next column
          }
        }
      }

      if (!antiguedadColumn) {
        console.log(
          `[FECPLA API] [${requestId}] ERROR: Could not identify Antigüedad en Fondo column`
        );
        return res.json({
          success: false,
          error: "Could not find Antigüedad en Fondo column",
          availableColumns: allColumnsResult.rows.map((r) => r.column_name),
          message: "Please specify the column name manually",
        });
      }

      // Main query with FPL date calculation
      const query = `
        SELECT 
          fecpla,
          "${antiguedadColumn}" as antiguedad_anos_raw,
          CAST("${antiguedadColumn}" AS NUMERIC) as antiguedad_anos,
          -- Calculate base FPL date: fecpla + (antiguedad_anos * 365.25 days)
          (fecpla + INTERVAL '1 day' * (CAST(COALESCE("${antiguedadColumn}", 0) AS NUMERIC) * 365.25))::date as fecha_fpl_base,
          -- ADJUSTMENT: If date falls on days 28-31, move to day 1 of next month
          CASE 
            WHEN EXTRACT(DAY FROM (fecpla + INTERVAL '1 day' * (CAST(COALESCE("${antiguedadColumn}", 0) AS NUMERIC) * 365.25))::date) >= 28 
            THEN DATE_TRUNC('month', (fecpla + INTERVAL '1 day' * (CAST(COALESCE("${antiguedadColumn}", 0) AS NUMERIC) * 365.25))::date) + INTERVAL '1 month'
            ELSE (fecpla + INTERVAL '1 day' * (CAST(COALESCE("${antiguedadColumn}", 0) AS NUMERIC) * 365.25))::date
          END as fecha_fpl_calculada
        FROM historico_fondos_gsau
        WHERE numrfc = $1
          AND fecpla IS NOT NULL
          AND "${antiguedadColumn}" IS NOT NULL
          AND CAST("${antiguedadColumn}" AS NUMERIC) >= 0
        ORDER BY CAST("${antiguedadColumn}" AS NUMERIC) ASC, fecha_fpl_calculada DESC
      `;

      console.log(
        `[FECPLA API] [${requestId}] Executing query with FPL calculation for RFC: ${rfc}`
      );
      console.log(
        `[FECPLA API] [${requestId}] Antigüedad column: ${antiguedadColumn}`
      );
      console.log(`[FECPLA API] [${requestId}] SQL Query: ${query}`);

      const result = await client.query(query, [rfc]);

      console.log(`[FECPLA API] [${requestId}] Query executed successfully`);
      console.log(
        `[FECPLA API] [${requestId}] Total records found: ${result.rows.length}`
      );

      if (result.rows.length === 0) {
        console.log(
          `[FECPLA API] [${requestId}] No FPL dates found for RFC: ${rfc}`
        );
        console.log(
          `[FECPLA API] [${requestId}] ==========================================\n`
        );
        return res.json({
          success: true,
          data: [],
          total: 0,
          rfc: rfc,
          message: `No FPL dates calculated for RFC: ${rfc}`,
        });
      }

      // Process and format calculated dates
      const fecplasCalculadas = new Map();
      const allCalculatedDates = [];

      result.rows.forEach((row, index) => {
        const fechaBase = row.fecpla;
        const antiguedadAnos = parseFloat(row.antiguedad_anos) || 0;
        const fechaCalculada = row.fecha_fpl_calculada;

        console.log(
          `[FECPLA API] [${requestId}] Record ${
            index + 1
          }: Base: ${fechaBase}, Antigüedad: ${antiguedadAnos} years, FPL: ${fechaCalculada}`
        );

        // Use calculated date as unique key
        const fechaKey = fechaCalculada.toISOString().split("T")[0];

        if (!fecplasCalculadas.has(fechaKey)) {
          fecplasCalculadas.set(fechaKey, {
            fechaCalculada: fechaCalculada,
            fechaBase: fechaBase,
            antiguedadAnos: antiguedadAnos,
            count: 0,
          });
        }

        fecplasCalculadas.get(fechaKey).count++;
        allCalculatedDates.push(fechaCalculada);
      });

      // Convert to array and sort from most recent to oldest
      const uniqueFecplasFPL = Array.from(fecplasCalculadas.values()).sort(
        (a, b) => new Date(b.fechaCalculada) - new Date(a.fechaCalculada)
      );

      console.log(
        `[FECPLA API] [${requestId}] Unique FPL dates calculated (${uniqueFecplasFPL.length} dates):`
      );
      uniqueFecplasFPL.forEach((item, index) => {
        console.log(
          `[FECPLA API] [${requestId}]   ${index + 1}: ${
            item.fechaCalculada.toISOString().split("T")[0]
          } (Base: ${item.fechaBase}, +${item.antiguedadAnos} years)`
        );
      });

      // Format for dropdown - WITHOUT TIMESTAMP, only dates
      // INCLUDE METADATA FROM ORIGINAL DATAPOINT for reverse lookup
      const formattedDates = uniqueFecplasFPL.map((item) => {
        const fechaFPL = item.fechaCalculada;
        let displayValue = fechaFPL.toISOString().split("T")[0]; // Format YYYY-MM-DD

        return {
          value: displayValue, // Only date WITHOUT timestamp for backend
          label: displayValue, // Only date for display
          count: item.count,
          metadata: {
            fechaBase: item.fechaBase.toISOString().split("T")[0], // Also without timestamp
            antiguedadAnos: item.antiguedadAnos,
            calculoAplicado: `${item.fechaBase.toISOString().split("T")[0]} + ${
              item.antiguedadAnos
            } years = ${displayValue}`,
            ajusteAplicado:
              fechaFPL.getDate() >= 28
                ? "Moved to 1st of next month"
                : "Original date maintained",
            // CRITICAL DATA for reverse lookup
            originalFecpla: item.fechaBase.toISOString().split("T")[0], // Original fecpla date
            originalAntiguedad: item.antiguedadAnos, // Exact antigüedad used
          },
        };
      });

      console.log(`[FECPLA API] [${requestId}] FPL methodology applied:`);
      console.log(
        `[FECPLA API] [${requestId}]   1. Searched RFC ${rfc} in historico_fondos_gsau`
      );
      console.log(
        `[FECPLA API] [${requestId}]   2. Extracted ${result.rows.length} records with fecpla and antigüedad`
      );
      console.log(
        `[FECPLA API] [${requestId}]   3. Calculated FPL dates: fecpla + (antiguedad_anos * 365.25 days)`
      );
      console.log(
        `[FECPLA API] [${requestId}]   4. Identified ${uniqueFecplasFPL.length} unique FPL dates`
      );
      console.log(`[FECPLA API] [${requestId}]   5. Formatted for dropdown`);
      console.log(
        `[FECPLA API] [${requestId}] Sending response with ${formattedDates.length} dates`
      );
      console.log(
        `[FECPLA API] [${requestId}] ==========================================\n`
      );

      res.json({
        success: true,
        data: formattedDates,
        total: uniqueFecplasFPL.length,
        datapoints: result.rows.length,
        rfc: rfc,
        antiguedadColumn: antiguedadColumn,
        calculation: "fecpla + (antiguedad_anos * 365.25 days)",
        methodology: {
          step1: `Search RFC ${rfc} in historico_fondos_gsau`,
          step2: `${result.rows.length} records found with complete data`,
          step3: `Applied calculation: fecpla + (${antiguedadColumn} * 365.25 days)`,
          step4: `${uniqueFecplasFPL.length} unique FPL dates calculated`,
          step5: "Formatted and sorted for dropdown",
        },
      });
    } catch (dbError) {
      console.error(`[FECPLA API] [${requestId}] Database error:`, dbError);
      console.error(
        `[FECPLA API] [${requestId}] Error message:`,
        dbError.message
      );
      console.error(`[FECPLA API] [${requestId}] Error stack:`, dbError.stack);
      throw dbError;
    } finally {
      client.end();
      console.log(`[FECPLA API] [${requestId}] Database connection closed`);
    }
  } catch (error) {
    console.error(`[FECPLA API] [${requestId}] ERROR: Failed to get FPL dates`);
    console.error(`[FECPLA API] [${requestId}] Error message:`, error.message);
    console.error(`[FECPLA API] [${requestId}] Error stack:`, error.stack);
    console.log(
      `[FECPLA API] [${requestId}] ==========================================\n`
    );

    res.status(500).json({
      success: false,
      error: error.message,
      details: "Error calculating FPL dates with Antigüedad en Fondo",
    });
  }
});

// GET /api/payroll/:rfc - Get specific employee from payroll
// NOTE: This route MUST be AFTER all specific routes like /api/payroll/rfc-from-curp and /api/payroll/fecpla-from-rfc
app.get("/api/payroll/:rfc", verifyToken, async (req, res) => {
  try {
    const { rfc } = req.params;
    const client = await getHistoricClient();

    const result = await client.query(
      `
      SELECT 
        "RFC" as rfc,
        "Nombre completo" as nombre,
        "CURP" as curp,
        "Compañía" as sucursal,
        "Puesto" as puesto,
        "cveper" as fecha,
        COALESCE(" SUELDO CLIENTE ", 0) as sueldo,
        COALESCE(" COMISIONES CLIENTE ", 0) + COALESCE(" SUELDO CLIENTE " * 0.1, 0) as comisiones,
        "Status" as status,
        "Mes" as mes,
        "Periodo" as periodo,
        " TOTAL DE PERCEPCIONES " as totalPercepciones,
        " TOTAL DEDUCCIONES " as totalDeducciones
      FROM historico_nominas_gsau 
      WHERE "RFC" = $1
    `,
      [rfc]
    );

    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const row = result.rows[0];
    res.json({
      rfc: row.rfc,
      nombre: row.nombre,
      curp: row.curp,
      sucursal: row.sucursal,
      puesto: row.puesto,
      fecha: row.fecha,
      sueldo: parseFloat(row.sueldo || 0),
      comisiones: parseFloat(row.comisiones || 0),
      totalPercepciones:
        parseFloat(row.sueldo || 0) + parseFloat(row.comisiones || 0),
      status: row.status,
      mes: "Enero 2024",
      estado: row.status,
      perfilUrl: null,
    });
  } catch (error) {
    console.error("Error in /api/payroll/:rfc:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/employees/:id - Get specific employee
app.get("/api/employees/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await getClient();

    const result = await client.query(
      `
      SELECT 
        id,
        first_name,
        last_name,
        (first_name || ' ' || last_name) as full_name,
        email,
        phone,
        department,
        role,
        location,
        status,
        hire_date,
        tags,
        avatar_url
      FROM employees 
      WHERE id = $1
    `,
      [id]
    );

    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      department: row.department,
      role: row.role,
      location: row.location,
      status: row.status,
      hireDate: row.hire_date,
      tags: row.tags,
      avatarUrl: row.avatar_url,
    });
  } catch (error) {
    console.error("Error in /api/employees/:id:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// FONDOS ENDPOINTS - Detailed logging in English
// ============================================================================

// GET /api/fondos - Get fondos data by RFC
app.get("/api/fondos", verifyToken, async (req, res) => {
  const requestId = Date.now();
  console.log(
    `\n[FONDOS API] [${requestId}] ==========================================`
  );
  console.log(`[FONDOS API] [${requestId}] Endpoint: GET /api/fondos`);
  console.log(
    `[FONDOS API] [${requestId}] Timestamp: ${new Date().toISOString()}`
  );
  console.log(
    `[FONDOS API] [${requestId}] Full URL: ${req.protocol}://${req.get(
      "host"
    )}${req.originalUrl}`
  );
  console.log(
    `[FONDOS API] [${requestId}] Query Parameters:`,
    JSON.stringify(req.query, null, 2)
  );

  try {
    const { rfc, pageSize = 1, page = 1 } = req.query;

    console.log(
      `[FONDOS API] [${requestId}] Processing request - RFC: ${
        rfc || "MISSING"
      }, pageSize: ${pageSize}, page: ${page}`
    );

    if (!rfc) {
      console.log(
        `[FONDOS API] [${requestId}] ERROR: RFC parameter is required`
      );
      return res.status(400).json({
        success: false,
        error: "RFC parameter is required",
      });
    }

    console.log(`[FONDOS API] [${requestId}] Connecting to Fondos database...`);
    const client = await getFondosClient();

    try {
      const limit = parseInt(pageSize) || 1;
      const offset = (parseInt(page) - 1) * limit;

      console.log(
        `[FONDOS API] [${requestId}] Query parameters - limit: ${limit}, offset: ${offset}`
      );

      const query = `
        SELECT *
        FROM historico_fondos_gsau
        WHERE numrfc = $1
        ORDER BY fecpla DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM historico_fondos_gsau
        WHERE numrfc = $1
      `;

      console.log(
        `[FONDOS API] [${requestId}] Executing data query with RFC: ${rfc}`
      );
      console.log(`[FONDOS API] [${requestId}] SQL Query: ${query}`);
      console.log(
        `[FONDOS API] [${requestId}] Query Parameters: [${rfc}, ${limit}, ${offset}]`
      );

      const [result, countResult] = await Promise.all([
        client.query(query, [rfc, limit, offset]),
        client.query(countQuery, [rfc]),
      ]);

      const total = parseInt(countResult.rows[0].total);
      const dataCount = result.rows.length;

      console.log(`[FONDOS API] [${requestId}] Query executed successfully`);
      console.log(`[FONDOS API] [${requestId}] Total records found: ${total}`);
      console.log(`[FONDOS API] [${requestId}] Records returned: ${dataCount}`);

      if (dataCount > 0) {
        console.log(
          `[FONDOS API] [${requestId}] Sample record keys:`,
          Object.keys(result.rows[0])
        );
      }

      console.log(
        `[FONDOS API] [${requestId}] Sending response with ${dataCount} records`
      );
      console.log(
        `[FONDOS API] [${requestId}] ==========================================\n`
      );

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: parseInt(page),
          pageSize: limit,
          total: total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (dbError) {
      console.error(`[FONDOS API] [${requestId}] Database error:`, dbError);
      console.error(
        `[FONDOS API] [${requestId}] Error message:`,
        dbError.message
      );
      console.error(`[FONDOS API] [${requestId}] Error stack:`, dbError.stack);
      throw dbError;
    } finally {
      client.end();
      console.log(`[FONDOS API] [${requestId}] Database connection closed`);
    }
  } catch (error) {
    console.error(
      `[FONDOS API] [${requestId}] ERROR: Failed to get fondos data`
    );
    console.error(`[FONDOS API] [${requestId}] Error message:`, error.message);
    console.error(`[FONDOS API] [${requestId}] Error stack:`, error.stack);
    console.log(
      `[FONDOS API] [${requestId}] ==========================================\n`
    );

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/fpl/data-from-rfc - Get FPL data by RFC and optional date
app.get("/api/fpl/data-from-rfc", verifyToken, async (req, res) => {
  const requestId = Date.now();
  console.log(
    `\n[FPL API] [${requestId}] ==========================================`
  );
  console.log(`[FPL API] [${requestId}] Endpoint: GET /api/fpl/data-from-rfc`);
  console.log(
    `[FPL API] [${requestId}] Timestamp: ${new Date().toISOString()}`
  );
  console.log(
    `[FPL API] [${requestId}] Full URL: ${req.protocol}://${req.get("host")}${
      req.originalUrl
    }`
  );
  console.log(
    `[FPL API] [${requestId}] Query Parameters:`,
    JSON.stringify(req.query, null, 2)
  );

  try {
    const { rfc, fechaFPL, originalFecpla, originalAntiguedad } = req.query;

    console.log(
      `[FPL API] [${requestId}] Processing request - RFC: ${rfc || "MISSING"}`
    );
    console.log(
      `[FPL API] [${requestId}] fechaFPL: ${fechaFPL || "NOT PROVIDED"}`
    );
    console.log(
      `[FPL API] [${requestId}] originalFecpla: ${
        originalFecpla || "NOT PROVIDED"
      }`
    );
    console.log(
      `[FPL API] [${requestId}] originalAntiguedad: ${
        originalAntiguedad || "NOT PROVIDED"
      }`
    );

    if (!rfc) {
      console.log(`[FPL API] [${requestId}] ERROR: RFC parameter is required`);
      return res.status(400).json({
        success: false,
        error: "RFC parameter is required",
      });
    }

    console.log(`[FPL API] [${requestId}] Connecting to Fondos database...`);
    const client = await getFondosClient();

    try {
      let query, params;
      let antiguedadColumn = null; // Declare at higher scope for use in fallback/debug

      // Check if we have original metadata for precise lookup
      if (originalFecpla && originalAntiguedad) {
        console.log(
          `[FPL API] [${requestId}] Using precise lookup with original metadata`
        );
        console.log(
          `[FPL API] [${requestId}] originalFecpla: ${originalFecpla}, originalAntiguedad: ${originalAntiguedad}`
        );

        // First, find the antiguedad column name
        const allColumnsQuery = `
          SELECT column_name, data_type
          FROM information_schema.columns 
          WHERE table_name = 'historico_fondos_gsau'
          ORDER BY ordinal_position
        `;

        console.log(`[FPL API] [${requestId}] Querying column information...`);
        const allColumnsResult = await client.query(allColumnsQuery);
        const exactNames = [
          "Antiguedad en Fondo",
          "ANTIGUEDAD EN FONDO",
          "antiguedad_en_fondo",
          "AntiguedadEnFondo",
          "antiguedad_fondo",
          "AntiguedadFondo",
          "ant_fondo",
          "Ant Fondo",
          "ANT FONDO",
        ];

        for (const exactName of exactNames) {
          const found = allColumnsResult.rows.find(
            (row) => row.column_name === exactName
          );
          if (found) {
            antiguedadColumn = found.column_name;
            console.log(
              `[FPL API] [${requestId}] Found antiguedad column: ${antiguedadColumn}`
            );
            break;
          }
        }

        if (!antiguedadColumn) {
          const keywordMatches = allColumnsResult.rows.filter((row) => {
            const colLower = row.column_name.toLowerCase();
            return (
              colLower.includes("antiguedad") || colLower.includes("fondo")
            );
          });

          if (keywordMatches.length > 0) {
            antiguedadColumn = keywordMatches[0].column_name;
            console.log(
              `[FPL API] [${requestId}] Found antiguedad column by keyword: ${antiguedadColumn}`
            );
          }
        }

        if (antiguedadColumn) {
          const antiguedadValue = parseFloat(originalAntiguedad);
          const tolerance = 0.0001; // Small tolerance for floating point comparison

          console.log(
            `[FPL API] [${requestId}] Using precise query with antiguedad column`
          );
          console.log(
            `[FPL API] [${requestId}] Antigüedad value: ${antiguedadValue}, tolerance: ±${tolerance}`
          );

          // Use range-based comparison for floating point numbers to handle precision issues
          query = `
            SELECT *
            FROM historico_fondos_gsau
            WHERE numrfc = $1
              AND DATE(fecpla) = $2
              AND ABS(CAST("${antiguedadColumn}" AS NUMERIC) - $3) < $4
            ORDER BY fecpla DESC
            LIMIT 1
          `;
          params = [rfc, originalFecpla, antiguedadValue, tolerance];

          console.log(
            `[FPL API] [${requestId}] Query with range-based antigüedad comparison`
          );
          console.log(
            `[FPL API] [${requestId}] Looking for antigüedad between ${
              antiguedadValue - tolerance
            } and ${antiguedadValue + tolerance}`
          );
        } else {
          console.log(
            `[FPL API] [${requestId}] WARNING: Could not find antiguedad column, using fallback query`
          );
          query = `
            SELECT *
            FROM historico_fondos_gsau
            WHERE numrfc = $1
              AND DATE(fecpla) = $2
            ORDER BY fecpla DESC
            LIMIT 1
          `;
          params = [rfc, originalFecpla];
        }
      } else if (fechaFPL) {
        console.log(
          `[FPL API] [${requestId}] Using calculated FPL date lookup with fechaFPL: ${fechaFPL}`
        );
        console.log(
          `[FPL API] [${requestId}] NOTE: fechaFPL is a calculated date, not fecpla. Need to find records where fecpla + antigüedad = fechaFPL`
        );

        // First, find the antiguedad column
        const allColumnsQuery = `
          SELECT column_name, data_type
          FROM information_schema.columns 
          WHERE table_name = 'historico_fondos_gsau'
          ORDER BY ordinal_position
        `;

        const allColumnsResult = await client.query(allColumnsQuery);

        const exactNames = [
          "Antiguedad en Fondo",
          "ANTIGUEDAD EN FONDO",
          "antiguedad_en_fondo",
          "AntiguedadEnFondo",
          "antiguedad_fondo",
          "AntiguedadFondo",
          "ant_fondo",
          "Ant Fondo",
          "ANT FONDO",
        ];

        for (const exactName of exactNames) {
          const found = allColumnsResult.rows.find(
            (row) => row.column_name === exactName
          );
          if (found) {
            antiguedadColumn = found.column_name;
            console.log(
              `[FPL API] [${requestId}] Found antiguedad column: ${antiguedadColumn}`
            );
            break;
          }
        }

        if (!antiguedadColumn) {
          const keywordMatches = allColumnsResult.rows.filter((row) => {
            const colLower = row.column_name.toLowerCase();
            return (
              colLower.includes("antiguedad") || colLower.includes("fondo")
            );
          });
          if (keywordMatches.length > 0) {
            antiguedadColumn = keywordMatches[0].column_name;
            console.log(
              `[FPL API] [${requestId}] Found antiguedad column by keyword: ${antiguedadColumn}`
            );
          }
        }

        if (antiguedadColumn) {
          // Search by calculating FPL date: fecpla + (antigüedad * 365.25 days) = fechaFPL
          // Also handle the adjustment: if calculated date falls on days 28-31, it's moved to day 1 of next month
          const targetDate = new Date(fechaFPL);
          const targetYear = targetDate.getFullYear();
          const targetMonth = targetDate.getMonth() + 1; // JavaScript months are 0-indexed
          const targetDay = targetDate.getDate();

          console.log(
            `[FPL API] [${requestId}] Searching for records where calculated FPL date matches: ${fechaFPL}`
          );
          console.log(
            `[FPL API] [${requestId}] Target date components: year=${targetYear}, month=${targetMonth}, day=${targetDay}`
          );

          // Query: Find records where the calculated FPL date matches fechaFPL
          // The calculation is: fecpla + (antigüedad * 365.25 days)
          // With adjustment: if day >= 28, move to 1st of next month
          query = `
            SELECT *,
              (fecpla + INTERVAL '1 day' * (CAST(COALESCE("${antiguedadColumn}", 0) AS NUMERIC) * 365.25))::date as fecha_fpl_calculada,
              CASE 
                WHEN EXTRACT(DAY FROM (fecpla + INTERVAL '1 day' * (CAST(COALESCE("${antiguedadColumn}", 0) AS NUMERIC) * 365.25))::date) >= 28 
                THEN DATE_TRUNC('month', (fecpla + INTERVAL '1 day' * (CAST(COALESCE("${antiguedadColumn}", 0) AS NUMERIC) * 365.25))::date) + INTERVAL '1 month'
                ELSE (fecpla + INTERVAL '1 day' * (CAST(COALESCE("${antiguedadColumn}", 0) AS NUMERIC) * 365.25))::date
              END as fecha_fpl_ajustada
            FROM historico_fondos_gsau
            WHERE numrfc = $1
              AND fecpla IS NOT NULL
              AND "${antiguedadColumn}" IS NOT NULL
              AND CAST("${antiguedadColumn}" AS NUMERIC) >= 0
              AND (
                -- Match exact calculated date
                (fecpla + INTERVAL '1 day' * (CAST(COALESCE("${antiguedadColumn}", 0) AS NUMERIC) * 365.25))::date = $2
                OR
                -- Match adjusted date (if original fell on days 28-31)
                (CASE 
                  WHEN EXTRACT(DAY FROM (fecpla + INTERVAL '1 day' * (CAST(COALESCE("${antiguedadColumn}", 0) AS NUMERIC) * 365.25))::date) >= 28 
                  THEN DATE_TRUNC('month', (fecpla + INTERVAL '1 day' * (CAST(COALESCE("${antiguedadColumn}", 0) AS NUMERIC) * 365.25))::date) + INTERVAL '1 month'
                  ELSE (fecpla + INTERVAL '1 day' * (CAST(COALESCE("${antiguedadColumn}", 0) AS NUMERIC) * 365.25))::date
                END)::date = $2
              )
            ORDER BY fecpla DESC
            LIMIT 1
          `;
          params = [rfc, fechaFPL];
          console.log(
            `[FPL API] [${requestId}] Using calculated FPL date matching query`
          );
        } else {
          // Fallback: if we can't find antiguedad column, just search by fecpla (won't work for calculated dates)
          console.log(
            `[FPL API] [${requestId}] WARNING: Could not find antiguedad column, using simple fecpla lookup (may not work for calculated FPL dates)`
          );
          query = `
            SELECT *
            FROM historico_fondos_gsau
            WHERE numrfc = $1
              AND DATE(fecpla) = $2
            ORDER BY fecpla DESC
            LIMIT 1
          `;
          params = [rfc, fechaFPL];
        }
      } else {
        console.log(
          `[FPL API] [${requestId}] Using general lookup (most recent record)`
        );
        query = `
          SELECT *
          FROM historico_fondos_gsau
          WHERE numrfc = $1
          ORDER BY fecpla DESC
          LIMIT 1
        `;
        params = [rfc];
      }

      console.log(`[FPL API] [${requestId}] Executing query...`);
      console.log(`[FPL API] [${requestId}] SQL Query: ${query}`);
      console.log(`[FPL API] [${requestId}] Query Parameters:`, params);

      let result = await client.query(query, params);

      console.log(`[FPL API] [${requestId}] Query executed successfully`);
      console.log(
        `[FPL API] [${requestId}] Records found: ${result.rows.length}`
      );

      // FALLBACK STRATEGY: If precise match fails, try fallback queries
      // Note: antiguedadColumn is declared at higher scope, so it's available here
      if (result.rows.length === 0 && originalFecpla && originalAntiguedad) {
        // Ensure antiguedadColumn is available for fallback
        if (!antiguedadColumn) {
          console.log(
            `[FPL API] [${requestId}] antiguedadColumn not found, trying to find it for fallback...`
          );
          try {
            const allColumnsQuery = `
              SELECT column_name, data_type
              FROM information_schema.columns 
              WHERE table_name = 'historico_fondos_gsau'
              ORDER BY ordinal_position
            `;
            const allColumnsResult = await client.query(allColumnsQuery);

            const exactNames = [
              "Antiguedad en Fondo",
              "ANTIGUEDAD EN FONDO",
              "antiguedad_en_fondo",
              "AntiguedadEnFondo",
              "antiguedad_fondo",
              "AntiguedadFondo",
              "ant_fondo",
              "Ant Fondo",
              "ANT FONDO",
            ];

            for (const exactName of exactNames) {
              const found = allColumnsResult.rows.find(
                (row) => row.column_name === exactName
              );
              if (found) {
                antiguedadColumn = found.column_name;
                break;
              }
            }

            if (!antiguedadColumn) {
              const keywordMatches = allColumnsResult.rows.filter((row) => {
                const colLower = row.column_name.toLowerCase();
                return (
                  colLower.includes("antiguedad") || colLower.includes("fondo")
                );
              });
              if (keywordMatches.length > 0) {
                antiguedadColumn = keywordMatches[0].column_name;
              }
            }
          } catch (e) {
            console.log(
              `[FPL API] [${requestId}] Could not find antiguedad column for fallback:`,
              e.message
            );
          }
        }

        if (antiguedadColumn) {
          console.log(
            `[FPL API] [${requestId}] Precise match failed, trying fallback strategies...`
          );

          // Fallback 1: Try with wider tolerance (0.01 instead of 0.0001)
          const widerTolerance = 0.01;
          console.log(
            `[FPL API] [${requestId}] Fallback 1: Trying with wider tolerance: ±${widerTolerance}`
          );
          const fallbackQuery1 = `
          SELECT *
          FROM historico_fondos_gsau
          WHERE numrfc = $1
            AND DATE(fecpla) = $2
            AND ABS(CAST("${antiguedadColumn}" AS NUMERIC) - $3) < $4
          ORDER BY fecpla DESC
          LIMIT 1
        `;
          result = await client.query(fallbackQuery1, [
            rfc,
            originalFecpla,
            parseFloat(originalAntiguedad),
            widerTolerance,
          ]);
          console.log(
            `[FPL API] [${requestId}] Fallback 1 result: ${result.rows.length} records`
          );

          // Fallback 2: Try by date only (ignore antigüedad)
          if (result.rows.length === 0) {
            console.log(
              `[FPL API] [${requestId}] Fallback 2: Trying by date only (ignoring antigüedad)`
            );
            const fallbackQuery2 = `
            SELECT *
            FROM historico_fondos_gsau
            WHERE numrfc = $1
              AND DATE(fecpla) = $2
            ORDER BY fecpla DESC
            LIMIT 1
          `;
            result = await client.query(fallbackQuery2, [rfc, originalFecpla]);
            console.log(
              `[FPL API] [${requestId}] Fallback 2 result: ${result.rows.length} records`
            );

            // Fallback 3: Try with date range (±1 day) to handle timezone/date conversion issues
            if (result.rows.length === 0) {
              console.log(
                `[FPL API] [${requestId}] Fallback 3: Trying with date range ±1 day`
              );
              const originalDate = new Date(originalFecpla);
              const dayBefore = new Date(originalDate);
              dayBefore.setDate(dayBefore.getDate() - 1);
              const dayAfter = new Date(originalDate);
              dayAfter.setDate(dayAfter.getDate() + 1);

              const fallbackQuery3 = `
              SELECT *
              FROM historico_fondos_gsau
              WHERE numrfc = $1
                AND DATE(fecpla) BETWEEN $2 AND $3
              ORDER BY fecpla DESC
              LIMIT 1
            `;
              result = await client.query(fallbackQuery3, [
                rfc,
                dayBefore.toISOString().split("T")[0],
                dayAfter.toISOString().split("T")[0],
              ]);
              console.log(
                `[FPL API] [${requestId}] Fallback 3 result: ${result.rows.length} records`
              );

              if (result.rows.length > 0) {
                const foundDate = result.rows[0].fecpla;
                const foundAntiguedad = result.rows[0][antiguedadColumn];
                console.log(
                  `[FPL API] [${requestId}] Found record with date range:`
                );
                console.log(
                  `[FPL API] [${requestId}]   Expected date: ${originalFecpla}, Found: ${foundDate}`
                );
                console.log(
                  `[FPL API] [${requestId}]   Expected antigüedad: ${originalAntiguedad}, Found: ${foundAntiguedad}`
                );
              }
            } else {
              const foundAntiguedad = result.rows[0][antiguedadColumn];
              console.log(
                `[FPL API] [${requestId}] Found record by date, but antigüedad mismatch:`
              );
              console.log(
                `[FPL API] [${requestId}]   Expected: ${originalAntiguedad}, Found: ${foundAntiguedad}`
              );
              console.log(
                `[FPL API] [${requestId}]   Difference: ${Math.abs(
                  parseFloat(foundAntiguedad) - parseFloat(originalAntiguedad)
                )}`
              );
            }
          }
        } else {
          console.log(
            `[FPL API] [${requestId}] Cannot use fallback - antiguedad column not found`
          );
        }
      }

      if (result.rows.length === 0) {
        console.log(
          `[FPL API] [${requestId}] No FPL data found for RFC: ${rfc} after all fallback attempts`
        );
        console.log(`[FPL API] [${requestId}] Search parameters used:`);
        console.log(`[FPL API] [${requestId}]   - RFC: ${rfc}`);
        if (originalFecpla)
          console.log(
            `[FPL API] [${requestId}]   - originalFecpla: ${originalFecpla}`
          );
        if (originalAntiguedad)
          console.log(
            `[FPL API] [${requestId}]   - originalAntiguedad: ${originalAntiguedad}`
          );
        if (fechaFPL)
          console.log(`[FPL API] [${requestId}]   - fechaFPL: ${fechaFPL}`);

        // Debug: Check what records exist for this RFC
        // First, try to find antiguedad column if not already found
        if (!antiguedadColumn) {
          try {
            const allColumnsQuery = `
              SELECT column_name, data_type
              FROM information_schema.columns 
              WHERE table_name = 'historico_fondos_gsau'
              ORDER BY ordinal_position
            `;
            const allColumnsResult = await client.query(allColumnsQuery);

            const exactNames = [
              "Antiguedad en Fondo",
              "ANTIGUEDAD EN FONDO",
              "antiguedad_en_fondo",
              "AntiguedadEnFondo",
              "antiguedad_fondo",
              "AntiguedadFondo",
              "ant_fondo",
              "Ant Fondo",
              "ANT FONDO",
            ];

            for (const exactName of exactNames) {
              const found = allColumnsResult.rows.find(
                (row) => row.column_name === exactName
              );
              if (found) {
                antiguedadColumn = found.column_name;
                break;
              }
            }

            if (!antiguedadColumn) {
              const keywordMatches = allColumnsResult.rows.filter((row) => {
                const colLower = row.column_name.toLowerCase();
                return (
                  colLower.includes("antiguedad") || colLower.includes("fondo")
                );
              });
              if (keywordMatches.length > 0) {
                antiguedadColumn = keywordMatches[0].column_name;
              }
            }
          } catch (e) {
            console.log(
              `[FPL API] [${requestId}] Could not find antiguedad column:`,
              e.message
            );
          }
        }

        console.log(
          `[FPL API] [${requestId}] Checking available records for RFC: ${rfc}...`
        );
        const debugQuery = `
          SELECT 
            numrfc,
            fecpla,
            "${antiguedadColumn || "antiguedad_en_fondo"}" as antiguedad,
            nombre
          FROM historico_fondos_gsau
          WHERE numrfc = $1
          ORDER BY fecpla DESC
          LIMIT 10
        `;
        try {
          const debugResult = await client.query(debugQuery, [rfc]);
          console.log(
            `[FPL API] [${requestId}] Available records for RFC ${rfc}: ${debugResult.rows.length}`
          );
          if (debugResult.rows.length > 0) {
            console.log(`[FPL API] [${requestId}] Sample records:`);
            debugResult.rows.slice(0, 5).forEach((row, idx) => {
              console.log(
                `[FPL API] [${requestId}]   ${idx + 1}. fecpla: ${
                  row.fecpla
                }, antigüedad: ${row.antiguedad}`
              );
            });
          }
        } catch (debugError) {
          console.log(
            `[FPL API] [${requestId}] Could not execute debug query:`,
            debugError.message
          );
        }

        console.log(
          `[FPL API] [${requestId}] ==========================================\n`
        );
        return res.json({
          success: true,
          data: null,
          rfc: rfc,
          fechaFPL: fechaFPL,
          message: `No FPL data found for RFC: ${rfc} with the provided parameters`,
        });
      }

      const fplData = result.rows[0];
      console.log(`[FPL API] [${requestId}] FPL data retrieved successfully`);
      console.log(
        `[FPL API] [${requestId}] Record keys:`,
        Object.keys(fplData)
      );
      console.log(
        `[FPL API] [${requestId}] Sample fields - RFC: ${
          fplData.numrfc || fplData.rfc || "N/A"
        }, fecpla: ${fplData.fecpla || "N/A"}`
      );
      console.log(
        `[FPL API] [${requestId}] ==========================================\n`
      );

      res.json({
        success: true,
        data: fplData,
        rfc: rfc,
        fechaFPL: fechaFPL,
        message: "FPL data retrieved successfully",
      });
    } catch (dbError) {
      console.error(`[FPL API] [${requestId}] Database error:`, dbError);
      console.error(`[FPL API] [${requestId}] Error message:`, dbError.message);
      console.error(`[FPL API] [${requestId}] Error stack:`, dbError.stack);
      throw dbError;
    } finally {
      client.end();
      console.log(`[FPL API] [${requestId}] Database connection closed`);
    }
  } catch (error) {
    console.error(`[FPL API] [${requestId}] ERROR: Failed to get FPL data`);
    console.error(`[FPL API] [${requestId}] Error message:`, error.message);
    console.error(`[FPL API] [${requestId}] Error stack:`, error.stack);
    console.log(
      `[FPL API] [${requestId}] ==========================================\n`
    );

    res.status(500).json({
      success: false,
      error: error.message,
      details: "Error retrieving FPL data",
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Local API Server running on http://localhost:${PORT}`);
  console.log(
    `📊 Database Main: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`
  );
  console.log(
    `📊 Database Historic: ${gsauDbConfig.host}:${gsauDbConfig.port}/${gsauDbConfig.database}`
  );
  console.log(
    `📊 Database Fondos: ${fondosDbConfig.host}:${fondosDbConfig.port}/${fondosDbConfig.database}`
  );
  console.log(`🔗 Endpoints:`);
  console.log(
    `   GET /api/employees - List employees with filters (from postgres)`
  );
  console.log(
    `   GET /api/employees/:id - Get employee details (from postgres)`
  );
  console.log(
    `   GET /api/payroll - List mapped payroll employees (from Historic)`
  );
  console.log(
    `   GET /api/payroll/rfc-from-curp - Get RFC from CURP (from Historic)`
  );
  console.log(
    `   GET /api/payroll/fecpla-from-rfc - Get calculated FPL dates by RFC (from Fondos)`
  );
  console.log(
    `   GET /api/payroll/:rfc - Get payroll employee details (from Historic)`
  );
  console.log(`   GET /api/fondos - Get fondos data by RFC (from Fondos)`);
  console.log(
    `   GET /api/fpl/data-from-rfc - Get FPL data by RFC and date (from Fondos)`
  );
  console.log(`   GET /health - Health check`);
});

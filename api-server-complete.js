const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.database' });

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database config for main DB (postgres)
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// Database config for Historic
const gsauDbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: 'Historic',
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

// Job categorization function based on Puesto_Index.csv
const categorizePuesto = (puesto) => {
  if (!puesto || typeof puesto !== 'string') return 'Sin Categorizar';
  
  const puestoUpper = puesto.toUpperCase().trim();
  
  // Define categorization rules based on Puesto_Index.csv patterns
  const categories = {
    'Administrativo': [
      'ADMINISTRACION', 'ADMINISTRATIVO', 'ADMVO', 'ADMINISTRADOR',
      'COORDINADOR', 'SUPERVISOR', 'SECRETARIA', 'ASISTENTE',
      'FACTURACION', 'CONTABILIDAD', 'FINANZAS', 'RECURSOS HUMANOS'
    ],
    'Ventas': [
      'VENTAS', 'ASESOR', 'VENDEDOR', 'BDC', 'COMERCIAL',
      'AUTOFINANCIAMIENTO', 'FLOTILLAS', 'POSTVENTA'
    ],
    'Técnico y Taller': [
      'TECNICO', 'MECANICO', 'HOJALATERO', 'PINTOR', 'ALINEADOR',
      'ARMADOR', 'SOLDADOR', 'LAVADOR', 'TALLER', 'ELECTRICO'
    ],
    'Gerencia': [
      'GERENTE', 'DIRECTOR', 'JEFE', 'SUBDIRECTOR', 'SUBGERENTE'
    ],
    'Refacciones y Almacén': [
      'ALMACENISTA', 'REFACCIONES', 'PARTES', 'INVENTARIO', 'ALMACEN'
    ],
    'Garantías y Seguros': [
      'GARANTIAS', 'GARANTIA', 'SEGUROS', 'SEGURO', 'SINIESTROS'
    ],
    'Servicio': [
      'SERVICIO', 'RECEPCION', 'ATENCION', 'CLIENTE'
    ],
    'Marketing y CRM': [
      'MARKETING', 'CRM', 'PUBLICIDAD', 'MERCADOTECNIA', 'EVENTOS'
    ],
    'Apoyo Operativo': [
      'APOYO', 'AUXILIAR', 'MENSAJERO', 'CHOFER', 'INTENDENCIA',
      'LIMPIEZA', 'VIGILANCIA', 'SEGURIDAD', 'MANTENIMIENTO'
    ]
  };
  
  // Check each category
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (puestoUpper.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'Sin Categorizar';
};

// NEW ENDPOINT: GET /api/payroll/periodos - Get available periods
app.get('/api/payroll/periodos', async (req, res) => {
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
      data: result.rows.map(row => ({
        value: row.value,
        count: parseInt(row.count)
      }))
    });
    
  } catch (error) {
    console.error('Error in /api/payroll/periodos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW ENDPOINT: GET /api/payroll/demographic - Get demographic data with pagination and filters
app.get('/api/payroll/demographic', async (req, res) => {
  try {
    const { q, sucursal, puesto, status, cveper, sortBy = 'nombre', sortDir = 'asc', page = 1, pageSize = 50 } = req.query;
    
    const maxPageSize = 1000;
    const validatedPageSize = Math.min(parseInt(pageSize), maxPageSize);
    const validatedPage = Math.max(1, parseInt(page));
    
    const client = await getHistoricClient();
    
    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    if (q) {
      conditions.push(`(LOWER("Nombre completo") LIKE $${paramIndex} OR LOWER("CURP") LIKE $${paramIndex + 1})`);
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
      // Handle different cveper formats
      if (cveper.match(/^\d{4}-\d{2}$/)) {
        // Format like "2025-06" - filter by month
        conditions.push(`DATE_TRUNC('month', "cveper") = DATE_TRUNC('month', $${paramIndex}::date)`);
        params.push(cveper + '-01'); // Convert to first day of month
      } else {
        // Exact match for other formats
        conditions.push(`"cveper" = $${paramIndex}`);
        params.push(cveper);
      }
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM historico_nominas_gsau ${whereClause}`;
    const countResult = await client.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Validate and sanitize sort parameters
    const validSortColumns = {
      'nombre': '"Nombre completo"',
      'curp': '"CURP"',
      'sucursal': '"Compañía"',
      'puesto': '"Puesto"',
      'cveper': '"cveper"',
      'periodo': '"cveper"',
      'fecha': '"cveper"',
      'sueldo': 'COALESCE(" SUELDO CLIENTE ", 0)',
      'salario': 'COALESCE(" SUELDO CLIENTE ", 0)',
      'comisiones': 'COALESCE(" COMISIONES CLIENTE ", 0)',
      'total': 'COALESCE(" COSTO DE NOMINA ", 0)',
      'costoNomina': 'COALESCE(" COSTO DE NOMINA ", 0)',
      'totalPercepciones': 'COALESCE(" TOTAL DE PERCEPCIONES ", 0)'
    };
    
    const sortColumn = validSortColumns[sortBy] || '"Nombre completo"';
    const sortDirection = sortDir.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    
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
        COALESCE(" COMISIONES CLIENTE ", 0) as comisiones,
        COALESCE(" TOTAL DE PERCEPCIONES ", 0) as totalPercepciones,
        COALESCE(" TOTAL DEDUCCIONES ", 0) as totalDeducciones,
        COALESCE(" COSTO DE NOMINA ", 0) as total,
        "Status" as status
      FROM historico_nominas_gsau
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      OFFSET $${paramIndex} LIMIT $${paramIndex + 1}
    `;
    
    const dataResult = await client.query(dataQuery, [...params, offset, validatedPageSize]);
    
    await client.end();
    
    res.json({
      success: true,
      data: dataResult.rows,
      page: validatedPage,
      pageSize: validatedPageSize,
      total: total
    });
    
  } catch (error) {
    console.error('Error in /api/payroll/demographic:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW ENDPOINT: GET /api/payroll/demographic/unique-count - Get unique CURP count
app.get('/api/payroll/demographic/unique-count', async (req, res) => {
  try {
    const { status, cveper } = req.query;
    
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
      // Handle different cveper formats
      if (cveper.match(/^\d{4}-\d{2}$/)) {
        // Format like "2025-06" - filter by month
        conditions.push(`DATE_TRUNC('month', "cveper") = DATE_TRUNC('month', $${paramIndex}::date)`);
        params.push(cveper + '-01'); // Convert to first day of month
      } else {
        // Exact match for other formats
        conditions.push(`"cveper" = $${paramIndex}`);
        params.push(cveper);
      }
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const result = await client.query(`
      SELECT COUNT(DISTINCT "CURP") as unique_curp_count
      FROM historico_nominas_gsau 
      ${whereClause}
      AND "CURP" IS NOT NULL 
      AND "CURP" != ''
    `, params);
    
    await client.end();
    
    res.json({
      success: true,
      uniqueCurpCount: parseInt(result.rows[0].unique_curp_count)
    });
    
  } catch (error) {
    console.error('Error in /api/payroll/demographic/unique-count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW ENDPOINT: GET /api/payroll/historico-nominas - Get historical fondos data by RFC
app.get('/api/payroll/historico-nominas', async (req, res) => {
  try {
    const { rfc, pageSize = 1000 } = req.query;
    
    if (!rfc) {
      return res.status(400).json({ 
        success: false, 
        error: 'RFC parameter is required' 
      });
    }
    
    const maxPageSize = 1000;
    const validatedPageSize = Math.min(parseInt(pageSize), maxPageSize);
    
    const client = await getHistoricClient();
    
    // Query para obtener datos históricos de fondos por RFC con columnas básicas
    const dataQuery = `
      SELECT 
        "RFC",
        "Nombre completo" as nombre,
        "cveper",
        COALESCE(" SUELDO CLIENTE ", 0) as saldo_final,
        COALESCE(" TOTAL DE PERCEPCIONES ", 0) as saldo_final_2
      FROM historico_nominas_gsau 
      WHERE "RFC" = $1
      AND (" SUELDO CLIENTE " IS NOT NULL OR " TOTAL DE PERCEPCIONES " IS NOT NULL)
      ORDER BY "cveper" DESC
      LIMIT $2
    `;
    
    console.log(`📊 [FondosAPI] Consultando RFC: ${rfc}, PageSize: ${validatedPageSize}`);
    
    const dataResult = await client.query(dataQuery, [rfc, validatedPageSize]);
    
    await client.end();
    
    console.log(`📊 [FondosAPI] Registros encontrados: ${dataResult.rows.length}`);
    
    if (dataResult.rows.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No se encontraron registros para el RFC especificado'
      });
    }
    
    res.json({
      success: true,
      data: dataResult.rows
    });
    
  } catch (error) {
    console.error('Error in /api/payroll/historico-nominas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      path: req.path,
      method: req.method
    });
  }
});

// NEW ENDPOINT: GET /api/payroll/data - Get data for charts
app.get('/api/payroll/data', async (req, res) => {
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
      // Handle different cveper formats
      if (cveper.match(/^\d{4}-\d{2}$/)) {
        // Format like "2025-06" - filter by month
        conditions.push(`DATE_TRUNC('month', "cveper") = DATE_TRUNC('month', $${paramIndex}::date)`);
        params.push(cveper + '-01'); // Convert to first day of month
      } else {
        // Exact match for other formats
        conditions.push(`"cveper" = $${paramIndex}`);
        params.push(cveper);
      }
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
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
    
    const dataResult = await client.query(dataQuery, [...params, offset, validatedPageSize]);
    
    await client.end();
    
    res.json({
      success: true,
      data: dataResult.rows
    });
    
  } catch (error) {
    console.error('Error in /api/payroll/data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// EXISTING ENDPOINTS BELOW

// GET /api/employees - List employees with filters, sorting, and pagination
app.get('/api/employees', async (req, res) => {
  try {
    const { q, department, role, status, location, sortBy = 'first_name', sortDir = 'asc', page = 1, pageSize = 20 } = req.query;
    
    const client = await getClient();
    
    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    if (q) {
      conditions.push(`(LOWER(first_name) LIKE $${paramIndex} OR LOWER(last_name) LIKE $${paramIndex + 1} OR LOWER(email) LIKE $${paramIndex + 2})`);
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
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Validate and sanitize sort parameters
    const validSortColumns = {
      'fullName': 'first_name || \' \' || last_name',
      'firstName': 'first_name',
      'lastName': 'last_name',
      'first_name': 'first_name',
      'last_name': 'last_name',
      'department': 'department',
      'role': 'role',
      'status': 'status',
      'location': 'location',
      'hire_date': 'hire_date'
    };
    
    const sortColumn = validSortColumns[sortBy] || 'first_name';
    const sortDirection = sortDir.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    
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
    
    const dataResult = await client.query(dataQuery, [...params, offset, parseInt(pageSize)]);
    
    await client.end();
    
    res.json({
      data: dataResult.rows.map(row => ({
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
        avatarUrl: row.avatar_url
      })),
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total: total
    });
    
  } catch (error) {
    console.error('Error in /api/employees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/payroll - List mapped employees from historico_nominas_gsau
app.get('/api/payroll', async (req, res) => {
  try {
    const { q, sucursal, puesto, status, puestoCategorizado, sortBy = 'nombre', sortDir = 'asc', page = 1, pageSize = 50 } = req.query;
    
    const maxPageSize = 1000;
    const validatedPageSize = Math.min(parseInt(pageSize), maxPageSize);
    const validatedPage = Math.max(1, parseInt(page));
    
    const client = await getHistoricClient();
    
    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    if (q) {
      conditions.push(`(LOWER("Nombre completo") LIKE $${paramIndex} OR LOWER("CURP") LIKE $${paramIndex + 1})`);
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
    
    // For job category filtering, we'll need to filter after getting the data
    // since we need to apply our categorization function to each record
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Validate and sanitize sort parameters
    const validSortColumns = {
      'nombre': '"Nombre completo"',
      'curp': '"CURP"',
      'sucursal': '"Compañía"',
      'puesto': '"Puesto"',
      'fecha': '"cveper"',
      'sueldo': '" SUELDO CLIENTE "',
      'status': '"Status"'
    };
    
    const sortColumn = validSortColumns[sortBy] || '"Nombre completo"';
    const sortDirection = sortDir.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    
    let finalData;
    let finalTotal;
    
    if (puestoCategorizado) {
      // For job category filtering, get all matching records first, then filter and paginate
      const allDataQuery = `
        SELECT 
          "RFC" as rfc,
          "Nombre completo" as nombre,
          "CURP" as curp,
          "Compañía" as sucursal,
          "Puesto" as puesto,
          "cveper" as fecha,
          COALESCE(" SUELDO CLIENTE ", 0) as sueldo,
          COALESCE(" COMISIONES CLIENTE ", 0) as comisiones,
          "Status" as status,
          "Mes" as mes,
          "Periodo" as periodo,
          " TOTAL DE PERCEPCIONES " as totalPercepciones,
          " TOTAL DEDUCCIONES " as totalDeducciones
        FROM historico_nominas_gsau 
        ${whereClause}
        ORDER BY ${sortColumn} ${sortDirection}
      `;
      
      const allDataResult = await client.query(allDataQuery, params);
      
      // Filter by job category
      const filteredRows = allDataResult.rows.filter(row => {
        const category = categorizePuesto(row.puesto);
        return category === puestoCategorizado;
      });
      
      // Apply pagination to filtered results
      finalTotal = filteredRows.length;
      const offset = (validatedPage - 1) * validatedPageSize;
      finalData = filteredRows.slice(offset, offset + validatedPageSize);
      
      console.log(`📊 Query info: Total before category filter: ${allDataResult.rows.length}, after filter: ${finalTotal}, page: ${validatedPage}`);
      
    } else {
      // No job category filter - use normal pagination
      const countQuery = `SELECT COUNT(*) FROM historico_nominas_gsau ${whereClause}`;
      const countResult = await client.query(countQuery, params);
      finalTotal = parseInt(countResult.rows[0].count);
      
      console.log(`📊 Query info: Total count: ${finalTotal}`);
      
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
          COALESCE(" SUELDO CLIENTE ", 0) as sueldo,
          COALESCE(" COMISIONES CLIENTE ", 0) as comisiones,
          "Status" as status,
          "Mes" as mes,
          "Periodo" as periodo,
          " TOTAL DE PERCEPCIONES " as totalPercepciones,
          " TOTAL DEDUCCIONES " as totalDeducciones
        FROM historico_nominas_gsau 
        ${whereClause}
        ORDER BY ${sortColumn} ${sortDirection}
        OFFSET $${paramIndex} LIMIT $${paramIndex + 1}
      `;
      
      const dataResult = await client.query(dataQuery, [...params, offset, validatedPageSize]);
      finalData = dataResult.rows;
    }
    
    await client.end();
    
    res.json({
      success: true,
      data: finalData.map(row => ({
        rfc: row.rfc,
        nombre: row.nombre,
        curp: row.curp,
        sucursal: row.sucursal,
        puesto: row.puesto,
        fecha: row.fecha,
        sueldo: parseFloat(row.sueldo || 0),
        comisiones: parseFloat(row.comisiones || 0),
        totalPercepciones: parseFloat(row.totalpercepciones || row.sueldo || 0),
        status: row.status,
        mes: row.mes || 'Enero 2024'
      })),
      pagination: {
        page: validatedPage,
        pageSize: validatedPageSize,
        total: finalTotal,
        totalPages: Math.ceil(finalTotal / validatedPageSize)
      }
    });
    
  } catch (error) {
    console.error('Error in /api/payroll:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/payroll/stats - Get statistics for payroll data
app.get('/api/payroll/stats', async (req, res) => {
  try {
    const client = await getHistoricClient();
    
    // Get statistics in old format (data property)
    // 1. Total records
    const totalResult = await client.query(`SELECT COUNT(*) as total FROM historico_nominas_gsau`);
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
      const fondosResult = await client.query(`SELECT COUNT(*) as total FROM historico_fondos_gsau`);
      totalFondosRecords = parseInt(fondosResult.rows[0].total);
    } catch (error) {
      console.warn('⚠️ Tabla historico_fondos_gsau no encontrada:', error.message);
      totalFondosRecords = 0;
    }
    
    await client.end();
    
    // Calculate average records per employee
    const averageRecordsPerEmployee = uniqueEmployees > 0 
      ? Math.round(totalRecords / uniqueEmployees) 
      : 0;
    
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
        averageRecordsPerEmployee
      }
    });
    
  } catch (error) {
    console.error('Error in /api/payroll/stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/payroll/filters - Get filter options and counts for the payroll data
app.get('/api/payroll/filters', async (req, res) => {
  try {
    const client = await getHistoricClient();
    
    const { search, sucursal, puesto, status, cveper, puestoCategorizado } = req.query;
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    if (search) {
      conditions.push(`(LOWER("Nombre completo") LIKE $${paramIndex} OR LOWER("CURP") LIKE $${paramIndex + 1})`);
      const searchTerm = `%${search.toLowerCase()}%`;
      params.push(searchTerm, searchTerm);
      paramIndex += 2;
    }
    
    if (sucursal) {
      if (Array.isArray(sucursal)) {
        const placeholders = sucursal.map(() => `$${paramIndex++}`).join(', ');
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
        const placeholders = puesto.map(() => `$${paramIndex++}`).join(', ');
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
        const placeholders = status.map(() => `$${paramIndex++}`).join(', ');
        conditions.push(`"Status" IN (${placeholders})`);
        params.push(...status);
      } else {
        conditions.push(`"Status" = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }
    }
    
    if (cveper) {
      // Handle different date formats for cveper
      if (cveper.includes('-') && cveper.length <= 7) {
        // Format like "2024-10" or "2025-06" - search for LIKE pattern
        conditions.push(`"cveper" LIKE $${paramIndex}`);
        params.push(`${cveper}%`);
      } else {
        // Exact match for other formats
        conditions.push(`"cveper" = $${paramIndex}`);
        params.push(cveper);
      }
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const [puestosResult, sucursalesResult, estadosResult, periodosResult] = await Promise.all([
      // Puestos
      client.query(`
        SELECT "Puesto" as value, COUNT(*) as count
        FROM historico_nominas_gsau
        ${whereClause}
        GROUP BY "Puesto"
        ORDER BY "Puesto"
      `, params),
      
      // Sucursales
      client.query(`
        SELECT "Compañía" as value, COUNT(*) as count
        FROM historico_nominas_gsau
        ${whereClause}
        GROUP BY "Compañía"
        ORDER BY "Compañía"
      `, params),
      
      // Estados
      client.query(`
        SELECT "Status" as value, COUNT(*) as count
        FROM historico_nominas_gsau
        ${whereClause}
        GROUP BY "Status"
        ORDER BY "Status"
      `, params),
      
      // Periodos
      client.query(`
        SELECT "cveper" as value, COUNT(*) as count
        FROM historico_nominas_gsau
        ${whereClause}
        GROUP BY "cveper"
        ORDER BY "cveper" DESC
      `, params)
    ]);
    
    // Generate job categories using our categorization function
    const jobCategories = new Map();
    puestosResult.rows.forEach(row => {
      const category = categorizePuesto(row.value);
      if (jobCategories.has(category)) {
        jobCategories.set(category, jobCategories.get(category) + parseInt(row.count));
      } else {
        jobCategories.set(category, parseInt(row.count));
      }
    });
    
    const puestosCategorias = Array.from(jobCategories.entries()).map(([category, count]) => ({
      value: category,
      label: category,
      count: count
    })).sort((a, b) => a.label.localeCompare(b.label));
    
    await client.end();
    
    res.json({
      success: true,
      data: {
        puestos: puestosResult.rows.map(row => ({
          value: row.value,
          label: row.value,
          count: parseInt(row.count)
        })),
        sucursales: sucursalesResult.rows.map(row => ({
          value: row.value,
          label: row.value,
          count: parseInt(row.count)
        })),
        estados: estadosResult.rows.map(row => ({
          value: row.value,
          label: row.value,
          count: parseInt(row.count)
        })),
        periodos: periodosResult.rows.map(row => ({
          value: row.value,
          label: row.value,
          count: parseInt(row.count)
        })),
        puestosCategorias: puestosCategorias
      }
    });
    
  } catch (error) {
    console.error('Error in /api/payroll/filters:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Complete API server running with all endpoints' });
});

app.listen(PORT, () => {
  console.log(`🚀 Complete API Server running on http://localhost:${PORT}`);
  console.log(`📊 Database Main: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log(`📊 Database Historic: ${gsauDbConfig.host}:${gsauDbConfig.port}/${gsauDbConfig.database}`);
  console.log(`🔗 NEW Endpoints Added:`);
  console.log(`   GET /api/payroll/periodos - Get available periods`);
  console.log(`   GET /api/payroll/demographic - Get demographic data`);
  console.log(`   GET /api/payroll/demographic/unique-count - Get unique CURP count`);
  console.log(`   GET /api/payroll/historico-nominas - Get historical fondos data`);
  console.log(`   GET /api/payroll/data - Get data for charts`);
  console.log(`🔗 Existing Endpoints:`);
  console.log(`   GET /api/employees - List employees`);
  console.log(`   GET /api/payroll - List payroll data`);
  console.log(`   GET /health - Health check`);
});

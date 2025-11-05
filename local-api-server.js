const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.database' });
const authService = require('./api-server/services/authService');

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

// GET /api/user/profile - Get current user profile from Numerica_Users
app.get('/api/user/profile', async (req, res) => {
  try {
    const userEmail = req.headers['x-user-email']; // Email del usuario logueado
    
    if (!userEmail) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const client = await getHistoricClient();
    
    const result = await client.query(`
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
    `, [userEmail]);
    
    await client.end();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
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
        lastLogin: user.last_login
      }
    });
    
  } catch (error) {
    console.error('Error in /api/user/profile:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/user/profile - Update current user profile
app.put('/api/user/profile', async (req, res) => {
  try {
    const userEmail = req.headers['x-user-email'];
    const { firstName, lastName, phoneNumber } = req.body;
    
    if (!userEmail) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    // Validaciones básicas
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'Nombre y apellido son requeridos' });
    }
    
    if (phoneNumber && !/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
      return res.status(400).json({ error: 'Formato de teléfono inválido' });
    }
    
    const client = await getHistoricClient();
    
    const result = await client.query(`
      UPDATE numerica_users 
      SET 
        first_name = $1,
        last_name = $2,
        phone_number = $3,
        profile_completed = TRUE,
        updated_at = NOW()
      WHERE email = $4
      RETURNING id, email, first_name, last_name, phone_number, phone_verified
    `, [firstName, lastName, phoneNumber, userEmail]);
    
    await client.end();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const updatedUser = result.rows[0];
    
    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        phoneNumber: updatedUser.phone_number,
        phoneVerified: updatedUser.phone_verified
      }
    });
    
  } catch (error) {
    console.error('Error in PUT /api/user/profile:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/payroll - List mapped employees from historico_nominas_gsau with new structure
app.get('/api/payroll', async (req, res) => {
  try {
    const { q, sucursal, puesto, status, cveper, sortBy = 'nombre', sortDir = 'asc', page = 1, pageSize = 50 } = req.query;
    
    // Validación para manejar grandes volúmenes (hasta 250,000 registros)
    const maxPageSize = 1000; // Máximo registros por página
    const validatedPageSize = Math.min(parseInt(pageSize), maxPageSize);
    const validatedPage = Math.max(1, parseInt(page));
    
    const client = await getHistoricClient();
    
    // Build WHERE clause
    const conditions = []; // Remover filtro que limitaba resultados
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
      // Detectar si es formato YYYY-MM (mes completo) o fecha exacta
      const isMonthFormat = /^\d{4}-\d{2}$/.test(cveper);
      if (isMonthFormat) {
        // Filtrar por mes completo usando DATE_TRUNC
        conditions.push(`DATE_TRUNC('month', "cveper") = $${paramIndex}`);
        params.push(`${cveper}-01`); // Convertir 2025-06 a 2025-06-01
      } else {
        // Filtrar por fecha exacta
        conditions.push(`"cveper" = $${paramIndex}`);
        params.push(cveper);
      }
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Validate and sanitize sort parameters
    const validSortColumns = {
      'nombre': '"Nombre completo"',
      'curp': '"CURP"',
      'sucursal': '"Compañía"',
      'puesto': '"Puesto"',
      'fecha': '"cveper"',
      'sueldo': '" SUELDO CLIENTE "',
      'salario': '" SUELDO CLIENTE "', // Alias para compatibilidad con frontend
      'comisiones': '(COALESCE(" COMISIONES CLIENTE ", 0) + COALESCE(" SUELDO CLIENTE " * 0.1, 0))',
      'totalPercepciones': '" TOTAL DE PERCEPCIONES "',
      'status': '"Status"',
      'estado': '"Status"' // Alias para compatibilidad con frontend
    };
    
    const sortColumn = validSortColumns[sortBy] || '"Nombre completo"';
    const sortDirection = sortDir.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM historico_nominas_gsau ${whereClause}`;
    const countResult = await client.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Log para diagnosticar
    console.log(`📊 Query info: Total count query: ${countQuery}`);
    console.log(`📊 Total found: ${total}`);
    
    // Get paginated results with mapping
    const offset = (validatedPage - 1) * validatedPageSize;
    const dataQuery = `
      SELECT 
        "RFC" as rfc,
        "Nombre completo" as nombre,
        "Nombre completo" as name,
        "CURP" as curp,
        "Compañía" as sucursal,
        "Compañía" as department,
        "Puesto" as puesto,
        "Puesto" as position,
        DATE(cveper)::text as periodo,
        "cveper" as fecha,
        "Mes" as mes,
        COALESCE(" SUELDO CLIENTE ", 0) as sueldo,
        COALESCE(" SUELDO CLIENTE ", 0) as salary,
        COALESCE(" COMISIONES CLIENTE ", 0) + COALESCE(" SUELDO CLIENTE " * 0.1, 0) as comisiones,
        COALESCE(" COMISIONES CLIENTE ", 0) + COALESCE(" SUELDO CLIENTE " * 0.1, 0) as commissions,
        "Status" as status,
        CASE 
          WHEN "Status" = 'A' THEN 'Activo'
          WHEN "Status" = 'B' THEN 'Baja'
          WHEN "Status" = 'F' THEN 'Finiquito'
          ELSE 'N/A'
        END as estado,
        " TOTAL DE PERCEPCIONES " as "totalPercepciones",
        " TOTAL DE PERCEPCIONES " as "totalCost",
        " TOTAL DEDUCCIONES " as "totalDeducciones"
      FROM historico_nominas_gsau 
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      OFFSET $${paramIndex} LIMIT $${paramIndex + 1}
    `;
    
    const dataResult = await client.query(dataQuery, [...params, offset, validatedPageSize]);
    
    await client.end();
    
    res.json({
      success: true,
      data: dataResult.rows.map(row => ({
        rfc: row.rfc,
        nombre: row.nombre,
        name: row.name,
        curp: row.curp,
        sucursal: row.sucursal,
        department: row.department,
        puesto: row.puesto,
        position: row.position,
        periodo: row.periodo, // Fecha de cveper en formato YYYY-MM-DD
        fecha: row.fecha,
        mes: row.mes || 'Enero 2024',
        sueldo: parseFloat(row.sueldo || 0),
        salary: parseFloat(row.salary || 0),
        comisiones: parseFloat(row.comisiones || 0),
        commissions: parseFloat(row.commissions || 0),
        totalPercepciones: parseFloat(row.totalpercepciones || row.sueldo || 0),
        totalCost: parseFloat(row.totalcost || row.sueldo || 0),
        status: row.status,
        // Additional fields for compatibility
        estado: row.estado,
        perfilUrl: null
      })),
      pagination: {
        page: validatedPage,
        pageSize: validatedPageSize,
        total: total,
        totalPages: Math.ceil(total / validatedPageSize)
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
    
    // Get basic statistics
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_employees,
        COUNT(DISTINCT "Compañía") as total_companies,
        COUNT(DISTINCT "Puesto") as total_positions,
        AVG(COALESCE(" SUELDO CLIENTE ", 0)) as avg_salary,
        MIN("cveper") as earliest_period,
        MAX("cveper") as latest_period
      FROM historico_nominas_gsau
    `);
    
    await client.end();
    
    const stats = result.rows[0];
    
    res.json({
      success: true,
      stats: {
        totalEmployees: parseInt(stats.total_employees),
        totalCompanies: parseInt(stats.total_companies),
        totalPositions: parseInt(stats.total_positions),
        avgSalary: parseFloat(stats.avg_salary || 0),
        earliestPeriod: stats.earliest_period,
        latestPeriod: stats.latest_period
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
    
    // Build filter parameters for dynamic counting
    const { search, sucursal, puesto, status, cveper, puestoCategorizado } = req.query;
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    // Apply filters if provided (for dynamic counts)
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
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get distinct values and counts for each filter
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
        puestosCategorias: [] // Empty for now, can be implemented later if needed
      }
    });
    
  } catch (error) {
    console.error('Error in /api/payroll/filters:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/payroll/filter-options - Alias for /api/payroll/filters (compatibility)
app.get('/api/payroll/filter-options', async (req, res) => {
  try {
    const client = await getHistoricClient();
    
    // Build filter parameters for dynamic counting
    const { search, sucursal, puesto, status, cveper, puestoCategorizado } = req.query;
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    // Apply filters if provided (for dynamic counts)
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
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get distinct values and counts for each filter
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
        puestosCategorias: [] // Empty for now, can be implemented later if needed
      }
    });
    
  } catch (error) {
    console.error('Error in /api/payroll/filter-options:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// GET /api/payroll/periodos - Get available periods
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

// GET /api/payroll/demographic - Get demographic data with pagination and filters
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
      // Handle cveper as date range if it's in YYYY-MM format
      if (/^\d{4}-\d{2}$/.test(cveper)) {
        // Convert 2025-06 to a date range for the entire month
        const startDate = `${cveper}-01`;
        const endDate = `${cveper}-31`; // Using 31 to cover all possible days in month
        conditions.push(`"cveper" >= $${paramIndex} AND "cveper" < ($${paramIndex + 1}::date + INTERVAL '1 month')`);
        params.push(startDate, startDate);
        paramIndex += 2;
      } else {
        // Handle as exact date if it's in a different format
        conditions.push(`"cveper" = $${paramIndex}`);
        params.push(cveper);
        paramIndex++;
      }
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
      'sueldo': '" SUELDO CLIENTE "'
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
        COALESCE(" TOTAL DE PERCEPCIONES ", 0) as totalPercepciones,
        COALESCE(" TOTAL DEDUCCIONES ", 0) as totalDeducciones,
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

// GET /api/payroll/demographic/unique-count - Get unique CURP count
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
      // Handle cveper as date range if it's in YYYY-MM format
      if (/^\d{4}-\d{2}$/.test(cveper)) {
        // Convert 2025-06 to a date range for the entire month
        const startDate = `${cveper}-01`;
        const endDate = `${cveper}-31`; // Using 31 to cover all possible days in month
        conditions.push(`"cveper" >= $${paramIndex} AND "cveper" < ($${paramIndex + 1}::date + INTERVAL '1 month')`);
        params.push(startDate, startDate);
        paramIndex += 2;
      } else {
        // Handle as exact date if it's in a different format
        conditions.push(`"cveper" = $${paramIndex}`);
        params.push(cveper);
        paramIndex++;
      }
    }
    
    // Build complete WHERE clause including CURP conditions
    const curpConditions = ['"CURP" IS NOT NULL', '"CURP" != \'\'']; 
    const allConditions = [...conditions, ...curpConditions];
    const whereClause = `WHERE ${allConditions.join(' AND ')}`;
    
    const result = await client.query(`
      SELECT COUNT(DISTINCT "CURP") as unique_curp_count
      FROM historico_nominas_gsau 
      ${whereClause}
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

// GET /api/percepciones - Get employee payroll data (percepciones) by CURP
app.get('/api/percepciones', async (req, res) => {
  try {
    const { curp, cveper, pageSize = 1000, page = 1 } = req.query;
    
    if (!curp) {
      return res.status(400).json({ 
        success: false, 
        error: 'CURP parameter is required' 
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
    
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    // Get total count for this CURP
    const countQuery = `SELECT COUNT(*) FROM historico_nominas_gsau ${whereClause}`;
    const countResult = await client.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    console.log(`🔍 API /percepciones - CURP: ${curp}, cveper: ${cveper || 'ALL'}, total: ${total}`);
    
    // Get paginated results with all payroll fields
    const offset = (validatedPage - 1) * validatedPageSize;
    const dataQuery = `
      SELECT *
      FROM historico_nominas_gsau 
      ${whereClause}
      ORDER BY "Mes" DESC, "cveper" DESC
      OFFSET $${paramIndex} LIMIT $${paramIndex + 1}
    `;
    
    const dataResult = await client.query(dataQuery, [...params, offset, validatedPageSize]);
    
    await client.end();
    
    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: validatedPage,
        pageSize: validatedPageSize,
        total: total,
        totalPages: Math.ceil(total / validatedPageSize)
      }
    });
    
  } catch (error) {
    console.error('Error in /api/percepciones:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// GET /api/payroll/data - Get payroll data for charts and analysis
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
      conditions.push(`"cveper" = $${paramIndex}`);
      params.push(cveper);
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

// ============================================================================
// RUTAS DE AUTENTICACIÓN (SIN PROTECCIÓN)
// ============================================================================

// Validar email contra numerica_users
app.post('/api/auth/validate-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email es requerido'
      });
    }

    console.log('🔍 Validando email:', email);
    const result = await authService.validateEmail(email);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Error validando email:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Confirmar registro en backend
app.post('/api/auth/confirm-registration', async (req, res) => {
  try {
    const { email, firstName, lastName, phoneNumber } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email es requerido'
      });
    }

    console.log('✅ Confirmando registro para:', email);
    const result = await authService.confirmRegistration(
      email,
      firstName || '',
      lastName || '',
      phoneNumber || ''
    );

    res.json(result);
  } catch (error) {
    console.error('❌ Error confirmando registro:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Verificar usuario con código manual
app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { username, code } = req.body;

    if (!username || !code) {
      return res.status(400).json({
        success: false,
        error: 'Username y código son requeridos'
      });
    }

    console.log('🔐 Verificando código para usuario:', username);
    const result = await authService.confirmUserWithCode(username, code);

    // Si la verificación fue exitosa, activar usuario en BD
    if (result.success) {
      await authService.activateUser(username);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error verificando código:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Activar usuario (después de verificación exitosa)
app.post('/api/auth/activate-user', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email es requerido'
      });
    }

    console.log('✅ Activando usuario:', email);
    const result = await authService.activateUser(email);

    res.json(result);
  } catch (error) {
    console.error('❌ Error activando usuario:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Local API server running' });
});

// Catch-all routes - These MUST come after all specific routes to avoid conflicts

// GET /api/payroll/:rfc - Get specific employee from payroll
app.get('/api/payroll/:rfc', async (req, res) => {
  try {
    const { rfc } = req.params;
    const client = await getHistoricClient();
    
    const result = await client.query(`
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
    `, [rfc]);
    
    await client.end();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
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
      totalPercepciones: parseFloat(row.sueldo || 0) + parseFloat(row.comisiones || 0),
      status: row.status,
      mes: 'Enero 2024',
      estado: row.status,
      perfilUrl: null
    });
    
  } catch (error) {
    console.error('Error in /api/payroll/:rfc:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/employees/:id - Get specific employee
app.get('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await getClient();
    
    const result = await client.query(`
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
    `, [id]);
    
    await client.end();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
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
      avatarUrl: row.avatar_url
    });
    
  } catch (error) {
    console.error('Error in /api/employees/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Local API Server running on http://localhost:${PORT}`);
  console.log(`📊 Database Main: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log(`📊 Database Historic: ${gsauDbConfig.host}:${gsauDbConfig.port}/${gsauDbConfig.database}`);
  console.log(`🔗 Endpoints:`);
  console.log(`   GET /api/employees - List employees with filters (from postgres)`);
  console.log(`   GET /api/employees/:id - Get employee details (from postgres)`);
  console.log(`   GET /api/payroll - List mapped payroll employees (from Historic)`);
  console.log(`   GET /api/payroll/:rfc - Get payroll employee details (from Historic)`);
  console.log(`   GET /health - Health check`);
});

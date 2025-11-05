const express = require('express');
const cors = require('cors');
const { nominasPool } = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const client = await nominasPool.connect();
    const result = await client.query('SELECT NOW() as timestamp, current_database() as database');
    client.release();
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint simplificado para obtener datos de nómina
app.get('/api/payroll', async (req, res) => {
  try {
    console.log('📊 Fetching payroll data...');
    const { pageSize = 100, page = 1, search, puesto, compania, status } = req.query;
    
    const client = await nominasPool.connect();
    
    const limit = Math.min(parseInt(pageSize), 1000);
    const offset = (parseInt(page) - 1) * limit;
    
    // Query base usando la tabla real
    let query = `
      SELECT 
        "RFC" as rfc,
        "Nombre completo" as nombre,
        "Puesto" as puesto,
        "Compañía" as sucursal,
        "Mes" as mes,
        COALESCE(" SUELDO CLIENTE ", 0) as sueldo,
        COALESCE(" COMISIONES CLIENTE ", 0) as comisiones,
        COALESCE(" TOTAL DE PERCEPCIONES ", 0) as "totalPercepciones",
        CASE 
          WHEN "Status" = 'A' THEN 'Activo'
          WHEN "Status" = 'B' THEN 'Baja'
          ELSE 'N/A'
        END as estado
      FROM historico_nominas_gsau
      WHERE 1=1
    `;
    
    let countQuery = `SELECT COUNT(*) as total FROM historico_nominas_gsau WHERE 1=1`;
    let queryParams = [];
    let paramIndex = 1;
    
    // Aplicar filtros
    if (search) {
      const searchPattern = `%${search}%`;
      query += ` AND ("Nombre completo" ILIKE $${paramIndex} OR "RFC" ILIKE $${paramIndex})`;
      countQuery += ` AND ("Nombre completo" ILIKE $${paramIndex} OR "RFC" ILIKE $${paramIndex})`;
      queryParams.push(searchPattern);
      paramIndex++;
    }
    
    if (puesto) {
      query += ` AND "Puesto" ILIKE $${paramIndex}`;
      countQuery += ` AND "Puesto" ILIKE $${paramIndex}`;
      queryParams.push(`%${puesto}%`);
      paramIndex++;
    }
    
    if (compania) {
      query += ` AND "Compañía" ILIKE $${paramIndex}`;
      countQuery += ` AND "Compañía" ILIKE $${paramIndex}`;
      queryParams.push(`%${compania}%`);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND "Status" = $${paramIndex}`;
      countQuery += ` AND "Status" = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    // Ordenamiento
    query += ` ORDER BY "Nombre completo" ASC`;
    
    // Paginación
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const finalParams = [...queryParams, limit, offset];
    
    console.log('🔍 Executing query:', query);
    console.log('📝 Parameters:', finalParams);
    
    // Ejecutar consultas
    const [dataResult, countResult] = await Promise.all([
      client.query(query, finalParams),
      client.query(countQuery, queryParams)
    ]);
    
    client.release();
    
    const total = parseInt(countResult.rows[0].total);
    const result = {
      success: true,
      data: dataResult.rows,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      }
    };
    
    console.log(`✅ Query successful: ${dataResult.rows.length} rows returned, ${total} total`);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error in /api/payroll:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Payroll data: http://localhost:${PORT}/api/payroll`);
});

module.exports = app;

const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { authenticate: verifyToken, requirePermission } = require('./middleware/auth');
const { testConnections } = require('./config/database');
const nominasService = require('./services/nominasService');
const fondosService = require('./services/fondosService');
const uploadService = require('./services/uploadService');
const payrollFilterService = require('./services/payrollFilterService');
// const googleDriveService = require('./services/googleDriveService'); // Comentado temporalmente hasta arreglar googleapis
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel and CSV files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx) o CSV (.csv)'));
    }
  }
});

const app = express();

// Middleware global
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuración CORS más amplia para producción
const corsOptions = {
  origin: '*', // En Lambda, permitimos todo por simplicidad
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-email', 'x-api-key'],
  credentials: false // En Lambda no necesitamos credentials
};
app.use(cors(corsOptions));

// Middleware de logging adaptado para Lambda
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  next();
});

// ============================================================================
// RUTAS PÚBLICAS
// ============================================================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Numerica API',
    status: 'running',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString()
  });
});

// Endpoint de compatibilidad para búsqueda de empleados
app.get('/busqueda-empleados', async (req, res) => {
  try {
    const { pageSize, page, search, puesto, compania, sucursal, status, puestoCategorizado, cveper, orderBy, orderDirection } = req.query;
    
    console.log('🔍 /busqueda-empleados: Parámetros recibidos:', req.query);
    
    const result = await payrollFilterService.getPayrollDataWithFiltersAndSorting({
      pageSize: parseInt(pageSize) || 100,
      page: parseInt(page) || 1,
      search,
      puesto,
      compania,
      sucursal,
      status,
      puestoCategorizado,
      cveper,
      orderBy,
      orderDirection
    });
    
    console.log('✅ /busqueda-empleados: Datos obtenidos exitosamente:', {
      records: result.data?.length || 0,
      total: result.pagination?.total || 0
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error en búsqueda de empleados:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const connections = await testConnections();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      connections: connections,
      environment: process.env.NODE_ENV || 'production',
      region: process.env.AWS_REGION || 'us-east-1'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Info de la API
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Historic Data API - Lambda',
    version: '1.0.0',
    description: 'API serverless para consultar datos históricos de nóminas y fondos',
    runtime: 'AWS Lambda',
    endpoints: {
      public: ['/health', '/api/info', '/'],
      protected: {
        nominas: ['/api/nominas/*'],
        fondos: ['/api/fondos/*'],
        payroll: ['/api/payroll/*']
      }
    }
  });
});

// API Stats endpoint (requerido por el frontend)
app.get('/api/payroll/stats', async (req, res) => {
  try {
    // Obtener estadísticas básicas
    const stats = await payrollFilterService.getPayrollStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error obteniendo stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API Periodos endpoint
app.get('/api/payroll/periodos', async (req, res) => {
  try {
    const periods = await payrollFilterService.getAvailablePeriods();
    res.json({
      success: true,
      data: periods
    });
  } catch (error) {
    console.error('❌ Error obteniendo períodos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// RUTAS PROTEGIDAS
// ============================================================================

// Rutas de nóminas
app.get('/api/nominas/tables', verifyToken, async (req, res) => {
  try {
    const result = await nominasService.getTables();
    res.json(result);
  } catch (error) {
    console.error('❌ Error en /api/nominas/tables:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Más rutas protegidas...
app.get('/api/payroll', verifyToken, async (req, res) => {
  try {
    const result = await payrollFilterService.getPayrollDataWithFiltersAndSorting(req.query);
    res.json(result);
  } catch (error) {
    console.error('❌ Error en /api/payroll:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Catch all para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handler global
app.use((error, req, res, next) => {
  console.error('🚨 Error global:', error);
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error'
  });
});

// Exportar el handler para Lambda
module.exports.handler = serverless(app);

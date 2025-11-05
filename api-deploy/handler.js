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
const authService = require('./services/authService');
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
    // Mapear a formato esperado por el frontend: {value, count}
    const formattedPeriods = periods.map(p => ({
      value: p.periodString, // YYYY-MM format
      count: p.recordCount,
      employeeCount: p.employeeCount,
      periodStart: p.periodStart instanceof Date ? p.periodStart.toISOString() : p.periodStart,
      periodEnd: p.periodEnd instanceof Date ? p.periodEnd.toISOString() : p.periodEnd
    }));
    
    console.log('✅ Períodos formateados:', formattedPeriods.slice(0, 3));
    
    res.json({
      success: true,
      data: formattedPeriods
    });
  } catch (error) {
    console.error('❌ Error obteniendo períodos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API Filter Options endpoint (requerido por el frontend)
app.get('/api/payroll/filter-options', async (req, res) => {
  try {
    const filterOptions = await payrollFilterService.getFiltersWithCardinality(req.query);
    res.json(filterOptions);
  } catch (error) {
    console.error('❌ Error obteniendo filter options:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API Filters endpoint (alias para compatibilidad)
app.get('/api/payroll/filters', async (req, res) => {
  try {
    const filterOptions = await payrollFilterService.getFiltersWithCardinality(req.query);
    res.json(filterOptions);
  } catch (error) {
    console.error('❌ Error obteniendo filters:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API Categorías de puestos endpoint
app.get('/api/payroll/categorias-puestos', async (req, res) => {
  try {
    const categorias = await payrollFilterService.getCategoriasPuestos();
    res.json({
      success: true,
      data: categorias
    });
  } catch (error) {
    console.error('❌ Error obteniendo categorías de puestos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
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

// Rutas de fondos FPL
app.get('/api/fondos/tables', verifyToken, async (req, res) => {
  try {
    const result = await fondosService.getTables();
    res.json(result);
  } catch (error) {
    console.error('❌ Error en /api/fondos/tables:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TEMPORAL: Endpoint de prueba sin autenticación
app.get('/api/fondos/test-connection', async (req, res) => {
  try {
    console.log('🧪 Test de conexión fondos - iniciando...');
    const result = await fondosService.getTables();
    console.log('✅ Test de conexión fondos - exitoso:', result);
    res.json({
      success: true,
      message: 'Conexión a fondos funcionando',
      data: result
    });
  } catch (error) {
    console.error('❌ Test de conexión fondos - error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error en conexión fondos'
    });
  }
});

app.get('/api/fondos/historico-fondos-gsau', verifyToken, async (req, res) => {
  try {
    const result = await fondosService.getHistoricoFondosData();
    res.json(result);
  } catch (error) {
    console.error('❌ Error en /api/fondos/historico-fondos-gsau:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/fondos/data-from-rfc', verifyToken, async (req, res) => {
  try {
    const { rfc, cveper } = req.query;
    
    if (!rfc) {
      return res.status(400).json({
        success: false,
        error: 'RFC parameter is required'
      });
    }

    console.log('🏦 Consultando FPL data para RFC:', rfc, 'Fecha:', cveper);
    
    const result = await fondosService.getFPLDataByRFC(rfc, cveper);
    res.json(result);
  } catch (error) {
    console.error('❌ Error en /api/fondos/data-from-rfc:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TEMPORAL: Endpoint público para diagnosticar problema específico
app.get('/api/fondos/debug-rfc', async (req, res) => {
  try {
    const { rfc, cveper } = req.query;
    
    console.log('🔍 DEBUG: Iniciando diagnóstico para RFC:', rfc);
    
    if (!rfc) {
      return res.json({
        success: false,
        error: 'RFC parameter is required',
        debug: 'No RFC provided'
      });
    }

    console.log('🏦 DEBUG: Consultando FPL data para RFC:', rfc, 'Fecha:', cveper);
    
    const result = await fondosService.getFPLDataByRFC(rfc, cveper);
    console.log('✅ DEBUG: Resultado obtenido:', result);
    
    res.json({
      success: true,
      debug: 'Endpoint funcionando sin autenticación',
      originalResult: result
    });
  } catch (error) {
    console.error('❌ DEBUG: Error en diagnóstico:', error);
    res.status(500).json({
      success: false,
      debug: 'Error capturado',
      error: error.message,
      stack: error.stack
    });
  }
});

// TEMPORAL: Endpoint para obtener fechas FPL calculadas basadas en Antigüedad en Fondo
app.get('/api/fondos/debug-fechas-fpl', async (req, res) => {
  try {
    const { rfc } = req.query;
    
    console.log('📅 DEBUG: Calculando fechas FPL para RFC:', rfc);
    
    if (!rfc) {
      return res.json({
        success: false,
        error: 'RFC parameter is required',
        debug: 'No RFC provided'
      });
    }

    console.log('🔍 DEBUG: Usando método de cálculo de fechas FPL para RFC:', rfc);
    
    const fechasFPL = await fondosService.getFechasFPLCalculadas(rfc);
    console.log('✅ DEBUG: Fechas FPL calculadas obtenidas:', fechasFPL);
    
    res.json({
      success: true,
      debug: 'Fechas FPL calculadas con éxito',
      fechasFPL: fechasFPL,
      rfc: rfc
    });
  } catch (error) {
    console.error('❌ DEBUG: Error calculando fechas FPL:', error);
    res.status(500).json({
      success: false,
      debug: 'Error en cálculo de fechas FPL',
      error: error.message,
      stack: error.stack
    });
  }
});

// TEMPORAL: Endpoint para probar diferentes estrategias de fecha
app.get('/api/fondos/test-date-formats', async (req, res) => {
  try {
    const { rfc, fecha } = req.query;
    
    console.log('📅 TEST: Probando formatos de fecha para RFC:', rfc, 'Fecha:', fecha);
    
    if (!rfc || !fecha) {
      return res.json({
        success: false,
        error: 'RFC and fecha parameters are required'
      });
    }

    // Importar fondosPool directamente para hacer pruebas
    const { fondosPool } = require('./config/database');
    const client = await fondosPool.connect();
    
    const testResults = [];
    
    // Estrategia 1: Comparación directa
    try {
      const result1 = await client.query(`
        SELECT COUNT(*) as count FROM historico_fondos_gsau 
        WHERE (rfc = $1 OR "RFC" = $1 OR numrfc = $1) 
        AND cveper = $2
      `, [rfc, fecha]);
      testResults.push({ strategy: 'direct_comparison', count: result1.rows[0].count });
    } catch (err) {
      testResults.push({ strategy: 'direct_comparison', error: err.message });
    }

    // Estrategia 2: Usando DATE()
    try {
      const result2 = await client.query(`
        SELECT COUNT(*) as count FROM historico_fondos_gsau 
        WHERE (rfc = $1 OR "RFC" = $1 OR numrfc = $1) 
        AND DATE(cveper) = $2::date
      `, [rfc, fecha]);
      testResults.push({ strategy: 'DATE_function', count: result2.rows[0].count });
    } catch (err) {
      testResults.push({ strategy: 'DATE_function', error: err.message });
    }

    // Estrategia 3: Cast a date
    try {
      const result3 = await client.query(`
        SELECT COUNT(*) as count FROM historico_fondos_gsau 
        WHERE (rfc = $1 OR "RFC" = $1 OR numrfc = $1) 
        AND cveper::date = $2::date
      `, [rfc, fecha]);
      testResults.push({ strategy: 'cast_to_date', count: result3.rows[0].count });
    } catch (err) {
      testResults.push({ strategy: 'cast_to_date', error: err.message });
    }

    // Obtener muestra de fechas en la tabla
    try {
      const sampleDates = await client.query(`
        SELECT DISTINCT cveper, DATE(cveper) as date_only
        FROM historico_fondos_gsau 
        WHERE (rfc = $1 OR "RFC" = $1 OR numrfc = $1)
        AND cveper IS NOT NULL
        ORDER BY cveper DESC LIMIT 10
      `, [rfc]);
      testResults.push({ strategy: 'sample_dates', data: sampleDates.rows });
    } catch (err) {
      testResults.push({ strategy: 'sample_dates', error: err.message });
    }

    client.release();
    
    res.json({
      success: true,
      rfc,
      fecha,
      testResults,
      debug: 'Pruebas de formato de fecha completadas'
    });
    
  } catch (error) {
    console.error('❌ Error en test de fechas:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      debug: 'Error en pruebas de fecha'
    });
  }
});

// Catch all para rutas no encontradas
app.use((req, res) => {
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

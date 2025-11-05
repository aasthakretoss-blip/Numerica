const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { authenticate: verifyToken, requirePermission } = require('./middleware/auth');
const { testConnections } = require('./config/database');
const nominasService = require('./services/nominasService');
const fondosService = require('./services/fondosService');
const uploadService = require('./services/uploadService');
const payrollFilterService = require('./services/payrollFilterService'); // Mover aquí
const googleDriveService = require('./services/googleDriveService');
const authService = require('./services/authService');
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
const PORT = process.env.PORT || 3001;

// Middleware global
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración CORS
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:3002',
      'http://localhost:3003',
      'https://numerica-imsa.vercel.app'  // Vercel frontend
    ];

// Custom origin function to allow Vercel preview deployments
const originFunction = (origin, callback) => {
  // Allow requests with no origin (like mobile apps, Postman, etc.)
  if (!origin) {
    return callback(null, true);
  }

  // Check if origin is in allowed list
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  // Allow Vercel preview deployments (*.vercel.app)
  if (origin.endsWith('.vercel.app')) {
    return callback(null, true);
  }

  // Allow Netlify deployments (*.netlify.app)
  if (origin.endsWith('.netlify.app')) {
    return callback(null, true);
  }

  // Allow AWS CloudFront/Amplify
  if (origin.includes('cloudfront.net') || origin.includes('amplifyapp.com')) {
    return callback(null, true);
  }

  // Reject other origins
  callback(new Error('Not allowed by CORS'));
};

const corsOptions = {
  origin: originFunction,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-email', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly for all routes
app.options('*', cors(corsOptions));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// RUTAS PÚBLICAS
// ============================================================================

// Endpoint de compatibilidad para búsqueda de empleados (usado por el frontend)
app.get('/busqueda-empleados', async (req, res) => {
  try {
    const { pageSize, page, search, puesto, compania, sucursal, status, puestoCategorizado, cveper, orderBy, orderDirection } = req.query;
    
    console.log('🔍 /busqueda-empleados: Parámetros recibidos:', req.query);
    
    // Usar el mismo servicio que /api/payroll
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
      environment: process.env.NODE_ENV || 'development'
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
    name: 'Historic Data API',
    version: '1.0.0',
    description: 'API para consultar datos históricos de nóminas y fondos',
    endpoints: {
      public: ['/health', '/api/info'],
      protected: {
        nominas: ['/api/nominas/*'],
        fondos: ['/api/fondos/*']
      },
      permissions: {
        'custom:can_upload': 'Permite subir archivos',
        'custom:can_view_funds': 'Permite ver información de fondos',
        'custom:role': 'admin | user'
      }
    }
  });
});

// ============================================================================
// RUTAS DE AUTENTICACIÓN (SIN PROTECCIÓN)
// ============================================================================

// Validar email contra numerica_users
app.post('/api/auth/validate-email', async (req, res) => {
  console.log('📨 Handler /api/auth/validate-email ejecutándose');
  console.log('📦 Body recibido:', req.body);
  
  try {
    const { email } = req.body;
    
    if (!email) {
      console.log('❌ Email no proporcionado en el body');
      return res.status(400).json({
        success: false,
        error: 'Email es requerido'
      });
    }
    
    console.log('🔍 Validando email para registro:', email);
    
    const { nominasPool } = require('./config/database');
    const client = await nominasPool.connect();
    
    try {
      // Verificar si el email existe en numerica_users
      const query = 'SELECT id, email, status FROM numerica_users WHERE email = $1';
      const result = await client.query(query, [email]);
      
      if (result.rows.length === 0) {
        console.log('❌ Email no autorizado:', email);
        return res.status(403).json({
          success: false,
          error: 'Este correo electrónico no está autorizado para registrarse. Contacte al administrador.'
        });
      }
      
      const user = result.rows[0];
      
      console.log('📊 Status del usuario en DB:', user.status);
      
      // Solo permitir registro si el status es 'pending_setup'
      if (user.status !== 'pending_setup') {
        console.log('⚠️ Usuario ya registrado o no elegible. Status:', user.status);
        return res.status(409).json({
          success: false,
          error: 'Este correo ya tiene una cuenta registrada. Por favor inicia sesión.'
        });
      }
      
      // Verificar si el usuario tiene Cognito account existente
      const { CognitoIdentityProviderClient, AdminGetUserCommand, AdminDeleteUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
      const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
      
      try {
        const getUserCommand = new AdminGetUserCommand({
          UserPoolId: process.env.COGNITO_USER_POOL_ID,
          Username: email
        });
        
        await cognitoClient.send(getUserCommand);
        
        // Si llegamos aquí, el usuario ya existe en Cognito
        console.log('⚠️ Usuario ya existe en Cognito pero DB status es pending_setup');
        console.log('🗑️ Eliminando usuario de Cognito para permitir re-registro...');
        
        // Eliminar el usuario de Cognito para permitir re-registro
        const deleteUserCommand = new AdminDeleteUserCommand({
          UserPoolId: process.env.COGNITO_USER_POOL_ID,
          Username: email
        });
        
        await cognitoClient.send(deleteUserCommand);
        console.log('✅ Usuario eliminado de Cognito, puede proceder con el registro');
        
        // Permitir el registro
        res.json({
          success: true,
          message: 'Email autorizado para registro',
          user: {
            id: user.id,
            email: user.email
          }
        });
        
      } catch (cognitoError) {
        // Si es UserNotFoundException, significa que el usuario NO existe en Cognito
        if (cognitoError.name === 'UserNotFoundException') {
          console.log('✅ Email válido para registro (no existe en Cognito):', email);
          
          res.json({
            success: true,
            message: 'Email autorizado para registro',
            user: {
              id: user.id,
              email: user.email
            }
          });
        } else {
          // Otro error de Cognito, lo lanzamos
          throw cognitoError;
        }
      }
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error validando email:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
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
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================================================

// Middleware de autenticación que se aplicará manualmente a las rutas protegidas

// ============================================================================
// RUTAS DE NÓMINAS - Requiere autenticación
// ============================================================================

// Obtener tablas disponibles en base de datos de nóminas
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

// Obtener estructura de una tabla específica
app.get('/api/nominas/tables/:tableName/structure', verifyToken, async (req, res) => {
  try {
    const { tableName } = req.params;
    const result = await nominasService.getTableStructure(tableName);
    res.json(result);
  } catch (error) {
    console.error('❌ Error obteniendo estructura de tabla:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Consultar datos de una tabla con paginación y filtros
app.get('/api/nominas/tables/:tableName/data', verifyToken, async (req, res) => {
  try {
    const { tableName } = req.params;
    const { limit, offset, orderBy, order, ...filters } = req.query;
    
    // Construir filtros WHERE si se proporcionan
    const where = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value && key !== 'limit' && key !== 'offset' && key !== 'orderBy' && key !== 'order') {
        where.push({
          column: key,
          value: value,
          operator: 'ILIKE' // Para búsquedas de texto parcial
        });
      }
    });
    
    const options = {
      limit,
      offset,
      orderBy,
      order,
      where: where.length > 0 ? where : undefined
    };
    
    const result = await nominasService.queryTable(tableName, options);
    res.json(result);
  } catch (error) {
    console.error('❌ Error consultando tabla:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Buscar empleados
app.get('/api/nominas/search/employees', verifyToken, async (req, res) => {
  try {
    const { q: searchTerm, limit, offset } = req.query;
    
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro de búsqueda "q" es requerido'
      });
    }
    
    const result = await nominasService.searchEmployees(searchTerm, { limit, offset });
    res.json(result);
  } catch (error) {
    console.error('❌ Error buscando empleados:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener estadísticas de nóminas
app.get('/api/nominas/stats', verifyToken, async (req, res) => {
  try {
    const result = await nominasService.getStats();
    res.json(result);
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de nóminas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener valores únicos de una columna para filtros
app.get('/api/nominas/unique/:tableName/:columnName', verifyToken, async (req, res) => {
  try {
    const { tableName, columnName } = req.params;
    const { search, limit } = req.query;
    
    const result = await nominasService.getUniqueValues(tableName, columnName, {
      search,
      limit
    });
    res.json(result);
  } catch (error) {
    console.error('❌ Error obteniendo valores únicos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener último periodo disponible
app.get('/api/nominas/latest-period', verifyToken, async (req, res) => {
  try {
    const result = await nominasService.getLatestPeriod();
    res.json(result);
  } catch (error) {
    console.error('❌ Error obteniendo último periodo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// RUTAS ESPECÍFICAS DE PAYROLL - DEBEN IR ANTES QUE LA RUTA GENERAL
// ============================================================================

// Obtener todas las categorías de puestos disponibles (sin autenticación para desarrollo)
app.get('/api/payroll/categorias-puestos', async (req, res) => {
  try {
    const categorias = nominasService.getPuestosCategorias();
    
    // Formatear para el DropDownMenu (incluir conteos)
    const categoriasConConteo = categorias.map(categoria => ({
      value: categoria,
      count: 0 // El conteo real se calculará cuando se implemente el filtrado completo
    }));
    
    res.json({
      success: true,
      data: categoriasConConteo,
      count: categorias.length
    });
  } catch (error) {
    console.error('❌ Error obteniendo categorías de puestos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener categoría de un puesto específico
app.get('/api/payroll/puesto-categoria/:puesto', async (req, res) => {
  try {
    const { puesto } = req.params;
    const categoria = nominasService.getPuestoCategorizado(puesto);
    
    res.json({
      success: true,
      puesto: puesto,
      categoria: categoria
    });
  } catch (error) {
    console.error('❌ Error obteniendo categoría del puesto:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener estadísticas completas de payroll
app.get('/api/payroll/stats', async (req, res) => {
  try {
    const result = await nominasService.getDatasetStats();
    // result ya tiene { success, stats, timestamp }
    // No envolver nuevamente, simplemente devolver el resultado
    res.json(result);
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de payroll:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener periodos únicos (cveper) desde payroll_data
app.get('/api/payroll/periodos', async (req, res) => {
  try {
    const result = await nominasService.getUniquePayrollPeriods();
    res.json(result);
  } catch (error) {
    console.error('❌ Error obteniendo periodos de payroll:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NUEVO: Obtener períodos basado en un CURP específico siguiendo la metodología solicitada
app.get('/api/payroll/periodos-from-curp', async (req, res) => {
  try {
    const { curp = 'AICI710412MHGGHL23' } = req.query;
    
    console.log(`🔍 Buscando períodos para CURP: ${curp}`);
    
    // Conectar directamente a la base de datos historico_nominas_gsau
    const { nominasPool } = require('./config/database');
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
          message: `No se encontraron registros para el CURP: ${curp}`
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
      
      console.log(`📅 VALORES ÚNICOS DE CVEPER (${uniqueCvepers.length} períodos):`);
      uniqueCvepers.forEach((cveper, index) => {
        console.log(`${index + 1}: ${cveper}`);
      });
      
      // Formatear para dropdown (similar a getUniquePayrollPeriods)
      const formattedPeriods = uniqueCvepers.map(cveper => {
        let formattedValue = cveper;
        if (cveper instanceof Date || (typeof cveper === 'string' && cveper.includes('T'))) {
          const date = new Date(cveper);
          formattedValue = date.toISOString().split('T')[0];
        } else if (typeof cveper === 'string' && cveper.match(/^\d{4}-\d{2}-\d{2}/)) {
          formattedValue = cveper.split('T')[0].substring(0, 10);
        }
        return {
          value: formattedValue,
          label: formattedValue,
          count: allCvepers.filter(c => {
            const cDate = c instanceof Date ? c.toISOString().split('T')[0] : (c.toString().split('T')[0] || c);
            return cDate === formattedValue;
          }).length
        };
      }).sort((a, b) => b.value.localeCompare(a.value)); 
      
      console.log(`🎯 METODOLOGÍA APLICADA:`);
      console.log(`1. ✅ Buscado CURP ${curp} en historico_nominas_gsau`);
      console.log(`2. ✅ Extraídos ${result.rows.length} datapoints`);
      console.log(`3. ✅ Identificados ${uniqueCvepers.length} períodos únicos`);
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
          step4: 'Formateados para dropdown'
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error obteniendo períodos desde CURP:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NUEVO: Obtener RFC basado en CURP desde historico_nominas_gsau
app.get('/api/payroll/rfc-from-curp', async (req, res) => {
  try {
    const { curp } = req.query;
    
    if (!curp) {
      return res.status(400).json({
        success: false,
        error: 'CURP es requerido'
      });
    }
    
    console.log(`🔍 Buscando RFC para CURP: ${curp}`);
    
    // Conectar directamente a la base de datos historico_nominas_gsau
    const { nominasPool } = require('./config/database');
    const client = await nominasPool.connect();
    
    try {
      // Buscar RFC correspondiente al CURP específico
      const query = `
        SELECT DISTINCT "RFC"
        FROM historico_nominas_gsau
        WHERE "CURP" = $1
        AND "RFC" IS NOT NULL
        AND "RFC" != ''
        LIMIT 1
      `;
      
      console.log(`🔍 Ejecutando query para buscar RFC de CURP: ${curp}`);
      const result = await client.query(query, [curp]);
      
      if (result.rows.length === 0) {
        console.log(`⚠️ No se encontró RFC para CURP: ${curp}`);
        return res.json({
          success: true,
          data: null,
          curp: curp,
          message: `No se encontró RFC para el CURP: ${curp}`
        });
      }
      
      const rfc = result.rows[0].RFC;
      console.log(`✅ RFC encontrado para CURP ${curp}: ${rfc}`);
      
      res.json({
        success: true,
        data: {
          curp: curp,
          rfc: rfc
        },
        message: `RFC encontrado exitosamente`
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error obteniendo RFC desde CURP:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NUEVO: Obtener nombre completo basado en CURP desde historico_nominas_gsau
app.get('/api/payroll/name-from-curp', async (req, res) => {
  try {
    const { curp } = req.query;
    
    if (!curp) {
      return res.status(400).json({
        success: false,
        error: 'CURP es requerido'
      });
    }
    
    console.log(`🔍 Buscando nombre completo para CURP: ${curp}`);
    
    // Conectar directamente a la base de datos historico_nominas_gsau
    const { nominasPool } = require('./config/database');
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
      
      console.log(`🔍 Ejecutando query para buscar nombre completo de CURP: ${curp}`);
      const result = await client.query(query, [curp]);
      
      if (result.rows.length === 0) {
        console.log(`⚠️ No se encontró nombre completo para CURP: ${curp}`);
        return res.json({
          success: true,
          data: null,
          curp: curp,
          message: `No se encontró nombre completo para el CURP: ${curp}`
        });
      }
      
      const nombreCompleto = result.rows[0]['Nombre completo'];
      console.log(`✅ Nombre completo encontrado para CURP ${curp}: ${nombreCompleto}`);
      
      res.json({
        success: true,
        data: {
          curp: curp,
          nombreCompleto: nombreCompleto
        },
        message: `Nombre completo encontrado exitosamente`
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error obteniendo nombre completo desde CURP:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NUEVO: Obtener datos completos de FPL por RFC
app.get('/api/fpl/data-from-rfc', async (req, res) => {
  try {
    const { rfc, fechaFPL } = req.query;
    
    if (!rfc) {
      return res.status(400).json({
        success: false,
        error: 'RFC es requerido'
      });
    }
    
    console.log(`🏦 Buscando datos FPL completos para RFC: ${rfc}`, fechaFPL ? `Fecha FPL: ${fechaFPL}` : 'Todas las fechas');
    
    // Conectar directamente a la base de datos historico_fondos_gsau
    const { fondosPool } = require('./config/database');
    const client = await fondosPool.connect();
    
    try {
      let query, params;
      
      // NUEVO: Comprobar si se reciben parámetros de búsqueda específica
      const { originalFecpla, originalAntiguedad } = req.query;
      
      if (originalFecpla && originalAntiguedad) {
        // Búsqueda específica usando datos originales del dropdown
        console.log(`🔍 Búsqueda específica con datos originales: fecpla=${originalFecpla}, antiguedad=${originalAntiguedad}`);
        
        // Identificar columna de antigüedad (reutilizar la lógica existente)
        const allColumnsQuery = `
          SELECT column_name, data_type
          FROM information_schema.columns 
          WHERE table_name = 'historico_fondos_gsau'
          ORDER BY ordinal_position
        `;
        
        const allColumnsResult = await client.query(allColumnsQuery);
        let antiguedadColumn = null;
        
        const exactNames = [
          'Antiguedad en Fondo', 'ANTIGUEDAD EN FONDO', 'antiguedad_en_fondo',
          'AntiguedadEnFondo', 'antiguedad_fondo', 'AntiguedadFondo',
          'ant_fondo', 'Ant Fondo', 'ANT FONDO'
        ];
        
        for (const exactName of exactNames) {
          const found = allColumnsResult.rows.find(row => row.column_name === exactName);
          if (found) {
            antiguedadColumn = found.column_name;
            break;
          }
        }
        
        if (!antiguedadColumn) {
          const keywordMatches = allColumnsResult.rows.filter(row => {
            const colLower = row.column_name.toLowerCase();
            return colLower.includes('antiguedad') || colLower.includes('fondo');
          });
          
          if (keywordMatches.length > 0) {
            antiguedadColumn = keywordMatches[0].column_name;
          }
        }
        
        if (antiguedadColumn) {
          query = `
            SELECT *
            FROM historico_fondos_gsau
            WHERE numrfc = $1
              AND DATE(fecpla) = $2
              AND CAST("${antiguedadColumn}" AS NUMERIC) = $3
            ORDER BY fecpla DESC
            LIMIT 1
          `;
          params = [rfc, originalFecpla, parseFloat(originalAntiguedad)];
        } else {
          throw new Error('No se pudo identificar la columna de antigüedad para búsqueda específica');
        }
      } else {
        // Búsqueda general (comportamiento anterior)
        query = `
          SELECT *
          FROM historico_fondos_gsau
          WHERE numrfc = $1
        `;
        
        params = [rfc];
        
        // Si se especifica una fecha FPL calculada, filtrar por ella
        if (fechaFPL) {
          query += ` AND DATE(fecpla) = $2`;
          params.push(fechaFPL);
        }
        
        // Ordenar por fecpla más reciente primero
        query += ` ORDER BY fecpla DESC LIMIT 1`;
      }
      
      console.log(`🔍 Ejecutando query para datos FPL completos:`, query);
      console.log('📋 Parámetros:', params);
      
      const result = await client.query(query, params);
      
      console.log(`📈 REGISTROS ENCONTRADOS: ${result.rows.length}`);
      
      if (result.rows.length === 0) {
        console.log(`⚠️ No se encontraron datos FPL para RFC: ${rfc}`);
        return res.json({
          success: true,
          data: null,
          rfc: rfc,
          fechaFPL: fechaFPL,
          message: `No se encontraron datos FPL para el RFC: ${rfc}`
        });
      }
      
      const fplData = result.rows[0];
      
      console.log('✅ Datos FPL obtenidos exitosamente:', {
        rfc: rfc,
        fecpla: fplData.fecpla,
        nombre: fplData.nombre,
        sucursal: fplData['Descripción cvetno'],
        status: fplData.status
      });
      
      res.json({
        success: true,
        data: fplData,
        rfc: rfc,
        fechaFPL: fechaFPL,
        message: 'Datos FPL obtenidos exitosamente'
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error obteniendo datos FPL completos:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Error en obtención de datos FPL completos'
    });
  }
});

// NUEVO: Obtener fechas FPL calculadas basado en RFC (fecpla + Antigüedad en Fondo)
app.get('/api/payroll/fecpla-from-rfc', async (req, res) => {
  try {
    const { rfc } = req.query;
    
    if (!rfc) {
      return res.status(400).json({
        success: false,
        error: 'RFC es requerido'
      });
    }
    
    console.log(`🔍 Buscando fechas FPL calculadas para RFC: ${rfc}`);
    
    // Conectar directamente a la base de datos historico_fondos_gsau
    const { fondosPool } = require('./config/database');
    const client = await fondosPool.connect();
    
    try {
      // Primero, identificar TODAS las columnas de la tabla
      console.log('🔍 Analizando estructura completa de historico_fondos_gsau...');
      const allColumnsQuery = `
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'historico_fondos_gsau'
        ORDER BY ordinal_position
      `;
      
      const allColumnsResult = await client.query(allColumnsQuery);
      console.log('📋 Columnas disponibles:', allColumnsResult.rows.map(r => r.column_name).join(', '));
      
      // Buscar columna de Antigüedad en Fondo con múltiples estrategias
      let antiguedadColumn = null;
      
      // Estrategia 1: Buscar por nombre exacto (más probable)
      const exactNames = [
        'Antiguedad en Fondo',
        'ANTIGUEDAD EN FONDO', 
        'antiguedad_en_fondo',
        'AntiguedadEnFondo',
        'antiguedad_fondo',
        'AntiguedadFondo',
        'ant_fondo',
        'Ant Fondo',
        'ANT FONDO'
      ];
      
      for (const exactName of exactNames) {
        const found = allColumnsResult.rows.find(row => row.column_name === exactName);
        if (found) {
          antiguedadColumn = found.column_name;
          console.log(`✅ Columna encontrada por nombre exacto: "${antiguedadColumn}"`);
          break;
        }
      }
      
      // Estrategia 2: Buscar por palabras clave
      if (!antiguedadColumn) {
        const keywordMatches = allColumnsResult.rows.filter(row => {
          const colLower = row.column_name.toLowerCase();
          return colLower.includes('antiguedad') || 
                 colLower.includes('fondo') ||
                 (colLower.includes('ant') && colLower.includes('fondo'));
        });
        
        if (keywordMatches.length > 0) {
          antiguedadColumn = keywordMatches[0].column_name;
          console.log(`✅ Columna encontrada por palabras clave: "${antiguedadColumn}"`);
          console.log('📋 Otros candidatos:', keywordMatches.map(r => r.column_name));
        }
      }
      
      // Estrategia 3: Analizar columnas numéricas por contenido
      if (!antiguedadColumn) {
        console.log('🔍 Analizando columnas numéricas por contenido...');
        const numericColumns = allColumnsResult.rows.filter(row => 
          ['numeric', 'double precision', 'real', 'integer', 'smallint', 'bigint'].includes(row.data_type) &&
          !['numrfc', 'fecpla'].includes(row.column_name.toLowerCase())
        );
        
        for (const numCol of numericColumns.slice(0, 10)) { // Revisar solo primeros 10
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
            
            // Si parece datos de años (rango 0-50, promedio razonable)
            if (stats.positivos > 0 && stats.min_val >= 0 && stats.max_val <= 50 && stats.avg_val <= 15) {
              antiguedadColumn = numCol.column_name;
              console.log(`✅ Columna detectada por análisis de contenido: "${antiguedadColumn}"`);
              console.log(`   📊 Estadísticas: ${stats.positivos} registros, rango: ${stats.min_val}-${stats.max_val}, promedio: ${parseFloat(stats.avg_val).toFixed(4)}`);
              break;
            }
          } catch (e) {
            // Continuar con siguiente columna
          }
        }
      }
      
      if (!antiguedadColumn) {
        console.log('❌ No se pudo identificar la columna de Antigüedad en Fondo');
        return res.json({
          success: false,
          error: 'No se encontró la columna de Antigüedad en Fondo',
          availableColumns: allColumnsResult.rows.map(r => r.column_name),
          message: 'Por favor, especifica manualmente el nombre de la columna'
        });
      }
      
      // Consulta principal con cálculo de fechas FPL usando conversión explícita a NUMERIC
      // AJUSTE: Normalizar fechas que caen al final del mes (28-31) al día 1 del mes siguiente
      const query = `
        SELECT 
          fecpla,
          "${antiguedadColumn}" as antiguedad_anos_raw,
          CAST("${antiguedadColumn}" AS NUMERIC) as antiguedad_anos,
          -- Calcular fecha FPL base: fecpla + (antiguedad_anos * 365.25 días)
          (fecpla + INTERVAL '1 day' * (CAST(COALESCE("${antiguedadColumn}", 0) AS NUMERIC) * 365.25))::date as fecha_fpl_base,
          -- AJUSTE: Si la fecha cae en días 28-31, moverla al día 1 del mes siguiente
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
      
      console.log(`🔍 Ejecutando query con cálculo FPL para RFC: ${rfc}`);
      console.log(`📊 Columna de antigüedad: ${antiguedadColumn}`);
      const result = await client.query(query, [rfc]);
      
      console.log(`📈 TOTAL DE REGISTROS ENCONTRADOS: ${result.rows.length}`);
      
      if (result.rows.length === 0) {
        console.log(`⚠️ No se encontraron fechas FPL para RFC: ${rfc}`);
        return res.json({
          success: true,
          data: [],
          total: 0,
          rfc: rfc,
          message: `No se encontraron fechas FPL calculadas para el RFC: ${rfc}`
        });
      }
      
      // Procesar y formatear las fechas calculadas
      const fecplasCalculadas = new Map();
      const allCalculatedDates = [];
      
      result.rows.forEach((row, index) => {
        const fechaBase = row.fecpla;
        const antiguedadAnos = parseFloat(row.antiguedad_anos) || 0;
        const fechaCalculada = row.fecha_fpl_calculada;
        
        console.log(`${index + 1}: Base: ${fechaBase}, Antigüedad: ${antiguedadAnos} años, FPL: ${fechaCalculada}`);
        
        // Usar fecha calculada como clave única
        const fechaKey = fechaCalculada.toISOString().split('T')[0];
        
        if (!fecplasCalculadas.has(fechaKey)) {
          fecplasCalculadas.set(fechaKey, {
            fechaCalculada: fechaCalculada,
            fechaBase: fechaBase,
            antiguedadAnos: antiguedadAnos,
            count: 0
          });
        }
        
        fecplasCalculadas.get(fechaKey).count++;
        allCalculatedDates.push(fechaCalculada);
      });
      
      // Convertir a array y ordenar del más reciente al más antiguo
      const uniqueFecplasFPL = Array.from(fecplasCalculadas.values())
        .sort((a, b) => new Date(b.fechaCalculada) - new Date(a.fechaCalculada));
      
      console.log(`📅 FECHAS FPL ÚNICAS CALCULADAS (${uniqueFecplasFPL.length} fechas):`);
      uniqueFecplasFPL.forEach((item, index) => {
        console.log(`${index + 1}: ${item.fechaCalculada.toISOString().split('T')[0]} (Base: ${item.fechaBase}, +${item.antiguedadAnos} años)`);
      });
      
      // Formatear para dropdown - SIN TIMESTAMP, solo fechas
      // INCLUIR METADATOS DEL DATAPOINT ORIGINAL para poder hacer búsqueda inversa
      const formattedDates = uniqueFecplasFPL.map(item => {
        const fechaFPL = item.fechaCalculada;
        let displayValue = fechaFPL.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        
        return {
          value: displayValue, // Solo fecha SIN timestamp para el backend
          label: displayValue, // Solo fecha para mostrar
          count: item.count,
          metadata: {
            fechaBase: item.fechaBase.toISOString().split('T')[0], // También sin timestamp
            antiguedadAnos: item.antiguedadAnos,
            calculoAplicado: `${item.fechaBase.toISOString().split('T')[0]} + ${item.antiguedadAnos} años = ${displayValue}`,
            ajusteAplicado: fechaFPL.getDate() >= 28 ? 'Movido al 1° del mes siguiente' : 'Fecha original mantenida',
            // DATOS CRÍTICOS para búsqueda inversa
            originalFecpla: item.fechaBase.toISOString().split('T')[0], // Fecha original fecpla
            originalAntiguedad: item.antiguedadAnos // Antigüedad exacta utilizada
          }
        };
      });
      
      console.log(`🎯 METODOLOGÍA FPL APLICADA:`);
      console.log(`1. ✅ Buscado RFC ${rfc} en historico_fondos_gsau`);
      console.log(`2. ✅ Extraídos ${result.rows.length} registros con fecpla y antiguedad`);
      console.log(`3. ✅ Calculadas fechas FPL: fecpla + (antiguedad_anos * 365.25 días)`);
      console.log(`4. ✅ Identificadas ${uniqueFecplasFPL.length} fechas FPL únicas`);
      console.log(`5. ✅ Formateadas para dropdown`);
      
      res.json({
        success: true,
        data: formattedDates,
        total: uniqueFecplasFPL.length,
        datapoints: result.rows.length,
        rfc: rfc,
        antiguedadColumn: antiguedadColumn,
        calculation: 'fecpla + (antiguedad_anos * 365.25 días)',
        methodology: {
          step1: `Búsqueda de RFC ${rfc} en historico_fondos_gsau`,
          step2: `${result.rows.length} registros encontrados con datos completos`,
          step3: `Aplicado cálculo: fecpla + (${antiguedadColumn} * 365.25 días)`,
          step4: `${uniqueFecplasFPL.length} fechas FPL únicas calculadas`,
          step5: 'Formateadas y ordenadas para dropdown'
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error obteniendo fechas FPL calculadas:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Error en cálculo de fechas FPL con Antigüedad en Fondo'
    });
  }
});

// NUEVO: Endpoint para opciones de filtros demográficos
app.get('/api/payroll/filter-options', async (req, res) => {
  console.log('🔍 DEBUG: Accediendo a /api/payroll/filter-options');
  console.log('🔍 DEBUG: Query params:', req.query);
  
  try {
    // Extraer filtros activos de los parámetros de consulta
    const activeFilters = {};
    
    if (req.query.search) activeFilters.search = req.query.search;
    if (req.query.sucursales && Array.isArray(req.query.sucursales)) {
      activeFilters.sucursal = req.query.sucursales;
    } else if (req.query.sucursal) {
      activeFilters.sucursal = Array.isArray(req.query.sucursal) ? req.query.sucursal : [req.query.sucursal];
    }
    if (req.query.puestos && Array.isArray(req.query.puestos)) {
      activeFilters.puesto = req.query.puestos;
    } else if (req.query.puesto) {
      activeFilters.puesto = Array.isArray(req.query.puesto) ? req.query.puesto : [req.query.puesto];
    }
    if (req.query.status) {
      activeFilters.status = Array.isArray(req.query.status) ? req.query.status : [req.query.status];
    }
    if (req.query.cveper || req.query.periodFilter) {
      activeFilters.cveper = req.query.cveper || req.query.periodFilter;
    }
    if (req.query.puestosCategorias && Array.isArray(req.query.puestosCategorias)) {
      activeFilters.puestoCategorizado = req.query.puestosCategorias;
    } else if (req.query.puestoCategorizado) {
      activeFilters.puestoCategorizado = Array.isArray(req.query.puestoCategorizado) 
        ? req.query.puestoCategorizado : [req.query.puestoCategorizado];
    }
    
    console.log('🔍 DEBUG: Active filters:', activeFilters);
    
    const result = await payrollFilterService.getFiltersWithCardinality(activeFilters);
    
    console.log('✅ DEBUG: Opciones de filtros obtenidas exitosamente:', {
      sucursales: result.data?.sucursales?.length || 0,
      puestos: result.data?.puestos?.length || 0,
      puestosCategorias: result.data?.puestosCategorias?.length || 0,
      estados: result.data?.estados?.length || 0
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error obteniendo opciones de filtros demográficos:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

// NUEVO: Obtener filtros con cardinalidad en tiempo real
app.get('/api/payroll/filters', async (req, res) => {
  console.log('🔍 DEBUG: Accediendo a /api/payroll/filters');
  console.log('🔍 DEBUG: Query params:', req.query);
  
  try {
    // Extraer filtros activos de los parámetros de consulta
    const activeFilters = {};
    
    if (req.query.search) activeFilters.search = req.query.search;
    if (req.query.sucursal) {
      activeFilters.sucursal = Array.isArray(req.query.sucursal) ? req.query.sucursal : [req.query.sucursal];
    }
    if (req.query.puesto) {
      activeFilters.puesto = Array.isArray(req.query.puesto) ? req.query.puesto : [req.query.puesto];
    }
    if (req.query.status) {
      activeFilters.status = Array.isArray(req.query.status) ? req.query.status : [req.query.status];
    }
    // CORREGIDO: Manejar cveper como array para soportar múltiples periodos
    if (req.query.cveper) {
      activeFilters.cveper = Array.isArray(req.query.cveper) ? req.query.cveper : [req.query.cveper];
      console.log('📅 DEBUG cveper procesado:', activeFilters.cveper);
    }
    if (req.query.puestoCategorizado) {
      activeFilters.puestoCategorizado = Array.isArray(req.query.puestoCategorizado) 
        ? req.query.puestoCategorizado : [req.query.puestoCategorizado];
    }
    
    console.log('🔍 DEBUG: Active filters:', activeFilters);
    
    const result = await payrollFilterService.getFiltersWithCardinality(activeFilters);
    
    console.log('✅ DEBUG: Filtros obtenidos exitosamente:', {
      sucursales: result.data?.sucursales?.length || 0,
      puestos: result.data?.puestos?.length || 0,
      estados: result.data?.estados?.length || 0
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error obteniendo filtros con cardinalidad:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

// Endpoint específico para tabla demográfica con server-side sorting
app.get('/api/payroll/demographic', async (req, res) => {
  try {
    const { page, pageSize, sortBy, sortDir, search, puesto, sucursal, status, puestoCategorizado, cveper } = req.query;
    
    console.log('📊 /api/payroll/demographic: Parámetros recibidos:', {
      page, pageSize, sortBy, sortDir, cveper
    });
    
    // DEBUGGING ESPECIAL para cveper
    if (cveper) {
      console.log('📅 DEBUGGING CVEPER en demographic:', {
        cveper,
        tipoCveper: typeof cveper,
        esArray: Array.isArray(cveper),
        longitud: cveper.length,
        formatoYYYY_MM: /^\d{4}-\d{2}$/.test(cveper),
        formatoYYYY_MM_DD: /^\d{4}-\d{2}-\d{2}$/.test(cveper)
      });
    }
    
    // Usar el mismo servicio que /api/payroll para consistencia COMPLETA
    const result = await payrollFilterService.getPayrollDataWithFiltersAndSorting({
      pageSize: parseInt(pageSize) || 50,
      page: parseInt(page) || 1,
      orderBy: sortBy || 'nombre',
      orderDirection: sortDir || 'asc',
      // AÑADIR TODOS LOS FILTROS
      search,
      puesto,
      sucursal,
      status,
      puestoCategorizado,
      cveper  // ¡ESTE ERA EL FILTRO FALTANTE!
    });
    
    console.log('✅ /api/payroll/demographic: Datos obtenidos exitosamente:', {
      records: result.data?.length || 0,
      total: result.pagination?.total || 0,
      filtroAplicado: cveper ? `cveper=${cveper}` : 'sin filtro'
    });
    
    res.json({
      success: true,
      data: result.data,
      total: result.pagination?.total || 0,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 50
    });
  } catch (error) {
    console.error('❌ Error obteniendo datos demográficos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NUEVO: Obtener conteo de empleados únicos (CURPs únicos) con filtros
app.get('/api/payroll/demographic/unique-count', async (req, res) => {
  try {
    const { search, puesto, sucursal, status, puestoCategorizado, cveper } = req.query;
    
    console.log('🔢 /api/payroll/demographic/unique-count: Parámetros recibidos:', {
      search, puesto, sucursal, status, puestoCategorizado, cveper
    });
    
    // Usar el service existente que ya maneja correctamente los filtros y parámetros
    const result = await payrollFilterService.getUniqueCurpCount({
      search,
      puesto,
      sucursal, 
      status,
      puestoCategorizado,
      cveper
    });
    
    console.log('✅ Conteo CURPs únicos:', {
      total: result.uniqueCurpCount,
      hombres: result.uniqueMaleCount,
      mujeres: result.uniqueFemaleCount
    });
    
    res.json({
      success: true,
      uniqueCurpCount: result.uniqueCurpCount,
      uniqueMaleCount: result.uniqueMaleCount,
      uniqueFemaleCount: result.uniqueFemaleCount
    });
  } catch (error) {
    console.error('❌ Error obteniendo conteo de CURPs únicos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// RUTAS DE DOCUMENTOS DE GOOGLE DRIVE
// ============================================================================

// NUEVO: Buscar documentos PDF por nombre de empleado en Google Drive
app.get('/api/documents/search-by-name', async (req, res) => {
  try {
    const { employeeName } = req.query;
    
    if (!employeeName) {
      return res.status(400).json({
        success: false,
        error: 'employeeName es requerido'
      });
    }
    
    console.log(`🔍 Buscando documentos para empleado: ${employeeName}`);
    
    // Usar el servicio de Google Drive para buscar archivos
    const result = await googleDriveService.searchWithNameVariations(employeeName);
    
    if (result.success) {
      console.log(`📁 Encontrados ${result.files.length} documentos para ${employeeName}`);
      
      res.json({
        success: true,
        files: result.files,
        total: result.files.length,
        employeeName: employeeName,
        searchVariations: result.searchVariations,
        message: `Se encontraron ${result.files.length} documentos para ${employeeName}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error buscando documentos en Google Drive',
        details: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Error en búsqueda de documentos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NUEVO: Obtener URL de descarga directa para un documento
app.get('/api/documents/download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    console.log(`📥 Generando URL de descarga para archivo: ${fileId}`);
    
    const result = await googleDriveService.generateDownloadUrl(fileId);
    
    if (result.success) {
      res.json({
        success: true,
        downloadUrl: result.downloadUrl,
        expiresIn: result.expiresIn,
        fileId: fileId
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error generando URL de descarga',
        details: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Error generando URL de descarga:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NUEVO: Obtener metadatos de un documento específico
app.get('/api/documents/metadata/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    console.log(`📋 Obteniendo metadatos para archivo: ${fileId}`);
    
    const result = await googleDriveService.getFileMetadata(fileId);
    
    if (result.success) {
      res.json({
        success: true,
        file: result.file,
        fileId: fileId
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error obteniendo metadatos del archivo',
        details: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Error obteniendo metadatos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NUEVO: Endpoint para búsqueda en subcarpetas de Google Drive
app.get('/api/documents/search-subfolders', async (req, res) => {
  try {
    const { employeeName } = req.query;
    
    if (!employeeName) {
      return res.status(400).json({
        success: false,
        error: 'employeeName es requerido'
      });
    }
    
    console.log(`🔍 Buscando en subcarpetas para empleado: ${employeeName}`);
    
    const result = await googleDriveService.searchInSubfolders(employeeName);
    
    if (result.success) {
      console.log(`📁 Encontrados ${result.files.length} documentos en subcarpetas`);
      
      res.json({
        success: true,
        files: result.files,
        total: result.files.length,
        employeeName: employeeName,
        message: `Se encontraron ${result.files.length} documentos en subcarpetas para ${employeeName}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error buscando en subcarpetas',
        details: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Error en búsqueda de subcarpetas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ENDPOINT TEMPORAL DE DEBUG - Para ver estructura de datos reales
// ============================================================================

// TEMPORAL: Endpoint para debug - ver datos raw de historico_fondos_gsau
app.get('/api/debug/fondos-raw', async (req, res) => {
  try {
    const { rfc = 'AICI7104122N7', limit = 5 } = req.query;
    
    console.log('🔍 DEBUG FONDOS: Consultando datos raw para RFC:', rfc);
    
    const { fondosPool } = require('./config/database');
    const client = await fondosPool.connect();
    
    try {
      // Obtener algunos registros raw
      const query = `
        SELECT *
        FROM historico_fondos_gsau
        WHERE numrfc = $1
        LIMIT $2
      `;
      
      const result = await client.query(query, [rfc, parseInt(limit)]);
      
      if (result.rows.length === 0) {
        return res.json({
          success: false,
          message: `No se encontraron datos para RFC: ${rfc}`,
          rfc: rfc
        });
      }
      
      const firstRow = result.rows[0];
      
      // Analizar todos los campos del primer registro
      const fieldAnalysis = {
        totalFields: Object.keys(firstRow).length,
        rfc: rfc,
        recordsFound: result.rows.length,
        fields: {},
        numericFields: {},
        antiguedadCandidates: []
      };
      
      Object.keys(firstRow).forEach(key => {
        const value = firstRow[key];
        const type = typeof value;
        
        fieldAnalysis.fields[key] = {
          value: value,
          type: type,
          isNull: value === null,
          isEmpty: value === null || value === undefined || value === ''
        };
        
        // Identificar campos numéricos
        if (type === 'number' || (!isNaN(parseFloat(value)) && isFinite(value))) {
          fieldAnalysis.numericFields[key] = {
            value: value,
            asFloat: parseFloat(value) || 0,
            isZero: parseFloat(value) === 0
          };
        }
        
        // Identificar candidatos para Antigüedad
        const keyLower = key.toLowerCase();
        if (keyLower.includes('antiguedad') || keyLower.includes('fondo') || 
            (keyLower.includes('ant') && keyLower.includes('fondo'))) {
          fieldAnalysis.antiguedadCandidates.push({
            fieldName: key,
            value: value,
            type: type,
            asFloat: parseFloat(value) || 0
          });
        }
      });
      
      // Mostrar todos los registros para comparación
      const allRecords = result.rows.map(row => {
        const recordSummary = {
          fecpla: row.fecpla
        };
        
        // Añadir campos que parezcan de antigüedad
        Object.keys(row).forEach(key => {
          const keyLower = key.toLowerCase();
          if (keyLower.includes('antiguedad') || keyLower.includes('fondo') || 
              (keyLower.includes('ant') && keyLower.includes('fondo'))) {
            recordSummary[key] = row[key];
          }
        });
        
        return recordSummary;
      });
      
      console.log('✅ DEBUG FONDOS: Datos analizados exitosamente:', {
        rfc: rfc,
        records: result.rows.length,
        fields: fieldAnalysis.totalFields,
        antiguedadCandidates: fieldAnalysis.antiguedadCandidates.length
      });
      
      res.json({
        success: true,
        analysis: fieldAnalysis,
        allRecords: allRecords
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error en debug fondos endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TEMPORAL: Endpoint para debug - ver todos los campos disponibles
app.get('/api/debug/employee-fields', async (req, res) => {
  try {
    const { curp = 'AOMS920731HGTCRL07', cveper = '2025-06-25' } = req.query;
    
    console.log('🔍 DEBUG: Consultando campos para CURP:', curp, 'Período:', cveper);
    
    const { nominasPool } = require('./config/database');
    const client = await nominasPool.connect();
    
    try {
      let query = `
        SELECT *
        FROM historico_nominas_gsau
        WHERE "CURP" = $1
      `;
      
      const params = [curp];
      let paramIndex = 2;
      
      if (cveper) {
        if (cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
          query += ` AND DATE(cveper) = $${paramIndex}`;
          params.push(cveper);
        } else if (cveper.match(/^\d{4}-\d{2}$/)) {
          query += ` AND DATE_TRUNC('month', cveper) = $${paramIndex}`;
          params.push(`${cveper}-01`);
        } else {
          query += ` AND cveper = $${paramIndex}`;
          params.push(cveper);
        }
        paramIndex++;
      }
      
      query += ` ORDER BY cveper DESC LIMIT 1`;
      
      const result = await client.query(query, params);
      
      if (result.rows.length === 0) {
        return res.json({
          success: false,
          message: 'No se encontraron datos para el CURP especificado'
        });
      }
      
      const employeeData = result.rows[0];
      
      // Analizar todos los campos
      const fieldAnalysis = {
        totalFields: Object.keys(employeeData).length,
        fields: {},
        identificationFields: {},
        numericFields: {},
        textFields: {},
        nullFields: []
      };
      
      Object.keys(employeeData).forEach(key => {
        const value = employeeData[key];
        const type = typeof value;
        
        fieldAnalysis.fields[key] = {
          value: value,
          type: type,
          isNull: value === null,
          isEmpty: value === null || value === undefined || value === ''
        };
        
        // Clasificar campos de identificación
        const keyUpper = key.toUpperCase();
        if (keyUpper.includes('CURP') || keyUpper.includes('NOMBRE') || keyUpper.includes('APELLIDO') || 
            keyUpper.includes('PUESTO') || keyUpper.includes('COMPANIA') || keyUpper.includes('SUCURSAL') ||
            keyUpper.includes('EMPLEADO') || keyUpper.includes('RFC') || keyUpper.includes('CVEPER')) {
          fieldAnalysis.identificationFields[key] = fieldAnalysis.fields[key];
        }
        
        // Clasificar campos numéricos
        if (type === 'number') {
          fieldAnalysis.numericFields[key] = fieldAnalysis.fields[key];
        }
        
        // Clasificar campos de texto
        if (type === 'string') {
          fieldAnalysis.textFields[key] = fieldAnalysis.fields[key];
        }
        
        // Campos nulos
        if (value === null || value === undefined || value === '') {
          fieldAnalysis.nullFields.push(key);
        }
      });
      
      res.json({
        success: true,
        curp: curp,
        cveper: cveper,
        analysis: fieldAnalysis
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error en debug endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ENDPOINT PARA PAYROLL DATA VIEWER - Datos completos de empleado
// ============================================================================

// Obtener datos completos de nómina de un empleado específico por CURP y CVEPER
app.get('/api/payroll/employee-data', async (req, res) => {
  try {
    const { curp, cveper } = req.query;
    
    console.log('💼 /api/payroll/employee-data: Parámetros recibidos:', { curp, cveper });
    
    if (!curp) {
      return res.status(400).json({
        success: false,
        error: 'CURP es requerido'
      });
    }

    // Conectar directamente a la base de datos historico_nominas_gsau
    const { nominasPool } = require('./config/database');
    const client = await nominasPool.connect();
    
    try {
      let query = `
        SELECT *
        FROM historico_nominas_gsau
        WHERE "CURP" = $1
      `;
      
      const params = [curp];
      let paramIndex = 2;
      
      // Aplicar filtro de período si se proporciona
      if (cveper) {
        if (cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
          query += ` AND DATE(cveper) = $${paramIndex}`;
          params.push(cveper);
        } else if (cveper.match(/^\d{4}-\d{2}$/)) {
          query += ` AND DATE_TRUNC('month', cveper) = $${paramIndex}`;
          params.push(`${cveper}-01`);
        } else {
          query += ` AND cveper = $${paramIndex}`;
          params.push(cveper);
        }
        paramIndex++;
      }
      
      // Ordenar por período más reciente primero
      query += ` ORDER BY cveper DESC`;
      
      console.log('🔍 Query para datos de empleado:', query);
      console.log('📋 Parámetros:', params);
      
      const result = await client.query(query, params);
      
      if (result.rows.length === 0) {
        return res.json({
          success: true,
          data: null,
          message: cveper 
            ? `No se encontraron datos para CURP ${curp} en el período ${cveper}`
            : `No se encontraron datos para CURP ${curp}`
        });
      }

      // Tomar el primer resultado (más reciente si no se especificó período)
      const employeeData = result.rows[0];
      
      // Estructurar los datos según lo esperado por el componente
      const structuredData = {
        // Datos de identificación
        identification: {
          curp: employeeData.CURP,
          nombre: employeeData['Nombre completo'], // Usar el nombre correcto del campo
          apellidos: '', // No hay campos separados de apellidos, se incluyen en 'Nombre completo'
          numeroEmpleado: employeeData['Clave trabajador'], // Usar el campo correcto
          puesto: employeeData.Puesto,
          compania: employeeData['Compañía'], // Usar el campo correcto
          sucursal: employeeData.Sucursal,
          periodo: employeeData.cveper
        },
        
        // Percepciones - usar los nombres exactos de los campos
        percepciones: [],
        
        // Deducciones - usar los nombres exactos de los campos
        deducciones: [],
        
        // Totales
        totales: {
          totalPercepciones: 0,
          totalDeducciones: 0,
          netoAPagar: 0
        }
      };

      // Extraer percepciones usando los nombres exactos de los campos (incluyendo posibles espacios)
      const percepcionFields = [
        'SUELDO', 'HORAS EXTRA DOBLE', 'HORAS EXTRA TRIPLE', 'BONO', 'COMISIONES',
        'COMISIONES CLIENTE', 'COMISIONES FACTURADAS', 'PRIMA VACACIONAL', 
        'AGUINALDO', 'GRATIFICACION', 'PREMIO ASISTENCIA', 'PREMIO PUNTUALIDAD',
        'PRIMA DOMINICAL', 'PRIMA DE ANTIGÜEDAD', 'DIA FESTIVO TRABAJADO',
        'SEPTIMO DIA', 'VACACIONES PENDIENTES', 'DESTAJO', 'DESTAJO INFORMADO',
        'PTU', 'REGALÍAS', 'SUBSIDIO AL EMPLEO', 'SUBSIDIO POR INCAPACIDAD',
        'REINTEGRO ISR', 'COMPENSACION'
      ];
      
      // Función para buscar campo con posibles espacios extra
      const findFieldValue = (obj, targetField) => {
        // Buscar exacto primero
        if (obj[targetField] !== undefined) {
          return obj[targetField];
        }
        
        // Buscar con espacios extra al inicio
        if (obj[' ' + targetField] !== undefined) {
          return obj[' ' + targetField];
        }
        
        // Buscar en todas las claves que contengan el campo
        const keys = Object.keys(obj);
        for (const key of keys) {
          if (key.trim() === targetField.trim()) {
            return obj[key];
          }
        }
        
        return undefined;
      };
      
      percepcionFields.forEach(field => {
        const value = findFieldValue(employeeData, field);
        if (value !== undefined && value !== null && value !== '' && !isNaN(parseFloat(value)) && parseFloat(value) > 0) {
          structuredData.percepciones.push({
            concepto: field.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
            monto: parseFloat(value),
            codigo: field
          });
          structuredData.totales.totalPercepciones += parseFloat(value);
        }
      });
      
      // Extraer deducciones usando los nombres exactos de los campos (incluyendo posibles espacios)
      const deduccionFields = [
        'ISR', 'DESCUENTO IMSS', 'INFONAVIT', 'CUOTA SINDICAL', 'FONACOT',
        'PRESTAMOS PERSONALES', 'PRESTAMO FPL', 'PENSIÓN ALIMENTICIA',
        'PENSION ALIMENTICIA FPL', 'DESCUENTO POR UNIFORMES', 'DESCUENTOS VARIOS',
        'OTROS DESCUENTOS', 'RETARDOS', 'DESCUENTO INDEBIDO', 'ANTICIPO DE NOMINA',
        'APORTACION CAJA DE AHORRO', 'DESTRUCCION HERRAMIENTAS'
      ];
      
      deduccionFields.forEach(field => {
        const value = findFieldValue(employeeData, field);
        if (value !== undefined && value !== null && value !== '' && !isNaN(parseFloat(value)) && parseFloat(value) > 0) {
          structuredData.deducciones.push({
            concepto: field.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
            monto: parseFloat(value),
            codigo: field
          });
          structuredData.totales.totalDeducciones += parseFloat(value);
        }
      });
      
      // PRIORIZAR TOTALES DE LA BASE DE DATOS sobre cálculos individuales
      
      // Usar totales directos de la base de datos si están disponibles
      const dbTotalPercepciones = findFieldValue(employeeData, 'TOTAL DE PERCEPCIONES');
      const dbTotalDeducciones = findFieldValue(employeeData, 'TOTAL DEDUCCIONES');
      const dbNetoAPagar = findFieldValue(employeeData, 'NETO A PAGAR');
      
      if (dbTotalPercepciones && !isNaN(parseFloat(dbTotalPercepciones))) {
        structuredData.totales.totalPercepciones = parseFloat(dbTotalPercepciones);
      }
      
      if (dbTotalDeducciones && !isNaN(parseFloat(dbTotalDeducciones))) {
        structuredData.totales.totalDeducciones = parseFloat(dbTotalDeducciones);
      }
      
      if (dbNetoAPagar && !isNaN(parseFloat(dbNetoAPagar))) {
        structuredData.totales.netoAPagar = parseFloat(dbNetoAPagar);
      } else {
        // Solo calcular si no hay valor directo disponible
        structuredData.totales.netoAPagar = structuredData.totales.totalPercepciones - structuredData.totales.totalDeducciones;
      }
      
      // DEBUGGING TEMPORAL: Mostrar todos los campos disponibles
      console.log('🔍 DEBUG - Campos disponibles en employeeData:', Object.keys(employeeData));
      console.log('🔍 DEBUG - Primeros 10 campos y valores:');
      Object.keys(employeeData).slice(0, 10).forEach(key => {
        console.log(`   ${key}: ${employeeData[key]} (type: ${typeof employeeData[key]})`);
      });
      
      console.log('✅ /api/payroll/employee-data: Datos estructurados exitosamente:', {
        curp: structuredData.identification.curp,
        nombre: structuredData.identification.nombre,
        periodo: structuredData.identification.periodo,
        percepciones: structuredData.percepciones.length,
        deducciones: structuredData.deducciones.length,
        totalPercepciones: structuredData.totales.totalPercepciones,
        totalDeducciones: structuredData.totales.totalDeducciones,
        netoAPagar: structuredData.totales.netoAPagar
      });
      
      res.json({
        success: true,
        data: employeeData  // Devolver los datos raw completos en lugar de estructurados
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error obteniendo datos de empleado:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ENDPOINT DE PERCEPCIONES - Para componente Percepciones
// ============================================================================

// Obtener datos de percepciones de un empleado específico por CURP y CVEPER
app.get('/api/percepciones', async (req, res) => {
  try {
    const { curp, cveper, pageSize = '10', page = '1' } = req.query;
    
    console.log('💰 /api/percepciones: Parámetros recibidos:', { curp, cveper, pageSize, page });
    
    if (!curp) {
      return res.status(400).json({
        success: false,
        error: 'CURP es requerido'
      });
    }

    // Conectar directamente a la base de datos para obtener todos los campos
    const { nominasPool } = require('./config/database');
    const client = await nominasPool.connect();
    
    let query = `
      SELECT *
      FROM historico_nominas_gsau
      WHERE "CURP" = $1
    `;
    
    const params = [curp];
    let paramIndex = 2;
    
    // Aplicar filtro de período si se proporciona
    if (cveper) {
      if (cveper.match(/^\d{4}-\d{2}-\d{2}$/)) {
        query += ` AND DATE(cveper) = $${paramIndex}`;
        params.push(cveper);
      } else if (cveper.match(/^\d{4}-\d{2}$/)) {
        query += ` AND DATE_TRUNC('month', cveper) = $${paramIndex}`;
        params.push(`${cveper}-01`);
      } else {
        query += ` AND cveper = $${paramIndex}`;
        params.push(cveper);
      }
      paramIndex++;
    }
    
    // Ordenar por período más reciente primero
    query += ` ORDER BY cveper DESC LIMIT $${paramIndex}`;
    params.push(parseInt(pageSize));
    
    console.log('🔍 Query para percepciones:', query);
    console.log('📋 Parámetros:', params);
    
    const result = await client.query(query, params);
    client.release();
    
    console.log('✅ /api/percepciones: Datos completos obtenidos:', {
      records: result.rows?.length || 0,
      curp: curp,
      cveper: cveper || 'sin filtro de período',
      columnsCount: result.fields?.length || 0
    });
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: result.rows.length,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(result.rows.length / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo datos de percepciones:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NUEVO: Endpoint adicional /api/payroll/data para compatibilidad
app.get('/api/payroll/data', async (req, res) => {
  try {
    const { pageSize, page, search, puesto, compania, sucursal, status, puestoCategorizado, cveper, orderBy, orderDirection } = req.query;
    
    console.log('🔍 /api/payroll/data: Parámetros recibidos:', req.query);
    
    // Usar el mismo servicio que /api/payroll para consistencia
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
    
    console.log('✅ /api/payroll/data: Datos obtenidos exitosamente:', {
      records: result.data?.length || 0,
      total: result.pagination?.total || 0
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error en /api/payroll/data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// RUTA GENERAL DE PAYROLL - DEBE IR AL FINAL
// ============================================================================

// Obtener datos de empleados con filtros (sin autenticación para desarrollo)
app.get('/api/payroll', async (req, res) => {
  // Production debugging - log all request details
  console.log(' Production Debug - /api/payroll endpoint called');
  console.log(' Production Debug - Query params:', JSON.stringify(req.query, null, 2));
  console.log(' Production Debug - Environment:', process.env.NODE_ENV);
  console.log(' Production Debug - Full URL:', req.url);
  try {
    const { pageSize, page, search, puesto, compania, sucursal, status, puestoCategorizado, cveper, orderBy, orderDirection } = req.query;
    
    console.log('🔍 /api/payroll: Parámetros recibidos (RAW):', req.query);
    console.log('🔍 /api/payroll: Parámetros destructurados:', { 
      pageSize, page, search, puesto, compania, sucursal, status, 
      puestoCategorizado, cveper, orderBy, orderDirection 
    });
    
    // DEBUGGING ESPECIAL para cveper
    if (cveper) {
      console.log('🗓️ DEBUGGING CVEPER:', {
        cveper,
        tipoCveper: typeof cveper,
        esArray: Array.isArray(cveper),
        longitud: cveper.length,
        formatoYYYY_MM: /^\d{4}-\d{2}$/.test(cveper),
        formatoYYYY_MM_DD: /^\d{4}-\d{2}-\d{2}$/.test(cveper)
      });
    }
    
    // NUEVO: Usar payrollFilterService para un sorting más preciso
    const result = await payrollFilterService.getPayrollDataWithFiltersAndSorting({
      pageSize: parseInt(pageSize) || 100,
      page: parseInt(page) || 1,
      search,
      puesto,
      compania, // Para compatibilidad hacia atrás
      sucursal, // Para nuevo sistema de filtros
      status,
      puestoCategorizado,
      cveper,
      orderBy, // Campo por el cual ordenar
      orderDirection // Dirección del ordenamiento (asc/desc)
    });
    
    console.log('✅ /api/payroll: Datos obtenidos exitosamente:', {
      records: result.data?.length || 0,
      total: result.pagination?.total || 0
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error obteniendo datos de nómina:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TEMPORAL: Consultar tabla historico_fondos_gsau (sin autenticación para desarrollo)
app.get('/api/historico-fondos/check', async (req, res) => {
  try {
    const result = await fondosService.getHistoricoFondosData();
    res.json(result);
  } catch (error) {
    console.error('❌ Error consultando historico_fondos_gsau:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TEMPORAL: Listar todas las tablas de fondos (sin autenticación para desarrollo)
app.get('/api/fondos-tables/list', async (req, res) => {
  try {
    const result = await fondosService.getTables();
    res.json(result);
  } catch (error) {
    console.error('❌ Error obteniendo tablas de fondos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TEMPORAL: Consultar tabla fondos_data específicamente (sin autenticación para desarrollo)
app.get('/api/fondos-data/check', async (req, res) => {
  try {
    const result = await fondosService.getFondosDataInfo();
    res.json(result);
  } catch (error) {
    console.error('❌ Error consultando fondos_data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener datos de empleados con filtros (versión autenticada)
app.post('/api/nominas/employees', verifyToken, async (req, res) => {
  try {
    const filters = req.body;
    const result = await nominasService.getEmployeesData(filters);
    res.json(result);
  } catch (error) {
    console.error('❌ Error obteniendo datos de empleados:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// RUTAS DE FONDOS - Requiere autenticación + permiso can_view_funds
// ============================================================================

// Middleware para verificar permisos de fondos
const requireFundsPermission = requirePermission('view_funds');

// Obtener tablas disponibles en base de datos de fondos
app.get('/api/fondos/tables', verifyToken, requireFundsPermission, async (req, res) => {
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

// Obtener estructura de una tabla de fondos
app.get('/api/fondos/tables/:tableName/structure', verifyToken, requireFundsPermission, async (req, res) => {
  try {
    const { tableName } = req.params;
    const result = await fondosService.getTableStructure(tableName);
    res.json(result);
  } catch (error) {
    console.error('❌ Error obteniendo estructura de tabla de fondos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Consultar datos de una tabla de fondos
app.get('/api/fondos/tables/:tableName/data', verifyToken, requireFundsPermission, async (req, res) => {
  try {
    const { tableName } = req.params;
    const { limit, offset, orderBy, order, ...filters } = req.query;
    
    const where = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value && key !== 'limit' && key !== 'offset' && key !== 'orderBy' && key !== 'order') {
        where.push({
          column: key,
          value: value,
          operator: 'ILIKE'
        });
      }
    });
    
    const options = {
      limit,
      offset,
      orderBy,
      order,
      where: where.length > 0 ? where : undefined
    };
    
    const result = await fondosService.queryTable(tableName, options);
    res.json(result);
  } catch (error) {
    console.error('❌ Error consultando tabla de fondos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Buscar fondos
app.get('/api/fondos/search', verifyToken, requireFundsPermission, async (req, res) => {
  try {
    const { q: searchTerm, limit, offset } = req.query;
    
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro de búsqueda "q" es requerido'
      });
    }
    
    const result = await fondosService.searchFunds(searchTerm, { limit, offset });
    res.json(result);
  } catch (error) {
    console.error('❌ Error buscando fondos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener resumen financiero de fondos
app.get('/api/fondos/summary', verifyToken, requireFundsPermission, async (req, res) => {
  try {
    const result = await fondosService.getFinancialSummary();
    res.json(result);
  } catch (error) {
    console.error('❌ Error obteniendo resumen financiero:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener movimientos de fondos con filtros
app.get('/api/fondos/movements', verifyToken, requireFundsPermission, async (req, res) => {
  try {
    const { fechaInicio, fechaFin, tipoMovimiento, limit, offset } = req.query;
    
    const options = {
      fechaInicio,
      fechaFin,
      tipoMovimiento,
      limit,
      offset
    };
    
    const result = await fondosService.getMovements(options);
    res.json(result);
  } catch (error) {
    console.error('❌ Error obteniendo movimientos de fondos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener estadísticas de fondos
app.get('/api/fondos/stats', verifyToken, requireFundsPermission, async (req, res) => {
  try {
    const result = await fondosService.getStats();
    res.json(result);
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de fondos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// RUTAS ADMINISTRATIVAS - Solo para administradores
// ============================================================================

const requireAdminRole = requirePermission('admin');

// ============================================================================
// RUTAS CRUD PARA ADMINISTRACIÓN DE USUARIOS - Solo administradores
// ============================================================================

// 1. LISTAR TODOS LOS USUARIOS (Read All)
app.get('/api/admin/users', verifyToken, requireAdminRole, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    
    console.log('👥 Listando usuarios - Admin:', req.user);
    
    const { nominasPool } = require('./config/database');
    const client = await nominasPool.connect();
    
    try {
      let whereConditions = [];
      let params = [];
      let paramCount = 0;
      
      // Filtro por búsqueda (email, nombre o apellido)
      if (search && search.trim()) {
        paramCount++;
        whereConditions.push(`(
          email ILIKE $${paramCount} OR 
          first_name ILIKE $${paramCount} OR 
          last_name ILIKE $${paramCount}
        )`);
        params.push(`%${search.trim()}%`);
      }
      
      // Filtro por status
      if (status && status.trim()) {
        paramCount++;
        whereConditions.push(`status = $${paramCount}`);
        params.push(status.trim());
      }
      
      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';
      
      // Consulta para obtener total de registros
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM numerica_users 
        ${whereClause}
      `;
      
      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);
      
      // Consulta para obtener usuarios paginados
      const offset = (parseInt(page) - 1) * parseInt(limit);
      paramCount++;
      const offsetParam = paramCount;
      paramCount++;
      const limitParam = paramCount;
      
      const usersQuery = `
        SELECT id, email, first_name, last_name, phone_number, 
               status, phone_verified, created_at, updated_at, last_login, 
               user_role, login_count
        FROM numerica_users 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${limitParam} OFFSET $${offsetParam}
      `;
      
      const usersResult = await client.query(usersQuery, [...params, parseInt(limit), offset]);
      
      const users = usersResult.rows.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone_number,
        status: user.status,
        phoneVerified: user.phone_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login,
        userRole: user.user_role,
        loginCount: user.login_count
      }));
      
      console.log(`✅ Usuarios listados: ${users.length} de ${total}`);
      
      res.json({
        success: true,
        data: users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error listando usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 2. OBTENER UN USUARIO ESPECÍFICO (Read One)
app.get('/api/admin/users/:id', verifyToken, requireAdminRole, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 Obteniendo usuario por ID: ${id}`);
    
    const { nominasPool } = require('./config/database');
    const client = await nominasPool.connect();
    
    try {
      const query = `
        SELECT id, email, first_name, last_name, phone_number, 
               status, phone_verified, created_at, updated_at, last_login, 
               user_role, login_count, twofa_enabled, twofa_method, notes
        FROM numerica_users 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }
      
      const user = result.rows[0];
      
      console.log(`✅ Usuario encontrado: ${user.email}`);
      
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phoneNumber: user.phone_number,
          status: user.status,
          phoneVerified: user.phone_verified,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastLogin: user.last_login,
          userRole: user.user_role,
          loginCount: user.login_count,
          twofaEnabled: user.twofa_enabled,
          twofaMethod: user.twofa_method,
          notes: user.notes
        }
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error obteniendo usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 3. CREAR NUEVO USUARIO (Create)
app.post('/api/admin/users', verifyToken, requireAdminRole, async (req, res) => {
  try {
    const { email, firstName, lastName, phoneNumber, userRole = 'user', status = 'active' } = req.body;
    
    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Email, nombre y apellidos son requeridos'
      });
    }
    
    console.log(`➕ Creando nuevo usuario: ${email}`);
    
    const { nominasPool } = require('./config/database');
    const client = await nominasPool.connect();
    
    try {
      // Verificar si el email ya existe
      const checkQuery = `SELECT id FROM numerica_users WHERE email = $1`;
      const checkResult = await client.query(checkQuery, [email]);
      
      if (checkResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Ya existe un usuario con este email'
        });
      }
      
      // Crear nuevo usuario
      const insertQuery = `
        INSERT INTO numerica_users (
          email, first_name, last_name, phone_number, 
          status, user_role, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, email, first_name, last_name, phone_number, 
                 status, phone_verified, created_at, updated_at, user_role
      `;
      
      const result = await client.query(insertQuery, [
        email, firstName, lastName, phoneNumber || null, status, userRole
      ]);
      
      const newUser = result.rows[0];
      
      console.log(`✅ Usuario creado exitosamente: ${newUser.email}`);
      
      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          phoneNumber: newUser.phone_number,
          status: newUser.status,
          phoneVerified: newUser.phone_verified,
          createdAt: newUser.created_at,
          updatedAt: newUser.updated_at,
          userRole: newUser.user_role
        }
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 4. ACTUALIZAR USUARIO (Update)
app.put('/api/admin/users/:id', verifyToken, requireAdminRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phoneNumber, status, userRole, notes } = req.body;
    
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Nombre y apellidos son requeridos'
      });
    }
    
    console.log(`🔄 Actualizando usuario ID: ${id}`);
    
    const { nominasPool } = require('./config/database');
    const client = await nominasPool.connect();
    
    try {
      const updateQuery = `
        UPDATE numerica_users 
        SET first_name = $1, last_name = $2, phone_number = $3, 
            status = $4, user_role = $5, notes = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING id, email, first_name, last_name, phone_number, 
                 status, phone_verified, created_at, updated_at, 
                 user_role, notes
      `;
      
      const result = await client.query(updateQuery, [
        firstName, lastName, phoneNumber || null, 
        status, userRole, notes || null, id
      ]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }
      
      const updatedUser = result.rows[0];
      
      console.log(`✅ Usuario actualizado exitosamente: ${updatedUser.email}`);
      
      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          phoneNumber: updatedUser.phone_number,
          status: updatedUser.status,
          phoneVerified: updatedUser.phone_verified,
          createdAt: updatedUser.created_at,
          updatedAt: updatedUser.updated_at,
          userRole: updatedUser.user_role,
          notes: updatedUser.notes
        }
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error actualizando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 5. ELIMINAR USUARIO (Delete)
app.delete('/api/admin/users/:id', verifyToken, requireAdminRole, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Eliminando usuario ID: ${id}`);
    
    const { nominasPool } = require('./config/database');
    const client = await nominasPool.connect();
    
    try {
      // Primero verificar que el usuario existe y obtener su información
      const checkQuery = `
        SELECT id, email, user_role 
        FROM numerica_users 
        WHERE id = $1
      `;
      
      const checkResult = await client.query(checkQuery, [id]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }
      
      const userToDelete = checkResult.rows[0];
      
      // Prevenir eliminación de administradores (opcional)
      if (userToDelete.user_role === 'admin') {
        return res.status(403).json({
          success: false,
          error: 'No se puede eliminar un usuario administrador'
        });
      }
      
      // Eliminar el usuario
      const deleteQuery = `DELETE FROM numerica_users WHERE id = $1`;
      await client.query(deleteQuery, [id]);
      
      console.log(`✅ Usuario eliminado exitosamente: ${userToDelete.email}`);
      
      res.json({
        success: true,
        message: `Usuario ${userToDelete.email} eliminado exitosamente`
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 6. CAMBIAR STATUS DE USUARIO (Activar/Desactivar)
app.patch('/api/admin/users/:id/status', verifyToken, requireAdminRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status debe ser: active, inactive o suspended'
      });
    }
    
    console.log(`🔄 Cambiando status del usuario ID: ${id} a: ${status}`);
    
    const { nominasPool } = require('./config/database');
    const client = await nominasPool.connect();
    
    try {
      const updateQuery = `
        UPDATE numerica_users 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, email, status
      `;
      
      const result = await client.query(updateQuery, [status, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }
      
      const updatedUser = result.rows[0];
      
      console.log(`✅ Status actualizado: ${updatedUser.email} -> ${status}`);
      
      res.json({
        success: true,
        message: `Status del usuario actualizado a: ${status}`,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          status: updatedUser.status
        }
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error cambiando status del usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================================
// RUTAS DE AUTENTICACIÓN PÚBLICA - Registro y validación
// ============================================================================

// Validar si un email existe en numerica_users (para proceso de registro)
app.post('/api/auth/validate-email', async (req, res) => {
  console.log('📨 Handler /api/auth/validate-email ejecutándose');
  console.log('📦 Body recibido:', req.body);
  
  try {
    const { email } = req.body;
    
    if (!email) {
      console.log('❌ Email no proporcionado en el body');
      return res.status(400).json({
        success: false,
        error: 'Email es requerido'
      });
    }
    
    console.log('🔍 Validando email para registro:', email);
    
    const { nominasPool } = require('./config/database');
    const client = await nominasPool.connect();
    
    try {
      // Verificar si el email existe en numerica_users
      const query = 'SELECT id, email, status FROM numerica_users WHERE email = $1';
      const result = await client.query(query, [email]);
      
      if (result.rows.length === 0) {
        console.log('❌ Email no autorizado:', email);
        return res.status(403).json({
          success: false,
          error: 'Este correo electrónico no está autorizado para registrarse. Contacte al administrador.'
        });
      }
      
      const user = result.rows[0];
      
      console.log('📊 Status del usuario en DB:', user.status);
      
      // Solo permitir registro si el status es 'pending_setup'
      if (user.status !== 'pending_setup') {
        console.log('⚠️ Usuario ya registrado o no elegible. Status:', user.status);
        return res.status(409).json({
          success: false,
          error: 'Este correo ya tiene una cuenta registrada. Por favor inicia sesión.'
        });
      }
      
      // Verificar si el usuario tiene Cognito account existente
      const { CognitoIdentityProviderClient, AdminGetUserCommand, AdminDeleteUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
      const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
      
      try {
        const getUserCommand = new AdminGetUserCommand({
          UserPoolId: process.env.COGNITO_USER_POOL_ID,
          Username: email
        });
        
        await cognitoClient.send(getUserCommand);
        
        // Si llegamos aquí, el usuario ya existe en Cognito
        console.log('⚠️ Usuario ya existe en Cognito pero DB status es pending_setup');
        console.log('🗑️ Eliminando usuario de Cognito para permitir re-registro...');
        
        // Eliminar el usuario de Cognito para permitir re-registro
        const deleteUserCommand = new AdminDeleteUserCommand({
          UserPoolId: process.env.COGNITO_USER_POOL_ID,
          Username: email
        });
        
        await cognitoClient.send(deleteUserCommand);
        console.log('✅ Usuario eliminado de Cognito, puede proceder con el registro');
        
        // Permitir el registro
        res.json({
          success: true,
          message: 'Email autorizado para registro',
          user: {
            id: user.id,
            email: user.email
          }
        });
        
      } catch (cognitoError) {
        // Si es UserNotFoundException, significa que el usuario NO existe en Cognito
        if (cognitoError.name === 'UserNotFoundException') {
          console.log('✅ Email válido para registro (no existe en Cognito):', email);
          
          res.json({
            success: true,
            message: 'Email autorizado para registro',
            user: {
              id: user.id,
              email: user.email
            }
          });
        } else {
          // Otro error de Cognito, lo lanzamos
          throw cognitoError;
        }
      }
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error validando email:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Actualizar status del usuario después de registro exitoso en Cognito
app.post('/api/auth/confirm-registration', async (req, res) => {
  try {
    const { email, firstName, lastName, phoneNumber } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email es requerido'
      });
    }
    
    console.log('🔄 Confirmando registro para:', email);
    
    const { nominasPool } = require('./config/database');
    const client = await nominasPool.connect();
    
    try {
      // Actualizar usuario en numerica_users con datos del registro
      // Cambiar status de 'pending_setup' a 'pending_verification'
      const query = `
        UPDATE numerica_users 
        SET first_name = $1, 
            last_name = $2, 
            phone_number = $3,
            status = 'pending_verification',
            created_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE email = $4
        RETURNING id, email, first_name, last_name, status, created_at
      `;
      
      const result = await client.query(query, [
        firstName || null,
        lastName || null, 
        phoneNumber || null,
        email
      ]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }
      
      console.log('✅ Registro confirmado para:', email);
      
      res.json({
        success: true,
        message: 'Registro confirmado. Por favor verifica tu email.',
        user: result.rows[0]
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error confirmando registro:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Activar usuario después de verificación de email
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
    
    const { nominasPool } = require('./config/database');
    const client = await nominasPool.connect();
    
    try {
      const query = `
        UPDATE numerica_users 
        SET status = 'active',
            updated_at = CURRENT_TIMESTAMP
        WHERE email = $1
        RETURNING id, email, status
      `;
      
      const result = await client.query(query, [email]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }
      
      console.log('✅ Usuario activado:', email);
      
      res.json({
        success: true,
        message: 'Usuario activado exitosamente',
        user: result.rows[0]
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error activando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================================
// RUTAS DE PERFIL DE USUARIO - Usar solo header x-user-email
// ============================================================================

// Obtener perfil del usuario actual
app.get('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const userEmail = req.headers['x-user-email'];
    
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'Header x-user-email es requerido'
      });
    }

    console.log('\ud83d\udc64 Obteniendo perfil para usuario:', userEmail);

    // Conectar a PostgreSQL
    const { nominasPool } = require('./config/database');
    const client = await nominasPool.connect();

    try {
      // Buscar usuario en numerica_users
      const query = `
        SELECT id, email, first_name, last_name, phone_number, 
               status, phone_verified, created_at, updated_at, last_login
        FROM numerica_users 
        WHERE email = $1
      `;
      
      const result = await client.query(query, [userEmail]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const user = result.rows[0];
      
      console.log('\u2705 Perfil obtenido exitosamente para:', userEmail);
      
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phoneNumber: user.phone_number,
          status: user.status,
          phoneVerified: user.phone_verified,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastLogin: user.last_login
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('\u274c Error obteniendo perfil de usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Actualizar perfil del usuario actual
app.put('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const userEmail = req.headers['x-user-email'];
    const { firstName, lastName, phoneNumber } = req.body;
    
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'Header x-user-email es requerido'
      });
    }

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Nombre y apellidos son requeridos'
      });
    }

    console.log('\ud83d\udd04 Actualizando perfil para usuario:', userEmail, {
      firstName, lastName, phoneNumber
    });

    // Conectar a PostgreSQL
    const { nominasPool } = require('./config/database');
    const client = await nominasPool.connect();

    try {
      // Actualizar usuario en numerica_users
      const query = `
        UPDATE numerica_users 
        SET first_name = $1, last_name = $2, phone_number = $3, 
            updated_at = CURRENT_TIMESTAMP
        WHERE email = $4
        RETURNING id, email, first_name, last_name, phone_number, 
                 status, phone_verified, created_at, updated_at, last_login
      `;
      
      const result = await client.query(query, [firstName, lastName, phoneNumber || null, userEmail]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const user = result.rows[0];
      
      console.log('\u2705 Perfil actualizado exitosamente para:', userEmail);
      
      res.json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phoneNumber: user.phone_number,
          status: user.status,
          phoneVerified: user.phone_verified,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastLogin: user.last_login
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('\u274c Error actualizando perfil de usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Endpoint administrativo para pruebas
app.get('/api/admin/test', verifyToken, requireAdminRole, async (req, res) => {
  try {
    const [nominasStats, fondosStats] = await Promise.all([
      nominasService.getStats(),
      fondosService.getStats()
    ]);
    
    res.json({
      success: true,
      message: 'Acceso administrativo confirmado',
      user: req.user['cognito:username'],
      statistics: {
        nominas: nominasStats,
        fondos: fondosStats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error en endpoint administrativo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// RUTAS DE UPLOAD - Requiere autenticación
// ============================================================================

// Validar archivo Excel y detectar formato
app.post('/api/validate-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo'
      });
    }

    const result = await uploadService.validateFile(req.file.buffer, req.file.mimetype);
    
    if (result.success) {
      res.json({
        success: true,
        type: result.type,
        headers: result.headers,
        rowCount: result.rowCount,
        mappingValidation: result.mappingValidation,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('❌ Error validando archivo:', error);
    res.status(500).json({
      success: false,
      message: `Error del servidor: ${error.message}`
    });
  }
});

// Subir datos a la base de datos
app.post('/api/upload-data', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo'
      });
    }

    const { type } = req.body;
    
    if (!type || (type !== 'nominas' && type !== 'fondos')) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de archivo no válido. Debe ser "nominas" o "fondos"'
      });
    }

    console.log(`📁 Procesando archivo de ${type}: ${req.file.originalname}`);
    
    const result = await uploadService.uploadData(req.file.buffer, type, req.file.mimetype);
    
    if (result.success) {
      console.log(`✅ Upload exitoso: ${result.recordsInserted} registros insertados`);
      res.json({
        success: true,
        recordsInserted: result.recordsInserted,
        duplicatesSkipped: result.duplicatesSkipped,
        errors: result.errors || [],
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('❌ Error subiendo datos:', error);
    res.status(500).json({
      success: false,
      message: `Error del servidor: ${error.message}`
    });
  }
});

// ============================================================================
// MANEJO DE ERRORES GLOBAL
// ============================================================================

// Manejo global de errores (debe estar antes que las rutas no encontradas)
app.use((error, req, res, next) => {
  console.error('❌ Error global capturado:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// Manejo de rutas no encontradas (debe estar al final)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method
  });
});

// ============================================================================
// INICIO DEL SERVIDOR
// ============================================================================

const startServer = async () => {
  try {
    // Probar conexiones a las bases de datos
    console.log('🔄 Probando conexiones a bases de datos...');
    const connections = await testConnections();
    
    console.log('✅ Estado de conexiones:');
    Object.entries(connections).forEach(([db, status]) => {
      console.log(`   ${db}: ${status.success ? '✅ Conectado' : '❌ Error - ' + status.error}`);
    });
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor API ejecutándose en puerto ${PORT}`);
      console.log(`🌐 URL base: http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`ℹ️  Info de API: http://localhost:${PORT}/api/info`);
      console.log(`🔒 Rutas protegidas requieren JWT token de AWS Cognito`);
      console.log(`📝 Logs: ${new Date().toISOString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
};

// Inicializar servidor
startServer();

// Manejo graceful de cierre
process.on('SIGTERM', () => {
  console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT (Ctrl+C), cerrando servidor...');
  process.exit(0);
});

module.exports = app;

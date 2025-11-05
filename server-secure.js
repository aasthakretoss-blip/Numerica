const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

// Import middleware
const { authenticate, requirePermission, logAuthenticatedRequest } = require('./middleware/auth');
const { securityLogger, getSecurityConfig, rateLimiters, helmetConfig } = require('./middleware/production-security');

const app = express();

// ================================
// CONFIGURACIÓN DE SEGURIDAD
// ================================

// Get security configuration based on environment
const securityConfig = getSecurityConfig();

// Security headers with Helmet
app.use(helmet(helmetConfig));

// Security logging for all requests
app.use(securityLogger);

// Rate limiting
if (securityConfig.rateLimiting) {
  // General rate limiting
  app.use(rateLimiters.general);
  
  // Specific rate limiting for auth endpoints
  app.use('/auth', rateLimiters.auth);
  app.use('/login', rateLimiters.auth);
  
  // Upload rate limiting
  app.use('/upload', rateLimiters.upload);
  app.use('/api/upload', rateLimiters.upload);
}

// CORS configuration
app.use(cors(securityConfig.cors));

// JSON parsing with limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// ================================
// VALIDACIONES DE INPUT
// ================================

// Validation middleware creator
const createValidation = (rules) => [
  ...rules,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn('⚠️ Validation failed:', errors.array());
      return res.status(400).json({
        error: 'Datos inválidos',
        code: 'VALIDATION_ERROR',
        details: process.env.NODE_ENV === 'development' ? errors.array() : undefined
      });
    }
    next();
  }
];

// Common validation rules
const emailValidation = body('email').isEmail().normalizeEmail();
const passwordValidation = body('password')
  .isLength({ min: 8 })
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/);
const roleValidation = body('role').optional().isIn(['admin', 'user', 'viewer']);

// Sanitization for XSS protection
const sanitizeInput = body('*').escape();

// ================================
// HEALTH CHECK & INFO
// ================================

app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    authentication: {
      cognitoConfigured: !!(process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID),
      productionMode: process.env.NODE_ENV === 'production'
    }
  };
  
  res.json(healthStatus);
});

app.get('/security-status', (req, res) => {
  res.json({
    environment: process.env.NODE_ENV || 'development',
    features: {
      rateLimiting: securityConfig.rateLimiting,
      securityHeaders: securityConfig.securityHeaders,
      requestValidation: securityConfig.requestValidation,
      securityLogging: securityConfig.securityLogging
    },
    authentication: {
      cognitoConfigured: !!(process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID),
      bypassActive: process.env.NODE_ENV !== 'production' && !process.env.COGNITO_USER_POOL_ID
    }
  });
});

// ================================
// RUTAS PÚBLICAS (sin autenticación)
// ================================

// Test endpoint para verificar que el servidor funciona
app.get('/', (req, res) => {
  res.json({
    message: 'Numerica API - Sistema de Nóminas',
    version: '2.0.0-secure',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// ================================
// RUTAS PROTEGIDAS (con autenticación)
// ================================

// Apply authentication to all API routes
app.use('/api', authenticate);
app.use('/api', logAuthenticatedRequest);

// Basic API info (requires auth)
app.get('/api/info', (req, res) => {
  res.json({
    message: 'API autenticada funcionando',
    user: {
      email: req.user.email,
      role: req.user.permissions.role,
      permissions: req.user.permissions
    },
    timestamp: new Date().toISOString()
  });
});

// ================================
// RUTAS ADMINISTRATIVAS
// ================================

// Admin routes (require admin permission)
app.use('/api/admin', requirePermission('admin'));

app.get('/api/admin/users', (req, res) => {
  // TODO: Implement user management
  res.json({
    message: 'Lista de usuarios (pendiente implementación)',
    requester: {
      email: req.user.email,
      role: req.user.permissions.role
    }
  });
});

// ================================
// RUTAS DE NÓMINAS
// ================================

// Payroll routes (require appropriate permissions)
app.get('/api/payroll', requirePermission('view_funds'), (req, res) => {
  // TODO: Connect to actual payroll service
  res.json({
    message: 'Datos de nómina (conectar a servicio real)',
    user: req.user.email,
    timestamp: new Date().toISOString()
  });
});

// Upload routes (require upload permission)
app.post('/api/upload', 
  requirePermission('upload'),
  createValidation([
    body('filename').notEmpty().isLength({ max: 255 }),
    sanitizeInput
  ]),
  (req, res) => {
    // TODO: Implement secure file upload
    res.json({
      message: 'Upload endpoint (implementar funcionalidad)',
      filename: req.body.filename,
      user: req.user.email,
      timestamp: new Date().toISOString()
    });
  }
);

// ================================
// ERROR HANDLING
// ================================

// 404 handler
app.use('*', (req, res) => {
  console.warn(`⚠️ 404: ${req.method} ${req.originalUrl} from ${req.ip}`);
  res.status(404).json({
    error: 'Endpoint no encontrado',
    code: 'NOT_FOUND',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err);
  
  // Don't expose error details in production
  const errorDetails = process.env.NODE_ENV === 'production' 
    ? 'Error interno del servidor'
    : err.message;
  
  res.status(500).json({
    error: 'Error interno del servidor',
    code: 'INTERNAL_ERROR',
    details: errorDetails
  });
});

// ================================
// SERVER STARTUP
// ================================

const PORT = process.env.PORT || 3001;

// Security startup checks
function performSecurityChecks() {
  const checks = {
    nodeEnv: process.env.NODE_ENV || 'development',
    cognitoConfigured: !!(process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID),
    productionReady: false
  };
  
  console.log('\n🛡️ VERIFICACIÓN DE SEGURIDAD:');
  console.log('================================');
  console.log(`🔧 Ambiente: ${checks.nodeEnv}`);
  
  if (checks.nodeEnv === 'production') {
    if (!checks.cognitoConfigured) {
      console.error('🚨 CRÍTICO: Cognito no configurado en producción');
      console.error('🚨 SERVIDOR NO DEBE INICIARSE EN PRODUCCIÓN');
      process.exit(1);
    } else {
      console.log('✅ Cognito configurado correctamente');
      checks.productionReady = true;
    }
  } else {
    if (checks.cognitoConfigured) {
      console.log('✅ Cognito configurado para desarrollo');
    } else {
      console.warn('⚠️ Cognito no configurado - usando modo desarrollo');
      console.warn('⚠️ NO USAR EN PRODUCCIÓN');
    }
  }
  
  console.log(`🔒 Rate limiting: ${securityConfig.rateLimiting ? 'ACTIVO' : 'DESACTIVADO'}`);
  console.log(`🛡️ Security headers: ${securityConfig.securityHeaders ? 'ACTIVOS' : 'DESACTIVADOS'}`);
  console.log(`📋 Request validation: ${securityConfig.requestValidation ? 'ACTIVA' : 'DESACTIVADA'}`);
  console.log(`📊 Security logging: ${securityConfig.securityLogging ? 'ACTIVO' : 'DESACTIVADO'}`);
  
  if (checks.nodeEnv === 'production' && checks.productionReady) {
    console.log('✅ LISTO PARA PRODUCCIÓN');
  } else if (checks.nodeEnv !== 'production') {
    console.log('🔧 MODO DESARROLLO');
  }
  
  console.log('================================\n');
  
  return checks;
}

// Start server
const securityStatus = performSecurityChecks();

app.listen(PORT, () => {
  console.log(`🚀 Numerica API Server iniciado en puerto ${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🛡️ Seguridad: ${securityStatus.productionReady ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n📋 Endpoints disponibles:');
    console.log('  GET  /                    - Info básica');
    console.log('  GET  /health              - Health check');
    console.log('  GET  /security-status     - Estado de seguridad');
    console.log('  GET  /api/info           - Info autenticada');
    console.log('  GET  /api/admin/users    - Gestión usuarios (admin)');
    console.log('  GET  /api/payroll        - Datos nómina');
    console.log('  POST /api/upload         - Subir archivos');
  }
  
  console.log('\n✅ Servidor listo y ejecutándose de forma segura');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🔄 Cerrando servidor de forma segura...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🔄 Cerrando servidor de forma segura...');
  process.exit(0);
});

module.exports = app;

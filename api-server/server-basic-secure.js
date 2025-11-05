const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import middleware
const { authenticate, requirePermission } = require('./middleware/auth');

const app = express();

// Basic security
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'Numerica API - Servidor Seguro Básico',
    version: '2.0.0-secure-basic',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    security: {
      bypassEliminated: true,
      authConfigured: !!(process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID)
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    security: {
      authConfigured: !!(process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID),
      productionMode: process.env.NODE_ENV === 'production'
    }
  });
});

// Protected routes
app.use('/api', authenticate);

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

// Admin route
app.get('/api/admin/test', requirePermission('admin'), (req, res) => {
  res.json({
    message: '¡Ruta de administrador funcionando!',
    user: {
      email: req.user.email,
      role: req.user.permissions.role
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 3001;

// Security checks
function checkSecurity() {
  console.log('\n🛡️ VERIFICACIÓN DE SEGURIDAD:');
  console.log('================================');
  console.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  
  const cognitoConfigured = !!(process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID);
  console.log(`🔒 Cognito: ${cognitoConfigured ? 'CONFIGURADO' : 'NO CONFIGURADO'}`);
  
  if (process.env.NODE_ENV === 'production' && !cognitoConfigured) {
    console.error('🚨 CRÍTICO: Cognito no configurado en producción');
    console.error('🚨 SERVIDOR NO DEBE INICIARSE');
    process.exit(1);
  }
  
  console.log('✅ Bypass de desarrollo: ELIMINADO');
  console.log('✅ Validación de producción: ACTIVA');
  console.log('================================\n');
  
  return cognitoConfigured;
}

// Start server
const securityOK = checkSecurity();

app.listen(PORT, () => {
  console.log(`🚀 Numerica API Server iniciado en puerto ${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🛡️ Estado: ${securityOK ? 'SEGURO' : 'DESARROLLO'}`);
  
  console.log('\n📋 Endpoints disponibles:');
  console.log('  GET  /                    - Info básica');
  console.log('  GET  /health              - Health check');
  console.log('  GET  /api/info           - Info autenticada');
  console.log('  GET  /api/admin/test     - Test admin');
  
  console.log('\n✅ Servidor básico seguro funcionando');
});

module.exports = app;

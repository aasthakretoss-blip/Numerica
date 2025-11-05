const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnections } = require('./config/database');
const nominasService = require('./services/nominasService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware global
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración CORS permisiva para desarrollo
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
};
app.use(cors(corsOptions));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// RUTAS PÚBLICAS PARA DESARROLLO
// ============================================================================

// Health check
app.get('/health', async (req, res) => {
  try {
    const connections = await testConnections();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      connections: connections,
      environment: 'development'
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
    name: 'Historic Data API - Development',
    version: '1.0.0-dev',
    description: 'API para consultar datos históricos de nóminas (modo desarrollo)',
    note: 'Servidor de desarrollo sin autenticación'
  });
});

// Obtener datos de empleados con filtros
app.get('/api/payroll', async (req, res) => {
  try {
    const { pageSize, page, search, puesto, compania, status } = req.query;
    const result = await nominasService.getPayrollData({
      pageSize: parseInt(pageSize) || 100,
      page: parseInt(page) || 1,
      search,
      puesto,
      compania,
      status
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

// Obtener estadísticas completas del dataset
app.get('/api/payroll/stats', async (req, res) => {
  try {
    const result = await nominasService.getDatasetStats();
    res.json(result);
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas del dataset:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener tablas disponibles
app.get('/api/nominas/tables', async (req, res) => {
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

// Obtener estructura de tabla
app.get('/api/nominas/tables/:tableName/structure', async (req, res) => {
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

// Consultar datos de tabla
app.get('/api/nominas/tables/:tableName/data', async (req, res) => {
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

// ============================================================================
// MANEJO DE ERRORES GLOBAL
// ============================================================================

app.use((error, req, res, next) => {
  console.error('❌ Error global capturado:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message,
    stack: error.stack
  });
});

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
    console.log('🔄 Probando conexiones a bases de datos...');
    const connections = await testConnections();
    
    console.log('✅ Estado de conexiones:');
    Object.entries(connections).forEach(([db, status]) => {
      console.log(`   ${db}: ${status.success ? '✅ Conectado' : '❌ Error - ' + status.error}`);
    });
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor API DEV ejecutándose en puerto ${PORT}`);
      console.log(`🌐 URL base: http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`ℹ️  Info de API: http://localhost:${PORT}/api/info`);
      console.log(`🔓 MODO DESARROLLO: Sin autenticación requerida`);
      console.log(`📝 Logs: ${new Date().toISOString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();

process.on('SIGTERM', () => {
  console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT (Ctrl+C), cerrando servidor...');
  process.exit(0);
});

module.exports = app;

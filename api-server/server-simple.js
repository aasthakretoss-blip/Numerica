const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnections } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware global
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración CORS
const corsOptions = {
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas básicas
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

app.get('/api/info', (req, res) => {
  res.json({
    name: 'GSAU Historical Data API (Simple)',
    version: '1.0.0',
    description: 'API para consultar datos históricos de nóminas y fondos',
    status: 'Testing'
  });
});

// Iniciar servidor
const startServer = async () => {
  try {
    console.log('🔄 Probando conexiones a bases de datos...');
    const connections = await testConnections();
    
    console.log('✅ Estado de conexiones:');
    Object.entries(connections).forEach(([db, status]) => {
      console.log(`   ${db}: ${status.success ? '✅ Conectado' : '❌ Error - ' + status.error}`);
    });
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor API (Simple) ejecutándose en puerto ${PORT}`);
      console.log(`🌐 URL base: http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`ℹ️  Info de API: http://localhost:${PORT}/api/info`);
    });
    
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();

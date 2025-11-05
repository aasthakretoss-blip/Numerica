const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importar los servicios existentes desde el directorio padre
const payrollFilterService = require('../services/payrollFilterService');
const fondosService = require('../services/fondosService');

const app = express();
const PORT = 3001; // Puerto diferente al frontend

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000', // Tu frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-email', 'x-api-key'],
  credentials: true
}));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Query params:', req.query);
  next();
});

// ============================================================================
// RUTAS SIN AUTENTICACIÓN PARA DESARROLLO
// ============================================================================

app.get('/', (req, res) => {
  res.json({
    service: 'Numerica API - LOCAL DEV',
    status: 'running',
    environment: 'development',
    timestamp: new Date().toISOString(),
    frontend: 'http://localhost:3000'
  });
});

// Endpoint principal - SIN AUTENTICACIÓN para desarrollo
app.get('/api/payroll', async (req, res) => {
  try {
    console.log('🎯 LOCAL DEV: /api/payroll llamado con parámetros:', req.query);
    
    const result = await payrollFilterService.getPayrollDataWithFiltersAndSorting(req.query);
    
    console.log('✅ LOCAL DEV: Respuesta exitosa:', {
      records: result.data?.length || 0,
      total: result.pagination?.total || 0,
      curp: req.query.curp || 'No especificado'
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ LOCAL DEV: Error en /api/payroll:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      dev_note: 'Error en desarrollo local'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK - LOCAL DEV',
    timestamp: new Date().toISOString(),
    database: 'AWS RDS (online)',
    frontend: 'http://localhost:3000',
    api: `http://localhost:${PORT}`
  });
});

// Stats endpoint
app.get('/api/payroll/stats', async (req, res) => {
  try {
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

// Períodos endpoint
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

// Filter options endpoint
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

// ============================================================================
// ENDPOINTS DE FONDOS FPL - LOCAL DEV
// ============================================================================

// Endpoint para datos FPL por RFC
app.get('/api/fondos/debug-rfc', async (req, res) => {
  try {
    const { rfc, cveper } = req.query;
    
    console.log('🏦 LOCAL DEV: Consultando FPL data para RFC:', rfc, 'Fecha:', cveper);
    
    if (!rfc) {
      return res.json({
        success: false,
        error: 'RFC parameter is required',
        debug: 'No RFC provided - LOCAL DEV'
      });
    }

    const result = await fondosService.getFPLDataByRFC(rfc, cveper);
    console.log('✅ LOCAL DEV: Resultado FPL obtenido:', result);
    
    res.json({
      success: true,
      debug: 'Endpoint funcionando en desarrollo local',
      originalResult: result
    });
  } catch (error) {
    console.error('❌ LOCAL DEV: Error en FPL data:', error);
    res.status(500).json({
      success: false,
      debug: 'Error capturado en desarrollo local',
      error: error.message,
      stack: error.stack
    });
  }
});

// Endpoint para fechas FPL calculadas
app.get('/api/fondos/debug-fechas-fpl', async (req, res) => {
  try {
    const { rfc } = req.query;
    
    console.log('📅 LOCAL DEV: Calculando fechas FPL para RFC:', rfc);
    
    if (!rfc) {
      return res.json({
        success: false,
        error: 'RFC parameter is required',
        debug: 'No RFC provided - LOCAL DEV'
      });
    }

    const fechasFPL = await fondosService.getFechasFPLCalculadas(rfc);
    console.log('✅ LOCAL DEV: Fechas FPL calculadas:', fechasFPL);
    
    res.json({
      success: true,
      debug: 'Fechas FPL calculadas en desarrollo local',
      fechasFPL: fechasFPL,
      rfc: rfc
    });
  } catch (error) {
    console.error('❌ LOCAL DEV: Error calculando fechas FPL:', error);
    res.status(500).json({
      success: false,
      debug: 'Error en cálculo de fechas FPL - LOCAL DEV',
      error: error.message,
      stack: error.stack
    });
  }
});

// Endpoint para información de tabla historico_fondos_gsau
app.get('/api/fondos/historico-fondos-gsau', async (req, res) => {
  try {
    console.log('📊 LOCAL DEV: Consultando información de historico_fondos_gsau');
    
    const result = await fondosService.getHistoricoFondosData();
    console.log('✅ LOCAL DEV: Información de tabla obtenida:', result);
    
    res.json(result);
  } catch (error) {
    console.error('❌ LOCAL DEV: Error consultando tabla:', error);
    res.status(500).json({
      success: false,
      debug: 'Error consultando historico_fondos_gsau - LOCAL DEV',
      error: error.message
    });
  }
});

// Catch all para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found - LOCAL DEV',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: [
      'GET /',
      'GET /health',
      'GET /api/payroll',
      'GET /api/payroll/stats',
      'GET /api/payroll/periodos',
      'GET /api/payroll/filter-options',
      'GET /api/fondos/debug-rfc',
      'GET /api/fondos/debug-fechas-fpl',
      'GET /api/fondos/historico-fondos-gsau'
    ]
  });
});

// Error handler global
app.use((error, req, res, next) => {
  console.error('🚨 Error global en LOCAL DEV:', error);
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error',
    dev_note: 'Error en desarrollo local'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('\n🚀 ===== SERVIDOR LOCAL DE DESARROLLO =====');
  console.log(`✅ API corriendo en: http://localhost:${PORT}`);
  console.log(`✅ Frontend en: http://localhost:3000`);
  console.log(`✅ Base de datos: AWS RDS (en línea)`);
  console.log(`✅ Sin autenticación (solo desarrollo)`);
  console.log('\n📋 Endpoints disponibles:');
  console.log(`   GET  http://localhost:${PORT}/`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   GET  http://localhost:${PORT}/api/payroll`);
  console.log(`   GET  http://localhost:${PORT}/api/payroll/stats`);
  console.log('\n🔥 ¡Listo para desarrollo! Ctrl+C para detener\n');
});

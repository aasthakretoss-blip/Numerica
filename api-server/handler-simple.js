require('dotenv').config();

const { testConnections } = require('./config/database');
const payrollFilterService = require('./services/payrollFilterService');

// Handler simple para Lambda sin Express
module.exports.handler = async (event, context) => {
  console.log('📨 Event received:', JSON.stringify(event, null, 2));
  
  // Headers por defecto para CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-email, x-api-key'
  };

  try {
    // Obtener el path y método HTTP
    const path = event.pathParameters ? event.pathParameters.proxy : event.path || '';
    const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
    const queryParams = event.queryStringParameters || {};
    
    console.log(`📍 ${method} /${path}`);

    // Manejar OPTIONS para CORS
    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'OK' })
      };
    }

    // Root endpoint
    if (!path || path === '' || path === '/') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          service: 'Numerica API',
          status: 'running',
          environment: process.env.NODE_ENV || 'production',
          timestamp: new Date().toISOString()
        })
      };
    }

    // Health check
    if (path === 'health' || path === 'api/health') {
      try {
        const connections = await testConnections();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'OK',
            timestamp: new Date().toISOString(),
            connections: connections,
            environment: process.env.NODE_ENV || 'production',
            region: process.env.AWS_REGION || 'us-east-1'
          })
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            status: 'ERROR',
            message: error.message,
            timestamp: new Date().toISOString()
          })
        };
      }
    }

    // API Info
    if (path === 'api/info') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
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
        })
      };
    }

    // Payroll stats
    if (path === 'api/payroll/stats') {
      try {
        const stats = await payrollFilterService.getPayrollStats();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: stats
          })
        };
      } catch (error) {
        console.error('❌ Error obteniendo stats:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: error.message
          })
        };
      }
    }

    // Payroll periods
    if (path === 'api/payroll/periodos') {
      try {
        const periods = await payrollFilterService.getAvailablePeriods();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: periods
          })
        };
      } catch (error) {
        console.error('❌ Error obteniendo períodos:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: error.message
          })
        };
      }
    }

    // Payroll data
    if (path === 'api/payroll') {
      try {
        const result = await payrollFilterService.getPayrollDataWithFiltersAndSorting(queryParams);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result)
        };
      } catch (error) {
        console.error('❌ Error en /api/payroll:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: error.message
          })
        };
      }
    }

    // Payroll demographics (nuevo endpoint para el dashboard)
    if (path === 'api/payroll/demographic') {
      try {
        const result = await payrollFilterService.getPayrollDataWithFiltersAndSorting(queryParams);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result)
        };
      } catch (error) {
        console.error('❌ Error en /api/payroll/demographic:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: error.message
          })
        };
      }
    }

    // Payroll unique count 
    if (path === 'api/payroll/demographic/unique-count') {
      try {
        const result = await payrollFilterService.getUniqueEmployeeCount(queryParams);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            uniqueCurpCount: result.uniqueCurpCount || 0,
            uniqueMaleCount: result.uniqueMaleCount || 0,
            uniqueFemaleCount: result.uniqueFemaleCount || 0
          })
        };
      } catch (error) {
        console.error('❌ Error en unique count:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: error.message
          })
        };
      }
    }

    // 404 para rutas no encontradas
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: 'Endpoint not found',
        path: `/${path}`,
        method: method
      })
    };

  } catch (error) {
    console.error('🚨 Error global:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      })
    };
  }
};

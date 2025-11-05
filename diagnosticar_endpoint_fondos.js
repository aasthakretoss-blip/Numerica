// Diagnóstico del endpoint /api/fondos/data-from-rfc
const axios = require('axios');

const API_BASE_URL = 'https://wgx1txkom8.execute-api.us-east-1.amazonaws.com/dev';
const TEST_RFC = 'AOHM980311PY9';

// Función para obtener token de autenticación (simulado)
async function getAuthToken() {
    // En producción, esto debería obtener el token real de AWS Cognito
    // Por ahora usamos un valor temporal para testing
    return 'test-token-for-debugging';
}

async function testEndpoint() {
    console.log('🔍 DIAGNÓSTICO DEL ENDPOINT /api/fondos/data-from-rfc');
    console.log('=' * 60);
    
    try {
        // Test 1: Verificar que el endpoint base funciona
        console.log('\n📡 Test 1: Verificando endpoint base...');
        
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ Health check OK:', healthResponse.data);
        
        // Test 2: Verificar endpoint de info
        console.log('\n📡 Test 2: Verificando info de la API...');
        
        const infoResponse = await axios.get(`${API_BASE_URL}/api/info`);
        console.log('✅ API info OK:', infoResponse.data);
        
        // Test 3: Verificar endpoint protegido con token
        console.log('\n📡 Test 3: Verificando endpoint /api/fondos/data-from-rfc...');
        
        const token = await getAuthToken();
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        try {
            const fondosResponse = await axios.get(
                `${API_BASE_URL}/api/fondos/data-from-rfc?rfc=${TEST_RFC}`,
                { headers }
            );
            console.log('✅ Endpoint fondos OK:', fondosResponse.data);
        } catch (error) {
            console.log('❌ Error en endpoint fondos:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
        }
        
        // Test 4: Verificar endpoints disponibles
        console.log('\n📡 Test 4: Listando todos los endpoints disponibles...');
        
        try {
            const endpoints = [
                '/api/fondos/tables',
                '/api/fondos/historico-fondos-gsau',
                '/api/fondos/data-from-rfc',
                '/api/payroll',
                '/health'
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await axios.get(`${API_BASE_URL}${endpoint}`, { 
                        headers,
                        timeout: 5000
                    });
                    console.log(`✅ ${endpoint}: OK (${response.status})`);
                } catch (err) {
                    console.log(`❌ ${endpoint}: Error (${err.response?.status || err.code})`);
                }
            }
        } catch (error) {
            console.log('❌ Error listando endpoints:', error.message);
        }
        
        // Test 5: Verificar configuración de CORS
        console.log('\n📡 Test 5: Verificando configuración CORS...');
        
        try {
            const corsResponse = await axios.options(
                `${API_BASE_URL}/api/fondos/data-from-rfc`,
                { headers }
            );
            console.log('✅ CORS OK:', corsResponse.headers);
        } catch (error) {
            console.log('❌ Error CORS:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Error general en diagnóstico:', error.message);
    }
}

// Función para verificar logs del Lambda (si fuera posible)
async function checkLambdaLogs() {
    console.log('\n📡 Test: Simulando logs del Lambda...');
    
    // Simulamos los logs que esperaríamos ver
    console.log('Esperaríamos ver estos logs en CloudWatch:');
    console.log('- "Conectado a la base de datos de fondos"');
    console.log('- "Consultando FPL data para RFC: AOHM980311PY9"');
    console.log('- "Ejecutando consulta FPL: SELECT * FROM historico_fondos_gsau..."');
    console.log('- "Datos FPL encontrados: X registros"');
}

// Función para sugerir soluciones
function suggestSolutions() {
    console.log('\n🔧 POSIBLES SOLUCIONES:');
    console.log('=' * 40);
    
    console.log('1. ❌ El endpoint no está implementado en el handler actual');
    console.log('   Solución: Agregar la ruta en api-deploy/handler.js');
    
    console.log('2. ❌ Variables de entorno no configuradas');
    console.log('   Solución: Verificar DB_FONDOS, DB_HOST, etc. en Lambda');
    
    console.log('3. ❌ Problemas de conexión a la base de datos');
    console.log('   Solución: Verificar VPC y Security Groups');
    
    console.log('4. ❌ El servicio fondosService no está funcionando');
    console.log('   Solución: Revisar logs de CloudWatch');
    
    console.log('5. ❌ Token de autenticación inválido');
    console.log('   Solución: Verificar configuración de AWS Cognito');
}

// Función principal
async function main() {
    await testEndpoint();
    await checkLambdaLogs();
    suggestSolutions();
    
    console.log('\n🎯 CONCLUSIÓN:');
    console.log('El endpoint /api/fondos/data-from-rfc está devolviendo 404.');
    console.log('Esto indica que la ruta no existe o no está correctamente configurada.');
    console.log('Revisar el archivo api-deploy/handler.js y las variables de entorno.');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    testEndpoint,
    checkLambdaLogs,
    suggestSolutions
};

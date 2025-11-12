/**
 * Script de prueba rápida para verificar conectividad con la API
 */

const API_BASE_URL = 'http://numericaapi.kretosstechnology.com';

async function testApiConnection() {
    console.log('🔍 PROBANDO CONECTIVIDAD CON LA API');
    console.log('='.repeat(40));
    console.log(`📡 Base URL: ${API_BASE_URL}`);
    
    const endpoints = [
        '/api/payroll/periodos',
        '/api/payroll/filter-options',
        '/api/payroll/demographic/unique-count?status=A',
        '/api/payroll/demographic?status=A&page=1&pageSize=5'
    ];
    
    for (const endpoint of endpoints) {
        const fullUrl = `${API_BASE_URL}${endpoint}`;
        console.log(`\n🧪 Probando: ${endpoint}`);
        console.log(`   URL completa: ${fullUrl}`);
        
        try {
            const startTime = Date.now();
            const response = await fetch(fullUrl);
            const endTime = Date.now();
            
            console.log(`   ⏱️  Tiempo de respuesta: ${endTime - startTime}ms`);
            console.log(`   📊 Status: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                try {
                    const data = await response.json();
                    console.log(`   ✅ Respuesta JSON válida`);
                    console.log(`   📈 Success: ${data.success}`);
                    
                    if (data.success) {
                        if (data.data) {
                            if (Array.isArray(data.data)) {
                                console.log(`   📋 Datos: ${data.data.length} elementos`);
                            } else {
                                console.log(`   📋 Datos: objeto con ${Object.keys(data.data).length} propiedades`);
                            }
                        }
                        
                        if (data.total !== undefined) {
                            console.log(`   🔢 Total: ${data.total}`);
                        }
                        
                        if (data.uniqueCurpCount !== undefined) {
                            console.log(`   👥 Empleados únicos: ${data.uniqueCurpCount}`);
                        }
                    } else {
                        console.log(`   ❌ API error: ${data.error || 'Error desconocido'}`);
                    }
                } catch (jsonError) {
                    console.log(`   ❌ Error parseando JSON: ${jsonError.message}`);
                    const text = await response.text();
                    console.log(`   📄 Respuesta cruda: ${text.substring(0, 100)}...`);
                }
            } else {
                console.log(`   ❌ HTTP Error: ${response.status}`);
                try {
                    const errorText = await response.text();
                    console.log(`   📄 Error response: ${errorText.substring(0, 200)}...`);
                } catch (e) {
                    console.log(`   📄 No se pudo leer el error`);
                }
            }
        } catch (networkError) {
            console.log(`   🚫 Network Error: ${networkError.message}`);
            
            if (networkError.name === 'TypeError' && networkError.message.includes('fetch')) {
                console.log(`   💡 Posible problema: CORS, red, o servidor no disponible`);
            }
        }
    }
    
    console.log('\n📋 DIAGNÓSTICO RÁPIDO:');
    console.log('='.repeat(25));
    console.log('1. Si todos fallan → Problema de red/servidor');
    console.log('2. Si algunos funcionan → Problema de endpoints específicos'); 
    console.log('3. Si hay CORS errors → Problema de configuración del servidor');
    console.log('4. Si hay timeouts → Servidor lento/sobrecargado');
}

// Ejecutar prueba
testApiConnection().then(() => {
    console.log('\n🏁 Prueba de conectividad completada');
}).catch(error => {
    console.error('💥 Error ejecutando prueba:', error);
});

// Para usar en browser console
if (typeof window !== 'undefined') {
    window.testApiConnection = testApiConnection;
    console.log('🌐 Script cargado. Ejecuta: testApiConnection()');
}

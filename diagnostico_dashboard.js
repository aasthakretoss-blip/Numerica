/**
 * Script de diagnóstico para el Dashboard Demográfico
 * Identifica problemas de conectividad y carga de datos
 */

// Configuración de la API (similar a la del proyecto)
const API_CONFIG = {
  BASE_URL: 'https://numerica-2.onrender.com'
};

const buildApiUrl = (endpoint) => {
  if (endpoint.startsWith('/api')) {
    return API_CONFIG.BASE_URL + endpoint;
  }
  return API_CONFIG.BASE_URL + '/api/' + endpoint.replace(/^\//, '');
};

// Función para hacer request con timeout
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { 
      ...options, 
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

// Tests de diagnóstico
const diagnosticTests = {
  // 1. Test básico de conectividad
  async testConnectivity() {
    console.log('🔍 1. Testing basic API connectivity...');
    try {
      const url = buildApiUrl('/health');
      console.log(`   Trying: ${url}`);
      
      const response = await fetchWithTimeout(url, {}, 5000);
      console.log(`   ✅ API is reachable (Status: ${response.status})`);
      return { success: true, status: response.status };
    } catch (error) {
      console.log(`   ❌ API connectivity failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  // 2. Test de carga de períodos
  async testPeriods() {
    console.log('🔍 2. Testing periods endpoint...');
    try {
      const url = buildApiUrl('/api/payroll/periodos');
      console.log(`   Trying: ${url}`);
      
      const response = await fetchWithTimeout(url);
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log(`   ✅ Periods loaded: ${result.data?.length || 0} periods found`);
        if (result.data && result.data.length > 0) {
          const latest = result.data.sort((a, b) => new Date(b.value) - new Date(a.value))[0];
          console.log(`   📅 Latest period: ${latest.value}`);
        }
        return { success: true, data: result.data };
      } else {
        console.log(`   ❌ Periods failed: ${result.error || 'Unknown error'}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.log(`   ❌ Periods request failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  // 3. Test de opciones de filtros
  async testFilterOptions() {
    console.log('🔍 3. Testing filter options...');
    try {
      const url = buildApiUrl('/api/payroll/filter-options');
      console.log(`   Trying: ${url}`);
      
      const response = await fetchWithTimeout(url);
      const result = await response.json();
      
      if (response.ok && result.success) {
        const data = result.data || {};
        console.log(`   ✅ Filter options loaded:`);
        console.log(`      - Sucursales: ${data.sucursales?.length || 0}`);
        console.log(`      - Puestos: ${data.puestos?.length || 0}`);
        console.log(`      - Estados: ${data.estados?.length || 0}`);
        return { success: true, data: result.data };
      } else {
        console.log(`   ❌ Filter options failed: ${result.error || 'Unknown error'}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.log(`   ❌ Filter options request failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  // 4. Test de conteo único de empleados
  async testUniqueCount() {
    console.log('🔍 4. Testing unique employee count...');
    try {
      const params = new URLSearchParams({
        status: 'A'
      });
      
      const url = buildApiUrl(`/api/payroll/demographic/unique-count?${params}`);
      console.log(`   Trying: ${url}`);
      
      const response = await fetchWithTimeout(url);
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log(`   ✅ Unique employees: ${result.uniqueCurpCount || 0} employees`);
        return { success: true, count: result.uniqueCurpCount };
      } else {
        console.log(`   ❌ Unique count failed: ${result.error || 'Unknown error'}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.log(`   ❌ Unique count request failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  // 5. Test de datos demográficos básicos
  async testDemographicData() {
    console.log('🔍 5. Testing demographic data...');
    try {
      const params = new URLSearchParams({
        page: 1,
        pageSize: 10,
        sortBy: 'nombre',
        sortDir: 'asc',
        status: 'A'
      });
      
      const url = buildApiUrl(`/api/payroll/demographic?${params}`);
      console.log(`   Trying: ${url}`);
      
      const response = await fetchWithTimeout(url);
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log(`   ✅ Demographic data loaded: ${result.data?.length || 0} records`);
        console.log(`   📊 Total records available: ${result.total || 0}`);
        
        if (result.data && result.data.length > 0) {
          const sample = result.data[0];
          console.log(`   📋 Sample record fields: ${Object.keys(sample).join(', ')}`);
        }
        
        return { success: true, data: result.data, total: result.total };
      } else {
        console.log(`   ❌ Demographic data failed: ${result.error || 'Unknown error'}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.log(`   ❌ Demographic data request failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
};

// Función principal de diagnóstico
async function runDiagnosis() {
  console.log('🎯 DASHBOARD DEMOGRÁFICO - DIAGNÓSTICO COMPLETO');
  console.log('='.repeat(60));
  console.log('📍 API Base URL:', API_CONFIG.BASE_URL);
  console.log('⏱️  Timeout per request: 10 seconds');
  console.log('');

  const results = {};
  let successCount = 0;
  const totalTests = Object.keys(diagnosticTests).length;

  // Ejecutar todos los tests
  for (const [testName, testFunction] of Object.entries(diagnosticTests)) {
    try {
      const result = await testFunction();
      results[testName] = result;
      if (result.success) successCount++;
    } catch (error) {
      results[testName] = { success: false, error: error.message };
    }
    console.log(''); // Línea en blanco entre tests
  }

  // Resumen final
  console.log('📊 RESUMEN DE DIAGNÓSTICO');
  console.log('='.repeat(30));
  console.log(`✅ Tests exitosos: ${successCount}/${totalTests}`);
  console.log(`❌ Tests fallidos: ${totalTests - successCount}/${totalTests}`);
  console.log('');

  // Análisis de problemas específicos
  console.log('🔧 ANÁLISIS DE PROBLEMAS');
  console.log('='.repeat(30));
  
  if (results.testConnectivity && !results.testConnectivity.success) {
    console.log('❌ PROBLEMA CRÍTICO: API no accesible');
    console.log('   - Verificar conectividad a internet');
    console.log('   - Verificar URL del endpoint');
    console.log('   - Verificar configuración de CORS');
  }

  if (results.testPeriods && !results.testPeriods.success) {
    console.log('❌ PROBLEMA: No se pueden cargar períodos');
    console.log('   - El filtro de fecha no funcionará');
    console.log('   - Dashboard puede mostrar datos desactualizados');
  }

  if (results.testFilterOptions && !results.testFilterOptions.success) {
    console.log('❌ PROBLEMA: Filtros demográficos no funcionan');
    console.log('   - Dropdowns de filtros estarán vacíos');
    console.log('   - No se podrán filtrar por sucursal/puesto');
  }

  if (results.testUniqueCount && !results.testUniqueCount.success) {
    console.log('❌ PROBLEMA: Conteo de empleados falla');
    console.log('   - Dashboard puede mostrar contadores incorrectos');
    console.log('   - Paginación puede fallar');
  }

  if (results.testDemographicData && !results.testDemographicData.success) {
    console.log('❌ PROBLEMA CRÍTICO: No se cargan datos demográficos');
    console.log('   - Tablas estarán vacías');
    console.log('   - Gráficos no se renderizarán');
    console.log('   - Dashboard completamente no funcional');
  }

  // Recomendaciones
  console.log('');
  console.log('💡 RECOMENDACIONES');
  console.log('='.repeat(20));
  
  if (successCount === totalTests) {
    console.log('🎉 ¡Todos los tests pasaron!');
    console.log('✅ El problema puede estar en el frontend (React)');
    console.log('✅ Verificar consola del navegador para errores JavaScript');
    console.log('✅ Verificar Network tab en DevTools');
  } else {
    console.log('🔧 Hay problemas con la API backend');
    console.log('1. Verificar que el servicio AWS Lambda esté funcionando');
    console.log('2. Verificar configuración de base de datos');
    console.log('3. Verificar logs de AWS CloudWatch');
    console.log('4. Verificar permisos de IAM');
  }

  return results;
}

// Solo ejecutar si estamos en Node.js (no en browser)
if (typeof window === 'undefined' && typeof require !== 'undefined') {
  // Configuración para Node.js
  const { fetch } = require('node-fetch');
  global.fetch = fetch;
  
  runDiagnosis().then(() => {
    console.log('');
    console.log('🏁 Diagnóstico completado');
  }).catch(error => {
    console.error('❌ Error ejecutando diagnóstico:', error);
  });
} else if (typeof window !== 'undefined') {
  // Disponible para usar en browser console
  window.runDashboardDiagnosis = runDiagnosis;
  console.log('🚀 Dashboard diagnosis loaded. Run: runDashboardDiagnosis()');
}

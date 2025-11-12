/**
 * Diagnóstico específico para el filtro automático de período en el dashboard demográfico
 */

const API_CONFIG = {
  BASE_URL: 'http://numericaapi.kretosstechnology.com'
};

const buildApiUrl = (endpoint) => {
  if (endpoint.startsWith('/api')) {
    return API_CONFIG.BASE_URL + endpoint;
  }
  return API_CONFIG.BASE_URL + '/api/' + endpoint.replace(/^\//, '');
};

async function diagnosticoPeriodo() {
  console.log('🔍 DIAGNÓSTICO: Filtro Automático de Período');
  console.log('='.repeat(50));
  
  // 1. Verificar carga de períodos disponibles
  console.log('\n1️⃣ Verificando períodos disponibles...');
  try {
    const periodsResponse = await fetch(buildApiUrl('/api/payroll/periodos'));
    const periodsResult = await periodsResponse.json();
    
    if (periodsResult.success && periodsResult.data && periodsResult.data.length > 0) {
      console.log(`✅ Períodos cargados: ${periodsResult.data.length} períodos encontrados`);
      
      // Ordenar períodos como lo hace el código
      const sortedPeriods = periodsResult.data.sort((a, b) => new Date(b.value) - new Date(a.value));
      const latest = sortedPeriods[0];
      
      console.log('📅 Últimos 5 períodos disponibles:');
      sortedPeriods.slice(0, 5).forEach((period, index) => {
        const marker = index === 0 ? '👈 ÚLTIMO' : '';
        console.log(`   ${index + 1}. ${period.value} (${period.count || 'N/A'} registros) ${marker}`);
      });
      
      // Calcular filtro como lo hace el código
      const periodDate = new Date(latest.value);
      const monthFilter = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`;
      
      console.log(`\n🎯 Período seleccionado: ${latest.value}`);
      console.log(`🎯 Filtro calculado: ${monthFilter}`);
      
      // 2. Probar filtro de período en diferentes endpoints
      console.log('\n2️⃣ Probando filtro de período en endpoints...');
      
      const testCases = [
        {
          name: 'Filter Options',
          endpoint: `/api/payroll/filter-options?cveper=${monthFilter}&status=A`,
        },
        {
          name: 'Demographic Data',
          endpoint: `/api/payroll/demographic?cveper=${monthFilter}&status=A&page=1&pageSize=10`,
        },
        {
          name: 'Unique Count',
          endpoint: `/api/payroll/demographic/unique-count?cveper=${monthFilter}&status=A`,
        }
      ];
      
      for (const testCase of testCases) {
        console.log(`\n🧪 Probando: ${testCase.name}`);
        console.log(`   URL: ${buildApiUrl(testCase.endpoint)}`);
        
        try {
          const response = await fetch(buildApiUrl(testCase.endpoint));
          const result = await response.json();
          
          if (response.ok && result.success) {
            if (testCase.name === 'Filter Options') {
              console.log(`   ✅ Success: ${result.data?.sucursales?.length || 0} sucursales, ${result.data?.puestos?.length || 0} puestos`);
            } else if (testCase.name === 'Demographic Data') {
              console.log(`   ✅ Success: ${result.data?.length || 0} registros de ${result.total || 0} total`);
            } else if (testCase.name === 'Unique Count') {
              console.log(`   ✅ Success: ${result.uniqueCurpCount || 0} empleados únicos`);
            }
          } else {
            console.log(`   ❌ Error: ${result.error || 'Error desconocido'}`);
          }
        } catch (error) {
          console.log(`   ❌ Network Error: ${error.message}`);
        }
      }
      
      // 3. Comparar con formato completo de fecha
      console.log('\n3️⃣ Comparando formatos de fecha...');
      
      const formats = [
        monthFilter, // YYYY-MM
        latest.value, // Formato original
        latest.value.substring(0, 7), // YYYY-MM del valor original
      ];
      
      for (const format of formats) {
        console.log(`\n🔍 Probando formato: "${format}"`);
        try {
          const response = await fetch(buildApiUrl(`/api/payroll/demographic/unique-count?cveper=${format}&status=A`));
          const result = await response.json();
          
          if (response.ok && result.success) {
            console.log(`   ✅ ${result.uniqueCurpCount || 0} empleados únicos`);
          } else {
            console.log(`   ❌ Error: ${result.error || 'Error desconocido'}`);
          }
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
      
      // 4. Verificar si hay datos sin filtro de período
      console.log('\n4️⃣ Verificando datos sin filtro de período...');
      try {
        const response = await fetch(buildApiUrl('/api/payroll/demographic/unique-count?status=A'));
        const result = await response.json();
        
        if (response.ok && result.success) {
          console.log(`   ✅ Sin filtro de período: ${result.uniqueCurpCount || 0} empleados únicos`);
          
          // Comparar con filtro aplicado
          const withFilter = await fetch(buildApiUrl(`/api/payroll/demographic/unique-count?cveper=${monthFilter}&status=A`));
          const withFilterResult = await withFilter.json();
          
          if (withFilter.ok && withFilterResult.success) {
            const withoutFilterCount = result.uniqueCurpCount || 0;
            const withFilterCount = withFilterResult.uniqueCurpCount || 0;
            
            console.log(`   📊 Comparación:`);
            console.log(`      - Sin filtro: ${withoutFilterCount} empleados`);
            console.log(`      - Con filtro: ${withFilterCount} empleados`);
            console.log(`      - Diferencia: ${withoutFilterCount - withFilterCount} empleados`);
            
            if (withFilterCount === 0) {
              console.log('   ⚠️  PROBLEMA: El filtro de período está filtrando todos los datos');
            } else if (withFilterCount === withoutFilterCount) {
              console.log('   ⚠️  PROBLEMA: El filtro de período no está teniendo efecto');
            } else {
              console.log('   ✅ El filtro de período está funcionando correctamente');
            }
          }
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
    } else {
      console.log('❌ No se pudieron cargar períodos');
    }
    
  } catch (error) {
    console.log('❌ Error cargando períodos:', error.message);
  }
  
  console.log('\n📋 RECOMENDACIONES:');
  console.log('='.repeat(20));
  console.log('1. Si el filtro devuelve 0 empleados, verificar el formato de fecha en la API');
  console.log('2. Si el filtro no tiene efecto, verificar el parámetro cveper en el backend');
  console.log('3. Verificar que el campo cveper en la BD tenga el formato esperado');
  console.log('4. Considerar usar rango de fechas en lugar de formato mes/año');
}

// Ejecutar diagnóstico
diagnosticoPeriodo().then(() => {
  console.log('\n🏁 Diagnóstico completado');
}).catch(error => {
  console.error('❌ Error ejecutando diagnóstico:', error);
});

// Para usar en browser console
if (typeof window !== 'undefined') {
  window.diagnosticoPeriodo = diagnosticoPeriodo;
  console.log('🚀 Diagnóstico de período cargado. Ejecutar: diagnosticoPeriodo()');
}

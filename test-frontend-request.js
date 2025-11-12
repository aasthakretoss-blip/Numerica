// Simular la petición exacta que haría el frontend
async function testFrontendRequest() {
  console.log('🧪 === SIMULANDO PETICIÓN DEL FRONTEND ===');
  
  try {
    // Simular la petición que hace el frontend cuando selecciona un mes
    const baseURL = 'http://numericaapi.kretosstechnology.com:3001';
    
    // Test 1: Petición con filtro de mes (2024-10)
    console.log('\n📅 === TEST 1: Filtro por mes 2024-10 ===');
    const monthFilterUrl = `${baseURL}/api/payroll?cveper=2024-10&page=1&pageSize=10&sortBy=nombre&sortDir=asc`;
    
    console.log('🚀 URL de prueba:', monthFilterUrl);
    
    const response1 = await fetch(monthFilterUrl);
    const result1 = await response1.json();
    
    console.log('✅ Respuesta del servidor:', {
      status: response1.status,
      success: result1.success,
      dataLength: result1.data?.length || 0,
      total: result1.pagination?.total || 0,
      error: result1.error
    });
    
    if (result1.success && result1.data.length > 0) {
      console.log('👤 Primeros 3 empleados:', result1.data.slice(0, 3).map(emp => ({
        nombre: emp.nombre,
        mes: emp.mes,
        cveper: emp.cveper
      })));
    }
    
    // Test 2: Petición sin filtros para comparar
    console.log('\n🌍 === TEST 2: Sin filtros (para comparar) ===');
    const noFilterUrl = `${baseURL}/api/payroll?page=1&pageSize=10&sortBy=nombre&sortDir=asc`;
    
    console.log('🚀 URL de prueba:', noFilterUrl);
    
    const response2 = await fetch(noFilterUrl);
    const result2 = await response2.json();
    
    console.log('✅ Respuesta del servidor:', {
      status: response2.status,
      success: result2.success,
      dataLength: result2.data?.length || 0,
      total: result2.pagination?.total || 0
    });
    
    if (result2.success && result2.data.length > 0) {
      console.log('👤 Primeros 3 empleados:', result2.data.slice(0, 3).map(emp => ({
        nombre: emp.nombre,
        mes: emp.mes,
        cveper: emp.cveper
      })));
    }
    
    // Test 3: Revisar qué períodos están disponibles en el dropdown
    console.log('\n📋 === TEST 3: Obtener opciones de filtros ===');
    const filtersUrl = `${baseURL}/api/payroll/filters`;
    
    const response3 = await fetch(filtersUrl);
    const result3 = await response3.json();
    
    console.log('✅ Filtros disponibles:', {
      success: result3.success,
      periodos: result3.data?.periodos?.length || 0,
      ejemplosPeriodos: result3.data?.periodos?.slice(0, 5) || []
    });
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
  }
}

testFrontendRequest();

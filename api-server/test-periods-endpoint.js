const fetch = require('node-fetch');

async function testPeriodsEndpoint() {
  try {
    console.log('🧪 Probando endpoint de períodos...');
    
    const response = await fetch('http://numericaapi.kretosstechnology.com:3001/api/payroll/periodos');
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Respuesta del endpoint de períodos:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success && result.data) {
      console.log(`📅 Total de períodos únicos encontrados: ${result.data.length}`);
      console.log('🔍 Primeros 5 períodos:');
      result.data.slice(0, 5).forEach((periodo, index) => {
        console.log(`   ${index + 1}. ${periodo.value} (${periodo.count} registros)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error probando endpoint de períodos:', error.message);
  }
}

async function testPayrollWithPeriodFilter() {
  try {
    console.log('\n🧪 Probando filtro de período en endpoint /api/payroll...');
    
    // Primero obtener un período válido
    const periodsResponse = await fetch('http://numericaapi.kretosstechnology.com:3001/api/payroll/periodos');
    const periodsResult = await periodsResponse.json();
    
    if (periodsResult.success && periodsResult.data.length > 0) {
      const testPeriod = periodsResult.data[0].value;
      console.log(`🔍 Probando con período: ${testPeriod}`);
      
      const response = await fetch(`http://numericaapi.kretosstechnology.com:3001/api/payroll?cveper=${encodeURIComponent(testPeriod)}&pageSize=5`);
      const result = await response.json();
      
      console.log('✅ Respuesta con filtro de período:');
      console.log(`📊 Total: ${result.pagination.total} registros`);
      console.log(`📋 Datos devueltos: ${result.data.length} empleados`);
      
      if (result.data.length > 0) {
        console.log('👤 Primer empleado de la respuesta:');
        const emp = result.data[0];
        console.log(`   Nombre: ${emp.nombre}`);
        console.log(`   Puesto: ${emp.puesto}`);
        console.log(`   Período: ${emp.cveper}`);
        console.log(`   Estado: ${emp.estado}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error probando filtro de período:', error.message);
  }
}

if (require.main === module) {
  // Esperar un poco para que el servidor se inicie
  setTimeout(async () => {
    await testPeriodsEndpoint();
    await testPayrollWithPeriodFilter();
    process.exit(0);
  }, 2000);
}

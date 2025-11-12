const fetch = require('node-fetch');

async function testPayrollAPI() {
  console.log('🧪 Probando el endpoint /api/payroll...');
  console.log('='.repeat(50));

  const baseUrl = 'http://numericaapi.kretosstechnology.com:3001';
  
  try {
    // Probar el endpoint principal
    console.log('1. 📡 Probando GET /api/payroll...');
    const response = await fetch(`${baseUrl}/api/payroll`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Respuesta exitosa!`);
    console.log(`📊 Total de registros: ${data.total}`);
    console.log(`📄 Página: ${data.page}, Tamaño: ${data.pageSize}`);
    console.log(`🔢 Registros en esta página: ${data.data.length}`);
    
    if (data.data.length > 0) {
      console.log('\n📋 ESTRUCTURA DE LOS DATOS:');
      console.log('='.repeat(40));
      
      const sample = data.data[0];
      console.log('Primer registro:');
      Object.entries(sample).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
      
      console.log('\n👥 TODOS LOS EMPLEADOS:');
      console.log('='.repeat(40));
      data.data.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.nombre} - ${emp.puesto} (${emp.sucursal})`);
        console.log(`   RFC: ${emp.rfc}, CURP: ${emp.curp}`);
        console.log(`   Sueldo: $${emp.sueldo}, Comisiones: $${emp.comisiones}`);
        console.log(`   Status: ${emp.status}, Fecha: ${emp.fecha}`);
        console.log('');
      });

      // Probar endpoint específico con el primer RFC
      if (sample.rfc) {
        console.log(`2. 📡 Probando GET /api/payroll/${sample.rfc}...`);
        const detailResponse = await fetch(`${baseUrl}/api/payroll/${sample.rfc}`);
        
        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          console.log('✅ Detalle del empleado obtenido exitosamente!');
          console.log('📋 Datos del empleado:');
          Object.entries(detailData).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
        } else {
          console.log(`❌ Error al obtener detalle: ${detailResponse.status}`);
        }
      }
    } else {
      console.log('⚠️  No se encontraron registros en la respuesta.');
    }

    // Probar filtros
    console.log('\n3. 🔍 Probando filtros...');
    const filterResponse = await fetch(`${baseUrl}/api/payroll?q=GÓMEZ`);
    if (filterResponse.ok) {
      const filterData = await filterResponse.json();
      console.log(`✅ Filtro por búsqueda 'GÓMEZ': ${filterData.data.length} resultados`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n🔗 Para probar manualmente:');
  console.log(`   ${baseUrl}/api/payroll`);
  console.log(`   ${baseUrl}/api/payroll?q=GÓMEZ`);
  console.log(`   ${baseUrl}/health`);
}

// Ejecutar la prueba
if (require.main === module) {
  testPayrollAPI();
}

module.exports = { testPayrollAPI };

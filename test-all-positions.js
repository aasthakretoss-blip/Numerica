// Script para verificar que el endpoint /api/payroll/filters devuelva todos los puestos únicos

const testFilterEndpoint = async () => {
  try {
    console.log('🔍 Probando endpoint /api/payroll/filters para obtener TODOS los puestos únicos...\n');
    
    // Test 1: Filtros sin parámetros (debería devolver TODOS los puestos)
    console.log('1. Consultando filtros sin parámetros:');
    console.log('   URL: https://numerica-2.onrender.com/api/payroll/filters');
    
    const response1 = await fetch('https://numerica-2.onrender.com/api/payroll/filters', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Node.js Test Script'
      }
    });
    
    console.log(`   Status: ${response1.status} ${response1.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(response1.headers.entries()));
    
    if (!response1.ok) {
      const errorText = await response1.text();
      console.log(`   Error Body: ${errorText}`);
      throw new Error(`Error ${response1.status}: ${response1.statusText}`);
    }
    
    const result1 = await response1.json();
    
    if (result1.success) {
      console.log(`   ✅ Puestos únicos encontrados: ${result1.data.puestos.length}`);
      console.log(`   ✅ Sucursales únicas encontradas: ${result1.data.sucursales.length}`);
      console.log(`   ✅ Estados únicos encontrados: ${result1.data.estados.length}`);
      console.log(`   ✅ Categorías de puestos encontradas: ${result1.data.puestosCategorias.length}`);
      console.log(`   ✅ Períodos únicos encontrados: ${result1.data.periodos.length}`);
      
      // Mostrar algunos puestos como ejemplo
      console.log('\n📋 Primeros 10 puestos encontrados:');
      result1.data.puestos.slice(0, 10).forEach(puesto => {
        console.log(`   - ${puesto.value} (${puesto.count} empleados)`);
      });
      
      // Estadísticas
      const totalEmpleadosPorPuestos = result1.data.puestos.reduce((sum, p) => sum + p.count, 0);
      console.log(`\n📊 Total de empleados sumando todos los puestos: ${totalEmpleadosPorPuestos.toLocaleString()}`);
      
    } else {
      console.error('❌ La API devolvió una respuesta no exitosa');
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Test 2: Comparar con endpoint normal de payroll
    console.log('2. Comparando con endpoint /api/payroll con pageSize máximo:');
    const response2 = await fetch('https://numerica-2.onrender.com/api/payroll?pageSize=100000');
    
    if (!response2.ok) {
      throw new Error(`Error ${response2.status}: ${response2.statusText}`);
    }
    
    const result2 = await response2.json();
    
    if (result2.success) {
      const puestosUnicos = [...new Set(result2.data.map(emp => emp.puesto).filter(Boolean))];
      console.log(`   ✅ Puestos únicos desde /api/payroll: ${puestosUnicos.length}`);
      console.log(`   📊 Total registros obtenidos: ${result2.data.length.toLocaleString()}`);
      
      // Comparación
      const diferencia = result1.data.puestos.length - puestosUnicos.length;
      if (diferencia === 0) {
        console.log('   ✅ ¡Coincidencia perfecta! Ambos endpoints devuelven la misma cantidad de puestos únicos.');
      } else {
        console.log(`   ⚠️  Diferencia encontrada: ${diferencia} puestos de diferencia`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    console.log('\n💡 Posibles causas:');
    console.log('   - El servidor no está corriendo en https://numerica-2.onrender.com');
    console.log('   - Problema de conexión a la base de datos');
    console.log('   - Error en el servicio de filtros');
  }
};

// Ejecutar la prueba
console.log('🚀 Iniciando prueba de filtros completos...\n');
testFilterEndpoint();

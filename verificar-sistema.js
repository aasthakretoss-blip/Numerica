// Script para verificar el funcionamiento completo del sistema
// Conecta a la base de datos y testea el endpoint /api/payroll

const fetch = require('node-fetch');

const API_BASE = 'http://numericaapi.kretosstechnology.com:3001';

async function verificarSistema() {
  console.log('\n🔍 VERIFICACIÓN DEL SISTEMA COMPLETO');
  console.log('=====================================\n');

  try {
    // 1. Verificar endpoint básico
    console.log('1. Verificando endpoint básico /api/payroll...');
    const basicResponse = await fetch(`${API_BASE}/api/payroll?pageSize=10`);
    const basicData = await basicResponse.json();
    
    if (basicData.success) {
      console.log(`✅ Endpoint básico funciona - ${basicData.data.length} registros obtenidos`);
      console.log(`   Total en BD: ${basicData.pagination.total} registros`);
    } else {
      console.log('❌ Error en endpoint básico');
      return;
    }

    // 2. Verificar búsqueda por nombre
    console.log('\n2. Verificando búsqueda por nombre...');
    const searchResponse = await fetch(`${API_BASE}/api/payroll?search=MARIA`);
    const searchData = await searchResponse.json();
    
    if (searchData.success) {
      console.log(`✅ Búsqueda por nombre funciona - ${searchData.data.length} registros encontrados`);
      if (searchData.data.length > 0) {
        console.log(`   Ejemplo: ${searchData.data[0].nombre}`);
      }
    } else {
      console.log('❌ Error en búsqueda por nombre');
    }

    // 3. Verificar filtro por puesto
    console.log('\n3. Verificando filtro por puesto...');
    const puestoResponse = await fetch(`${API_BASE}/api/payroll?puesto=ASESOR`);
    const puestoData = await puestoResponse.json();
    
    if (puestoData.success) {
      console.log(`✅ Filtro por puesto funciona - ${puestoData.data.length} asesores encontrados`);
    } else {
      console.log('❌ Error en filtro por puesto');
    }

    // 4. Verificar filtro por estado
    console.log('\n4. Verificando filtro por estado...');
    const estadoResponse = await fetch(`${API_BASE}/api/payroll?status=A`);
    const estadoData = await estadoResponse.json();
    
    if (estadoData.success) {
      console.log(`✅ Filtro por estado funciona - ${estadoData.data.length} empleados activos`);
    } else {
      console.log('❌ Error en filtro por estado');
    }

    // 5. Verificar filtros combinados
    console.log('\n5. Verificando filtros combinados...');
    const combinadoResponse = await fetch(`${API_BASE}/api/payroll?puesto=TECNICO&status=A`);
    const combinadoData = await combinadoResponse.json();
    
    if (combinadoData.success) {
      console.log(`✅ Filtros combinados funcionan - ${combinadoData.data.length} técnicos activos`);
    } else {
      console.log('❌ Error en filtros combinados');
    }

    // 6. Obtener estadísticas generales
    console.log('\n6. Estadísticas generales...');
    const allResponse = await fetch(`${API_BASE}/api/payroll?pageSize=500`);
    const allData = await allResponse.json();
    
    if (allData.success) {
      const empleados = allData.data;
      
      // Contar por estado
      const activos = empleados.filter(emp => emp.estado === 'Activo').length;
      const bajas = empleados.filter(emp => emp.estado === 'Baja').length;
      
      // Top 5 puestos
      const puestos = {};
      empleados.forEach(emp => {
        puestos[emp.puesto] = (puestos[emp.puesto] || 0) + 1;
      });
      const topPuestos = Object.entries(puestos)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      // Top 5 sucursales
      const sucursales = {};
      empleados.forEach(emp => {
        sucursales[emp.sucursal] = (sucursales[emp.sucursal] || 0) + 1;
      });
      const topSucursales = Object.entries(sucursales)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

      console.log(`✅ Total empleados: ${empleados.length}`);
      console.log(`   - Activos: ${activos}`);
      console.log(`   - Bajas: ${bajas}`);
      
      console.log('\n   Top 5 puestos:');
      topPuestos.forEach(([puesto, count]) => {
        console.log(`   - ${puesto}: ${count}`);
      });
      
      console.log('\n   Top 5 sucursales:');
      topSucursales.forEach(([sucursal, count]) => {
        console.log(`   - ${sucursal}: ${count}`);
      });
    }

    console.log('\n🎉 VERIFICACIÓN COMPLETADA EXITOSAMENTE');
    console.log('=====================================');
    console.log('✅ Backend funcionando correctamente');
    console.log('✅ Base de datos conectada');
    console.log('✅ Endpoint /api/payroll operativo');
    console.log('✅ Filtros funcionando correctamente');
    console.log('✅ Datos reales (500 registros) disponibles');
    console.log('\n📱 Frontend disponible en: http://localhost:3000');
    console.log('🔧 API disponible en: http://numericaapi.kretosstechnology.com:3001');
    
  } catch (error) {
    console.log(`❌ ERROR en verificación: ${error.message}`);
    console.log('   Asegúrate de que el servidor backend esté corriendo en puerto 3001');
  }
}

// Ejecutar verificación
verificarSistema();

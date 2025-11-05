// Test para simular la selección de un mes en el frontend
require('dotenv').config();

async function testFrontendMonthSelection() {
  console.log('🧪 === SIMULANDO SELECCIÓN DE MES EN EL FRONTEND ===');
  
  try {
    const baseURL = 'http://localhost:3001';
    
    // Paso 1: Obtener los períodos disponibles (lo que hace el frontend al cargar)
    console.log('\n📋 === PASO 1: Obtener opciones de períodos ===');
    const filtersResponse = await fetch(`${baseURL}/api/payroll/filters`);
    const filtersResult = await filtersResponse.json();
    
    if (!filtersResult.success) {
      throw new Error('No se pudieron obtener los filtros');
    }
    
    const rawPeriods = filtersResult.data.periodos;
    console.log('📊 Períodos crudos del backend:', rawPeriods.length);
    
    // Simular la agrupación que hace el frontend
    const groupPeriods = (periodOptions) => {
      const grouped = {};
      
      periodOptions.forEach(option => {
        const date = option.value; // Ya está en formato YYYY-MM-DD
        const [year, month] = date.split('-');
        const groupKey = `${year}-${month}`;
        
        if (!grouped[groupKey]) {
          const months = {
            '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
            '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
            '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
          };
          
          grouped[groupKey] = {
            value: groupKey,
            label: `${months[month]} ${year.slice(-2)}`,
            count: 0
          };
        }
        
        grouped[groupKey].count += parseInt(option.count);
      });
      
      return Object.values(grouped).sort((a, b) => b.value.localeCompare(a.value));
    };
    
    const groupedPeriods = groupPeriods(rawPeriods);
    console.log('📅 Períodos agrupados:', groupedPeriods.length);
    console.log('🎯 Encontrando octubre 2024...');
    
    const octubre2024 = groupedPeriods.find(p => p.value === '2024-10');
    if (octubre2024) {
      console.log('✅ Octubre 2024 disponible:', octubre2024);
    } else {
      console.log('❌ Octubre 2024 NO disponible');
      return;
    }
    
    // Paso 2: Simular que el usuario selecciona "Octubre 24" en el dropdown
    console.log('\n🎯 === PASO 2: Usuario selecciona "Octubre 24" ===');
    const selectedMonthValue = '2024-10'; // Valor que el frontend enviará al backend
    
    console.log('🔄 Frontend enviará filtro:', { cveper: selectedMonthValue });
    
    // Paso 3: Hacer la petición como lo haría el frontend
    console.log('\n🚀 === PASO 3: Petición al backend con filtro de mes ===');
    const payrollUrl = `${baseURL}/api/payroll?cveper=${selectedMonthValue}&page=1&pageSize=10&sortBy=nombre&sortDir=asc`;
    
    console.log('🌐 URL completa:', payrollUrl);
    
    const payrollResponse = await fetch(payrollUrl);
    const payrollResult = await payrollResponse.json();
    
    console.log('📈 Resultado de la búsqueda:', {
      success: payrollResult.success,
      status: payrollResponse.status,
      totalRegistros: payrollResult.pagination?.total || 0,
      empleadosDevueltos: payrollResult.data?.length || 0,
      error: payrollResult.error
    });
    
    if (payrollResult.success && payrollResult.data.length > 0) {
      console.log('👥 Primeros empleados encontrados:');
      payrollResult.data.slice(0, 3).forEach((emp, i) => {
        console.log(`  ${i + 1}. ${emp.nombre} (${emp.mes})`);
      });
      
      // Verificar que todos los empleados son de octubre 2024
      const todosDeOctubre = payrollResult.data.every(emp => {
        const mes = emp.mes || '';
        return mes.startsWith('2024-10');
      });
      
      console.log('✅ Todos los empleados son de octubre 2024:', todosDeOctubre);
      
      if (!todosDeOctubre) {
        console.log('⚠️ Algunos empleados NO son de octubre:');
        payrollResult.data.filter(emp => !(emp.mes || '').startsWith('2024-10'))
          .slice(0, 3).forEach(emp => {
            console.log(`  - ${emp.nombre}: ${emp.mes}`);
          });
      }
      
    } else {
      console.log('❌ Error o no hay datos:', {
        success: payrollResult.success,
        error: payrollResult.error,
        message: payrollResult.message
      });
    }
    
    // Paso 4: Verificar que el filtro se aplica correctamente al endpoint de filtros también
    console.log('\n🔍 === PASO 4: Verificar conteos de otros filtros con mes seleccionado ===');
    const filtersWithMonthUrl = `${baseURL}/api/payroll/filters?cveper=${selectedMonthValue}`;
    
    const filtersWithMonthResponse = await fetch(filtersWithMonthUrl);
    const filtersWithMonthResult = await filtersWithMonthResponse.json();
    
    if (filtersWithMonthResult.success) {
      console.log('📊 Filtros recalculados con mes octubre 2024:', {
        sucursales: filtersWithMonthResult.data.sucursales?.length || 0,
        puestos: filtersWithMonthResult.data.puestos?.length || 0,
        estados: filtersWithMonthResult.data.estados?.length || 0,
        totalEstados: filtersWithMonthResult.data.estados?.reduce((sum, e) => sum + parseInt(e.count), 0) || 0
      });
    }
    
    console.log('\n🎉 === TEST COMPLETADO ===');
    
  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

testFrontendMonthSelection();

const payrollFilterService = require('./services/payrollFilterService');

async function testMonthFilter() {
  console.log('🧪 === INICIANDO PRUEBA DE FILTRO POR MES ===');
  
  try {
    // Probar con un filtro de mes específico
    const testMonth = '2024-10'; // Octubre 2024
    
    console.log(`\n📅 Probando filtro por mes: ${testMonth}`);
    console.log('🔍 Formato detectado:', testMonth.match(/^\d{4}-\d{2}$/) ? 'YYYY-MM (mes completo)' : 'Otro formato');
    
    // Probar getPayrollDataWithFiltersAndSorting
    console.log('\n🎯 === PROBANDO getPayrollDataWithFiltersAndSorting ===');
    const payrollResult = await payrollFilterService.getPayrollDataWithFiltersAndSorting({
      cveper: testMonth,
      page: 1,
      pageSize: 10
    });
    
    console.log('✅ Resultado de búsqueda de datos:', {
      success: payrollResult.success,
      totalEncontrados: payrollResult.data.length,
      totalRegistros: payrollResult.pagination.total,
      primerosEmpleados: payrollResult.data.slice(0, 3).map(emp => ({
        nombre: emp.nombre,
        mes: emp.mes,
        cveper: emp.cveper
      }))
    });
    
    // Probar getFiltersWithCardinality
    console.log('\n🔢 === PROBANDO getFiltersWithCardinality ===');
    const filtersResult = await payrollFilterService.getFiltersWithCardinality({
      cveper: testMonth
    });
    
    console.log('✅ Resultado de filtros con cardinalidad:', {
      success: filtersResult.success,
      sucursales: filtersResult.data.sucursales.length,
      puestos: filtersResult.data.puestos.length,
      estados: filtersResult.data.estados.length,
      periodos: filtersResult.data.periodos.length,
      categorias: filtersResult.data.puestosCategorias.length
    });
    
    // Probar sin filtro para comparar
    console.log('\n🌍 === PROBANDO SIN FILTROS (para comparar) ===');
    const noFilterResult = await payrollFilterService.getPayrollDataWithFiltersAndSorting({
      page: 1,
      pageSize: 10
    });
    
    console.log('✅ Resultado sin filtros:', {
      success: noFilterResult.success,
      totalEncontrados: noFilterResult.data.length,
      totalRegistros: noFilterResult.pagination.total,
      primerosEmpleados: noFilterResult.data.slice(0, 3).map(emp => ({
        nombre: emp.nombre,
        mes: emp.mes,
        cveper: emp.cveper
      }))
    });
    
    // Revisar períodos únicos disponibles
    console.log('\n📊 === ANALIZANDO PERÍODOS ÚNICOS DISPONIBLES ===');
    const { nominasPool } = require('./config/database');
    const client = await nominasPool.connect();
    
    const periodQuery = `
      SELECT 
        DATE_TRUNC('month', cveper) as mes_truncado,
        TO_CHAR(DATE_TRUNC('month', cveper), 'YYYY-MM') as mes_formato,
        COUNT(*) as count
      FROM historico_nominas_gsau 
      WHERE cveper IS NOT NULL
      GROUP BY DATE_TRUNC('month', cveper)
      ORDER BY DATE_TRUNC('month', cveper) DESC
      LIMIT 10
    `;
    
    const periodResult = await client.query(periodQuery);
    client.release();
    
    console.log('📅 Períodos únicos disponibles (últimos 10):', 
      periodResult.rows.map(row => ({
        mesFormato: row.mes_formato,
        mesTruncado: row.mes_truncado,
        count: parseInt(row.count)
      }))
    );
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
  }
}

testMonthFilter();

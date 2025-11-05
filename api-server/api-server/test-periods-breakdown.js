const payrollFilterService = require('./services/payrollFilterService');

async function testPeriodsBreakdown() {
  console.log('🧪 === ANALIZANDO PERÍODOS DEVUELTOS POR ENDPOINT DE FILTROS ===');
  
  try {
    // Obtener todos los filtros sin aplicar ningún filtro activo
    console.log('\n📅 Obteniendo todos los períodos sin filtros...');
    const filtersResult = await payrollFilterService.getFiltersWithCardinality({});
    
    if (filtersResult.success) {
      const períodos = filtersResult.data.periodos || [];
      
      console.log('✅ Total de períodos encontrados:', períodos.length);
      console.log('📊 Primeros 10 períodos:', períodos.slice(0, 10).map(p => ({
        value: p.value,
        count: p.count
      })));
      console.log('📊 Últimos 10 períodos:', períodos.slice(-10).map(p => ({
        value: p.value,
        count: p.count
      })));
      
      // Análizar formato de fechas
      const formatosDetectados = new Set();
      períodos.forEach(p => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(p.value)) {
          formatosDetectados.add('YYYY-MM-DD');
        } else if (/^\d{4}-\d{2}$/.test(p.value)) {
          formatosDetectados.add('YYYY-MM');
        } else {
          formatosDetectados.add('OTRO');
        }
      });
      
      console.log('📅 Formatos de fecha detectados:', Array.from(formatosDetectados));
      
      // Agrupar por año-mes para ver cuántos períodos únicos tenemos por mes
      const agrupacionPorMes = new Map();
      períodos.forEach(p => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(p.value)) {
          const mes = p.value.substring(0, 7); // YYYY-MM
          if (!agrupacionPorMes.has(mes)) {
            agrupacionPorMes.set(mes, {
              fechasUnicas: [],
              conteoTotal: 0
            });
          }
          agrupacionPorMes.get(mes).fechasUnicas.push(p.value);
          agrupacionPorMes.get(mes).conteoTotal += parseInt(p.count);
        }
      });
      
      console.log('\n📊 Agrupación por mes (primeros 5):');
      const mesesOrdenados = Array.from(agrupacionPorMes.keys()).sort().reverse().slice(0, 5);
      mesesOrdenados.forEach(mes => {
        const datos = agrupacionPorMes.get(mes);
        console.log(`  ${mes}: ${datos.fechasUnicas.length} fechas únicas, ${datos.conteoTotal} registros total`);
        console.log(`    - Fechas: ${datos.fechasUnicas.slice(0, 3).join(', ')}${datos.fechasUnicas.length > 3 ? '...' : ''}`);
      });
      
      // Análisis específico para 2024-10
      console.log('\n🔍 === ANÁLISIS ESPECÍFICO PARA 2024-10 ===');
      const octubre2024 = Array.from(agrupacionPorMes.entries())
        .find(([mes, _]) => mes === '2024-10');
      
      if (octubre2024) {
        const [mes, datos] = octubre2024;
        console.log(`✅ Mes ${mes}:`, {
          fechasUnicas: datos.fechasUnicas.length,
          fechasList: datos.fechasUnicas,
          conteoTotal: datos.conteoTotal
        });
      } else {
        console.log('❌ No se encontraron datos para 2024-10');
      }
      
    } else {
      console.log('❌ Error obteniendo filtros:', filtersResult);
    }
    
  } catch (error) {
    console.error('❌ Error en análisis:', error);
  }
}

testPeriodsBreakdown();

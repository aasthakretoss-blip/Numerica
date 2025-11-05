// Test para simular la agrupación que hace el frontend
require('dotenv').config();
const payrollFilterService = require('./services/payrollFilterService');

// Simular las funciones del frontend exactamente como están en periodUtils.ts
const normalizeCveperDate = (cveper) => {
  if (!cveper || typeof cveper !== 'string') {
    return '';
  }

  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(cveper)) {
      return cveper;
    }

    if (cveper.includes('T') || cveper.includes('Z')) {
      const date = new Date(cveper);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    const date = new Date(cveper);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    return cveper;
  } catch (error) {
    return cveper;
  }
};

const extractYearMonthFromCveper = (cveper) => {
  if (!cveper || typeof cveper !== 'string') {
    return { year: '', month: '', monthName: '', yearShort: '' };
  }

  try {
    const normalizedDate = normalizeCveperDate(cveper);
    const [yearFull, monthNum] = normalizedDate.split('-');
    
    if (!yearFull || !monthNum) {
      return { year: '', month: '', monthName: '', yearShort: '' };
    }

    const months = {
      '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
      '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
      '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
    };

    const monthName = months[monthNum] || monthNum;
    const yearShort = yearFull.slice(-2);

    return { year: yearFull, month: monthNum, monthName, yearShort };
  } catch (error) {
    return { year: '', month: '', monthName: '', yearShort: '' };
  }
};

const groupPeriodsByMonth = (periodOptions) => {
  console.log('🔄 groupPeriodsByMonth - ENTRADA:', {
    esArray: Array.isArray(periodOptions),
    longitud: periodOptions ? periodOptions.length : 0,
    primeros3: periodOptions ? periodOptions.slice(0, 3) : []
  });
  
  if (!periodOptions || !Array.isArray(periodOptions)) {
    console.log('❌ groupPeriodsByMonth - RETORNANDO ARRAY VACÍO por entrada inválida');
    return [];
  }

  const grouped = {};
  let procesados = 0;
  let ignorados = 0;

  periodOptions.forEach((option, index) => {
    const normalizedCveper = normalizeCveperDate(option.value);
    const { year, month, monthName, yearShort } = extractYearMonthFromCveper(normalizedCveper);
    
    if (index < 5) { // Solo log de los primeros 5 para no saturar
      console.log(`📋 Procesando [${index}]:`, {
        original: option.value,
        normalizado: normalizedCveper,
        year, month, monthName, yearShort,
        valido: !!(year && month && monthName)
      });
    }
    
    if (!year || !month || !monthName) {
      ignorados++;
      return;
    }

    const groupKey = `${year}-${month}`;
    
    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        value: groupKey,
        label: `${monthName} ${yearShort}`,
        count: 0,
        cveperValues: []
      };
    }

    grouped[groupKey].count += parseInt(option.count) || 0;
    grouped[groupKey].cveperValues.push(normalizedCveper);
    procesados++;
  });

  const result = Object.values(grouped).sort((a, b) => {
    return b.value.localeCompare(a.value);
  });

  console.log('✅ groupPeriodsByMonth - RESULTADO:', {
    procesados,
    ignorados,
    gruposCreados: result.length,
    primeros3Grupos: result.slice(0, 3).map(g => ({
      value: g.value,
      label: g.label,
      count: g.count
    }))
  });

  return result;
};

async function testFrontendGrouping() {
  console.log('🧪 === TEST DE AGRUPACIÓN DEL FRONTEND ===');
  
  try {
    // Obtener datos reales del backend
    const filtersResult = await payrollFilterService.getFiltersWithCardinality({});
    
    if (filtersResult.success) {
      const rawPeriodos = filtersResult.data.periodos || [];
      
      console.log('📊 Datos del backend:', {
        total: rawPeriodos.length,
        primeros3: rawPeriodos.slice(0, 3).map(p => ({ value: p.value, count: p.count }))
      });
      
      // Simular la agrupación que hace el frontend
      console.log('\n🔄 Aplicando agrupación del frontend...');
      const groupedPeriods = groupPeriodsByMonth(rawPeriodos);
      
      // Buscar específicamente octubre 2024
      const octubre2024 = groupedPeriods.find(p => p.value === '2024-10');
      if (octubre2024) {
        console.log('\n✅ OCTUBRE 2024 ENCONTRADO:', {
          value: octubre2024.value,
          label: octubre2024.label,
          count: octubre2024.count,
          fechasIncluidas: octubre2024.cveperValues.length,
          primerasFechas: octubre2024.cveperValues.slice(0, 5)
        });
      } else {
        console.log('\n❌ OCTUBRE 2024 NO ENCONTRADO');
        
        // Verificar si hay fechas de octubre en los datos crudos
        const fechasOctubre = rawPeriodos.filter(p => p.value.includes('2024-10'));
        console.log('🔍 Fechas de octubre en datos crudos:', fechasOctubre.length);
        if (fechasOctubre.length > 0) {
          console.log('📋 Primeras 3 fechas de octubre:', fechasOctubre.slice(0, 3));
        }
      }
      
    } else {
      console.log('❌ Error obteniendo datos del backend:', filtersResult);
    }
    
  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

testFrontendGrouping();

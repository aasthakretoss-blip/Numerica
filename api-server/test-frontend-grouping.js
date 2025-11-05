// Test para simular la agrupación que hace el frontend
require('dotenv').config();

// Simular las funciones del frontend
const normalizeCveperDate = (cveper) => {
  if (!cveper || typeof cveper !== 'string') {
    return '';
  }

  try {
    // Si ya está en formato YYYY-MM-DD, retornarlo tal como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(cveper)) {
      return cveper;
    }

    // Si es un timestamp ISO, convertirlo
    if (cveper.includes('T') || cveper.includes('Z')) {
      const date = new Date(cveper);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    // Si es otro formato, intentar parsearlo
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
  if (!periodOptions || !Array.isArray(periodOptions)) {
    return [];
  }

  const grouped = {};

  periodOptions.forEach(option => {
    const normalizedCveper = normalizeCveperDate(option.value);
    const { year, month, monthName, yearShort } = extractYearMonthFromCveper(normalizedCveper);
    
    if (!year || !month || !monthName) {
      console.warn('Período cveper inválido ignorado:', option.value, '-> normalizado:', normalizedCveper);
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
  });

  const result = Object.values(grouped).sort((a, b) => {
    return b.value.localeCompare(a.value);
  });

  return result;
};

async function testFrontendGrouping() {
  console.log('🧪 === TEST DE AGRUPACIÓN DEL FRONTEND ===');
  
  try {
    // Obtener datos reales del backend
    const payrollFilterService = require('./services/payrollFilterService');
    const filtersResult = await payrollFilterService.getFiltersWithCardinality({});
    
    if (filtersResult.success) {
      const rawPeriodos = filtersResult.data.periodos || [];
      
      console.log('📊 Datos del backend:', {
        total: rawPeriodos.length,
        primeros5: rawPeriodos.slice(0, 5).map(p => ({ value: p.value, count: p.count }))
      });
      
      // Simular la agrupación que hace el frontend
      console.log('\n🔄 Aplicando agrupación del frontend...');
      const groupedPeriods = groupPeriodsByMonth(rawPeriodos);
      
      console.log('📅 Períodos agrupados:', {
        total: groupedPeriods.length,
        primeros5: groupedPeriods.slice(0, 5).map(p => ({
          value: p.value,
          label: p.label,
          count: p.count,
          fechasIncluidas: p.cveperValues.length
        }))
      });
      
      // Buscar específicamente octubre 2024
      const octubre2024 = groupedPeriods.find(p => p.value === '2024-10');
      if (octubre2024) {
        console.log('\n✅ Octubre 2024 encontrado:', {
          label: octubre2024.label,
          count: octubre2024.count,
          fechasIncluidas: octubre2024.cveperValues.length,
          primerasFechas: octubre2024.cveperValues.slice(0, 5)
        });
      } else {
        console.log('\n❌ Octubre 2024 NO encontrado en agrupación');
        
        // Verificar si hay fechas de octubre en los datos crudos
        const fechasOctubre = rawPeriodos.filter(p => p.value.includes('2024-10'));
        console.log('🔍 Fechas de octubre en datos crudos:', fechasOctubre.length);
        if (fechasOctubre.length > 0) {
          console.log('📋 Ejemplos:', fechasOctubre.slice(0, 3));
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

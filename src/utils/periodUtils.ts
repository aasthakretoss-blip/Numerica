// Utilidades para manejo de períodos cveper

export interface PeriodOption {
  value: string;
  label: string;
  count: number;
  cveperValues: string[]; // Todas las fechas cveper que pertenecen a este mes
}

/**
 * Normaliza una fecha cveper a formato YYYY-MM-DD
 * @param cveper - Fecha en cualquier formato (YYYY-MM-DD, ISO timestamp, etc.)
 * @returns Fecha normalizada en formato YYYY-MM-DD
 */
export const normalizeCveperDate = (cveper: string): string => {
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

    return cveper; // Retornar tal como está si no se puede normalizar
  } catch (error) {
    console.warn('❌ Error normalizing cveper date:', cveper, error);
    return cveper;
  }
};

/**
 * Extrae el año y mes de una fecha cveper (formato: YYYY-MM-DD o timestamp)
 * @param cveper - Fecha en cualquier formato
 * @returns {year: string, month: string, monthName: string}
 */
export const extractYearMonthFromCveper = (cveper: string): { year: string; month: string; monthName: string; yearShort: string } => {
  if (!cveper || typeof cveper !== 'string') {
    return { year: '', month: '', monthName: '', yearShort: '' };
  }

  try {
    // Primero normalizar la fecha
    const normalizedDate = normalizeCveperDate(cveper);
    
    // Separar la fecha normalizada (formato: YYYY-MM-DD)
    const [yearFull, monthNum] = normalizedDate.split('-');
    
    if (!yearFull || !monthNum) {
      return { year: '', month: '', monthName: '', yearShort: '' };
    }

    const months: { [key: string]: string } = {
      '01': 'Enero',
      '02': 'Febrero',
      '03': 'Marzo',
      '04': 'Abril',
      '05': 'Mayo',
      '06': 'Junio',
      '07': 'Julio',
      '08': 'Agosto',
      '09': 'Septiembre',
      '10': 'Octubre',
      '11': 'Noviembre',
      '12': 'Diciembre'
    };

    const monthName = months[monthNum] || monthNum;
    const yearShort = yearFull.slice(-2); // Últimos 2 dígitos del año

    return {
      year: yearFull,
      month: monthNum,
      monthName,
      yearShort
    };
  } catch (error) {
    console.error('Error extracting year/month from cveper:', cveper, error);
    return { year: '', month: '', monthName: '', yearShort: '' };
  }
};

/**
 * Agrupa opciones de períodos por mes y año
 * @param periodOptions - Array de opciones con value (cveper) y count
 * @returns Array de PeriodOption agrupadas por mes
 */
export const groupPeriodsByMonth = (periodOptions: { value: string; count: number }[]): PeriodOption[] => {
  if (!periodOptions || !Array.isArray(periodOptions)) {
    return [];
  }

  // Agrupar por año-mes
  const grouped: { [key: string]: PeriodOption } = {};

  periodOptions.forEach(option => {
    // Normalizar el valor cveper antes de procesarlo
    const normalizedCveper = normalizeCveperDate(option.value);
    const { year, month, monthName, yearShort } = extractYearMonthFromCveper(normalizedCveper);
    
    if (!year || !month || !monthName) {
      console.warn('Período cveper inválido ignorado:', option.value, '-> normalizado:', normalizedCveper);
      return;
    }

    // Clave única para agrupar: YYYY-MM
    const groupKey = `${year}-${month}`;
    
    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        value: groupKey, // Valor que se usará para identificar el grupo
        label: `${monthName} ${yearShort}`, // Etiqueta amigable: "Octubre 24"
        count: 0,
        cveperValues: [] // Array de todos los cveper de este mes (normalizados)
      };
    }

    // Sumar conteos y agregar cveper normalizado al grupo
    grouped[groupKey].count += option.count;
    grouped[groupKey].cveperValues.push(normalizedCveper);
  });

  // Convertir a array y ordenar por año-mes descendente (más recientes primero)
  const result = Object.values(grouped).sort((a, b) => {
    // Ordenar por value (que es YYYY-MM) descendente
    return b.value.localeCompare(a.value);
  });

  console.log('📅 Períodos agrupados por mes:', result);
  return result;
};

/**
 * Obtiene todos los valores cveper que corresponden a un mes seleccionado
 * @param selectedMonthValue - Valor del mes seleccionado (formato: YYYY-MM)
 * @param groupedPeriods - Array de períodos agrupados
 * @returns Array de valores cveper para ese mes
 */
export const getCveperValuesForMonth = (selectedMonthValue: string, groupedPeriods: PeriodOption[]): string[] => {
  const foundGroup = groupedPeriods.find(group => group.value === selectedMonthValue);
  return foundGroup ? foundGroup.cveperValues : [];
};

/**
 * Convierte selecciones de meses a valores cveper para filtros de API
 * @param selectedMonths - Array de meses seleccionados (formato: YYYY-MM)
 * @param groupedPeriods - Array de períodos agrupados
 * @returns Array de valores cveper para filtrar (normalizados)
 */
export const convertMonthSelectionsToCveper = (selectedMonths: string[], groupedPeriods: PeriodOption[]): string[] => {
  console.log('🔄 Iniciando conversión de meses a cveper:', {
    selectedMonths,
    groupedPeriodsAvailable: groupedPeriods.length
  });
  
  const cveperValues: string[] = [];
  
  selectedMonths.forEach(monthValue => {
    const monthCveperValues = getCveperValuesForMonth(monthValue, groupedPeriods);
    console.log(`📅 Mes ${monthValue}:`, {
      cveperCount: monthCveperValues.length,
      cveperValues: monthCveperValues.slice(0, 5), // Solo primeros 5 para no saturar logs
      moreCveper: monthCveperValues.length > 5 ? `... y ${monthCveperValues.length - 5} más` : ''
    });
    cveperValues.push(...monthCveperValues);
  });

  // Normalizar TODOS los valores antes de retornar
  const normalizedValues = [...new Set(cveperValues)].map(cveper => normalizeCveperDate(cveper));
  
  console.log('✅ Conversión completada:', {
    totalCveperValues: normalizedValues.length,
    primerosValores: normalizedValues.slice(0, 10),
    formatoEjemplo: normalizedValues[0] ? `Formato detectado: ${/^\d{4}-\d{2}-\d{2}$/.test(normalizedValues[0]) ? 'YYYY-MM-DD ✅' : 'Otro formato ❌'}` : 'Sin valores'
  });
  
  return normalizedValues;
};

/**
 * Formatea un valor cveper para mostrar en la tabla (solo fecha, sin timestamp)
 * @param cveper - Valor cveper original (puede ser string, timestamp, etc.)
 * @returns Fecha cveper en formato YYYY-MM-DD sin timestamp
 */
export const formatCveperForTable = (cveper: any): string => {
  // Si es null, undefined, vacío o 'null' string
  if (!cveper || cveper === null || cveper === undefined || cveper === '' || cveper === 'null' || cveper === 'undefined') {
    return '';
  }
  
  // Si es un objeto, intentar extraer propiedades de fecha comunes
  if (typeof cveper === 'object' && cveper !== null) {
    const possibleDateFields = ['cveper', 'fecha', 'date', 'periodo', 'value', 'mes'];
    
    for (const field of possibleDateFields) {
      if (cveper[field]) {
        const extractedValue = formatCveperForTable(cveper[field]);
        if (extractedValue) {
          return extractedValue;
        }
      }
    }
    
    console.warn('❌ formatCveperForTable - No se pudo extraer fecha válida del objeto:', cveper);
    return '';
  }
  
  try {
    const cveperStr = cveper.toString().trim();
    
    if (!cveperStr || cveperStr === 'null' || cveperStr === 'undefined') {
      return '';
    }
    
    // Si ya está en formato YYYY-MM-DD, retornarlo
    if (/^\d{4}-\d{2}-\d{2}$/.test(cveperStr)) {
      return cveperStr;
    }
    
    // Intentar parsear como fecha/timestamp
    const date = new Date(cveperStr);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
      return date.toISOString().split('T')[0];
    }
    
    // Si no se puede convertir, intentar extraer fecha con regex
    const dateMatch = cveperStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    }
    
    // Intentar otros formatos comunes
    const otherDateMatch = cveperStr.match(/(\d{4})\/(\d{2})\/(\d{2})/) || 
                          cveperStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
    if (otherDateMatch) {
      return `${otherDateMatch[1]}-${otherDateMatch[2]}-${otherDateMatch[3]}`;
    }
    
    console.warn('⚠️ formatCveperForTable - No se pudo convertir a fecha válida:', cveperStr);
    return '';
    
  } catch (error) {
    console.error('❌ formatCveperForTable - Error procesando cveper:', cveper, error);
    return '';
  }
};

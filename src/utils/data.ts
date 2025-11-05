// Función para parsear valores monetarios
export const parseMoney = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
  }
  return 0;
};

// Función para formatear moneda mexicana
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(value);
};

// Función para formatear números con separadores de miles
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('es-MX').format(value);
};

// Función para parsear períodos de texto (como "24_AGOSTO") a fechas legibles
export const formatPeriod = (period: string): string => {
  if (!period) return 'N/A';
  
  // Si el período ya es una fecha válida, formatearla
  try {
    const date = new Date(period);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('es-MX', { 
        year: 'numeric', 
        month: 'long' 
      });
    }
  } catch {
    // Si no es una fecha, intentar formatear texto como "24_AGOSTO"
  }
  
  // Formatear períodos como "24_AGOSTO" a "Agosto 2024"
  if (period.includes('_')) {
    const [year, month] = period.split('_');
    const months: { [key: string]: string } = {
      'ENERO': 'Enero',
      'FEBRERO': 'Febrero', 
      'MARZO': 'Marzo',
      'ABRIL': 'Abril',
      'MAYO': 'Mayo',
      'JUNIO': 'Junio',
      'JULIO': 'Julio',
      'AGOSTO': 'Agosto',
      'SEPTIEMBRE': 'Septiembre',
      'OCTUBRE': 'Octubre',
      'NOVIEMBRE': 'Noviembre',
      'DICIEMBRE': 'Diciembre'
    };
    
    const monthName = months[month] || month;
    const fullYear = year.length === 2 ? `20${year}` : year;
    
    return `${monthName} ${fullYear}`;
  }
  
  return period;
};

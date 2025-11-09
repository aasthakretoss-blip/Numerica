/**
 * Utilidades para formatear fechas sin mostrar timestamps
 */

/**
 * Formatea una fecha para mostrar solo la fecha sin hora
 * @param {string|Date} fecha - La fecha a formatear (puede ser ISO string, timestamp, o Date object)
 * @param {string} locale - Locale para el formato (por defecto 'es-MX')
 * @returns {string} Fecha formateada solo con día, mes y año
 */
export const formatearFechaSoloFecha = (fecha, locale = 'es-MX') => {
  if (!fecha) return 'N/A';
  
  try {
    // Si es un timestamp ISO, extraer solo la parte de la fecha
    if (typeof fecha === 'string' && fecha.includes('T')) {
      fecha = fecha.split('T')[0]; // Tomar solo la parte antes de 'T'
    }
    
    // Crear fecha con hora fija para evitar problemas de timezone
    const fechaObj = new Date(fecha + (fecha.includes('T') ? '' : 'T12:00:00'));
    
    return fechaObj.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Error formateando fecha:', fecha, error);
    return 'Fecha inválida';
  }
};

/**
 * Formatea una fecha para mostrar solo la fecha de forma corta (dd/mm/yyyy)
 * @param {string|Date} fecha - La fecha a formatear
 * @param {string} locale - Locale para el formato (por defecto 'es-MX')
 * @returns {string} Fecha formateada en formato corto
 */
export const formatearFechaCorta = (fecha, locale = 'es-MX') => {
  if (!fecha) return 'N/A';
  
  try {
    let fechaObj;
    
    // Si ya es un objeto Date, usarlo directamente
    if (fecha instanceof Date) {
      fechaObj = fecha;
    } else if (typeof fecha === 'string') {
      // Si es un timestamp ISO, extraer solo la parte de la fecha
      if (fecha.includes('T')) {
        fecha = fecha.split('T')[0];
      }
      fechaObj = new Date(fecha + (fecha.includes('T') ? '' : 'T12:00:00'));
    } else {
      // Intentar crear Date desde el valor recibido
      fechaObj = new Date(fecha);
    }
    
    return fechaObj.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.warn('Error formateando fecha corta:', fecha, error);
    return 'Fecha inválida';
  }
};

/**
 * Formatea una fecha para mostrar día y mes (sin año)
 * @param {string|Date} fecha - La fecha a formatear
 * @param {string} locale - Locale para el formato (por defecto 'es-MX')
 * @returns {string} Fecha formateada con día y mes
 */
export const formatearFechaDiaMes = (fecha, locale = 'es-MX') => {
  if (!fecha) return 'N/A';
  
  try {
    if (typeof fecha === 'string' && fecha.includes('T')) {
      fecha = fecha.split('T')[0];
    }
    
    const fechaObj = new Date(fecha + (fecha.includes('T') ? '' : 'T12:00:00'));
    
    return fechaObj.toLocaleDateString(locale, {
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Error formateando fecha día/mes:', fecha, error);
    return 'Fecha inválida';
  }
};

/**
 * Obtiene la fecha actual sin hora
 * @param {string} locale - Locale para el formato (por defecto 'es-MX')
 * @returns {string} Fecha actual formateada
 */
export const fechaActualSinHora = (locale = 'es-MX') => {
  return new Date().toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export default {
  formatearFechaSoloFecha,
  formatearFechaCorta,
  formatearFechaDiaMes,
  fechaActualSinHora
};

/**
 * Utilidades para cálculo de fechas FPL (Fondo de Pensiones y Jubilaciones)
 */

import { formatearFechaCorta, formatearFechaSoloFecha } from './dateUtils';
import { buscarRFCEnObjeto } from './rfcUtils';

/**
 * Normaliza una fecha para cálculos FPL
 * @param {string|Date} fecha - Fecha a normalizar
 * @returns {Date|null} Fecha normalizada o null si es inválida
 */
export const normalizarFechaFPL = (fecha) => {
  if (!fecha) return null;
  
  try {
    let fechaStr = fecha;
    
    // Si es timestamp ISO, extraer solo la parte de fecha
    if (typeof fechaStr === 'string' && fechaStr.includes('T')) {
      fechaStr = fechaStr.split('T')[0];
    }
    
    // Crear fecha con hora fija para evitar problemas de timezone
    const fechaObj = new Date(fechaStr + (fechaStr.includes('T') ? '' : 'T12:00:00'));
    
    // Verificar que la fecha sea válida
    if (isNaN(fechaObj.getTime())) {
      return null;
    }
    
    return fechaObj;
  } catch (error) {
    console.warn('Error normalizando fecha FPL:', fecha, error);
    return null;
  }
};

/**
 * Calcula la fecha FPL más reciente basada en datos de payroll
 * @param {Array} datosPayroll - Array de registros de payroll del empleado
 * @returns {Object|null} Información de la fecha FPL calculada
 */
export const calcularFechaFPLReciente = (datosPayroll) => {
  if (!Array.isArray(datosPayroll) || datosPayroll.length === 0) {
    return null;
  }
  
  const fechasValidas = [];
  
  // Extraer fechas de diferentes campos posibles
  datosPayroll.forEach((registro, index) => {
    const camposFecha = ['cveper', 'fecha_fpl', 'fecha_calculo', 'periodo', 'mes'];
    
    camposFecha.forEach(campo => {
      const fechaValor = registro[campo];
      if (fechaValor) {
        const fechaNormalizada = normalizarFechaFPL(fechaValor);
        if (fechaNormalizada) {
          fechasValidas.push({
            fecha: fechaNormalizada,
            valor: fechaValor,
            campo: campo,
            registro: index,
            metadata: {
              rfc: buscarRFCEnObjeto(registro),
              empleado: registro.nombre || registro['Nombre completo'] || 'N/A'
            }
          });
        }
      }
    });
  });
  
  if (fechasValidas.length === 0) {
    return null;
  }
  
  // Ordenar por fecha (más reciente primero)
  fechasValidas.sort((a, b) => b.fecha - a.fecha);
  
  const fechaReciente = fechasValidas[0];
  
  return {
    fecha: fechaReciente.fecha,
    fechaFormateada: formatearFechaCorta(fechaReciente.fecha),
    fechaISO: fechaReciente.fecha.toISOString().split('T')[0],
    valor: fechaReciente.valor,
    campo: fechaReciente.campo,
    totalRegistros: datosPayroll.length,
    fechasEncontradas: fechasValidas.length,
    metadata: fechaReciente.metadata
  };
};

/**
 * Obtiene todas las fechas FPL únicas de los datos de payroll
 * @param {Array} datosPayroll - Array de registros de payroll
 * @param {Object} opciones - Opciones de filtrado y formato
 * @returns {Array} Array de fechas FPL únicas ordenadas
 */
export const obtenerFechasFPLUnicas = (datosPayroll, opciones = {}) => {
  const {
    ordenDescendente = true,
    incluirConteos = true,
    filtrarPorRFC = null,
    camposFecha = ['cveper', 'fecha_fpl', 'fecha_calculo', 'periodo', 'mes']
  } = opciones;
  
  if (!Array.isArray(datosPayroll) || datosPayroll.length === 0) {
    return [];
  }
  
  const fechasMap = new Map();
  
  datosPayroll.forEach((registro, index) => {
    // Filtrar por RFC si se especifica
    if (filtrarPorRFC) {
      const rfcRegistro = buscarRFCEnObjeto(registro);
      if (rfcRegistro !== filtrarPorRFC) {
        return; // Saltar este registro
      }
    }
    
    camposFecha.forEach(campo => {
      const fechaValor = registro[campo];
      if (fechaValor) {
        const fechaNormalizada = normalizarFechaFPL(fechaValor);
        if (fechaNormalizada) {
          const fechaISO = fechaNormalizada.toISOString().split('T')[0];
          
          if (fechasMap.has(fechaISO)) {
            const entrada = fechasMap.get(fechaISO);
            entrada.count += 1;
            entrada.registros.push(index);
          } else {
            fechasMap.set(fechaISO, {
              fecha: fechaNormalizada,
              fechaISO: fechaISO,
              fechaFormateada: formatearFechaCorta(fechaNormalizada),
              valor: fechaValor,
              campo: campo,
              count: 1,
              registros: [index]
            });
          }
        }
      }
    });
  });
  
  // Convertir Map a array
  const fechasArray = Array.from(fechasMap.values());
  
  // Ordenar por fecha
  fechasArray.sort((a, b) => {
    return ordenDescendente ? 
      b.fecha.getTime() - a.fecha.getTime() : 
      a.fecha.getTime() - b.fecha.getTime();
  });
  
  // Formatear resultado final
  return fechasArray.map(item => ({
    value: item.fechaISO,
    label: item.fechaFormateada,
    fecha: item.fecha,
    count: incluirConteos ? item.count : undefined,
    metadata: {
      campo: item.campo,
      registros: item.registros,
      valorOriginal: item.valor
    }
  }));
};

/**
 * Calcula estadísticas de fechas FPL para un empleado
 * @param {Array} datosPayroll - Datos de payroll del empleado
 * @param {string} rfc - RFC del empleado
 * @returns {Object} Estadísticas de fechas FPL
 */
export const calcularEstadisticasFechasFPL = (datosPayroll, rfc) => {
  const fechasFPL = obtenerFechasFPLUnicas(datosPayroll, {
    filtrarPorRFC: rfc,
    incluirConteos: true
  });
  
  if (fechasFPL.length === 0) {
    return {
      totalFechas: 0,
      fechaReciente: null,
      fechaAntigua: null,
      rangoMeses: 0,
      promedioRegistrosPorFecha: 0
    };
  }
  
  const fechaReciente = fechasFPL[0]; // Ya están ordenadas descendente
  const fechaAntigua = fechasFPL[fechasFPL.length - 1];
  
  // Calcular rango en meses
  const rangoMeses = Math.round(
    (fechaReciente.fecha.getTime() - fechaAntigua.fecha.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );
  
  // Calcular promedio de registros por fecha
  const totalRegistros = fechasFPL.reduce((sum, fecha) => sum + (fecha.count || 0), 0);
  const promedioRegistros = totalRegistros / fechasFPL.length;
  
  return {
    totalFechas: fechasFPL.length,
    fechaReciente: {
      fecha: fechaReciente.fecha,
      formateada: fechaReciente.label,
      iso: fechaReciente.value,
      registros: fechaReciente.count
    },
    fechaAntigua: {
      fecha: fechaAntigua.fecha,
      formateada: fechaAntigua.label,
      iso: fechaAntigua.value,
      registros: fechaAntigua.count
    },
    rangoMeses: rangoMeses,
    promedioRegistrosPorFecha: Math.round(promedioRegistros * 10) / 10,
    fechasCompletas: fechasFPL
  };
};

/**
 * Determina si una fecha FPL está dentro de un rango válido
 * @param {string|Date} fechaFPL - Fecha FPL a validar
 * @param {Object} opciones - Opciones de validación
 * @returns {boolean} true si la fecha es válida
 */
export const validarFechaFPL = (fechaFPL, opciones = {}) => {
  const {
    fechaMinima = new Date('2000-01-01'),
    fechaMaxima = new Date(),
    permitirFuturo = false
  } = opciones;
  
  const fecha = normalizarFechaFPL(fechaFPL);
  if (!fecha) return false;
  
  // Validar rango mínimo
  if (fecha < fechaMinima) return false;
  
  // Validar rango máximo
  if (!permitirFuturo && fecha > fechaMaxima) return false;
  
  return true;
};

/**
 * Formatea una fecha FPL para mostrar en la UI
 * @param {string|Date} fechaFPL - Fecha FPL a formatear
 * @param {Object} opciones - Opciones de formato
 * @returns {string} Fecha formateada
 */
export const formatearFechaFPL = (fechaFPL, opciones = {}) => {
  const {
    formato = 'corto', // 'corto', 'largo', 'iso'
    locale = 'es-MX'
  } = opciones;
  
  const fecha = normalizarFechaFPL(fechaFPL);
  if (!fecha) return 'Fecha inválida';
  
  switch (formato) {
    case 'largo':
      return formatearFechaSoloFecha(fecha, locale);
    case 'iso':
      return fecha.toISOString().split('T')[0];
    case 'corto':
    default:
      return formatearFechaCorta(fecha, locale);
  }
};

/**
 * Busca la fecha FPL más apropiada para un periodo específico
 * @param {Array} datosPayroll - Datos de payroll
 * @param {string|Date} periodoObjetivo - Periodo objetivo a buscar
 * @param {string} rfc - RFC del empleado
 * @returns {Object|null} Fecha FPL más apropiada
 */
export const buscarFechaFPLPorPeriodo = (datosPayroll, periodoObjetivo, rfc) => {
  const fechaObjetivo = normalizarFechaFPL(periodoObjetivo);
  if (!fechaObjetivo) return null;
  
  const fechasFPL = obtenerFechasFPLUnicas(datosPayroll, {
    filtrarPorRFC: rfc,
    ordenDescendente: false // Orden ascendente para búsqueda
  });
  
  if (fechasFPL.length === 0) return null;
  
  // Buscar la fecha más cercana al periodo objetivo
  let fechaMasCercana = fechasFPL[0];
  let diferenciaMinima = Math.abs(fechaObjetivo.getTime() - fechasFPL[0].fecha.getTime());
  
  for (const fechaFPL of fechasFPL) {
    const diferencia = Math.abs(fechaObjetivo.getTime() - fechaFPL.fecha.getTime());
    if (diferencia < diferenciaMinima) {
      diferenciaMinima = diferencia;
      fechaMasCercana = fechaFPL;
    }
  }
  
  return {
    ...fechaMasCercana,
    diferenciaDias: Math.round(diferenciaMinima / (1000 * 60 * 60 * 24)),
    periodoObjetivo: formatearFechaFPL(fechaObjetivo)
  };
};

const fplUtils = {
  normalizarFechaFPL,
  calcularFechaFPLReciente,
  obtenerFechasFPLUnicas,
  calcularEstadisticasFechasFPL,
  validarFechaFPL,
  formatearFechaFPL,
  buscarFechaFPLPorPeriodo
};

export default fplUtils;

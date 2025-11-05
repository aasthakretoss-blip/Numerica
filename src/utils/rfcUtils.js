/**
 * Utilidades para validación y manejo de RFC (Registro Federal de Contribuyentes)
 */

/**
 * Valida el formato de un RFC mexicano
 * @param {string} rfc - El RFC a validar
 * @returns {boolean} true si el formato es válido
 */
export const validarFormatoRFC = (rfc) => {
  if (!rfc || typeof rfc !== 'string') return false;
  
  // Remover espacios y convertir a mayúsculas
  const rfcLimpio = rfc.trim().toUpperCase();
  
  // RFC de persona física: 4 letras + 6 dígitos + 2 caracteres alfanuméricos
  const regexPersonaFisica = /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{2}$/;
  
  // RFC de persona moral: 3 letras + 6 dígitos + 2 caracteres alfanuméricos  
  const regexPersonaMoral = /^[A-ZÑ&]{3}[0-9]{6}[A-Z0-9]{2}$/;
  
  return regexPersonaFisica.test(rfcLimpio) || regexPersonaMoral.test(rfcLimpio);
};

/**
 * Limpia y formatea un RFC
 * @param {string} rfc - El RFC a limpiar
 * @returns {string} RFC limpio y formateado
 */
export const limpiarRFC = (rfc) => {
  if (!rfc || typeof rfc !== 'string') return '';
  
  // Remover espacios, guiones y convertir a mayúsculas
  return rfc.trim().replace(/[-\s]/g, '').toUpperCase();
};

/**
 * Extrae la fecha de nacimiento de un RFC de persona física
 * @param {string} rfc - El RFC de persona física
 * @returns {Object|null} Objeto con año, mes, día o null si no es válido
 */
export const extraerFechaNacimientoRFC = (rfc) => {
  if (!validarFormatoRFC(rfc)) return null;
  
  const rfcLimpio = limpiarRFC(rfc);
  
  // Solo para personas físicas (4 letras iniciales)
  if (rfcLimpio.length !== 13) return null;
  
  try {
    // Extraer año, mes, día de las posiciones 4-9
    const año = parseInt(rfcLimpio.substring(4, 6));
    const mes = parseInt(rfcLimpio.substring(6, 8));
    const día = parseInt(rfcLimpio.substring(8, 10));
    
    // Determinar el siglo (asumiendo que años 00-29 son 2000s, 30-99 son 1900s)
    const añoCompleto = año <= 29 ? 2000 + año : 1900 + año;
    
    return {
      año: añoCompleto,
      mes: mes,
      día: día,
      fecha: new Date(añoCompleto, mes - 1, día) // mes - 1 porque Date usa 0-11 para meses
    };
  } catch (error) {
    console.warn('Error extrayendo fecha de RFC:', rfc, error);
    return null;
  }
};

/**
 * Calcula la edad actual basada en un RFC
 * @param {string} rfc - El RFC de persona física
 * @returns {number|null} Edad en años o null si no se puede calcular
 */
export const calcularEdadDesdeRFC = (rfc) => {
  const fechaNacimiento = extraerFechaNacimientoRFC(rfc);
  if (!fechaNacimiento) return null;
  
  const hoy = new Date();
  const fechaNac = fechaNacimiento.fecha;
  
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const mesDif = hoy.getMonth() - fechaNac.getMonth();
  
  if (mesDif < 0 || (mesDif === 0 && hoy.getDate() < fechaNac.getDate())) {
    edad--;
  }
  
  return edad;
};

/**
 * Determina si un RFC es de persona física o moral
 * @param {string} rfc - El RFC a analizar
 * @returns {string|null} 'fisica', 'moral' o null si no es válido
 */
export const tipoPersonaRFC = (rfc) => {
  if (!validarFormatoRFC(rfc)) return null;
  
  const rfcLimpio = limpiarRFC(rfc);
  return rfcLimpio.length === 13 ? 'fisica' : 'moral';
};

/**
 * Busca RFC en un objeto usando diferentes nombres de campo posibles
 * @param {Object} objeto - Objeto donde buscar el RFC
 * @param {Array<string>} camposPosibles - Array de nombres de campo a buscar
 * @returns {string|null} RFC encontrado o null
 */
export const buscarRFCEnObjeto = (objeto, camposPosibles = ['rfc', 'RFC', 'numrfc', 'numero_rfc', 'rfcEmpleado']) => {
  if (!objeto || typeof objeto !== 'object') return null;
  
  for (const campo of camposPosibles) {
    const valor = objeto[campo];
    if (valor && typeof valor === 'string' && valor.trim().length > 0) {
      const rfcLimpio = limpiarRFC(valor);
      if (validarFormatoRFC(rfcLimpio)) {
        return rfcLimpio;
      }
    }
  }
  
  return null;
};

/**
 * Valida y normaliza un RFC para uso en la aplicación
 * @param {string} rfc - RFC a procesar
 * @returns {Object} Resultado de validación con RFC limpio e información
 */
export const procesarRFC = (rfc) => {
  const resultado = {
    original: rfc,
    limpio: '',
    valido: false,
    tipo: null,
    edad: null,
    fechaNacimiento: null,
    error: null
  };
  
  try {
    if (!rfc) {
      resultado.error = 'RFC no proporcionado';
      return resultado;
    }
    
    resultado.limpio = limpiarRFC(rfc);
    resultado.valido = validarFormatoRFC(resultado.limpio);
    
    if (!resultado.valido) {
      resultado.error = 'Formato de RFC inválido';
      return resultado;
    }
    
    resultado.tipo = tipoPersonaRFC(resultado.limpio);
    
    if (resultado.tipo === 'fisica') {
      resultado.fechaNacimiento = extraerFechaNacimientoRFC(resultado.limpio);
      resultado.edad = calcularEdadDesdeRFC(resultado.limpio);
    }
    
  } catch (error) {
    resultado.error = `Error procesando RFC: ${error.message}`;
    console.error('Error en procesarRFC:', error);
  }
  
  return resultado;
};

export default {
  validarFormatoRFC,
  limpiarRFC,
  extraerFechaNacimientoRFC,
  calcularEdadDesdeRFC,
  tipoPersonaRFC,
  buscarRFCEnObjeto,
  procesarRFC
};

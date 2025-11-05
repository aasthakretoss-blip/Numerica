/**
 * Utilidades para generar RFC desde CURP cuando el backend no proporciona RFC
 * TEMPORAL: Hasta que se corrija el backend para incluir todos los campos de la BD
 */

/**
 * Genera los primeros 10 dígitos de RFC basado en la CURP
 * IMPORTANTE: Solo se pueden obtener los primeros 10 dígitos. La homoclave (dígitos 11-12) 
 * y el dígito verificador (dígito 13) son asignados por el SAT y no se pueden determinar desde la CURP
 * @param {string} curp - CURP del empleado
 * @returns {string|null} RFC parcial (10 dígitos) o null si hay error
 */
export const generarRFCDesdeCURP = (curp) => {
  if (!curp || typeof curp !== 'string') return null;
  
  // Limpiar CURP
  const curpLimpio = curp.trim().toUpperCase();
  
  // Validar formato básico de CURP (18 caracteres)
  if (curpLimpio.length !== 18) return null;
  
  try {
    console.log(`🔍 Analizando CURP: ${curpLimpio}`);
    
    // Extraer componentes de la CURP para RFC
    // CURP formato: AABB######HCCCCC##
    // Posiciones:   0123456789012345678
    // Ejemplo:      OOFA900410HDFCRL03
    // RFC correspondiente: OOFA900410 + homoclave del SAT + dígito verificador
    
    const primeraLetraApellidoPaterno = curpLimpio[0];  // O
    const primeraVocalApellidoPaterno = curpLimpio[1];  // O 
    const primeraLetraApellidoMaterno = curpLimpio[2];  // F
    const primeraLetraNombre = curpLimpio[3];          // A
    const fechaNacimiento = curpLimpio.substring(4, 10); // 900410 (AAMMDD)
    
    console.log(`📊 Componentes extraídos de CURP:`);
    console.log(`   - 1ª letra Apellido Paterno: ${primeraLetraApellidoPaterno}`);
    console.log(`   - 1ª vocal Apellido Paterno: ${primeraVocalApellidoPaterno}`);
    console.log(`   - 1ª letra Apellido Materno: ${primeraLetraApellidoMaterno}`);
    console.log(`   - 1ª letra Nombre: ${primeraLetraNombre}`);
    console.log(`   - Fecha nacimiento: ${fechaNacimiento}`);
    
    // Construir SOLO los primeros 10 dígitos del RFC
    // RFC formato: AABN######CC#
    // Solo podemos determinar: AABN######
    // Los últimos 3 caracteres (CC# = homoclave + dígito verificador) son del SAT
    
    const rfcParcial = primeraLetraApellidoPaterno + 
                      primeraVocalApellidoPaterno + 
                      primeraLetraApellidoMaterno + 
                      primeraLetraNombre + 
                      fechaNacimiento;
    
    console.log(`🔧 RFC parcial generado (solo 10 dígitos): ${rfcParcial}`);
    console.log(`⚠️  NOTA: Faltan 3 dígitos (homoclave + verificador) que solo el SAT asigna`);
    
    // Validar longitud
    if (rfcParcial.length !== 10) {
      console.warn(`⚠️ RFC parcial con longitud incorrecta: ${rfcParcial.length} chars`);
      return null;
    }
    
    console.log(`✅ RFC parcial válido generado: ${rfcParcial}`);
    console.log(`📏 Longitud: ${rfcParcial.length} caracteres (de 13 totales del RFC completo)`);
    
    return rfcParcial;
    
  } catch (error) {
    console.error('❌ Error generando RFC parcial desde CURP:', error);
    return null;
  }
};

/**
 * Valida si un RFC existe en historico_fondos_gsau
 * @param {string} rfc - RFC a validar
 * @returns {Promise<boolean>} true si el RFC existe en fondos
 */
export const validarRFCEnFondos = async (rfc) => {
  if (!rfc) return false;
  
  try {
    console.log(`🔍 Validando RFC en fondos: ${rfc}`);
    
    // Usar el buildApiUrl para construir la URL de fondos
    const { buildApiUrl } = await import('../config/apiConfig');
    const { authenticatedFetch } = await import('../services/authenticatedFetch');
    
    const apiUrl = buildApiUrl(`/api/fondos?rfc=${rfc}&pageSize=1`);
    console.log(`📞 API URL validación fondos: ${apiUrl}`);
    
    const response = await authenticatedFetch(apiUrl);
    
    if (!response.ok) {
      console.log(`❌ Error validando RFC en fondos: ${response.status}`);
      return false;
    }
    
    const result = await response.json();
    const tieneResultados = result.success && result.data && result.data.length > 0;
    
    console.log(`${tieneResultados ? '✅' : '❌'} RFC ${rfc} ${tieneResultados ? 'SÍ' : 'NO'} existe en fondos`);
    
    return tieneResultados;
    
  } catch (error) {
    console.error(`❌ Error validando RFC en fondos:`, error);
    return false;
  }
};

/**
 * Busca RFC en los datos del empleado, lo valida contra fondos o lo genera desde CURP
 * @param {Object} empleado - Datos del empleado desde el backend
 * @returns {Promise<string|null>} RFC encontrado, validado o generado
 */
export const obtenerRFCDelEmpleado = async (empleado) => {
  console.log('🚀 ========== INICIO obtenerRFCDelEmpleado ==========');
  
  if (!empleado || typeof empleado !== 'object') {
    console.log('❌ Empleado inválido o nulo:', empleado);
    return null;
  }
  
  console.log('👤 Empleado recibido:', empleado);
  console.log('📋 Propiedades del empleado:', Object.keys(empleado));
  console.log(`📊 Total propiedades: ${Object.keys(empleado).length}`);
  
  // Lista de posibles nombres de campo para RFC (expandida)
  const camposRFC = [
    // Campos más comunes
    'RFC', 'rfc', 'numrfc', 'numero_rfc', 'rfcEmpleado', 
    'Rfc', 'NumRfc', 'NUMRFC', 'rfc_empleado',
    // Campos adicionales que podrían existir en historico_nominas_gsau
    'rfcTrabajador', 'rfc_trabajador', 'codigoRFC', 'codigo_rfc',
    'registroFiscal', 'registro_fiscal', 'claveRFC', 'clave_rfc',
    'identificadorFiscal', 'identificador_fiscal'
  ];
  
  console.log('🔍 FASE 1: Buscando RFC en campos conocidos de nóminas...');
  console.log('🏷️ Campos RFC a revisar:', camposRFC);
  console.log(`📋 Total campos a verificar: ${camposRFC.length}`);
  
  const candidatosRFC = [];
  
  // Buscar TODOS los posibles RFC en los campos disponibles
  for (let i = 0; i < camposRFC.length; i++) {
    const campo = camposRFC[i];
    console.log(`🔎 ${i + 1}/${camposRFC.length} Revisando campo "${campo}"...`);
    
    if (empleado.hasOwnProperty(campo)) {
      const valor = empleado[campo];
      console.log(`    ℹ️ Campo "${campo}" existe. Valor: ${valor}, Tipo: ${typeof valor}`);
      
      if (valor && typeof valor === 'string') {
        const rfcEncontrado = valor.trim().toUpperCase();
        console.log(`    🧽 RFC limpio: "${rfcEncontrado}", Longitud: ${rfcEncontrado.length}`);
        
        if (rfcEncontrado.length >= 12 && rfcEncontrado.length <= 13) {
          console.log(`    🎯 RFC candidato encontrado en "${campo}": ${rfcEncontrado}`);
          candidatosRFC.push({ campo, rfc: rfcEncontrado });
        } else {
          console.log(`    ⚠️ RFC con longitud incorrecta en "${campo}": ${rfcEncontrado.length} caracteres`);
        }
      } else {
        console.log(`    ❌ Campo "${campo}" no es string válido:`, valor);
      }
    } else {
      console.log(`    ✕ Campo "${campo}" no existe en empleado`);
    }
  }
  
  console.log(`📋 FASE 1 RESUMEN: ${candidatosRFC.length} candidatos RFC encontrados`);
  
  // FASE 2: Validar candidatos contra historico_fondos_gsau
  if (candidatosRFC.length > 0) {
    console.log('🔍 FASE 2: Validando candidatos RFC contra fondos...');
    
    for (let i = 0; i < candidatosRFC.length; i++) {
      const candidato = candidatosRFC[i];
      console.log(`🔎 ${i + 1}/${candidatosRFC.length} Validando RFC "${candidato.rfc}" del campo "${candidato.campo}"...`);
      
      const existeEnFondos = await validarRFCEnFondos(candidato.rfc);
      
      if (existeEnFondos) {
        console.log(`✅ ÉXITO: RFC ${candidato.rfc} encontrado en nóminas Y validado en fondos`);
        console.log(`🏷️ Campo origen: "${candidato.campo}"`);
        console.log('🚀 ========== FIN obtenerRFCDelEmpleado (ENCONTRADO Y VALIDADO) ==========');
        return candidato.rfc;
      } else {
        console.log(`❌ RFC ${candidato.rfc} del campo "${candidato.campo}" NO existe en fondos`);
      }
    }
    
    console.log('⚠️ FASE 2 COMPLETADA: Ningún candidato RFC fue validado en fondos');
  }
  
  console.log('🔧 FASE 3: Generando RFC parcial desde CURP como último recurso...');
  
  // Si no se encuentra RFC, generarlo desde CURP
  const camposCURP = ['curp', 'CURP', 'Curp'];
  let curpEncontrado = null;
  
  for (const campoCurp of camposCURP) {
    if (empleado[campoCurp]) {
      curpEncontrado = empleado[campoCurp];
      console.log(`📝 CURP encontrado en campo "${campoCurp}": ${curpEncontrado}`);
      break;
    }
  }
  
  if (curpEncontrado) {
    console.log('📝 CURP válido encontrado, generando RFC...');
    const rfcGenerado = generarRFCDesdeCURP(curpEncontrado);
    
    if (rfcGenerado) {
      console.log(`✅ ÉXITO: RFC generado desde CURP ${curpEncontrado}: ${rfcGenerado}`);
      console.log('🚀 ========== FIN obtenerRFCDelEmpleado (GENERADO) ==========');
      return rfcGenerado;
    } else {
      console.log(`❌ Error generando RFC desde CURP: ${curpEncontrado}`);
    }
  } else {
    console.log('❌ CURP no encontrado en empleado');
    console.log('🔍 Campos CURP revisados:', camposCURP);
  }
  
  console.log('❌ FASE 3 COMPLETADA: No se pudo generar RFC desde CURP');
  console.log('❌ RESULTADO FINAL: No se pudo obtener, validar ni generar RFC');
  console.log('🚀 ========== FIN obtenerRFCDelEmpleado (SIN RFC) ==========');
  return null;
};

/**
 * Determina si un RFC fue generado artificialmente desde CURP
 * @param {string} rfc - RFC a verificar
 * @returns {boolean} true si parece ser generado
 */
export const esRFCGenerado = (rfc) => {
  if (!rfc) return false;
  
  // Los RFC generados desde CURP tienen solo 10 dígitos
  // (faltarían 3 dígitos: homoclave + verificador del SAT)
  return rfc.length === 10;
};

/**
 * Formatea un RFC para mostrar con indicador si es generado desde CURP
 * @param {string} rfc - RFC a formatear
 * @returns {string} RFC formateado con indicador
 */
export const formatearRFCConIndicador = (rfc) => {
  if (!rfc) return 'RFC no disponible';
  
  if (esRFCGenerado(rfc)) {
    return `${rfc}*** (parcial desde CURP)`;
  }
  
  return rfc;
};

export default {
  generarRFCDesdeCURP,
  obtenerRFCDelEmpleado,
  validarRFCEnFondos,
  esRFCGenerado,
  formatearRFCConIndicador
};

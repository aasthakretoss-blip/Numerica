/**
 * Función de prueba para validar el cálculo de RFC desde CURP
 * Usar en la consola del navegador para probar
 */

import { generarRFCDesdeCURP, obtenerRFCDelEmpleado, esRFCGenerado } from './curpToRfcUtils';

/**
 * Prueba el algoritmo de generación de RFC con ejemplos reales
 */
export const probarGeneracionRFC = () => {
  console.log('🧪 INICIANDO PRUEBAS DE GENERACIÓN RFC');
  console.log('==========================================');
  
  // Ejemplo del log: AEMB930330MDFBGR07
  const curpEjemplo = 'AEMB930330MDFBGR07';
  const nombreCompleto = 'ABREU MAGAÑA BERTHA PAOLA';
  
  console.log(`👤 Empleado: ${nombreCompleto}`);
  console.log(`📄 CURP: ${curpEjemplo}`);
  console.log('');
  
  // Desglose manual esperado:
  console.log('🔍 DESGLOSE MANUAL ESPERADO:');
  console.log('- ABREU → A (primera letra) + E (primera vocal interna)');
  console.log('- MAGAÑA → M (primera letra)');  
  console.log('- BERTHA → B (primera letra)');
  console.log('- 930330 → Fecha nacimiento (30/03/1993)');
  console.log('- RFC parcial esperado: AEMB930330 (solo primeros 10 dígitos)');
  console.log('- ⚠️  Homoclave y dígito verificador NO se pueden generar desde CURP');
  console.log('');
  
  // Generar RFC usando nuestra función
  const rfcGenerado = generarRFCDesdeCURP(curpEjemplo);
  
  console.log('🎯 RESULTADO:');
  console.log(`RFC generado: ${rfcGenerado}`);
  console.log(`Es generado: ${esRFCGenerado(rfcGenerado)}`);
  console.log('');
  
  // Análisis detallado
  if (rfcGenerado) {
    console.log('📊 ANÁLISIS DEL RFC GENERADO:');
    console.log(`- Longitud: ${rfcGenerado.length} caracteres (solo los primeros 10)`);
    console.log(`- Primeros 4 chars: ${rfcGenerado.substring(0, 4)} (letras iniciales)`);
    console.log(`- Siguientes 6 chars: ${rfcGenerado.substring(4, 10)} (fecha nacimiento)`);
    console.log(`- ⚠️  Homoclave y dígito verificador faltan (solo el SAT los asigna)`);
  }
  
  return rfcGenerado;
};

/**
 * Prueba con múltiples ejemplos de CURP
 */
export const probarMultiplesEjemplos = () => {
  const ejemplos = [
    {
      curp: 'AEMB930330MDFBGR07',
      nombre: 'ABREU MAGAÑA BERTHA PAOLA',
      rfcEsperado: 'AEMB930330'
    },
    {
      curp: 'GACJ800825HDFNRL09',
      nombre: 'GARCIA CRUZ JUAN CARLOS',
      rfcEsperado: 'GACJ800825'
    },
    {
      curp: 'MELR750912MCLNDS04',
      nombre: 'MENDEZ LOPEZ ROSA MARIA',
      rfcEsperado: 'MELR750912'
    }
  ];
  
  console.log('🧪 PRUEBAS CON MÚLTIPLES EJEMPLOS');
  console.log('==================================');
  
  ejemplos.forEach((ejemplo, index) => {
    console.log(`\n📋 Ejemplo ${index + 1}:`);
    console.log(`Nombre: ${ejemplo.nombre}`);
    console.log(`CURP: ${ejemplo.curp}`);
    
    const rfcGenerado = generarRFCDesdeCURP(ejemplo.curp);
    
    console.log(`RFC generado: ${rfcGenerado}`);
    console.log(`RFC esperado: ${ejemplo.rfcEsperado}`);
    console.log(`¿Coincide?: ${rfcGenerado === ejemplo.rfcEsperado ? '✅ SÍ' : '❌ NO'}`);
  });
};

/**
 * Simula el objeto empleado del backend para pruebas
 */
export const simularEmpleadoBackend = () => {
  const empleadoSimulado = {
    curp: 'AEMB930330MDFBGR07',
    nombre: 'ABREU MAGAÑA BERTHA PAOLA',
    puesto: 'ASESOR DE HOJALATERIA Y PINTURA',
    sucursal: 'SAU AGUASCALIENTES',
    mes: '2023-07-31',
    cveper: '2023-07-31T00:00:00.000Z',
    sueldo: 3111.60,
    comisiones: 3000.00,
    totalPercepciones: 6806.61,
    status: 'A',
    estado: 'Activo',
    periodicidad: 'Quincenal',
    claveTrabajador: 'AGU0037',
    numeroIMSS: 8199340202.0,
    fechaAntiguedad: '2023-05-16T00:00:00.000Z',
    antiguedadFPL: '2023-05-16T00:00:00.000Z',
    puestoCategorizado: 'Técnico y Taller'
  };
  
  console.log('🧪 PRUEBA CON EMPLEADO SIMULADO DEL BACKEND');
  console.log('============================================');
  console.log('Empleado simulado:', empleadoSimulado);
  
  const rfcObtenido = obtenerRFCDelEmpleado(empleadoSimulado);
  console.log(`\n🎯 RFC obtenido: ${rfcObtenido}`);
  console.log(`🏷️ Es generado: ${esRFCGenerado(rfcObtenido) ? 'SÍ' : 'NO'}`);
  
  return {
    empleado: empleadoSimulado,
    rfc: rfcObtenido,
    esGenerado: esRFCGenerado(rfcObtenido)
  };
};

// Funciones disponibles para usar en consola
window.testRFC = {
  probarGeneracionRFC,
  probarMultiplesEjemplos, 
  simularEmpleadoBackend,
  generarRFCDesdeCURP
};

console.log('🧪 Funciones de prueba RFC disponibles en window.testRFC');
console.log('- testRFC.probarGeneracionRFC()');
console.log('- testRFC.probarMultiplesEjemplos()'); 
console.log('- testRFC.simularEmpleadoBackend()');
console.log('- testRFC.generarRFCDesdeCURP(curp)');

// Script de diagnóstico - Consulta el último período directamente
// Para usar: inspecciona los console.log del componente Demografico en el navegador
// O ejecuta este script en la consola del navegador

console.log('🔍 INSTRUCCIONES PARA ENCONTRAR EL ÚLTIMO PERÍODO:');
console.log('');
console.log('1️⃣ Opción 1 - Revisar logs del navegador:');
console.log('   - Abre el dashboard demográfico');
console.log('   - Abre las herramientas de desarrollador (F12)');
console.log('   - Ve a la pestaña Console');
console.log('   - Busca el mensaje: "📅 Demografico - Último período encontrado:"');
console.log('');
console.log('2️⃣ Opción 2 - Ejecutar en consola del navegador:');
console.log('   Copia y pega este código en la consola del navegador:');
console.log('');
console.log(`
   fetch('/api/payroll/periodos')
     .then(res => res.json())
     .then(result => {
       if (result.success && result.data) {
         const sorted = result.data.sort((a, b) => new Date(b.value) - new Date(a.value));
         console.log('📅 TODOS LOS PERÍODOS:', sorted.map(p => p.value));
         console.log('👑 ÚLTIMO PERÍODO:', sorted[0].value);
       }
     });
`);
console.log('');
console.log('3️⃣ Opción 3 - Verificar la variable periodFilter:');
console.log('   En la consola del navegador, después de que cargue el dashboard:');
console.log('   - Inspecciona el estado del componente');
console.log('   - Busca la variable periodFilter');
console.log('');
console.log('⚠️ IMPORTANTE: Este script debe ejecutarse desde el navegador, no desde Node.js');
console.log('   porque necesita acceso al servidor de la aplicación React.');

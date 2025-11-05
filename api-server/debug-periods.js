require('dotenv').config();
const payrollFilterService = require('./services/payrollFilterService');

async function debugPeriods() {
  console.log('🔍 Analizando períodos del endpoint...');
  
  try {
    const result = await payrollFilterService.getFiltersWithCardinality({});
    const períodos = result.data.periodos || [];
    
    console.log('Total períodos:', períodos.length);
    console.log('Primeros 5:');
    períodos.slice(0, 5).forEach(p => {
      console.log(`  ${p.value} (${p.count} registros)`);
    });
    
    // Verificar si hay fechas de 2024-10
    const octubre2024 = períodos.filter(p => p.value.startsWith('2024-10'));
    console.log('\n2024-10 encontrados:', octubre2024.length);
    octubre2024.slice(0, 3).forEach(p => {
      console.log(`  ${p.value} (${p.count} registros)`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugPeriods();

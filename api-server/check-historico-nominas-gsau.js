const { nominasPool } = require('./config/database');

async function checkHistoricoNominasGsau() {
  try {
    const client = await nominasPool.connect();
    
    console.log('🔍 Verificando estructura de tabla historico_nominas_gsau...\n');
    
    // Verificar columnas disponibles
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'historico_nominas_gsau' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    const columnsResult = await client.query(columnsQuery);
    
    if (columnsResult.rows.length === 0) {
      console.log('❌ Tabla historico_nominas_gsau no encontrada');
      client.release();
      return;
    }
    
    console.log('📋 Columnas de historico_nominas_gsau:');
    columnsResult.rows.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'nullable' : 'not null'}`);
    });
    
    // Buscar columnas relacionadas con costo de nómina
    const costoColumns = columnsResult.rows.filter(col => 
      col.column_name.toLowerCase().includes('costo') || 
      col.column_name.toLowerCase().includes('nomina') ||
      col.column_name.toLowerCase().includes('total') ||
      col.column_name.toLowerCase().includes('percepc') ||
      col.column_name.toLowerCase().includes('deducc') ||
      col.column_name.toLowerCase().includes('neto') ||
      col.column_name.toLowerCase().includes('sueldo') ||
      col.column_name.toLowerCase().includes('salario')
    );
    
    console.log('\n💰 Posibles columnas de costo/salario:');
    costoColumns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    // Mostrar algunos registros de ejemplo para ver los datos reales
    const sampleQuery = `
      SELECT * FROM historico_nominas_gsau 
      WHERE "CURP" IS NOT NULL AND "CURP" != ''
      ORDER BY cveper DESC 
      LIMIT 3
    `;
    
    const sampleResult = await client.query(sampleQuery);
    
    console.log('\n📝 Muestra de 3 registros:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`\n   Registro ${index + 1}:`);
      Object.entries(row).forEach(([key, value]) => {
        // Solo mostrar campos relevantes para evitar output muy largo
        if (key.toLowerCase().includes('costo') || 
            key.toLowerCase().includes('nomina') ||
            key.toLowerCase().includes('total') ||
            key.toLowerCase().includes('percepc') ||
            key.toLowerCase().includes('deducc') ||
            key.toLowerCase().includes('neto') ||
            key.toLowerCase().includes('sueldo') ||
            key.toLowerCase().includes('salario') ||
            key === 'CURP' ||
            key === 'cveper' ||
            key === 'Status') {
          console.log(`     ${key}: ${value}`);
        }
      });
    });
    
    // Contar registros totales
    const countQuery = 'SELECT COUNT(*) as total FROM historico_nominas_gsau';
    const countResult = await client.query(countQuery);
    console.log(`\n📊 Total de registros en historico_nominas_gsau: ${countResult.rows[0].total}`);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  checkHistoricoNominasGsau()
    .then(() => {
      console.log('\n✅ Verificación completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { checkHistoricoNominasGsau };

const { nominasPool } = require('./config/database');

async function checkPayrollStructure() {
  try {
    const client = await nominasPool.connect();
    
    console.log('🔍 Verificando estructura de tabla payroll_data...\n');
    
    // Verificar columnas disponibles
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'payroll_data' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    const columnsResult = await client.query(columnsQuery);
    
    if (columnsResult.rows.length === 0) {
      console.log('❌ Tabla payroll_data no encontrada');
      client.release();
      return;
    }
    
    console.log('📋 Columnas de payroll_data:');
    columnsResult.rows.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'nullable' : 'not null'}`);
    });
    
    // Verificar si existe cveper o alguna columna similar
    const cveperColumns = columnsResult.rows.filter(col => 
      col.column_name.toLowerCase().includes('cveper') || 
      col.column_name.toLowerCase().includes('period') ||
      col.column_name.toLowerCase().includes('fecha') ||
      col.column_name.toLowerCase().includes('mes')
    );
    
    console.log('\n📅 Posibles columnas de período:');
    cveperColumns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    // Mostrar algunos registros de ejemplo para ver los datos reales
    const sampleQuery = `
      SELECT * FROM payroll_data 
      ORDER BY id DESC 
      LIMIT 3
    `;
    
    const sampleResult = await client.query(sampleQuery);
    
    console.log('\n📝 Muestra de 3 registros:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`\n   Registro ${index + 1}:`);
      Object.entries(row).forEach(([key, value]) => {
        console.log(`     ${key}: ${value}`);
      });
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  checkPayrollStructure()
    .then(() => {
      console.log('\n✅ Verificación completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { checkPayrollStructure };

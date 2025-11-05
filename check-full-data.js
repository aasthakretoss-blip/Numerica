const { nominasPool } = require('./config/database');

async function checkFullData() {
  try {
    const client = await nominasPool.connect();
    
    console.log('🔍 Analizando datos completos de historico_nominas_gsau...\n');
    
    // 1. Contar total de registros
    const totalQuery = `SELECT COUNT(*) as total FROM historico_nominas_gsau`;
    const totalResult = await client.query(totalQuery);
    const totalRecords = parseInt(totalResult.rows[0].total);
    
    console.log(`📊 Total de registros: ${totalRecords.toLocaleString('es-MX')}`);
    
    // 2. Contar CURPs únicos (RFCs únicos)
    const uniqueRfcQuery = `
      SELECT COUNT(DISTINCT "RFC") as unique_rfcs 
      FROM historico_nominas_gsau 
      WHERE "RFC" IS NOT NULL
    `;
    const uniqueRfcResult = await client.query(uniqueRfcQuery);
    const uniqueRfcs = parseInt(uniqueRfcResult.rows[0].unique_rfcs);
    
    console.log(`👥 RFCs únicos: ${uniqueRfcs.toLocaleString('es-MX')}`);
    
    // 3. Verificar si hay columna CURP
    const curpCheckQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'historico_nominas_gsau' 
      AND column_name ILIKE '%curp%'
    `;
    const curpResult = await client.query(curpCheckQuery);
    console.log(`📋 Columnas CURP encontradas:`, curpResult.rows);
    
    // 4. Contar por estado
    const statusQuery = `
      SELECT 
        "Status",
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / ${totalRecords}, 2) as percentage
      FROM historico_nominas_gsau 
      GROUP BY "Status"
      ORDER BY count DESC
    `;
    const statusResult = await client.query(statusQuery);
    
    console.log('\n📈 Distribución por Status:');
    statusResult.rows.forEach(row => {
      const statusName = row.Status === 'A' ? 'Activo' : row.Status === 'B' ? 'Baja' : row.Status || 'NULL';
      console.log(`   ${statusName}: ${parseInt(row.count).toLocaleString('es-MX')} (${row.percentage}%)`);
    });
    
    // 5. Verificar últimos periodos
    const periodQuery = `
      SELECT cveper, COUNT(*) as count
      FROM historico_nominas_gsau 
      WHERE cveper IS NOT NULL
      GROUP BY cveper
      ORDER BY cveper DESC
      LIMIT 10
    `;
    const periodResult = await client.query(periodQuery);
    
    console.log('\n📅 Últimos 10 periodos:');
    periodResult.rows.forEach(row => {
      console.log(`   ${row.cveper}: ${parseInt(row.count).toLocaleString('es-MX')} registros`);
    });
    
    // 6. Muestra de datos
    const sampleQuery = `
      SELECT 
        "RFC", 
        "Nombre completo", 
        "Puesto", 
        "Compañía",
        cveper,
        "Status"
      FROM historico_nominas_gsau 
      ORDER BY cveper DESC 
      LIMIT 5
    `;
    const sampleResult = await client.query(sampleQuery);
    
    console.log('\n📝 Muestra de datos (5 registros más recientes):');
    sampleResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row['Nombre completo']} | RFC: ${row.RFC} | Periodo: ${row.cveper} | Status: ${row.Status}`);
    });
    
    client.release();
    
    return {
      totalRecords,
      uniqueRfcs,
      hasData: totalRecords > 0
    };
    
  } catch (error) {
    console.error('❌ Error verificando datos:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  checkFullData()
    .then((result) => {
      console.log('\n✅ Verificación completada:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { checkFullData };

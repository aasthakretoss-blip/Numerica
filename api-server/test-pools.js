const { nominasPool, fondosPool } = require('./config/database');

async function testPools() {
  console.log('=== PROBANDO POOLS ===\n');

  // Probar pool de nóminas
  try {
    console.log('🔍 PROBANDO POOL DE NÓMINAS...');
    const nominasClient = await nominasPool.connect();
    
    const tablesNominas = await nominasClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('Tablas en pool de nóminas:', tablesNominas.rows.map(r => r.table_name));
    
    // Buscar payroll_data específicamente
    const payrollExistsNominas = tablesNominas.rows.some(r => r.table_name === 'payroll_data');
    console.log('¿payroll_data existe en nóminas?', payrollExistsNominas);
    
    if (payrollExistsNominas) {
      const count = await nominasClient.query('SELECT COUNT(*) FROM payroll_data');
      console.log('Registros en payroll_data (nóminas):', count.rows[0].count);
    }
    
    nominasClient.release();
  } catch (error) {
    console.error('Error con pool de nóminas:', error.message);
  }

  console.log('\n---\n');

  // Probar pool de fondos
  try {
    console.log('🔍 PROBANDO POOL DE FONDOS...');
    const fondosClient = await fondosPool.connect();
    
    const tablesFondos = await fondosClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('Tablas en pool de fondos:', tablesFondos.rows.map(r => r.table_name));
    
    // Buscar payroll_data específicamente
    const payrollExistsFondos = tablesFondos.rows.some(r => r.table_name === 'payroll_data');
    console.log('¿payroll_data existe en fondos?', payrollExistsFondos);
    
    if (payrollExistsFondos) {
      const count = await fondosClient.query('SELECT COUNT(*) FROM payroll_data');
      console.log('Registros en payroll_data (fondos):', count.rows[0].count);
    }
    
    fondosClient.release();
  } catch (error) {
    console.error('Error con pool de fondos:', error.message);
  }

  // Cerrar pools
  await nominasPool.end();
  await fondosPool.end();
}

testPools();

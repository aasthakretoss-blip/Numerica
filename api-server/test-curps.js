const { Pool } = require('pg');
require('dotenv').config();

const testCurps = async () => {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NOMINAS || 'Historic',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Obtener algunos CURPs de ejemplo
    console.log('🔍 Buscando CURPs válidos en la base de datos...');
    
    const result = await pool.query(`
      SELECT DISTINCT "CURP"
      FROM historico_nominas_gsau
      WHERE "CURP" IS NOT NULL 
        AND "CURP" != ''
      LIMIT 10
    `);
    
    if (result.rows.length > 0) {
      console.log(`✅ Encontrados ${result.rows.length} CURPs válidos:`);
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}: ${row.CURP}`);
      });
      
      // Probar el primer CURP
      const testCurp = result.rows[0].CURP;
      console.log(`\n🧪 Probando períodos para CURP: ${testCurp}`);
      
      const periodsResult = await pool.query(`
        SELECT DISTINCT cveper
        FROM historico_nominas_gsau
        WHERE "CURP" = $1
        ORDER BY cveper
      `, [testCurp]);
      
      console.log(`📅 Períodos encontrados para ${testCurp}:`, periodsResult.rows.map(r => r.cveper));
      
    } else {
      console.log('❌ No se encontraron CURPs válidos');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
};

testCurps();

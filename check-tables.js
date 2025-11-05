const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  try {
    // Listar todas las tablas
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('=== TABLAS DISPONIBLES ===');
    tables.rows.forEach(row => {
      console.log('-', row.table_name);
    });
    
    // Buscar tablas relacionadas con nóminas
    const nominaTables = tables.rows.filter(row => 
      row.table_name.toLowerCase().includes('nomina') ||
      row.table_name.toLowerCase().includes('historico') ||
      row.table_name.toLowerCase().includes('empleado')
    );
    
    console.log('\n=== TABLAS DE NÓMINA/EMPLEADOS ===');
    
    for (const table of nominaTables) {
      console.log(`\n--- ${table.table_name} ---`);
      
      // Contar registros
      const count = await pool.query(`SELECT COUNT(*) FROM "${table.table_name}"`);
      console.log(`Registros: ${count.rows[0].count}`);
      
      // Mostrar estructura
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [table.table_name]);
      
      console.log('Columnas:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    pool.end();
  }
}

checkTables();

const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.database' });

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function createNumericaUsersTables() {
  try {
    console.log('🔌 Conectando a PostgreSQL...');
    await client.connect();
    
    console.log('📄 Leyendo schema de Numerica_Users...');
    const schema = fs.readFileSync('numerica-users-schema.sql', 'utf8');
    
    console.log('🏗️ Ejecutando schema...');
    await client.query(schema);
    
    console.log('✅ Tablas Numerica_Users creadas exitosamente!');
    
    // Verificar tablas creadas
    console.log('\n📋 Verificando tablas creadas...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%numerica%' OR table_name LIKE '%Numerica%'
      ORDER BY table_name
    `);
    
    console.log('Tablas creadas:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });
    
    // Verificar usuarios insertados
    console.log('\n👥 Verificando usuarios insertados...');
    const usersResult = await client.query('SELECT email, status, setup_status FROM Numerica_Users_Summary');
    
    console.log(`Total usuarios: ${usersResult.rows.length}`);
    usersResult.rows.forEach(user => {
      console.log(`  📧 ${user.email} - ${user.setup_status}`);
    });
    
    console.log('\n🎉 ¡Setup de base de datos completado!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.detail) {
      console.error('Detalle:', error.detail);
    }
  } finally {
    await client.end();
  }
}

createNumericaUsersTables();

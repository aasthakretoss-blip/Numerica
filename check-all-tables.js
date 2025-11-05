const { Client } = require('pg');
require('dotenv').config({ path: '.env.database' });

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function checkAllTables() {
  try {
    console.log('🔌 Conectando a PostgreSQL...');
    console.log(`📊 Host: ${process.env.DB_HOST}`);
    console.log(`📊 Database: ${process.env.DB_NAME}`);
    
    await client.connect();
    
    console.log('\n📋 LISTANDO TODAS LAS TABLAS EN LA BASE DE DATOS...');
    console.log('='.repeat(60));
    
    // Listar TODAS las tablas
    const allTablesResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        tableowner
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log(`\n🗄️ TOTAL DE TABLAS ENCONTRADAS: ${allTablesResult.rows.length}`);
    console.log('\n📑 LISTADO COMPLETO:');
    
    allTablesResult.rows.forEach((table, index) => {
      console.log(`${index + 1}. 📊 ${table.tablename} (owner: ${table.tableowner})`);
    });
    
    // Verificar específicamente las tablas históricas
    console.log('\n🔍 VERIFICANDO TABLAS ESPECÍFICAS...');
    console.log('='.repeat(50));
    
    const specificTables = [
      'historico_nominas_gsau',
      'historico_fondos_gsau', 
      'numerica_users',
      'numerica_sms_codes',
      'numerica_login_sessions'
    ];
    
    for (const tableName of specificTables) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) FROM "${tableName}"`);
        console.log(`✅ ${tableName}: ${countResult.rows[0].count} registros`);
      } catch (error) {
        console.log(`❌ ${tableName}: NO EXISTE (${error.message.split('\n')[0]})`);
      }
    }
    
    // Verificar si hay vistas
    console.log('\n👀 VERIFICANDO VISTAS...');
    const viewsResult = await client.query(`
      SELECT viewname 
      FROM pg_views 
      WHERE schemaname = 'public'
      ORDER BY viewname
    `);
    
    if (viewsResult.rows.length > 0) {
      console.log(`📊 Total de vistas: ${viewsResult.rows.length}`);
      viewsResult.rows.forEach(view => {
        console.log(`  📈 ${view.viewname}`);
      });
    } else {
      console.log('📊 No se encontraron vistas');
    }
    
    console.log('\n🎯 RESUMEN:');
    console.log(`📊 Tablas totales: ${allTablesResult.rows.length}`);
    console.log(`📈 Vistas totales: ${viewsResult.rows.length}`);
    
    console.log('\n✅ Verificación completada!');
    
  } catch (error) {
    console.error('❌ Error al conectar:', error.message);
    if (error.code) {
      console.error('Código de error:', error.code);
    }
  } finally {
    await client.end();
  }
}

checkAllTables();

// Script para verificar la conexión real a AWS PostgreSQL y conteo exacto de registros
const { Pool } = require('pg');
require('dotenv').config();

async function verifyAWSConnection() {
  console.log('\n🔍 VERIFICACIÓN DE CONEXIÓN AWS POSTGRESQL');
  console.log('==========================================');
  
  // Crear pool de conexión con la configuración del .env
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('\n📡 Probando conexión a AWS...');
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log(`User: ${process.env.DB_USER}`);
    
    const client = await pool.connect();
    console.log('✅ Conexión a AWS PostgreSQL exitosa\n');

    // 1. Listar todas las tablas disponibles
    console.log('📋 TABLAS DISPONIBLES EN LA BASE DE DATOS:');
    const tablesResult = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    tablesResult.rows.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });

    // 2. Contar registros en cada tabla
    console.log('\n📊 CONTEO DE REGISTROS POR TABLA:');
    for (const table of tablesResult.rows) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`   ${table.table_name}: ${count.toLocaleString()} registros`);
      } catch (error) {
        console.log(`   ${table.table_name}: Error al contar - ${error.message}`);
      }
    }

    // 3. Verificar específicamente la tabla historico_nominas_gsau
    console.log('\n🎯 ANÁLISIS DETALLADO DE historico_nominas_gsau:');
    try {
      // Contar registros totales
      const totalCount = await client.query('SELECT COUNT(*) as count FROM historico_nominas_gsau');
      console.log(`Total de registros: ${parseInt(totalCount.rows[0].count).toLocaleString()}`);

      // Obtener estructura de la tabla
      const structureResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'historico_nominas_gsau'
        ORDER BY ordinal_position
      `);
      
      console.log('\nEstructura de la tabla:');
      structureResult.rows.forEach((column, index) => {
        console.log(`${index + 1}. ${column.column_name} (${column.data_type})`);
      });

      // Obtener una muestra de datos reales
      const sampleResult = await client.query('SELECT * FROM historico_nominas_gsau LIMIT 5');
      console.log('\n📋 MUESTRA DE DATOS REALES (primeros 5 registros):');
      sampleResult.rows.forEach((row, index) => {
        console.log(`\nRegistro ${index + 1}:`);
        console.log(`  RFC: ${row.RFC}`);
        console.log(`  Nombre: ${row['Nombre completo']}`);
        console.log(`  Puesto: ${row.Puesto}`);
        console.log(`  Compañía: ${row.Compañía}`);
        console.log(`  Status: ${row.Status}`);
      });

      // Verificar distribución por estados
      const statusCount = await client.query(`
        SELECT "Status", COUNT(*) as count 
        FROM historico_nominas_gsau 
        GROUP BY "Status" 
        ORDER BY count DESC
      `);
      
      console.log('\n📈 DISTRIBUCIÓN POR ESTADO:');
      statusCount.rows.forEach(status => {
        const statusName = status.Status === 'A' ? 'Activo' : status.Status === 'B' ? 'Baja' : 'Otros';
        console.log(`   ${statusName}: ${parseInt(status.count).toLocaleString()} registros`);
      });

    } catch (error) {
      console.log(`❌ Error analizando historico_nominas_gsau: ${error.message}`);
    }

    client.release();
    
  } catch (error) {
    console.error('❌ Error conectando a AWS PostgreSQL:', error);
    console.error('Detalles del error:');
    console.error(`  Código: ${error.code}`);
    console.error(`  Mensaje: ${error.message}`);
    
    if (error.code === 'ENOTFOUND') {
      console.error('  🔍 El hostname no se puede resolver. Verifica DB_HOST en .env');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('  🔍 Conexión rechazada. Verifica DB_PORT y firewall/security groups');
    } else if (error.code === '28P01') {
      console.error('  🔍 Credenciales inválidas. Verifica DB_USER y DB_PASSWORD');
    }
  } finally {
    await pool.end();
  }
}

// Ejecutar verificación
verifyAWSConnection();

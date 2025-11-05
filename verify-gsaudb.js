// Script para verificar la tabla Historico_Nominas_GSAU en la base Historic de AWS
const { Pool } = require('pg');
require('dotenv').config();

async function verifyHistoric() {
  console.log('\n🔍 VERIFICACIÓN DE BASE DE DATOS Historic');
  console.log('=====================================');
  
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'Historic', // Base de datos Historic específicamente
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('\n📡 Conectando a AWS...');
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Database: Historic`);
    console.log(`User: ${process.env.DB_USER}`);
    
    const client = await pool.connect();
    console.log('✅ Conexión a Historic exitosa\n');

    // 1. Listar todas las tablas en Historic
    console.log('📋 TABLAS DISPONIBLES EN Historic:');
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

    // 2. Buscar específicamente Historico_Nominas_GSAU (con diferentes variaciones de mayúsculas)
    console.log('\n🎯 BUSCANDO TABLA Historico_Nominas_GSAU:');
    const historicoSearch = await client.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND LOWER(table_name) LIKE '%historico%nominas%gsau%'
      OR LOWER(table_name) LIKE '%nominas%'
      OR LOWER(table_name) LIKE '%payroll%'
    `);
    
    if (historicoSearch.rows.length > 0) {
      console.log('Tablas relacionadas encontradas:');
      historicoSearch.rows.forEach((table, index) => {
        console.log(`${index + 1}. ${table.table_name}`);
      });
      
      // Analizar cada tabla encontrada
      for (const table of historicoSearch.rows) {
        try {
          const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
          const count = parseInt(countResult.rows[0].count);
          console.log(`   ${table.table_name}: ${count.toLocaleString()} registros`);
          
          if (count > 0) {
            // Mostrar estructura y muestra de datos
            const structureResult = await client.query(`
              SELECT column_name, data_type
              FROM information_schema.columns 
              WHERE table_name = '${table.table_name}'
              ORDER BY ordinal_position
              LIMIT 10
            `);
            
            console.log(`\n   Estructura de ${table.table_name}:`);
            structureResult.rows.forEach((col, idx) => {
              console.log(`     ${idx + 1}. ${col.column_name} (${col.data_type})`);
            });
            
            // Muestra de datos
            const sampleResult = await client.query(`SELECT * FROM "${table.table_name}" LIMIT 3`);
            console.log(`\n   Muestra de datos de ${table.table_name}:`);
            sampleResult.rows.forEach((row, idx) => {
              console.log(`\n     Registro ${idx + 1}:`);
              Object.keys(row).slice(0, 5).forEach(key => {
                if (row[key] !== null && row[key] !== '') {
                  console.log(`       ${key}: ${row[key]}`);
                }
              });
            });
          }
        } catch (error) {
          console.log(`   ${table.table_name}: Error - ${error.message}`);
        }
      }
    } else {
      console.log('❌ No se encontraron tablas relacionadas con nóminas');
    }

    // 3. Contar registros en cada tabla disponible
    console.log('\n📊 CONTEO COMPLETO DE REGISTROS:');
    for (const table of tablesResult.rows) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`   ${table.table_name}: ${count.toLocaleString()} registros`);
      } catch (error) {
        console.log(`   ${table.table_name}: Error al contar`);
      }
    }

    client.release();
    
  } catch (error) {
    console.error('❌ Error conectando a Historic:', error);
    console.error(`Código: ${error.code}`);
    console.error(`Mensaje: ${error.message}`);
  } finally {
    await pool.end();
  }
}

verifyHistoric();

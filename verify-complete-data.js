// Script para verificar TODOS los registros reales en la base de datos Historic
const { Pool } = require('pg');
require('dotenv').config();

async function verifyCompleteData() {
  console.log('\n🔍 VERIFICACIÓN COMPLETA DE DATOS EN Historic');
  console.log('==========================================');
  
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NOMINAS, // Historic
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Conectado a AWS PostgreSQL - Historic\n');

    // 1. Información de la base de datos
    const dbInfo = await client.query(`
      SELECT 
        current_database() as database,
        version() as pg_version,
        current_user as user
    `);
    console.log('📡 INFORMACIÓN DE LA BASE DE DATOS:');
    console.log(`   Base: ${dbInfo.rows[0].database}`);
    console.log(`   Usuario: ${dbInfo.rows[0].user}`);
    console.log(`   PostgreSQL: ${dbInfo.rows[0].pg_version.split(',')[0]}\n`);

    // 2. Listar TODAS las tablas con conteos exactos
    console.log('📋 TODAS LAS TABLAS EN Historic:');
    const tablesResult = await client.query(`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    for (const table of tablesResult.rows) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table.tablename}"`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`   ${table.tablename}: ${count.toLocaleString()} registros`);
        
        // Si es una tabla con muchos registros, analizar más
        if (count > 1000) {
          console.log(`     ⚠️  TABLA GRANDE DETECTADA: ${table.tablename}`);
          
          // Obtener estructura
          const structureResult = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = '${table.tablename}'
            ORDER BY ordinal_position
            LIMIT 10
          `);
          
          console.log(`     Primeras 10 columnas:`);
          structureResult.rows.forEach((col, idx) => {
            console.log(`       ${idx + 1}. ${col.column_name} (${col.data_type})`);
          });
          
          // Muestra de datos
          const sampleResult = await client.query(`SELECT * FROM "${table.tablename}" LIMIT 2`);
          console.log(`     Muestra de datos:`);
          sampleResult.rows.forEach((row, idx) => {
            console.log(`       Registro ${idx + 1}:`);
            Object.keys(row).slice(0, 5).forEach(key => {
              if (row[key] !== null && row[key] !== '') {
                console.log(`         ${key}: ${row[key]}`);
              }
            });
          });
        }
      } catch (error) {
        console.log(`   ${table.tablename}: Error al contar - ${error.message}`);
      }
    }

    // 3. Buscar tablas que puedan contener datos históricos
    console.log('\n🎯 BUSCANDO TABLAS CON DATOS HISTÓRICOS:');
    const searchHistorical = await client.query(`
      SELECT tablename, 
             (SELECT COUNT(*) FROM pg_tables WHERE tablename = t.tablename) as exists
      FROM pg_tables t
      WHERE schemaname = 'public'
      AND (
        LOWER(tablename) LIKE '%historico%' 
        OR LOWER(tablename) LIKE '%nomina%'
        OR LOWER(tablename) LIKE '%payroll%'
        OR LOWER(tablename) LIKE '%empleado%'
        OR LOWER(tablename) LIKE '%employee%'
      )
    `);
    
    for (const table of searchHistorical.rows) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table.tablename}"`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`   📊 ${table.tablename}: ${count.toLocaleString()} registros`);
        
        if (count > 0) {
          // Verificar si tiene datos por mes/año
          try {
            const monthlyResult = await client.query(`
              SELECT COUNT(DISTINCT "Mes") as meses_distintos,
                     COUNT(DISTINCT EXTRACT(YEAR FROM "cveper")) as anos_distintos
              FROM "${table.tablename}"
              WHERE "Mes" IS NOT NULL OR "cveper" IS NOT NULL
            `);
            
            if (monthlyResult.rows[0].meses_distintos > 0) {
              console.log(`     📅 Meses distintos: ${monthlyResult.rows[0].meses_distintos}`);
              console.log(`     📅 Años distintos: ${monthlyResult.rows[0].anos_distintos}`);
            }
          } catch (error) {
            // Intentar con otras columnas de fecha
            try {
              const dateResult = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '${table.tablename}'
                AND (data_type = 'date' OR data_type = 'timestamp' OR LOWER(column_name) LIKE '%fecha%' OR LOWER(column_name) LIKE '%mes%')
              `);
              console.log(`     📅 Columnas de fecha encontradas: ${dateResult.rows.map(r => r.column_name).join(', ')}`);
            } catch (e) {}
          }
        }
      } catch (error) {
        console.log(`   ${table.tablename}: Error - ${error.message}`);
      }
    }

    // 4. Verificar específicamente historico_nominas_gsau por períodos
    console.log('\n🎯 ANÁLISIS TEMPORAL DE historico_nominas_gsau:');
    try {
      // Contar por mes
      const monthlyCount = await client.query(`
        SELECT "Mes", COUNT(*) as count
        FROM historico_nominas_gsau 
        WHERE "Mes" IS NOT NULL
        GROUP BY "Mes"
        ORDER BY count DESC
      `);
      
      console.log('📊 REGISTROS POR MES:');
      monthlyCount.rows.forEach(row => {
        console.log(`   ${row.Mes}: ${parseInt(row.count).toLocaleString()} registros`);
      });

      // Contar por año si hay datos de fecha
      const yearlyCount = await client.query(`
        SELECT EXTRACT(YEAR FROM "cveper") as ano, COUNT(*) as count
        FROM historico_nominas_gsau 
        WHERE "cveper" IS NOT NULL
        GROUP BY EXTRACT(YEAR FROM "cveper")
        ORDER BY ano DESC
      `);
      
      if (yearlyCount.rows.length > 0) {
        console.log('\n📊 REGISTROS POR AÑO:');
        yearlyCount.rows.forEach(row => {
          console.log(`   ${row.ano}: ${parseInt(row.count).toLocaleString()} registros`);
        });
      }

      // Verificar rango de fechas
      const dateRange = await client.query(`
        SELECT 
          MIN("cveper") as fecha_minima,
          MAX("cveper") as fecha_maxima,
          COUNT(DISTINCT "cveper") as fechas_distintas
        FROM historico_nominas_gsau 
        WHERE "cveper" IS NOT NULL
      `);
      
      if (dateRange.rows[0].fecha_minima) {
        console.log('\n📅 RANGO DE FECHAS:');
        console.log(`   Desde: ${dateRange.rows[0].fecha_minima}`);
        console.log(`   Hasta: ${dateRange.rows[0].fecha_maxima}`);
        console.log(`   Períodos distintos: ${dateRange.rows[0].fechas_distintas}`);
      }

    } catch (error) {
      console.log('Error analizando datos temporales:', error.message);
    }

    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

verifyCompleteData();

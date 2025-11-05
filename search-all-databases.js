// Script para buscar todas las bases de datos y tablas disponibles
const { Pool } = require('pg');
require('dotenv').config();

async function searchAllDatabases() {
  console.log('\n🔍 BÚSQUEDA COMPLETA DE BASES DE DATOS Y TABLAS');
  console.log('==============================================');
  
  // Pool para conectar al servidor (sin especificar base de datos específica)
  const serverPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres', // Base por defecto para listar otras bases
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await serverPool.connect();
    console.log('✅ Conectado al servidor PostgreSQL en AWS\n');

    // 1. Listar todas las bases de datos disponibles
    console.log('🗄️  BASES DE DATOS DISPONIBLES:');
    const databasesResult = await client.query(`
      SELECT datname, 
             pg_size_pretty(pg_database_size(datname)) as size,
             datconnlimit,
             datcollate
      FROM pg_database 
      WHERE datistemplate = false
      ORDER BY datname
    `);
    
    databasesResult.rows.forEach((db, index) => {
      console.log(`${index + 1}. ${db.datname} (${db.size})`);
    });

    client.release();
    
    // 2. Examinar cada base de datos que no sea del sistema
    for (const database of databasesResult.rows) {
      if (!['postgres', 'template0', 'template1', 'rdsadmin'].includes(database.datname)) {
        console.log(`\n🎯 EXAMINANDO BASE DE DATOS: ${database.datname}`);
        console.log('═'.repeat(50));
        
        const dbPool = new Pool({
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          database: database.datname,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          ssl: {
            rejectUnauthorized: false
          }
        });

        try {
          const dbClient = await dbPool.connect();
          
          // Listar tablas en esta base de datos
          const tablesResult = await dbClient.query(`
            SELECT schemaname, tablename
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename
          `);
          
          console.log(`📋 Tablas en ${database.datname}:`);
          for (const table of tablesResult.rows) {
            try {
              const countResult = await dbClient.query(`SELECT COUNT(*) as count FROM "${table.tablename}"`);
              const count = parseInt(countResult.rows[0].count);
              console.log(`   ${table.tablename}: ${count.toLocaleString()} registros`);
              
              // Si tiene muchos registros, mostrar más detalles
              if (count > 1000) {
                console.log(`     🎯 TABLA GRANDE - Analizando estructura...`);
                
                const structureResult = await dbClient.query(`
                  SELECT column_name, data_type
                  FROM information_schema.columns 
                  WHERE table_name = '${table.tablename}'
                  ORDER BY ordinal_position
                  LIMIT 15
                `);
                
                console.log(`     Columnas principales:`);
                structureResult.rows.forEach((col, idx) => {
                  console.log(`       ${idx + 1}. ${col.column_name} (${col.data_type})`);
                });
                
                // Verificar si tiene datos de múltiples períodos
                try {
                  // Buscar columnas que puedan contener fechas o períodos
                  const dateColumns = await dbClient.query(`
                    SELECT column_name
                    FROM information_schema.columns 
                    WHERE table_name = '${table.tablename}'
                    AND (
                      data_type IN ('date', 'timestamp', 'timestamptz') 
                      OR LOWER(column_name) LIKE '%fecha%'
                      OR LOWER(column_name) LIKE '%mes%'
                      OR LOWER(column_name) LIKE '%periodo%'
                      OR LOWER(column_name) LIKE '%year%'
                      OR LOWER(column_name) LIKE '%cveper%'
                    )
                  `);
                  
                  if (dateColumns.rows.length > 0) {
                    console.log(`     📅 Columnas de fecha/período:`, dateColumns.rows.map(r => r.column_name).join(', '));
                    
                    // Intentar analizar rangos de fechas
                    for (const dateCol of dateColumns.rows.slice(0, 2)) {
                      try {
                        const rangeResult = await dbClient.query(`
                          SELECT 
                            MIN("${dateCol.column_name}") as min_date,
                            MAX("${dateCol.column_name}") as max_date,
                            COUNT(DISTINCT "${dateCol.column_name}") as distinct_dates
                          FROM "${table.tablename}"
                          WHERE "${dateCol.column_name}" IS NOT NULL
                        `);
                        
                        if (rangeResult.rows[0].min_date) {
                          console.log(`     📅 ${dateCol.column_name}: ${rangeResult.rows[0].min_date} a ${rangeResult.rows[0].max_date} (${rangeResult.rows[0].distinct_dates} fechas distintas)`);
                        }
                      } catch (e) {
                        console.log(`     📅 ${dateCol.column_name}: Error analizando rango`);
                      }
                    }
                  }
                } catch (e) {}
              }
              
            } catch (error) {
              console.log(`   ${table.tablename}: Error al contar`);
            }
          }
          
          dbClient.release();
          
        } catch (error) {
          console.log(`   ❌ Error conectando a ${database.datname}: ${error.message}`);
        } finally {
          await dbPool.end();
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await serverPool.end();
  }
}

searchAllDatabases();

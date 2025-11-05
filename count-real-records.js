// Script para contar registros exactos en historico_nominas_gsau de Historic en AWS
const { nominasPool } = require('./config/database');

async function countRealRecords() {
  console.log('\n🔍 CONTEO EXACTO DE REGISTROS EN AWS Historic');
  console.log('==========================================');

  try {
    const client = await nominasPool.connect();
    console.log('✅ Conectado a AWS PostgreSQL - Base Historic\n');

    // 1. Verificar conexión y base de datos actual
    const dbInfo = await client.query('SELECT current_database() as database, current_user as user, inet_server_addr() as server_ip');
    console.log('📡 INFORMACIÓN DE CONEXIÓN:');
    console.log(`   Base de datos: ${dbInfo.rows[0].database}`);
    console.log(`   Usuario: ${dbInfo.rows[0].user}`);
    console.log(`   Servidor: ${dbInfo.rows[0].server_ip}\n`);

    // 2. Listar todas las tablas
    const tablesResult = await client.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('📋 TABLAS EN Historic:');
    for (const table of tablesResult.rows) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`   ${table.table_name}: ${count.toLocaleString()} registros (${table.columns_count} columnas)`);
      } catch (error) {
        console.log(`   ${table.table_name}: Error al contar registros`);
      }
    }

    // 3. Análisis específico de historico_nominas_gsau
    console.log('\n🎯 ANÁLISIS DETALLADO DE historico_nominas_gsau:');
    
    const countQuery = 'SELECT COUNT(*) as total FROM historico_nominas_gsau';
    const totalResult = await client.query(countQuery);
    const totalRecords = parseInt(totalResult.rows[0].total);
    
    console.log(`📊 TOTAL EXACTO: ${totalRecords.toLocaleString()} registros`);

    // 4. Estructura completa de la tabla
    const structureResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'historico_nominas_gsau'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 ESTRUCTURA COMPLETA:');
    structureResult.rows.forEach((column, index) => {
      console.log(`${index + 1}. "${column.column_name}" (${column.data_type}) - ${column.is_nullable === 'YES' ? 'Nullable' : 'Not Null'}`);
    });

    // 5. Muestra representativa de datos
    const sampleResult = await client.query(`
      SELECT "RFC", "Nombre completo", "Puesto", "Compañía", "Status"
      FROM historico_nominas_gsau 
      LIMIT 10
    `);
    
    console.log('\n📋 MUESTRA DE DATOS REALES:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row['Nombre completo']} (${row.RFC}) - ${row.Puesto} - ${row.Compañía} - Status: ${row.Status}`);
    });

    // 6. Distribución por Status
    const statusResult = await client.query(`
      SELECT "Status", COUNT(*) as count
      FROM historico_nominas_gsau 
      GROUP BY "Status"
      ORDER BY count DESC
    `);
    
    console.log('\n📈 DISTRIBUCIÓN POR STATUS:');
    statusResult.rows.forEach(row => {
      const statusName = row.Status === 'A' ? 'Activo' : row.Status === 'B' ? 'Baja' : row.Status;
      console.log(`   ${statusName}: ${parseInt(row.count).toLocaleString()} registros`);
    });

    // 7. Top puestos
    const puestosResult = await client.query(`
      SELECT "Puesto", COUNT(*) as count
      FROM historico_nominas_gsau 
      WHERE "Puesto" IS NOT NULL
      GROUP BY "Puesto"
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('\n🏆 TOP 10 PUESTOS:');
    puestosResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.Puesto}: ${parseInt(row.count).toLocaleString()} empleados`);
    });

    // 8. Top compañías
    const companiasResult = await client.query(`
      SELECT "Compañía", COUNT(*) as count
      FROM historico_nominas_gsau 
      WHERE "Compañía" IS NOT NULL
      GROUP BY "Compañía"
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('\n🏢 TOP 10 COMPAÑÍAS:');
    companiasResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.Compañía}: ${parseInt(row.count).toLocaleString()} empleados`);
    });

    console.log('\n✅ VERIFICACIÓN COMPLETADA');
    console.log(`🎯 TOTAL DE REGISTROS REALES EN AWS: ${totalRecords.toLocaleString()}`);

    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

countRealRecords();

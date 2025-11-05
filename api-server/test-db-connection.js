const { Pool } = require('pg');
require('dotenv').config();

const testConnection = async () => {
  console.log('🔄 Probando conexión a PostgreSQL...');
  console.log('Host:', process.env.DB_HOST);
  console.log('Port:', process.env.DB_PORT);
  console.log('User:', process.env.DB_USER);
  console.log('Database:', process.env.DB_NOMINAS || process.env.DB_NAME);
  
  // Primero, intentar conectar al servidor PostgreSQL sin especificar base de datos
  const postgresPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres', // Base de datos por defecto
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('\n🔍 Conectando a la base de datos postgres por defecto...');
    const client = await postgresPool.connect();
    
    console.log('✅ Conexión exitosa!');
    
    // Listar todas las bases de datos disponibles
    console.log('\n📋 Bases de datos disponibles:');
    const dbListResult = await client.query(`
      SELECT datname as database_name 
      FROM pg_database 
      WHERE datistemplate = false 
      ORDER BY datname
    `);
    
    dbListResult.rows.forEach(row => {
      console.log(`   - ${row.database_name}`);
    });
    
    client.release();
    await postgresPool.end();
    
    // Ahora probar conexión a Historic específicamente
    console.log('\n🔍 Probando conexión específica a Historic...');
    const historicPool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'Historic',
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 10000,
    });
    
    try {
      const historicClient = await historicPool.connect();
      console.log('✅ Conexión a Historic exitosa!');
      
      // Listar tablas en Historic
      console.log('\n📊 Tablas en Historic:');
      const tablesResult = await historicClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      
      // Verificar si existe la tabla historico_nominas_gsau
      const checkTableResult = await historicClient.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'historico_nominas_gsau'
        ) as table_exists
      `);
      
      const tableExists = checkTableResult.rows[0].table_exists;
      console.log(`\n🔍 Tabla 'historico_nominas_gsau' existe: ${tableExists ? '✅ SÍ' : '❌ NO'}`);
      
      if (tableExists) {
        // Obtener estructura de la tabla
        const structureResult = await historicClient.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'historico_nominas_gsau'
          ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Estructura de historico_nominas_gsau:');
        structureResult.rows.forEach(col => {
          console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? '- nullable' : '- not null'}`);
        });
        
        // Contar registros
        const countResult = await historicClient.query('SELECT COUNT(*) as total FROM historico_nominas_gsau');
        console.log(`\n📊 Total de registros: ${parseInt(countResult.rows[0].total).toLocaleString('es-MX')}`);
      }
      
      historicClient.release();
      await historicPool.end();
      
    } catch (historicError) {
      console.error('❌ Error conectando a Historic:', historicError.message);
      await historicPool.end();
    }
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    await postgresPool.end();
  }
};

// Ejecutar el test
testConnection()
  .then(() => {
    console.log('\n✅ Test de conexión completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en test de conexión:', error);
    process.exit(1);
  });

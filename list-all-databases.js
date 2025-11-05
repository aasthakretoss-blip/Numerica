const { Client } = require('pg');
require('dotenv').config({ path: '.env.database' });

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: 'postgres', // Connect to default database to list all
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

async function listAllDatabases() {
  console.log('🔍 Conectando a la instancia RDS para listar todas las bases de datos...');
  console.log(`📊 Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`👤 User: ${dbConfig.user}`);
  console.log('='.repeat(60));

  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Conexión exitosa!');
    console.log('');

    // 1. Listar todas las bases de datos
    console.log('🗄️  BASES DE DATOS DISPONIBLES:');
    console.log('='.repeat(40));
    
    const databasesQuery = `
      SELECT 
        d.datname as name,
        pg_catalog.pg_get_userbyid(d.datdba) as owner,
        pg_encoding_to_char(d.encoding) as encoding,
        d.datcollate as collation,
        d.datctype as ctype,
        pg_size_pretty(pg_database_size(d.datname)) as size,
        CASE 
          WHEN d.datallowconn THEN 'Yes' 
          ELSE 'No' 
        END as allow_connections
      FROM pg_catalog.pg_database d
      WHERE d.datistemplate = false
      ORDER BY d.datname;
    `;
    
    const databasesResult = await client.query(databasesQuery);
    
    if (databasesResult.rows.length === 0) {
      console.log('❌ No se encontraron bases de datos');
      return;
    }

    console.log('ID | Nombre | Propietario | Tamaño | Conexiones | Codificación');
    console.log('-'.repeat(70));
    
    databasesResult.rows.forEach((db, index) => {
      console.log(`${index + 1}. ${db.name} | ${db.owner} | ${db.size} | ${db.allow_connections} | ${db.encoding}`);
    });

    console.log('');
    console.log('📊 ANÁLISIS DETALLADO POR BASE DE DATOS:');
    console.log('='.repeat(50));

    // 2. Para cada base de datos, obtener información detallada
    for (const db of databasesResult.rows) {
      if (!db.allow_connections || db.name === 'postgres') continue;
      
      console.log(`\n🗃️  BASE DE DATOS: ${db.name.toUpperCase()}`);
      console.log('-'.repeat(40));

      try {
        // Crear nueva conexión a esta base de datos específica
        const dbSpecificConfig = { ...dbConfig, database: db.name };
        const dbClient = new Client(dbSpecificConfig);
        
        await dbClient.connect();

        // Contar tablas
        const tablesCountQuery = `
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        `;
        const tablesCount = await dbClient.query(tablesCountQuery);

        // Contar vistas
        const viewsCountQuery = `
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'VIEW';
        `;
        const viewsCount = await dbClient.query(viewsCountQuery);

        // Listar tablas con número de registros
        const tablesWithDataQuery = `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `;
        const tablesWithData = await dbClient.query(tablesWithDataQuery);

        console.log(`📋 Tablas: ${tablesCount.rows[0].count}`);
        console.log(`👁️  Vistas: ${viewsCount.rows[0].count}`);
        console.log(`💾 Tamaño: ${db.size}`);

        if (tablesWithData.rows.length > 0) {
          console.log('\n📊 TABLAS Y REGISTROS:');
          console.log('Tabla | Registros');
          console.log('-'.repeat(30));
          
          for (const table of tablesWithData.rows) {
            try {
              const countQuery = `SELECT COUNT(*) as count FROM ${table.table_name};`;
              const countResult = await dbClient.query(countQuery);
              console.log(`${table.table_name} | ${countResult.rows[0].count}`);
            } catch (countError) {
              console.log(`${table.table_name} | Error: ${countError.message}`);
            }
          }
        }

        await dbClient.end();

      } catch (dbError) {
        console.log(`❌ Error al conectar a ${db.name}: ${dbError.message}`);
      }
    }

    // 3. Información del servidor
    console.log('\n🔧 INFORMACIÓN DEL SERVIDOR PostgreSQL:');
    console.log('='.repeat(50));

    const serverInfoQuery = `
      SELECT 
        version() as version,
        current_database() as current_db,
        current_user as current_user,
        session_user as session_user,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port,
        pg_postmaster_start_time() as server_start_time;
    `;
    
    const serverInfo = await client.query(serverInfoQuery);
    const info = serverInfo.rows[0];

    console.log(`🔢 Versión: ${info.version}`);
    console.log(`🏠 Base de datos actual: ${info.current_db}`);
    console.log(`👤 Usuario actual: ${info.current_user}`);
    console.log(`👥 Usuario de sesión: ${info.session_user}`);
    console.log(`🌐 IP del servidor: ${info.server_ip || 'No disponible'}`);
    console.log(`🔌 Puerto del servidor: ${info.server_port || 'No disponible'}`);
    console.log(`⏰ Inicio del servidor: ${info.server_start_time}`);

    // 4. Configuración avanzada
    console.log('\n⚙️  CONFIGURACIÓN DEL SERVIDOR:');
    console.log('-'.repeat(40));
    
    const configQuery = `
      SELECT name, setting, unit, category, short_desc
      FROM pg_settings 
      WHERE name IN (
        'max_connections', 
        'shared_buffers', 
        'work_mem', 
        'maintenance_work_mem',
        'checkpoint_timeout',
        'wal_buffers',
        'default_statistics_target',
        'random_page_cost',
        'effective_cache_size'
      )
      ORDER BY category, name;
    `;
    
    const configResult = await client.query(configQuery);
    
    configResult.rows.forEach(config => {
      const unit = config.unit || '';
      console.log(`${config.name}: ${config.setting}${unit}`);
      console.log(`  └─ ${config.short_desc}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar el script
if (require.main === module) {
  listAllDatabases();
}

module.exports = { listAllDatabases };

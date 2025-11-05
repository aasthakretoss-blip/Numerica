const { Client } = require('pg');
require('dotenv').config({ path: '.env.database' });

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

async function listDatabaseSchemas() {
  console.log('🔍 Conectando a la base de datos AWS...');
  console.log(`📊 Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`🏢 Database: ${dbConfig.database}`);
  console.log(`👤 User: ${dbConfig.user}`);
  console.log('=' * 60);

  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Conexión exitosa!');
    console.log('');

    // 1. Listar todas las tablas
    console.log('📋 TABLAS DISPONIBLES:');
    console.log('=' * 40);
    
    const tablesQuery = `
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const tablesResult = await client.query(tablesQuery);
    
    if (tablesResult.rows.length === 0) {
      console.log('❌ No se encontraron tablas en el esquema público');
      return;
    }

    tablesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name} (${row.table_type})`);
    });

    console.log('');

    // 2. Para cada tabla, mostrar su estructura completa
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      
      console.log(`📊 ESTRUCTURA DE LA TABLA: ${tableName.toUpperCase()}`);
      console.log('=' * 50);

      // Obtener columnas con detalles completos
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default,
          ordinal_position
        FROM information_schema.columns 
        WHERE table_name = $1 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `;
      
      const columnsResult = await client.query(columnsQuery, [tableName]);

      console.log('Columnas:');
      console.log('----------------------------------------');
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        
        console.log(`  ${col.ordinal_position}. ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
      });

      // Obtener índices y restricciones
      const constraintsQuery = `
        SELECT 
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = $1 
        AND tc.table_schema = 'public'
        ORDER BY tc.constraint_type, kcu.ordinal_position;
      `;
      
      const constraintsResult = await client.query(constraintsQuery, [tableName]);
      
      if (constraintsResult.rows.length > 0) {
        console.log('');
        console.log('Restricciones:');
        console.log('----------------------------------------');
        constraintsResult.rows.forEach(constraint => {
          console.log(`  ${constraint.constraint_type}: ${constraint.constraint_name} (${constraint.column_name})`);
        });
      }

      // Obtener algunos datos de muestra (primeras 3 filas)
      try {
        const sampleQuery = `SELECT * FROM ${tableName} LIMIT 3;`;
        const sampleResult = await client.query(sampleQuery);
        
        if (sampleResult.rows.length > 0) {
          console.log('');
          console.log('Datos de muestra (primeras 3 filas):');
          console.log('----------------------------------------');
          sampleResult.rows.forEach((row, index) => {
            console.log(`Fila ${index + 1}:`, JSON.stringify(row, null, 2));
          });
        }
      } catch (sampleError) {
        console.log('');
        console.log('❌ Error al obtener datos de muestra:', sampleError.message);
      }

      // Contar total de registros
      try {
        const countQuery = `SELECT COUNT(*) as total FROM ${tableName};`;
        const countResult = await client.query(countQuery);
        console.log('');
        console.log(`📊 Total de registros: ${countResult.rows[0].total}`);
      } catch (countError) {
        console.log('');
        console.log('❌ Error al contar registros:', countError.message);
      }

      console.log('');
      console.log('=' * 70);
      console.log('');
    }

    // 3. Información adicional de la base de datos
    console.log('🔧 INFORMACIÓN ADICIONAL DE LA BASE DE DATOS:');
    console.log('=' * 50);

    // Versión de PostgreSQL
    const versionResult = await client.query('SELECT version();');
    console.log('Versión PostgreSQL:', versionResult.rows[0].version);

    // Tamaño de la base de datos
    try {
      const sizeQuery = `SELECT pg_size_pretty(pg_database_size($1)) as database_size;`;
      const sizeResult = await client.query(sizeQuery, [dbConfig.database]);
      console.log('Tamaño de la base de datos:', sizeResult.rows[0].database_size);
    } catch (sizeError) {
      console.log('❌ No se pudo obtener el tamaño de la base de datos');
    }

    // Configuración del servidor
    try {
      const configQuery = `
        SELECT name, setting, unit, category 
        FROM pg_settings 
        WHERE name IN ('max_connections', 'shared_buffers', 'work_mem', 'maintenance_work_mem')
        ORDER BY name;
      `;
      const configResult = await client.query(configQuery);
      
      if (configResult.rows.length > 0) {
        console.log('');
        console.log('Configuración del servidor:');
        console.log('----------------------------------------');
        configResult.rows.forEach(config => {
          const unit = config.unit || '';
          console.log(`  ${config.name}: ${config.setting}${unit} (${config.category})`);
        });
      }
    } catch (configError) {
      console.log('❌ No se pudo obtener la configuración del servidor');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
    console.log('');
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar el script
if (require.main === module) {
  listDatabaseSchemas();
}

module.exports = { listDatabaseSchemas };

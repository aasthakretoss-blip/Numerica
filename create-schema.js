const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.database' });

// Configuración de base de datos
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

async function createSchema() {
  console.log('🏗️ Creando schema de empleados en PostgreSQL...\n');

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');

    // Leer el archivo de schema
    const schemaSQL = fs.readFileSync('backend-lambda/seed/schema.sql', 'utf8');
    console.log('📄 Leyendo schema.sql...');

    // Ejecutar el schema
    await client.query(schemaSQL);
    console.log('✅ Schema creado exitosamente');

    // Verificar que la tabla se creó
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employees'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ Tabla employees creada correctamente');
      
      // Mostrar estructura de la tabla
      const tableInfo = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'employees' 
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📊 Estructura de la tabla employees:');
      tableInfo.rows.forEach(col => {
        console.log(`   • ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
    }

  } catch (error) {
    console.error('❌ Error al crear schema:');
    console.error(`   ${error.message}`);
  } finally {
    await client.end();
    console.log('\n🎉 Proceso completado');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createSchema()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Error:', error.message);
      process.exit(1);
    });
}

module.exports = { createSchema };

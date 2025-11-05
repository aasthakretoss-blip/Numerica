const { Client } = require('pg');
require('dotenv').config({ path: '.env.database' });

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: 'Historic', // Connect to Historic specifically
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

async function analyzeHistoric() {
  console.log('🔍 Conectando a la base de datos Historic...');
  console.log(`📊 Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`🏢 Database: ${dbConfig.database}`);
  console.log(`👤 User: ${dbConfig.user}`);
  console.log('='.repeat(60));

  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Conexión exitosa a Historic!');
    console.log('');

    // 1. Listar todas las tablas
    console.log('📋 TABLAS DISPONIBLES EN Historic:');
    console.log('='.repeat(40));
    
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
      console.log('='.repeat(50));

      // Obtener columnas con detalles completos
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          numeric_precision,
          numeric_scale,
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
        let dataType = col.data_type;
        
        // Add precision/scale info for numeric types
        if (col.numeric_precision) {
          if (col.numeric_scale !== null && col.numeric_scale > 0) {
            dataType += `(${col.numeric_precision},${col.numeric_scale})`;
          } else if (col.data_type === 'numeric') {
            dataType += `(${col.numeric_precision})`;
          }
        } else if (col.character_maximum_length) {
          dataType += `(${col.character_maximum_length})`;
        }
        
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        
        console.log(`  ${col.ordinal_position}. ${col.column_name}: ${dataType} ${nullable}${defaultVal}`);
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

      // Obtener algunos datos de muestra (primeras 5 filas)
      try {
        const sampleQuery = `SELECT * FROM "${tableName}" LIMIT 5;`;
        const sampleResult = await client.query(sampleQuery);
        
        console.log('');
        console.log(`Datos de muestra (máximo 5 filas):`);
        console.log('----------------------------------------');
        
        if (sampleResult.rows.length === 0) {
          console.log('📭 Tabla vacía - sin datos');
        } else {
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
        const countQuery = `SELECT COUNT(*) as total FROM "${tableName}";`;
        const countResult = await client.query(countQuery);
        console.log('');
        console.log(`📊 Total de registros: ${countResult.rows[0].total}`);
      } catch (countError) {
        console.log('');
        console.log('❌ Error al contar registros:', countError.message);
      }

      console.log('');
      console.log('='.repeat(70));
      console.log('');
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
  analyzeHistoric();
}

module.exports = { analyzeHistoric };

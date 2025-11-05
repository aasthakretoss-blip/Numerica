const { Client } = require('pg');
require('dotenv').config({ path: '.env.database' });

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME, // postgres
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

async function inspectPayrollStructure() {
  console.log('🔍 Inspeccionando estructura de payroll_data...');
  console.log('='.repeat(60));

  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Conexión exitosa!');
    console.log('');

    // Obtener información detallada de las columnas
    const columnsQuery = `
      SELECT 
        ordinal_position,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'payroll_data' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    const columnsResult = await client.query(columnsQuery);

    console.log('📋 COLUMNAS DE payroll_data:');
    console.log('='.repeat(50));
    
    columnsResult.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`${col.ordinal_position}. "${col.column_name}" (${col.data_type}) ${nullable}`);
    });

    // Obtener algunos datos de muestra
    console.log('');
    console.log('📊 MUESTRA DE DATOS (primeras 3 filas):');
    console.log('='.repeat(50));
    
    const sampleQuery = `SELECT * FROM payroll_data LIMIT 3;`;
    const sampleResult = await client.query(sampleQuery);
    
    if (sampleResult.rows.length > 0) {
      sampleResult.rows.forEach((row, index) => {
        console.log(`\nFila ${index + 1}:`);
        Object.entries(row).slice(0, 10).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
        console.log('  ...');
      });
    } else {
      console.log('❌ No hay datos de muestra disponibles');
    }

    // Contar registros
    const countQuery = `SELECT COUNT(*) as total FROM payroll_data;`;
    const countResult = await client.query(countQuery);
    console.log('');
    console.log(`📊 Total de registros: ${countResult.rows[0].total}`);

    // Verificar datos únicos para migración
    console.log('');
    console.log('🔍 ANÁLISIS PARA MIGRACIÓN:');
    console.log('='.repeat(40));
    
    const analysisQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT rfc) as unique_rfc,
        COUNT(CASE WHEN rfc IS NOT NULL THEN 1 END) as rfc_not_null,
        COUNT(CASE WHEN "nombreCompleto" IS NOT NULL THEN 1 END) as nombre_not_null
      FROM payroll_data;
    `;
    
    const analysisResult = await client.query(analysisQuery);
    const stats = analysisResult.rows[0];
    
    console.log(`Total de registros: ${stats.total_records}`);
    console.log(`RFCs únicos: ${stats.unique_rfc}`);
    console.log(`Registros con RFC: ${stats.rfc_not_null}`);
    console.log(`Registros con nombre: ${stats.nombre_not_null}`);

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
  inspectPayrollStructure();
}

module.exports = { inspectPayrollStructure };

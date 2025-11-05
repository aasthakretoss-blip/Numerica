const { Client } = require('pg');
require('dotenv').config({ path: '.env.database' });

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: 'Historic',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

async function inspectHNGColumns() {
  console.log('🔍 Inspeccionando columnas de historico_nominas_gsau...');
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
      WHERE table_name = 'historico_nominas_gsau' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    const columnsResult = await client.query(columnsQuery);

    console.log('📋 COLUMNAS DE historico_nominas_gsau:');
    console.log('='.repeat(50));
    
    columnsResult.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`${col.ordinal_position}. "${col.column_name}" (${col.data_type}) ${nullable}`);
    });

    console.log('');
    console.log('🎯 MAPEO SEGÚN TUS ESPECIFICACIONES:');
    console.log('='.repeat(50));
    
    // Buscar las columnas específicas que necesitamos
    const targetColumns = {
      2: 'Nombre completo',
      3: 'Puesto', 
      4: 'Compañía',
      11: 'CURP',
      17: 'Status',
      19: 'cveper',
      24: ' SUELDO CLIENTE ',
      26: ' COMISIONES CLIENTE '
    };

    console.log('Columnas objetivo para el mapeo:');
    Object.entries(targetColumns).forEach(([pos, expectedName]) => {
      const foundCol = columnsResult.rows.find(col => col.ordinal_position == pos);
      if (foundCol) {
        const match = foundCol.column_name === expectedName ? '✅' : '❌';
        console.log(`  ${pos}. ${match} "${foundCol.column_name}" ${foundCol.column_name === expectedName ? '' : `(esperado: "${expectedName}")`}`);
      } else {
        console.log(`  ${pos}. ❌ Columna no encontrada (esperado: "${expectedName}")`);
      }
    });

    console.log('');
    console.log('🔧 CONSULTA CORREGIDA PARA EL MAPEO:');
    console.log('='.repeat(50));

    // Crear consulta usando los nombres exactos de las columnas
    const exactColumnNames = {};
    columnsResult.rows.forEach(col => {
      exactColumnNames[col.ordinal_position] = col.column_name;
    });

    console.log('SELECT ');
    console.log(`  "${exactColumnNames[2]}" as nombre,           -- Columna 1: Nombre`);
    console.log(`  "${exactColumnNames[11]}" as curp,            -- Columna 2: CURP`);
    console.log(`  "${exactColumnNames[4]}" as sucursal,        -- Columna 3: Sucursal`);
    console.log(`  "${exactColumnNames[3]}" as puesto,          -- Columna 4: Puesto`);
    console.log(`  "${exactColumnNames[19]}" as fecha,           -- Columna 5: Fecha`);
    console.log(`  "${exactColumnNames[24]}" as sueldo,         -- Columna 6: Sueldo`);
    console.log(`  COALESCE("${exactColumnNames[26]}", 0) +`);
    console.log(`  COALESCE("${exactColumnNames[24]}" * 0.1, 0) as comisiones, -- Columna 7: Comisiones`);
    console.log(`  "${exactColumnNames[17]}" as status          -- Columna 8: Status`);
    console.log('FROM historico_nominas_gsau');
    console.log('WHERE "${exactColumnNames[2]}" IS NOT NULL;');

    // Probar la consulta corregida
    console.log('');
    console.log('🧪 PROBANDO LA CONSULTA CORREGIDA:');
    console.log('='.repeat(50));

    const testQuery = `
      SELECT 
        "${exactColumnNames[2]}" as nombre,
        "${exactColumnNames[11]}" as curp,
        "${exactColumnNames[4]}" as sucursal,
        "${exactColumnNames[3]}" as puesto,
        "${exactColumnNames[19]}" as fecha,
        "${exactColumnNames[24]}" as sueldo,
        COALESCE("${exactColumnNames[26]}", 0) + COALESCE("${exactColumnNames[24]}" * 0.1, 0) as comisiones,
        "${exactColumnNames[17]}" as status
      FROM historico_nominas_gsau
      WHERE "${exactColumnNames[2]}" IS NOT NULL
      LIMIT 5;
    `;

    const testResult = await client.query(testQuery);
    
    if (testResult.rows.length === 0) {
      console.log('⚠️  No hay datos disponibles para mostrar.');
    } else {
      console.log(`✅ Consulta ejecutada exitosamente. Registros encontrados: ${testResult.rows.length}`);
      testResult.rows.forEach((row, index) => {
        console.log(`\n👤 REGISTRO ${index + 1}:`);
        console.log(`  Nombre: ${row.nombre || 'N/A'}`);
        console.log(`  CURP: ${row.curp || 'N/A'}`);
        console.log(`  Sucursal: ${row.sucursal || 'N/A'}`);
        console.log(`  Puesto: ${row.puesto || 'N/A'}`);
        console.log(`  Fecha: ${row.fecha || 'N/A'}`);
        console.log(`  Sueldo: $${row.sueldo || 0}`);
        console.log(`  Comisiones: $${row.comisiones || 0}`);
        console.log(`  Status: ${row.status || 'N/A'}`);
      });
    }

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
  inspectHNGColumns();
}

module.exports = { inspectHNGColumns };

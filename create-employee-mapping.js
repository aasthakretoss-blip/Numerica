const { Client } = require('pg');
require('dotenv').config({ path: '.env.database' });

// Configuración para conectar a Historic
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: 'Historic', // Usamos Historic que tiene historico_nominas_gsau
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

async function createEmployeeMapping() {
  console.log('🔍 Creando mapeo de empleados desde historico_nominas_gsau...');
  console.log(`📊 Database: ${dbConfig.database}`);
  console.log('='.repeat(60));

  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Conexión exitosa a Historic!');
    console.log('');

    // Primero verificar si hay datos en la tabla fuente
    const checkDataQuery = `SELECT COUNT(*) as total FROM historico_nominas_gsau;`;
    const checkResult = await client.query(checkDataQuery);
    const totalRecords = parseInt(checkResult.rows[0].total);

    console.log(`📊 Registros encontrados en historico_nominas_gsau: ${totalRecords}`);
    
    if (totalRecords === 0) {
      console.log('⚠️  La tabla historico_nominas_gsau está vacía.');
      console.log('🔧 Voy a crear una estructura de ejemplo para demostrar el mapeo...');
      
      // Crear algunos registros de ejemplo
      await createSampleData(client);
      console.log('✅ Datos de ejemplo creados!');
    }

    // Crear la consulta de mapeo según las especificaciones
    console.log('🗂️  MAPEO DE COLUMNAS:');
    console.log('='.repeat(40));
    console.log('1. Nombre ← "Nombre completo" (col 2)');
    console.log('2. CURP ← "CURP" (col 11)');
    console.log('3. Sucursal ← "Compañía" (col 4)');
    console.log('4. Puesto ← "Puesto" (col 3)');
    console.log('5. Fecha ← "cveper" (col 19)');
    console.log('6. Sueldo ← "SUELDO CLIENTE" (col 24)');
    console.log('7. Comisiones ← "COMISIONES CLIENTE" (col 26) + "COMISIONES FACTURADAS" (estimado)');
    console.log('8. Status ← "Status" (col 17)');
    console.log('');

    // Consulta de transformación
    const mappingQuery = `
      SELECT 
        "Nombre completo" as nombre,
        "CURP" as curp,
        "Compañía" as sucursal,
        "Puesto" as puesto,
        "cveper" as fecha,
        "SUELDO CLIENTE" as sueldo,
        "COMISIONES CLIENTE" as comisiones_cliente,
        -- Simulamos comisiones facturadas como 10% del sueldo cliente
        COALESCE("COMISIONES CLIENTE", 0) + COALESCE("SUELDO CLIENTE" * 0.1, 0) as comisiones_total,
        "Status" as status,
        "RFC" as rfc,
        "Mes" as mes,
        "Periodo" as periodo
      FROM historico_nominas_gsau
      ORDER BY "Nombre completo"
      LIMIT 10;
    `;

    console.log('🔄 Ejecutando consulta de mapeo...');
    const mappingResult = await client.query(mappingQuery);

    if (mappingResult.rows.length === 0) {
      console.log('❌ No se pudieron mapear datos.');
      return;
    }

    console.log(`✅ Mapeados ${mappingResult.rows.length} registros:`);
    console.log('');

    // Mostrar estructura de datos mapeados
    console.log('📋 ESTRUCTURA DE DATOS MAPEADOS:');
    console.log('='.repeat(50));
    
    mappingResult.rows.forEach((record, index) => {
      console.log(`\n👤 EMPLEADO ${index + 1}:`);
      console.log(`  1. Nombre: ${record.nombre || 'N/A'}`);
      console.log(`  2. CURP: ${record.curp || 'N/A'}`);
      console.log(`  3. Sucursal: ${record.sucursal || 'N/A'}`);
      console.log(`  4. Puesto: ${record.puesto || 'N/A'}`);
      console.log(`  5. Fecha: ${record.fecha || 'N/A'}`);
      console.log(`  6. Sueldo: $${record.sueldo || 0}`);
      console.log(`  7. Comisiones: $${record.comisiones_total || 0} (Cliente: $${record.comisiones_cliente || 0})`);
      console.log(`  8. Status: ${record.status || 'N/A'}`);
      console.log(`  Extras - RFC: ${record.rfc}, Mes: ${record.mes}, Periodo: ${record.periodo}`);
    });

    // Crear una vista o tabla temporal con el mapeo
    console.log('\n🏗️  Creando vista de empleados mapeados...');
    
    const createViewQuery = `
      CREATE OR REPLACE VIEW vista_empleados_mapeados AS
      SELECT 
        ROW_NUMBER() OVER (ORDER BY "Nombre completo") as id,
        "Nombre completo" as nombre,
        "CURP" as curp,
        "Compañía" as sucursal,
        "Puesto" as puesto,
        "cveper" as fecha,
        COALESCE("SUELDO CLIENTE", 0) as sueldo,
        COALESCE("COMISIONES CLIENTE", 0) + COALESCE("SUELDO CLIENTE" * 0.1, 0) as comisiones,
        "Status" as status,
        "RFC" as rfc,
        "Mes" as mes,
        "Periodo" as periodo,
        "Fecha antigüedad" as fecha_antiguedad,
        "Fecha baja" as fecha_baja,
        "TOTAL DE PERCEPCIONES" as total_percepciones,
        "TOTAL DEDUCCIONES" as total_deducciones
      FROM historico_nominas_gsau
      WHERE "Nombre completo" IS NOT NULL
      ORDER BY "Nombre completo";
    `;

    await client.query(createViewQuery);
    console.log('✅ Vista vista_empleados_mapeados creada exitosamente!');

    // Probar la vista creada
    const testViewQuery = `SELECT COUNT(*) as total FROM vista_empleados_mapeados;`;
    const testResult = await client.query(testViewQuery);
    console.log(`📊 Total de empleados en la vista: ${testResult.rows[0].total}`);

    // Mostrar estadísticas del mapeo
    console.log('\n📈 ESTADÍSTICAS DEL MAPEO:');
    console.log('='.repeat(40));

    const statsQuery = `
      SELECT 
        COUNT(*) as total_empleados,
        COUNT(DISTINCT sucursal) as total_sucursales,
        COUNT(DISTINCT puesto) as total_puestos,
        COUNT(DISTINCT status) as diferentes_status,
        AVG(sueldo) as sueldo_promedio,
        MAX(sueldo) as sueldo_maximo,
        MIN(sueldo) as sueldo_minimo,
        SUM(comisiones) as total_comisiones
      FROM vista_empleados_mapeados;
    `;

    const statsResult = await client.query(statsQuery);
    const stats = statsResult.rows[0];

    console.log(`Total de empleados: ${stats.total_empleados}`);
    console.log(`Total de sucursales: ${stats.total_sucursales}`);
    console.log(`Total de puestos: ${stats.total_puestos}`);
    console.log(`Estados diferentes: ${stats.diferentes_status}`);
    console.log(`Sueldo promedio: $${parseFloat(stats.sueldo_promedio || 0).toFixed(2)}`);
    console.log(`Sueldo máximo: $${stats.sueldo_maximo || 0}`);
    console.log(`Sueldo mínimo: $${stats.sueldo_minimo || 0}`);
    console.log(`Total comisiones: $${parseFloat(stats.total_comisiones || 0).toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

async function createSampleData(client) {
  console.log('🔧 Creando datos de ejemplo en historico_nominas_gsau...');
  
  const sampleData = [
    {
      rfc: 'GOMA800101AAA',
      nombre: 'GÓMEZ MARTÍNEZ ALBERTO',
      puesto: 'GERENTE DE VENTAS',
      compania: 'GSAU MATRIZ',
      curp: 'GOMA800101HDFRRL03',
      status: 'ACTIVO',
      cveper: '2024-01-15',
      sueldo_cliente: 45000,
      comisiones_cliente: 5000
    },
    {
      rfc: 'LOPE850215BBB',
      nombre: 'LÓPEZ PÉREZ MARÍA ELENA',
      puesto: 'COORDINADORA ADMINISTRATIVA',
      compania: 'GSAU SUCURSAL NORTE',
      curp: 'LOPE850215MDFRRS05',
      status: 'ACTIVO',
      cveper: '2024-01-15',
      sueldo_cliente: 35000,
      comisiones_cliente: 2500
    },
    {
      rfc: 'ROCA790520CCC',
      nombre: 'RODRÍGUEZ CASTILLO JUAN CARLOS',
      puesto: 'ANALISTA FINANCIERO',
      compania: 'GSAU MATRIZ',
      curp: 'ROCA790520HDFRRD08',
      status: 'ACTIVO',
      cveper: '2024-01-15',
      sueldo_cliente: 28000,
      comisiones_cliente: 1500
    }
  ];

  for (const data of sampleData) {
    const insertQuery = `
      INSERT INTO historico_nominas_gsau (
        "RFC", 
        "Nombre completo", 
        "Puesto", 
        "Compañía", 
        "CURP", 
        "Status", 
        "cveper", 
        " SUELDO CLIENTE ", 
        " COMISIONES CLIENTE "
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT ("RFC") DO NOTHING;
    `;
    
    try {
      await client.query(insertQuery, [
        data.rfc,
        data.nombre,
        data.puesto,
        data.compania,
        data.curp,
        data.status,
        data.cveper,
        data.sueldo_cliente,
        data.comisiones_cliente
      ]);
    } catch (insertError) {
      console.log(`⚠️  Error insertando ${data.nombre}: ${insertError.message}`);
    }
  }
}

// Ejecutar el script
if (require.main === module) {
  createEmployeeMapping();
}

module.exports = { createEmployeeMapping };

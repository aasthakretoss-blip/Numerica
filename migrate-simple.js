const { Client } = require('pg');
require('dotenv').config({ path: '.env.database' });

// Configuración para base de datos principal (postgres) - origen
const sourceDbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// Configuración para Historic - destino
const targetDbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: 'Historic',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

async function migrateSimple() {
  console.log('🔄 Migración simplificada de datos reales...');
  console.log('='.repeat(50));

  const sourceClient = new Client(sourceDbConfig);
  const targetClient = new Client(targetDbConfig);

  try {
    await sourceClient.connect();
    await targetClient.connect();
    console.log('✅ Conexiones establecidas');

    // Limpiar datos anteriores
    await targetClient.query('DELETE FROM historico_nominas_gsau;');
    console.log('✅ Tabla limpiada');

    // Obtener empleados únicos con datos completos
    const query = `
      SELECT DISTINCT ON (rfc)
        rfc,
        "nombreCompleto",
        puesto,
        empresa,
        curp,
        status,
        mes,
        "sueldoCliente",
        "comisionesCliente",
        "totalPercepciones",
        periodicidad
      FROM payroll_data 
      WHERE "nombreCompleto" IS NOT NULL 
      AND rfc IS NOT NULL 
      AND LENGTH(rfc) > 5
      ORDER BY rfc, "createdAt" DESC
      LIMIT 500;
    `;

    const result = await sourceClient.query(query);
    console.log(`📋 Empleados únicos encontrados: ${result.rows.length}`);

    let insertedCount = 0;

    for (const row of result.rows) {
      try {
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
            " COMISIONES CLIENTE ",
            " TOTAL DE PERCEPCIONES ",
            "Periodicidad",
            "Mes"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT ("RFC") DO NOTHING;
        `;
        
        await targetClient.query(insertQuery, [
          row.rfc,
          row.nombreCompleto,
          row.puesto || 'NO ESPECIFICADO',
          row.empresa || 'EMPRESA GENERAL',
          row.curp,
          row.status || 'ACTIVO',
          new Date(2024, 0, 1), // Fecha fija para evitar errores
          row.sueldoCliente || 0,
          row.comisionesCliente || 0,
          row.totalPercepciones || 0,
          row.periodicidad || 'MENSUAL',
          row.mes || 'ENERO_2024'
        ]);
        
        insertedCount++;
        
        if (insertedCount % 50 === 0) {
          console.log(`✅ Migrados ${insertedCount} empleados...`);
        }
        
      } catch (insertError) {
        console.log(`❌ Error con ${row.rfc}: ${insertError.message}`);
      }
    }

    // Verificar resultados
    const verifyQuery = `SELECT COUNT(*) as total FROM historico_nominas_gsau;`;
    const verifyResult = await targetClient.query(verifyQuery);
    
    console.log('\n📊 RESUMEN:');
    console.log(`✅ Empleados migrados: ${insertedCount}`);
    console.log(`📋 Total en base destino: ${verifyResult.rows[0].total}`);

    // Mostrar muestra
    const sampleQuery = `
      SELECT "RFC", "Nombre completo", "Compañía", "Puesto", " SUELDO CLIENTE "
      FROM historico_nominas_gsau 
      ORDER BY "Nombre completo" 
      LIMIT 5;
    `;
    
    const sample = await targetClient.query(sampleQuery);
    
    console.log('\n👥 MUESTRA DE EMPLEADOS MIGRADOS:');
    sample.rows.forEach((emp, i) => {
      console.log(`${i + 1}. ${emp['Nombre completo']} (${emp.RFC})`);
      console.log(`   ${emp.Puesto} - ${emp.Compañía} - $${emp[' SUELDO CLIENTE ']}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sourceClient.end();
    await targetClient.end();
    console.log('\n🔌 Conexiones cerradas');
  }
}

if (require.main === module) {
  migrateSimple();
}

module.exports = { migrateSimple };

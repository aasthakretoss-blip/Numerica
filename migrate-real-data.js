const { Client } = require('pg');
require('dotenv').config({ path: '.env.database' });

// Configuración para base de datos principal (postgres) - origen
const sourceDbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME, // postgres
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

async function migrateRealData() {
  console.log('🔄 Migrando datos reales desde payroll_data a historico_nominas_gsau...');
  console.log('='.repeat(70));

  const sourceClient = new Client(sourceDbConfig);
  const targetClient = new Client(targetDbConfig);

  try {
    // Conectar a ambas bases de datos
    await sourceClient.connect();
    await targetClient.connect();
    console.log('✅ Conexiones establecidas');

    // 1. Verificar datos disponibles en payroll_data
    console.log('\n📊 VERIFICANDO DATOS FUENTE:');
    console.log('-'.repeat(40));
    
    const countQuery = `SELECT COUNT(*) as total FROM payroll_data LIMIT 1;`;
    const countResult = await sourceClient.query(countQuery);
    const totalRecords = parseInt(countResult.rows[0].total);
    
    console.log(`📋 Total de registros en payroll_data: ${totalRecords}`);

    if (totalRecords === 0) {
      console.log('⚠️  No hay datos en payroll_data para migrar.');
      return;
    }

    // 2. Obtener una muestra de datos para verificar estructura
    console.log('\n🔍 ANALIZANDO ESTRUCTURA DE DATOS:');
    console.log('-'.repeat(40));
    
    const sampleQuery = `
      SELECT 
        rfc, "nombreCompleto", puesto, empresa, curp, status, mes, 
        "sueldoCliente", "comisionesCliente", "totalPercepciones", 
        "createdAt"
      FROM payroll_data 
      WHERE "nombreCompleto" IS NOT NULL 
      AND rfc IS NOT NULL
      ORDER BY "createdAt" DESC
      LIMIT 5;
    `;
    
    const sampleResult = await sourceClient.query(sampleQuery);
    console.log(`📂 Muestra de datos (${sampleResult.rows.length} registros):`);
    
    sampleResult.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. ${row.nombreCompleto}`);
      console.log(`   RFC: ${row.rfc}, CURP: ${row.curp || 'N/A'}`);
      console.log(`   Empresa: ${row.empresa || 'N/A'}, Puesto: ${row.puesto || 'N/A'}`);
      console.log(`   Sueldo: $${row.sueldoCliente || 0}, Comisiones: $${row.comisionesCliente || 0}`);
    });

    // 3. Limpiar tabla destino
    console.log('\n🧹 LIMPIANDO TABLA DESTINO:');
    console.log('-'.repeat(40));
    
    const deleteQuery = `DELETE FROM historico_nominas_gsau;`;
    await targetClient.query(deleteQuery);
    console.log('✅ Tabla historico_nominas_gsau limpiada');

    // 4. Migrar datos con mapeo correcto
    console.log('\n📦 MIGRANDO DATOS:');
    console.log('-'.repeat(40));
    
    const migrateQuery = `
      SELECT 
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
        "totalDeducciones",
        "netoAntesVales",
        periodicidad,
        "fechaAntiguedad",
        "fechaBaja",
        "createdAt"
      FROM payroll_data 
      WHERE "nombreCompleto" IS NOT NULL 
      AND rfc IS NOT NULL
      ORDER BY "nombreCompleto"
      LIMIT 1000; -- Procesar en lotes
    `;
    
    const migrationResult = await sourceClient.query(migrateQuery);
    console.log(`📋 Registros obtenidos para migrar: ${migrationResult.rows.length}`);

    // 5. Insertar datos en historico_nominas_gsau
    let insertedCount = 0;
    let errorCount = 0;

    for (const row of migrationResult.rows) {
      try {
        // Generar fecha de periodo basada en mes y año
        const fechaPeriodo = generatePeriodDate(row.mes);
        
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
            " TOTAL DEDUCCIONES ",
            " NETO ANTES DE VALES ",
            "Periodicidad",
            "Fecha antigüedad",
            "Fecha baja",
            "Mes"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT ("RFC") DO UPDATE SET
            "Nombre completo" = EXCLUDED."Nombre completo",
            "Puesto" = EXCLUDED."Puesto",
            "Compañía" = EXCLUDED."Compañía",
            " SUELDO CLIENTE " = EXCLUDED." SUELDO CLIENTE ",
            " COMISIONES CLIENTE " = EXCLUDED." COMISIONES CLIENTE ";
        `;
        
        await targetClient.query(insertQuery, [
          row.rfc,
          row.nombreCompleto,
          row.puesto || 'NO ESPECIFICADO',
          row.empresa || 'EMPRESA GENERAL',
          row.curp,
          row.status || 'ACTIVO',
          fechaPeriodo,
          row.sueldoCliente || 0,
          row.comisionesCliente || 0,
          row.totalPercepciones || 0,
          row.totalDeducciones || 0,
          row.netoAntesVales || 0,
          row.periodicidad || 'MENSUAL',
          row.fechaAntiguedad ? new Date(row.fechaAntiguedad) : null,
          row.fechaBaja ? new Date(row.fechaBaja) : null,
          row.mes || 'SIN_ESPECIFICAR'
        ]);
        
        insertedCount++;
        
        if (insertedCount % 100 === 0) {
          console.log(`✅ Migrados ${insertedCount} registros...`);
        }
        
      } catch (insertError) {
        errorCount++;
        console.log(`❌ Error migrando ${row.rfc}: ${insertError.message}`);
      }
    }

    // 6. Verificar migración
    console.log('\n📊 RESUMEN DE MIGRACIÓN:');
    console.log('-'.repeat(40));
    console.log(`✅ Registros migrados exitosamente: ${insertedCount}`);
    console.log(`❌ Errores durante migración: ${errorCount}`);

    // Verificar datos en tabla destino
    const verifyQuery = `SELECT COUNT(*) as total FROM historico_nominas_gsau;`;
    const verifyResult = await targetClient.query(verifyQuery);
    console.log(`📋 Total en historico_nominas_gsau: ${verifyResult.rows[0].total}`);

    // 7. Mostrar muestra de datos migrados
    console.log('\n👥 MUESTRA DE DATOS MIGRADOS:');
    console.log('-'.repeat(40));
    
    const finalSampleQuery = `
      SELECT 
        "RFC", 
        "Nombre completo", 
        "Compañía", 
        "Puesto", 
        " SUELDO CLIENTE "
      FROM historico_nominas_gsau 
      ORDER BY "Nombre completo" 
      LIMIT 5;
    `;
    
    const finalSample = await targetClient.query(finalSampleQuery);
    finalSample.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row['Nombre completo']} (${row.RFC})`);
      console.log(`   ${row.Puesto} - ${row.Compañía}`);
      console.log(`   Sueldo: $${row[' SUELDO CLIENTE ']}`);
    });

  } catch (error) {
    console.error('❌ Error durante migración:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sourceClient.end();
    await targetClient.end();
    console.log('\n🔌 Conexiones cerradas');
  }
}

// Helper function para generar fecha de periodo
function generatePeriodDate(mesString) {
  if (!mesString) return new Date();
  
  // Extraer información del mes (ej: "24_ABRIL", "SEM 17 24.04.2024")
  const currentYear = new Date().getFullYear();
  
  if (mesString.includes('ABRIL')) return new Date(2024, 3, 1); // Abril 2024
  if (mesString.includes('OCTUBRE')) return new Date(2024, 9, 1); // Octubre 2024  
  if (mesString.includes('AGOSTO')) return new Date(2024, 7, 1); // Agosto 2024
  if (mesString.includes('2024')) return new Date(2024, 0, 1); // Enero 2024
  
  // Default: primer día del año actual
  return new Date(currentYear, 0, 1);
}

// Ejecutar migración
if (require.main === module) {
  migrateRealData();
}

module.exports = { migrateRealData };

// Script para hacer conteo completo sin filtros y verificar si hay datos ocultos
const { Pool } = require('pg');
require('dotenv').config();

async function debugFullCount() {
  console.log('\n🔍 DEBUG: CONTEO COMPLETO SIN FILTROS');
  console.log('====================================');
  
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NOMINAS,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Conectado a AWS Historic\n');

    // 1. Conteo absoluto sin filtros
    console.log('📊 CONTEO ABSOLUTO:');
    const totalResult = await client.query('SELECT COUNT(*) as total FROM historico_nominas_gsau');
    console.log(`   Total absoluto: ${parseInt(totalResult.rows[0].total).toLocaleString()} registros`);

    // 2. Verificar si hay registros con NULL que puedan estar ocultos
    console.log('\n🔍 ANÁLISIS DE CAMPOS CLAVE:');
    
    const fieldAnalysis = [
      'RFC',
      'Nombre completo', 
      'Puesto',
      'Compañía',
      'Status',
      'Mes',
      'cveper'
    ];
    
    for (const field of fieldAnalysis) {
      try {
        const nullCount = await client.query(`
          SELECT 
            COUNT(*) as total,
            COUNT("${field}") as not_null,
            COUNT(*) - COUNT("${field}") as null_values
          FROM historico_nominas_gsau
        `);
        
        const result = nullCount.rows[0];
        console.log(`   ${field}:`);
        console.log(`     Total: ${parseInt(result.total).toLocaleString()}`);
        console.log(`     Con valor: ${parseInt(result.not_null).toLocaleString()}`);
        console.log(`     NULL: ${parseInt(result.null_values).toLocaleString()}`);
      } catch (error) {
        console.log(`   ${field}: Error analizando`);
      }
    }

    // 3. Verificar distribución temporal detallada
    console.log('\n📅 DISTRIBUCIÓN TEMPORAL DETALLADA:');
    
    try {
      // Por mes y año
      const temporalResult = await client.query(`
        SELECT 
          "Mes",
          EXTRACT(YEAR FROM "cveper") as ano,
          COUNT(*) as count
        FROM historico_nominas_gsau 
        WHERE "Mes" IS NOT NULL AND "cveper" IS NOT NULL
        GROUP BY "Mes", EXTRACT(YEAR FROM "cveper")
        ORDER BY ano DESC, "Mes"
      `);
      
      console.log('Por mes y año:');
      temporalResult.rows.forEach(row => {
        console.log(`   ${row.ano}-${row.Mes}: ${parseInt(row.count).toLocaleString()} registros`);
      });

    } catch (error) {
      console.log('Error en análisis temporal:', error.message);
    }

    // 4. Buscar patrones en los datos que puedan indicar filtros
    console.log('\n🎯 ANÁLISIS DE PATRONES:');
    
    try {
      // Verificar si todos los registros son de un período específico
      const periodoAnalysis = await client.query(`
        SELECT 
          MIN("cveper") as min_periodo,
          MAX("cveper") as max_periodo,
          COUNT(DISTINCT "cveper") as periodos_distintos,
          COUNT(DISTINCT "RFC") as empleados_unicos,
          COUNT(*) as total_registros
        FROM historico_nominas_gsau
      `);
      
      const analysis = periodoAnalysis.rows[0];
      console.log(`   Período mínimo: ${analysis.min_periodo}`);
      console.log(`   Período máximo: ${analysis.max_periodo}`);
      console.log(`   Períodos distintos: ${analysis.periodos_distintos}`);
      console.log(`   Empleados únicos: ${parseInt(analysis.empleados_unicos).toLocaleString()}`);
      console.log(`   Total registros: ${parseInt(analysis.total_registros).toLocaleString()}`);
      
      // Calcular promedio de registros por período
      if (analysis.periodos_distintos > 0) {
        const avgPerPeriod = parseInt(analysis.total_registros) / parseInt(analysis.periodos_distintos);
        console.log(`   Promedio por período: ${avgPerPeriod.toFixed(0)} registros`);
      }

    } catch (error) {
      console.log('Error en análisis de patrones:', error.message);
    }

    // 5. Verificar si hay alguna vista o tabla particionada
    console.log('\n🔍 BUSCANDO VISTAS Y TABLAS RELACIONADAS:');
    
    try {
      const viewsResult = await client.query(`
        SELECT table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'VIEW'
      `);
      
      if (viewsResult.rows.length > 0) {
        console.log('Vistas encontradas:');
        viewsResult.rows.forEach(view => {
          console.log(`   ${view.table_name} (${view.table_type})`);
        });
      } else {
        console.log('   No se encontraron vistas');
      }

    } catch (error) {
      console.log('Error buscando vistas:', error.message);
    }

    console.log('\n🎯 CONCLUSIÓN:');
    console.log(`La tabla historico_nominas_gsau en Historic contiene exactamente ${parseInt(totalResult.rows[0].total).toLocaleString()} registros.`);
    console.log('Si esperabas más registros, podrían estar en:');
    console.log('  - Otra base de datos');
    console.log('  - Otra tabla con nombre diferente');
    console.log('  - Particiones de tabla');
    console.log('  - Datos no migrados aún');

    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugFullCount();

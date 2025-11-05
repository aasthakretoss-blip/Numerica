const { nominasPool } = require('./config/database');

async function verifyCurpColumn() {
  console.log('🔍 VERIFICANDO ESTRUCTURA DE LA TABLA historico_nominas_gsau...\n');
  
  try {
    const client = await nominasPool.connect();
    
    // 1. Verificar si existe la tabla
    console.log('1️⃣ VERIFICANDO SI EXISTE LA TABLA...');
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'historico_nominas_gsau'
      );
    `);
    console.log('Tabla existe:', tableExists.rows[0].exists);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ LA TABLA NO EXISTE!');
      client.release();
      return;
    }
    
    // 2. Obtener todas las columnas de la tabla
    console.log('\n2️⃣ OBTENIENDO TODAS LAS COLUMNAS...');
    const columns = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'historico_nominas_gsau'
      ORDER BY ordinal_position;
    `);
    
    console.log(`Total de columnas: ${columns.rows.length}\n`);
    
    // 3. Buscar específicamente columnas relacionadas con CURP
    console.log('3️⃣ BUSCANDO COLUMNAS RELACIONADAS CON CURP...');
    const curpColumns = columns.rows.filter(col => 
      col.column_name.toLowerCase().includes('curp')
    );
    
    if (curpColumns.length === 0) {
      console.log('❌ NO SE ENCONTRARON COLUMNAS CON "CURP" EN EL NOMBRE');
      console.log('\n📋 TODAS LAS COLUMNAS DISPONIBLES:');
      columns.rows.forEach((col, index) => {
        console.log(`${index + 1}. "${col.column_name}" (${col.data_type})`);
      });
    } else {
      console.log('✅ COLUMNAS RELACIONADAS CON CURP ENCONTRADAS:');
      curpColumns.forEach(col => {
        console.log(`- "${col.column_name}" (${col.data_type}, nullable: ${col.is_nullable})`);
      });
    }
    
    // 4. Obtener muestra de datos para verificar contenido
    console.log('\n4️⃣ OBTENIENDO MUESTRA DE DATOS...');
    const sampleData = await client.query(`
      SELECT * FROM historico_nominas_gsau 
      LIMIT 3;
    `);
    
    if (sampleData.rows.length > 0) {
      console.log('✅ MUESTRA DE DATOS (primeros 3 registros):');
      sampleData.rows.forEach((row, index) => {
        console.log(`\n--- REGISTRO ${index + 1} ---`);
        Object.keys(row).forEach(key => {
          if (key.toLowerCase().includes('curp') || key.toLowerCase().includes('nombre')) {
            console.log(`${key}: "${row[key]}"`);
          }
        });
      });
      
      // 5. Verificar columnas que contienen datos similares a CURP
      console.log('\n5️⃣ VERIFICANDO POSIBLES COLUMNAS CON DATOS DE CURP...');
      const firstRow = sampleData.rows[0];
      Object.keys(firstRow).forEach(key => {
        const value = firstRow[key];
        if (typeof value === 'string' && value.length >= 18 && /^[A-Z]{4}\d{6}[A-Z]{6}[\dA-Z]\d$/.test(value)) {
          console.log(`🎯 POSIBLE COLUMNA CURP: "${key}" = "${value}"`);
        }
      });
    } else {
      console.log('❌ NO HAY DATOS EN LA TABLA');
    }
    
    // 6. Buscar CURP específico para probar filtros
    if (curpColumns.length > 0) {
      console.log('\n6️⃣ PROBANDO FILTRO POR CURP...');
      const testCurp = 'FOMO031106HJCLXMA4'; // El CURP de las pruebas anteriores
      
      for (const col of curpColumns) {
        const testQuery = `
          SELECT COUNT(*) as total, 
                 "${col.column_name}" as curp_value
          FROM historico_nominas_gsau 
          WHERE "${col.column_name}" = $1
          GROUP BY "${col.column_name}"
          LIMIT 5;
        `;
        
        try {
          const testResult = await client.query(testQuery, [testCurp]);
          console.log(`Filtro en "${col.column_name}":`, testResult.rows);
        } catch (error) {
          console.log(`❌ Error filtrando por "${col.column_name}":`, error.message);
        }
      }
    }
    
    client.release();
    console.log('\n✅ VERIFICACIÓN COMPLETADA');
    
  } catch (error) {
    console.error('❌ ERROR EN LA VERIFICACIÓN:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar la verificación
verifyCurpColumn();

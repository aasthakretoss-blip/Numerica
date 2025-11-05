const { Client } = require('pg');
require('dotenv').config({ path: '.env.database' });

// Configuración de base de datos
const dbConfig = {
  // Opción 1: Aurora/RDS en AWS
  host: process.env.DB_HOST || 'your-aurora-endpoint.cluster-xxxxx.us-east-1.rds.amazonaws.com',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'payroll',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your-password',
  
  // Opción 2: Para conexiones SSL (AWS requiere)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // Timeout de conexión
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
};

async function testConnection() {
  console.log('🔌 Probando conexión a PostgreSQL...\n');
  console.log('📋 Configuración:');
  console.log(`   Host: ${dbConfig.host}`);
  console.log(`   Port: ${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log(`   SSL: ${dbConfig.ssl ? 'Habilitado' : 'Deshabilitado'}`);
  console.log('');

  const client = new Client(dbConfig);

  try {
    console.log('⏳ Conectando...');
    await client.connect();
    console.log('✅ ¡Conexión exitosa!');
    
    // Probar consulta simple
    console.log('\n📊 Probando consulta básica...');
    const result = await client.query('SELECT version(), current_database(), current_user;');
    console.log('✅ Consulta exitosa:');
    console.log(`   PostgreSQL Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    console.log(`   Database: ${result.rows[0].current_database}`);
    console.log(`   User: ${result.rows[0].current_user}`);
    
    // Verificar si existe tabla employees
    console.log('\n🔍 Verificando tabla employees...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employees'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Tabla employees encontrada');
      
      // Contar registros
      const countResult = await client.query('SELECT COUNT(*) FROM employees;');
      console.log(`📊 Registros en employees: ${countResult.rows[0].count}`);
      
      // Mostrar algunos registros
      if (parseInt(countResult.rows[0].count) > 0) {
        const sampleData = await client.query('SELECT first_name, last_name, department, status FROM employees LIMIT 3;');
        console.log('\n👥 Ejemplos de empleados:');
        sampleData.rows.forEach(row => {
          console.log(`   • ${row.first_name} ${row.last_name} - ${row.department} (${row.status})`);
        });
      }
    } else {
      console.log('⚠️  Tabla employees no encontrada');
      console.log('💡 Ejecuta el schema.sql para crearla');
    }

  } catch (error) {
    console.error('❌ Error de conexión:');
    console.error(`   Código: ${error.code}`);
    console.error(`   Mensaje: ${error.message}`);
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Sugerencias:');
      console.log('   • Verifica que el host sea correcto');
      console.log('   • Asegúrate de que la base de datos esté ejecutándose');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Sugerencias:');
      console.log('   • Verifica que el puerto sea correcto (5432 por defecto)');
      console.log('   • Revisa las reglas de seguridad/firewall');
    } else if (error.message.includes('password authentication failed')) {
      console.log('\n💡 Sugerencias:');
      console.log('   • Verifica usuario y contraseña');
      console.log('   • Revisa que el usuario tenga permisos');
    }
  } finally {
    await client.end();
  }
}

// Si se ejecuta directamente
if (require.main === module) {
  testConnection()
    .then(() => {
      console.log('\n🎉 Prueba de conexión completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error inesperado:', error.message);
      process.exit(1);
    });
}

module.exports = { testConnection, dbConfig };

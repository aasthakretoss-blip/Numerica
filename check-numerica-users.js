const { nominasPool } = require('./config/database');

async function checkAndCreateNumericaUsersTable() {
  const client = await nominasPool.connect();
  
  try {
    // Verificar si la tabla existe
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'numerica_users'
      );
    `;
    
    const checkResult = await client.query(checkTableQuery);
    const tableExists = checkResult.rows[0].exists;
    
    console.log('🔍 ¿Existe la tabla numerica_users?', tableExists);
    
    if (!tableExists) {
      console.log('📋 Creando tabla numerica_users...');
      
      // Crear la tabla numerica_users
      const createTableQuery = `
        CREATE TABLE numerica_users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          "firstName" VARCHAR(100),
          "lastName" VARCHAR(100),
          "phoneNumber" VARCHAR(20),
          status VARCHAR(20) DEFAULT 'active',
          "phoneVerified" BOOLEAN DEFAULT FALSE,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "lastLogin" TIMESTAMP
        );
      `;
      
      await client.query(createTableQuery);
      console.log('✅ Tabla numerica_users creada exitosamente');
      
      // Insertar usuario de prueba
      const insertUserQuery = `
        INSERT INTO numerica_users (email, "firstName", "lastName", status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO NOTHING
        RETURNING *;
      `;
      
      const testResult = await client.query(insertUserQuery, [
        'alberto.gutierrez@gsau.com.mx',
        'Alberto',
        'Gutierrez',
        'active'
      ]);
      
      if (testResult.rows.length > 0) {
        console.log('✅ Usuario de prueba creado:', testResult.rows[0]);
      } else {
        console.log('ℹ️ Usuario ya existe, saltando inserción');
      }
      
    } else {
      console.log('✅ La tabla numerica_users ya existe');
      
      // Mostrar los usuarios actuales
      const usersResult = await client.query('SELECT * FROM numerica_users ORDER BY id');
      console.log('👥 Usuarios actuales:', usersResult.rows);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
  }
}

// Ejecutar
checkAndCreateNumericaUsersTable()
  .then(() => {
    console.log('✅ Verificación completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en verificación:', error);
    process.exit(1);
  });

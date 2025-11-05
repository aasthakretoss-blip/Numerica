const { Pool } = require('pg');
require('dotenv').config();

// Configuración común para las conexiones
const baseConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false // Para AWS RDS
  },
  // Configuración del pool
  max: 10, // máximo número de conexiones
  idleTimeoutMillis: 30000, // cerrar conexiones inactivas después de 30 segundos
  connectionTimeoutMillis: 10000, // tiempo límite para obtener conexión
};

// Pool para base de datos de nóminas
const nominasPool = new Pool({
  ...baseConfig,
  database: process.env.DB_NOMINAS
});

// Pool para base de datos de fondos
const fondosPool = new Pool({
  ...baseConfig,
  database: process.env.DB_FONDOS
});

// Eventos de conexión para debugging
nominasPool.on('connect', () => {
  console.log('✅ Conectado a la base de datos de nóminas');
});

fondosPool.on('connect', () => {
  console.log('✅ Conectado a la base de datos de fondos');
});

nominasPool.on('error', (err) => {
  console.error('❌ Error en pool de nóminas:', err);
});

fondosPool.on('error', (err) => {
  console.error('❌ Error en pool de fondos:', err);
});

// Función para probar conexiones
const testConnections = async () => {
  const connections = {
    nominas: { success: false, error: null },
    fondos: { success: false, error: null }
  };
  
  try {
    // Probar conexión a nóminas
    const nominasClient = await nominasPool.connect();
    const nominasResult = await nominasClient.query('SELECT NOW() as timestamp, current_database() as database');
    console.log('🔍 Conexión a nóminas exitosa:', nominasResult.rows[0]);
    nominasClient.release();
    connections.nominas.success = true;
  } catch (error) {
    console.error('❌ Error conexión nóminas:', error.message);
    connections.nominas.error = error.message;
  }

  try {
    // Probar conexión a fondos
    const fondosClient = await fondosPool.connect();
    const fondosResult = await fondosClient.query('SELECT NOW() as timestamp, current_database() as database');
    console.log('🔍 Conexión a fondos exitosa:', fondosResult.rows[0]);
    fondosClient.release();
    connections.fondos.success = true;
  } catch (error) {
    console.error('❌ Error conexión fondos:', error.message);
    connections.fondos.error = error.message;
  }

  return connections;
};

// Función para obtener información de las tablas
const getTableInfo = async (pool, databaseName) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
      LIMIT 50
    `);
    client.release();
    
    console.log(`📊 Tablas en ${databaseName}:`, result.rows);
    return result.rows;
  } catch (error) {
    console.error(`❌ Error obteniendo info de tablas en ${databaseName}:`, error.message);
    return [];
  }
};

// Función para cerrar todas las conexiones
const closeConnections = async () => {
  await nominasPool.end();
  await fondosPool.end();
  console.log('🔌 Todas las conexiones cerradas');
};

module.exports = {
  nominasPool,
  fondosPool,
  testConnections,
  getTableInfo,
  closeConnections
};

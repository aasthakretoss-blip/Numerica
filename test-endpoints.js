const { Pool } = require('pg');
require('dotenv').config({ path: 'api-server/.env' });

// Database configuration
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

async function testPeriodsEndpoint() {
  console.log('🔍 Testing periods endpoint logic...');
  
  try {
    const client = await pool.connect();
    
    console.log('✅ Database connection established');
    
    // Test the actual query from nominasService.js
    const result = await client.query(`
      SELECT 
        DATE(cveper)::text AS value, 
        COUNT(*) as count
      FROM historico_nominas_gsau
      WHERE cveper IS NOT NULL
      GROUP BY DATE(cveper)::text
      ORDER BY DATE(cveper)::text DESC
      LIMIT 10
    `);
    
    console.log('✅ Query executed successfully');
    console.log('📊 Sample results:', result.rows);
    console.log('📊 Total rows:', result.rowCount);
    
    client.release();
    
    return {
      success: true,
      data: result.rows,
      count: result.rowCount
    };
    
  } catch (error) {
    console.error('❌ Error testing periods endpoint:', error);
    throw error;
  }
}

async function testTableExists() {
  console.log('🔍 Testing if historico_nominas_gsau table exists...');
  
  try {
    const client = await pool.connect();
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'historico_nominas_gsau'
      );
    `);
    
    console.log('📊 Table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Check cveper column
      const columnCheck = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'historico_nominas_gsau' 
        AND column_name = 'cveper'
      `);
      
      console.log('📊 cveper column info:', columnCheck.rows);
      
      // Check some sample data
      const sampleData = await client.query(`
        SELECT cveper 
        FROM historico_nominas_gsau 
        WHERE cveper IS NOT NULL 
        LIMIT 5
      `);
      
      console.log('📊 Sample cveper values:', sampleData.rows);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error checking table:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting endpoint debugging...');
  
  try {
    await testTableExists();
    await testPeriodsEndpoint();
    console.log('✅ All tests completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { testPeriodsEndpoint, testTableExists };

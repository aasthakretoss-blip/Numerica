const { Client } = require('pg');
require('dotenv').config({ path: '.env.database' });

console.log('DB_HOST:', process.env.DB_HOST); // debug

const client = new Client({
        host: 'dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'SanNicolasTotolapan23_Gloria5!',
  ssl: { rejectUnauthorized: false },
});

async function insertSampleEmployees() {
  console.log('🔄 Insertando empleados de ejemplo...');
  
  await client.connect();
  
  const employees = [
    ['Juan', 'García', 'juan.garcia@example.com', '5551234567', 'Engineering', 'Manager', 'CDMX', 'Active'],
    ['María', 'López', 'maria.lopez@example.com', '5552345678', 'Sales', 'Director', 'Guadalajara', 'Active'],
    ['Carlos', 'Martínez', 'carlos.martinez@example.com', '5553456789', 'HR', 'Manager', 'Monterrey', 'Active'],
    ['Ana', 'Rodríguez', 'ana.rodriguez@example.com', '5554567890', 'Finance', 'VP', 'CDMX', 'Active'],
    ['Luis', 'González', 'luis.gonzalez@example.com', '5555678901', 'Operations', 'IC', 'Puebla', 'Active'],
    ['Sofía', 'Hernández', 'sofia.hernandez@example.com', '5556789012', 'Engineering', 'IC', 'CDMX', 'Active'],
    ['Pedro', 'Ramírez', 'pedro.ramirez@example.com', '5557890123', 'Sales', 'IC', 'Guadalajara', 'Leave'],
    ['Lucía', 'Torres', 'lucia.torres@example.com', '5558901234', 'HR', 'IC', 'Monterrey', 'Active'],
    ['Jorge', 'Flores', 'jorge.flores@example.com', '5559012345', 'Finance', 'Manager', 'CDMX', 'Inactive'],
    ['Elena', 'Morales', 'elena.morales@example.com', '5550123456', 'Operations', 'Director', 'Puebla', 'Active']
  ];

  for (let emp of employees) {
    try {
      await client.query(
        `INSERT INTO employees (id, first_name, last_name, email, phone, department, role, location, status, hire_date) 
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [...emp, new Date().toISOString()]
      );
      console.log(`✅ Insertado: ${emp[0]} ${emp[1]}`);
    } catch (error) {
      console.log(`⚠️ Ya existe: ${emp[0]} ${emp[1]}`);
    }
  }

  const { rows } = await client.query('SELECT COUNT(*) FROM employees');
  console.log(`🎯 Total empleados en BD: ${rows[0].count}`);
  
  await client.end();
  console.log('🎉 ¡Listo!');
}

insertSampleEmployees().catch(console.error);

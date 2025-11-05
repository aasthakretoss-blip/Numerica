const { Client } = require('pg');
require('dotenv').config({ path: '../../.env.database' });

const firstNames = ["Juan","María","Carlos","Ana","Luis","Sofía","Pedro","Lucía","Jorge","Elena"];
const lastNames = ["García","Hernández","Martínez","López","González","Pérez","Sánchez","Ramírez","Cruz","Flores"];
const departments = ["Engineering","Sales","HR","Finance","Operations"];
const roles = ["IC","Manager","Director","VP"];
const locations = ["CDMX","Guadalajara","Monterrey","Puebla"];
const statuses = ["Active","Leave","Inactive"];

function rand(arr){ return arr[Math.floor(Math.random()*arr.length)] }
function randint(min, max){ return Math.floor(Math.random()*(max-min+1))+min }

async function insertEmployees(n=50){
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  console.log(`🔄 Insertando ${n} empleados de ejemplo...`);
  for(let i=0;i<n;i++){
    const fn = rand(firstNames);
    const ln = rand(lastNames);
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${randint(1,9999)}@example.com`;
    const phone = `55${randint(10000000,99999999)}`;
    const hireDate = new Date(Date.now()-randint(0,3650)*24*60*60*1000).toISOString();
    const tags = null; // optional
    const avatar = '';
    await client.query(
      `INSERT INTO employees (id, first_name, last_name, email, phone, department, role, location, status, hire_date, tags, avatar_url)
       VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (email) DO NOTHING`,
      [fn, ln, email, phone, rand(departments), rand(roles), rand(locations), rand(statuses), hireDate, tags, avatar]
    );
  }
  const { rows } = await client.query('SELECT COUNT(*)::int AS c FROM employees');
  console.log(`✅ Empleados totales en BD: ${rows[0].c}`);
  await client.end();
}

if(require.main === module){
  const n = Number(process.argv[2]||'50');
  insertEmployees(n).then(()=>{
    console.log('🎉 Listo');
    process.exit(0);
  }).catch(err=>{
    console.error('❌ Error:', err.message);
    process.exit(1);
  })
}


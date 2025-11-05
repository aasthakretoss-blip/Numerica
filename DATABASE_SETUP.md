# 🗃️ Configuración de Base de Datos PostgreSQL

## 🎯 Opciones disponibles

### Opción 1: 🌐 Amazon RDS/Aurora (Producción)
### Opción 2: 🐳 PostgreSQL Local con Docker (Desarrollo)  
### Opción 3: ☁️ PostgreSQL en la nube (ElephantSQL, Supabase, etc.)

---

## 🚀 Opción 1: Amazon RDS/Aurora

### Prerequisitos
- AWS CLI configurado con permisos RDS
- Aurora PostgreSQL cluster creado

### Pasos
1. **Obtener información del cluster:**
```bash
aws rds describe-db-clusters --region us-east-1
```

2. **Configurar variables de entorno:**
```bash
# Copiar archivo de configuración
cp .env.database.example .env.database

# Editar con datos reales:
# DB_HOST=your-aurora-endpoint.cluster-xxxxx.us-east-1.rds.amazonaws.com
# DB_PASSWORD=your-secure-password
```

3. **Probar conexión:**
```bash
npm run db:test
```

### Troubleshooting AWS
Si obtienes errores de permisos:
```bash
# Verificar permisos IAM
aws iam get-user
aws iam list-attached-user-policies --user-name your-username

# Verificar security groups
aws ec2 describe-security-groups --group-ids sg-xxxxx
```

---

## 🐳 Opción 2: PostgreSQL Local (Recomendado para desarrollo)

### Prerequisitos
- Docker Desktop instalado y ejecutándose

### Setup automático
```bash
# Ejecutar script de configuración
npm run db:setup-local

# O manualmente:
.\setup-local-db.bat
```

### Setup manual
```bash
# Crear y ejecutar container
docker run -d \
  --name payroll-postgres \
  -e POSTGRES_DB=payroll \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15

# Crear archivo de configuración
echo "DB_HOST=localhost
DB_PORT=5432
DB_NAME=payroll
DB_USER=postgres
DB_PASSWORD=postgres
NODE_ENV=development
SSL_REQUIRED=false" > .env.database

# Probar conexión
npm run db:test
```

### Comandos útiles Docker
```bash
# Ver containers
docker ps -a

# Logs del container
docker logs payroll-postgres

# Conectar directamente
docker exec -it payroll-postgres psql -U postgres -d payroll

# Detener/iniciar
docker stop payroll-postgres
docker start payroll-postgres

# Eliminar container
docker rm -f payroll-postgres
```

---

## ☁️ Opción 3: PostgreSQL en la nube

### ElephantSQL (Free tier disponible)
1. Registrarse en https://www.elephantsql.com/
2. Crear instancia PostgreSQL
3. Copiar URL de conexión
4. Configurar .env.database con los datos

### Supabase
1. Registrarse en https://supabase.com/
2. Crear proyecto
3. Ir a Settings > Database
4. Copiar connection string
5. Configurar .env.database

### Railway/Render/etc.
Similar proceso: crear instancia PostgreSQL y obtener credenciales

---

## 📊 Configuración de Schema y Datos

### 1. Crear schema
```bash
# Con psql instalado localmente
psql -h localhost -U postgres -d payroll -f backend-lambda/seed/schema.sql

# O conectar a Docker
docker exec -i payroll-postgres psql -U postgres -d payroll < backend-lambda/seed/schema.sql
```

### 2. Cargar datos de prueba
```bash
# Generar 50 empleados
cd backend-lambda/seed
python generate_seed.py 50 > employees.csv

# Cargar a base de datos
psql -h localhost -U postgres -d payroll -c "\copy employees FROM 'employees.csv' WITH (FORMAT CSV, HEADER);"
```

### 3. Verificar datos
```bash
npm run db:test
```

---

## 🧪 Prueba de Conexión

El script `test-db-connection.js` verifica:
- ✅ Conectividad a la base de datos
- ✅ Versión de PostgreSQL
- ✅ Usuario y base de datos actuales
- ✅ Existencia de tabla `employees`
- ✅ Conteo de registros
- ✅ Ejemplos de datos

### Ejecutar prueba:
```bash
npm run db:test
```

### Errores comunes:

**ENOTFOUND** - Host incorrecto
```bash
# Verificar host en .env.database
# Para AWS: endpoint del cluster
# Para local: localhost
```

**ECONNREFUSED** - Puerto/firewall
```bash
# Verificar puerto (5432 por defecto)
# Para AWS: verificar security groups
# Para local: verificar Docker
```

**password authentication failed**
```bash
# Verificar credenciales en .env.database
# Para AWS: obtener del AWS Secrets Manager
```

---

## 🔗 Integración con Frontend

### Backend Lambda
El backend ya está configurado para usar estas variables:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- SSL automático para producción

### Frontend
Para desarrollo local, el frontend puede usar el backend local:
```bash
# En frontend-react/.env.local
VITE_REACT_APP_API_URL=http://localhost:8000
```

---

## 📈 Monitoreo y Performance

### Logs de conexión
```javascript
// El script incluye logging detallado
console.log('📋 Configuración:', dbConfig);
```

### Métricas básicas
```sql
-- Cantidad de empleados por departamento
SELECT department, COUNT(*) FROM employees GROUP BY department;

-- Empleados activos vs inactivos
SELECT status, COUNT(*) FROM employees GROUP BY status;
```

### Optimización
- Índices ya configurados en `schema.sql`
- Connection pooling en producción (RDS Proxy)
- Queries optimizadas en backend

---

## 🎯 Siguientes Pasos

1. ✅ Configurar base de datos (una de las 3 opciones)
2. ✅ Probar conexión con `npm run db:test`
3. ✅ Cargar schema y datos de prueba
4. 🔄 Integrar con backend Lambda
5. 🔄 Configurar variables de entorno en frontend
6. 🔄 Deploy a AWS (si usando Aurora)

¡La base de datos está lista para funcionar con el sistema de empleados!

# Arquitectura del Sistema Numerica

## 📋 Resumen Ejecutivo

Sistema de dashboard para empleados completamente desplegado en AWS con infraestructura serverless. El backend permanece **siempre activo** mediante AWS Lambda + RDS, sin necesidad de levantar servidores locales.

---

## 🏗️ Arquitectura General

```
Internet
   ↓
CloudFront (CDN)
   ↓
S3 Bucket (Frontend)
   ↓ API Calls
API Gateway + Lambda (Backend)
   ↓
RDS PostgreSQL (Base de datos)
```

---

## 🌐 URLs de Producción

| Componente | URL | Estado |
|------------|-----|--------|
| **Frontend** | https://d3s6xfijfd78h6.cloudfront.net/busqueda-empleados | ✅ Activo |
|| **Backend API** | https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com | ✅ Activo |
| **Base de Datos** | RDS PostgreSQL (interno) | ✅ Siempre activo |

---

## 🎯 Frontend (React)

### Tecnologías
- **React 18** con hooks
- **CSS Modules** para estilos
- **Axios** para comunicación con API
- **Netlify CLI** + **AWS CLI** para deployment

### Estructura de Componentes
```
src/
├── components/
│   ├── BusquedaEmpleados.jsx      # Componente principal
│   ├── EmployeeTable.jsx          # Tabla de empleados
│   ├── BuscarEmpleado.jsx         # Búsqueda por nombre/CURP  
│   ├── DropDownMenu.jsx           # Filtros dropdown
│   └── Pagination.jsx             # Paginación
├── utils/
│   └── formatters.js              # Funciones para formatear datos
└── App.js
```

### Variables de Entorno
```bash
REACT_APP_API_URL=https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com
REACT_APP_ENV=production
```

### Deployment
```powershell
# Automático
.\deploy-full.ps1 -Component frontend

# Manual
npm run build
aws s3 sync build/ s3://payroll-employees-845465762708-us-east-1 --delete
aws cloudfront create-invalidation --distribution-id E3JFSGITJTR6NS --paths "/*"
```

---

## 🔧 Backend (Serverless)

### Tecnologías
- **Node.js 18** con CommonJS
- **AWS Lambda** para funciones serverless
- **API Gateway** para routing HTTP
- **RDS PostgreSQL** para persistencia
- **Serverless Framework** para deployment

### Endpoints API

| Método | Endpoint | Funcionalidad |
|--------|----------|---------------|
| `GET` | `/api/payroll` | Lista empleados con filtros y paginación |
| `GET` | `/api/payroll/stats` | Estadísticas y health check |
| `GET` | `/api/payroll/filters/branches` | Lista de sucursales disponibles |
| `GET` | `/api/payroll/filters/positions` | Lista de puestos disponibles |
| `GET` | `/api/payroll/filters/states` | Lista de estados disponibles |
| `GET` | `/api/payroll/filters/periods` | Lista de periodos disponibles |

### Parámetros de Consulta
```javascript
// Ejemplo de consulta completa
GET /api/payroll?search=juan&branches=SUCURSAL_A,SUCURSAL_B&positions=PUESTO_1&states=ACTIVO&periods=2024-01&page=1&limit=25
```

### Configuración de Base de Datos
```yaml
# serverless.yml
environment:
  DB_HOST: numerica-db.cluster-ro-c8abc123def.us-east-1.rds.amazonaws.com
  DB_NAME: historico_nominas_gsau
  DB_USER: ${env:DB_USER}
  DB_PASSWORD: ${env:DB_PASSWORD}
  DB_PORT: 5432
```

---

## 🗄️ Base de Datos (RDS PostgreSQL)

### Características
- **Instancia**: RDS PostgreSQL 13+ 
- **Disponibilidad**: 24/7 (gestionado por AWS)
- **Conexiones**: Pool de conexiones automático
- **Backup**: Automático diario
- **Escalabilidad**: Horizontal mediante read replicas

### Tabla Principal: `historico_nominas_gsau`
```sql
-- Campos principales utilizados
SELECT 
    CVETRABJR as curp,
    NOMTRABJR as nombre,
    CVESUC as sucursal,
    CVEPUESTO as puesto,
    STATUS as estado,
    CVEPER as periodo,  -- Formato timestamp
    SALARIO as salario
FROM historico_nominas_gsau
WHERE [filtros]
ORDER BY nombre
LIMIT [paginación]
```

### Consultas Optimizadas
- **Índices** en campos CURP, sucursal, puesto, estado, periodo
- **Filtros combinados** con soporte para selección múltiple
- **Búsqueda de texto** mediante ILIKE para nombre y CURP
- **Conteos eficientes** para estadísticas sin cargar todos los registros

---

## 🚀 Deployment y CI/CD

### Scripts de Deployment

#### Script Principal: `deploy-full.ps1`
```powershell
# Solo frontend (recomendado)
.\deploy-full.ps1 -Component frontend

# Verificar estado del sistema
.\deploy-full.ps1 -Component test

# Todo el sistema (con precaución)
.\deploy-full.ps1 -Component all -Force
```

#### Flujo de Deployment Frontend
1. ✅ Verificar variables de entorno de producción
2. ✅ Construir aplicación React (`npm run build`)
3. ✅ Subir archivos a S3 bucket
4. ✅ Invalidar caché de CloudFront
5. ✅ Verificar que el sistema funcione

#### Backend (Protegido)
- El backend actual **está funcionando correctamente**
- Deployment de backend está **deshabilitado por defecto** para evitar interrupciones
- Solo se actualiza con flag `-Force` y supervisión

---

## 🔒 Seguridad y Acceso

### Autenticación
- Sin autenticación pública (dashboard interno)
- Acceso mediante URL privada de CloudFront
- CORS configurado para dominios específicos

### Variables Sensibles
- **Secretos de DB** almacenados en AWS Systems Manager
- **Credenciales AWS** mediante IAM roles
- **Variables de entorno** separadas por ambiente

### Backup y Recuperación
- **RDS**: Backup automático diario con retención de 7 días
- **S3**: Versionado habilitado para archivos del frontend
- **Lambda**: Código fuente en repositorio Git

---

## 📊 Monitoreo y Logs

### Métricas AWS
- **CloudWatch** para métricas de Lambda y RDS
- **X-Ray** para tracing de requests
- **CloudFront** para métricas de CDN

### Health Checks
```javascript
// Endpoint de verificación
GET /api/payroll/stats
Response: { 
    success: true, 
    totalEmployees: 1234,
    timestamp: "2024-01-15T10:30:00Z"
}
```

---

## 🔧 Desarrollo Local

### Requisitos
- **Node.js 18+**
- **AWS CLI** configurado
- **PowerShell 5.0+** (Windows)

### Configuración para Desarrollo
```bash
# Variables de entorno locales (.env.local)
REACT_APP_API_URL=http://localhost:3000  # Para desarrollo local
REACT_APP_ENV=development

# O para usar backend en producción durante desarrollo
REACT_APP_API_URL=https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com
REACT_APP_ENV=development
```

### Comandos de Desarrollo
```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo (usa backend remoto)
npm start

# Construir para producción
npm run build

# Linter y formateo
npm run lint
npm run format
```

---

## 🚨 Troubleshooting

### Problemas Comunes

#### "API no responde"
```powershell
# Verificar estado del backend
curl https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com/api/payroll/stats

# Debe retornar: { "success": true, "totalEmployees": ... }
```

#### "Frontend no actualiza"
```powershell
# Forzar invalidación de caché
aws cloudfront create-invalidation --distribution-id E3JFSGITJTR6NS --paths "/*"
```

#### "Build local falla"
```powershell
# Limpiar caché y reinstalar
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Contactos de Soporte
- **AWS RDS**: Siempre activo, no requiere intervención
- **Lambda**: Auto-scaling según demanda
- **CloudFront**: CDN global con alta disponibilidad

---

## 📈 Roadmap y Mejoras

### Próximas Funcionalidades
- [ ] Autenticación de usuarios
- [ ] Exportación de datos a Excel/PDF
- [ ] Dashboard de métricas avanzadas
- [ ] Filtros por fecha personalizada
- [ ] Cache en Redis para consultas frecuentes

### Optimizaciones Técnicas
- [ ] Service Worker para cache offline
- [ ] Lazy loading de componentes
- [ ] Compresión Gzip/Brotli
- [ ] CDN para assets estáticos adicionales

---

## 📝 Conclusiones

✅ **Sistema 100% funcional** con infraestructura serverless
✅ **Backend siempre activo** sin necesidad de servidores locales  
✅ **Frontend desplegado** en CDN global de alta velocidad
✅ **Base de datos confiable** con AWS RDS PostgreSQL
✅ **Scripts de deployment** automatizados y seguros
✅ **Documentación completa** para desarrollo y mantenimiento

El sistema está **listo para producción** y puede escalarse según las necesidades del negocio.

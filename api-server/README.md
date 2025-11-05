# GSAU Historical Data API

API para consultar datos históricos de nóminas y fondos del sistema GSAU.

## 🔧 Configuración

### Variables de Entorno Requeridas

Crear archivo `.env` en la raíz del proyecto:

```bash
# Base de Datos
DB_HOST=gsaudb.cgt6iqqkqla7.us-east-1.rds.amazonaws.com
DB_USER=postgres
DB_PASSWORD=tu_contraseña_aqui
DB_PORT=5432
DB_NAME_NOMINAS=historico_nominas_gsau
DB_NAME_FONDOS=historico_fondos_gsau

# Servidor
PORT=3001
NODE_ENV=development

# AWS Cognito
COGNITO_USER_POOL_ID=us-east-1_YourPoolId
COGNITO_CLIENT_ID=YourClientId

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar servidor en modo desarrollo
npm run dev

# Ejecutar servidor en producción
npm start
```

## 🏗️ Arquitectura

```
api-server/
├── config/
│   └── database.js      # Configuración de conexiones PostgreSQL
├── middleware/
│   └── auth.js          # Middleware de autenticación JWT
├── services/
│   ├── nominasService.js # Lógica de negocio para nóminas
│   └── fondosService.js  # Lógica de negocio para fondos
├── server.js            # Servidor Express principal
├── package.json
├── .env                 # Variables de entorno (no subir a git)
└── README.md
```

## 🛣️ Endpoints

### Públicos

#### `GET /health`
Estado del servidor y conexiones a bases de datos.

**Respuesta:**
```json
{
  "status": "OK",
  "timestamp": "2025-08-29T00:50:22.084Z",
  "connections": {
    "nominas": {
      "success": false,
      "error": "database \"historico_nominas_gsau\" does not exist"
    },
    "fondos": {
      "success": false,
      "error": "database \"historico_fondos_gsau\" does not exist"
    }
  },
  "environment": "development"
}
```

#### `GET /api/info`
Información general de la API.

**Respuesta:**
```json
{
  "name": "GSAU Historical Data API",
  "version": "1.0.0",
  "description": "API para consultar datos históricos de nóminas y fondos",
  "endpoints": {
    "public": ["/health", "/api/info"],
    "protected": {
      "nominas": ["/api/nominas/*"],
      "fondos": ["/api/fondos/*"]
    },
    "permissions": {
      "custom:can_upload": "Permite subir archivos",
      "custom:can_view_funds": "Permite ver información de fondos",
      "custom:role": "admin | user"
    }
  }
}
```

### Protegidos (Requieren JWT Token)

Todas las rutas protegidas requieren header:
```
Authorization: Bearer <jwt_token>
```

#### Nóminas

##### `GET /api/nominas/tables`
Lista las tablas disponibles en la base de datos de nóminas.

##### `GET /api/nominas/tables/:tableName/structure`
Obtiene la estructura de una tabla específica.

##### `GET /api/nominas/tables/:tableName/data`
Consulta datos de una tabla con paginación y filtros.

**Query Parameters:**
- `limit`: Número máximo de registros (default: 100, max: 1000)
- `offset`: Registros a saltar (default: 0)
- `orderBy`: Columna para ordenar
- `order`: ASC | DESC (default: ASC)
- Cualquier otro parámetro será tratado como filtro WHERE

**Ejemplo:**
```
GET /api/nominas/tables/empleados/data?limit=50&offset=0&nombre=Juan&orderBy=apellido
```

##### `GET /api/nominas/search/employees`
Busca empleados por términos específicos.

**Query Parameters:**
- `q`: Término de búsqueda (requerido)
- `limit`: Límite de resultados (default: 50, max: 200)
- `offset`: Offset para paginación

##### `GET /api/nominas/stats`
Estadísticas generales de la base de datos de nóminas.

#### Fondos (Requieren permiso adicional: `custom:can_view_funds = true`)

##### `GET /api/fondos/tables`
Lista las tablas disponibles en la base de datos de fondos.

##### `GET /api/fondos/tables/:tableName/structure`
Obtiene la estructura de una tabla específica de fondos.

##### `GET /api/fondos/tables/:tableName/data`
Consulta datos de una tabla de fondos con paginación y filtros.

##### `GET /api/fondos/search`
Busca fondos por criterios específicos.

**Query Parameters:**
- `q`: Término de búsqueda (requerido)
- `limit`: Límite de resultados
- `offset`: Offset para paginación

##### `GET /api/fondos/summary`
Resumen financiero de fondos.

##### `GET /api/fondos/movements`
Movimientos de fondos con filtros de fecha.

**Query Parameters:**
- `fechaInicio`: Fecha de inicio (formato: YYYY-MM-DD)
- `fechaFin`: Fecha final (formato: YYYY-MM-DD)
- `tipoMovimiento`: Tipo de movimiento
- `limit`: Límite de resultados (default: 100, max: 500)
- `offset`: Offset para paginación

##### `GET /api/fondos/stats`
Estadísticas de la base de datos de fondos.

#### Administrativos (Requieren rol: `custom:role = admin`)

##### `GET /api/user/profile`
Información del usuario autenticado.

##### `GET /api/admin/test`
Endpoint de prueba administrativo con estadísticas completas.

## 🔐 Autenticación y Autorización

### JWT Token Structure

El token JWT debe contener los siguientes claims:
- `sub`: ID único del usuario
- `email`: Email del usuario
- `cognito:username`: Nombre de usuario
- `custom:role`: Rol del usuario (`admin` | `user`)
- `custom:can_upload`: Permiso para subir archivos (`true` | `false`)
- `custom:can_view_funds`: Permiso para ver fondos (`true` | `false`)
- `custom:permissions_loaded`: Indica si los permisos fueron cargados (`true` | `false`)

### Niveles de Acceso

1. **Público**: Sin autenticación requerida
2. **Autenticado**: Requiere JWT válido
3. **Con Permisos**: Requiere JWT + permisos específicos
4. **Administrativo**: Requiere JWT + rol admin

## 📊 Estructura de Respuestas

### Éxito
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 1500,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

### Error
```json
{
  "success": false,
  "error": "Descripción del error",
  "code": "ERROR_CODE"
}
```

### Códigos de Error Comunes

- `NO_TOKEN`: Token de autorización no proporcionado
- `INVALID_TOKEN_FORMAT`: Formato de token inválido
- `TOKEN_EXPIRED`: Token expirado
- `INVALID_TOKEN`: Token inválido
- `NOT_AUTHENTICATED`: Usuario no autenticado
- `PERMISSION_DENIED`: Sin permisos suficientes
- `ADMIN_REQUIRED`: Se requieren permisos de administrador

## 🧪 Testing

### Probar rutas públicas

```bash
# Health check
curl http://localhost:3001/health

# Info de la API
curl http://localhost:3001/api/info
```

### Probar rutas protegidas

```bash
# Con token válido (reemplazar YOUR_JWT_TOKEN)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3001/api/nominas/tables

# Sin token (debería retornar 401)
curl http://localhost:3001/api/nominas/tables
```

## 🚀 Despliegue

### Desarrollo Local

```bash
npm run dev
```

### Producción

1. Establecer `NODE_ENV=production` en .env
2. Configurar variables de entorno en el servidor
3. Ejecutar `npm start`

### Consideraciones de Seguridad

- ✅ Validación de JWT con AWS Cognito
- ✅ Validación de parámetros de entrada
- ✅ Protección contra SQL Injection
- ✅ CORS configurado
- ✅ Rate limiting (recomendado para producción)
- ✅ HTTPS (recomendado para producción)

## 🔄 Base de Datos

### Conexiones

El API mantiene dos pools de conexiones:
- `nominasPool`: Para la base de datos de nóminas
- `fondosPool`: Para la base de datos de fondos

### Configuración SSL

Las conexiones utilizan SSL para AWS RDS:
```javascript
ssl: {
  require: true,
  rejectUnauthorized: false
}
```

## 📝 Logs

El servidor registra:
- Todas las requests HTTP con timestamp
- Errores de base de datos
- Errores de autenticación
- Estado de conexiones al iniciar

## 🛠️ Desarrollo

### Estructura del Código

- **Servicios**: Lógica de negocio y consultas a BD
- **Middleware**: Autenticación y validación
- **Controladores**: Manejo de rutas HTTP
- **Configuración**: Conexiones y variables de entorno

### Agregar Nuevos Endpoints

1. Crear función en el servicio apropiado
2. Agregar ruta en `server.js`
3. Aplicar middleware de autenticación si es necesario
4. Documentar en este README

## 🏃‍♂️ Quick Start

```bash
# Clonar y configurar
git clone <repo>
cd api-server
cp .env.example .env # Editar con valores reales
npm install

# Ejecutar
npm start

# Probar
curl http://localhost:3001/health
```

---

**Desarrollado para GSAU** - Sistema de consulta de datos históricos

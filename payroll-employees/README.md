# Payroll Employees - Sistema de Gestión de Nómina

🚀 **Sistema completo de búsqueda y visualización de empleados** para aplicaciones de gestión de nómina empresarial.

## 📋 Características Principales

### 🔍 **Dashboard de Búsqueda Avanzada**
- **Filtros múltiples**: RFC, nombre, puesto, sucursal
- **Ordenamiento inteligente**: Por cualquier columna con indicadores visuales (↑↓)
- **Paginación optimizada**: 20 elementos por página con navegación intuitiva
- **Estados de carga**: Loading, vacío, error con mensajes informativos
- **Responsive design**: Mobile-first con grid adaptativo

### 📊 **Multi-source Data Loading**
Sistema de carga de datos con prioridad automática:
1. **Backend API** (Aurora PostgreSQL + Lambda)
2. **Archivo de prueba** (`/public/test-employees.json` o S3)
3. **LocalStorage** (persistencia local)
4. **Memoria** (fallback vacío)

### 🔐 **Autenticación y Autorización**
- **AWS Cognito** para autenticación JWT
- **RBAC** con 4 niveles de acceso:
  - `viewer`: Solo lectura
  - `manager`: Lectura + edición básica
  - `hr`: Lectura + activar/desactivar empleados
  - `admin`: Acceso completo

### 🏗️ **Arquitectura Cloud-Native**
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: FastAPI + Mangum (AWS Lambda)
- **Base de datos**: Aurora PostgreSQL Serverless v2 + RDS Proxy
- **Hosting**: S3 + CloudFront
- **API**: API Gateway HTTP API con CORS
- **Infraestructura**: AWS CDK v2 (TypeScript)

## 🏃‍♂️ Quick Start

### 1. Instalación
```bash
cd payroll-employees
pnpm install -w
```

### 2. Desarrollo Local (Solo Frontend)
```bash
# Usar datos de prueba locales
pnpm dev
# → http://localhost:5173
```

### 3. Deployment Completo
```bash
# Desplegar infraestructura AWS
cdk bootstrap
pnpm deploy:infra

# Configurar .env con outputs del CDK
# Ver DEPLOYMENT.md para detalles
```

## 📁 Estructura del Monorepo

```
payroll-employees/
├── frontend-react/           # React SPA con Vite
│   ├── src/
│   │   ├── components/       # Componentes reutilizables
│   │   ├── pages/           # Páginas principales
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Data loading y helpers
│   │   └── types.ts         # TypeScript types
│   └── public/
│       └── test-employees.json  # Datos de prueba
├── backend-lambda/           # FastAPI + Mangum
│   ├── src/
│   │   ├── main.py         # FastAPI app
│   │   ├── auth.py         # JWT validation
│   │   ├── db.py           # Database connection
│   │   └── models.py       # Pydantic models
│   └── seed/
│       ├── schema.sql      # PostgreSQL schema
│       └── generate_seed.py # Data generator
└── infra-cdk/               # AWS CDK Infrastructure
    └── lib/
        └── infra-cdk-stack.ts  # Complete AWS stack
```

## 🎯 Componentes Frontend Destacados

- **`EmployeeSearchPage`**: Dashboard principal con filtros y tabla
- **`EmployeeTable`**: Tabla ordenable con formato de moneda MXN
- **`MultiSelectDropdown`**: Selector múltiple con búsqueda interna
- **`Pagination`**: Navegación con elipsis y contador de registros
- **`DataSyncStatus`**: Indicador de origen de datos con refresh

## 🔧 Variables de Entorno

Crear `frontend-react/.env.local`:
```bash
VITE_REACT_APP_API_URL=https://xxxxx.execute-api.region.amazonaws.com
VITE_REACT_APP_COGNITO_REGION=us-east-1
VITE_REACT_APP_COGNITO_USER_POOL_ID=region_xxxxxxxxx
VITE_REACT_APP_COGNITO_CLIENT_ID=xxxxx
VITE_REACT_APP_TEST_JSON_URL=/test-employees.json
```

## 🌐 API Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/employees` | Lista paginada con filtros | JWT |
| `GET` | `/api/employees/{id}` | Detalle de empleado | JWT |

### Query Parameters (`/api/employees`)
- `q`: Búsqueda de texto libre
- `department`, `role`, `status`, `location`: Filtros exactos
- `sortBy`, `sortDir`: Ordenamiento
- `page`, `pageSize`: Paginación

## 📱 Funcionalidades UX/UI

### ✨ **Características de Usabilidad**
- **Debounce**: Búsqueda con 300ms de retraso
- **Deep linking**: URL params mantienen estado de filtros
- **Indicadores visuales**: Badges de estado coloreados
- **Accesibilidad**: ARIA labels, navegación por teclado
- **Loading states**: Skeleton loading y estados de error

### 📊 **Dashboard Stats**
- Contador de empleados encontrados
- Indicador de origen de datos
- Mes más reciente de datos
- Información de paginación

### 🎨 **Responsive Design**
- Grid adaptativo: 1 columna (móvil) → 4 columnas (desktop)
- Tabla con scroll horizontal
- Touch-friendly controls

## 🚀 Scripts Disponibles

```bash
# Desarrollo
pnpm dev              # Frontend en localhost:5173
pnpm build            # Build de producción
pnpm test             # Tests (configurar)

# Infraestructura
pnpm deploy:infra     # CDK deploy
pnpm deploy:front     # Sync a S3 + invalidate CloudFront

# Utilidades
pnpm lint             # Linting (configurar)
```

## 📚 Documentación Completa

- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Guía completa de deployment
- Incluye setup de AWS, base de datos, usuarios, monitoreo
- Troubleshooting y optimización de costos

## 🏗️ Stack Tecnológico

| Capa | Tecnología | Propósito |
|------|------------|----------|
| **Frontend** | React 18 + TypeScript | UI interactiva |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Build** | Vite | Development server |
| **Backend** | FastAPI + Mangum | API REST serverless |
| **Database** | Aurora PostgreSQL | Data persistence |
| **Auth** | AWS Cognito | JWT authentication |
| **Hosting** | S3 + CloudFront | Static hosting + CDN |
| **Infrastructure** | AWS CDK | IaC deployment |

## 📈 Próximas Características

- [ ] Edición inline de empleados
- [ ] Export a CSV/PDF
- [ ] Gráficos de distribución salarial
- [ ] Búsqueda fuzzy/aproximada
- [ ] Filtros guardados/favoritos
- [ ] Tests automatizados (Jest + Cypress)
- [ ] CI/CD pipeline

---

**🎯 Este sistema representa una solución empresarial completa**, combinando robustez técnica con excelente experiencia de usuario, siguiendo las mejores prácticas de desarrollo React moderno y arquitectura cloud-native.


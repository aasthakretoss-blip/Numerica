# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Numerica** is a comprehensive payroll and employee management system built with React and deployed on AWS infrastructure. The system consists of multiple integrated components:

1. **Main React Dashboard** - Modern glassmorphism UI for analytics and data visualization
2. **API Server** - Express.js backend for GSAU historical data (payroll and funds)
3. **Payroll Employees** - Standalone employee search/management system with AWS Lambda backend
4. **AWS Infrastructure** - CloudFront, S3, Lambda, RDS PostgreSQL, API Gateway

**Important**: User's payroll data originates from an AWS database named `historico_nominas_gsau`, and no invented payroll_data should be used or created.

## Development Commands

### Main Application (React Dashboard)

```powershell
# Development
npm start                    # Start React dev server (localhost:3000)
npm test                     # Run tests
npm run build                # Production build

# Database
npm run db:test              # Test database connection
npm run db:setup-cloud       # Setup cloud database (AWS RDS)

# Full system (API + Frontend)
npm run api:start            # Start local API server (port 3001)
npm run full:start           # Start both API and frontend concurrently

# Windows batch scripts
.\start-both-servers.bat     # Start API + React (kills existing node processes)
.\run-full-system.bat        # Start full system with DB verification
```

### API Server (Express Backend)

```powershell
cd api-server

# Development
npm start                    # Start production server
npm run dev                  # Start with nodemon (auto-reload)
npm run test                 # Run API tests
npm run build                # Build message (no actual build needed)

# Testing endpoints
npm run test:simple          # Simple test server
npm run test:debug           # Debug mode server
```

### Payroll Employees (Monorepo)

```powershell
cd payroll-employees

# Frontend development
pnpm dev                     # Start Vite dev server (localhost:5173)
pnpm build                   # Build frontend
pnpm test                    # Run tests
pnpm lint                    # Run linter

# Infrastructure (AWS CDK)
pnpm deploy:infra            # Deploy AWS infrastructure (Lambda, RDS, CloudFront, etc.)
pnpm deploy:front            # Build and deploy frontend to S3 + CloudFront

# Database
pnpm db:test                 # Test database connection
pnpm db:setup-local          # Setup local PostgreSQL with Docker
```

### Deployment

```powershell
# Frontend deployment to CloudFront
.\deploy-full.ps1 -Component frontend      # Deploy frontend only (recommended)
.\deploy-full.ps1 -Component test          # Test system health
.\deploy-full.ps1 -Component all -Force    # Deploy everything (use with caution)

# Individual deployment scripts
.\deploy-frontend.ps1        # Frontend to S3 + CloudFront invalidation
.\deploy-simple.ps1          # Simple deployment
.\deploy-lambda-fix.ps1      # Lambda function fixes
```

## Architecture

### Multi-Component System

The repository contains three interconnected applications:

#### 1. Main React Dashboard (`/src`)
- **Tech Stack**: React 19, Styled Components, Axios, Chart.js
- **Purpose**: Analytics dashboard with glassmorphism UI
- **Key Features**:
  - Data visualization with interactive charts
  - Employee profiles and payroll data
  - Demographic analysis (population pyramids, age/salary charts)
  - FPL (Fondo de Pensiones y Liquidaciones) management
  
**Component Structure**:
```
src/
├── components/          # Reusable UI components
│   ├── BuscarEmpleado.jsx
│   ├── EmployeeProfile.jsx
│   ├── PayrollDashboard.tsx
│   ├── DemographicFilterSystem.jsx
│   ├── PopulationPyramid.jsx
│   └── profile/        # Employee profile subcomponents
├── pages/              # Route pages
│   ├── BusquedaEmpleados.jsx
│   ├── Demografico.jsx
│   ├── Payroll.jsx
│   └── FPL.jsx
├── services/           # API clients
│   ├── authService.js
│   └── nominasApi.ts
├── utils/              # Helper functions
│   ├── rfcUtils.js
│   ├── curpToRfcUtils.js
│   └── periodUtils.ts
└── hooks/              # Custom React hooks
    └── useServerPagination.ts
```

#### 2. API Server (`/api-server`)
- **Tech Stack**: Express.js, PostgreSQL (pg), AWS Cognito JWT, CORS
- **Purpose**: Backend API for GSAU historical data queries
- **Database**: AWS RDS PostgreSQL (`historico_nominas_gsau`, `historico_fondos_gsau`)

**Key Endpoints**:
- `GET /health` - Health check and DB connection status
- `GET /api/nominas/tables` - List available payroll tables
- `GET /api/nominas/tables/:tableName/data` - Query payroll data with pagination
- `GET /api/nominas/search/employees` - Search employees
- `GET /api/fondos/*` - Funds data (requires `custom:can_view_funds` permission)

**Authentication**: JWT tokens from AWS Cognito with role-based access control (RBAC)

#### 3. Payroll Employees Monorepo (`/payroll-employees`)
- **Tech Stack**: React 18, TypeScript, Tailwind CSS, Vite, FastAPI, AWS CDK
- **Purpose**: Standalone employee search/management with serverless backend
- **Workspaces**: `frontend-react`, `backend-lambda`, `infra-cdk`

**Architecture**:
```
CloudFront → S3 (Frontend) → API Gateway → Lambda (FastAPI) → Aurora PostgreSQL
```

**Features**:
- Multi-source data loading (API → Test JSON → LocalStorage → Memory)
- Advanced search with filters (RFC, nombre, puesto, sucursal)
- Sortable tables with pagination
- Responsive mobile-first design

### Database Architecture

**Primary Database**: AWS RDS PostgreSQL
- **Payroll DB**: `historico_nominas_gsau` 
- **Funds DB**: `historico_fondos_gsau`
- **Connection**: Pool-based with SSL
- **Access**: Via api-server or backend-lambda

**Key Tables**:
- `historico_nominas_gsau` - Historical payroll data (CURP, nombre, sucursal, puesto, salario, periodo)
- Employee data indexed by CURP, sucursal, puesto, estado, periodo

### Authentication & Authorization

**AWS Cognito** integration with JWT validation:
- **Roles**: viewer, manager, hr, admin
- **Permissions**: `custom:can_upload`, `custom:can_view_funds`, `custom:role`
- **Token validation**: JWKS endpoint validation in both api-server and backend-lambda

### Deployment Infrastructure

**Production URLs**:
- Frontend: `https://d3s6xfijfd78h6.cloudfront.net/busqueda-empleados`
- Backend API: `https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com`
- CloudFront Distribution: `E3JFSGITJTR6NS`
- S3 Bucket: `payroll-employees-845465762708-us-east-1`

**AWS Services**:
- **S3**: Static website hosting for React builds
- **CloudFront**: CDN for fast content delivery
- **Lambda**: Serverless API functions (Node.js 18, Python 3.11)
- **API Gateway**: HTTP API routing
- **RDS PostgreSQL**: Managed database with automatic backups
- **Cognito**: User authentication and authorization

## Important Development Notes

### Data Source Priority
1. **Never create or use invented payroll data** - all data must come from `historico_nominas_gsau`
2. Backend Lambda uses multi-source loading: Backend API → Test JSON → LocalStorage → Memory
3. Always verify database connections before running the full system

### Environment Variables

**Main App** (`.env`, `.env.production`):
```
REACT_APP_API_URL=https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com
REACT_APP_ENV=production
```

**API Server** (`.env` in `/api-server`):
```
DB_HOST=gsaudb.cgt6iqqkqla7.us-east-1.rds.amazonaws.com
DB_USER=postgres
DB_PASSWORD=<from AWS Secrets Manager>
DB_PORT=5432
DB_NAME_NOMINAS=historico_nominas_gsau
DB_NAME_FONDOS=historico_fondos_gsau
PORT=3001
COGNITO_USER_POOL_ID=<user pool id>
COGNITO_CLIENT_ID=<client id>
```

**Payroll Employees Frontend** (`frontend-react/.env.local`):
```
VITE_REACT_APP_API_URL=<API Gateway URL>
VITE_REACT_APP_COGNITO_REGION=us-east-1
VITE_REACT_APP_COGNITO_USER_POOL_ID=<pool id>
VITE_REACT_APP_COGNITO_CLIENT_ID=<client id>
```

### Common Development Workflows

**Starting Development Environment**:
```powershell
# Option 1: Local development with real AWS DB
.\run-full-system.bat        # Verifies DB → starts API → starts frontend

# Option 2: Just React (using deployed backend)
npm start

# Option 3: Payroll employees only
cd payroll-employees
pnpm dev
```

**Testing Database Connection**:
```powershell
npm run db:test              # Root level
cd api-server && npm run test
cd payroll-employees && pnpm db:test
```

**Deploying Frontend Changes**:
```powershell
# Recommended: Deploy frontend only (backend already stable)
.\deploy-full.ps1 -Component frontend

# Verify after deployment
.\deploy-full.ps1 -Component test
```

### Windows PowerShell Scripts

The project uses PowerShell scripts for deployment and Windows batch files for local development:
- `deploy-full.ps1` - Main deployment script with safety checks
- `deploy-frontend.ps1`, `deploy-simple.ps1` - Specific deployment tasks
- `*.bat` files - Local development server management

### Working with the Codebase

**React Components**:
- Mix of `.jsx`, `.tsx` (migrating to TypeScript)
- CSS Modules and Styled Components for styling
- Chart.js for data visualization
- Responsive design with mobile-first approach

**API Development**:
- Express.js with CommonJS (require/module.exports)
- PostgreSQL queries use parameterized statements (SQL injection protection)
- JWT middleware validates all protected routes
- CORS configured for specific origins

**Backend Lambda**:
- FastAPI with Mangum adapter for AWS Lambda
- Pydantic models for request/response validation
- Connection pooling for PostgreSQL via RDS Proxy

### Testing

**Frontend**: React Testing Library (configured but minimal coverage)
**API Server**: Manual endpoint testing scripts (`test-*.js`, `test-*.ps1`)
**Integration**: Full system verification via `deploy-full.ps1 -Component test`

### File Structure Highlights

```
Numerica/
├── src/                     # Main React app
├── api-server/              # Express API backend
├── payroll-employees/       # Monorepo (React + Lambda + CDK)
├── backend-lambda/          # Python Lambda functions
├── infra-cdk/              # AWS CDK infrastructure
├── scripts/                # Utility scripts
├── docs/                   # Additional documentation
├── deploy*.ps1             # Deployment scripts
├── *.bat                   # Windows batch files for dev
└── *.md                    # Documentation files
```

### Security Considerations

- **JWT validation** on all protected endpoints
- **SQL parameterization** prevents injection attacks
- **CORS** restricted to known origins
- **Database credentials** stored in AWS Secrets Manager or environment variables (never committed)
- **HTTPS only** in production (CloudFront + API Gateway)

## Additional Resources

- `README.md` - Main project overview
- `ARCHITECTURE.md` - Detailed system architecture (200+ lines)
- `DEPLOYMENT.md` - Step-by-step deployment guide
- `DATABASE_SETUP.md` - Database configuration options
- `api-server/README.md` - Comprehensive API documentation with all endpoints
- `payroll-employees/README.md` - Payroll system documentation with deployment guide
- `SECURITY_CHECKLIST_PRODUCCION.md` - Production security checklist

## Notes for AI Assistants

- This is a **Windows-based development environment** (PowerShell, batch files)
- The system uses **multiple package managers**: npm (main app), npm (api-server), pnpm (payroll-employees)
- **Backend is stable and deployed** - avoid suggesting backend redeployment without explicit user request
- When suggesting commands, prefer the high-level scripts (`.bat`, `.ps1`) over manual steps
- **Always respect the data source constraint**: never generate fake payroll data, always query `historico_nominas_gsau`
- **Current production API URL**: `https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com`

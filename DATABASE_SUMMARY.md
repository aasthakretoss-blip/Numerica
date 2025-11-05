# 📊 RESUMEN COMPLETO DE BASES DE DATOS EN AWS RDS

## 🏢 INSTANCIA RDS
- **Host:** gsaudb.cgt6iqqkqla7.us-east-1.rds.amazonaws.com:5432
- **Versión PostgreSQL:** 17.4 (aarch64-unknown-linux-gnu)
- **Usuario:** postgres

---

## 🗄️ BASES DE DATOS DISPONIBLES

### 1. **DATABASE: `postgres`** (37 MB)
**Descripción:** Base de datos principal con datos de empleados y nóminas activas

#### 📋 TABLAS:

**A. `employees` (10 registros)**
```sql
-- Empleados activos del sistema
- id: uuid (PK)
- first_name: text NOT NULL
- last_name: text NOT NULL  
- email: text NOT NULL UNIQUE
- phone: text
- department: text NOT NULL
- role: text NOT NULL
- location: text
- status: text NOT NULL
- hire_date: timestamp with time zone
- tags: ARRAY
- avatar_url: text
```

**B. `payroll_data` (51,000 registros)** ⭐
```sql
-- Datos históricos de nómina
- id: integer (PK)
- rfc: text NOT NULL
- mes: text NOT NULL
- claveEmpresa: text
- claveTrabajador: text
- nombreCompleto: text NOT NULL
- puesto: text
- puestoCategorizado: text
- curp: text
- fechaAntiguedad: text
- fechaBaja: text
- status: text
- empresa: text
- tiposNomina: text
- destno: text
- periodicidad: text
- mes2: text
- sd: double precision
- sdi: double precision
- sueldoCliente: double precision NOT NULL DEFAULT 0
- comisionesCliente: double precision NOT NULL DEFAULT 0
- ptu: double precision NOT NULL DEFAULT 0
- totalPercepciones: double precision NOT NULL DEFAULT 0
- totalDeducciones: double precision NOT NULL DEFAULT 0
- netoAntesVales: double precision NOT NULL DEFAULT 0
- netoDespuesVales: double precision NOT NULL DEFAULT 0
- cargaSocial: double precision NOT NULL DEFAULT 0
- uploadBatch: text
- dataHash: text
- createdAt: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- updatedAt: timestamp without time zone NOT NULL
```

**C. `fondos_data` (0 registros)**
```sql
-- Datos de fondos de empleados
- id: integer (PK)
- cvecia: text
- cvetno: text
- cvetra: text
- numrfc: text NOT NULL
- centroSucursal: text NOT NULL
- descripcionCvecia: text
- descripcionCvetno: text
- nombre: text NOT NULL
- fecpla: text
- fecalt: text
- fecant: text
- fecbaj: text
- status: text
- observaciones: text
- antiguedadEnFondo: text
- saldoInicial: double precision
- aportacionAlFideicomiso: double precision
- interesesFideicomiso: double precision
- cargosFideicomiso: double precision
- interesesPorPrestamos: double precision
- entregaDeFondos: double precision
- saldoBajas: double precision
- gr: double precision
- saldoFinal: double precision
- sdi: double precision
- aportacionInicial: double precision
- aportacionesATFPL: double precision
- interesesATFPL: double precision
- retiros: double precision
- aportacionesFinal: double precision
- ajuste: double precision
- uploadBatch: text
- dataHash: text
- createdAt: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- updatedAt: timestamp without time zone NOT NULL
```

**D. Tablas de Control:**
- `data_integrity` (0 registros) - Control de integridad de datos
- `upload_logs` (0 registros) - Logs de carga de archivos
- `fondos_upload_logs` (0 registros) - Logs específicos para fondos
- `_prisma_migrations` (1 registro) - Control de migraciones

---

### 2. **DATABASE: `GSAUDB`** (8.1 MB)
**Descripción:** Base de datos histórica para análisis y reportes

#### 📋 TABLAS:

**A. `historico_nominas_gsau` (0 registros)**
```sql
-- Histórico de nóminas para GSAU
- RFC: text (PK)
- Nombre completo: text
- Puesto: text
- Compañía: text
- Sucursal: text
- cvecia: text
- cvetno: text
- Localidad: text
- Periodicidad: text
- Clave trabajador: text
- CURP: text
- Sexo: text
- Número IMSS: text
- Antigüedad en FPL: date
- Fecha antigüedad: date
- Fecha baja: date
- Status: text
- Mes: text
- cveper: date
- Periodo: text
- tipo: text
- SDI: numeric(10,2)
- SD: numeric(10,2)
- SUELDO CLIENTE: numeric(10,2)
- SUELDO: numeric(10,2)
- COMISIONES CLIENTE: numeric(10,2)
- TOTAL DE PERCEPCIONES: numeric(10,2)
- TOTAL DEDUCCIONES: numeric(10,2)
- NETO ANTES DE VALES: numeric(10,2)
- NETO A PAGAR: numeric(10,2)
- COSTO DE NOMINA: numeric(10,2)
- TOTAL A FACTURAR: numeric(10,2)
- PTU: numeric(10,2)
```

**B. `historico_fondos_gsau` (0 registros)**
```sql
-- Histórico de fondos para GSAU
- numrfc: text (PK)
- nombre: text
- cvecia: text
- descripcion_cvecia: text
- cvetno: text
- descripcion_cvetno: text
- cvetra: text
- fecpla: text
- fecalt: text
- fecant: text
- fecbaj: text
- status: text
- observaciones: text
- antiguedad_en_fondo: text
- saldo_inicial: numeric(10,2)
- saldo_final: numeric(10,2)
```

**C. `vista_unificada` (0 registros)**
```sql
-- Vista unificada de datos combinados
- origen_principal: text (PK)
- rfc: text (PK)
- nombre_completo: text
- saldo_inicial: numeric(10,2)
- saldo_final: numeric(10,2)
- antiguedad_en_fondo: text
- Puesto: text
- CURP: text
- SUELDO: numeric(10,2)
- TOTAL DE PERCEPCIONES: numeric(10,2)
```

**D. Tablas de Control:**
- `_prisma_migrations` (2 registros) - Control de migraciones

---

## 📊 ESTADÍSTICAS GENERALES

### Distribución de Datos:
- **Total de registros activos:** ~51,010
- **Base de datos principal:** `postgres` (37 MB)
- **Base de datos histórica:** `GSAUDB` (8.1 MB)
- **Tablas con datos:** 2/11 tablas totales

### Tipos de Datos:
1. **Empleados Actuales:** 10 registros en `employees`
2. **Datos de Nómina:** 51,000 registros históricos en `payroll_data`
3. **Datos de Fondos:** Estructuras creadas pero sin datos
4. **Datos Históricos GSAU:** Estructuras creadas pero sin datos

---

## 🔧 CONFIGURACIÓN DEL SERVIDOR

### Memoria y Conexiones:
- **Conexiones máximas:** 79
- **Memoria compartida:** 230.8 MB
- **Memoria de trabajo:** 4 MB
- **Memoria de mantenimiento:** 64 MB

### Performance:
- **Cache efectivo:** 461.7 MB
- **Timeout de checkpoint:** 300s
- **Buffers WAL:** 7.2 MB

---

## 🚀 ESTADO ACTUAL

### ✅ Funcionando:
- Conexión a ambas bases de datos
- API local corriendo en puerto 3001
- Frontend React consumiendo datos reales
- Transformación de datos Employee → PayrollData

### 📝 Pendiente:
- Cargar datos en tablas de fondos
- Poblar base de datos GSAUDB
- Implementar sincronización entre bases
- Optimizar consultas para 51k registros

---

## 🔗 ENDPOINTS DISPONIBLES

### API Local (Puerto 3001):
```
GET /api/employees           - Lista empleados con filtros
GET /api/employees/:id       - Detalles de empleado específico
GET /health                  - Status del API
```

### Conexiones:
```
PostgreSQL: gsaudb.cgt6iqqkqla7.us-east-1.rds.amazonaws.com:5432
Usuario: postgres
SSL: Habilitado
```

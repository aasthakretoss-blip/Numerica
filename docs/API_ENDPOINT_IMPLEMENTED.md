# Endpoint Backend Implementado para PayrollDataViewer

**Estado**: ✅ **IMPLEMENTADO**

El componente `PayrollDataViewer` utiliza el siguiente endpoint backend que ya está implementado y funcionando:

## Endpoint

### GET `/api/payroll/employee-data`

Obtiene los datos completos de nómina de un empleado específico, estructurados para su visualización en el componente PayrollDataViewer.

## Parámetros de Query

- **curp** (string, requerido): CURP del empleado
- **cveper** (string, opcional): Período específico a consultar. Soporta formatos:
  - `YYYY-MM-DD` (fecha exacta)
  - `YYYY-MM` (mes completo)  
  - Valor exacto de cveper

## Respuesta Exitosa (200)

```json
{
  "success": true,
  "data": {
    "identification": {
      "curp": "AEMB930330MDFBGR07",
      "nombre": "MIGUEL ANGEL",
      "apellidos": "EJEMPLO MARTINEZ",
      "numeroEmpleado": "12345",
      "puesto": "ANALISTA",
      "compania": "EMPRESA XYZ",
      "sucursal": "SUCURSAL CENTRO",
      "periodo": "2025-06-30"
    },
    "percepciones": [
      {
        "concepto": "Sueldo Base",
        "monto": 15000.00,
        "codigo": "SUELDO_BASE"
      },
      {
        "concepto": "Prima Vacacional", 
        "monto": 2500.00,
        "codigo": "PRIMA_VACACIONAL"
      }
    ],
    "deducciones": [
      {
        "concepto": "Imss",
        "monto": 850.00,
        "codigo": "IMSS"
      },
      {
        "concepto": "Isr",
        "monto": 1200.00,
        "codigo": "ISR"
      }
    ],
    "totales": {
      "totalPercepciones": 17500.00,
      "totalDeducciones": 2050.00,
      "netoAPagar": 15450.00
    }
  }
}
```

## Respuesta Sin Datos (200)

```json
{
  "success": true,
  "data": null,
  "message": "No se encontraron datos para CURP AEMB930330MDFBGR07 en el período 2025-06"
}
```

## Respuesta de Error (400/500)

```json
{
  "success": false,
  "error": "CURP es requerido"
}
```

## Implementación

El endpoint está implementado en `api-server/server.js` líneas 662-829 y:

1. **Consulta directamente** la base de datos `historico_nominas_gsau`
2. **Clasifica automáticamente** campos como percepciones o deducciones según patrones:
   - **Percepciones**: PERCEP*, SUELDO*, SALARIO*, BONO*, PRIMA*, AGUINALDO*, etc.
   - **Deducciones**: DEDUCC*, IMSS*, ISR*, PENSION*, PRESTAMO*, DESCUENTO*, etc.
3. **Calcula totales** automáticamente
4. **Respeta la regla de datos reales** - no usa datos simulados

## Patrones de Clasificación

### Percepciones (valores > 0)
- Campos que contienen: `PERCEP`, `SUELDO`, `SALARIO`, `BONO`, `PRIMA`, `AGUINALDO`, `VACACION`, `OVERTIME`, `EXTRA`

### Deducciones (valores > 0)  
- Campos que contienen: `DEDUCC`, `IMSS`, `ISSSTE`, `ISR`, `PENSION`, `PRESTAMO`, `DESCUENTO`, `RETENCION`

## Ejemplos de Uso

### Obtener datos del empleado actual
```javascript
// En el contexto del componente PayrollDataViewer
const response = await fetch(
  `/api/payroll/employee-data?curp=${currentCURP}&cveper=${currentPeriod}`
);
const result = await response.json();
```

### Solo por CURP (período más reciente)
```javascript
const response = await fetch(`/api/payroll/employee-data?curp=AEMB930330MDFBGR07`);
```

### Por CURP y mes específico
```javascript
const response = await fetch(`/api/payroll/employee-data?curp=AEMB930330MDFBGR07&cveper=2025-06`);
```

## Estado del Componente

El componente `PayrollDataViewer` ahora funciona completamente:
- ✅ Obtiene datos reales de la base `historico_nominas_gsau`
- ✅ Muestra secciones de Identificación, Percepciones y Deducciones
- ✅ Se actualiza al cambiar el período en el dropdown
- ✅ Maneja estados de carga y error apropiadamente
- ✅ Diseño responsivo y profesional

## Archivo de Implementación

- **Endpoint**: `api-server/server.js` (líneas 662-829)
- **Componente**: `src/components/profile/PayrollDataViewer.jsx`
- **Subcomponentes**: 
  - `src/components/profile/IdentificacionSection.jsx`
  - `src/components/profile/PercepcionesSection.jsx` 
  - `src/components/profile/DeduccionesSection.jsx`

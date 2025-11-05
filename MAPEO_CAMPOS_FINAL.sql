-- ============================================================================
-- MAPEO FINAL DE CAMPOS ENTRE postgres.payroll_data Y GSAUDB.historico_nominas_gsau
-- Generado después de análisis exhaustivo con espacios y similitudes
-- ============================================================================

-- 📋 CAMPOS DISPONIBLES EN GSAUDB (Con datos reales)
-- ===================================================

-- ✅ CONSULTA FUNCIONAL INMEDIATA
SELECT 
    "RFC" as rfc,                           -- ✅ DISPONIBLE
    "Mes" as mes,                           -- ✅ DISPONIBLE
    "Nombre completo" as nombreCompleto,    -- ✅ DISPONIBLE
    "Compañía" as empresa,                  -- ✅ DISPONIBLE
    "Puesto" as puesto,                     -- ✅ DISPONIBLE
    "CURP" as curp,                         -- ✅ DISPONIBLE
    "Status" as status,                     -- ✅ DISPONIBLE
    " SUELDO CLIENTE " as sueldoCliente,    -- ✅ DISPONIBLE (nota los espacios)
    " COMISIONES CLIENTE " as comisionesCliente, -- ✅ DISPONIBLE
    " TOTAL DE PERCEPCIONES " as totalPercepciones, -- ✅ DISPONIBLE
    "Periodicidad" as periodicidad,         -- ✅ DISPONIBLE
    "cveper" as cveper                      -- ✅ DISPONIBLE
FROM historico_nominas_gsau
WHERE "RFC" IS NOT NULL
ORDER BY "Mes", "RFC";

-- ⚠️ CAMPOS QUE EXISTEN PERO ESTÁN VACÍOS (0 registros con datos)
-- ================================================================

/*
Estos campos EXISTEN en la estructura pero están completamente vacíos:

" SD "                    -> sd (postgres)
" SDI "                   -> sdi (postgres)  
" SUELDO "                -> Campo directo pero vacío
" TOTAL DEDUCCIONES "     -> totalDeducciones (postgres)
" NETO ANTES DE VALES "   -> netoAntesVales (postgres)
" NETO A PAGAR "          -> netoDespuesVales (postgres)
" COSTO DE NOMINA "       -> cargaSocial (postgres) - EQUIVALENTE
" TOTAL A FACTURAR "      -> Campo directo pero vacío
"PTU"                     -> ptu (postgres)
"Fecha antigüedad"        -> fechaAntiguedad (postgres)
"Fecha baja"              -> fechaBaja (postgres)
"Clave trabajador"        -> claveTrabajador (postgres)
"Sucursal"                -> Campo directo pero vacío
"Localidad"               -> Campo directo pero vacío
"Sexo"                    -> Campo directo pero vacío
"Número IMSS"             -> Campo directo pero vacío
*/

-- ❌ CAMPOS COMPLETAMENTE AUSENTES EN GSAUDB
-- ===========================================

/*
Estos campos de postgres NO existen en GSAUDB:

cargaSocial       -> NO EXISTE (usar " COSTO DE NOMINA " como equivalente)
uploadBatch       -> NO EXISTE
dataHash          -> NO EXISTE
createdAt         -> NO EXISTE
updatedAt         -> NO EXISTE
puestoCategorizado -> NO EXISTE
claveEmpresa      -> NO EXISTE
tiposNomina       -> NO EXISTE
*/

-- 🔄 SCRIPT PARA VERIFICAR CAMPOS ESPECÍFICOS
-- ============================================

-- Verificar existencia y datos de campos críticos
SELECT 
    'RFC' as campo,
    COUNT(*) as total_registros,
    COUNT("RFC") as registros_no_null,
    COUNT(CASE WHEN "RFC" IS NOT NULL AND "RFC" != '' THEN 1 END) as registros_con_datos
FROM historico_nominas_gsau

UNION ALL

SELECT 
    'SDI',
    COUNT(*) as total_registros,
    COUNT(" SDI ") as registros_no_null,
    COUNT(CASE WHEN " SDI " > 0 THEN 1 END) as registros_con_datos
FROM historico_nominas_gsau

UNION ALL

SELECT 
    'SD',
    COUNT(*) as total_registros,
    COUNT(" SD ") as registros_no_null,
    COUNT(CASE WHEN " SD " > 0 THEN 1 END) as registros_con_datos
FROM historico_nominas_gsau

UNION ALL

SELECT 
    'SUELDO CLIENTE',
    COUNT(*) as total_registros,
    COUNT(" SUELDO CLIENTE ") as registros_no_null,
    COUNT(CASE WHEN " SUELDO CLIENTE " > 0 THEN 1 END) as registros_con_datos
FROM historico_nominas_gsau;

-- 💡 RECOMENDACIONES DE USO
-- =========================

/*
1. CONSULTAS INMEDIATAS:
   - Usar solo los 12 campos que tienen datos disponibles
   - Recordar usar espacios exactos: " SUELDO CLIENTE " NO "SUELDO CLIENTE"

2. PARA CAMPOS FALTANTES:
   - sd, sdi, totalDeducciones, etc: Usar postgres.payroll_data
   - cargaSocial: postgres.payroll_data.cargaSocial

3. MIGRACIÓN:
   - Ejecutar scripts/migration_script.sql para llenar campos vacíos
   - 500 registros en GSAUDB vs 51,000+ en postgres - migración necesaria

4. MAPEO BACKEND:
   Campo Postgres          Campo GSAUDB                Estado
   -------------           ----------------            --------
   rfc                 ->  "RFC"                       ✅ OK
   mes                 ->  "Mes"                       ✅ OK  
   sueldoCliente       ->  " SUELDO CLIENTE "          ✅ OK
   sd                  ->  " SD "                      ⚠️ VACÍO
   sdi                 ->  " SDI "                     ⚠️ VACÍO
   totalDeducciones    ->  " TOTAL DEDUCCIONES "       ⚠️ VACÍO
   cargaSocial         ->  ❌ NO EXISTE (usar postgres)
*/

-- 🎯 QUERY DE PRUEBA FINAL
-- ========================

-- Esta query debe funcionar y devolver datos reales:
SELECT 
    COUNT(*) as total_registros_con_datos,
    COUNT(DISTINCT "RFC") as empleados_unicos,
    COUNT(DISTINCT "Mes") as meses_unicos,
    MIN(" SUELDO CLIENTE ") as sueldo_minimo,
    MAX(" SUELDO CLIENTE ") as sueldo_maximo,
    AVG(" SUELDO CLIENTE ") as sueldo_promedio
FROM historico_nominas_gsau
WHERE " SUELDO CLIENTE " > 0;

-- QUERIES CORREGIDAS PARA USAR CURP CONSISTENTEMENTE
-- Fecha: 2025-09-05 09:20:48
-- Propósito: Reemplazar todas las referencias a RFC por CURP

-- 1. QUERY PRINCIPAL PARA DASHBOARD (usando CURP)
SELECT 
    "CURP" as curp,
    "Nombre completo" as nombre_completo,
    "Mes" as mes,
    " VALES DESPENSA NETO " as vales_despensa_neto,
    " BONO " as bono,
    " AGUINALDO " as aguinaldo,
    " GRATIFICACION " as gratificacion,
    " PRIMA VACACIONAL " as prima_vacacional,
    " COMPENSACION " as compensacion,
    " SEPTIMO DIA " as septimo_dia,
    " HORAS EXTRA DOBLE " as horas_extra_doble,
    " SUBSIDIO AL EMPLEO " as subsidio_al_empleo,
    " SUELDO X DIAS AC VACACIONES " as sueldo_x_dias_vacaciones,
    " VACACIONES FINIQUITO " as vacaciones_finiquito
FROM historico_nominas_gsau
WHERE "CURP" = $1 AND "Mes" = $2;

-- 2. QUERY PARA BÚSQUEDA DE EMPLEADOS (usando CURP)
SELECT 
    "CURP" as curp,
    "Nombre completo" as nombre,
    "Puesto" as puesto,
    "Compañía" as sucursal,
    "Mes" as mes,
    COALESCE(" SUELDO CLIENTE ", 0) as sueldo,
    "Status" as status
FROM historico_nominas_gsau
WHERE ("Nombre completo" ILIKE $1 OR "CURP" ILIKE $1)
ORDER BY "Nombre completo" ASC
LIMIT $2 OFFSET $3;

-- 3. QUERY PARA CONTEO DE EMPLEADOS ÚNICOS (usando CURP)
SELECT COUNT(DISTINCT "CURP") as unique_count
FROM historico_nominas_gsau
WHERE "CURP" IS NOT NULL AND "CURP" != '';

-- 4. QUERY PARA VERIFICAR DATOS DE EMPLEADO ESPECÍFICO (usando CURP)
SELECT *
FROM historico_nominas_gsau 
WHERE "CURP" = $1
ORDER BY cveper DESC;

-- 5. QUERY PARA DASHBOARD CON FILTROS AVANZADOS (usando CURP)
SELECT 
    "CURP" as curp,
    "Nombre completo" as nombre,
    "Puesto" as puesto,
    "Compañía" as sucursal,
    DATE(cveper)::text as periodo,
    " VALES DESPENSA NETO " as vales_despensa,
    " BONO " as bono,
    " AGUINALDO " as aguinaldo,
    " PRIMA VACACIONAL " as prima_vacacional
FROM historico_nominas_gsau
WHERE 1=1
  AND ("Nombre completo" ILIKE $1 OR "CURP" ILIKE $1)
  AND "CURP" IS NOT NULL
ORDER BY "Nombre completo", cveper DESC;

-- NOTAS IMPORTANTES:
-- * Todos los filtros y búsquedas ahora usan CURP en lugar de RFC
-- * El campo RFC sigue existiendo en la base de datos pero no se usa para identificación
-- * CURP es más confiable ya que tiene 3,057 valores únicos vs 3,050 de RFC
-- * Esto asegura que se capturen todos los empleados correctamente

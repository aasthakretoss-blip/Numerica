-- QUERIES CORREGIDAS PARA DASHBOARD USANDO CURP
-- Base: Historic.historico_nominas_gsau


-- QUERY CORREGIDA PARA DASHBOARD (usando CURP)
SELECT 
    "CURP" as curp,
    "RFC" as rfc,
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
WHERE "CURP" = :curp AND "Mes" = :mes;


-- Query individual por campo:

-- VALES DESPENSA NETO
SELECT " VALES DESPENSA NETO " FROM historico_nominas_gsau WHERE "CURP" = :curp AND "Mes" = :mes;

-- BONO
SELECT " BONO " FROM historico_nominas_gsau WHERE "CURP" = :curp AND "Mes" = :mes;

-- AGUINALDO
SELECT " AGUINALDO " FROM historico_nominas_gsau WHERE "CURP" = :curp AND "Mes" = :mes;

-- GRATIFICACION
SELECT " GRATIFICACION " FROM historico_nominas_gsau WHERE "CURP" = :curp AND "Mes" = :mes;

-- PRIMA VACACIONAL
SELECT " PRIMA VACACIONAL " FROM historico_nominas_gsau WHERE "CURP" = :curp AND "Mes" = :mes;

-- COMPENSACION
SELECT " COMPENSACION " FROM historico_nominas_gsau WHERE "CURP" = :curp AND "Mes" = :mes;

-- SEPTIMO DIA
SELECT " SEPTIMO DIA " FROM historico_nominas_gsau WHERE "CURP" = :curp AND "Mes" = :mes;

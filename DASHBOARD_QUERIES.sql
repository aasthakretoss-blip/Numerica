-- QUERIES ESPECÍFICAS PARA DASHBOARD PERFIL EMPLEADO
-- Base: Historic.historico_nominas_gsau

-- QUERY COMPLETA PARA DASHBOARD
SELECT 
    "RFC" as rfc,
    "Nombre completo" as nombre_completo,
    "Mes" as mes,
    " VALES DESPENSA NETO " as vales_despensa_neto,
    " VALES DESPENSA PENSION ALIMENT " as vales_despensa_pensión_alimenticia,
    " BONO " as bono,
    " DIA FESTIVO TRABAJADO " as día_festivo_trabajado,
    " SUELDO X DIAS AC VACACIONES " as sueldo_x_días_acumulados_vacaciones,
    " PRIMA VACACIONAL " as prima_vacacional,
    " AGUINALDO " as aguinaldo,
    " GRATIFICACION " as gratificación,
    " COMPENSACION " as compensación,
    " PRIMA DOMINICAL " as prima_dominical,
    " PAGO POR SEPARACION " as pago_por_separación,
    " VACACIONES PENDIENTES " as vacaciones_pendientes,
    " VACACIONES FINIQUITO " as vacaciones_finiquito,
    " SUBSIDIO POR INCAPACIDAD " as subsidio_por_incapacidad,
    " SUBSIDIO AL EMPLEO " as subsidio_al_empleo,
    " HORAS EXTRA DOBLE " as horas_extra_doble,
    " HORAS EXTRA DOBLE3 " as horas_extra_doble3,
    " HORAS EXTRA TRIPLE " as horas_extra_triple,
    " SEPTIMO DIA " as séptimo_día
FROM historico_nominas_gsau
WHERE "RFC" = :rfc AND "Mes" = :mes;

-- VALES DESPENSA NETO
SELECT " VALES DESPENSA NETO " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;

-- VALES DESPENSA PENSIÓN ALIMENTICIA
SELECT " VALES DESPENSA PENSION ALIMENT " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;

-- BONO
SELECT " BONO " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;

-- DÍA FESTIVO TRABAJADO
SELECT " DIA FESTIVO TRABAJADO " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;

-- SUELDO X DÍAS ACUMULADOS VACACIONES
SELECT " SUELDO X DIAS AC VACACIONES " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;

-- PRIMA VACACIONAL
SELECT " PRIMA VACACIONAL " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;

-- AGUINALDO
SELECT " AGUINALDO " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;

-- GRATIFICACIÓN
SELECT " GRATIFICACION " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;

-- COMPENSACIÓN
SELECT " COMPENSACION " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;

-- PRIMA DOMINICAL
SELECT " PRIMA DOMINICAL " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;

-- PAGO POR SEPARACIÓN
SELECT " PAGO POR SEPARACION " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;

-- VACACIONES PENDIENTES
SELECT " VACACIONES PENDIENTES " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;

-- VACACIONES FINIQUITO
SELECT " VACACIONES FINIQUITO " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;

-- SUBSIDIO POR INCAPACIDAD
SELECT " SUBSIDIO POR INCAPACIDAD " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;

-- SUBSIDIO AL EMPLEO
SELECT " SUBSIDIO AL EMPLEO " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;

-- HORAS EXTRA DOBLE
SELECT " HORAS EXTRA DOBLE " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;

-- HORAS EXTRA DOBLE3
SELECT " HORAS EXTRA DOBLE3 " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;

-- HORAS EXTRA TRIPLE
SELECT " HORAS EXTRA TRIPLE " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;

-- SÉPTIMO DÍA
SELECT " SEPTIMO DIA " FROM historico_nominas_gsau WHERE "RFC" = :rfc AND "Mes" = :mes;


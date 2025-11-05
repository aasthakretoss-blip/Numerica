-- QUERIES PARA PERFIL DE EMPLEADO
-- Generado automáticamente desde Historic.historico_nominas_gsau
-- 104 campos analizados

-- PERFIL_BASICO

-- PERFIL BÁSICO DE EMPLEADO
SELECT 
    "Nombre completo" as nombreCompleto,    
"RFC" as rfc,    
"CURP" as curp,    
"Sexo" as sexo,    
"Número IMSS" as numeroIMSS,    
" IMSS PATRONAL " as imssPatronal,    
" DESCUENTO IMSS " as descuentoImss,    
"Compañía" as empresa,    
"Sucursal" as sucursal,    
"Periodicidad" as periodicidad
FROM historico_nominas_gsau
WHERE "RFC" IS NOT NULL
ORDER BY "RFC", "Mes";


-- NOMINA_COMPLETA

-- DATOS COMPLETOS DE NÓMINA
SELECT 
    "RFC" as rfc,
    "Mes" as mes,
    " SDI " as sdi,    
" sdi_es " as sdies,    
" sdim " as sdim,    
" SUELDO CLIENTE " as sueldoCliente,    
" SUELDO " as sueldo,    
" COMISIONES CLIENTE " as comisionesCliente,    
" COMISIONES FACTURADAS " as comisionesFacturadas,    
" BONO " as bono,    
" COMISIONES " as comisiones,    
" SUELDO X DIAS AC VACACIONES " as sueldoXDiasAcVacaciones,    
" DIAS PENDIENTES POR INGRESO " as diasPendientesPorIngreso,    
" TOTAL DE PERCEPCIONES " as totalDePercepciones,    
" VALES DESPENSA NETO " as valesDespensaNeto,    
" NETO ANTES DE VALES " as netoAntesDeVales,    
" NETO A PAGAR " as netoAPagar
FROM historico_nominas_gsau
WHERE "RFC" = :rfc AND "Mes" = :mes;



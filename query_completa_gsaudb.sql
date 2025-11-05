
-- SQL COMPLETO PARA historico_nominas_gsau
-- Generado automáticamente con todos los campos disponibles

SELECT 
    -- Campos mapeados de postgres
    "RFC" as rfc,    
"Mes" as mes,    
"Nombre completo" as nombreCompleto,    
"Compañía" as empresa,    
"Puesto" as puesto,    
"CURP" as curp,    
"Status" as status,    
" SUELDO CLIENTE " as sueldoCliente,    
" COMISIONES CLIENTE " as comisionesCliente,    
" TOTAL DE PERCEPCIONES " as totalPercepciones,    
"Periodicidad" as periodicidad,
    
    -- Campos adicionales disponibles
    "cveper" as cveper
    
FROM historico_nominas_gsau
WHERE "RFC" IS NOT NULL
    AND "Mes" IS NOT NULL
ORDER BY "Mes", "RFC"
LIMIT 10;

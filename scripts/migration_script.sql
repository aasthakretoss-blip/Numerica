
-- Script de migración de datos desde postgres.payroll_data a GSAUDB.historico_nominas_gsau
-- Generado automáticamente el 2025-09-01 09:05:43

-- 1. Limpiar tabla destino (opcional)
-- TRUNCATE TABLE historico_nominas_gsau;

-- 2. Insertar datos desde postgres (requiere dblink o conexión externa)
-- Esta query asume que tienes acceso a ambas bases de datos desde GSAUDB

INSERT INTO historico_nominas_gsau (
    "RFC",
    "Nombre completo", 
    "Puesto",
    "Compañía",
    "CURP",
    "Mes",
    "SD",
    "SDI", 
    "SUELDO CLIENTE",
    "COMISIONES CLIENTE",
    "TOTAL DE PERCEPCIONES",
    "TOTAL DEDUCCIONES",
    "NETO ANTES DE VALES",
    "NETO A PAGAR",
    "PTU"
)
SELECT 
    rfc as "RFC",
    nombreCompleto as "Nombre completo",
    puesto as "Puesto", 
    empresa as "Compañía",
    curp as "CURP",
    mes as "Mes",
    CAST(sd AS numeric(10,2)) as "SD",
    CAST(sdi AS numeric(10,2)) as "SDI",
    CAST(sueldoCliente AS numeric(10,2)) as "SUELDO CLIENTE",
    CAST(comisionesCliente AS numeric(10,2)) as "COMISIONES CLIENTE", 
    CAST(totalPercepciones AS numeric(10,2)) as "TOTAL DE PERCEPCIONES",
    CAST(totalDeducciones AS numeric(10,2)) as "TOTAL DEDUCCIONES",
    CAST(netoAntesVales AS numeric(10,2)) as "NETO ANTES DE VALES",
    CAST(netoDespuesVales AS numeric(10,2)) as "NETO A PAGAR",
    CAST(ptu AS numeric(10,2)) as "PTU"
FROM postgres.payroll_data
WHERE rfc IS NOT NULL 
    AND nombreCompleto IS NOT NULL;

-- 3. Verificar migración
SELECT COUNT(*) as registros_migrados FROM historico_nominas_gsau;

-- 4. Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_historico_nominas_rfc ON historico_nominas_gsau("RFC");
CREATE INDEX IF NOT EXISTS idx_historico_nominas_mes ON historico_nominas_gsau("Mes");
CREATE INDEX IF NOT EXISTS idx_historico_nominas_empresa ON historico_nominas_gsau("Compañía");

import React from "react";
import styled from "styled-components";

const SectionContainer = styled.div`
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h3`
  color: var(--brand-primary);
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FieldsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  @media (min-width: 768px) and (max-width: 1199px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1200px) and (max-width: 1599px) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (min-width: 1600px) and (max-width: 1999px) {
    grid-template-columns: repeat(5, 1fr);
  }

  @media (min-width: 2000px) {
    grid-template-columns: repeat(6, 1fr);
  }
`;

const FieldCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid #410e0e82;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
`;

const FieldLabel = styled.div`
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
  min-width: 120px;

  @media (max-width: 768px) {
    min-width: 100px;
    font-size: 0.75rem;
  }
`;

const FieldValue = styled.div`
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 600;
  text-align: right;
  flex: 1;
  margin-left: 1rem;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const PercepcionesAdicionalesSection = ({ data, loading }) => {
  const formatValue = (value) => {
    if (loading) return "Cargando...";
    if (value === null || value === undefined || value === "") return "No disponible";
    return value.toString();
  };

  const formatCurrency = (value) => {
    if (loading) return "Cargando...";
    if (value === null || value === undefined || value === "") return "$0.00";
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return "$0.00";
    return (
      "$" +
      numValue.toLocaleString("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const formatDays = (value) => {
    if (loading) return "Cargando...";
    if (value === null || value === undefined || value === "") return "0 días";
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return "0 días";
    return numValue + " días";
  };

  // ✅ MAPEO CORREGIDO: Usar campos disponibles del backend + placeholders para campos faltantes
  const fields = [
    // ✅ Campos disponibles en el backend actual (corregidos para coincidir con BusquedaEmpleados):
    // { key: 'sueldo', label: 'Sueldo', dbField: 'salario', isCurrency: true },
    // { key: 'comisiones', label: 'Comisiones', dbField: 'comisiones', isCurrency: true },
    // { key: 'bono', label: 'Bono', dbField: ' BONO ', isCurrency: true },
    {
      key: "destajoInformado",
      label: "Destajo informado",
      dbField: "destajo_informado",
      isCurrency: true,
    },
    {
      key: "premioPuntualidad",
      label: "Premio puntualidad",
      dbField: "premio_puntualidad",
      isCurrency: true,
    },
    {
      key: "premioAsistencia",
      label: "Premio asistencia",
      dbField: "premio_asistencia",
      isCurrency: true,
    },
    {
      key: "valesDespensa",
      label: "Vales de despensa",
      dbField: "vales_despensa",
      isCurrency: true,
    },
    {
      key: "descuentoIndebido",
      label: "Descuento indebido",
      dbField: "descuento_indebido",
      isCurrency: true,
    },
    {
      key: "diaFestivoTrabajado",
      label: "Día festivo trabajado",
      dbField: "dia_festivo_trabajado",
      isCurrency: true,
    },
    {
      key: "sueldoDiasVacaciones",
      label: "Sueldo x días AC vacaciones",
      dbField: "sueldo_vacaciones",
      isCurrency: true,
    },
    {
      key: "primaVacacional",
      label: "Prima vacacional",
      dbField: "prima_vacacional",
      isCurrency: true,
    },
    {
      key: "primaDominical",
      label: "Prima dominical",
      dbField: "prima_dominical",
      isCurrency: true,
    },
    {
      key: "primaAntiguedad",
      label: "Prima de antigüedad",
      dbField: "prima_antiguedad",
      isCurrency: true,
    },
    {
      key: "pagoSeparacion",
      label: "Pago por separación",
      dbField: "pago_separacion",
      isCurrency: true,
    },
    {
      key: "vacacionesPendientes",
      label: "Vacaciones pendientes",
      dbField: "vacaciones_pendientes",
      isCurrency: true,
    },
    {
      key: "subsidioIncapacidad",
      label: "Subsidio por incapacidad",
      dbField: "subsidio_incapacidad",
      isCurrency: true,
    },
    {
      key: "subsidioEmpleo",
      label: "Subsidio al empleo",
      dbField: "subsidio_empleo",
      isCurrency: true,
    },
    {
      key: "destajo",
      label: "Destajo",
      dbField: "destajo",
      isCurrency: true,
    },
    {
      key: "horasExtraDoble",
      label: "Horas extra doble",
      dbField: "horas_extra_doble",
      isCurrency: true,
    },
    {
      key: "horas_extra_doble3",
      label: "Horas extra doble 2",
      dbField: "horas_extra_doble3",
      isCurrency: true,
    },
    {
      key: "horasExtraTriple",
      label: "Horas extra triple",
      dbField: "horas_extra_triple",
      isCurrency: true,
    },
    {
      key: "diasPromedio",
      label: "Dias promedio",
      dbField: "dias_promedio",
      isCurrency: true,
    },
    {
      key: "diasPendientesPorIngreso",
      label: "Dias pendientes por ingreso",
      dbField: "dias_pendientes_ingreso",
      isCurrency: true,
    },
    {
      key: "septimoDia",
      label: "Séptimo día",
      dbField: "septimo_dia",
      isCurrency: true,
    },
  ];

  return (
    <SectionContainer>
      <SectionTitle>Percepciones Adicionales</SectionTitle>
      <FieldsGrid>
        {fields.map(({ key, label, dbField, isCurrency, isDays }) => {
          let value;

          if (isCurrency) {
            value = formatCurrency(data?.[dbField]);
          } else if (isDays) {
            value = formatDays(data?.[dbField]);
          } else {
            value = formatValue(data?.[dbField]);
          }

          return (
            <FieldCard key={key}>
              <FieldLabel>{label}</FieldLabel>
              <FieldValue>{value}</FieldValue>
            </FieldCard>
          );
        })}
      </FieldsGrid>
    </SectionContainer>
  );
};

export default PercepcionesAdicionalesSection;

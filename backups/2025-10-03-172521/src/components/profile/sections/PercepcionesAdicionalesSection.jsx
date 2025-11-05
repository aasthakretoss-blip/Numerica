import React from 'react';
import styled from 'styled-components';

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
    if (loading) return 'Cargando...';
    if (value === null || value === undefined || value === '') return 'No disponible';
    return value.toString();
  };

  const formatCurrency = (value) => {
    if (loading) return 'Cargando...';
    if (value === null || value === undefined || value === '') return '$0.00';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '$0.00';
    return '$' + numValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDays = (value) => {
    if (loading) return 'Cargando...';
    if (value === null || value === undefined || value === '') return '0 días';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '0 días';
    return numValue + ' días';
  };

  // Mapeo de campos de la base de datos historico_nominas_gsau a nombres frontend
  const fields = [
    { key: 'destajoInformado', label: 'Destajo informado', dbField: ' DESTAJO INFORMADO ', isCurrency: true },
    { key: 'premioPuntualidad', label: 'Premio puntualidad', dbField: ' PREMIO PUNTUALIDAD ', isCurrency: true },
    { key: 'premioAsistencia', label: 'Premio asistencia', dbField: ' PREMIO ASISTENCIA ', isCurrency: true },
    { key: 'valesDespensa', label: 'Vales de despensa', dbField: ' VALES DE DESPENSA ', isCurrency: true },
    { key: 'descuentoIndebido', label: 'Descuento indebido', dbField: ' DESCUENTO INDEBIDO ', isCurrency: true, isNegative: true },
    { key: 'diaFestivoTrabajado', label: 'Día festivo trabajado', dbField: ' DIA FESTIVO TRABAJADO ', isCurrency: true },
    { key: 'sueldoDiasVacaciones', label: 'Sueldo por días de vacaciones', dbField: ' SUELDO X DIAS AC VACACIONES ', isCurrency: true },
    { key: 'primaVacacional', label: 'Prima vacacional', dbField: ' PRIMA VACACIONAL ', isCurrency: true },
    { key: 'primaDominical', label: 'Prima dominical', dbField: ' PRIMA DOMINICAL ', isCurrency: true },
    { key: 'primaAntiguedad', label: 'Prima de antigüedad', dbField: ' PRIMA DE ANTIGÜEDAD ', isCurrency: true },
    { key: 'pagoSeparacion', label: 'Pago por separación', dbField: ' PAGO POR SEPARACION ', isCurrency: true },
    { key: 'vacacionesPendientes', label: 'Vacaciones pendientes', dbField: ' VACACIONES PENDIENTES ', isCurrency: true },
    { key: 'subsidioIncapacidad', label: 'Subsidio por incapacidad', dbField: ' SUBSIDIO POR INCAPACIDAD ', isCurrency: true },
    { key: 'subsidioEmpleo', label: 'Subsidio al empleo', dbField: ' SUBSIDIO AL EMPLEO ', isCurrency: true },
    { key: 'destajo', label: 'Destajo', dbField: ' DESTAJO ', isCurrency: true },
    { key: 'horasExtraDoble', label: 'Horas extra doble', dbField: ' HORAS EXTRA DOBLE ', isCurrency: true },
    { key: 'horasExtraDoble2', label: 'Horas extra doble 2', dbField: ' HORAS EXTRA DOBLE3 ', isCurrency: true },
    { key: 'horasExtraTriple', label: 'Horas extra triple', dbField: ' HORAS EXTRA TRIPLE ', isCurrency: true },
    { key: 'diasPromedio', label: 'Días promedio', dbField: ' DIAS PROMEDIO ', isDays: true },
    { key: 'diasPendientesIngreso', label: 'Días pendientes por ingreso', dbField: ' DIAS PENDIENTES POR INGRESO ', isDays: true },
    { key: 'septimoDia', label: 'Séptimo día', dbField: ' SEPTIMO DIA ', isCurrency: true }
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
              <FieldValue>
                {value}
              </FieldValue>
            </FieldCard>
          );
        })}
      </FieldsGrid>
    </SectionContainer>
  );
};

export default PercepcionesAdicionalesSection;

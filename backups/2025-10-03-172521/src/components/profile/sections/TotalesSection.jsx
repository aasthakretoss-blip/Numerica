import React from 'react';
import styled from 'styled-components';

const SectionContainer = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.strong || 'blur(20px)'};
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.2)'};
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  color: ${props => props.theme?.brand?.primary || '#a8edea'};
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FieldsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const FieldLabel = styled.label`
  color: ${props => props.theme?.text?.muted || 'rgba(255, 255, 255, 0.7)'};
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FieldValue = styled.div`
  color: ${props => {
    if (props.$isHighlight) return props.theme?.brand?.primary || '#a8edea';
    return props.theme?.text?.secondary || 'rgba(255, 255, 255, 0.9)';
  }};
  font-size: ${props => props.$isHighlight ? '1rem' : '0.9rem'};
  font-weight: ${props => props.$isHighlight ? '700' : '600'};
  background: ${props => {
    if (props.$isHighlight) return props.theme?.surfaces?.glass?.light || 'rgba(168, 237, 234, 0.1)';
    return props.theme?.surfaces?.dark?.subtle || 'rgba(0, 0, 0, 0.1)';
  }};
  padding: ${props => props.$isHighlight ? '0.75rem' : '0.5rem 0.75rem'};
  border-radius: 8px;
  border: 1px solid ${props => {
    if (props.$isHighlight) return props.theme?.brand?.primary || '#a8edea';
    return props.theme?.surfaces?.borders?.subtle || 'rgba(255, 255, 255, 0.1)';
  }};
  min-height: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  text-align: right;
  font-family: 'Courier New', monospace;
`;

const TotalesSection = ({ data, loading }) => {
  const formatCurrency = (value) => {
    if (loading) return 'Cargando...';
    if (value === null || value === undefined || value === '') return '$0.00';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(numValue);
  };

  const fields = [
    { key: 'totalPercepciones', label: 'Total de Percepciones', highlight: true },
    { key: 'totalDeducciones', label: 'Total Deducciones', highlight: true },
    { key: 'netoAntesVales', label: 'Neto Antes de Vales' },
    { key: 'netoPagar', label: 'Neto a Pagar', highlight: true },
    { key: 'subtotalCostoNomina', label: 'Subtotal Costo de Nómina' },
    { key: 'costoNomina', label: 'Costo de Nómina', highlight: true },
    { key: 'regalias', label: 'Regalías' },
    { key: 'iva', label: 'IVA' },
    { key: 'totalFacturar', label: 'Total a Facturar', highlight: true }
  ];

  return (
    <SectionContainer>
      <SectionTitle>Totales</SectionTitle>
      <FieldsGrid>
        {fields.map(({ key, label, highlight }) => (
          <FieldGroup key={key}>
            <FieldLabel>{label}</FieldLabel>
            <FieldValue $isHighlight={highlight}>
              {formatCurrency(data?.[key])}
            </FieldValue>
          </FieldGroup>
        ))}
      </FieldsGrid>
    </SectionContainer>
  );
};

export default TotalesSection;

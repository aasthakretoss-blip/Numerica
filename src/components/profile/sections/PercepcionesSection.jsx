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
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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
  color: ${props => props.theme?.text?.secondary || 'rgba(255, 255, 255, 0.9)'};
  font-size: 0.9rem;
  font-weight: 600;
  background: ${props => props.theme?.surfaces?.dark?.subtle || 'rgba(0, 0, 0, 0.1)'};
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.subtle || 'rgba(255, 255, 255, 0.1)'};
  min-height: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  text-align: right;
  font-family: 'Courier New', monospace;
`;

const PercepcionesSection = ({ data, loading }) => {
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

  // data es un array de percepciones: [{concepto, monto, codigo}, ...]
  const percepciones = Array.isArray(data) ? data : [];

  if (loading) {
    return (
      <SectionContainer>
        <SectionTitle>Percepciones</SectionTitle>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
          Cargando percepciones...
        </div>
      </SectionContainer>
    );
  }

  if (percepciones.length === 0) {
    return (
      <SectionContainer>
        <SectionTitle>Percepciones</SectionTitle>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
          No se encontraron percepciones para este período
        </div>
      </SectionContainer>
    );
  }

  return (
    <SectionContainer>
      <SectionTitle>Percepciones ({percepciones.length})</SectionTitle>
      <FieldsGrid>
        {percepciones.map((percepcion, index) => (
          <FieldGroup key={percepcion.codigo || index}>
            <FieldLabel>{percepcion.concepto}</FieldLabel>
            <FieldValue>
              {formatCurrency(percepcion.monto)}
            </FieldValue>
          </FieldGroup>
        ))}
      </FieldsGrid>
    </SectionContainer>
  );
};

export default PercepcionesSection;

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

const InformacionSalarialSection = ({ data, loading, selectedPeriod }) => {
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

  const formatCleanValue = (value) => {
    if (loading) return 'Cargando...';
    if (value === null || value === undefined || value === '') return 'No disponible';
    let cleanValue = value.toString();
    // Limpiar timestamps - extraer solo la parte antes de 'T' si existe
    if (cleanValue.includes('T')) {
      cleanValue = cleanValue.split('T')[0];
    }
    return cleanValue;
  };

  // ✅ MAPEO CORREGIDO: Usar nombres EXACTOS del backend (igual que BusquedaEmpleados)
  const fields = [
    { key: 'mes', label: 'Mes', dbField: 'Mes', isClean: true },
    { key: 'fechaPeriodo', label: 'Fecha del período', dbField: 'cveper', isClean: true },
    // CORREGIDO: Usar los mismos campos que BusquedaEmpleados
    { key: 'salario', label: 'Salario', dbField: 'salario', isCurrency: true },
    { key: 'comisiones', label: 'Comisiones', dbField: 'comisiones', isCurrency: true },
    { key: 'totalPercepciones', label: 'Total percepciones', dbField: 'totalpercepciones', isCurrency: true }
  ];

  return (
    <SectionContainer>
      <SectionTitle>Información Salarial Básica</SectionTitle>
      <FieldsGrid>
        {fields.map(({ key, label, dbField, isCurrency, isClean, isDate }) => {
          let value;
          
          // 🎯 CORRECCIÓN: Para el campo fechaPeriodo, usar selectedPeriod si está disponible
          if (key === 'fechaPeriodo' && selectedPeriod) {
            value = formatCleanValue(selectedPeriod);
          } else if (isCurrency) {
            value = formatCurrency(data?.[dbField]);
          } else if (isClean) {
            value = formatCleanValue(data?.[dbField]);
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

export default InformacionSalarialSection;

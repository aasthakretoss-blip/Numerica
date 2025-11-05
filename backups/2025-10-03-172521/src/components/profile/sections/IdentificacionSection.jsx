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
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
`;

const IdentificacionSection = ({ data, loading }) => {
  const formatValue = (value) => {
    if (loading) return 'Cargando...';
    if (value === null || value === undefined || value === '') return 'No disponible';
    return value.toString();
  };

  // Campos que devuelve nuestro endpoint en identification
  const fields = [
    { key: 'curp', label: 'CURP' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellidos', label: 'Apellidos' },
    { key: 'numeroEmpleado', label: 'Número de empleado' },
    { key: 'puesto', label: 'Puesto' },
    { key: 'compania', label: 'Compañía' },
    { key: 'sucursal', label: 'Sucursal' },
    { key: 'periodo', label: 'Período' }
  ];

  return (
    <SectionContainer>
      <SectionTitle>Identificación</SectionTitle>
      <FieldsGrid>
        {fields.map(({ key, label }) => (
          <FieldGroup key={key}>
            <FieldLabel>{label}</FieldLabel>
            <FieldValue>
              {formatValue(data?.[key])}
            </FieldValue>
          </FieldGroup>
        ))}
      </FieldsGrid>
    </SectionContainer>
  );
};

export default IdentificacionSection;

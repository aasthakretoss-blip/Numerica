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

const InformacionBasicaFPLSection = ({ data, loading }) => {
  const formatValue = (value) => {
    if (loading) return 'Cargando...';
    if (value === null || value === undefined || value === '') return 'No disponible';
    return value.toString();
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'No disponible';
    try {
      // Si es un timestamp ISO, extraer solo la parte de la fecha
      if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateValue = dateValue.split('T')[0];
      }
      const date = new Date(dateValue + 'T12:00:00');
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return 'Fecha inválida';
    }
  };

  // Mapeo de campos usando nombres exactos de la API (con espacios y capitalización)
  const fields = [
    { key: 'cvecia', label: 'Clave Compañía', dbField: 'cvecia' },
    { key: 'cvetno', label: 'Clave sucursal', dbField: 'cvetno' },
    { key: 'sucursal', label: 'Sucursal', dbField: 'Sucursal' },
    { key: 'claveTrabajador', label: 'Clave trabajador', dbField: 'Clave trabajador' },
    { key: 'nombre', label: 'Nombre completo', dbField: 'Nombre completo', highlight: true },
    { key: 'rfc', label: 'RFC', dbField: 'RFC', highlight: true },
    { key: 'fechaAntiguedad', label: 'Fecha de antigüedad', dbField: 'Fecha antigüedad', isDate: true },
    { key: 'fechaBaja', label: 'Fecha de baja', dbField: 'Fecha baja', isDate: true },
    { key: 'status', label: 'Estado', dbField: 'Status', isStatus: true }
  ];

  return (
    <SectionContainer>
      <SectionTitle>Información Básica FPL</SectionTitle>
      <FieldsGrid>
        {fields.map(({ key, label, dbField, highlight, isDate, isStatus }) => {
          let value;
          
          if (isDate) {
            value = formatDate(data?.[dbField]);
          } else {
            value = formatValue(data?.[dbField]);
          }

          // OCULTAR "Fecha de Baja" cuando sea "No disponible"
          if (key === 'fecbaj' && value === 'No disponible') {
            return null;
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

export default InformacionBasicaFPLSection;

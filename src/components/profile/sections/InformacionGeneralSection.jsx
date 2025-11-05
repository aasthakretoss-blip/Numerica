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

const InformacionGeneralSection = ({ data, loading, selectedPeriod }) => {
  

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

  const formatNumberIMSS = (value) => {
    if (loading) return 'Cargando...';
    if (value === null || value === undefined || value === '') return 'No disponible';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value.toString();
    return Math.floor(numValue).toString();
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

  const getStatusClass = (status) => {
    const statusLower = status?.toString().toLowerCase();
    if (statusLower === 'activo' || statusLower === 'active') return 'status-active';
    if (statusLower === 'inactivo' || statusLower === 'inactive') return 'status-inactive';
    return '';
  };

  // ✅ MAPEO CORREGIDO: Usar nombres EXACTOS del backend (similar a BusquedaEmpleados)
  const fields = [
    // Campos principales coincidentes con la transformación de BusquedaEmpleados
    { key: 'curp', label: 'CURP', dbField: 'curp', highlight: true },
    { key: 'nombre', label: 'Nombre completo', dbField: 'nombre', highlight: true },
    { key: 'puesto', label: 'Puesto', dbField: 'puesto' },
    { key: 'sucursal', label: 'Sucursal', dbField: 'sucursal' },
    { key: 'rfc', label: 'RFC', dbField: 'rfc' },
    { key: 'status', label: 'Status', dbField: 'estado' },
    // Campos adicionales usando nombres de la BD cuando estén disponibles
    { key: 'compania', label: 'Compañía', dbField: 'Compañía' },
    { key: 'periodicidad', label: 'Periodicidad', dbField: 'Periodicidad' },
    { key: 'claveTrabajador', label: 'Clave trabajador', dbField: 'Clave trabajador' },
    { key: 'numeroIMSS', label: 'Número IMSS', dbField: 'Número IMSS', isIMSS: true },
    { key: 'fechaAntiguedad', label: 'Fecha de antigüedad', dbField: 'Fecha antigüedad', isDate: true },
    { key: 'antiguedadFPL', label: 'Antigüedad en FPL', dbField: 'Antigüedad en FPL', isDate: true },
    { key: 'localidad', label: 'Localidad', dbField: 'Localidad' },
    { key: 'sexo', label: 'Sexo', dbField: 'Sexo' },
    { key: 'mes', label: 'Mes', dbField: 'Mes', isClean: true },
    { key: 'periodo', label: 'Período', dbField: 'cveper', isClean: true }
  ];

  return (
    <SectionContainer>
      <SectionTitle>Información General</SectionTitle>
      <FieldsGrid>
        {fields.map(({ key, label, dbField, highlight, isDate, isStatus, isIMSS, isClean }) => {
          let value;
          
          // 🎯 CORRECCIÓN: Para el campo período, usar selectedPeriod si está disponible
          if (key === 'cveper' && selectedPeriod) {
            value = formatCleanValue(selectedPeriod);
          } else if (isDate) {
            value = formatDate(data?.[dbField]);
          } else if (isIMSS) {
            value = formatNumberIMSS(data?.[dbField]);
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

export default InformacionGeneralSection;

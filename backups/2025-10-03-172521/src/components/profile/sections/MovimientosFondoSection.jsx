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
  
  // COLORES ESTANDARIZADOS - Usar variables CSS del tema
  &.currency {
    color: var(--text-primary);
  }
  
  &.negative {
    color: var(--text-primary);
  }
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const MovimientosFondoSection = ({ data, loading }) => {
  const formatValue = (value) => {
    if (loading) return 'Cargando...';
    if (value === null || value === undefined || value === '') return 'No disponible';
    return value.toString();
  };

  const formatCurrency = (value) => {
    if (loading) return 'Cargando...';
    if (value === null || value === undefined || value === '') return 'No disponible';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value.toString();
    
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(numValue);
  };

  const formatNumeric = (value) => {
    if (loading) return 'Cargando...';
    if (value === null || value === undefined || value === '') return 'No disponible';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value.toString();
    
    return numValue.toFixed(4);
  };

  const getCurrencyClass = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '';
    return numValue < 0 ? 'negative' : 'currency';
  };

  // Mapeo de campos de la base de datos historico_fondos_gsau a nombres frontend (Grupo B)
  // CORREGIDO: Usar nombres exactos de la API
  const fields = [
    { key: 'observaciones', label: 'Observaciones', dbField: 'observaciones' }, // CORREGIDO
    { key: 'antiguedadEnFondo', label: 'Antigüedad en fondo', dbField: 'antiguedad_en_fondo', isNumeric: true }, // CORREGIDO
    { key: 'saldoInicial', label: 'Saldo inicial', dbField: 'saldo_inicial', isCurrency: true }, // CORREGIDO
    { key: 'aportacionFideicomiso', label: 'Aportación al Fideicomiso', dbField: 'aportacion_al_fideicomiso', isCurrency: true }, // CORREGIDO
    { key: 'interesesFideicomiso', label: 'Intereses Fideicomiso', dbField: 'intereses_fideicomiso', isCurrency: true }, // CORREGIDO
    { key: 'cargosFideicomiso', label: 'Cargos Fideicomiso', dbField: 'cargos_fideicomiso', isCurrency: true }, // CORREGIDO
    { key: 'interesesPrestamos', label: 'Intereses por Prestamos', dbField: 'intereses_por_prestamos', isCurrency: true }, // CORREGIDO
    { key: 'entregaFondos', label: 'Entrega de Fondos', dbField: 'entrega_de_fondos', isCurrency: true }, // CORREGIDO
    { key: 'saldoBajas', label: 'Saldo Bajas', dbField: 'saldo_bajas', isCurrency: true }, // CORREGIDO
    { key: 'gr', label: 'GR', dbField: 'gr', isCurrency: true }, // CORREGIDO
    { key: 'saldoFinal', label: 'Saldo Final', dbField: 'saldo_final', isCurrency: true }, // CORREGIDO
    { key: 'saldoFinal2', label: 'Saldo Final 2', dbField: 'saldo_final_1', isCurrency: true } // CORREGIDO
  ];

  return (
    <SectionContainer>
      <SectionTitle>Movimientos de Fondo</SectionTitle>
      <FieldsGrid>
        {fields.map(({ key, label, dbField, isCurrency, isNumeric }) => {
          let value;
          let className = '';
          
          if (isCurrency) {
            value = formatCurrency(data?.[dbField]);
            className = getCurrencyClass(data?.[dbField]);
          } else if (isNumeric) {
            value = formatNumeric(data?.[dbField]);
          } else {
            value = formatValue(data?.[dbField]);
          }

          return (
            <FieldCard key={key}>
              <FieldLabel>{label}</FieldLabel>
              <FieldValue className={className}>
                {value}
              </FieldValue>
            </FieldCard>
          );
        })}
      </FieldsGrid>
    </SectionContainer>
  );
};

export default MovimientosFondoSection;

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

const DeduccionesSection = ({ data, loading }) => {
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

  // Mapeo de campos de la base de datos historico_nominas_gsau a nombres frontend
  const fields = [
    { key: 'isr', label: 'ISR', dbField: ' ISR ', isCurrency: true, type: 'tax' },
    { key: 'descuentoIMSS', label: 'Descuento IMSS', dbField: ' DESCUENTO IMSS ', isCurrency: true, type: 'deduction' },
    { key: 'retardos', label: 'Retardos', dbField: ' RETARDOS ', isCurrency: true, type: 'deduction' },
    { key: 'descuentoINFONAVIT', label: 'Descuento INFONAVIT', dbField: ' DESCUENTO INFONAVIT ', isCurrency: true, type: 'deduction' },
    { key: 'diferenciaINFONAVIT', label: 'Diferencia INFONAVIT', dbField: ' DIFERENCIA INFONAVIT4 ', isCurrency: true, type: 'deduction' },
    { key: 'seguroVivienda', label: 'Seguro a la vivienda', dbField: ' SEGURO A LA VIVIENDA ', isCurrency: true, type: 'deduction' },
    { key: 'fonacot', label: 'FONACOT', dbField: ' FONACOT ', isCurrency: true, type: 'loan' },
    { key: 'diferenciaFONACOT', label: 'Diferencia FONACOT', dbField: ' DIFERENCIA FONACOT5 ', isCurrency: true, type: 'loan' },
    { key: 'prestamosPersonales2', label: 'Préstamos personales 2', dbField: ' PRESTAMOS PERSONALES6 ', isCurrency: true, type: 'loan' },
    { key: 'pensionAlimenticia', label: 'Pensión alimenticia', dbField: ' PENSIÓN ALIMENTICIA ', isCurrency: true, type: 'pension' },
    { key: 'anticipoNomina', label: 'Anticipo de nómina', dbField: ' ANTICIPO DE NOMINA ', isCurrency: true, type: 'deduction' },
    { key: 'cuotaSindical', label: 'Cuota sindical', dbField: ' CUOTA SINDICAL ', isCurrency: true, type: 'union' },
    { key: 'dctoPensionAlimenticiaVales', label: 'Descuento pensión alimenticia vales', dbField: ' DCTO PENSION ALIMENTICIA VALES ', isCurrency: true, type: 'pension' },
    { key: 'otrosDescuentos', label: 'Otros descuentos', dbField: ' OTROS DESCUENTOS ', isCurrency: true, type: 'other' },
    { key: 'descuentosVarios', label: 'Descuentos varios', dbField: ' DESCUENTOS VARIOS ', isCurrency: true, type: 'other' },
    { key: 'isrIndemnizacion', label: 'ISR Indemnización', dbField: ' ISR INDEMNIZACION ', isCurrency: true, type: 'tax' },
    { key: 'destruccionHerramientas', label: 'Destrucción herramientas', dbField: ' DESTRUCCION HERRAMIENTAS ', isCurrency: true, type: 'other' },
    { key: 'descuentoUniformes', label: 'Descuento por uniformes', dbField: ' DESCUENTO POR UNIFORMES ', isCurrency: true, type: 'other' },
    { key: 'aportacionCajaAhorro', label: 'Aportación caja de ahorro', dbField: ' APORTACION CAJA DE AHORRO ', isCurrency: true, type: 'deduction' },
    { key: 'prestamoFPL', label: 'Préstamo FPL', dbField: ' PRESTAMO FPL ', isCurrency: true, type: 'loan' },
    { key: 'pensionAlimenticiaFPL', label: 'Pensión alimenticia FPL', dbField: ' PENSION ALIMENTICIA FPL ', isCurrency: true, type: 'pension' },
    { key: 'ajusteSubsEmpleoPagado', label: 'Ajuste subs al empleao pagado', dbField: ' AJUSTE SUBS AL EMPLEO PAGADO ', isCurrency: true, type: 'deduction' },
    { key: 'ayudaFPL', label: 'Ayuda FPL', dbField: 'AYUDA FPL', isCurrency: true, type: 'deduction' }
  ];

  return (
    <SectionContainer>
      <SectionTitle>Deducciones</SectionTitle>
      <FieldsGrid>
        {fields.map(({ key, label, dbField, isCurrency }) => {
          let value;
          
          if (isCurrency) {
            value = formatCurrency(data?.[dbField]);
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

export default DeduccionesSection;

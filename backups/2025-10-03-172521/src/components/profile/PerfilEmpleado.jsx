import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import MenuPerfil from '../MenuPerfil';
import PeriodDropdownCurpBased from './PeriodDropdownCurpBased';
import PayrollDataViewer from './PayrollDataViewer';

const PerfilContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  
  @media (max-width: 768px) {
    gap: 1.5rem;
  }
`;


const ContentContainer = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.strong || 'blur(20px)'};
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.2)'};
  margin: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    gap: 1.5rem;
  }
`;

const FieldsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const FieldLabel = styled.label`
  color: ${props => props.theme?.text?.secondary || 'rgba(255, 255, 255, 0.9)'};
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const TextBox = styled.input`
  background: ${props => props.theme?.surfaces?.dark?.medium || 'rgba(184, 184, 184, 0.2)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.medium || 'blur(15px)'};
  border: 1px solid ${props => props.theme?.surfaces?.borders?.subtle || 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  padding: 0.75rem 1rem;
  color: ${props => props.theme?.text?.secondary || 'rgba(255, 255, 255, 0.9)'};
  font-size: 0.9rem;
  font-weight: 500;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.3s ease'};
  box-shadow: ${props => props.theme?.effects?.shadows?.subtle || '0 2px 4px rgba(0, 0, 0, 0.1)'};
  width: 100%;
  box-sizing: border-box;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme?.brand?.primary || '#a8edea'};
    box-shadow: ${props => props.theme?.effects?.focusRing || '0 0 0 3px rgba(168, 237, 234, 0.2)'};
    background: ${props => props.theme?.surfaces?.inputs?.focus || 'rgba(255, 255, 255, 0.15)'};
  }
  
  &:read-only {
    background: ${props => props.theme?.surfaces?.dark?.subtle || 'rgba(0, 0, 0, 0.1)'};
    cursor: default;
  }
  
  &::placeholder {
    color: ${props => props.theme?.text?.subtle || 'rgba(255, 255, 255, 0.6)'};
  }
`;


const PerfilEmpleado = ({ rfc }) => {
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [forcedPeriod, setForcedPeriod] = useState(null);
  const theme = useTheme();
  const location = useLocation();

  // El RFC del parámetro URL es en realidad el CURP
  const curpFromURL = rfc;

  // Detectar si viene un período desde la URL (desde la gráfica histórica)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const periodoFromURL = searchParams.get('periodo');
    
    console.log('🔍 [PerfilEmpleado] Checking URL for periodo param:', location.search);
    
    if (periodoFromURL) {
      console.log('🔗 [PerfilEmpleado] Período detectado desde URL:', periodoFromURL);
      
      // Usar el período forzado para el dropdown
      setForcedPeriod(periodoFromURL);
      console.log('🎯 [PerfilEmpleado] forcedPeriod configurado a:', periodoFromURL);
      
      // Limpiar el query parameter de la URL sin recargar la página
      const newSearchParams = new URLSearchParams(location.search);
      newSearchParams.delete('periodo');
      const newSearch = newSearchParams.toString();
      const newUrl = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;
      
      // Usar replaceState para no agregar entrada al historial
      window.history.replaceState({}, '', newUrl);
      console.log('🧿 [PerfilEmpleado] URL limpiada, nueva URL:', newUrl);
    } else {
      console.log('ℹ️ [PerfilEmpleado] No se encontró parámetro periodo en URL');
    }
  }, [location.search]);

  const handlePeriodChange = (period) => {
    console.log('📅 [PerfilEmpleado] Período seleccionado en perfil:', period, '(forcedPeriod era:', forcedPeriod, ')');
    setSelectedPeriod(period);
    
    // Limpiar el período forzado después de la primera selección
    if (forcedPeriod) {
      console.log('🧿 [PerfilEmpleado] Limpiando forcedPeriod');
      setForcedPeriod(null);
    }
  };

  return (
    <PerfilContainer>
      {/* Barra superior de navegación */}
      <MenuPerfil rfc={rfc} />
      
      {/* Contenido principal con solo dropdown CVEPER y textbox CURP */}
      <ContentContainer>
        <FieldsContainer>
          <FieldGroup>
            <FieldLabel>Período de Nómina</FieldLabel>
            <PeriodDropdownCurpBased
              curp={curpFromURL}
              onPeriodChange={handlePeriodChange}
              selectedPeriod={selectedPeriod ? [selectedPeriod] : []}
              forcePeriodSelection={forcedPeriod}
              className="period-selector"
            />
            {/* Debug info */}
            {forcedPeriod && (
              <div style={{ fontSize: '0.8rem', color: '#00ff00', marginTop: '0.5rem' }}>
                🎯 Debug: forcedPeriod = {forcedPeriod}
              </div>
            )}
          </FieldGroup>
          
          <FieldGroup>
            <FieldLabel>CURP del Empleado</FieldLabel>
            <TextBox
              type="text"
              value={curpFromURL || ''}
              readOnly
              placeholder="CURP del empleado"
              title="CURP del perfil de empleado actual"
            />
          </FieldGroup>
        </FieldsContainer>
        
        {/* Datos de nómina del empleado */}
        <PayrollDataViewer 
          curp={curpFromURL}
          selectedPeriod={selectedPeriod}
        />
      </ContentContainer>
    </PerfilContainer>
  );
};

export default PerfilEmpleado;

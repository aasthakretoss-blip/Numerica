import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTheme } from '../../contexts/ThemeContext';
import MenuPerfil from '../MenuPerfil';
import FechaFPLDropdownRFC from './FechaFPLDropdownRFC';
import FPLDataViewer from './FPLDataViewer';

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

const PerfilFPL = ({ rfc }) => {
  const [rfcData, setRfcData] = useState(null);
  const [selectedFechaFPL, setSelectedFechaFPL] = useState(null);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  // El parámetro rfc es en realidad el CURP
  const curpFromURL = rfc;

  // Obtener RFC desde CURP
  useEffect(() => {
    const fetchRFC = async () => {
      if (!curpFromURL) return;
      
      setLoading(true);
      try {
        console.log('🔍 Buscando RFC para CURP:', curpFromURL);
        
        const response = await fetch(`https://numerica-2.onrender.com/api/payroll/rfc-from-curp?curp=${encodeURIComponent(curpFromURL)}`);
        
        if (!response.ok) {
          throw new Error('Error al obtener RFC');
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          console.log('✅ RFC obtenido:', result.data.rfc);
          setRfcData(result.data);
        } else {
          console.log('⚠️ No se encontró RFC para CURP:', curpFromURL);
          setRfcData(null);
        }
      } catch (error) {
        console.error('❌ Error obteniendo RFC:', error);
        setRfcData(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRFC();
  }, [curpFromURL]);

  const handleFechaFPLChange = (fechaFPL) => {
    console.log('📅 Fecha FPL seleccionada:', fechaFPL);
    setSelectedFechaFPL(fechaFPL);
  };

  return (
    <PerfilContainer>
      {/* Barra superior de navegación */}
      <MenuPerfil rfc={rfc} />
      
      {/* Contenido principal con dropdown de fechas FPL y textbox RFC */}
      <ContentContainer>
        <FieldsContainer>
          <FieldGroup>
            <FieldLabel>Fecha FPL Calculada</FieldLabel>
            <FechaFPLDropdownRFC
              rfc={rfcData?.rfc}
              selectedFecha={selectedFechaFPL}
              onFechaChange={handleFechaFPLChange}
              placeholder="Seleccionar fecha FPL..."
              disabled={!rfcData?.rfc || loading}
            />
          </FieldGroup>
          
          <FieldGroup>
            <FieldLabel>RFC del Empleado</FieldLabel>
            <TextBox
              type="text"
              value={loading ? 'Obteniendo RFC...' : (rfcData?.rfc || 'RFC no encontrado')}
              readOnly
              placeholder="RFC del empleado"
              title="RFC obtenido desde el CURP del empleado"
            />
          </FieldGroup>
        </FieldsContainer>
        
        {/* Datos FPL del empleado */}
        <FPLDataViewer 
          rfc={rfcData?.rfc}
          selectedFechaFPL={selectedFechaFPL}
        />
      </ContentContainer>
    </PerfilContainer>
  );
};

export default PerfilFPL;

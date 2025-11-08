import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import MenuPerfil from '../MenuPerfil';
import PercepcionesHistoricoChart from './charts/PercepcionesHistoricoChart';
import FondosHistoricoChart from './charts/FondosHistoricoChart';
import { authenticatedFetch } from '../../services/authenticatedFetch';
import { buildApiUrl } from '../../config/apiConfig';

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
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (min-width: 1600px) {
    grid-template-columns: repeat(4, 1fr);
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

const TextBoxesContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
  margin-bottom: 1rem;
  
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

const FieldLabelBox = styled.label`
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

const PerfilHistorico = ({ rfc }) => {
  const [payrollData, setPayrollData] = useState(null);
  const [rfcData, setRfcData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingRfc, setLoadingRfc] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();

  // El parámetro rfc es en realidad el CURP
  const curpFromURL = rfc;

  // Obtener datos de nómina (para nombre, fecha antigüedad, compañía, puesto)
  useEffect(() => {
    const fetchPayrollData = async () => {
      if (!curpFromURL) return;
      
      setLoading(true);
      try {
        console.log('🔍 [Histórico] Obteniendo datos de nómina para CURP:', curpFromURL);
        
        const params = new URLSearchParams({
          curp: curpFromURL,
          pageSize: '1',
          page: '1'
        });
        
        const response = await fetch(`${buildApiUrl('/api/percepciones')}?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Error al obtener datos de nómina');
        }
        
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
          console.log('✅ [Histórico] Datos de nómina obtenidos:', {
            nombre: result.data[0]['Nombre completo'],
            puesto: result.data[0]['Puesto'],
            compania: result.data[0]['Compañía']
          });
          setPayrollData(result.data[0]);
        } else {
          console.log('⚠️ [Histórico] No se encontraron datos de nómina para CURP:', curpFromURL);
          setPayrollData(null);
        }
      } catch (error) {
        console.error('❌ [Histórico] Error obteniendo datos de nómina:', error);
        setPayrollData(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPayrollData();
  }, [curpFromURL]);

  // Obtener RFC desde CURP
  useEffect(() => {
    const fetchRFC = async () => {
      if (!curpFromURL) return;
      
      setLoadingRfc(true);
      try {
        console.log('🔍 [Histórico] Buscando RFC para CURP:', curpFromURL);
        
        const response = await authenticatedFetch(buildApiUrl(`/api/payroll/rfc-from-curp?curp=${encodeURIComponent(curpFromURL)}`));
        
        // ✅ FIXED: Handle 404 gracefully - RFC not found is not an error, just means it doesn't exist
        if (response.status === 404) {
          console.log('ℹ️ [Histórico] RFC no encontrado en base de datos para CURP:', curpFromURL);
          setRfcData({ curp: curpFromURL, rfc: null });
          setLoadingRfc(false);
          return;
        }
        
        if (!response.ok) {
          // Only throw error for non-404 status codes
          throw new Error(`Error al obtener RFC: HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          // Handle both null RFC and valid RFC
          if (result.data.rfc) {
            console.log('✅ [Histórico] RFC obtenido:', result.data.rfc);
            setRfcData(result.data);
          } else {
            console.log('⚠️ [Histórico] RFC es null para CURP:', curpFromURL);
            setRfcData({ curp: curpFromURL, rfc: null });
          }
        } else {
          console.log('⚠️ [Histórico] No se encontró RFC para CURP:', curpFromURL);
          setRfcData({ curp: curpFromURL, rfc: null });
        }
      } catch (error) {
        console.error('❌ [Histórico] Error obteniendo RFC:', error);
        // Set RFC as null instead of null data to show "RFC no disponible" message
        setRfcData({ curp: curpFromURL, rfc: null });
      } finally {
        setLoadingRfc(false);
      }
    };
    
    fetchRFC();
  }, [curpFromURL]);

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

  const handlePeriodClick = (clickedPeriod) => {
    console.log('🎥 [Histórico] Navigando al período:', clickedPeriod, 'para CURP:', curpFromURL);
    
    // Navegar al perfil del empleado con el período en la URL como query parameter
    const basePath = `/perfil/${curpFromURL}`;
    const searchParams = new URLSearchParams({ periodo: clickedPeriod });
    
    navigate(`${basePath}?${searchParams.toString()}`);
  };

  const handleFPLPeriodClick = (clickedFechaFPL) => {
    console.log('🎥 [Histórico] Navigando al perfil FPL con fecha:', clickedFechaFPL, 'para RFC:', rfcData?.rfc);
    
    if (!rfcData?.rfc) {
      console.warn('⚠️ [Histórico] No se puede navegar a FPL sin RFC');
      return;
    }
    
    // Navegar al perfil FPL del empleado con la fecha FPL en la URL como query parameter
    const basePath = `/fpl/${rfcData.rfc}`;
    const searchParams = new URLSearchParams({ fechaFPL: clickedFechaFPL });
    
    navigate(`${basePath}?${searchParams.toString()}`);
  };

  return (
    <PerfilContainer>
      {/* Barra superior de navegación */}
      <MenuPerfil rfc={rfc} />
      
      {/* Contenido principal con textboxes informativos */}
      <ContentContainer>
        {/* Textboxes del CURP y RFC */}
        <TextBoxesContainer>
          <FieldGroup>
            <FieldLabelBox>CURP del Empleado</FieldLabelBox>
            <TextBox
              type="text"
              value={curpFromURL || ''}
              readOnly
              placeholder="CURP del empleado"
              title="CURP del perfil de empleado actual"
            />
          </FieldGroup>
          
          <FieldGroup>
            <FieldLabelBox>RFC del Empleado</FieldLabelBox>
            <TextBox
              type="text"
              value={loadingRfc ? 'Obteniendo RFC...' : (rfcData?.rfc || 'RFC no disponible')}
              readOnly
              placeholder="RFC del empleado"
              title="RFC obtenido desde el CURP del empleado"
            />
          </FieldGroup>
        </TextBoxesContainer>
        
        {/* Información adicional del empleado */}
        <div>
          
          <FieldsGrid>
            <FieldCard>
              <FieldLabel>Nombre Completo</FieldLabel>
              <FieldValue>
                {formatValue(payrollData?.['Nombre completo'])}
              </FieldValue>
            </FieldCard>
            
            <FieldCard>
              <FieldLabel>Fecha de Antigüedad</FieldLabel>
              <FieldValue>
                {formatDate(payrollData?.['Fecha antigüedad'])}
              </FieldValue>
            </FieldCard>
            
            <FieldCard>
              <FieldLabel>Compañía</FieldLabel>
              <FieldValue>
                {formatValue(payrollData?.['Compañía'])}
              </FieldValue>
            </FieldCard>
            
            <FieldCard>
              <FieldLabel>Puesto</FieldLabel>
              <FieldValue>
                {formatValue(payrollData?.['Puesto'])}
              </FieldValue>
            </FieldCard>
          </FieldsGrid>
        </div>
      </ContentContainer>
      
      {/* Gráfica histórica de percepciones */}
      <PercepcionesHistoricoChart 
        curp={curpFromURL} 
        onPeriodClick={handlePeriodClick}
      />
      
      {/* Gráfica histórica de fondos - Solo mostrar si tenemos RFC */}
      {rfcData?.rfc && (
        <FondosHistoricoChart 
          rfc={rfcData.rfc} 
          onPeriodClick={handleFPLPeriodClick}
        />
      )}
    </PerfilContainer>
  );
};

export default PerfilHistorico;

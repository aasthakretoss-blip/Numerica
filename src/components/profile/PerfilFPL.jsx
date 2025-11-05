import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useTheme } from '../../contexts/ThemeContext';
import { buildApiUrl } from '../../config/apiConfig';
import { authenticatedFetch } from '../../services/authenticatedFetch';
import { procesarRFC, buscarRFCEnObjeto } from '../../utils/rfcUtils';
import { calcularFechaFPLReciente, calcularEstadisticasFechasFPL } from '../../utils/fplUtils';
import { obtenerRFCDelEmpleado, esRFCGenerado, formatearRFCConIndicador } from '../../utils/curpToRfcUtils';
import MenuPerfil from '../MenuPerfil';
import FechaFPLDropdownRFC from './FechaFPLDropdownRFC';
import FPLDataViewer from './FPLDataViewer';

// TEMPORAL: Importar funciones de prueba para debugging
if (process.env.NODE_ENV === 'development') {
  import('../../utils/testRFC').then(module => {
    window.testRFC = module;
    console.log('🧪 Funciones de prueba RFC cargadas en window.testRFC');
  });
}

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
  
  &.valid {
    border-color: #4ade80;
    box-shadow: 0 0 0 1px rgba(74, 222, 128, 0.2);
  }
  
  &.invalid {
    border-color: #f87171;
    box-shadow: 0 0 0 1px rgba(248, 113, 113, 0.2);
  }
`;

const InfoBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => {
    if (props.type === 'success') return 'rgba(74, 222, 128, 0.2)';
    if (props.type === 'warning') return 'rgba(251, 191, 36, 0.2)';
    if (props.type === 'error') return 'rgba(248, 113, 113, 0.2)';
    return 'rgba(168, 237, 234, 0.2)';
  }};
  color: ${props => {
    if (props.type === 'success') return '#4ade80';
    if (props.type === 'warning') return '#fbbf24';
    if (props.type === 'error') return '#f87171';
    return '#a8edea';
  }};
  border: 1px solid ${props => {
    if (props.type === 'success') return 'rgba(74, 222, 128, 0.3)';
    if (props.type === 'warning') return 'rgba(251, 191, 36, 0.3)';
    if (props.type === 'error') return 'rgba(248, 113, 113, 0.3)';
    return 'rgba(168, 237, 234, 0.3)';
  }};
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const StatsContainer = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1rem;
  margin-top: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const StatsTitle = styled.h4`
  color: ${props => props.theme?.text?.secondary || 'rgba(255, 255, 255, 0.9)'};
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
  font-size: 0.85rem;
  
  .label {
    color: ${props => props.theme?.text?.subtle || 'rgba(255, 255, 255, 0.7)'};
  }
  
  .value {
    color: ${props => props.theme?.text?.secondary || 'rgba(255, 255, 255, 0.9)'};
    font-weight: 600;
  }
`;

const PerfilFPL = ({ rfc }) => {
  const [rfcData, setRfcData] = useState(null);
  const [selectedFechaFPL, setSelectedFechaFPL] = useState(null);
  const [loading, setLoading] = useState(false);
  const [payrollData, setPayrollData] = useState([]);
  const [fechaFPLCalculada, setFechaFPLCalculada] = useState(null);
  const theme = useTheme();

  // El parámetro rfc es en realidad el CURP
  const curpFromURL = rfc;

  // Procesar RFC con validación
  const rfcProcesado = useMemo(() => {
    if (!rfcData?.rfc) return null;
    return procesarRFC(rfcData.rfc);
  }, [rfcData?.rfc]);

  // Calcular estadísticas de fechas FPL
  const estadisticasFPL = useMemo(() => {
    if (!payrollData.length || !rfcData?.rfc) return null;
    return calcularEstadisticasFechasFPL(payrollData, rfcData.rfc);
  }, [payrollData, rfcData?.rfc]);

  // Obtener RFC desde CURP usando el endpoint principal de payroll
  useEffect(() => {
    const fetchRFC = async () => {
      if (!curpFromURL) {
        console.log('⚠️ CURP no proporcionado, cancelando búsqueda RFC');
        return;
      }
      
      console.log('🚀 =============  INICIO PROCESO RFC  =============');
      console.log(`🔍 1. Buscando RFC para CURP: ${curpFromURL}`);
      console.log(`🔗 2. URL de búsqueda: ${buildApiUrl('/api/payroll')}?search=${encodeURIComponent(curpFromURL)}&pageSize=1`);
      
      setLoading(true);
      try {
        console.log('📡 3. Ejecutando fetch...');
        
        // Usar el endpoint principal de payroll con filtro por CURP
        const response = await authenticatedFetch(`${buildApiUrl('/api/payroll')}?search=${encodeURIComponent(curpFromURL)}&pageSize=1`);
        
        console.log(`📨 4. Respuesta recibida - Status: ${response.status}, OK: ${response.ok}`);
        
        if (!response.ok) {
          throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }
        
        console.log('📜 5. Parseando respuesta JSON...');
        const result = await response.json();
        
        console.log('📋 6. RESULTADO COMPLETO:', result);
        console.log(`📊 7. Success: ${result.success}, Data length: ${result.data?.length || 0}`);
        
        if (result.success && result.data && result.data.length > 0) {
          // Tomar el primer empleado encontrado
          const empleado = result.data[0];
          
          console.log('🚀 ========== EMPLEADO ENCONTRADO ==========');
          console.log('👤 8. EMPLEADO COMPLETO:', empleado);
          console.log('🏷️ 9. PROPIEDADES:', Object.keys(empleado));
          console.log(`📏 10. Total propiedades: ${Object.keys(empleado).length}`);
          
          // Log cada propiedad individualmente para mejor debugging
          Object.entries(empleado).forEach(([key, value], index) => {
            console.log(`    ${index + 1}. "${key}" = ${typeof value === 'string' ? `"${value}"` : value}`);
          });
          
          console.log('🔎 11. INICIANDO BÚSQUEDA RFC...');
          
          // Intentar obtener RFC del empleado o generarlo desde CURP
          const rfcObtenido = await obtenerRFCDelEmpleado(empleado);
          
          console.log(`🎤 12. RFC obtenido de la función: ${rfcObtenido}`);
          
          if (rfcObtenido) {
            const esGenerado = esRFCGenerado(rfcObtenido);
            console.log(`✅ 13. ÉXITO - RFC ${esGenerado ? 'GENERADO' : 'OBTENIDO'}: ${rfcObtenido}`);
            console.log(`🏷️ 14. Es generado: ${esGenerado}`);
            
            const rfcDataObj = { 
              rfc: rfcObtenido,
              generado: esGenerado,
              empleado: empleado 
            };
            
            console.log('💾 15. Estableciendo datos RFC:', rfcDataObj);
            setRfcData(rfcDataObj);
            
            console.log('🎉 16. PROCESO RFC COMPLETADO EXITOSAMENTE');
          } else {
            console.log('❌ 13. ERROR - No se pudo obtener ni generar RFC');
            console.log('🔍 14. Empleado que falló:', empleado);
            setRfcData(null);
          }
        } else {
          console.log('⚠️ 8. No se encontró empleado para CURP:', curpFromURL);
          console.log('📊 9. Detalles del resultado:', { 
            success: result.success, 
            dataExists: !!result.data,
            dataLength: result.data?.length,
            fullResult: result 
          });
          setRfcData(null);
        }
      } catch (error) {
        console.log('❌ ========== ERROR EN PROCESO RFC ==========');
        console.error('❌ Error obteniendo RFC:', error);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Error message:', error.message);
        setRfcData(null);
      } finally {
        console.log('🏁 FINALIZANDO proceso RFC (loading = false)');
        setLoading(false);
        console.log('🚀 =============  FIN PROCESO RFC  =============\n');
      }
    };
    
    fetchRFC();
  }, [curpFromURL]);

  // Cargar datos de payroll completos para cálculo de fecha FPL
  useEffect(() => {
    const fetchPayrollData = async () => {
      if (!rfcData?.rfc) {
        setPayrollData([]);
        return;
      }

      try {
        console.log('🔍 Cargando datos completos de payroll para RFC:', rfcData.rfc);
        
        // Cargar todos los datos de payroll para este RFC
        const response = await authenticatedFetch(
          `${buildApiUrl('/api/payroll')}?rfc=${encodeURIComponent(rfcData.rfc)}&pageSize=100`
        );
        
        if (!response.ok) {
          throw new Error('Error al cargar datos de payroll');
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          console.log(`✅ ${result.data.length} registros de payroll cargados para cálculo FPL`);
          setPayrollData(result.data);
          
          // Calcular fecha FPL más reciente automáticamente
          const fechaCalculada = calcularFechaFPLReciente(result.data);
          if (fechaCalculada) {
            console.log('📅 Fecha FPL calculada automáticamente:', fechaCalculada);
            setFechaFPLCalculada(fechaCalculada);
            
            // Establecer como fecha seleccionada si no hay una seleccionada
            if (!selectedFechaFPL) {
              setSelectedFechaFPL(fechaCalculada.fechaISO);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error cargando datos de payroll:', error);
        setPayrollData([]);
      }
    };
    
    fetchPayrollData();
  }, [rfcData?.rfc, selectedFechaFPL]);

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
              value={loading ? 'Obteniendo RFC...' : 
                     rfcData?.rfc ? formatearRFCConIndicador(rfcData.rfc) : 'RFC no encontrado'}
              readOnly
              placeholder="RFC del empleado"
              title={rfcData?.generado ? 
                     'RFC generado desde CURP (temporal hasta corrección de backend)' : 
                     'RFC obtenido desde la base de datos'}
              className={rfcProcesado ? (rfcProcesado.valido ? 'valid' : 'invalid') : ''}
            />
            {rfcProcesado && (
              <InfoRow>
                <InfoBadge type={rfcProcesado.valido ? 'success' : 'error'}>
                  {rfcProcesado.valido ? '✓' : '✗'} 
                  {rfcProcesado.valido ? `RFC Válido (${rfcProcesado.tipo})` : 'RFC Inválido'}
                </InfoBadge>
                {rfcData?.generado && (
                  <InfoBadge type="warning">
                    🔧 Generado desde CURP
                  </InfoBadge>
                )}
                {rfcProcesado.valido && rfcProcesado.edad && (
                  <InfoBadge type="info">
                    {rfcProcesado.edad} años
                  </InfoBadge>
                )}
              </InfoRow>
            )}
            {fechaFPLCalculada && (
              <InfoRow>
                <InfoBadge type="success">
                  📅 Fecha más reciente: {fechaFPLCalculada.fechaFormateada}
                </InfoBadge>
              </InfoRow>
            )}
          </FieldGroup>
        </FieldsContainer>
        
        {/* Estadísticas de fechas FPL */}
        {estadisticasFPL && estadisticasFPL.totalFechas > 0 && (
          <StatsContainer>
            <StatsTitle>Estadísticas de fechas FPL</StatsTitle>
            <StatRow>
              <span className="label">Total de períodos:</span>
              <span className="value">{estadisticasFPL.totalFechas}</span>
            </StatRow>
            <StatRow>
              <span className="label">Fecha más reciente:</span>
              <span className="value">{estadisticasFPL.fechaReciente?.formateada}</span>
            </StatRow>
            <StatRow>
              <span className="label">Fecha más antigua:</span>
              <span className="value">{estadisticasFPL.fechaAntigua?.formateada}</span>
            </StatRow>
            <StatRow>
              <span className="label">Rango temporal:</span>
              <span className="value">{estadisticasFPL.rangoMeses} meses</span>
            </StatRow>
            <StatRow>
              <span className="label">Promedio registros/período:</span>
              <span className="value">{estadisticasFPL.promedioRegistrosPorFecha}</span>
            </StatRow>
          </StatsContainer>
        )}
        
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

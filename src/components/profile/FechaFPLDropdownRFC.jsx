import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { buildApiUrl } from '../../config/apiConfig';
import { authenticatedFetch } from '../../services/authenticatedFetch';

const DropdownContainer = styled.div`
  position: relative;
  width: 100%;
`;

const DropdownButton = styled.button`
  width: 100%;
  background: ${props => props.theme?.surfaces?.dark?.medium || 'rgba(184, 184, 184, 0.2)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.medium || 'blur(15px)'};
  border: 1px solid ${props => props.theme?.surfaces?.borders?.subtle || 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  padding: 0.75rem 1rem;
  color: ${props => props.theme?.text?.secondary || 'rgba(255, 255, 255, 0.9)'};
  font-size: 0.9rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.3s ease'};
  box-shadow: ${props => props.theme?.effects?.shadows?.subtle || '0 2px 4px rgba(0, 0, 0, 0.1)'};
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    border-color: ${props => props.theme?.brand?.primary || '#a8edea'};
    background: ${props => props.theme?.surfaces?.inputs?.focus || 'rgba(255, 255, 255, 0.15)'};
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme?.brand?.primary || '#a8edea'};
    box-shadow: ${props => props.theme?.effects?.focusRing || '0 0 0 3px rgba(168, 237, 234, 0.2)'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: ${props => props.theme?.surfaces?.dark?.subtle || 'rgba(0, 0, 0, 0.1)'};
  }
`;

const DropdownArrow = styled.span`
  transition: transform 0.3s ease;
  transform: ${props => props.open ? 'rotate(180deg)' : 'rotate(0deg)'};
  color: ${props => props.theme?.text?.subtle || 'rgba(255, 255, 255, 0.6)'};
`;

const DropdownMenu = styled.ul`
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.strong || 'blur(20px)'};
  border: 1px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.2)'};
  border-radius: 12px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  padding: 0.5rem;
  margin: 0;
  list-style: none;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

const DropdownItem = styled.li`
  padding: 0.75rem;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  color: ${props => props.theme?.text?.secondary || 'rgba(255, 255, 255, 0.9)'};
  font-size: 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: ${props => props.theme?.brand?.primary || '#a8edea'};
  }

  &.selected {
    background: ${props => props.theme?.brand?.primary || '#a8edea'};
    color: ${props => props.theme?.text?.primary || 'rgba(0, 0, 0, 0.9)'};
  }
`;

const CountBadge = styled.span`
  background: rgba(168, 237, 234, 0.2);
  color: ${props => props.theme?.brand?.primary || '#a8edea'};
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-left: 0.5rem;
`;

const LoadingText = styled.div`
  padding: 0.75rem;
  text-align: center;
  color: ${props => props.theme?.text?.subtle || 'rgba(255, 255, 255, 0.6)'};
  font-style: italic;
`;

const FechaFPLDropdownRFC = ({ 
  rfc, 
  curp,
  selectedFecha, 
  onFechaChange, 
  placeholder = "Seleccionar fecha FPL...",
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fechasFPL, setFechasFPL] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar fechas FPL cuando cambie el RFC o CURP
  useEffect(() => {
    const loadFechasFPL = async () => {
      // If no RFC but we have CURP, try to get RFC first
      if (!rfc && curp) {
        console.log('🔍 No RFC disponible, obteniendo RFC desde CURP:', curp);
        try {
          const rfcUrl = buildApiUrl(`/api/payroll/rfc-from-curp?curp=${encodeURIComponent(curp)}`);
          const rfcResponse = await authenticatedFetch(rfcUrl);
          if (rfcResponse.ok) {
            const rfcResult = await rfcResponse.json();
            if (rfcResult.success && rfcResult.data && rfcResult.data.rfc) {
              // RFC obtained, will trigger this effect again with RFC
              console.log('✅ RFC obtenido desde CURP:', rfcResult.data.rfc);
              return; // Exit early, will retry with RFC
            }
          }
        } catch (error) {
          console.error('❌ Error obteniendo RFC desde CURP:', error);
        }
      }
      
      if (!rfc) {
        setFechasFPL([]);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        console.log('🔍 Cargando fechas FPL calculadas para RFC:', rfc);
        
        // Usar el endpoint dedicado que calcula fechas FPL desde historico_fondos_gsau
        // usando "Antigüedad en fondo" (seniority factor)
        // Formula: fecpla + (antiguedad_anos * 365.25 días)
        const apiUrl = buildApiUrl(`/api/payroll/fecpla-from-rfc?rfc=${encodeURIComponent(rfc)}`);
        console.log('📡 URL FPL API:', apiUrl);
        
        const response = await authenticatedFetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('🔍 Respuesta API FPL:', result);
        
        if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
          console.log(`✅ ${result.data.length} fechas FPL calculadas para RFC ${rfc}`);
          
          // El endpoint ya devuelve fechas calculadas en formato correcto
          // Formato: { value: "2025-06-30", label: "30-06-2025", count: 1, metadata: {...} }
          const fechasArray = result.data.map(item => {
            // Asegurar que tenemos value y label
            const fechaValue = item.value || item.fecha_fpl_calculada || item.fechaCalculada;
            const fechaLabel = item.label || item.fechaFormateada;
            
            // Si no hay label, usar el value directamente (ya está en formato YYYY-MM-DD)
            // Match the format used in PeriodDropdownCurpBased - just show YYYY-MM-DD
            let label = fechaLabel;
            if (!label && fechaValue) {
              // Normalize to YYYY-MM-DD format if needed
              try {
                if (fechaValue.includes && fechaValue.includes('T')) {
                  // If it's a timestamp, extract just the date part
                  label = fechaValue.split('T')[0];
                } else if (fechaValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  // Already in YYYY-MM-DD format
                  label = fechaValue;
                } else {
                  // Try to convert to YYYY-MM-DD
                  const fechaObj = new Date(fechaValue + 'T12:00:00');
                  if (!isNaN(fechaObj.getTime())) {
                    label = fechaObj.toISOString().split('T')[0];
                  } else {
                    label = fechaValue;
                  }
                }
              } catch (e) {
                label = fechaValue;
              }
            }
            
            // Use metadata from backend if available, otherwise create minimal metadata
            const metadata = item.metadata || {
              rfc: rfc,
              fecpla: item.fecpla,
              antiguedad: item.antiguedad_anos || item.antiguedad,
              originalFecpla: item.metadata?.originalFecpla || item.fecpla,
              originalAntiguedad: item.metadata?.originalAntiguedad || (item.antiguedad_anos || item.antiguedad)
            };
            
            return {
              value: fechaValue,
              label: label || fechaValue,
              count: item.count || 1,
              metadata: metadata
            };
          }).sort((a, b) => {
            // Ordenar por fecha (más reciente primero)
            return new Date(b.value) - new Date(a.value);
          });
          
          console.log(`📅 ${fechasArray.length} fechas FPL únicas procesadas:`, fechasArray);
          setFechasFPL(fechasArray);
          
          // Si no hay fecha seleccionada, seleccionar la primera (más reciente)
          // Pass the full object with metadata
          if (!selectedFecha && fechasArray.length > 0 && onFechaChange) {
            onFechaChange(fechasArray[0]);
          }
        } else {
          setFechasFPL([]);
          console.warn('No se encontraron fechas FPL calculadas para RFC:', rfc);
        }
      } catch (err) {
        console.error('Error loading fechas FPL:', err);
        setError(err.message);
        setFechasFPL([]);
      } finally {
        setLoading(false);
      }
    };

    loadFechasFPL();
  }, [rfc, curp]);

  const handleItemClick = (fecha) => {
    if (onFechaChange) {
      // Pass the full fecha object with metadata for reverse lookup
      onFechaChange(fecha);
    }
    setIsOpen(false);
  };

  const toggleDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  // Encontrar la fecha seleccionada para mostrar en el botón
  // selectedFecha can be null, a string (value), or an object with metadata
  const selectedFechaValue = selectedFecha && typeof selectedFecha === 'object' && selectedFecha.value 
    ? selectedFecha.value 
    : (selectedFecha || null);
  const selectedFechaObj = selectedFechaValue ? fechasFPL.find(f => f.value === selectedFechaValue) : null;
  const displayText = selectedFechaObj ? selectedFechaObj.label : placeholder;

  const showLoading = loading && fechasFPL.length === 0;
  const showError = error && !loading;
  const showEmpty = !loading && !error && fechasFPL.length === 0 && (rfc || curp);

  return (
    <DropdownContainer>
      <DropdownButton
        onClick={toggleDropdown}
        disabled={disabled}
        type="button"
        style={{ 
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1
        }}
      >
        <span>
          {showLoading ? 'Cargando fechas FPL...' : 
           showError ? `Error: ${error}` :
           showEmpty ? 'No hay fechas FPL disponibles' :
           displayText}
        </span>
        <DropdownArrow open={isOpen}>▼</DropdownArrow>
      </DropdownButton>

      {isOpen && !disabled && (
        <DropdownMenu>
          {loading ? (
            <LoadingText>Cargando fechas FPL...</LoadingText>
          ) : error ? (
            <LoadingText style={{ color: '#f87171' }}>Error: {error}</LoadingText>
          ) : fechasFPL.length === 0 ? (
            <LoadingText>No hay fechas FPL disponibles</LoadingText>
          ) : (
            fechasFPL.map((fecha, index) => (
              <DropdownItem
                key={fecha.value || index}
                onClick={() => handleItemClick(fecha)}
                className={(selectedFechaValue && fecha.value === selectedFechaValue) ? 'selected' : ''}
              >
                <span>{fecha.label}</span>
                {fecha.count && <CountBadge>{fecha.count}</CountBadge>}
              </DropdownItem>
            ))
          )}
        </DropdownMenu>
      )}
    </DropdownContainer>
  );
};

export default FechaFPLDropdownRFC;

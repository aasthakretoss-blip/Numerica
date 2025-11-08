import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

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
  selectedFecha, 
  onFechaChange, 
  placeholder = "Seleccionar fecha FPL...",
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fechasFPL, setFechasFPL] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar fechas FPL cuando cambie el RFC
  useEffect(() => {
    const loadFechasFPL = async () => {
      if (!rfc) {
        setFechasFPL([]);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        console.log('🔍 Cargando fechas FPL para RFC:', rfc);
        
        const response = await fetch(`https://numerica-2.onrender.com/api/payroll/fecpla-from-rfc?rfc=${encodeURIComponent(rfc)}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar fechas FPL');
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          console.log(`✅ ${result.data.length} fechas FPL cargadas para RFC ${rfc}`);
          setFechasFPL(result.data);
          
          // Si no hay fecha seleccionada, seleccionar la primera (más reciente)
          if (!selectedFecha && result.data.length > 0 && onFechaChange) {
            onFechaChange({
              fechaCalculada: result.data[0].value,
              metadata: result.data[0].metadata
            });
          }
        } else {
          setFechasFPL([]);
          console.warn('No se encontraron fechas FPL para RFC:', rfc);
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
  }, [rfc, selectedFecha, onFechaChange]);

  const handleItemClick = (fecha) => {
    if (onFechaChange) {
      // NUEVO: Pasar el objeto completo con metadatos originales
      onFechaChange({
        fechaCalculada: fecha.value,
        metadata: fecha.metadata
      });
    }
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (!disabled && !loading) {
      setIsOpen(!isOpen);
    }
  };

  // Encontrar la fecha seleccionada para mostrar en el botón
  // NUEVO: Manejar tanto objetos como strings en selectedFecha
  const getSelectedValue = () => {
    if (typeof selectedFecha === 'object' && selectedFecha?.fechaCalculada) {
      return selectedFecha.fechaCalculada;
    }
    return selectedFecha;
  };
  
  const selectedFechaValue = getSelectedValue();
  const selectedFechaObj = fechasFPL.find(f => f.value === selectedFechaValue);
  const displayText = selectedFechaObj ? selectedFechaObj.label : placeholder;

  const showLoading = loading && fechasFPL.length === 0;
  const showError = error && !loading;
  const showEmpty = !loading && !error && fechasFPL.length === 0 && rfc;

  return (
    <DropdownContainer>
      <DropdownButton
        onClick={toggleDropdown}
        disabled={disabled || loading}
        type="button"
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
                className={fecha.value === selectedFechaValue ? 'selected' : ''}
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

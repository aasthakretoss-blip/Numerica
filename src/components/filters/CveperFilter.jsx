import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FaChevronDown, FaCheck } from 'react-icons/fa';

const FilterContainer = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.strong || 'blur(20px)'};
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.2)'};
  margin-bottom: 2rem;
  width: 100%;
  box-sizing: border-box;
`;

const FilterTitle = styled.h3`
  color: ${props => props.theme?.text?.primary || '#2c3e50'};
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  opacity: 0.9;
`;

const DropdownContainer = styled.div`
  position: relative;
  width: 280px;
`;

const DropdownHeader = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.light || 'rgba(255, 255, 255, 0.1)'};
  border: 2px solid ${props => props.theme?.surfaces?.borders?.subtle || 'rgba(255, 255, 255, 0.15)'};
  border-radius: 12px;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.2s ease'};
  color: ${props => props.theme?.text?.primary || '#2c3e50'};
  font-weight: 500;
  
  &:hover {
    border-color: ${props => props.theme?.brand?.primary || '#a8edea'};
    background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  }
  
  ${props => props.$isOpen && `
    border-color: ${props.theme?.brand?.primary || '#a8edea'};
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  `}
`;

const DropdownArrow = styled(FaChevronDown)`
  transition: transform 0.2s ease;
  ${props => props.$isOpen && 'transform: rotate(180deg);'}
  opacity: 0.7;
`;

const DropdownList = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: ${props => props.theme?.surfaces?.glass?.strong || 'rgba(255, 255, 255, 0.2)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.strong || 'blur(20px)'};
  border: 2px solid ${props => props.theme?.brand?.primary || '#a8edea'};
  border-top: none;
  border-radius: 0 0 12px 12px;
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme?.surfaces?.borders?.subtle || 'rgba(255, 255, 255, 0.3)'};
    border-radius: 3px;
  }
`;

const DropdownItem = styled.div`
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  color: ${props => props.theme?.text?.primary || '#2c3e50'};
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.2s ease'};
  border-bottom: 1px solid ${props => props.theme?.surfaces?.borders?.subtle || 'rgba(255, 255, 255, 0.1)'};
  
  &:hover {
    background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const CheckIcon = styled(FaCheck)`
  color: ${props => props.theme?.brand?.primary || '#a8edea'};
  font-size: 0.9rem;
`;

const LoadingText = styled.div`
  color: ${props => props.theme?.text?.secondary || '#666'};
  font-style: italic;
  opacity: 0.7;
`;

const CveperFilter = ({ selectedCveper, onCveperChange, curp }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [cveperOptions, setCveperOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  // Fetch cveper options from API
  useEffect(() => {
    const fetchCveperOptions = async () => {
      if (!curp) return;
      
      setLoading(true);
      try {
        console.log('🔍 Cargando períodos para CURP:', curp);
        
        // Usar el endpoint de percepciones con CURP
        const params = new URLSearchParams({
          curp: curp,
          pageSize: '1000',
          page: '1'
        });
        
        const response = await fetch(`https://numerica-1.onrender.com/api/percepciones?${params.toString()}`);
        if (!response.ok) throw new Error('Error fetching data');
        
        const result = await response.json();
        
        if (!result.success || !result.data || result.data.length === 0) {
          setCveperOptions([]);
          return;
        }
        
        // Extraer períodos únicos del campo "Mes" y ordenar (más reciente primero)
        const uniqueCvepers = [...new Set(result.data.map(item => item['Mes']))]
          .filter(cveper => cveper) // Remover valores null/undefined
          .sort((a, b) => new Date(b) - new Date(a)); // Ordenar descendente
        
        console.log('🎯 Períodos encontrados para CURP:', curp, uniqueCvepers);
        setCveperOptions(uniqueCvepers);
        
        // Set default to most recent cveper if none selected
        if (!selectedCveper && uniqueCvepers.length > 0) {
          onCveperChange(uniqueCvepers[0]);
        }
        
      } catch (error) {
        console.error('Error fetching cveper options:', error);
        setCveperOptions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCveperOptions();
  }, [curp, selectedCveper, onCveperChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (cveper) => {
    onCveperChange(cveper);
    setIsOpen(false);
  };

  const formatCveperDisplay = (cveper) => {
    if (!cveper) return 'Seleccionar período';
    
    // Handle different cveper formats (string months vs dates)
    try {
      // If cveper is a month name in Spanish, return as is
      const monthNames = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 
                         'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      
      if (typeof cveper === 'string' && monthNames.includes(cveper.toUpperCase())) {
        return cveper.charAt(0).toUpperCase() + cveper.slice(1).toLowerCase();
      }
      
      // Try to parse as date
      const date = new Date(cveper);
      if (isNaN(date.getTime())) {
        // If not a valid date, return the original value
        return cveper;
      }
      
      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long'
      });
    } catch (error) {
      console.warn('Error formatting cveper:', cveper, error);
      return cveper || 'Período desconocido';
    }
  };

  return (
    <FilterContainer>
      <FilterTitle>Filtrar por Período</FilterTitle>
      <DropdownContainer ref={dropdownRef}>
        <DropdownHeader 
          onClick={() => setIsOpen(!isOpen)}
          $isOpen={isOpen}
        >
          <span>
            {loading 
              ? 'Cargando períodos...' 
              : formatCveperDisplay(selectedCveper)
            }
          </span>
          <DropdownArrow $isOpen={isOpen} />
        </DropdownHeader>
        
        {isOpen && (
          <DropdownList>
            {loading ? (
              <DropdownItem>
                <LoadingText>Cargando opciones...</LoadingText>
              </DropdownItem>
            ) : cveperOptions.length === 0 ? (
              <DropdownItem>
                <LoadingText>No hay períodos disponibles</LoadingText>
              </DropdownItem>
            ) : (
              cveperOptions.map((cveper, index) => (
                <DropdownItem
                  key={index}
                  onClick={() => handleItemClick(cveper)}
                >
                  <span>{formatCveperDisplay(cveper)}</span>
                  {selectedCveper === cveper && <CheckIcon />}
                </DropdownItem>
              ))
            )}
          </DropdownList>
        )}
      </DropdownContainer>
    </FilterContainer>
  );
};

export default CveperFilter;

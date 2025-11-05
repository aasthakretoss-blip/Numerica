import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import styled, { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';
import { FaChevronDown, FaChevronUp, FaSearch, FaTimes } from 'react-icons/fa';

const DropdownContainer = styled.div`
  position: relative;
  min-width: 250px;
  max-width: 300px;
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
  cursor: pointer;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.3s ease'};
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  box-shadow: ${props => props.theme?.effects?.shadows?.subtle || '0 2px 4px rgba(0, 0, 0, 0.1)'};
  
  &:hover {
    background: ${props => props.theme?.surfaces?.buttons?.filterHover || 'rgba(168, 237, 234, 0.1)'};
    border-color: ${props => props.theme?.surfaces?.borders?.accentStrong || 'rgba(168, 237, 234, 0.6)'};
    transform: translateY(-1px);
    box-shadow: ${props => props.theme?.effects?.shadows?.medium || '0 4px 8px rgba(0, 0, 0, 0.15)'};
    color: ${props => props.theme?.brand?.primary || '#a8edea'};
  }
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme?.brand?.primary || '#a8edea'};
    box-shadow: ${props => props.theme?.effects?.focusRing || '0 0 0 3px rgba(168, 237, 234, 0.2)'};
  }
  
  ${props => props.$isOpen && props.$openDirection === 'up' && `
    background: ${props.theme?.surfaces?.dark?.strong || 'rgba(0, 0, 0, 0.25)'};
    border-color: ${props.theme?.brand?.primary || '#a8edea'};
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    border-top-color: transparent;
    box-shadow: 0 0 0 1px ${props.theme?.brand?.primary || '#a8edea'};
    transform: none;
    color: ${props.theme?.brand?.primary || '#a8edea'};
  `}
  
  ${props => props.$isOpen && props.$openDirection === 'down' && `
    background: ${props.theme?.surfaces?.dark?.strong || 'rgba(0, 0, 0, 0.25)'};
    border-color: ${props.theme?.brand?.primary || '#a8edea'};
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-bottom-color: transparent;
    box-shadow: 0 0 0 1px ${props.theme?.brand?.primary || '#a8edea'};
    transform: none;
    color: ${props.theme?.brand?.primary || '#a8edea'};
  `}
`;

const DropdownLabel = styled.span`
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  
  ${props => props.$hasSelections && `
    color: ${props.theme?.brand?.primary || '#a8edea'};
    font-weight: 600;
  `}
`;

const ChevronIcon = styled.div`
  margin-left: 0.5rem;
  transition: transform 0.3s ease;
  color: ${props => props.theme?.text?.muted || 'rgba(255, 255, 255, 0.7)'};
  
  ${props => props.$isOpen && `
    transform: rotate(180deg);
    color: ${props.theme?.brand?.primary || '#a8edea'};
  `}
`;

const DropdownMenuPortal = styled.div`
  position: fixed !important;
  background: ${props => props.theme?.surfaces?.dark?.medium || 'rgba(0, 0, 0, 0.2)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.strong || 'blur(20px)'};
  border: 1px solid ${props => props.theme?.brand?.primary || '#a8edea'};
  box-shadow: ${props => props.theme?.effects?.shadows?.large || '0 8px 25px rgba(0, 0, 0, 0.25)'};
  z-index: 999999 !important;
  max-height: 400px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  ${props => props.$openDirection === 'up' ? `
    border-bottom: none;
    border-top: 1px solid ${props.theme?.brand?.primary || '#a8edea'};
    border-radius: 12px 12px 0 0;
  ` : `
    border-top: none;
    border-radius: 0 0 12px 12px;
  `}
  
  ${props => props.$isOpen ? `
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  ` : `
    opacity: 0;
    transform: translateY(-10px);
    pointer-events: none;
  `}
  
  transition: all 0.3s ease;
`;

const SearchContainer = styled.div`
  position: relative;
  padding: 0.75rem;
  border-bottom: 1px solid ${props => props.theme?.surfaces?.borders?.subtle || 'rgba(255, 255, 255, 0.1)'};
  background: ${props => props.theme?.surfaces?.dark?.subtle || 'rgba(0, 0, 0, 0.1)'};
`;

const SearchInput = styled.input`
  width: 100%;
  background: ${props => props.theme?.surfaces?.inputs?.background || 'rgba(255, 255, 255, 0.1)'};
  border: 1px solid ${props => props.theme?.surfaces?.borders?.medium || 'rgba(255, 255, 255, 0.2)'};
  border-radius: 8px;
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  color: ${props => props.theme?.text?.secondary || 'rgba(255, 255, 255, 0.9)'};
  font-size: 0.85rem;
  box-sizing: border-box;
  
  &::placeholder {
    color: ${props => props.theme?.text?.subtle || 'rgba(255, 255, 255, 0.6)'};
  }
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme?.brand?.primary || '#a8edea'};
    box-shadow: ${props => props.theme?.effects?.focusRing || '0 0 0 2px rgba(168, 237, 234, 0.2)'};
    background: ${props => props.theme?.surfaces?.inputs?.focus || 'rgba(255, 255, 255, 0.15)'};
  }
`;

const SearchIcon = styled(FaSearch)`
  position: absolute;
  left: 1.25rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${props => props.theme?.text?.subtle || 'rgba(255, 255, 255, 0.6)'};
  font-size: 0.8rem;
`;

const OptionsContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  background: transparent;
  
  /* Estilo del scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${props => props.theme?.surfaces?.glass?.subtle || 'rgba(255, 255, 255, 0.1)'};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme?.surfaces?.borders?.accentStrong || 'rgba(168, 237, 234, 0.6)'};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme?.brand?.primary || 'rgba(168, 237, 234, 0.8)'};
  }
`;

const OptionItem = styled.div`
  padding: 0.6rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: ${props => props.theme?.effects?.states?.transitionFast || 'all 0.2s ease'};
  border-bottom: 1px solid ${props => props.theme?.surfaces?.borders?.subtle || 'rgba(255, 255, 255, 0.1)'};
  
  &:hover {
    background: ${props => props.theme?.surfaces?.buttons?.filterHover || 'rgba(168, 237, 234, 0.1)'};
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: ${props => props.theme?.brand?.primary || '#a8edea'};
  cursor: pointer;
`;

const OptionLabel = styled.label`
  flex: 1;
  cursor: pointer;
  font-size: 0.85rem;
  color: ${props => props.theme?.text?.secondary || 'rgba(255, 255, 255, 0.9)'};
  line-height: 1.2;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const OptionCount = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme?.text?.secondary || 'rgba(255, 255, 255, 0.9)'};
  background: ${props => props.theme?.surfaces?.glass?.subtle || 'rgba(255, 255, 255, 0.1)'};
  padding: 0.15rem 0.4rem;
  border-radius: 10px;
  font-weight: 500;
`;

const NoOptionsMessage = styled.div`
  padding: 1rem 0.75rem;
  text-align: center;
  color: ${props => props.theme?.text?.muted || 'rgba(255, 255, 255, 0.7)'};
  font-size: 0.85rem;
  font-style: italic;
`;

const SelectedBadge = styled.span`
  background: ${props => props.theme?.surfaces?.buttons?.accentMedium || 'rgba(168, 237, 234, 0.2)'};
  color: ${props => props.theme?.brand?.primary || '#a8edea'};
  padding: 0.15rem 0.4rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 0.25rem;
`;

const ClearButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme?.text?.muted || 'rgba(255, 255, 255, 0.7)'};
  cursor: pointer;
  padding: 0.2rem;
  margin-left: 0.25rem;
  border-radius: 4px;
  transition: ${props => props.theme?.effects?.states?.transitionFast || 'all 0.2s ease'};
  
  &:hover {
    background: ${props => props.theme?.surfaces?.buttons?.accentMedium || 'rgba(168, 237, 234, 0.2)'};
    color: ${props => props.theme?.brand?.primary || '#a8edea'};
  }
`;

const DropDownMenu = ({
  label,
  options = [],
  selectedValues = [],
  onChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar opciones...",
  showCount = true,
  disabled = false,
  className = "",
  preserveOrder = false, // Nueva prop para mantener el orden original
  singleSelect = false, // Nueva prop para selección única
  maxSelections = null // Nueva prop para limitar número máximo de selecciones
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, openDirection: 'down' });
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  
  // NUEVO: Calcular si se debe ocultar la cardinalidad por volumen alto de datos
  const shouldHideCardinality = useMemo(() => {
    if (!showCount || !options.length) return false;
    
    // Calcular el total de registros sumando todos los conteos
    const totalRecords = options.reduce((sum, option) => sum + (option.count || 0), 0);
    
    // Ocultar cardinalidad si supera los 6000 registros
    const hideCardinality = totalRecords > 6000;
    
    if (hideCardinality) {
      console.log(`📊 Ocultando cardinalidad en ${label}: ${totalRecords.toLocaleString('es-MX')} registros (>6000)`);
    }
    
    return hideCardinality;
  }, [options, showCount, label]);

  // Filtrar y ordenar opciones (preservar orden original si se especifica)
  const filteredOptions = useMemo(() => {
    let filtered = options.filter(option => 
      option.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Solo ordenar alfabéticamente si no se especifica preserveOrder
    if (!preserveOrder) {
      filtered.sort((a, b) => a.value.localeCompare(b.value, 'es', { sensitivity: 'base' }));
    }
    // Si preserveOrder=true, mantener el orden original del backend
    
    return filtered;
  }, [options, searchTerm, preserveOrder]);

  // Generar el texto adicional para mostrar selecciones
  const selectionText = useMemo(() => {
    if (selectedValues.length === 0) {
      return null;
    }
    
    if (selectedValues.length <= 2) {
      return `: ${selectedValues.join(', ')}`;
    }
    
    return null; // Para 3+ selecciones, solo mostrar el badge de conteo
  }, [selectedValues]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        const portalElement = document.querySelector('[data-dropdown-portal="true"]');
        if (!portalElement || !portalElement.contains(event.target)) {
          setIsOpen(false);
          setSearchTerm('');
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Focus en el input de búsqueda cuando se abre
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Actualizar posición del dropdown cuando se hace scroll
  useEffect(() => {
    let rafId;
    let lastScrollTime = 0;
    
    const handleScrollOrResize = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      
      const now = Date.now();
      // Throttle para mejorar performance
      if (now - lastScrollTime < 16) { // ~60fps
        rafId = requestAnimationFrame(handleScrollOrResize);
        return;
      }
      
      lastScrollTime = now;
      
      rafId = requestAnimationFrame(() => {
        if (isOpen && dropdownRef.current) {
          // Verificar si el botón aún está visible en el viewport
          const buttonRect = dropdownRef.current.getBoundingClientRect();
          const isVisible = (
            buttonRect.bottom > 0 && 
            buttonRect.top < window.innerHeight &&
            buttonRect.right > 0 && 
            buttonRect.left < window.innerWidth
          );
          
          if (isVisible) {
            updateDropdownPosition();
          } else {
            // Si el botón no está visible, cerrar el dropdown
            setIsOpen(false);
          }
        }
      });
    };

    if (isOpen) {
      // Múltiples formas de capturar scroll para mayor compatibilidad
      document.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
      window.addEventListener('scroll', handleScrollOrResize, { passive: true });
      window.addEventListener('resize', handleScrollOrResize, { passive: true });
      
      // También escuchar en el elemento padre más cercano con scroll
      let scrollableParent = dropdownRef.current?.parentElement;
      while (scrollableParent && scrollableParent !== document.body) {
        const style = window.getComputedStyle(scrollableParent);
        if (style.overflow === 'auto' || style.overflow === 'scroll' || 
            style.overflowX === 'auto' || style.overflowX === 'scroll' ||
            style.overflowY === 'auto' || style.overflowY === 'scroll') {
          scrollableParent.addEventListener('scroll', handleScrollOrResize, { passive: true });
          break;
        }
        scrollableParent = scrollableParent.parentElement;
      }
      
      return () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
        document.removeEventListener('scroll', handleScrollOrResize, { capture: true });
        window.removeEventListener('scroll', handleScrollOrResize);
        window.removeEventListener('resize', handleScrollOrResize);
        
        // Limpiar listener del contenedor padre
        if (scrollableParent && scrollableParent !== document.body) {
          scrollableParent.removeEventListener('scroll', handleScrollOrResize);
        }
      };
    }
  }, [isOpen]);

  // Calcular posición del dropdown para conexión perfecta
  const updateDropdownPosition = () => {
    if (!dropdownRef.current) return;
    
    const buttonRect = dropdownRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.pageXOffset || document.documentElement.scrollLeft,
      scrollY: window.pageYOffset || document.documentElement.scrollTop
    };
    
    const maxDropdownHeight = 400;
    const bottomMargin = 20;
    const topMargin = 20;
    
    // Calcular espacio disponible
    const spaceBelow = viewport.height - buttonRect.bottom - bottomMargin;
    const spaceAbove = buttonRect.top - topMargin;
    
    // Determinar dirección óptima
    const shouldOpenUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    
    // Calcular dimensiones finales
    const availableHeight = shouldOpenUp ? spaceAbove : spaceBelow;
    const finalHeight = Math.min(maxDropdownHeight, Math.max(150, availableHeight));
    
    // Posición horizontal (asegurar que no se salga por los lados)
    const dropdownWidth = Math.max(buttonRect.width, 250);
    const leftPosition = Math.max(
      10, // Margen mínimo izquierdo
      Math.min(
        buttonRect.left + viewport.scrollX,
        viewport.width - dropdownWidth - 10 // Margen mínimo derecho
      )
    );
    
    if (shouldOpenUp) {
      const topPosition = buttonRect.top + viewport.scrollY - finalHeight + 1;
      setDropdownPosition({
        top: Math.max(topMargin + viewport.scrollY, topPosition),
        left: leftPosition,
        width: dropdownWidth,
        openDirection: 'up',
        maxHeight: finalHeight
      });
    } else {
      setDropdownPosition({
        top: buttonRect.bottom + viewport.scrollY - 1,
        left: leftPosition,
        width: dropdownWidth,
        openDirection: 'down',
        maxHeight: finalHeight
      });
    }
  };

  const toggleDropdown = () => {
    if (disabled) return;
    
    if (!isOpen) {
      updateDropdownPosition();
    }
    
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
    }
  };

  const handleOptionChange = (optionValue, isChecked) => {
    let newSelected;
    
    if (isChecked) {
      if (singleSelect) {
        // En modo selección única, reemplazar completamente
        newSelected = [optionValue];
      } else if (maxSelections && selectedValues.length >= maxSelections) {
        // Si hay límite máximo y ya se alcanzó, no permitir más selecciones
        return;
      } else {
        // Selección múltiple normal
        newSelected = [...selectedValues, optionValue];
      }
    } else {
      newSelected = selectedValues.filter(value => value !== optionValue);
    }
    
    onChange(newSelected);
  };

  const clearAll = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const preventClose = (e) => {
    e.stopPropagation();
  };

  const theme = useTheme();
  
  return (
    <StyledThemeProvider theme={theme}>
      <DropdownContainer ref={dropdownRef} className={className}>
        <DropdownButton
          onClick={toggleDropdown}
          $isOpen={isOpen}
          $openDirection={dropdownPosition.openDirection}
          disabled={disabled}
          type="button"
        >
          <DropdownLabel $hasSelections={selectedValues.length > 0}>
            {label}{selectionText}
            {selectedValues.length > 0 && (
              <SelectedBadge>{selectedValues.length}</SelectedBadge>
            )}
          </DropdownLabel>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {selectedValues.length > 0 && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll(e);
                }}
                title="Limpiar selección"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  marginLeft: '0.25rem',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(168, 237, 234, 0.2)';
                  e.target.style.color = '#a8edea';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                  e.target.style.color = 'rgba(255, 255, 255, 0.7)';
                }}
              >
                <FaTimes size={10} />
              </div>
            )}
            <ChevronIcon $isOpen={isOpen}>
              {isOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
            </ChevronIcon>
          </div>
        </DropdownButton>

        {isOpen && createPortal(
          <StyledThemeProvider theme={theme}>
            <DropdownMenuPortal 
              $isOpen={isOpen}
              $openDirection={dropdownPosition.openDirection}
              data-dropdown-portal="true"
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                maxHeight: dropdownPosition.maxHeight || 384
              }}
            >
              <SearchContainer onClick={preventClose}>
                <SearchIcon />
                <SearchInput
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </SearchContainer>

              <OptionsContainer>
                {filteredOptions.length === 0 && (
                  <NoOptionsMessage>
                    {searchTerm ? 'No se encontraron opciones' : 'No hay opciones disponibles'}
                  </NoOptionsMessage>
                )}
                
                {filteredOptions.map((option, index) => {
                  const isSelected = selectedValues.includes(option.value);
                  const isDisabled = !singleSelect && maxSelections && !isSelected && selectedValues.length >= maxSelections;
                  
                  return (
                    <OptionItem 
                      key={`${option.value}-${index}`} 
                      onClick={preventClose}
                      style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                      <Checkbox
                        type={singleSelect ? "radio" : "checkbox"}
                        name={singleSelect ? `${label}-radio` : undefined}
                        checked={isSelected}
                        disabled={isDisabled}
                        onChange={(e) => {
                          if (!isDisabled) {
                            handleOptionChange(option.value, e.target.checked);
                          }
                        }}
                      />
                      <OptionLabel>
                        <span>{option.value}</span>
                        {showCount && option.count !== undefined && !shouldHideCardinality && (
                          <OptionCount>{option.count.toLocaleString('es-MX')}</OptionCount>
                        )}
                      </OptionLabel>
                    </OptionItem>
                  );
                })}
              </OptionsContainer>
            </DropdownMenuPortal>
          </StyledThemeProvider>,
          document.body
        )}
      </DropdownContainer>
    </StyledThemeProvider>
  );
};

export default DropDownMenu;

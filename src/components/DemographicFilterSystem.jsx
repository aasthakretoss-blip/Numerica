/**
 * Sistema de filtros para el Dashboard Demográfico
 * Incluye los 3 dropdowns: Sucursal, Puesto, y Puesto Categorizado
 * Reutiliza funcionalidad de BusquedaEmpleados pero adaptada para el contexto demográfico
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaFilter, FaTimes, FaSpinner } from 'react-icons/fa';
import DropDownMenu from './DropDownMenu';
import { 
  loadDemographicFilterOptions, 
  loadDemographicFilterCounts, 
  hasFiltersChanged,
  calculateLatestPeriodFromDatabase 
} from '../services/demographicFiltersApi';

// Styled Components
const FilterContainer = styled.div`
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 1.5rem 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
`;

const FilterHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const FilterTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #1e3a8a;
  font-size: 1.2rem;
  font-weight: 500;
`;

const FilterControls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ClearAllButton = styled.button`
  background: rgba(231, 76, 60, 0.2);
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  color: #e74c3c;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: rgba(231, 76, 60, 0.3);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  
  @media (min-width: 1200px) {
    grid-template-columns: 1fr 1fr 1fr;  /* 3 columnas como originalmente */
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #1e3a8a;
  font-style: italic;
  gap: 0.75rem;
`;

const ActiveFiltersContainer = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
`;

const ActiveFilterLabel = styled.span`
  color: #1e3a8a;
  font-size: 0.9rem;
  font-weight: 500;
  margin-right: 0.5rem;
`;

const ActiveFilterBadge = styled.span`
  background: rgba(30, 58, 138, 0.2);
  color: #1e3a8a;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  border: 1px solid rgba(30, 58, 138, 0.3);
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const DemographicFilterSystem = ({
  onFiltersChange,
  periodFilter = null,
  disabled = false,
  showActiveFilters = true
}) => {
  // Estados para los filtros
  const [selectedSucursales, setSelectedSucursales] = useState([]);
  const [selectedPuestos, setSelectedPuestos] = useState([]);
  const [selectedPuestosCategorias, setSelectedPuestosCategorias] = useState([]);
  
  // Estados para las opciones de filtros
  const [staticFilterOptions, setStaticFilterOptions] = useState({
    sucursales: [],
    puestos: [],
    puestosCategorias: []
  });
  
  const [dynamicFilterOptions, setDynamicFilterOptions] = useState({
    sucursales: [],
    puestos: [],
    puestosCategorias: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Cargar opciones estáticas al montar el componente
  useEffect(() => {
    loadStaticOptions();
  }, []);
  
  // Recargar conteos dinámicos cuando cambien los filtros
  useEffect(() => {
    if (staticFilterOptions.sucursales.length > 0) {
      const activeFilters = {
        sucursales: selectedSucursales,
        puestos: selectedPuestos,
        puestosCategorias: selectedPuestosCategorias,
        periodFilter
      };
      
      loadDynamicCounts(activeFilters);
    }
  }, [selectedSucursales, selectedPuestos, selectedPuestosCategorias, periodFilter, staticFilterOptions.sucursales.length]);
  
  // Notificar cambios de filtros al componente padre (usando useCallback para evitar loops)
  useEffect(() => {
    if (onFiltersChange) {
      const filters = {
        sucursales: selectedSucursales,
        puestos: selectedPuestos,
        puestosCategorias: selectedPuestosCategorias,
        periodFilter
      };
      
      // Solo notificar si hay cambios reales
      const hasChanges = selectedSucursales.length > 0 || 
                        selectedPuestos.length > 0 || 
                        selectedPuestosCategorias.length > 0 || 
                        periodFilter !== null;
      
      console.log('🔄 DemographicFilterSystem - Evaluando notificación:', {
        filters,
        hasChanges,
        shouldNotify: true // Siempre notificamos para mantener sincronización
      });
      
      onFiltersChange(filters);
    }
  }, [selectedSucursales, selectedPuestos, selectedPuestosCategorias, periodFilter]); // Remover onFiltersChange de dependencies
  
  const loadStaticOptions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 DemographicFilterSystem: Cargando opciones estáticas...');
      const options = await loadDemographicFilterOptions();
      
      setStaticFilterOptions(options);
      setDynamicFilterOptions(options); // Inicialmente son las mismas
      
      console.log('✅ Opciones estáticas cargadas:', options);
    } catch (err) {
      console.error('❌ Error cargando opciones estáticas:', err);
      setError(err.message || 'Error al cargar opciones de filtros');
    } finally {
      setLoading(false);
    }
  };
  
  const loadDynamicCounts = async (activeFilters) => {
    try {
      console.log('🔄 Recargando conteos dinámicos...', activeFilters);
      const dynamicOptions = await loadDemographicFilterCounts(activeFilters);
      setDynamicFilterOptions(dynamicOptions);
    } catch (err) {
      console.error('❌ Error cargando conteos dinámicos:', err);
      // En caso de error, mantener las opciones estáticas
    }
  };
  
  const clearAllFilters = () => {
    console.log('🧹 Limpiando todos los filtros...');
    setSelectedSucursales([]);
    setSelectedPuestos([]);
    setSelectedPuestosCategorias([]);
  };
  
  const hasAnyFilters = () => {
    return selectedSucursales.length > 0 || 
           selectedPuestos.length > 0 || 
           selectedPuestosCategorias.length > 0;
  };
  
  const getTotalActiveFilters = () => {
    return selectedSucursales.length + selectedPuestos.length + selectedPuestosCategorias.length;
  };
  
  if (loading) {
    return (
      <FilterContainer>
        <LoadingContainer>
          <FaSpinner className="animate-spin" />
          <span>Cargando filtros demográficos...</span>
        </LoadingContainer>
      </FilterContainer>
    );
  }
  
  if (error) {
    return (
      <FilterContainer>
        <FilterHeader>
          <FilterTitle>
            <FaFilter />
            <span>Filtros Demográficos</span>
          </FilterTitle>
        </FilterHeader>
        <div style={{ color: '#e74c3c', textAlign: 'center', padding: '1rem' }}>
          ❌ {error}
        </div>
      </FilterContainer>
    );
  }

  return (
    <FilterContainer>
      <FilterHeader>
        <FilterTitle>
          <FaFilter />
          <span>Filtros Demográficos</span>
          {getTotalActiveFilters() > 0 && (
            <ActiveFilterBadge>
              {getTotalActiveFilters()} filtros activos
            </ActiveFilterBadge>
          )}
          {periodFilter && (
            <ActiveFilterBadge>
              📅 {periodFilter}
            </ActiveFilterBadge>
          )}
        </FilterTitle>
        <FilterControls>
          <ClearAllButton
            onClick={clearAllFilters}
            disabled={!hasAnyFilters() || disabled}
            title="Limpiar todos los filtros"
          >
            <FaTimes size={12} />
            Limpiar Filtros
          </ClearAllButton>
        </FilterControls>
      </FilterHeader>

      <FilterGrid>
        {/* Dropdown para Sucursales */}
        <DropDownMenu
          label="Sucursal"
          options={dynamicFilterOptions.sucursales.length > 0 ? dynamicFilterOptions.sucursales : staticFilterOptions.sucursales}
          selectedValues={selectedSucursales}
          onChange={setSelectedSucursales}
          placeholder="Todas las sucursales"
          searchPlaceholder="Buscar sucursal..."
          showCount={true}
          disabled={disabled}
        />

        {/* Dropdown para Puestos */}
        <DropDownMenu
          label="Puesto"
          options={dynamicFilterOptions.puestos.length > 0 ? dynamicFilterOptions.puestos : staticFilterOptions.puestos}
          selectedValues={selectedPuestos}
          onChange={setSelectedPuestos}
          placeholder="Todos los puestos"
          searchPlaceholder="Buscar puesto..."
          showCount={true}
          disabled={disabled}
        />

        {/* Dropdown para Puesto Categorizado */}
        <DropDownMenu
          label="Puesto Categorizado"
          options={dynamicFilterOptions.puestosCategorias.length > 0 ? dynamicFilterOptions.puestosCategorias : staticFilterOptions.puestosCategorias}
          selectedValues={selectedPuestosCategorias}
          onChange={setSelectedPuestosCategorias}
          placeholder="Todas las categorías"
          searchPlaceholder="Buscar categoría..."
          showCount={true}
          disabled={disabled}
        />
      </FilterGrid>

      {/* Mostrar filtros activos */}
      {showActiveFilters && hasAnyFilters() && (
        <ActiveFiltersContainer>
          <ActiveFilterLabel>Filtros activos:</ActiveFilterLabel>
          
          {selectedSucursales.map(sucursal => (
            <ActiveFilterBadge key={`sucursal-${sucursal}`}>
              🏢 {sucursal}
            </ActiveFilterBadge>
          ))}
          
          {selectedPuestos.map(puesto => (
            <ActiveFilterBadge key={`puesto-${puesto}`}>
              👷 {puesto}
            </ActiveFilterBadge>
          ))}
          
          {selectedPuestosCategorias.map(categoria => (
            <ActiveFilterBadge key={`categoria-${categoria}`}>
              🏷️ {categoria}
            </ActiveFilterBadge>
          ))}
        </ActiveFiltersContainer>
      )}
    </FilterContainer>
  );
};

export default DemographicFilterSystem;

import React, { useState, useEffect, useCallback } from 'react';
import styled, { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';
import { FaUsers, FaFilter, FaUser, FaTimes, FaDownload, FaEye, FaSpinner, FaTable, FaTh, FaCompressArrowsAlt, FaExpandArrowsAlt } from 'react-icons/fa';
import nominasApi from '../services/nominasApi.ts';
import { buildApiUrl } from '../config/apiConfig';
import { authenticatedFetch } from '../services/authenticatedFetch';
import EmployeeTable from '../components/EmployeeTable';
import DropDownMenu from '../components/DropDownMenu';
import EmployeeProfileDropDown from '../components/EmployeeProfileDropDown';
import BuscarEmpleado from '../components/BuscarEmpleado';
import EmployeeCompareGraph from '../components/EmployeeCompareGraph';
import { 
  groupPeriodsByMonth, 
  convertMonthSelectionsToCveper, 
  formatCveperForTable,
  PeriodOption 
} from '../utils/periodUtils.ts';

const PageContainer = styled.div`
  padding: 2rem 2rem 2rem 2rem;
  padding-right: calc(2rem - 10px); /* Reducir padding derecho para dar margen */
  color: ${props => props.theme?.text?.primary || '#2c3e50'};
  min-height: calc(100vh - 80px);
  max-width: calc(100vw - 10px); /* Dejar 10px de margen derecho */
  overflow-x: hidden;
  box-sizing: border-box;
`;

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  max-width: 100%;
`;

const PageTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 300;
  margin: 0;
  letter-spacing: 1px;
`;

const SearchSection = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.strong || 'blur(20px)'};
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  margin-right: 10px; /* Margen derecho de 10px */
  border: 1px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.2)'};
  width: calc(100% - 10px); /* Restar el margen del ancho */
  box-sizing: border-box;
  overflow: hidden;
`;

const SearchForm = styled.form`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 300px;
  background: ${props => props.theme?.surfaces?.inputs?.background || 'rgba(255, 255, 255, 0.1)'};
  border: 1px solid ${props => props.theme?.surfaces?.borders?.accent || 'rgba(30, 58, 138, 0.3)'};
  border-radius: 12px;
  padding: 1rem 1rem 1rem 3rem;
  color: ${props => props.theme?.text?.primary || '#2c3e50'};
  font-size: 1rem;
  position: relative;
  
  &::placeholder {
    color: ${props => props.theme?.text?.muted || 'rgba(44, 62, 80, 0.7)'};
  }
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme?.brand?.primary || '#1e3a8a'};
    background: ${props => props.theme?.surfaces?.inputs?.focus || 'rgba(255, 255, 255, 0.15)'};
    box-shadow: ${props => props.theme?.effects?.shadows?.focus || '0 0 20px rgba(30, 58, 138, 0.2)'};
  }
`;

const SearchInputContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 300px;
`;

const SearchIcon = styled(FaUsers)`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${props => props.theme?.text?.muted || 'rgba(44, 62, 80, 0.7)'};
`;

const FilterButton = styled.button`
  background: ${props => props.theme?.surfaces?.buttons?.filter || 'rgba(255, 255, 255, 0.1)'};
  border: 1px solid ${props => props.theme?.surfaces?.borders?.accent || 'rgba(30, 58, 138, 0.3)'};
  border-radius: 12px;
  padding: 1rem 1.5rem;
  color: ${props => props.theme?.brand?.primary || '#1e3a8a'};
  font-size: 1rem;
  cursor: pointer;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.2s ease'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: ${props => props.theme?.surfaces?.buttons?.filterHover || 'rgba(255, 255, 255, 0.15)'};
    transform: translateY(-2px);
  }
`;

const SearchButton = styled.button`
  background: ${props => props.theme?.gradients?.buttons?.primary || 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)'};
  border: none;
  border-radius: 12px;
  padding: 1rem 2rem;
  color: ${props => props.theme?.text?.primary || 'white'};
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.2s ease'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme?.effects?.shadows?.colored || '0 8px 25px rgba(30, 58, 138, 0.3)'};
  }
`;

const FiltersContainer = styled.div`
  display: ${props => props.$show ? 'flex' : 'none'};
  gap: 1rem;
  flex-wrap: wrap;
  position: relative;
  z-index: 1000;
  width: 100%;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const FilterSelect = styled.select`
  background: ${props => props.theme?.surfaces?.inputs?.background || 'rgba(255, 255, 255, 0.1)'};
  border: 1px solid ${props => props.theme?.surfaces?.borders?.medium || 'rgba(255, 255, 255, 0.3)'};
  border-radius: 8px;
  padding: 0.75rem;
  color: ${props => props.theme?.text?.primary || '#2c3e50'};
  font-size: 0.9rem;
  min-width: 150px;
  
  option {
    background: ${props => props.theme?.surfaces?.dark?.strong || '#2c3e50'};
    color: ${props => props.theme?.text?.primary || '#2c3e50'};
  }
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme?.brand?.primary || '#1e3a8a'};
  }
`;

const ResultsSection = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.strong || 'blur(20px)'};
  border-radius: 20px;
  padding: 2rem;
  margin-right: 10px; /* Margen derecho de 10px */
  border: 1px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.2)'};
  width: calc(100% - 10px); /* Restar el margen del ancho */
  box-sizing: border-box;
  overflow: hidden;
`;

const ResultsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const ResultsCount = styled.div`
  font-size: 1.1rem;
  opacity: 0.9;
`;

const ExportButton = styled.button`
  background: ${props => props.theme?.surfaces?.buttons?.success || 'rgba(76, 175, 80, 0.2)'};
  border: 1px solid ${props => props.theme?.surfaces?.borders?.success || 'rgba(76, 175, 80, 0.5)'};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: ${props => props.theme?.status?.success || '#4caf50'};
  font-size: 0.9rem;
  cursor: pointer;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.2s ease'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: ${props => props.theme?.surfaces?.buttons?.successHover || 'rgba(76, 175, 80, 0.3)'};
    transform: translateY(-2px);
  }
`;

const EmployeeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const EmployeeCard = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.light || 'rgba(255, 255, 255, 0.1)'};
  border: 1px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.2)'};
  border-radius: 15px;
  padding: 1.5rem;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.2s ease'};
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${props => props.theme?.effects?.shadows?.large || '0 10px 30px rgba(0, 0, 0, 0.3)'};
    background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  }
`;

const EmployeeHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const EmployeeAvatar = styled.div`
  width: 50px;
  height: 50px;
  background: ${props => props.theme?.gradients?.backgrounds?.secondary || 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)'};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.theme?.text?.inverted || 'white'};
  font-size: 1.2rem;
`;

const EmployeeInfo = styled.div`
  flex: 1;
`;

const EmployeeName = styled.h3`
  margin: 0 0 0.25rem 0;
  font-size: 1.2rem;
  color: ${props => props.theme?.brand?.primary || '#1e3a8a'};
`;

const EmployeePosition = styled.p`
  margin: 0;
  opacity: 0.8;
  font-size: 0.9rem;
  color: ${props => props.theme?.text?.secondary || 'rgba(44, 62, 80, 0.7)'};
`;

const EmployeeDetails = styled.div`
  margin-bottom: 1rem;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 0.5rem 0;
  font-size: 0.9rem;
`;

const DetailLabel = styled.span`
  opacity: 0.8;
`;

const DetailValue = styled.span`
  font-weight: 500;
`;

const EmployeeActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  background: ${props => props.primary ? 
    (props.theme?.gradients?.buttons?.primary || 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)') :
    (props.theme?.surfaces?.glass?.light || 'rgba(255, 255, 255, 0.1)')};
  border: 1px solid ${props => props.primary ? 
    'transparent' : 
    (props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.2)')};
  border-radius: 8px;
  padding: 0.5rem 1rem;
  color: ${props => props.theme?.text?.inverted || 'white'};
  font-size: 0.8rem;
  cursor: pointer;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.2s ease'};
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme?.effects?.shadows?.medium || '0 4px 15px rgba(0, 0, 0, 0.2)'};
  }
`;

const NoResults = styled.div`
  text-align: center;
  padding: 3rem;
  opacity: 0.7;
`;

const PeriodBadge = styled.div`
  background: ${props => props.theme?.surfaces?.buttons?.accentMedium || 'rgba(30, 58, 138, 0.2)'};
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
  margin-left: auto;
`;

const ControlsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: ${props => props.theme?.surfaces?.glass?.subtle || 'rgba(255, 255, 255, 0.05)'};
  border-radius: 12px;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.subtle || 'rgba(255, 255, 255, 0.1)'};
  flex-wrap: wrap;
  gap: 1rem;
`;

const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PageSizeSelect = styled.select`
  background: ${props => props.theme?.surfaces?.inputs?.background || 'rgba(255, 255, 255, 0.1)'};
  border: 1px solid ${props => props.theme?.surfaces?.borders?.medium || 'rgba(255, 255, 255, 0.3)'};
  border-radius: 8px;
  padding: 0.5rem;
  color: ${props => props.theme?.text?.primary || '#2c3e50'};
  font-size: 0.9rem;
  margin-right: 1rem;
  
  option {
    background: ${props => props.theme?.surfaces?.dark?.strong || '#2c3e50'};
  }
`;

const PaginationButton = styled.button`
  background: ${props => props.disabled ? 
    (props.theme?.surfaces?.glass?.subtle || 'rgba(255, 255, 255, 0.1)') :
    (props.theme?.surfaces?.buttons?.accentMedium || 'rgba(30, 58, 138, 0.2)')};
  border: 1px solid ${props => props.theme?.surfaces?.borders?.medium || 'rgba(255, 255, 255, 0.2)'};
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  color: ${props => props.disabled ? 
    (props.theme?.text?.subtle || 'rgba(44, 62, 80, 0.5)') :
    (props.theme?.text?.primary || '#2c3e50')};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: ${props => props.theme?.effects?.states?.transitionFast || 'all 0.2s ease'};
`;

const PageNumberButton = styled.button`
  background: ${props => props.$isCurrentPage ? 
    'white' :
    (props.theme?.surfaces?.buttons?.accentMedium || 'rgba(30, 58, 138, 0.2)')};
  border: ${props => props.$isCurrentPage ? 
    `2px solid ${props.theme?.brand?.primary || '#1e3a8a'}` :
    `1px solid ${props.theme?.surfaces?.borders?.medium || 'rgba(255, 255, 255, 0.2)'}`};
  border-radius: 8px;
  padding: 0.6rem 0.9rem;
  color: ${props => props.$isCurrentPage ? 
    (props.theme?.brand?.primary || '#1e3a8a') :
    (props.theme?.text?.secondary || 'rgba(44, 62, 80, 0.8)')};
  cursor: pointer;
  transition: ${props => props.theme?.effects?.states?.transitionFast || 'all 0.2s ease'};
  font-weight: ${props => props.$isCurrentPage ? '600' : '400'};
  font-size: 0.9rem;
  min-width: 40px;
  box-shadow: ${props => props.$isCurrentPage ? 
    (props.theme?.effects?.shadows?.colored || '0 4px 12px rgba(30, 58, 138, 0.4)') :
    'none'};
`;

const PageEllipsis = styled.span`
  color: ${props => props.theme?.text?.subtle || 'rgba(44, 62, 80, 0.5)'};
  padding: 0.5rem;
  font-size: 1.2rem;
`;

const PageInfo = styled.span`
  color: ${props => props.theme?.text?.muted || 'rgba(44, 62, 80, 0.7)'};
  font-size: 0.8rem;
  margin-left: 0.75rem;
`;

const StatsContainer = styled.div`
  text-align: center;
  flex: 0 1 auto;
  font-size: 1.1rem;
  opacity: 0.8;
  color: ${props => props.theme?.brand?.primary || '#1e3a8a'};
`;

const ViewButtonsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const ViewModeButton = styled(FilterButton)`
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  background: ${props => props.$isActive ? 
    (props.theme?.surfaces?.buttons?.accentStrong || 'rgba(30, 58, 138, 0.4)') :
    (props.theme?.surfaces?.buttons?.accentMedium || 'rgba(30, 58, 138, 0.2)')};
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 3rem;
`;

const LoadingSpinner = styled(FaSpinner)`
  color: ${props => props.theme?.brand?.primary || '#1e3a8a'};
  animation: spin 1s linear infinite;
`;

const LoadingText = styled.p`
  margin-top: 1rem;
  opacity: 0.8;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: 2rem;
  background: ${props => props.theme?.status?.error?.background || 'rgba(255, 107, 107, 0.1)'};
  border-radius: 12px;
  border: 1px solid ${props => props.theme?.status?.error?.border || 'rgba(255, 107, 107, 0.3)'};
  margin-bottom: 1rem;
`;

const ErrorIcon = styled(FaTimes)`
  color: ${props => props.theme?.status?.error?.text || '#ff6b6b'};
  margin-bottom: 0.5rem;
`;

const ErrorTitle = styled.h4`
  color: ${props => props.theme?.status?.error?.text || '#ff6b6b'};
  margin: 0.5rem 0;
`;

const ErrorMessage = styled.p`
  opacity: 0.8;
  margin: 0;
`;

const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  border-radius: 12px;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.subtle || 'rgba(255, 255, 255, 0.1)'};
  background: ${props => props.theme?.surfaces?.glass?.subtle || 'rgba(255, 255, 255, 0.02)'};
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.3s ease'};
  
  ${props => props.$collapsed && `
    /* Altura ajustada para mostrar headers + ~2-3 filas de datos */
    max-height: 180px;
    overflow: hidden;
    position: relative;
    
    /* Mantener headers siempre visibles */
    table {
      position: relative;
    }
    
    /* Asegurar que el header se mantenga en la parte superior */
    thead {
      position: sticky;
      top: 0;
      z-index: 10;
      background: ${props.theme?.surfaces?.buttons?.filter || 'rgba(255, 255, 255, 0.1)'};
      backdrop-filter: blur(10px);
    }
    
    /* Gradiente más sutil para no interferir con los headers */
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 30px;
      background: linear-gradient(transparent, ${props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'});
      pointer-events: none;
      z-index: 5;
    }
    
    /* Efecto adicional para indicar que hay más contenido abajo */
    &::before {
      content: '⋯';
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      color: ${props.theme?.text?.muted || 'rgba(44, 62, 80, 0.7)'};
      font-size: 1.2rem;
      font-weight: bold;
      z-index: 6;
      text-shadow: 0 0 4px ${props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
    }
  `}
`;

const CollapseButton = styled.button`
  background: ${props => props.theme?.surfaces?.buttons?.secondary || 'rgba(255, 255, 255, 0.1)'};
  border: 1px solid ${props => props.theme?.surfaces?.borders?.accent || 'rgba(30, 58, 138, 0.3)'};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: ${props => props.theme?.brand?.primary || '#1e3a8a'};
  font-size: 0.9rem;
  cursor: pointer;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.2s ease'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  
  &:hover {
    background: ${props => props.theme?.surfaces?.buttons?.secondaryHover || 'rgba(255, 255, 255, 0.15)'};
    transform: translateY(-2px);
    box-shadow: ${props => props.theme?.effects?.shadows?.medium || '0 4px 15px rgba(0, 0, 0, 0.1)'};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const BusquedaEmpleados = () => {
  const { theme } = useTheme(); // Obtener el theme del context
  
  // Debug: Verificar el estado del theme (solo si está incompleto)
  React.useEffect(() => {
    if (!theme || !theme.surfaces) {
      console.warn('⚠️ Theme incompleto en BusquedaEmpleados');
    }
  }, [theme?.surfaces]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState({
    puestos: '',
    status: '',
    categorias: ''
  });
  
  // Estados para los nuevos DropDownMenu (selección múltiple)
  const [selectedSucursales, setSelectedSucursales] = useState([]);
  const [selectedPuestos, setSelectedPuestos] = useState([]);
  const [selectedPuestosCategorias, setSelectedPuestosCategorias] = useState([]);
  const [selectedEstados, setSelectedEstados] = useState([]); // SIN FILTRO POR DEFECTO
  const [selectedPeriodos, setSelectedPeriodos] = useState([]); // Se poblará con el último período
  
  // Estado para el componente BuscarEmpleado
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  
  // Estados para sorting (server-side)
  const [sortBy, setSortBy] = useState('nombre'); 
  const [sortDir, setSortDir] = useState('asc');
  
  // Mapeo inverso: backend -> frontend (para sincronizar con EmployeeTable)
  const backendToFrontendFieldMapping = {
    'nombre': 'nombre',
    'curp': 'curp',
    'puesto': 'puesto',
    'sucursal': 'sucursal',
    'cveper': 'periodo',
    'SUELDO CLIENTE': 'salario',
    'COMISIONES CLIENTE': 'comisiones',
    'TOTAL DE PERCEPCIONES': 'percepcionesTotales',
    'estado': 'estado'
  };
  
  // Obtener el nombre frontend desde el nombre backend
  const getFrontendFieldName = (backendFieldName) => {
    return backendToFrontendFieldMapping[backendFieldName] || backendFieldName;
  };

  // Estados para la API
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
    total: 0,
    totalPages: 1
  });
  const [filterOptions, setFilterOptions] = useState({
    puestos: [],
    status: [],
    categorias: [],
    puestosCategorias: [], // Nuevo: categorías de puestos
    periodos: [] // Nuevo: periodos (cveper)
  });
  // NUEVO: Opciones estáticas completas (nunca se filtran, solo para mostrar en dropdown menus)
  const [staticFilterOptions, setStaticFilterOptions] = useState({
    puestos: [],
    status: [],
    categorias: [],
    puestosCategorias: [],
    periodos: []
  });
  // IMPORTANTE: Inicializar datasetStats con valores seguros desde el inicio
  const [datasetStats, setDatasetStats] = useState({
    totalRecords: 0,
    uniqueEmployees: 0,
    uniquePeriods: 0,
    statusDistribution: []
  });
  const [latestPeriod, setLatestPeriod] = useState(null);
  // NUEVO: Estado para CURPs únicos con filtros aplicados
  const [uniqueEmployeesCount, setUniqueEmployeesCount] = useState(0);
  const [viewMode, setViewMode] = useState('table'); // 'cards' o 'table'
  const [isTableCollapsed, setIsTableCollapsed] = useState(false); // Estado para contraer/expandir tabla
  const [defaultsApplied, setDefaultsApplied] = useState(false); // Control para aplicar valores por defecto una sola vez
  
  // NUEVO: Estados para manejo especial de períodos agrupados por mes
  const [groupedPeriodsStatic, setGroupedPeriodsStatic] = useState([]); // Períodos agrupados estáticos
  const [groupedPeriodsDynamic, setGroupedPeriodsDynamic] = useState([]); // Períodos agrupados con conteos dinámicos

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, []);
  
  // NUEVO: useEffect para marcar defaults como aplicados cuando las opciones estáticas estén cargadas
  useEffect(() => {
    if (!initialLoading && staticFilterOptions.status.length > 0 && !defaultsApplied) {
      console.log('🎯 Marcando defaults como aplicados - selectedEstados ya inicializado con:', selectedEstados);
      setDefaultsApplied(true);
    }
  }, [staticFilterOptions.status, defaultsApplied, initialLoading]);
  
  // Recargar SOLO conteos de filtros cuando cambien los filtros activos (no las opciones completas)
  // SOLO después de que se hayan aplicado los valores por defecto para evitar interferencias
  useEffect(() => {
    if (!initialLoading && defaultsApplied) {
      console.log('🔄 Recargando conteos de filtros (manteniendo opciones completas)');
      loadDynamicFilterCounts();
    }
  }, [selectedSucursales, selectedPuestos, selectedEstados, selectedPeriodos, selectedPuestosCategorias, employeeSearchTerm, initialLoading, defaultsApplied]); // Missing dependency: loadDynamicFilterCounts
  
  // NUEVO: Aplicar filtros inmediatamente cuando cambien (actualizar tabla en tiempo real)
  // SOLO después de que se hayan aplicado los valores por defecto Y cuando hay cambios reales
  useEffect(() => {
    if (!initialLoading && defaultsApplied) {
      console.log('🔄 FILTROS CAMBIARON - Actualizando tabla:', {
        selectedSucursales,
        selectedPuestos,
        selectedEstados,
        selectedPeriodos,
        selectedPuestosCategorias,
        employeeSearchTerm,
        initialLoading,
        defaultsApplied
      });
      const timeoutId = setTimeout(() => {
        loadEmployeesWithPagination(1, pagination.pageSize); // Reiniciar a página 1 con los nuevos filtros
        loadUniqueEmployeesCount(); // Calcular CURPs únicos con filtros actuales
      }, 300); // Debounce de 300ms para evitar demasiadas llamadas
      
      return () => clearTimeout(timeoutId);
    } else {
      console.log('🚫 NO ejecutando actualización de tabla:', {
        initialLoading,
        defaultsApplied,
        reason: !initialLoading && defaultsApplied ? 'Condiciones cumplidas' : 'Esperando inicialización'
      });
    }
  }, [selectedSucursales, selectedPuestos, selectedEstados, selectedPeriodos, selectedPuestosCategorias, employeeSearchTerm]); // Incluir selectedEstados para que reaccione a cambios de estado


  const loadInitialData = async () => {
    setInitialLoading(true);
    setError(null);

    try {
      // PRIMERO: Cargar último periodo disponible (no requiere conexión)
      await loadLatestPeriod();
      
      // SEGUNDO: Cargar opciones estáticas completas
      await loadStaticFilterOptions();
      
      // TERCERO: Aplicar valores por defecto
      await applyDefaultSelections();
      
      // CUARTO: Cargar empleados (datos principales)
      await loadEmployeesFromPayrollAPI();
      
      // QUINTO: Cargar estadísticas (opcional - puede fallar)
      try {
        await loadDatasetStats();
      } catch (statsError) {
        console.warn('⚠️ No se pudieron cargar estadísticas, usando valores por defecto:', statsError);
        // Las estadísticas ya están inicializadas con valores por defecto
      }
      
      // SEXTO: Luego cargar conteos dinámicos (opcional)
      try {
        await loadDynamicFilterCounts();
      } catch (countsError) {
        console.warn('⚠️ No se pudieron cargar conteos dinámicos:', countsError);
      }
      
      // SÉPTIMO: Calcular CURPs únicos con filtros por defecto
      try {
        await loadUniqueEmployeesCount();
      } catch (uniqueCountError) {
        console.warn('⚠️ No se pudo calcular empleados únicos:', uniqueCountError);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError(err.message || 'Error al cargar datos iniciales');
    } finally {
      setInitialLoading(false);
    }
  };
  
  // Cargar último periodo desde la API
  const loadLatestPeriod = async () => {
    try {
      const response = await authenticatedFetch(buildApiUrl('/api/payroll/periodos'));
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          // Filtrar solo valores válidos (fechas o meses agrupados)
          const validPeriods = result.data.filter(p => {
            const value = p.value || p;
            // Validar formato YYYY-MM-DD o YYYY-MM
            return value && typeof value === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(value);
          });
          
          if (validPeriods.length === 0) {
            console.warn('⚠️ No hay períodos válidos (formato YYYY-MM o YYYY-MM-DD) en la respuesta');
            setLatestPeriod(null);
            return;
          }
          
          // Ordenar períodos por fecha descendente y tomar el más reciente
          const sortedPeriods = validPeriods.sort((a, b) => {
            const dateA = new Date(a.value || a);
            const dateB = new Date(b.value || b);
            return dateB - dateA;
          });
          const latest = sortedPeriods[0];
          const latestValue = latest.value || latest;
          
          console.log('📅 BusquedaEmpleados - Último período encontrado:', latestValue);
          console.log('📅 Total períodos válidos encontrados:', validPeriods.length);
          setLatestPeriod(latestValue);
        } else {
          console.warn('⚠️ No hay períodos disponibles en la BD');
          setLatestPeriod(null); // No usar fallback inventado
        }
      } else {
        console.error('❌ Error HTTP cargando períodos:', response.status);
        setLatestPeriod(null); // No usar fallback inventado
      }
    } catch (error) {
      console.error('Error loading latest period:', error);
      setLatestPeriod(null); // No usar fallback inventado
    }
  };
  
  // Cargar estadísticas completas del dataset - SOLO Historic
  const loadDatasetStats = async () => {
    try {
      const response = await authenticatedFetch(`${buildApiUrl('/api/payroll/stats')}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText} - No se puede conectar a Historic`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Intentar primero result.stats, luego result.data como fallback
        const stats = result.stats || result.data || {
          totalRecords: 0,
          uniqueEmployees: 0,
          uniquePeriods: 0,
          statusDistribution: []
        };
        setDatasetStats(stats);
        console.log('📊 Estadísticas cargadas desde Historic:', stats);
      } else {
        throw new Error('Historic devolvió respuesta no exitosa');
      }
    } catch (error) {
      console.error('❌ Error conectando a Historic:', error);
      // Establecer valores por defecto en caso de error
      setDatasetStats({
        totalRecords: 0,
        uniqueEmployees: 0,
        uniquePeriods: 0,
        statusDistribution: []
      });
      // No re-lanzar el error para que la aplicación continue funcionando
      console.log('🔄 Usando estadísticas por defecto debido al error');
    }
  };

  // Cargar empleados SOLO desde Historic - usando filtros por defecto ya aplicados
  const loadEmployeesFromPayrollAPI = async () => {
    console.log('🎯 === CARGA INICIAL DE EMPLEADOS ===');
    console.log('📊 Aplicando filtros por defecto en carga inicial:', {
      selectedEstados: selectedEstados,
      defaultsApplied: defaultsApplied
    });
    
    setLoading(true);
    setError(null);

    try {
      // ESTRATEGIA CORREGIDA: Usar la misma lógica que loadEmployeesWithPagination
      // para aplicar los filtros por defecto desde el inicio
      await loadEmployeesWithPagination(1, pagination.pageSize);
      
      console.log('✅ Carga inicial completada usando filtros por defecto');
    } catch (err) {
      console.error('❌ Error en carga inicial de empleados:', err);
      throw err; // Re-lanzar el error para que se maneje arriba
    } finally {
      setLoading(false);
    }
  };
  
  // NUEVA ESTRATEGIA: Cargar opciones estáticas completas (nunca se filtran)
  const loadStaticFilterOptions = async () => {
    try {
      console.log('📊 Cargando opciones estáticas completas (sin filtros)...');
      
      // Llamar al endpoint SIN filtros para obtener TODAS las opciones disponibles
      const response = await authenticatedFetch(
        `${buildApiUrl('/api/payroll/filters')}`
      );
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // EXCEPCIÓN ESPECIAL: Procesar períodos para agrupar por meses
        const rawPeriodos = result.data.periodos || [];
        const groupedPeriods = groupPeriodsByMonth(rawPeriodos);
        
        // Guardar períodos agrupados estáticos
        setGroupedPeriodsStatic(groupedPeriods);
        
        // Convertir períodos agrupados al formato esperado por DropDownMenu
        const periodOptionsForDropdown = groupedPeriods.map(period => ({
          value: period.value, // YYYY-MM
          label: period.label, // "Octubre 24"
          count: period.count
        }));
        
        // Guardar opciones estáticas completas (estas NUNCA cambian)
        setStaticFilterOptions({
          puestos: result.data.puestos || [],
          status: result.data.estados || [],
          categorias: result.data.sucursales || [],
          puestosCategorias: result.data.puestosCategorias || [],
          periodos: periodOptionsForDropdown // Usar períodos agrupados
        });
        
        console.log('✅ Opciones estáticas cargadas:', {
          puestos: result.data.puestos?.length,
          estados: result.data.estados?.length, 
          sucursales: result.data.sucursales?.length,
          categorias: result.data.puestosCategorias?.length,
          periodos: periodOptionsForDropdown.length,
          periodosRaw: rawPeriodos.length,
          periodosAgrupados: groupedPeriods.length
        });
        
        console.log('📅 Ejemplo de períodos agrupados:', groupedPeriods.slice(0, 3));
      } else {
        throw new Error('La API devolvió una respuesta no exitosa');
      }
    } catch (error) {
      console.error('❌ Error cargando opciones estáticas:', error);
      // Fallback: cargar desde API legacy
      await loadFilterOptionsFromPayrollAPI();
    }
  };
  
  // NUEVA FUNCIÓN: Cargar solo conteos dinámicos (mantener opciones estáticas intactas)
  const loadDynamicFilterCounts = useCallback(async () => {
    try {
      console.log('🔢 Actualizando conteos dinámicos con filtros activos...');
      
      // Construir parámetros de filtros activos para la API
      const filterParams = new URLSearchParams();
      
      if (employeeSearchTerm && employeeSearchTerm.trim() !== '') {
        filterParams.append('search', employeeSearchTerm.trim());
      }
      
      if (selectedSucursales.length > 0) {
        selectedSucursales.forEach(sucursal => {
          filterParams.append('sucursal', sucursal);
        });
      }
      
      if (selectedPuestos.length > 0) {
        selectedPuestos.forEach(puesto => {
          filterParams.append('puesto', puesto);
        });
      }
      
      if (selectedEstados.length > 0) {
        selectedEstados.forEach(estado => {
          filterParams.append('status', estado);
        });
      }
      
      if (selectedPeriodos.length > 0) {
        console.log('🔄 Procesando selección de períodos en loadDynamicFilterCounts:', selectedPeriodos);
        
        // ESTRATEGIA MEJORADA: En lugar de enviar 26 valores individuales,
        // detectar si es un mes agrupado y enviar como filtro cveper en formato YYYY-MM
        selectedPeriodos.forEach(periodo => {
          // Si el formato es YYYY-MM (mes agrupado)
          if (/^\d{4}-\d{2}$/.test(periodo)) {
            console.log(`📅 Detectado mes agrupado: ${periodo}, usando filtro cveper por mes`);
            filterParams.append('cveper', periodo); // Enviar directamente en formato YYYY-MM
          } else {
            console.log(`📅 Detectado período individual: ${periodo}`);
            // Normalizar fecha individual antes de enviar
            const normalizedCveper = periodo.includes('T') || periodo.includes('Z') ? 
              new Date(periodo).toISOString().split('T')[0] : periodo;
            filterParams.append('cveper', normalizedCveper);
          }
        });
      }
      
      if (selectedPuestosCategorias.length > 0) {
        selectedPuestosCategorias.forEach(categoria => {
          filterParams.append('puestoCategorizado', categoria);
        });
      }
      
      // Llamar al endpoint de filtros CON parámetros para obtener conteos actualizados
      const response = await authenticatedFetch(
        `${buildApiUrl('/api/payroll/filters')}?${filterParams.toString()}`
      );
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // ESTRATEGIA CLAVE: Combinar opciones estáticas con conteos dinámicos
        const updateOptionsWithDynamicCounts = (staticOpts, dynamicOpts) => {
          if (!staticOpts || !dynamicOpts) return staticOpts || [];
          
          return staticOpts.map(staticOption => {
            const dynamicOption = dynamicOpts.find(dynOpt => dynOpt.value === staticOption.value);
            return {
              ...staticOption,
              count: dynamicOption ? dynamicOption.count : 0 // Actualizar conteo, mantener opción
            };
          });
        };
        
        // Actualizar filterOptions manteniendo TODAS las opciones pero con conteos actualizados
        setFilterOptions({
          puestos: updateOptionsWithDynamicCounts(staticFilterOptions.puestos, result.data.puestos),
          status: updateOptionsWithDynamicCounts(staticFilterOptions.status, result.data.estados),
          categorias: updateOptionsWithDynamicCounts(staticFilterOptions.categorias, result.data.sucursales),
          puestosCategorias: updateOptionsWithDynamicCounts(staticFilterOptions.puestosCategorias, result.data.puestosCategorias),
          periodos: updateOptionsWithDynamicCounts(staticFilterOptions.periodos, result.data.periodos)
        });
        
        console.log('✅ Conteos actualizados manteniendo opciones completas');
      } else {
        throw new Error('La API devolvió una respuesta no exitosa');
      }
    } catch (error) {
      console.error('❌ Error actualizando conteos dinámicos:', error);
      // En caso de error, mantener las opciones estáticas sin conteos actualizados
      console.log('🔄 Manteniendo opciones estáticas sin conteos actualizados');
    }
  }, [employeeSearchTerm, selectedSucursales, selectedPuestos, selectedEstados, selectedPeriodos, selectedPuestosCategorias, staticFilterOptions.puestos, staticFilterOptions.status, staticFilterOptions.categorias, staticFilterOptions.puestosCategorias, staticFilterOptions.periodos]);
  
  // NUEVA FUNCIÓN: Calcular CURPs únicos con filtros actuales (todas las páginas)
  const loadUniqueEmployeesCount = async () => {
    try {
      console.log('🔍 ========================================');
      console.log('🔍 INICIO: Calculando empleados únicos');
      console.log('🔍 ========================================');
      
      // ESTRATEGIA: Intentar endpoint dedicado, si no existe, calcular desde backend obteniendo todos los CURPs
      // Construir parámetros de filtros actuales (igual que loadEmployeesWithPagination)
      const params = new URLSearchParams();
      
      if (employeeSearchTerm && employeeSearchTerm.trim() !== '') {
        params.append('search', employeeSearchTerm.trim());
      }
      
      if (selectedPuestos.length > 0) {
        selectedPuestos.forEach(puesto => params.append('puesto', puesto));
      }
      
      if (selectedEstados.length > 0) {
        selectedEstados.forEach(estado => params.append('status', estado));
      }
      
      if (selectedSucursales.length > 0) {
        selectedSucursales.forEach(sucursal => params.append('sucursal', sucursal));
      }
      
      if (selectedPuestosCategorias.length > 0) {
        selectedPuestosCategorias.forEach(categoria => params.append('puestoCategorizado', categoria));
      }
      
      if (selectedPeriodos.length > 0) {
        selectedPeriodos.forEach(periodo => {
          if (/^\d{4}-\d{2}$/.test(periodo)) {
            params.append('cveper', periodo);
          } else {
            const normalizedCveper = periodo.includes('T') || periodo.includes('Z') ? 
              new Date(periodo).toISOString().split('T')[0] : periodo;
            params.append('cveper', normalizedCveper);
          }
        });
      }
      
      // ESTRATEGIA 1: Intentar endpoint dedicado (si existe)
      params.append('uniqueCurpsOnly', 'true');
      
      const uniqueCountUrl = `${buildApiUrl('/api/payroll/unique-count')}?${params.toString()}`;
      console.log('🌐 Intentando endpoint dedicado:', uniqueCountUrl);
      
      const uniqueCountResponse = await authenticatedFetch(uniqueCountUrl);
      
      if (uniqueCountResponse.ok) {
        const result = await uniqueCountResponse.json();
        if (result.success && result.uniqueCount !== undefined) {
          setUniqueEmployeesCount(result.uniqueCount);
          console.log('✅ Empleados únicos calculados desde endpoint dedicado:', result.uniqueCount);
          return; // Éxito, salir de la función
        }
      }
      
      // ESTRATEGIA 2: Endpoint no existe (404), calcular desde backend obteniendo solo CURPs únicos
      console.log('⚠️ Endpoint dedicado no disponible, usando estrategia de fallback...');
      
      // Remover uniqueCurpsOnly y agregar parámetros para obtener solo CURPs distintos
      const fallbackParams = new URLSearchParams();
      
      // Copiar todos los filtros
      if (employeeSearchTerm && employeeSearchTerm.trim() !== '') {
        fallbackParams.append('search', employeeSearchTerm.trim());
      }
      
      if (selectedPuestos.length > 0) {
        selectedPuestos.forEach(puesto => fallbackParams.append('puesto', puesto));
      }
      
      if (selectedEstados.length > 0) {
        selectedEstados.forEach(estado => fallbackParams.append('status', estado));
      }
      
      if (selectedSucursales.length > 0) {
        selectedSucursales.forEach(sucursal => fallbackParams.append('sucursal', sucursal));
      }
      
      if (selectedPuestosCategorias.length > 0) {
        selectedPuestosCategorias.forEach(categoria => fallbackParams.append('puestoCategorizado', categoria));
      }
      
      if (selectedPeriodos.length > 0) {
        selectedPeriodos.forEach(periodo => {
          if (/^\d{4}-\d{2}$/.test(periodo)) {
            fallbackParams.append('cveper', periodo);
          } else {
            const normalizedCveper = periodo.includes('T') || periodo.includes('Z') ? 
              new Date(periodo).toISOString().split('T')[0] : periodo;
            fallbackParams.append('cveper', normalizedCveper);
          }
        });
      }
      
      // Pedir solo campos CURP para optimizar la consulta
      fallbackParams.append('fields', 'curp');
      fallbackParams.append('pageSize', '100000'); // Solicitar un número grande para obtener todos
      
      const fallbackUrl = `${buildApiUrl('/api/payroll')}?${fallbackParams.toString()}`;
      console.log('🔄 Calculando desde endpoint principal:', fallbackUrl);
      
      const fallbackResponse = await authenticatedFetch(fallbackUrl);
      
      if (fallbackResponse.ok) {
        const result = await fallbackResponse.json();
        
        if (result.success && result.data) {
          // Contar CURPs únicos
          const uniqueCurps = new Set();
          result.data.forEach(emp => {
            const curp = emp.curp || emp.CURP || emp.curve || emp.rfc;
            if (curp && curp !== 'N/A' && curp.trim() !== '') {
              uniqueCurps.add(curp);
            }
          });
          
          const count = uniqueCurps.size;
          setUniqueEmployeesCount(count);
          console.log('✅ Empleados únicos calculados desde fallback:', count, '(de', result.data.length, 'registros)');
        } else {
          console.warn('⚠️ No se pudo calcular empleados únicos, usando 0');
          setUniqueEmployeesCount(0);
        }
      } else {
        console.error('❌ Error en fallback, usando 0');
        setUniqueEmployeesCount(0);
      }
      
      console.log('🔍 ========================================');
      console.log('🔍 FIN: Cálculo de empleados únicos');
      console.log('🔍 ========================================');
    } catch (error) {
      console.error('❌ ========================================');
      console.error('❌ ERROR COMPLETO en loadUniqueEmployeesCount:');
      console.error('❌ Mensaje:', error.message);
      console.error('❌ Stack:', error.stack);
      console.error('❌ Error completo:', error);
      console.error('❌ ========================================');
      setUniqueEmployeesCount(0);
    }
  };
  
  // NUEVA FUNCIÓN: Aplicar filtros demográficos por defecto
  const applyDefaultSelections = async () => {
    return new Promise((resolve) => {
      try {
        console.log('🎯 Aplicando filtros demográficos por defecto...');
        console.log('🔍 Estado actual antes de aplicar defaults:', {
          defaultsApplied,
          selectedEstados: selectedEstados,
          selectedPeriodos: selectedPeriodos,
          staticOptionsLoaded: staticFilterOptions.status.length,
          availableStatusOptions: staticFilterOptions.status.map(s => s?.value),
          latestPeriod
        });
        
        // FILTROS POR DEFECTO DEMOGRÁFICOS:
        // 1. Todas las sucursales (ya está por defecto - array vacío = todas)
        // 2. Todos los puestos (ya está por defecto - array vacío = todos)
        // 3. Solo empleados con estado 'A'
        // 4. Del último período cargado
        
        // Aplicar filtro de estado 'A' por defecto
        if (staticFilterOptions.status.length > 0) {
          const estadoA = staticFilterOptions.status.find(s => s.value === 'A');
          if (estadoA) {
            console.log('✅ Aplicando filtro por defecto: Estado A');
            setSelectedEstados(['A']);
          } else {
            console.log('⚠️ Estado A no encontrado en opciones disponibles:', staticFilterOptions.status.map(s => s.value));
          }
        }
        
        // Aplicar filtro de último período por defecto
        if (latestPeriod && staticFilterOptions.periodos.length > 0) {
          // Buscar el período más reciente en las opciones disponibles
          const periodos = staticFilterOptions.periodos;
          
          // Estrategia 1: Buscar por el latestPeriod exacto
          let periodoDefault = periodos.find(p => p.value === latestPeriod);
          
          // Estrategia 2: Si no se encuentra exacto, tomar el primer período (más reciente)
          if (!periodoDefault && periodos.length > 0) {
            periodoDefault = periodos[0]; // Primer elemento (más reciente)
          }
          
          if (periodoDefault) {
            console.log('✅ Aplicando filtro por defecto: Último período -', periodoDefault);
            setSelectedPeriodos([periodoDefault.value]);
          } else {
            console.log('⚠️ No se pudo determinar período por defecto:', {
              latestPeriod,
              periodosDisponibles: periodos.slice(0, 3).map(p => ({ value: p.value, label: p.label }))
            });
          }
        }
        
        console.log('✅ Filtros demográficos por defecto aplicados:', {
          sucursales: 'TODAS (sin filtro)',
          puestos: 'TODOS (sin filtro)', 
          estado: 'A (filtrado)',
          periodo: latestPeriod || 'MÁS RECIENTE (filtrado)'
        });
        
        // Marcar como aplicados
        setDefaultsApplied(true);
        console.log('🎯 Filtros demográficos por defecto completados');
        resolve();
      } catch (error) {
        console.error('❌ Error aplicando filtros por defecto:', error);
        // Marcar como aplicados incluso si hay error para no bloquear la app
        setDefaultsApplied(true);
        resolve();
      }
    });
  };
  
  // FUNCIÓN LEGACY: mantener para compatibilidad y fallback
  const loadFilterOptionsWithCardinality = async () => {
    try {
      console.log('🔍 Cargando filtros con cardinalidad (modo legacy)...');
      
      // Construir parámetros de filtros activos para la API
      const filterParams = new URLSearchParams();
      
      if (employeeSearchTerm && employeeSearchTerm.trim() !== '') {
        filterParams.append('search', employeeSearchTerm.trim());
      }
      
      if (selectedSucursales.length > 0) {
        selectedSucursales.forEach(sucursal => {
          filterParams.append('sucursal', sucursal);
        });
      }
      
      if (selectedPuestos.length > 0) {
        selectedPuestos.forEach(puesto => {
          filterParams.append('puesto', puesto);
        });
      }
      
      if (selectedEstados.length > 0) {
        selectedEstados.forEach(estado => {
          filterParams.append('status', estado);
        });
      }
      
      if (selectedPeriodos.length > 0) {
        filterParams.append('cveper', selectedPeriodos[0]); // Usar el primer período seleccionado
      }
      
      if (selectedPuestosCategorias.length > 0) {
        selectedPuestosCategorias.forEach(categoria => {
          filterParams.append('puestoCategorizado', categoria);
        });
      }
      
      // Llamar al nuevo endpoint de filtros
      const response = await authenticatedFetch(
        `${buildApiUrl('/api/payroll/filters')}?${filterParams.toString()}`
      );
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Actualizar las opciones de filtros con cardinalidad en tiempo real
        setFilterOptions({
          puestos: result.data.puestos || [],
          status: result.data.estados || [],
          categorias: result.data.sucursales || [], // sucursales
          puestosCategorias: result.data.puestosCategorias || [],
          periodos: result.data.periodos || []
        });
        
        console.log('✅ Filtros actualizados con cardinalidad en tiempo real:', {
          puestos: result.data.puestos?.length,
          estados: result.data.estados?.length, 
          sucursales: result.data.sucursales?.length,
          categorias: result.data.puestosCategorias?.length,
          periodos: result.data.periodos?.length
        });
      } else {
        throw new Error('La API devolvio una respuesta no exitosa');
      }
    } catch (error) {
      console.error('❌ Error cargando filtros con cardinalidad:', error);
      // Fallback: cargar filtros básicos
      await loadFilterOptionsFromPayrollAPI();
    }
  };
  
  // FUNCIÓN LEGACY: mantener para compatibilidad
  const loadFilterOptionsFromPayrollAPI = async () => {
    try {
      // Para las categorías de puestos, necesitamos obtener TODOS los datos de la base de datos
      // para calcular conteos globales reales, no solo datos paginados
      const [payrollResponse, categoriasResponse, allDataResponse, periodosResponse] = await Promise.all([
        authenticatedFetch(`${buildApiUrl('/api/payroll')}?pageSize=1000`), // Para opciones de filtros normales
        authenticatedFetch(`${buildApiUrl('/api/payroll/categorias-puestos')}`),
        authenticatedFetch(`${buildApiUrl('/api/payroll')}?pageSize=100000`), // Obtener TODOS los datos para conteos globales
        authenticatedFetch(`${buildApiUrl('/api/payroll/periodos')}`)
      ]);
      
      if (!payrollResponse.ok || !allDataResponse.ok) {
        throw new Error(`Error ${payrollResponse.status || allDataResponse.status}`);
      }
      
      const payrollResult = await payrollResponse.json();
      const allDataResult = await allDataResponse.json();
      const periodosResult = periodosResponse.ok ? await periodosResponse.json() : { success: true, data: [] };
      let categoriasResult = null;
      
      if (categoriasResponse.ok) {
        categoriasResult = await categoriasResponse.json();
      }
      
      if (payrollResult.success && allDataResult.success) {
        // Extraer valores únicos para filtros normales desde datos paginados
        const puestos = [...new Set(payrollResult.data.map(emp => emp.puesto).filter(Boolean))];
        const estados = [...new Set(payrollResult.data.map(emp => emp.estado).filter(Boolean))];
        const sucursales = [...new Set(payrollResult.data.map(emp => emp.sucursal).filter(Boolean))];
        
        const fallbackOptions = {
          puestos: puestos.map(p => ({ value: p, count: payrollResult.data.filter(emp => emp.puesto === p).length })),
          status: estados.map(s => ({ value: s, count: payrollResult.data.filter(emp => emp.estado === s).length })),
          categorias: sucursales.map(c => ({ value: c, count: payrollResult.data.filter(emp => emp.sucursal === c).length })),
          puestosCategorias: [], // Se cargará con el nuevo servicio
          periodos: (periodosResult.success ? periodosResult.data : []).map(p => ({ value: p.value, count: parseInt(p.count) || 0 }))
        };
        
        // Actualizar TANTO opciones dinámicas como estáticas en fallback
        setFilterOptions(fallbackOptions);
        setStaticFilterOptions(fallbackOptions);
        
        console.log('✅ Filtros básicos cargados (fallback) - opciones estáticas y dinámicas sincronizadas');
      }
    } catch (error) {
      console.error('Error loading filter options from payroll API:', error);
      // Fallback con categorías por defecto
      const defaultOptions = {
        puestos: [],
        status: [{ value: 'A', count: 0 }, { value: 'B', count: 0 }, { value: 'F', count: 0 }],
        categorias: [],
        puestosCategorias: [],
        periodos: []
      };
      
      // Actualizar TANTO opciones dinámicas como estáticas en fallback
      setFilterOptions(defaultOptions);
      setStaticFilterOptions(defaultOptions);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [puestosRes, statusRes, categoriasRes] = await Promise.all([
        nominasApi.getFilterOptions('puestos'),
        nominasApi.getFilterOptions('status'), 
        nominasApi.getFilterOptions('categorias')
      ]);

      setFilterOptions({
        puestos: puestosRes.data || [],
        status: statusRes.data || [],
        categorias: categoriasRes.data || []
      });
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadEmployees = async (searchFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const apiFilters = {
        periodo: latestPeriod ? [latestPeriod] : undefined,
        nombres: searchTerm ? [searchTerm] : undefined,
        puestos: filters.puestos ? [filters.puestos] : undefined,
        status: filters.status ? [filters.status] : undefined,
        categorias: filters.categorias ? [filters.categorias] : undefined,
        limit: pagination.limit,
        offset: 0,
        ...searchFilters
      };

      const response = await nominasApi.getEmployeesData(apiFilters);
      
      if (response.success) {
        // Transformar datos de la API al formato esperado por la UI
        const transformedEmployees = response.data.map((employee, index) => ({
          id: employee.nombre_completo + '_' + employee.curve + '_' + index,
          name: employee.nombre_completo,
          position: employee.puesto,
          department: employee.categoria_puesto,
          curve: employee.curve,
          status: employee.status,
          startDate: employee.fecha_ingreso,
          salary: employee.sueldo,
          commissions: employee.comisiones,
          totalCost: employee.costo_nomina,
          years: employee.antiguedad_anos,
          periodo: employee.periodo
        }));
        
        setEmployees(transformedEmployees);
        setPagination(response.pagination);
      } else {
        setError('Error al obtener datos de empleados');
      }
    } catch (err) {
      console.error('Error loading employees:', err);
      setError(err.message || 'Error al cargar datos de empleados');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async (e) => {
    if (e) e.preventDefault();
    await loadEmployeesWithFilters();
  }, [filters, selectedSucursales, selectedPuestos, selectedPuestosCategorias, selectedEstados, selectedPeriodos, employeeSearchTerm]);
  
  const loadEmployeesWithFilters = async () => {
    // Reiniciar a la primera página cuando se aplican filtros
    await loadEmployeesWithPagination(1, pagination.pageSize);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const exportResults = () => {
    if (employees.length === 0) {
      alert('No hay datos para exportar');
      return;
    }
    
    // Crear CSV
    const headers = ['Nombre', 'Puesto', 'Departamento', 'Curve', 'Estado', 'Fecha Ingreso', 'Salario', 'Años Antigüedad'];
    const csvContent = [
      headers.join(','),
      ...employees.map(emp => [
        emp.name,
        emp.position,
        emp.department,
        emp.curve,
        emp.status,
        emp.startDate,
        emp.salary,
        emp.years
      ].join(','))
    ].join('\n');
    
    // Descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `empleados_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const viewEmployee = (employee) => {
    alert(`Ver detalles de ${employee.name}\nCurve: ${employee.curve}\nPuesto: ${employee.position}`);
  };

  const editEmployee = (employee) => {
    alert(`Editar empleado ${employee.name}`);
  };

  // Handlers de paginación
  const handlePageChange = async (newPage) => {
    if (newPage === pagination.page) return;
    
    setPagination(prev => ({ ...prev, page: newPage }));
    await loadEmployeesWithPagination(newPage, pagination.pageSize);
  };

  const handlePageSizeChange = async (newPageSize) => {
    if (newPageSize === pagination.pageSize) return;
    
    setPagination(prev => ({ ...prev, page: 1, pageSize: newPageSize }));
    await loadEmployeesWithPagination(1, newPageSize);
  };

  // NUEVO: Handler para cambios de sorting del EmployeeTable
  const handleSortChange = useCallback(async (newSortBy, newSortDir) => {
    console.log('📨 BusquedaEmpleados.handleSortChange llamado:', { 
      from: { sortBy, sortDir }, 
      to: { sortBy: newSortBy, sortDir: newSortDir },
      pageSize: pagination.pageSize 
    });
    
    try {
      // IMPORTANTE: Enviar el campo directamente sin mapear
      // El backend ya tiene su propio mapping interno
      console.log('🗺️ Usando campo directamente (backend maneja mapping):', { field: newSortBy });
      
      // Actualizar el estado de sorting
      console.log('🔄 Actualizando estado de sorting...');
      setSortBy(newSortBy);
      setSortDir(newSortDir);
      
      // IMPORTANTE: Usar los nuevos valores directamente en la función
      // ya que setSortBy/setSortDir son asíncronos y podrían no estar actualizados
      console.log('🔄 Recargando datos con nuevo sorting...');
      
      // Crear la función inline para tener acceso a los valores actualizados
      const reloadWithNewSort = async () => {
        const params = new URLSearchParams();
        
        // Agregar filtros existentes
        if (employeeSearchTerm && employeeSearchTerm.trim() !== '') {
          params.append('search', employeeSearchTerm.trim());
        }
        
        if (selectedPuestos.length > 0) {
          selectedPuestos.forEach(puesto => params.append('puesto', puesto));
        } else if (filters.puestos) {
          params.append('puesto', filters.puestos);
        }
        
        if (selectedEstados.length > 0) {
          selectedEstados.forEach(estado => params.append('status', estado));
        } else if (filters.status) {
          params.append('status', filters.status);
        }
        
        if (selectedSucursales.length > 0) {
          selectedSucursales.forEach(sucursal => params.append('sucursal', sucursal));
        }
        
        if (selectedPuestosCategorias.length > 0) {
          selectedPuestosCategorias.forEach(categoria => params.append('puestoCategoria', categoria));
        }
        
        if (filters.categorias && selectedSucursales.length === 0) {
          params.append('sucursal', filters.categorias);
        }
        
      if (selectedPeriodos.length > 0) {
        console.log('🔄 Procesando selección de períodos en handleSortChange:', selectedPeriodos);
        
        // ESTRATEGIA UNIFICADA: Usar la misma lógica que loadEmployeesWithPagination
        selectedPeriodos.forEach(periodo => {
          // Si el formato es YYYY-MM (mes agrupado)
          if (/^\d{4}-\d{2}$/.test(periodo)) {
            console.log(`📅 Detectado mes agrupado: ${periodo}, usando filtro cveper por mes`);
            params.append('cveper', periodo); // Enviar directamente en formato YYYY-MM
          } else {
            console.log(`📅 Detectado período individual: ${periodo}`);
            // Normalizar fecha individual antes de enviar
            const normalizedCveper = periodo.includes('T') || periodo.includes('Z') ? 
              new Date(periodo).toISOString().split('T')[0] : periodo;
            params.append('cveper', normalizedCveper);
          }
        });
      }
        
        // Enviar campo directamente - el backend hace el mapping
        params.append('orderBy', newSortBy);
        params.append('orderDirection', newSortDir);
        
        // Paginación - reiniciar a página 1
        params.append('page', '1');
        params.append('pageSize', pagination.pageSize.toString());
        
        const finalUrl = `${buildApiUrl('/api/payroll')}?${params.toString()}`;
        console.log('🚀 Petición con nuevo sorting:', { url: finalUrl, field: newSortBy, direction: newSortDir });
        
        setLoading(true);
        const response = await authenticatedFetch(finalUrl);
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          // DEBUG: Ver primeros 3 registros del backend
          console.log('🚨 DEBUG: Primeros 3 registros del backend:', result.data.slice(0, 3).map(emp => ({
            nombre: emp.nombre,
            sueldo: emp.sueldo,
            comisiones: emp.comisiones,
            totalPercepciones: emp[' TOTAL DE PERCEPCIONES '] || emp.totalPercepciones
          })));
          
          const transformedEmployees = result.data.map((employee, index) => ({
            id: `${employee.rfc || 'emp_' + index}_${employee.periodo || employee.mes || 'periodo'}_${index}`,
            name: employee.nombre,
            position: employee.puesto,
            department: employee.sucursal,
            rfc: employee.rfc || 'N/A',
            curp: employee.curp || 'N/A',
            status: employee.estado,
            startDate: employee['fechaAntiguedad'] || employee['Fecha antigüedad'] || null,
            salary: (() => {
              const value = employee.sueldo;
              // CORRECCIÓN: Distinguir entre 0 válido y dato faltante
              if (value !== null && value !== undefined && value !== '') {
                const parsed = parseFloat(String(value).toString().replace(',', ''));
                if (!isNaN(parsed)) {
                  return parsed; // Incluir 0 como valor válido
                }
              }
              return null; // null para sorting correcto
            })(),
            commissions: (() => {
              const value = employee.comisiones;
              // CORRECCIÓN: Distinguir entre 0 válido y dato faltante
              if (value !== null && value !== undefined && value !== '') {
                const parsed = parseFloat(String(value).toString().replace(',', ''));
                if (!isNaN(parsed)) {
                  return parsed; // Incluir 0 como valor válido
                }
              }
              return null; // null para sorting correcto
            })(),
            ' TOTAL DE PERCEPCIONES ': (() => {
              // Probar múltiples posibles nombres del campo
              const candidates = [
                [' TOTAL DE PERCEPCIONES ', employee[' TOTAL DE PERCEPCIONES ']],
                ['totalPercepciones', employee.totalPercepciones],
                ['TOTAL DE PERCEPCIONES', employee['TOTAL DE PERCEPCIONES']],
                [' PERCEPCIONES TOTALES ', employee[' PERCEPCIONES TOTALES ']]
              ];
              const found = candidates.find(([k, v]) => v !== null && v !== undefined && v !== '');
              const value = found ? found[1] : undefined;
              
              // CORRECCIÓN: Distinguir entre 0 válido y dato faltante
              if (value !== null && value !== undefined) {
                const parsed = parseFloat(String(value).toString().replace(',', ''));
                if (!isNaN(parsed)) {
                  return parsed; // Incluir 0 como valor válido
                }
              }
              return null; // null para sorting correcto
            })(),
            years: null,
            periodo: (() => {
              // El backend devuelve 'periodo' que ya es DATE(cveper) en formato YYYY-MM-DD
              if (employee.periodo) {
                return employee.periodo;
              }
              // Fallback: intentar formatear cveper si periodo no está disponible
              const cveperFormatted = formatCveperForTable(employee.cveper);
              if (cveperFormatted && cveperFormatted !== '') {
                return cveperFormatted;
              }
              // Fallback a campo mes
              if (employee.mes) {
                return employee.mes;
              }
              // Último fallback
              return 'N/A';
            })()
          }));
          
          setEmployees(transformedEmployees);
          setPagination({
            page: result.pagination.page,
            pageSize: result.pagination.pageSize,
            total: result.pagination.total,
            totalPages: result.pagination.totalPages
          });
          
          console.log('✅ Datos actualizados con nuevo sorting:');
          console.log('- Total empleados:', transformedEmployees.length);
          console.log('- Primeros 5 nombres:', transformedEmployees.slice(0, 5).map(emp => emp.name));
          console.log('- Campo ordenado (' + newSortBy + '):', transformedEmployees.slice(0, 5).map(emp => {
            switch(newSortBy) {
              case 'nombre': return emp.name;
              case 'puesto': return emp.position;
              case 'sucursal': return emp.department;
              case 'salario': return emp.salary;
              case 'comisiones': return emp.commissions;
              case 'percepcionesTotales': return emp[' TOTAL DE PERCEPCIONES '];
              case 'curp': return emp.curp;
              default: return 'N/A';
            }
          }));
          console.log('- Dirección:', newSortDir);
        }
        setLoading(false);
      };
      
      await reloadWithNewSort();
      
    } catch (error) {
      console.error('❌ Error en handleSortChange:', error);
      setLoading(false);
    }
  }, [employeeSearchTerm, selectedPuestos, selectedEstados, selectedSucursales, selectedPuestosCategorias, filters, selectedPeriodos, pagination.pageSize]);

  // Función unificada para cargar empleados con paginación
  const loadEmployeesWithPagination = async (page = 1, pageSize = 50) => {
    console.log('🎯 === INICIANDO loadEmployeesWithPagination ===');
    console.log('📊 Estados actuales de filtros:', {
      selectedSucursales,
      selectedPuestos,
      selectedEstados,
      selectedPeriodos,
      selectedPuestosCategorias,
      employeeSearchTerm,
      page,
      pageSize
    });
    
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      // Agregar filtros si están definidos
      
      // Agregar búsqueda por nombre/CURP si está definida
      if (employeeSearchTerm && employeeSearchTerm.trim() !== '') {
        params.append('search', employeeSearchTerm.trim());
      }
      
      // Manejar selecciones múltiples de puestos del DropDownMenu
      if (selectedPuestos.length > 0) {
        // Si solo hay un puesto seleccionado, usar el parámetro simple
        if (selectedPuestos.length === 1) {
          params.append('puesto', selectedPuestos[0]);
        } else {
          // Para múltiples puestos, agregar cada uno como parámetro separado
          selectedPuestos.forEach(puesto => {
            params.append('puesto', puesto);
          });
        }
      }
      // Mantener compatibilidad con el filtro simple (si no se usa el DropDownMenu)
      else if (filters.puestos) {
        params.append('puesto', filters.puestos);
      }
      
      // Manejar selecciones múltiples de estados del DropDownMenu
      if (selectedEstados.length > 0) {
        // Si solo hay un estado seleccionado, usar el parámetro simple
        if (selectedEstados.length === 1) {
          params.append('status', selectedEstados[0]);
        } else {
          // Para múltiples estados, agregar cada uno como parámetro separado
          selectedEstados.forEach(estado => {
            params.append('status', estado);
          });
        }
      }
      // Mantener compatibilidad con el filtro simple (si no se usa el DropDownMenu)
      else if (filters.status) {
        params.append('status', filters.status);
      }
      
      // Manejar selecciones múltiples de sucursales del DropDownMenu
      if (selectedSucursales.length > 0) {
        // Si solo hay una sucursal seleccionada, usar el parámetro simple
        if (selectedSucursales.length === 1) {
          params.append('sucursal', selectedSucursales[0]);
        } else {
          // Para múltiples sucursales, agregar cada una como parámetro separado
          selectedSucursales.forEach(sucursal => {
            params.append('sucursal', sucursal);
          });
        }
      }
      
      // Manejar selecciones múltiples de categorías de puestos del DropDownMenu
      if (selectedPuestosCategorias.length > 0) {
        // Si solo hay una categoría seleccionada, usar el parámetro simple
        if (selectedPuestosCategorias.length === 1) {
          params.append('puestoCategorizado', selectedPuestosCategorias[0]);
        } else {
          // Para múltiples categorías, agregar cada una como parámetro separado
          selectedPuestosCategorias.forEach(categoria => {
            params.append('puestoCategorizado', categoria);
          });
        }
      }
      
      // Mantener compatibilidad con el filtro simple de categorías (si no se usa el DropDownMenu)
      if (filters.categorias && selectedSucursales.length === 0) {
        params.append('sucursal', filters.categorias);
      }
      
      // Manejar selección de periodos (cveper) con estrategia mejorada
      if (selectedPeriodos.length > 0) {
        console.log('🔄 Procesando selección de períodos en loadEmployeesWithPagination:', selectedPeriodos);
        
        // CORRECCIÓN: El filtro debe usar el campo cveper (fecha sin timestamp)
        // El backend espera cveper en formato YYYY-MM-DD o YYYY-MM para filtrar por mes
        selectedPeriodos.forEach(periodo => {
          // Si el formato es YYYY-MM (mes agrupado)
          if (/^\d{4}-\d{2}$/.test(periodo)) {
            console.log(`📅 Detectado mes agrupado: ${periodo}, filtrando cveper por mes`);
            params.append('cveper', periodo); // Enviar en formato YYYY-MM para filtrar por mes completo
          } else {
            console.log(`📅 Detectado período individual: ${periodo}`);
            // Normalizar fecha individual a YYYY-MM-DD
            const normalizedCveper = periodo.includes('T') || periodo.includes('Z') ? 
              new Date(periodo).toISOString().split('T')[0] : periodo;
            params.append('cveper', normalizedCveper);
          }
        });
      }
      
      // NUEVO: Parámetros de sorting para server-side sorting (matching server API)
      params.append('orderBy', sortBy);
      params.append('orderDirection', sortDir);
      
      // Paginación
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      
      // NUEVO: Agregar parámetro para solicitar datos completos con todos los campos
      params.append('fullData', 'true');
      params.append('includeAllFields', 'true');
      
      const finalUrl = `${buildApiUrl('/api/payroll')}?${params.toString()}`;
      console.log('🚀 PETICIÓN FINAL AL BACKEND (SOLICITANDO DATOS COMPLETOS):', {
        url: finalUrl,
        parametros: Object.fromEntries(params.entries()),
        sortBy, 
        sortDir,
        page,
        pageSize,
        totalParams: Array.from(params.entries()).length,
        fullDataRequested: true
      });
      
      console.log('🗺 Desglose de parámetros enviados:', Array.from(params.entries()));
      
      const response = await authenticatedFetch(finalUrl);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
        console.log('💬 RESPUESTA DEL BACKEND:', {
        success: result.success,
        dataLength: result.data ? result.data.length : 0,
        pagination: result.pagination,
        firstEmployee: result.data && result.data.length > 0 ? result.data[0] : null,
        primerosEmpleadosCveper: result.data && result.data.length > 0 ? 
          result.data.slice(0, 3).map(emp => ({ nombre: emp.nombre, cveper: emp.cveper, cveperType: typeof emp.cveper })) : []
      });
      
      console.log('🗓️ ANÁLISIS DETALLADO DE CVEPER:', {
        totalEmpleados: result.data ? result.data.length : 0,
        empleadosConCveper: result.data ? result.data.filter(emp => emp.cveper).length : 0,
        formatosCveper: result.data && result.data.length > 0 ? 
          [...new Set(result.data.filter(emp => emp.cveper).map(emp => {
            const cveper = emp.cveper;
            if (typeof cveper === 'string' && cveper.includes('T')) return 'ISO_TIMESTAMP';
            if (typeof cveper === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cveper)) return 'FECHA_YYYY-MM-DD';
            if (typeof cveper === 'string') return 'STRING_OTRO';
            return 'TIPO_' + typeof cveper;
          }))].slice(0, 5) : [],
        ejemplosCveper: result.data && result.data.length > 0 ? 
          result.data.filter(emp => emp.cveper).slice(0, 5).map(emp => emp.cveper) : []
      });
      
      if (result.success) {
        // ANÁLISIS EXHAUSTIVO DE TODOS LOS CAMPOS ANTES DE TRANSFORMAR
        console.log('🔬 ANÁLISIS COMPLETO DE DATOS RECIBIDOS:');
        console.log('📊 Total empleados recibidos:', result.data.length);
        
        if (result.data.length > 0) {
          // Analizar el primer empleado completo
          const firstEmployee = result.data[0];
          console.log('👤 PRIMER EMPLEADO COMPLETO:', {
            todasLasPropiedades: Object.keys(firstEmployee),
            datosCompletos: firstEmployee
          });
          
          // LOG EXHAUSTIVO: Ver cada propiedad individualmente
          console.log('🔎 PROPIEDADES INDIVIDUALES DEL PRIMER EMPLEADO:');
          Object.keys(firstEmployee).forEach(key => {
            console.log(`  - ${key}:`, firstEmployee[key], `(tipo: ${typeof firstEmployee[key]})`);
          });
          
          // Análisis específico de cveper en todos los empleados
          const cveperAnalysis = {
            totalEmpleados: result.data.length,
            conCveperDefined: result.data.filter(emp => emp.cveper !== undefined).length,
            conCveperNoNull: result.data.filter(emp => emp.cveper !== null).length,
            conCveperNoVacio: result.data.filter(emp => emp.cveper !== '').length,
            conCveperTruthy: result.data.filter(emp => emp.cveper).length,
            tiposDeCveper: [...new Set(result.data.map(emp => typeof emp.cveper))],
            ejemplosCveper: result.data.slice(0, 10).map((emp, i) => ({
              index: i,
              nombre: emp.nombre,
              cveper: emp.cveper,
              tipo: typeof emp.cveper,
              esNull: emp.cveper === null,
              esUndefined: emp.cveper === undefined
            }))
          };
          
          console.log('📋 ANÁLISIS DE CVEPER:', cveperAnalysis);
        }
        
        const transformedEmployees = result.data.map((employee, index) => {
          // Logging específico para análisis de campos de periodo
          const periodoOriginal = employee.periodo; // Fecha en formato YYYY-MM-DD del backend
          const mesOriginal = employee.mes;        // Nombre del mes
          const cveperTransformado = employee.periodo || ''; // Usar periodo directamente
          
          if (index < 5) { // Logging de análisis
            console.log(`📋 Transformación empleado ${index + 1}:`, {
              nombre: employee.nombre,
              // Campo periodo (fecha en formato YYYY-MM-DD)
              periodoOriginal: periodoOriginal,
              periodoTipo: typeof periodoOriginal,
              periodoLongitud: periodoOriginal ? periodoOriginal.length : 0,
              // Campo mes (nombre del mes)
              mesOriginal: mesOriginal,
              mesTipo: typeof mesOriginal,
              mesLongitud: mesOriginal ? mesOriginal.length : 0,
              // Resultado de transformación
              cveperTransformado: cveperTransformado,
              // Comparación
              usarMes: mesOriginal || 'N/A',
              usarPeriodo: periodoOriginal || 'N/A'
            });
            
            // NUEVO: Análisis específico de campos de salario
            console.log(`💰 ANÁLISIS DE CAMPOS DE SALARIO - Empleado ${index + 1}:`, {
              nombre: employee.nombre,
              // Todos los campos posibles de salario
              'SUELDO CLIENTE': employee['SUELDO CLIENTE'],
              ' SUELDO ': employee[' SUELDO '],
              'SUELDO': employee['SUELDO'],
              'sueldo': employee.sueldo,
              'sueldo_cliente': employee.sueldo_cliente,
              'sueldoCliente': employee.sueldoCliente,
              // Ver todos los campos que contienen 'suel' o 'SUEL'
              camposConSueldo: Object.keys(employee).filter(key => 
                key.toLowerCase().includes('suel') || key.toUpperCase().includes('SUEL')
              ).map(key => ({ [key]: employee[key] })),
              // DEBUGGING ESPECÍFICO: Verificar tipos y valores exactos
              'SUELDO CLIENTE - tipo': typeof employee['SUELDO CLIENTE'],
              'SUELDO CLIENTE - es null': employee['SUELDO CLIENTE'] === null,
              'SUELDO CLIENTE - es undefined': employee['SUELDO CLIENTE'] === undefined,
              'SUELDO CLIENTE - es 0': employee['SUELDO CLIENTE'] === 0,
              'SUELDO CLIENTE - es "0"': employee['SUELDO CLIENTE'] === '0',
              'SUELDO CLIENTE - es falsy': !employee['SUELDO CLIENTE'],
              'SUELDO CLIENTE - parseFloat': parseFloat(employee['SUELDO CLIENTE']),
              // Todos los campos disponibles
              todosLosCampos: Object.keys(employee),
              // CAMPOS CON VALORES NUMÉRICOS
              camposNumericos: Object.keys(employee).filter(key => {
                const value = employee[key];
                return !isNaN(parseFloat(value)) && isFinite(value) && parseFloat(value) > 0;
              }).map(key => ({ [key]: employee[key] })),
              // CAMPOS QUE PODRÍAN SER SALARIOS (contienen números grandes)
              posiblesSalarios: Object.keys(employee).filter(key => {
                const value = employee[key];
                const num = parseFloat(value);
                return !isNaN(num) && num > 1000; // Salarios típicamente > 1000
              }).map(key => ({ [key]: employee[key] })),
              // TODOS LOS CAMPOS Y SUS VALORES (para ver estructura completa)
              todosLosCamposYValores: Object.entries(employee).slice(0, 20) // Primeros 20 campos
            });
          }
          
          return {
            id: `${employee.rfc || employee['RFC'] || 'emp_' + index}_${employee.cveper || employee.mes || 'periodo'}_${index}`,
            name: employee.nombre || employee['Nombre completo'] || 'N/A',
            position: employee.puesto || employee['Puesto'] || 'N/A',
            department: employee.sucursal || employee['Sucursal'] || 'N/A',
            rfc: employee.rfc || employee['RFC'] || 'N/A',
            curp: employee.curp || employee['CURP'] || 'N/A',
            status: employee.estado || employee['Status'] || employee.status || 'N/A',
            startDate: employee['fechaAntiguedad'] || employee['Fecha antigüedad'] || employee['antiguedadFPL'] || null,
            salary: (() => {
              // Buscar salario en múltiples posibles claves devueltas por el backend
              const candidates = [
                ['salario', employee.salario],
                ['salary', employee.salary],
                ['sueldo', employee.sueldo],
                ['SUELDO CLIENTE', employee['SUELDO CLIENTE']],
                [' SUELDO CLIENTE', employee[' SUELDO CLIENTE']],
                ['SUELDO', employee['SUELDO']],
                [' SUELDO ', employee[' SUELDO ']]
              ];
              // CORRECCIÓN: No filtrar valores === 0, solo null/undefined/string vacía
              const found = candidates.find(([k, v]) => v !== null && v !== undefined && v !== '');
              const salarioValue = found ? found[1] : undefined;
              
              // LOG: Rastrear origen del valor de salario
              if (index < 3) {
                console.log(`💰 FRONTEND [${index + 1}] - Transformación de salary para ${employee.nombre || 'Sin nombre'}:`);
                console.log(`    - Campo usado: ${found ? found[0] : 'NINGUNO'}`);
                console.log(`    - Valor recibido: ${salarioValue} (tipo: ${typeof salarioValue})`);
                console.log(`    - Todos los campos del employee que contienen 'salar' o 'sueldo':`, 
                  Object.keys(employee).filter(k => k.toLowerCase().includes('salar') || k.toLowerCase().includes('sueldo'))
                    .reduce((obj, k) => ({...obj, [k]: employee[k]}), {}));
              }
              
              // CORRECCIÓN CRÍTICA: Distinguir entre 0 válido y dato faltante
              // Si el valor existe (incluso si es 0), parsearlo
              if (salarioValue !== null && salarioValue !== undefined) {
                const parsed = parseFloat(String(salarioValue).toString().replace(',', ''));
                if (!isNaN(parsed)) {
                  if (index < 3) console.log(`    - Valor final parseado: ${parsed} (incluyendo 0 si aplica)`);
                  return parsed; // Retornar número (incluyendo 0)
                }
              }
              
              // Si no hay dato, retornar null (no 'N/A' string) para que el sorting funcione correctamente
              if (index < 3) console.log(`    - Valor final: null (dato faltante, se mostrará como N/A en tabla)`);
              return null; // null permite sorting correcto, tabla mostrará 'N/A'
            })(),
            commissions: (() => {
              // El backend ya calcula la suma: COMISIONES CLIENTE + COMISIONES FACTURADAS
              const comisionesTotal = employee.comisiones || employee.commissions;
              
              // CORRECCIÓN CRÍTICA: Distinguir entre 0 válido y dato faltante
              if (comisionesTotal !== null && comisionesTotal !== undefined) {
                const parsed = parseFloat(String(comisionesTotal).toString().replace(',', ''));
                if (!isNaN(parsed)) {
                  return parsed; // Retornar número (incluyendo 0 si aplica)
                }
              }
              return null; // null permite sorting correcto, tabla mostrará 'N/A'
            })(),
            comisionesCliente: parseFloat(employee.comisionesCliente || 0),
            comisionesFacturadas: parseFloat(employee.comisionesFacturadas || 0),
            ' TOTAL DE PERCEPCIONES ': (() => {
              // USAR SOLO EL CAMPO EXACTO DE LA BASE DE DATOS: ' TOTAL DE PERCEPCIONES '
              // Probar múltiples posibles nombres del campo
              const candidates = [
                [' TOTAL DE PERCEPCIONES ', employee[' TOTAL DE PERCEPCIONES ']],
                ['totalPercepciones', employee.totalPercepciones],
                ['TOTAL DE PERCEPCIONES', employee['TOTAL DE PERCEPCIONES']],
                [' PERCEPCIONES TOTALES ', employee[' PERCEPCIONES TOTALES ']]
              ];
              // CORRECCIÓN: No filtrar valores === 0, solo null/undefined/string vacía
              const found = candidates.find(([k, v]) => v !== null && v !== undefined && v !== '');
              const value = found ? found[1] : undefined;
              
              // CORRECCIÓN CRÍTICA: Distinguir entre 0 válido y dato faltante
              if (value !== null && value !== undefined) {
                const parsed = parseFloat(String(value).toString().replace(',', ''));
                if (!isNaN(parsed)) {
                  return parsed; // Retornar número (incluyendo 0 si aplica)
                }
              }
              return null; // null permite sorting correcto, tabla mostrará 'N/A'
            })(),
            costoNomina: (() => {
              // LOG: Ver TODOS los campos disponibles
              if (index < 3) {
                console.log(`💰 COSTO DE NOMINA - Empleado ${index + 1}:`, {
                  nombre: employee.nombre,
                  todosLosCampos: Object.keys(employee),
                  camposConCosto: Object.keys(employee).filter(k => 
                    k.toLowerCase().includes('costo') || k.toUpperCase().includes('COSTO')
                  ).map(k => ({ [k]: employee[k] })),
                  empleadoCompleto: employee
                });
              }
              
              // Mapear el campo COSTO DE NOMINA desde el backend
              const candidates = [
                ['costoNomina', employee.costoNomina],
                ['COSTO DE NOMINA', employee['COSTO DE NOMINA']],
                [' COSTO DE NOMINA ', employee[' COSTO DE NOMINA ']],
                ['COSTO_DE_NOMINA', employee['COSTO_DE_NOMINA']],
                ['costodenomina', employee.costodenomina],
                ['costo_nomina', employee.costo_nomina],
                ['costo', employee.costo]
              ];
              const found = candidates.find(([k, v]) => v !== null && v !== undefined && v !== '');
              const value = found ? found[1] : undefined;
              
              if (index < 3) {
                console.log(`💰 COSTO DE NOMINA - Resultado búsqueda:`, {
                  candidatosEncontrados: found ? found[0] : 'NINGUNO',
                  valorEncontrado: value
                });
              }
              
              if (value !== null && value !== undefined) {
                const parsed = parseFloat(String(value).toString().replace(',', ''));
                if (!isNaN(parsed)) {
                  return parsed;
                }
              }
              return 0; // Devolver 0 en lugar de 'N/A' para campos numéricos
            })(),
            years: null,
            periodo: (() => {
              // CORREGIDO: Usar directamente el campo 'periodo' que viene del backend (DATE(cveper))
              if (employee.periodo) {
                return employee.periodo; // Ya viene en formato YYYY-MM-DD desde el backend
              }
              // Fallback: intentar formatear cveper si periodo no existe
              // EXTRAER VALOR: Si cveper es un objeto, extraer el valor correcto
              const cveperValue = typeof employee.cveper === 'object' && employee.cveper !== null
                ? (employee.cveper.value || employee.cveper.fecha || employee.cveper.date || employee.cveper.cveper)
                : employee.cveper;
              
              const cveperFormatted = formatCveperForTable(cveperValue);
              if (cveperFormatted && cveperFormatted !== '') {
                return cveperFormatted;
              }
              // Último fallback
              return 'N/A';
            })()
          };
        });
        
        console.log('✅ EMPLEADOS TRANSFORMADOS:', {
          originalCount: result.data.length,
          transformedCount: transformedEmployees.length,
          firstTransformed: transformedEmployees[0] || null
        });
        
        setEmployees(transformedEmployees);
        setPagination({
          page: result.pagination.page,
          pageSize: result.pagination.pageSize,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages
        });
      } else {
        console.log('❌ Backend devolvió success: false');
        setError('Error al obtener datos de empleados');
      }
    } catch (err) {
      console.error('Error loading employees with pagination:', err);
      setError(err.message || 'Error al cargar datos de empleados');
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading inicial
  if (initialLoading) {
    return (
      <StyledThemeProvider theme={theme}>
        <PageContainer>
        <PageHeader>
          <FaUsers size={40} color={theme?.brand?.primary || '#1e3a8a'} />
          <PageTitle>Búsqueda de Empleados</PageTitle>
        </PageHeader>
        <LoadingContainer>
          <LoadingSpinner size={48} />
          <h3 style={{ marginTop: '1rem', color: theme?.brand?.primary || '#1e3a8a' }}>Cargando sistema de búsqueda...</h3>
          <LoadingText>Obteniendo datos de empleados y opciones de filtro</LoadingText>
        </LoadingContainer>
        </PageContainer>
      </StyledThemeProvider>
    );
  }

  return (
    <StyledThemeProvider theme={theme}>
      <PageContainer>
        <PageHeader>
          <FaUsers size={40} color={theme?.brand?.primary || '#1e3a8a'} />
          <PageTitle>Búsqueda de Empleados</PageTitle>
          {latestPeriod && (
            <PeriodBadge>
              Período: {latestPeriod}
            </PeriodBadge>
          )}
        </PageHeader>

      <SearchSection>
        <FiltersContainer $show={true}>
          {/* Componente BuscarEmpleado */}
          <BuscarEmpleado
            placeholder="Nombre / CURP"
            value={employeeSearchTerm}
            onChange={setEmployeeSearchTerm}
          />
          
          {/* DropDownMenu para Sucursales - USAR OPCIONES ESTÁTICAS */}
          <DropDownMenu
            label="Sucursal"
            options={staticFilterOptions.categorias.length > 0 ? staticFilterOptions.categorias : filterOptions.categorias}
            selectedValues={selectedSucursales}
            onChange={setSelectedSucursales}
            placeholder="Todas las sucursales"
            searchPlaceholder="Buscar sucursal..."
            showCount={true}
          />
          
          {/* DropDownMenu para Puestos - USAR OPCIONES ESTÁTICAS */}
          <DropDownMenu
            label="Puesto"
            options={staticFilterOptions.puestos.length > 0 ? staticFilterOptions.puestos : filterOptions.puestos}
            selectedValues={selectedPuestos}
            onChange={setSelectedPuestos}
            placeholder="Todos los puestos"
            searchPlaceholder="Buscar puesto..."
            showCount={true}
          />
          
          {/* DropDownMenu para Puesto Categorizado - USAR OPCIONES ESTÁTICAS */}
          <DropDownMenu
            label="Puesto Categorizado"
            options={staticFilterOptions.puestosCategorias.length > 0 ? staticFilterOptions.puestosCategorias : filterOptions.puestosCategorias}
            selectedValues={selectedPuestosCategorias}
            onChange={setSelectedPuestosCategorias}
            placeholder="Todas las categorías"
            searchPlaceholder="Buscar categoría..."
            showCount={true}
          />
          
          {/* DropDownMenu para Estados - USAR OPCIONES ESTÁTICAS */}
          <DropDownMenu
            label="Estado"
            options={staticFilterOptions.status.length > 0 ? staticFilterOptions.status : filterOptions.status}
            selectedValues={selectedEstados}
            onChange={setSelectedEstados}
            placeholder="Todos los estados"
            searchPlaceholder="Buscar estado..."
            showCount={true}
          />

          {/* Dropdown especializado para Periodo - usa EmployeeProfileDropDown para perfil de empleado */}
          {employeeSearchTerm && employeeSearchTerm.trim() !== '' ? (
            /* EmployeeProfileDropDown para perfil empleado - muestra día, mes y año */
            <EmployeeProfileDropDown
              label="Periodo (Perfil Empleado)"
              options={staticFilterOptions.periodos.length > 0 ? staticFilterOptions.periodos : filterOptions.periodos}
              selectedValues={selectedPeriodos}
              onChange={setSelectedPeriodos}
              placeholder="Seleccionar período..."
              searchPlaceholder="Buscar período..."
              showCount={true}
              curp={employeeSearchTerm.trim()}
              autoSelectLatest={true}
              onPeriodsLoaded={(periods) => {
                console.log('📅 Períodos cargados para el perfil del empleado:', periods);
              }}
            />
          ) : (
            /* DropDownMenu normal para búsqueda general - muestra solo mes y año */
            <DropDownMenu
              label="Periodo"
              options={staticFilterOptions.periodos.length > 0 ? staticFilterOptions.periodos : filterOptions.periodos}
              selectedValues={selectedPeriodos}
              onChange={setSelectedPeriodos}
              placeholder="Todos los periodos"
              searchPlaceholder="Buscar periodo..."
              showCount={true}
              preserveOrder={true}
            />
          )}
        </FiltersContainer>
      </SearchSection>

      <ResultsSection>
        {/* Nueva estructura: Una sola fila con paginación (izquierda), estadisticas (centro) y botones (derecha) */}
        <ControlsContainer>
          
          {/* Sistema de paginación expandido */}
          <PaginationContainer>
            {/* Selector de tamaño de página */}
            <PageSizeSelect 
              value={pagination.pageSize} 
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
            >
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
              <option value={250}>250 por página</option>
              <option value={500}>500 por página</option>
              <option value={1000}>1,000 por página</option>
            </PageSizeSelect>
            
            {/* Sistema de navegación expandido */}
            <PaginationButton 
              onClick={() => handlePageChange(1)}
              disabled={pagination.page <= 1}
              title="Primera página"
            >
              «
            </PaginationButton>
            
            <PaginationButton 
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              title="Página anterior"
            >
              ‹
            </PaginationButton>
            
            {/* Páginas numeradas expandidas */}
            {(() => {
              const { page, totalPages } = pagination;
              const pages = [];
              
              // Lógica para mostrar páginas con elipsis
              const maxVisiblePages = 7; // Aumentado de 5 a 7 al tener más espacio
              
              if (totalPages <= maxVisiblePages) {
                // Si hay pocas páginas, mostrar todas
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i);
                }
              } else {
                // Páginas complejas con elipsis
                if (page <= 4) {
                  // Cerca del inicio
                  for (let i = 1; i <= 5; i++) pages.push(i);
                  pages.push('...');
                  pages.push(totalPages);
                } else if (page >= totalPages - 3) {
                  // Cerca del final
                  pages.push(1);
                  pages.push('...');
                  for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
                } else {
                  // En el medio
                  pages.push(1);
                  pages.push('...');
                  for (let i = page - 1; i <= page + 1; i++) pages.push(i);
                  pages.push('...');
                  pages.push(totalPages);
                }
              }
              
              return pages.map((pageNum, index) => {
                if (pageNum === '...') {
                  return (
                    <PageEllipsis key={`ellipsis-${index}`}>
                      •••
                    </PageEllipsis>
                  );
                }
                
                const isCurrentPage = pageNum === page;
                return (
                  <PageNumberButton
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    $isCurrentPage={isCurrentPage}
                  >
                    {pageNum}
                  </PageNumberButton>
                );
              });
            })()}
            
            <PaginationButton 
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              title="Página siguiente"
            >
              ›
            </PaginationButton>
            
            <PaginationButton 
              onClick={() => handlePageChange(pagination.totalPages)}
              disabled={pagination.page >= pagination.totalPages}
              title="Última página"
            >
              »
            </PaginationButton>
            
            <PageInfo>
              de {pagination.totalPages.toLocaleString('es-MX')}
            </PageInfo>
          </PaginationContainer>
          
          {/* Estadísticas en el centro */}
          <StatsContainer>
            {pagination && pagination.total > 0 ? (
              <div>
                {uniqueEmployeesCount > 0 ? uniqueEmployeesCount.toLocaleString('es-MX') : '...'} Empleados / {pagination.total.toLocaleString('es-MX')} Entradas
                {employees.length > 0 && pagination.total !== employees.length && (
                  <span> (página {pagination.page} de {pagination.totalPages})</span>
                )}
              </div>
            ) : (
              datasetStats && typeof datasetStats === 'object' && datasetStats.uniqueEmployees && datasetStats.uniqueEmployees > 0 ? (
                <div>
                  {datasetStats.uniqueEmployees.toLocaleString('es-MX')} Empleados / {(datasetStats.totalRecords || 0).toLocaleString('es-MX')} Entradas
                </div>
              ) : (
                <div>Conectando con la base de datos...</div>
              )
            )}
          </StatsContainer>
          
          {/* Botones de vista y exportar a la derecha */}
          <ViewButtonsContainer>
            <ViewModeButton 
              type="button"
              onClick={() => setViewMode('cards')}
              $isActive={viewMode === 'cards'}
            >
              <FaTh />
              Tarjetas
            </ViewModeButton>
            <ViewModeButton 
              type="button"
              onClick={() => setViewMode('table')}
              $isActive={viewMode === 'table'}
            >
              <FaTable />
              Tabla
            </ViewModeButton>
            <ExportButton onClick={exportResults} disabled={loading}>
              {loading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaDownload />}
              Exportar CSV
            </ExportButton>
            <CollapseButton 
              onClick={() => setIsTableCollapsed(!isTableCollapsed)}
              title={isTableCollapsed ? "Expandir tabla" : "Contraer tabla"}
              disabled={viewMode !== 'table'}
            >
              {isTableCollapsed ? <FaExpandArrowsAlt /> : <FaCompressArrowsAlt />}
              {isTableCollapsed ? 'Expandir' : 'Contraer'}
            </CollapseButton>
          </ViewButtonsContainer>
          
        </ControlsContainer>

        {error && (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            background: 'rgba(255, 107, 107, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            marginBottom: '1rem'
          }}>
            <FaTimes size={24} color="#ff6b6b" style={{ marginBottom: '0.5rem' }} />
            <h4 style={{ color: '#ff6b6b', margin: '0.5rem 0' }}>Error al cargar datos</h4>
            <p style={{ opacity: 0.8, margin: 0 }}>{error}</p>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <FaSpinner size={32} color="#1e3a8a" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '1rem', opacity: 0.8 }}>Buscando empleados...</p>
          </div>
        )}

        {!loading && !error && employees.length === 0 ? (
          <NoResults>
            <FaTimes size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3>No se encontraron empleados</h3>
            <p>Intenta ajustar los términos de búsqueda o filtros</p>
          </NoResults>
        ) : (
          !loading && !error && (
            <>
              {/* Vista de tabla */}
              {viewMode === 'table' && (
                <TableContainer $collapsed={isTableCollapsed}>
                  <EmployeeTable 
                    employees={employees}
                    loading={loading}
                    onViewEmployee={viewEmployee}
                    onEditEmployee={editEmployee}
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    // Props para server-side sorting
                    sortBy={getFrontendFieldName(sortBy)}
                    sortDir={sortDir}
                    onSortChange={handleSortChange}
                  />
                </TableContainer>
              )}
              
              {/* Vista de tarjetas */}
              {viewMode === 'cards' && (
                <EmployeeGrid>
                  {employees.map((employee) => (
                    <EmployeeCard key={employee.id}>
                      <EmployeeHeader>
                        <EmployeeAvatar>
                          <FaUser />
                        </EmployeeAvatar>
                        <EmployeeInfo>
                          <EmployeeName>{employee.name}</EmployeeName>
                          <EmployeePosition>{employee.position}</EmployeePosition>
                        </EmployeeInfo>
                      </EmployeeHeader>

                      <EmployeeDetails>
                        <DetailRow>
                          <DetailLabel>Curve:</DetailLabel>
                          <DetailValue>{employee.curve}</DetailValue>
                        </DetailRow>
                        <DetailRow>
                          <DetailLabel>Categoría:</DetailLabel>
                          <DetailValue>{employee.department}</DetailValue>
                        </DetailRow>
                        <DetailRow>
                          <DetailLabel>Estado:</DetailLabel>
                          <DetailValue>{employee.status}</DetailValue>
                        </DetailRow>
                        <DetailRow>
                          <DetailLabel>Fecha de ingreso:</DetailLabel>
                          <DetailValue>
                            {employee.startDate ? (() => {
                              // Si es un timestamp ISO, extraer solo la parte de la fecha
                              let fecha = employee.startDate;
                              if (typeof fecha === 'string' && fecha.includes('T')) {
                                fecha = fecha.split('T')[0];
                              }
                              return new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              });
                            })() : 'N/A'}
                          </DetailValue>
                        </DetailRow>
                        <DetailRow>
                          <DetailLabel>Años de antigüedad:</DetailLabel>
                          <DetailValue>{employee.years || 'N/A'}</DetailValue>
                        </DetailRow>
                        {employee.salary && (
                          <DetailRow>
                            <DetailLabel>Salario:</DetailLabel>
                            <DetailValue>
                              ${employee.salary?.toLocaleString('es-MX')}
                            </DetailValue>
                          </DetailRow>
                        )}
                      </EmployeeDetails>

                      <EmployeeActions>
                        <ActionButton 
                          primary 
                          onClick={() => viewEmployee(employee)}
                        >
                          <FaEye />
                          Ver
                        </ActionButton>
                        <ActionButton onClick={() => editEmployee(employee)}>
                          Editar
                        </ActionButton>
                      </EmployeeActions>
                    </EmployeeCard>
                  ))}
                </EmployeeGrid>
              )}
            </>
          )
        )}
        
        {/* Gráfica comparativa de percepciones - debajo de la tabla */}
        {!loading && !error && employees.length > 0 && (
          <EmployeeCompareGraph 
            employees={employees}
            loading={loading}
            sortBy={sortBy}
            sortDir={sortDir}
            // Pasar todos los filtros activos para mostrar en la gráfica
            selectedSucursales={selectedSucursales}
            selectedPuestos={selectedPuestos}
            selectedPuestosCategorias={selectedPuestosCategorias}
            selectedEstados={selectedEstados}
            selectedPeriodos={selectedPeriodos}
            employeeSearchTerm={employeeSearchTerm}
          />
        )}
      </ResultsSection>
      </PageContainer>
    </StyledThemeProvider>
  );
};

export default BusquedaEmpleados;

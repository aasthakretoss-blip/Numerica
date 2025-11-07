import React, { useState, useEffect, useCallback, useMemo } from "react";
import styled, { ThemeProvider as StyledThemeProvider } from "styled-components";
import { useTheme } from "../contexts/ThemeContext";
import {
  FaUsers,
  FaFilter,
  FaUser,
  FaTimes,
  FaDownload,
  FaEye,
  FaSpinner,
  FaTable,
  FaTh,
  FaCompressArrowsAlt,
  FaExpandArrowsAlt,
} from "react-icons/fa";
import nominasApi from "../services/nominasApi.ts";
import { buildApiUrl } from "../config/apiConfig";
import { authenticatedFetch } from "../services/authenticatedFetch";
import EmployeeTable from "../components/EmployeeTable";
import DropDownMenu from "../components/DropDownMenu";
// import EmployeeProfileDropDown from "../components/EmployeeProfileDropDown"; // Not used - causes component swapping issues
import BuscarEmpleado from "../components/BuscarEmpleado";
import EmployeeCompareGraph from "../components/EmployeeCompareGraph";
import { 
  groupPeriodsByMonth, 
  convertMonthSelectionsToCveper, 
  formatCveperForTable,
  PeriodOption,
} from "../utils/periodUtils.ts";

const PageContainer = styled.div`
  padding: 2rem 2rem 2rem 2rem;
  padding-right: calc(2rem - 10px); /* Reducir padding derecho para dar margen */
  color: ${(props) => props.theme?.text?.primary || "#2c3e50"};
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
  background: ${(props) => props.theme?.surfaces?.glass?.medium || "rgba(255, 255, 255, 0.15)"};
  backdrop-filter: ${(props) => props.theme?.effects?.blur?.strong || "blur(20px)"};
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  margin-right: 10px; /* Margen derecho de 10px */
  border: 1px solid ${(props) => props.theme?.surfaces?.borders?.light || "rgba(255, 255, 255, 0.2)"};
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
  background: ${(props) => props.theme?.surfaces?.inputs?.background || "rgba(255, 255, 255, 0.1)"};
  border: 1px solid ${(props) => props.theme?.surfaces?.borders?.accent || "rgba(30, 58, 138, 0.3)"};
  border-radius: 12px;
  padding: 1rem 1rem 1rem 3rem;
  color: ${(props) => props.theme?.text?.primary || "#2c3e50"};
  font-size: 1rem;
  position: relative;
  
  &::placeholder {
    color: ${(props) => props.theme?.text?.muted || "rgba(44, 62, 80, 0.7)"};
  }
  
  &:focus {
    outline: none;
    border-color: ${(props) => props.theme?.brand?.primary || "#1e3a8a"};
    background: ${(props) => props.theme?.surfaces?.inputs?.focus || "rgba(255, 255, 255, 0.15)"};
    box-shadow: ${(props) => props.theme?.effects?.shadows?.focus || "0 0 20px rgba(30, 58, 138, 0.2)"};
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
  color: ${(props) => props.theme?.text?.muted || "rgba(44, 62, 80, 0.7)"};
`;

const FilterButton = styled.button`
  background: ${(props) => props.theme?.surfaces?.buttons?.filter || "rgba(255, 255, 255, 0.1)"};
  border: 1px solid ${(props) => props.theme?.surfaces?.borders?.accent || "rgba(30, 58, 138, 0.3)"};
  border-radius: 12px;
  padding: 1rem 1.5rem;
  color: ${(props) => props.theme?.brand?.primary || "#1e3a8a"};
  font-size: 1rem;
  cursor: pointer;
  transition: ${(props) => props.theme?.effects?.states?.transition || "all 0.2s ease"};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: ${(props) => props.theme?.surfaces?.buttons?.filterHover || "rgba(255, 255, 255, 0.15)"};
    transform: translateY(-2px);
  }
`;

const SearchButton = styled.button`
  background: ${(props) =>
    props.theme?.gradients?.buttons?.primary || "linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)"};
  border: none;
  border-radius: 12px;
  padding: 1rem 2rem;
  color: ${(props) => props.theme?.text?.primary || "white"};
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: ${(props) => props.theme?.effects?.states?.transition || "all 0.2s ease"};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${(props) => props.theme?.effects?.shadows?.colored || "0 8px 25px rgba(30, 58, 138, 0.3)"};
  }
`;

const FiltersContainer = styled.div`
  display: ${(props) => (props.$show ? "flex" : "none")};
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
  background: ${(props) => props.theme?.surfaces?.inputs?.background || "rgba(255, 255, 255, 0.1)"};
  border: 1px solid ${(props) => props.theme?.surfaces?.borders?.medium || "rgba(255, 255, 255, 0.3)"};
  border-radius: 8px;
  padding: 0.75rem;
  color: ${(props) => props.theme?.text?.primary || "#2c3e50"};
  font-size: 0.9rem;
  min-width: 150px;
  
  option {
    background: ${(props) => props.theme?.surfaces?.dark?.strong || "#2c3e50"};
    color: ${(props) => props.theme?.text?.primary || "#2c3e50"};
  }
  
  &:focus {
    outline: none;
    border-color: ${(props) => props.theme?.brand?.primary || "#1e3a8a"};
  }
`;

const ResultsSection = styled.div`
  background: ${(props) => props.theme?.surfaces?.glass?.medium || "rgba(255, 255, 255, 0.15)"};
  backdrop-filter: ${(props) => props.theme?.effects?.blur?.strong || "blur(20px)"};
  border-radius: 20px;
  padding: 2rem;
  margin-right: 10px; /* Margen derecho de 10px */
  border: 1px solid ${(props) => props.theme?.surfaces?.borders?.light || "rgba(255, 255, 255, 0.2)"};
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
  background: ${(props) => props.theme?.surfaces?.buttons?.success || "rgba(76, 175, 80, 0.2)"};
  border: 1px solid ${(props) => props.theme?.surfaces?.borders?.success || "rgba(76, 175, 80, 0.5)"};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: ${(props) => props.theme?.status?.success || "#4caf50"};
  font-size: 0.9rem;
  cursor: pointer;
  transition: ${(props) => props.theme?.effects?.states?.transition || "all 0.2s ease"};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: ${(props) => props.theme?.surfaces?.buttons?.successHover || "rgba(76, 175, 80, 0.3)"};
    transform: translateY(-2px);
  }
`;

const EmployeeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const EmployeeCard = styled.div`
  background: ${(props) => props.theme?.surfaces?.glass?.light || "rgba(255, 255, 255, 0.1)"};
  border: 1px solid ${(props) => props.theme?.surfaces?.borders?.light || "rgba(255, 255, 255, 0.2)"};
  border-radius: 15px;
  padding: 1.5rem;
  transition: ${(props) => props.theme?.effects?.states?.transition || "all 0.2s ease"};
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${(props) => props.theme?.effects?.shadows?.large || "0 10px 30px rgba(0, 0, 0, 0.3)"};
    background: ${(props) => props.theme?.surfaces?.glass?.medium || "rgba(255, 255, 255, 0.15)"};
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
  background: ${(props) =>
    props.theme?.gradients?.backgrounds?.secondary || "linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)"};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => props.theme?.text?.inverted || "white"};
  font-size: 1.2rem;
`;

const EmployeeInfo = styled.div`
  flex: 1;
`;

const EmployeeName = styled.h3`
  margin: 0 0 0.25rem 0;
  font-size: 1.2rem;
  color: ${(props) => props.theme?.brand?.primary || "#1e3a8a"};
`;

const EmployeePosition = styled.p`
  margin: 0;
  opacity: 0.8;
  font-size: 0.9rem;
  color: ${(props) => props.theme?.text?.secondary || "rgba(44, 62, 80, 0.7)"};
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
  background: ${(props) =>
    props.primary
      ? props.theme?.gradients?.buttons?.primary || "linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)"
      : props.theme?.surfaces?.glass?.light || "rgba(255, 255, 255, 0.1)"};
  border: 1px solid
    ${(props) => (props.primary ? "transparent" : props.theme?.surfaces?.borders?.light || "rgba(255, 255, 255, 0.2)")};
  border-radius: 8px;
  padding: 0.5rem 1rem;
  color: ${(props) => props.theme?.text?.inverted || "white"};
  font-size: 0.8rem;
  cursor: pointer;
  transition: ${(props) => props.theme?.effects?.states?.transition || "all 0.2s ease"};
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${(props) => props.theme?.effects?.shadows?.medium || "0 4px 15px rgba(0, 0, 0, 0.2)"};
  }
`;

const NoResults = styled.div`
  text-align: center;
  padding: 3rem;
  opacity: 0.7;
`;

const PeriodBadge = styled.div`
  background: ${(props) => props.theme?.surfaces?.buttons?.accentMedium || "rgba(30, 58, 138, 0.2)"};
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
  background: ${(props) => props.theme?.surfaces?.glass?.subtle || "rgba(255, 255, 255, 0.05)"};
  border-radius: 12px;
  border: 1px solid ${(props) => props.theme?.surfaces?.borders?.subtle || "rgba(255, 255, 255, 0.1)"};
  flex-wrap: wrap;
  gap: 1rem;
`;

const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PageSizeSelect = styled.select`
  background: ${(props) => props.theme?.surfaces?.inputs?.background || "rgba(255, 255, 255, 0.1)"};
  border: 1px solid ${(props) => props.theme?.surfaces?.borders?.medium || "rgba(255, 255, 255, 0.3)"};
  border-radius: 8px;
  padding: 0.5rem;
  color: ${(props) => props.theme?.text?.primary || "#2c3e50"};
  font-size: 0.9rem;
  margin-right: 1rem;
  
  option {
    background: ${(props) => props.theme?.surfaces?.dark?.strong || "#2c3e50"};
  }
`;

const PaginationButton = styled.button`
  background: ${(props) =>
    props.disabled
      ? props.theme?.surfaces?.glass?.subtle || "rgba(255, 255, 255, 0.1)"
      : props.theme?.surfaces?.buttons?.accentMedium || "rgba(30, 58, 138, 0.2)"};
  border: 1px solid ${(props) => props.theme?.surfaces?.borders?.medium || "rgba(255, 255, 255, 0.2)"};
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  color: ${(props) =>
    props.disabled ? props.theme?.text?.subtle || "rgba(44, 62, 80, 0.5)" : props.theme?.text?.primary || "#2c3e50"};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  transition: ${(props) => props.theme?.effects?.states?.transitionFast || "all 0.2s ease"};
`;

const PageNumberButton = styled.button`
  background: ${(props) =>
    props.$isCurrentPage ? "white" : props.theme?.surfaces?.buttons?.accentMedium || "rgba(30, 58, 138, 0.2)"};
  border: ${(props) =>
    props.$isCurrentPage
      ? `2px solid ${props.theme?.brand?.primary || "#1e3a8a"}`
      : `1px solid ${props.theme?.surfaces?.borders?.medium || "rgba(255, 255, 255, 0.2)"}`};
  border-radius: 8px;
  padding: 0.6rem 0.9rem;
  color: ${(props) =>
    props.$isCurrentPage
      ? props.theme?.brand?.primary || "#1e3a8a"
      : props.theme?.text?.secondary || "rgba(44, 62, 80, 0.8)"};
  cursor: pointer;
  transition: ${(props) => props.theme?.effects?.states?.transitionFast || "all 0.2s ease"};
  font-weight: ${(props) => (props.$isCurrentPage ? "600" : "400")};
  font-size: 0.9rem;
  min-width: 40px;
  box-shadow: ${(props) =>
    props.$isCurrentPage ? props.theme?.effects?.shadows?.colored || "0 4px 12px rgba(30, 58, 138, 0.4)" : "none"};
`;

const PageEllipsis = styled.span`
  color: ${(props) => props.theme?.text?.subtle || "rgba(44, 62, 80, 0.5)"};
  padding: 0.5rem;
  font-size: 1.2rem;
`;

const PageInfo = styled.span`
  color: ${(props) => props.theme?.text?.muted || "rgba(44, 62, 80, 0.7)"};
  font-size: 0.8rem;
  margin-left: 0.75rem;
`;

const StatsContainer = styled.div`
  text-align: center;
  flex: 0 1 auto;
  font-size: 1.1rem;
  opacity: 0.8;
  color: ${(props) => props.theme?.brand?.primary || "#1e3a8a"};
`;

const ViewButtonsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const ViewModeButton = styled(FilterButton)`
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  background: ${(props) =>
    props.$isActive
      ? props.theme?.surfaces?.buttons?.accentStrong || "rgba(30, 58, 138, 0.4)"
      : props.theme?.surfaces?.buttons?.accentMedium || "rgba(30, 58, 138, 0.2)"};
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 3rem;
`;

const LoadingSpinner = styled(FaSpinner)`
  color: ${(props) => props.theme?.brand?.primary || "#1e3a8a"};
  animation: spin 1s linear infinite;
`;

const LoadingText = styled.p`
  margin-top: 1rem;
  opacity: 0.8;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: 2rem;
  background: ${(props) => props.theme?.status?.error?.background || "rgba(255, 107, 107, 0.1)"};
  border-radius: 12px;
  border: 1px solid ${(props) => props.theme?.status?.error?.border || "rgba(255, 107, 107, 0.3)"};
  margin-bottom: 1rem;
`;

const ErrorIcon = styled(FaTimes)`
  color: ${(props) => props.theme?.status?.error?.text || "#ff6b6b"};
  margin-bottom: 0.5rem;
`;

const ErrorTitle = styled.h4`
  color: ${(props) => props.theme?.status?.error?.text || "#ff6b6b"};
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
  border: 1px solid ${(props) => props.theme?.surfaces?.borders?.subtle || "rgba(255, 255, 255, 0.1)"};
  background: ${(props) => props.theme?.surfaces?.glass?.subtle || "rgba(255, 255, 255, 0.02)"};
  transition: ${(props) => props.theme?.effects?.states?.transition || "all 0.3s ease"};

  ${(props) =>
    props.$collapsed &&
    `
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
      background: ${props.theme?.surfaces?.buttons?.filter || "rgba(255, 255, 255, 0.1)"};
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
      background: linear-gradient(transparent, ${props.theme?.surfaces?.glass?.medium || "rgba(255, 255, 255, 0.15)"});
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
      color: ${props.theme?.text?.muted || "rgba(44, 62, 80, 0.7)"};
      font-size: 1.2rem;
      font-weight: bold;
      z-index: 6;
      text-shadow: 0 0 4px ${props.theme?.surfaces?.glass?.medium || "rgba(255, 255, 255, 0.15)"};
    }
  `}
`;

const CollapseButton = styled.button`
  background: ${(props) => props.theme?.surfaces?.buttons?.secondary || "rgba(255, 255, 255, 0.1)"};
  border: 1px solid ${(props) => props.theme?.surfaces?.borders?.accent || "rgba(30, 58, 138, 0.3)"};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: ${(props) => props.theme?.brand?.primary || "#1e3a8a"};
  font-size: 0.9rem;
  cursor: pointer;
  transition: ${(props) => props.theme?.effects?.states?.transition || "all 0.2s ease"};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  
  &:hover {
    background: ${(props) => props.theme?.surfaces?.buttons?.secondaryHover || "rgba(255, 255, 255, 0.15)"};
    transform: translateY(-2px);
    box-shadow: ${(props) => props.theme?.effects?.shadows?.medium || "0 4px 15px rgba(0, 0, 0, 0.1)"};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const BusquedaEmpleados = () => {
  const { theme } = useTheme(); // Obtener el theme del context
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState({
    puestos: "",
    status: "",
    categorias: "",
  });
  
  // Estados para los nuevos DropDownMenu (selección múltiple)
  const [selectedSucursales, setSelectedSucursales] = useState([]);
  const [selectedPuestos, setSelectedPuestos] = useState([]);
  const [selectedPuestosCategorias, setSelectedPuestosCategorias] = useState([]);
  const [selectedEstados, setSelectedEstados] = useState([]); // SIN FILTRO POR DEFECTO
  const [selectedPeriodos, setSelectedPeriodos] = useState([]); // Se poblará con el último período
  
  // Estado para el componente BuscarEmpleado
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  
  // Estados para sorting - HYBRID: server-side para texto, local para numéricos (como TablaDemografico)
  const [sortBy, setSortBy] = useState("nombre");
  const [sortDir, setSortDir] = useState("asc");
  const [localSortBy, setLocalSortBy] = useState("nombre");
  const [localSortDir, setLocalSortDir] = useState("asc");
  
  // ✅ FIXED: Campos que usan server-side sorting - incluye todos los campos sortables
  // IMPORTANT: Todos los campos deben usar server-side sorting para aplicar a todo el dataset
  const serverSortFields = ['nombre', 'curp', 'puesto', 'sucursal', 'periodo', 'estado', 'salario', 'comisiones', 'percepcionestotales', 'totalpercepciones'];
  
  // Mapeo inverso: backend -> frontend (para sincronizar con EmployeeTable)
  const backendToFrontendFieldMapping = {
    nombre: "nombre",
    curp: "curp",
    puesto: "puesto",
    sucursal: "sucursal",
    cveper: "periodo",
    "SUELDO CLIENTE": "salario",
    "COMISIONES CLIENTE": "comisiones",
    "TOTAL DE PERCEPCIONES": "percepcionesTotales",
    estado: "estado",
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
    totalPages: 1,
  });
  const [filterOptions, setFilterOptions] = useState({
    puestos: [],
    status: [],
    categorias: [],
    puestosCategorias: [], // Nuevo: categorías de puestos
    periodos: [], // Nuevo: periodos (cveper)
  });
  // NUEVO: Opciones estáticas completas (nunca se filtran, solo para mostrar en dropdown menus)
  const [staticFilterOptions, setStaticFilterOptions] = useState({
    puestos: [],
    status: [],
    categorias: [],
    puestosCategorias: [],
    periodos: [],
  });
  // IMPORTANTE: Inicializar datasetStats con valores seguros desde el inicio
  const [datasetStats, setDatasetStats] = useState({
    totalRecords: 0,
    uniqueEmployees: 0,
    uniquePeriods: 0,
    statusDistribution: [],
  });
  const [latestPeriod, setLatestPeriod] = useState(null);
  // NUEVO: Estado para CURPs únicos con filtros aplicados
  const [uniqueEmployeesCount, setUniqueEmployeesCount] = useState(0);
  const [viewMode, setViewMode] = useState("table"); // 'cards' o 'table'
  const [isTableCollapsed, setIsTableCollapsed] = useState(false); // Estado para contraer/expandir tabla
  const [defaultsApplied, setDefaultsApplied] = useState(false); // Control para aplicar valores por defecto una sola vez
  
  // NUEVO: Estados para manejo especial de períodos agrupados por mes
  const [groupedPeriodsStatic, setGroupedPeriodsStatic] = useState([]); // Períodos agrupados estáticos
  const [groupedPeriodsDynamic, setGroupedPeriodsDynamic] = useState([]); // Períodos agrupados con conteos dinámicos

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, []);
  
  // useEffect para marcar defaults como aplicados cuando las opciones estáticas estén cargadas
  useEffect(() => {
    if (!initialLoading && staticFilterOptions.status.length > 0 && !defaultsApplied) {
      setDefaultsApplied(true);
    }
  }, [staticFilterOptions.status, defaultsApplied, initialLoading]);
  
  // Recargar SOLO conteos de filtros cuando cambien los filtros activos (no las opciones completas)
  // SOLO después de que se hayan aplicado los valores por defecto para evitar interferencias
  useEffect(() => {
    if (!initialLoading && defaultsApplied) {
      loadDynamicFilterCounts();
    }
  }, [
        selectedSucursales,
        selectedPuestos,
        selectedEstados,
        selectedPeriodos,
        selectedPuestosCategorias,
        employeeSearchTerm,
        initialLoading,
    defaultsApplied,
  ]);

  // Aplicar filtros y sorting cuando cambien (actualizar tabla en tiempo real)
  // SOLO después de que se hayan aplicado los valores por defecto Y cuando hay cambios reales
  // PATRÓN: Similar a TablaDemografico - recarga automática cuando cambian filtros, sorting o paginación
  useEffect(() => {
    if (!initialLoading && defaultsApplied) {
      // Filter/Sort: Reloading data due to filter/sort changes
      
      const timeoutId = setTimeout(() => {
        loadEmployeesWithPagination(pagination.page, pagination.pageSize);
        loadUniqueEmployeesCount();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [
    selectedSucursales,
    selectedPuestos,
    selectedEstados,
    selectedPeriodos,
    selectedPuestosCategorias,
    employeeSearchTerm,
    sortBy,        // Server-side sorting fields only
    sortDir,       // Server-side sorting direction only
    pagination.page,
    pagination.pageSize,
    initialLoading,
    defaultsApplied,
  ]);

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
        // Las estadísticas ya están inicializadas con valores por defecto
      }
      
      // SEXTO: Luego cargar conteos dinámicos (opcional)
      try {
        await loadDynamicFilterCounts();
      } catch (countsError) {
        // Silently fail
      }
      
      // SÉPTIMO: Calcular CURPs únicos con filtros por defecto
      try {
        await loadUniqueEmployeesCount();
      } catch (uniqueCountError) {
        // Silently fail
      }
    } catch (err) {
      setError(err.message || "Error al cargar datos iniciales");
    } finally {
      setInitialLoading(false);
    }
  };
  
  // Cargar último periodo desde la API
  const loadLatestPeriod = async () => {
    try {
      const response = await authenticatedFetch(buildApiUrl("/api/payroll/periodos"));
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          // Filtrar solo valores válidos (fechas o meses agrupados)
          const validPeriods = result.data.filter((p) => {
            const value = p.value || p;
            // Validar formato YYYY-MM-DD o YYYY-MM
            return value && typeof value === "string" && /^\d{4}-\d{2}(-\d{2})?$/.test(value);
          });
          
          if (validPeriods.length === 0) {
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
          setLatestPeriod(latestValue);
        } else {
          setLatestPeriod(null);
        }
      } else {
        setLatestPeriod(null);
      }
    } catch (error) {
      setLatestPeriod(null); // No usar fallback inventado
    }
  };
  
  // Cargar estadísticas completas del dataset - SOLO Historic
  const loadDatasetStats = async () => {
    try {
      const response = await authenticatedFetch(`${buildApiUrl("/api/payroll/stats")}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText} - No se puede conectar a Historic`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Intentar primero result.stats, luego result.data como fallback
        const stats = result.stats ||
          result.data || {
          totalRecords: 0,
          uniqueEmployees: 0,
          uniquePeriods: 0,
            statusDistribution: [],
        };
        setDatasetStats(stats);
      } else {
        throw new Error("Historic devolvió respuesta no exitosa");
      }
    } catch (error) {
      setDatasetStats({
        totalRecords: 0,
        uniqueEmployees: 0,
        uniquePeriods: 0,
        statusDistribution: [],
      });
    }
  };

  // Cargar empleados SOLO desde Historic - usando filtros por defecto ya aplicados
  const loadEmployeesFromPayrollAPI = async () => {
    setLoading(true);
    setError(null);

    try {
      await loadEmployeesWithPagination(1, pagination.pageSize);
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Cargar opciones estáticas completas (nunca se filtran)
  const loadStaticFilterOptions = async () => {
    try {
      const response = await authenticatedFetch(`${buildApiUrl("/api/payroll/filters")}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        const rawPeriodos = result.data.periodos || [];
        const groupedPeriods = groupPeriodsByMonth(rawPeriodos);
        
        setGroupedPeriodsStatic(groupedPeriods);
        
        const periodOptionsForDropdown = groupedPeriods.map((period) => ({
          value: period.value,
          label: period.label,
          count: period.count,
        }));

        const puestos = result.data.puestos || [];
        const puestosCategorias = result.data.puestosCategorias || [];
        
        setStaticFilterOptions({
          puestos: puestos,
          status: result.data.estados || [],
          categorias: result.data.sucursales || [],
          puestosCategorias: puestosCategorias,
          periodos: periodOptionsForDropdown,
        });
      } else {
        throw new Error("La API devolvió una respuesta no exitosa");
      }
    } catch (error) {
      await loadFilterOptionsFromPayrollAPI();
    }
  };
  
  // Cargar solo conteos dinámicos (mantener opciones estáticas intactas)
  const loadDynamicFilterCounts = useCallback(async () => {
    try {
      
      // Construir parámetros de filtros activos para la API
      const filterParams = new URLSearchParams();
      
      if (employeeSearchTerm && employeeSearchTerm.trim() !== "") {
        filterParams.append("search", employeeSearchTerm.trim());
      }
      
      if (selectedSucursales.length > 0) {
        selectedSucursales.forEach((sucursal) => {
          filterParams.append("sucursal", sucursal);
        });
      }
      
      if (selectedPuestos.length > 0) {
        selectedPuestos.forEach((puesto) => {
          filterParams.append("puesto", puesto);
        });
      }
      
      if (selectedEstados.length > 0) {
        selectedEstados.forEach((estado) => {
          filterParams.append("status", estado);
        });
      }
      
      if (selectedPeriodos.length > 0) {
        selectedPeriodos.forEach((periodo) => {
          if (/^\d{4}-\d{2}$/.test(periodo)) {
            filterParams.append("cveper", periodo);
          } else {
            const normalizedCveper =
              periodo.includes("T") || periodo.includes("Z") ? new Date(periodo).toISOString().split("T")[0] : periodo;
            filterParams.append("cveper", normalizedCveper);
          }
        });
      }
      
      if (selectedPuestosCategorias.length > 0) {
        selectedPuestosCategorias.forEach((categoria) => {
          filterParams.append("puestoCategorizado", categoria);
        });
      }
      
      // Llamar al endpoint de filtros CON parámetros para obtener conteos actualizados
      const response = await authenticatedFetch(`${buildApiUrl("/api/payroll/filters")}?${filterParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // ESTRATEGIA CLAVE: Combinar opciones estáticas con conteos dinámicos
        const updateOptionsWithDynamicCounts = (staticOpts, dynamicOpts) => {
          if (!staticOpts || !dynamicOpts) return staticOpts || [];
          
          return staticOpts.map((staticOption) => {
            const dynamicOption = dynamicOpts.find((dynOpt) => dynOpt.value === staticOption.value);
            return {
              ...staticOption,
              count: dynamicOption ? dynamicOption.count : 0, // Actualizar conteo, mantener opción
            };
          });
        };
        
        // Actualizar filterOptions manteniendo TODAS las opciones pero con conteos actualizados
        setFilterOptions({
          puestos: updateOptionsWithDynamicCounts(staticFilterOptions.puestos, result.data.puestos),
          status: updateOptionsWithDynamicCounts(staticFilterOptions.status, result.data.estados),
          categorias: updateOptionsWithDynamicCounts(staticFilterOptions.categorias, result.data.sucursales),
          puestosCategorias: updateOptionsWithDynamicCounts(
            staticFilterOptions.puestosCategorias,
            result.data.puestosCategorias
          ),
          periodos: updateOptionsWithDynamicCounts(staticFilterOptions.periodos, result.data.periodos),
        });
      } else {
        throw new Error("La API devolvió una respuesta no exitosa");
      }
    } catch (error) {
    }
  }, [
    employeeSearchTerm,
    selectedSucursales,
    selectedPuestos,
    selectedEstados,
    selectedPeriodos,
    selectedPuestosCategorias,
    staticFilterOptions.puestos,
    staticFilterOptions.status,
    staticFilterOptions.categorias,
    staticFilterOptions.puestosCategorias,
    staticFilterOptions.periodos,
  ]);

  // Calcular CURPs únicos con filtros actuales (todas las páginas)
  const loadUniqueEmployeesCount = async () => {
    try {
      
      // ESTRATEGIA: Intentar endpoint dedicado, si no existe, calcular desde backend obteniendo todos los CURPs
      // Construir parámetros de filtros actuales (igual que loadEmployeesWithPagination)
      const params = new URLSearchParams();
      
      if (employeeSearchTerm && employeeSearchTerm.trim() !== "") {
        params.append("search", employeeSearchTerm.trim());
      }
      
      if (selectedPuestos.length > 0) {
        selectedPuestos.forEach((puesto) => params.append("puesto", puesto));
      }
      
      if (selectedEstados.length > 0) {
        selectedEstados.forEach((estado) => params.append("status", estado));
      }
      
      if (selectedSucursales.length > 0) {
        selectedSucursales.forEach((sucursal) => params.append("sucursal", sucursal));
      }
      
      if (selectedPuestosCategorias.length > 0) {
        selectedPuestosCategorias.forEach((categoria) => params.append("puestoCategorizado", categoria));
      }
      
      if (selectedPeriodos.length > 0) {
        selectedPeriodos.forEach((periodo) => {
          if (/^\d{4}-\d{2}$/.test(periodo)) {
            params.append("cveper", periodo);
          } else {
            const normalizedCveper =
              periodo.includes("T") || periodo.includes("Z") ? new Date(periodo).toISOString().split("T")[0] : periodo;
            params.append("cveper", normalizedCveper);
          }
        });
      }
      
      const uniqueCountUrl = `${buildApiUrl("/api/payroll/demographic/unique-count")}?${params.toString()}`;
      const uniqueCountResponse = await authenticatedFetch(uniqueCountUrl);
      
      if (uniqueCountResponse.ok) {
        const result = await uniqueCountResponse.json();
        if (result.success && result.uniqueCurpCount !== undefined) {
          setUniqueEmployeesCount(result.uniqueCurpCount);
          return;
        }
      }
      
      // Remover uniqueCurpsOnly y agregar parámetros para obtener solo CURPs distintos
      const fallbackParams = new URLSearchParams();
      
      // Copiar todos los filtros
      if (employeeSearchTerm && employeeSearchTerm.trim() !== "") {
        fallbackParams.append("search", employeeSearchTerm.trim());
      }
      
      if (selectedPuestos.length > 0) {
        selectedPuestos.forEach((puesto) => fallbackParams.append("puesto", puesto));
      }
      
      if (selectedEstados.length > 0) {
        selectedEstados.forEach((estado) => fallbackParams.append("status", estado));
      }
      
      if (selectedSucursales.length > 0) {
        selectedSucursales.forEach((sucursal) => fallbackParams.append("sucursal", sucursal));
      }
      
      if (selectedPuestosCategorias.length > 0) {
        selectedPuestosCategorias.forEach((categoria) => fallbackParams.append("puestoCategorizado", categoria));
      }
      
      if (selectedPeriodos.length > 0) {
        selectedPeriodos.forEach((periodo) => {
          if (/^\d{4}-\d{2}$/.test(periodo)) {
            fallbackParams.append("cveper", periodo);
          } else {
            const normalizedCveper =
              periodo.includes("T") || periodo.includes("Z") ? new Date(periodo).toISOString().split("T")[0] : periodo;
            fallbackParams.append("cveper", normalizedCveper);
          }
        });
      }
      
      fallbackParams.append("fields", "curp");
      fallbackParams.append("pageSize", "100000");
      
      const fallbackUrl = `${buildApiUrl("/api/payroll")}?${fallbackParams.toString()}`;
      const fallbackResponse = await authenticatedFetch(fallbackUrl);
      
      if (fallbackResponse.ok) {
        const result = await fallbackResponse.json();
        
        if (result.success && result.data) {
          const uniqueCurps = new Set();
          result.data.forEach((emp) => {
            const curp = emp.curp || emp.CURP || emp.curve || emp.rfc;
            if (curp && curp !== "N/A" && curp.trim() !== "") {
              uniqueCurps.add(curp);
            }
          });
          
          setUniqueEmployeesCount(uniqueCurps.size);
        } else {
          setUniqueEmployeesCount(0);
        }
      } else {
        setUniqueEmployeesCount(0);
      }
    } catch (error) {
      setUniqueEmployeesCount(0);
    }
  };
  
  // Aplicar filtros demográficos por defecto
  const applyDefaultSelections = async () => {
    return new Promise((resolve) => {
      try {
        // Aplicar filtro de estado 'A' por defecto
        if (staticFilterOptions.status.length > 0) {
          const estadoA = staticFilterOptions.status.find((s) => s.value === "A");
          if (estadoA) {
            setSelectedEstados(["A"]);
          }
        }
        
        // Aplicar filtro de último período por defecto
        if (latestPeriod && staticFilterOptions.periodos.length > 0) {
          const periodos = staticFilterOptions.periodos;
          let periodoDefault = periodos.find((p) => p.value === latestPeriod);
          
          if (!periodoDefault && periodos.length > 0) {
            periodoDefault = periodos[0];
          }
          
          if (periodoDefault) {
            setSelectedPeriodos([periodoDefault.value]);
          }
        }

        setDefaultsApplied(true);
        resolve();
      } catch (error) {
        setDefaultsApplied(true);
        resolve();
      }
    });
  };
  
  // FUNCIÓN LEGACY: mantener para compatibilidad y fallback
  const loadFilterOptionsWithCardinality = async () => {
    try {
      
      // Construir parámetros de filtros activos para la API
      const filterParams = new URLSearchParams();
      
      if (employeeSearchTerm && employeeSearchTerm.trim() !== "") {
        filterParams.append("search", employeeSearchTerm.trim());
      }
      
      if (selectedSucursales.length > 0) {
        selectedSucursales.forEach((sucursal) => {
          filterParams.append("sucursal", sucursal);
        });
      }
      
      if (selectedPuestos.length > 0) {
        selectedPuestos.forEach((puesto) => {
          filterParams.append("puesto", puesto);
        });
      }
      
      if (selectedEstados.length > 0) {
        selectedEstados.forEach((estado) => {
          filterParams.append("status", estado);
        });
      }
      
      if (selectedPeriodos.length > 0) {
        filterParams.append("cveper", selectedPeriodos[0]); // Usar el primer período seleccionado
      }
      
      if (selectedPuestosCategorias.length > 0) {
        selectedPuestosCategorias.forEach((categoria) => {
          filterParams.append("puestoCategorizado", categoria);
        });
      }
      
      // Llamar al nuevo endpoint de filtros
      const response = await authenticatedFetch(`${buildApiUrl("/api/payroll/filters")}?${filterParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Actualizar las opciones de filtros con cardinalidad en tiempo real
        setFilterOptions({
          puestos: result.data.puestos || [],
          status: result.data.estados || [],
          categorias: result.data.sucursales || [],
          puestosCategorias: result.data.puestosCategorias || [],
          periodos: result.data.periodos || [],
        });
      } else {
        throw new Error("La API devolvio una respuesta no exitosa");
      }
    } catch (error) {
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
        authenticatedFetch(`${buildApiUrl("/api/payroll")}?pageSize=1000`), // Para opciones de filtros normales
        authenticatedFetch(`${buildApiUrl("/api/payroll/categorias-puestos")}`),
        authenticatedFetch(`${buildApiUrl("/api/payroll")}?pageSize=100000`), // Obtener TODOS los datos para conteos globales
        authenticatedFetch(`${buildApiUrl("/api/payroll/periodos")}`),
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
        const puestos = [...new Set(payrollResult.data.map((emp) => emp.puesto).filter(Boolean))];
        const estados = [...new Set(payrollResult.data.map((emp) => emp.estado).filter(Boolean))];
        const sucursales = [...new Set(payrollResult.data.map((emp) => emp.sucursal).filter(Boolean))];
        
        const fallbackOptions = {
          puestos: puestos.map((p) => ({
            value: p,
            count: payrollResult.data.filter((emp) => emp.puesto === p).length,
          })),
          status: estados.map((s) => ({
            value: s,
            count: payrollResult.data.filter((emp) => emp.estado === s).length,
          })),
          categorias: sucursales.map((c) => ({
            value: c,
            count: payrollResult.data.filter((emp) => emp.sucursal === c).length,
          })),
          puestosCategorias: [], // Se cargará con el nuevo servicio
          periodos: (periodosResult.success ? periodosResult.data : []).map((p) => ({
            value: p.value,
            count: parseInt(p.count) || 0,
          })),
        };
        
        setFilterOptions(fallbackOptions);
        setStaticFilterOptions(fallbackOptions);
      }
    } catch (error) {
      // Fallback con categorías por defecto
      const defaultOptions = {
        puestos: [],
        status: [
          { value: "A", count: 0 },
          { value: "B", count: 0 },
          { value: "F", count: 0 },
        ],
        categorias: [],
        puestosCategorias: [],
        periodos: [],
      };
      
      // Actualizar TANTO opciones dinámicas como estáticas en fallback
      setFilterOptions(defaultOptions);
      setStaticFilterOptions(defaultOptions);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [puestosRes, statusRes, categoriasRes] = await Promise.all([
        nominasApi.getFilterOptions("puestos"),
        nominasApi.getFilterOptions("status"),
        nominasApi.getFilterOptions("categorias"),
      ]);

      setFilterOptions({
        puestos: puestosRes.data || [],
        status: statusRes.data || [],
        categorias: categoriasRes.data || [],
      });
    } catch (error) {
      // Silently fail
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
        ...searchFilters,
      };

      const response = await nominasApi.getEmployeesData(apiFilters);
      
      if (response.success) {
        // Transformar datos de la API al formato esperado por la UI
        const transformedEmployees = response.data.map((employee, index) => ({
          id: employee.nombre_completo + "_" + employee.curve + "_" + index,
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
          periodo: employee.periodo,
        }));
        
        setEmployees(transformedEmployees);
        setPagination(response.pagination);
      } else {
        setError("Error al obtener datos de empleados");
      }
    } catch (err) {
      setError(err.message || "Error al cargar datos de empleados");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(
    async (e) => {
    if (e) e.preventDefault();
    await loadEmployeesWithFilters();
    },
    [
      filters,
      selectedSucursales,
      selectedPuestos,
      selectedPuestosCategorias,
      selectedEstados,
      selectedPeriodos,
      employeeSearchTerm,
    ]
  );
  
  const loadEmployeesWithFilters = async () => {
    // Reiniciar a la primera página cuando se aplican filtros
    await loadEmployeesWithPagination(1, pagination.pageSize);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  const exportResults = () => {
    if (employees.length === 0) {
      alert("No hay datos para exportar");
      return;
    }
    
    // Crear CSV
    const headers = [
      "Nombre",
      "Puesto",
      "Departamento",
      "Curve",
      "Estado",
      "Fecha Ingreso",
      "Salario",
      "Años Antigüedad",
    ];
    const csvContent = [
      headers.join(","),
      ...employees.map((emp) =>
        [emp.name, emp.position, emp.department, emp.curve, emp.status, emp.startDate, emp.salary, emp.years].join(",")
      ),
    ].join("\n");
    
    // Descargar archivo
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `empleados_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
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

  // Handlers de paginación - SIMPLIFICADO como TablaDemografico
  // Solo actualizar estado, useEffect se encargará de recargar
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.page) {
    setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handlePageSizeChange = (newPageSize) => {
    if (newPageSize !== pagination.pageSize) {
      setPagination(prev => ({ ...prev, pageSize: newPageSize, page: 1 }));
    }
  };

  // ✅ FIXED: Handler para cambios de sorting - TODOS los campos usan server-side sorting
  // IMPORTANT: Server-side sorting asegura que el ordenamiento se aplique a TODO el dataset, no solo a la página actual
  const handleSortChange = useCallback((newSortBy, newSortDir) => {
    // ✅ Todos los campos sortables ahora usan server-side sorting
    if (serverSortFields.includes(newSortBy)) {
      // Server-side sorting - aplica a todo el dataset
      if (newSortBy === sortBy) {
        // Misma columna clickeada - alternar dirección
        setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      } else {
        // Nueva columna clickeada - empezar con ascendente
        setSortBy(newSortBy);
        setSortDir('asc');
      }
      // Resetear a página 1 cuando cambia el sorting
      setPagination(prev => ({ ...prev, page: 1 }));
    } else {
      // ⚠️ Campo no reconocido - usar local sorting como fallback
      console.warn('⚠️ Campo de sorting no reconocido, usando local sorting:', newSortBy);
      if (newSortBy === localSortBy) {
        setLocalSortDir(localSortDir === 'asc' ? 'desc' : 'asc');
      } else {
        setLocalSortBy(newSortBy);
        setLocalSortDir('asc');
      }
    }
  }, [sortBy, sortDir, localSortBy, localSortDir, serverSortFields]);

  // Función unificada para cargar empleados con paginación
  const loadEmployeesWithPagination = async (page = 1, pageSize = 50) => {

    // Always clear current data to avoid showing stale rows and force a re-render
    setEmployees([]);
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      // Agregar filtros si están definidos
      
      // Agregar búsqueda por nombre/CURP si está definida
      if (employeeSearchTerm && employeeSearchTerm.trim() !== "") {
        params.append("search", employeeSearchTerm.trim());
      }
      
      // Manejar selecciones múltiples de puestos del DropDownMenu
      if (selectedPuestos.length > 0) {
        // Si solo hay un puesto seleccionado, usar el parámetro simple
        if (selectedPuestos.length === 1) {
          params.append("puesto", selectedPuestos[0]);
        } else {
          // Para múltiples puestos, agregar cada uno como parámetro separado
          selectedPuestos.forEach((puesto) => {
            params.append("puesto", puesto);
          });
        }
      }
      // Mantener compatibilidad con el filtro simple (si no se usa el DropDownMenu)
      else if (filters.puestos) {
        params.append("puesto", filters.puestos);
      }
      
      // Manejar selecciones múltiples de estados del DropDownMenu
      if (selectedEstados.length > 0) {
        // Si solo hay un estado seleccionado, usar el parámetro simple
        if (selectedEstados.length === 1) {
          params.append("status", selectedEstados[0]);
        } else {
          // Para múltiples estados, agregar cada uno como parámetro separado
          selectedEstados.forEach((estado) => {
            params.append("status", estado);
          });
        }
      }
      // Mantener compatibilidad con el filtro simple (si no se usa el DropDownMenu)
      else if (filters.status) {
        params.append("status", filters.status);
      }
      
      // Manejar selecciones múltiples de sucursales del DropDownMenu
      if (selectedSucursales.length > 0) {
        // Si solo hay una sucursal seleccionada, usar el parámetro simple
        if (selectedSucursales.length === 1) {
          params.append("sucursal", selectedSucursales[0]);
        } else {
          // Para múltiples sucursales, agregar cada una como parámetro separado
          selectedSucursales.forEach((sucursal) => {
            params.append("sucursal", sucursal);
          });
        }
      }
      
      // Manejar selecciones múltiples de categorías de puestos del DropDownMenu
      if (selectedPuestosCategorias.length > 0) {
        // Si solo hay una categoría seleccionada, usar el parámetro simple
        if (selectedPuestosCategorias.length === 1) {
          params.append("puestoCategorizado", selectedPuestosCategorias[0]);
        } else {
          // Para múltiples categorías, agregar cada una como parámetro separado
          selectedPuestosCategorias.forEach((categoria) => {
            params.append("puestoCategorizado", categoria);
          });
        }
      }
      
      // Mantener compatibilidad con el filtro simple de categorías (si no se usa el DropDownMenu)
      if (filters.categorias && selectedSucursales.length === 0) {
        params.append("sucursal", filters.categorias);
      }
      
      // Manejar selección de periodos (cveper)
      if (selectedPeriodos.length > 0) {
        selectedPeriodos.forEach((periodo) => {
          if (/^\d{4}-\d{2}$/.test(periodo)) {
            params.append("cveper", periodo);
          } else {
            const normalizedCveper =
              periodo.includes("T") || periodo.includes("Z") ? new Date(periodo).toISOString().split("T")[0] : periodo;
            params.append("cveper", normalizedCveper);
          }
        });
      }
      
      params.append("orderBy", sortBy);
      params.append("orderDirection", sortDir);
      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());
      params.append("fullData", "true");
      params.append("includeAllFields", "true");

      const finalUrl = `${buildApiUrl("/api/payroll")}?${params.toString()}`;
      
      // Filter/Sort: API request URL and parameters
      console.log('Filter/Sort - API URL:', finalUrl);
      console.log('Filter/Sort - Parameters:', {
        orderBy: sortBy,
        orderDirection: sortDir,
        page: page,
        pageSize: pageSize
      });
      
      const response = await authenticatedFetch(finalUrl);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        
        const transformedEmployees = result.data.map((employee, index) => {
          
          return {
            id: `${employee.rfc || employee["RFC"] || "emp_" + index}_${
              employee.cveper || employee.mes || "periodo"
            }_${index}`,
            name: employee.nombre || employee["Nombre completo"] || "N/A",
            position: employee.puesto || employee["Puesto"] || "N/A",
            department: employee.sucursal || employee["Sucursal"] || "N/A",
            rfc: employee.rfc || employee["RFC"] || "N/A",
            curp: employee.curp || employee["CURP"] || "N/A",
            status: employee.estado || employee["Status"] || employee.status || "N/A",
            startDate: employee["fechaAntiguedad"] || employee["Fecha antigüedad"] || employee["antiguedadFPL"] || null,
            salary: (() => {
              // Buscar salario en múltiples posibles claves devueltas por el backend
              const candidates = [
                ["salario", employee.salario],
                ["salary", employee.salary],
                ["sueldo", employee.sueldo],
                ["SUELDO CLIENTE", employee["SUELDO CLIENTE"]],
                [" SUELDO CLIENTE", employee[" SUELDO CLIENTE"]],
                ["SUELDO", employee["SUELDO"]],
                [" SUELDO ", employee[" SUELDO "]],
              ];
              const found = candidates.find(([k, v]) => v !== null && v !== undefined && v !== "");
              const salarioValue = found ? found[1] : undefined;
              
              if (salarioValue !== null && salarioValue !== undefined) {
                const parsed = parseFloat(String(salarioValue).toString().replace(",", ""));
                if (!isNaN(parsed)) {
                  return parsed;
                }
              }
              
              return null;
            })(),
            commissions: (() => {
              // El backend ya calcula la suma: COMISIONES CLIENTE + COMISIONES FACTURADAS
              const comisionesTotal = employee.comisiones || employee.commissions;
              
              // CORRECCIÓN CRÍTICA: Distinguir entre 0 válido y dato faltante
              if (comisionesTotal !== null && comisionesTotal !== undefined) {
                const parsed = parseFloat(String(comisionesTotal).toString().replace(",", ""));
                if (!isNaN(parsed)) {
                  return parsed; // Retornar número (incluyendo 0 si aplica)
                }
              }
              return null; // null permite sorting correcto, tabla mostrará 'N/A'
            })(),
            comisionesCliente: parseFloat(employee.comisionesCliente || 0),
            comisionesFacturadas: parseFloat(employee.comisionesFacturadas || 0),
            " TOTAL DE PERCEPCIONES ": (() => {
              // USAR SOLO EL CAMPO EXACTO DE LA BASE DE DATOS: ' TOTAL DE PERCEPCIONES '
              // Probar múltiples posibles nombres del campo
              const candidates = [
                [" TOTAL DE PERCEPCIONES ", employee[" TOTAL DE PERCEPCIONES "]],
                ["totalPercepciones", employee.totalPercepciones],
                ["TOTAL DE PERCEPCIONES", employee["TOTAL DE PERCEPCIONES"]],
                [" PERCEPCIONES TOTALES ", employee[" PERCEPCIONES TOTALES "]],
              ];
              // CORRECCIÓN: No filtrar valores === 0, solo null/undefined/string vacía
              const found = candidates.find(([k, v]) => v !== null && v !== undefined && v !== "");
              const value = found ? found[1] : undefined;
              
              // CORRECCIÓN CRÍTICA: Distinguir entre 0 válido y dato faltante
              if (value !== null && value !== undefined) {
                const parsed = parseFloat(String(value).toString().replace(",", ""));
                if (!isNaN(parsed)) {
                  return parsed; // Retornar número (incluyendo 0 si aplica)
                }
              }
              return null; // null permite sorting correcto, tabla mostrará 'N/A'
            })(),
            costoNomina: (() => {
              const candidates = [
                ["costoNomina", employee.costoNomina],
                ["COSTO DE NOMINA", employee["COSTO DE NOMINA"]],
                [" COSTO DE NOMINA ", employee[" COSTO DE NOMINA "]],
                ["COSTO_DE_NOMINA", employee["COSTO_DE_NOMINA"]],
                ["costodenomina", employee.costodenomina],
                ["costo_nomina", employee.costo_nomina],
                ["costo", employee.costo],
              ];
              const found = candidates.find(([k, v]) => v !== null && v !== undefined && v !== "");
              const value = found ? found[1] : undefined;
              
              if (value !== null && value !== undefined) {
                const parsed = parseFloat(String(value).toString().replace(",", ""));
                if (!isNaN(parsed)) {
                  return parsed;
                }
              }
              return 0;
            })(),
            years: null,
            periodo: (() => {
              // CORREGIDO: Usar directamente el campo 'periodo' que viene del backend (DATE(cveper))
              if (employee.periodo) {
                return employee.periodo; // Ya viene en formato YYYY-MM-DD desde el backend
              }
              // Fallback: intentar formatear cveper si periodo no existe
              // EXTRAER VALOR: Si cveper es un objeto, extraer el valor correcto
              const cveperValue =
                typeof employee.cveper === "object" && employee.cveper !== null
                  ? employee.cveper.value || employee.cveper.fecha || employee.cveper.date || employee.cveper.cveper
                : employee.cveper;
              
              const cveperFormatted = formatCveperForTable(cveperValue);
              if (cveperFormatted && cveperFormatted !== "") {
                return cveperFormatted;
              }
              // Último fallback
              return "N/A";
            })(),
          };
        });
        
        setEmployees([...transformedEmployees]);
        setPagination({
          page: result.pagination.page,
          pageSize: result.pagination.pageSize,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        });
      } else {
        setError("Error al obtener datos de empleados");
        setEmployees([]);
      }
    } catch (err) {
      setError(err.message || "Error al cargar datos de empleados");
      // CRITICAL FIX: Clear employees on error to prevent stale data
      setEmployees([]);
      setPagination({
        page: 1,
        pageSize: pagination.pageSize || 50,
        total: 0,
        totalPages: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply local sorting to employees for numeric fields (like TablaDemografico)
  const sortedEmployees = useMemo(() => {
    // If sorting by a server-side field, return employees as-is (server handles sorting)
    if (serverSortFields.includes(localSortBy)) {
      return employees;
    }
    
    // Apply local sorting for numeric fields (salario, comisiones, percepcionesTotales)
    if (['salario', 'comisiones', 'percepcionesTotales'].includes(localSortBy)) {
      return [...employees].sort((a, b) => {
        let aValue = a[localSortBy] || a.salary || a.commissions || a[' TOTAL DE PERCEPCIONES '] || 0;
        let bValue = b[localSortBy] || b.salary || b.commissions || b[' TOTAL DE PERCEPCIONES '] || 0;
        
        // Parse numeric values
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
        
        if (localSortDir === 'desc') {
          return bValue - aValue; // Descending: higher to lower
        } else {
          return aValue - bValue; // Ascending: lower to higher
        }
      });
    }
    
    // For text fields, apply alphabetical sorting
    return [...employees].sort((a, b) => {
      let aValue = (a[localSortBy] || '').toString().toLowerCase();
      let bValue = (b[localSortBy] || '').toString().toLowerCase();
      
      if (localSortDir === 'desc') {
        return bValue.localeCompare(aValue);
      } else {
        return aValue.localeCompare(bValue);
      }
    });
  }, [employees, localSortBy, localSortDir, serverSortFields]);

  // Mostrar loading inicial
  if (initialLoading) {
    return (
      <StyledThemeProvider theme={theme}>
        <PageContainer>
        <PageHeader>
            <FaUsers size={40} color={theme?.brand?.primary || "#1e3a8a"} />
          <PageTitle>Búsqueda de Empleados</PageTitle>
        </PageHeader>
        <LoadingContainer>
          <LoadingSpinner size={48} />
            <h3 style={{ marginTop: "1rem", color: theme?.brand?.primary || "#1e3a8a" }}>
              Cargando sistema de búsqueda...
            </h3>
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
          <FaUsers size={40} color={theme?.brand?.primary || "#1e3a8a"} />
          <PageTitle>Búsqueda de Empleados</PageTitle>
          {latestPeriod && <PeriodBadge>Período: {latestPeriod}</PeriodBadge>}
        </PageHeader>

      <SearchSection>
        <FiltersContainer $show={true}>
          {/* Componente BuscarEmpleado */}
          <BuscarEmpleado
            placeholder="Nombre / CURP"
            value={employeeSearchTerm}
              onChange={(value) => {
                setEmployeeSearchTerm(value);
              }}
          />
          
          {/* DropDownMenu para Sucursales - USAR OPCIONES ESTÁTICAS */}
          <DropDownMenu
            label="Sucursal"
              options={
                staticFilterOptions.categorias.length > 0 ? staticFilterOptions.categorias : filterOptions.categorias
              }
            selectedValues={selectedSucursales}
            onChange={setSelectedSucursales}
            placeholder="Todas las sucursales"
            searchPlaceholder="Buscar sucursal..."
            showCount={true}
          />
          
          {/* DropDownMenu para Puestos - USAR OPCIONES ESTÁTICAS */}
          <DropDownMenu
            label="Puesto"
              options={
                (staticFilterOptions.puestos && staticFilterOptions.puestos.length > 0) 
                  ? staticFilterOptions.puestos 
                  : (filterOptions.puestos && filterOptions.puestos.length > 0)
                    ? filterOptions.puestos
                    : []
              }
            selectedValues={selectedPuestos}
            onChange={setSelectedPuestos}
            placeholder="Todos los puestos"
            searchPlaceholder="Buscar puesto..."
            showCount={true}
          />
          
          {/* DropDownMenu para Puesto Categorizado - USAR OPCIONES ESTÁTICAS */}
          <DropDownMenu
            label="Puesto Categorizado"
              options={
                staticFilterOptions.puestosCategorias.length > 0
                  ? staticFilterOptions.puestosCategorias
                  : filterOptions.puestosCategorias
              }
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

            {/* Dropdown para Periodo - ALWAYS use DropDownMenu to prevent component swapping */}
            {/* CRITICAL FIX: Never swap components to avoid DOM portal errors */}
            <DropDownMenu
              key="period-dropdown-stable"
              label="Periodo"
              options={staticFilterOptions.periodos.length > 0 ? staticFilterOptions.periodos : filterOptions.periodos}
              selectedValues={selectedPeriodos}
              onChange={setSelectedPeriodos}
              placeholder="Todos los periodos"
              searchPlaceholder="Buscar periodo..."
              showCount={true}
              preserveOrder={true}
            />
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
                    pages.push("...");
                  pages.push(totalPages);
                } else if (page >= totalPages - 3) {
                  // Cerca del final
                  pages.push(1);
                    pages.push("...");
                  for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
                } else {
                  // En el medio
                  pages.push(1);
                    pages.push("...");
                  for (let i = page - 1; i <= page + 1; i++) pages.push(i);
                    pages.push("...");
                  pages.push(totalPages);
                }
              }
              
              return pages.map((pageNum, index) => {
                  if (pageNum === "...") {
                    return <PageEllipsis key={`ellipsis-${index}`}>•••</PageEllipsis>;
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
            
              <PageInfo>de {pagination.totalPages.toLocaleString("es-MX")}</PageInfo>
          </PaginationContainer>
          
          {/* Estadísticas en el centro */}
          <StatsContainer>
            {pagination && pagination.total > 0 ? (
              <div>
                  {uniqueEmployeesCount > 0 ? uniqueEmployeesCount.toLocaleString("es-MX") : "..."} Empleados /{" "}
                  {pagination.total.toLocaleString("es-MX")} Entradas
                {employees.length > 0 && pagination.total !== employees.length && (
                    <span>
                      {" "}
                      (página {pagination.page} de {pagination.totalPages})
                    </span>
                )}
              </div>
              ) : datasetStats &&
                typeof datasetStats === "object" &&
                datasetStats.uniqueEmployees &&
                datasetStats.uniqueEmployees > 0 ? (
                <div>
                  {datasetStats.uniqueEmployees.toLocaleString("es-MX")} Empleados /{" "}
                  {(datasetStats.totalRecords || 0).toLocaleString("es-MX")} Entradas
                </div>
              ) : (
                <div>Conectando con la base de datos...</div>
            )}
          </StatsContainer>
          
          {/* Botones de vista y exportar a la derecha */}
          <ViewButtonsContainer>
              <ViewModeButton type="button" onClick={() => setViewMode("cards")} $isActive={viewMode === "cards"}>
              <FaTh />
              Tarjetas
            </ViewModeButton>
              <ViewModeButton type="button" onClick={() => setViewMode("table")} $isActive={viewMode === "table"}>
              <FaTable />
              Tabla
            </ViewModeButton>
            <ExportButton onClick={exportResults} disabled={loading}>
                {loading ? (
                  <FaSpinner style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <FaDownload />
                )}
              Exportar CSV
            </ExportButton>
            <CollapseButton 
              onClick={() => setIsTableCollapsed(!isTableCollapsed)}
              title={isTableCollapsed ? "Expandir tabla" : "Contraer tabla"}
                disabled={viewMode !== "table"}
            >
              {isTableCollapsed ? <FaExpandArrowsAlt /> : <FaCompressArrowsAlt />}
                {isTableCollapsed ? "Expandir" : "Contraer"}
            </CollapseButton>
          </ViewButtonsContainer>
        </ControlsContainer>

        {error && (
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                background: "rgba(255, 107, 107, 0.1)",
                borderRadius: "12px",
                border: "1px solid rgba(255, 107, 107, 0.3)",
                marginBottom: "1rem",
              }}
            >
              <FaTimes size={24} color="#ff6b6b" style={{ marginBottom: "0.5rem" }} />
              <h4 style={{ color: "#ff6b6b", margin: "0.5rem 0" }}>Error al cargar datos</h4>
            <p style={{ opacity: 0.8, margin: 0 }}>{error}</p>
          </div>
        )}

        {loading && (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <FaSpinner size={32} color="#1e3a8a" style={{ animation: "spin 1s linear infinite" }} />
              <p style={{ marginTop: "1rem", opacity: 0.8 }}>Buscando empleados...</p>
          </div>
        )}

        {!loading && !error && employees.length === 0 ? (
          <NoResults>
              <FaTimes size={48} style={{ marginBottom: "1rem", opacity: 0.5 }} />
            <h3>No se encontraron empleados</h3>
            <p>Intenta ajustar los términos de búsqueda o filtros</p>
          </NoResults>
        ) : (
            !loading &&
            !error && (
            <>
              {/* Vista de tabla */}
                {viewMode === "table" && (
                <TableContainer $collapsed={isTableCollapsed}>
                  <EmployeeTable 
                      key={`employee-table-${employeeSearchTerm}-${pagination.page}-${sortedEmployees.length}`}
                    employees={sortedEmployees}
                    loading={loading}
                    onViewEmployee={viewEmployee}
                    onEditEmployee={editEmployee}
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    // Props para sorting - hybrid: server-side para texto, local para numéricos
                    sortBy={serverSortFields.includes(localSortBy) ? sortBy : localSortBy}
                    sortDir={serverSortFields.includes(localSortBy) ? sortDir : localSortDir}
                    onSortChange={handleSortChange}
                  />
                </TableContainer>
              )}
              
              {/* Vista de tarjetas */}
                {viewMode === "cards" && (
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
                              {employee.startDate
                                ? (() => {
                              // Si es un timestamp ISO, extraer solo la parte de la fecha
                              let fecha = employee.startDate;
                                    if (typeof fecha === "string" && fecha.includes("T")) {
                                      fecha = fecha.split("T")[0];
                                    }
                                    return new Date(fecha + "T12:00:00").toLocaleDateString("es-MX", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    });
                                  })()
                                : "N/A"}
                          </DetailValue>
                        </DetailRow>
                        <DetailRow>
                          <DetailLabel>Años de antigüedad:</DetailLabel>
                            <DetailValue>{employee.years || "N/A"}</DetailValue>
                        </DetailRow>
                        {employee.salary && (
                          <DetailRow>
                            <DetailLabel>Salario:</DetailLabel>
                              <DetailValue>${employee.salary?.toLocaleString("es-MX")}</DetailValue>
                          </DetailRow>
                        )}
                      </EmployeeDetails>

                      <EmployeeActions>
                          <ActionButton primary onClick={() => viewEmployee(employee)}>
                          <FaEye />
                          Ver
                        </ActionButton>
                          <ActionButton onClick={() => editEmployee(employee)}>Editar</ActionButton>
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
            // Pasar sorting local para sincronizar con la tabla
            localSortBy={localSortBy}
            localSortDir={localSortDir}
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

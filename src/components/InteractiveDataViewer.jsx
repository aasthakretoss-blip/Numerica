import { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { 
  FaTable, FaUsers, FaChartBar, FaBriefcase, 
  FaSpinner, FaTimes, FaInfoCircle, FaExpand,
  FaSort, FaSortUp, FaSortDown,
  FaAngleDoubleLeft, FaAngleDoubleRight, 
  FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { useChartEvents, SELECTION_TYPES } from '../hooks/useChartEvents';
import { buildDemographicFilterParams } from '../services/demographicFiltersApi';
import { formatCveperForTable } from '../utils/periodUtils.ts';

// Styled Components para diseño horizontal y ancho completo
const ViewerContainer = styled.div`
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  margin: 2rem 0;
  overflow: hidden;
  transition: all 0.3s ease;
`;

const ViewerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05));
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderTitle = styled.h3`
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0;
  color: #1e3a8a;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const SelectionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #374151;
  background: rgba(59, 130, 246, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.2);
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ActionButton = styled.button`
  background: ${props => props.$variant === 'close' ? 
    'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  border: 1px solid ${props => props.$variant === 'close' ? 
    'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'};
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  color: ${props => props.$variant === 'close' ? '#dc2626' : '#1e3a8a'};
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  
  &:hover {
    background: ${props => props.$variant === 'close' ? 
      'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'};
    transform: translateY(-1px);
  }
`;

const ViewerContent = styled.div`
  display: flex;
  flex-direction: column;
  height: 600px; /* Altura fija para evitar saltos */
`;

const StatsBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(249, 250, 251, 0.8);
  border-bottom: 1px solid rgba(229, 231, 235, 0.8);
`;

const StatsLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e3a8a;
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TableContainer = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const TableWrapper = styled.div`
  flex: 1;
  overflow-x: auto;
  overflow-y: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  color: #374151;
`;

const TableHeaderRow = styled.thead`
  background: rgba(249, 250, 251, 0.95);
  border-bottom: 2px solid rgba(59, 130, 246, 0.2);
  position: sticky;
  top: 0;
  z-index: 10;
`;

const HeaderCell = styled.th`
  padding: 1rem 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #1e3a8a;
  border-bottom: 1px solid rgba(229, 231, 235, 0.8);
  white-space: nowrap;
  background: rgba(249, 250, 251, 0.95);
`;

const SortButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: inherit;
  font-size: inherit;
  
  &:hover {
    color: #2563eb;
  }
`;

const TableBody = styled.tbody`
  background: rgba(255, 255, 255, 0.8);
`;

const TableRow = styled.tr`
  border-bottom: 1px solid rgba(229, 231, 235, 0.5);
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(59, 130, 246, 0.05);
  }
`;

const TableCell = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid rgba(229, 231, 235, 0.3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
`;

const EmployeeNameButton = styled.button`
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  text-decoration: underline;
  font-size: inherit;
  
  &:hover {
    color: #1d4ed8;
  }
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  background: ${props => {
    switch (props.$status) {
      case 'Activo': return 'rgba(34, 197, 94, 0.2)';
      case 'Baja': return 'rgba(239, 68, 68, 0.2)';
      case 'Finiquitado': return 'rgba(245, 158, 11, 0.2)';
      default: return 'rgba(156, 163, 175, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'Activo': return '#059669';
      case 'Baja': return '#dc2626';
      case 'Finiquitado': return '#d97706';
      default: return '#6b7280';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$status) {
      case 'Activo': return 'rgba(34, 197, 94, 0.3)';
      case 'Baja': return 'rgba(239, 68, 68, 0.3)';
      case 'Finiquitado': return 'rgba(245, 158, 11, 0.3)';
      default: return 'rgba(156, 163, 175, 0.3)';
    }
  }};
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #6b7280;
  gap: 1rem;
`;

const EmptyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #6b7280;
  gap: 1rem;
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(249, 250, 251, 0.8);
  border-top: 1px solid rgba(229, 231, 235, 0.8);
`;

const PaginationInfo = styled.div`
  color: #6b7280;
  font-size: 0.9rem;
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PageSizeSelect = styled.select`
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(229, 231, 235, 0.8);
  border-radius: 8px;
  padding: 0.5rem;
  color: #374151;
  font-size: 0.9rem;
  margin-right: 1rem;
  
  option {
    background: white;
    color: #374151;
  }
`;

const PaginationButton = styled.button`
  background: ${props => props.$active ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.9)'};
  border: 1px solid ${props => props.$active ? '#3b82f6' : 'rgba(229, 231, 235, 0.8)'};
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  color: ${props => props.$active ? '#1e3a8a' : '#6b7280'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.1);
    color: #1e3a8a;
  }
`;

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500];

// Función para obtener el icono según el tipo de selección
const getSelectionIcon = (type) => {
  switch (type) {
    case SELECTION_TYPES.PYRAMID_AGE_GENDER:
      return <FaUsers />;
    case SELECTION_TYPES.SALARY_AGE_GENDER_BAND:
      return <FaChartBar />;
    case SELECTION_TYPES.POSITION_GENDER:
      return <FaBriefcase />;
    default:
      return <FaInfoCircle />;
  }
};

// Función para obtener descripción legible de la selección
const getSelectionDescription = (selection) => {
  if (!selection) return 'Sin selección';

  const { type, data, source } = selection;

  switch (type) {
    case SELECTION_TYPES.PYRAMID_AGE_GENDER:
      return `${data.gender === 'male' ? 'Hombres' : 'Mujeres'} de ${data.age} años`;
    
    case SELECTION_TYPES.SALARY_AGE_GENDER_BAND:
      return `${data.gender === 'male' ? 'Hombres' : 'Mujeres'} de ${data.age} años - ${data.salaryBand?.label || 'Banda salarial'}`;
    
    case SELECTION_TYPES.POSITION_GENDER:
      return `${data.gender === 'male' ? 'Hombres' : 'Mujeres'} - ${data.position}`;
    
    default:
      return `Selección de ${source}`;
  }
};

export default function InteractiveDataViewer() {
  const { currentSelection, clearSelection } = useChartEvents();
  
  // Estado para datos
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    shown: 0,
    uniqueEmployees: 0
  });
  
  // Estado para paginación
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0
  });
  
  // Estado para sorting
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');

  // Definir columnas de la tabla
  const columns = [
    { key: 'nombre', label: 'Empleado', sortable: true },
    { key: 'curp', label: 'CURP', sortable: true },
    { key: 'puesto', label: 'Puesto', sortable: true },
    { key: 'sucursal', label: 'Sucursal', sortable: true },
    { key: 'periodo', label: 'Período', sortable: true },
    { key: 'salario', label: 'Salario', sortable: true },
    { key: 'comisiones', label: 'Comisiones', sortable: true },
    { key: 'total', label: 'Total', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true }
  ];

  // Construir filtros basados en la selección actual
  const buildFiltersFromSelection = useMemo(() => {
    if (!currentSelection) return {};

    const { type, data } = currentSelection;
    const filters = {
      status: 'A' // Solo empleados activos
    };

    switch (type) {
      case SELECTION_TYPES.PYRAMID_AGE_GENDER:
        // No podemos filtrar por edad exacta en el backend actual
        // Mostraremos todos los empleados con explicación
        break;
      
      case SELECTION_TYPES.SALARY_AGE_GENDER_BAND:
        // Similar al anterior, no podemos filtrar por edad/salario exacto
        break;
      
      case SELECTION_TYPES.POSITION_GENDER:
        if (data.position) {
          filters.puesto = data.position;
        }
        break;
    }

    return filters;
  }, [currentSelection]);

  // Cargar datos cuando cambie la selección
  const loadData = async () => {
    if (!currentSelection) {
      setData([]);
      setStats({ total: 0, shown: 0, uniqueEmployees: 0 });
      return;
    }

    setLoading(true);

    try {
      // Construir parámetros para la API
      const filterParams = buildFiltersFromSelection;
      
      const additionalParams = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        sortBy,
        sortDir
      };
      
      const params = buildDemographicFilterParams(filterParams, additionalParams);
      
      console.log('📊 InteractiveDataViewer: Cargando datos con selección:', {
        selection: currentSelection,
        filters: filterParams,
        params: params.toString()
      });

      const response = await fetch(`https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com/prod/api/payroll/demographic?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          // Transformar datos para la tabla
          const transformedData = result.data.map(emp => ({
            nombre: emp.nombre,
            curp: emp.curp,
            puesto: emp.puesto,
            sucursal: emp.sucursal,
            periodo: emp.mes || formatCveperForTable(emp.cveper),
            salario: emp.sueldo || 0,
            comisiones: emp.comisiones || 0,
            total: emp.totalPercepciones || 0,
            estado: emp.status === 'A' ? 'Activo' : emp.status === 'B' ? 'Baja' : 'Finiquitado'
          }));

          setData(transformedData);
          setPagination(prev => ({
            ...prev,
            total: result.total || 0,
            totalPages: Math.ceil((result.total || 0) / prev.pageSize)
          }));
          
          setStats({
            total: result.total || 0,
            shown: transformedData.length,
            uniqueEmployees: result.total || 0 // Asumiendo que son únicos
          });
        }
      }
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Efectos
  useEffect(() => {
    loadData();
  }, [currentSelection, pagination.page, pagination.pageSize, sortBy, sortDir]);

  // Manejadores de eventos
  const handleSort = (key) => {
    if (key === sortBy) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getSortIcon = (key) => {
    if (sortBy !== key) return <FaSort />;
    return sortDir === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handlePageSizeChange = (newPageSize) => {
    setPagination(prev => ({ 
      ...prev, 
      pageSize: newPageSize, 
      page: 1 
    }));
  };

  const handleViewEmployee = (employee) => {
    const identifier = employee.curp?.trim();
    if (identifier) {
      const fullUrl = `${window.location.origin}/perfil/${identifier}`;
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Generar números de página
  const generatePageNumbers = () => {
    const { page, totalPages } = pagination;
    const pages = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }
    return pages;
  };

  // Si no hay selección, no mostrar el componente
  if (!currentSelection) {
    return null;
  }

  return (
    <ViewerContainer>
      <ViewerHeader>
        <HeaderLeft>
          <HeaderTitle>
            <FaTable />
            Datos de Selección
          </HeaderTitle>
          <SelectionInfo>
            {getSelectionIcon(currentSelection.type)}
            {getSelectionDescription(currentSelection)}
          </SelectionInfo>
        </HeaderLeft>
        <HeaderRight>
          <ActionButton onClick={clearSelection} $variant="close">
            <FaTimes />
            Cerrar
          </ActionButton>
        </HeaderRight>
      </ViewerHeader>

      <ViewerContent>
        <StatsBar>
          <StatsLeft>
            <StatItem>
              <StatValue>{stats.total}</StatValue>
              <StatLabel>Total</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{stats.shown}</StatValue>
              <StatLabel>Mostrados</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{pagination.page}</StatValue>
              <StatLabel>Página</StatLabel>
            </StatItem>
          </StatsLeft>
        </StatsBar>

        <TableContainer>
          {loading ? (
            <LoadingContainer>
              <FaSpinner size={32} style={{ animation: 'spin 1s linear infinite' }} />
              <p>Cargando datos de selección...</p>
            </LoadingContainer>
          ) : data.length === 0 ? (
            <EmptyContainer>
              <FaInfoCircle size={32} />
              <p>No hay datos disponibles para esta selección</p>
              <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
                Intenta hacer clic en una barra diferente del gráfico
              </p>
            </EmptyContainer>
          ) : (
            <TableWrapper>
              <Table>
                <TableHeaderRow>
                  <tr>
                    {columns.map(col => (
                      <HeaderCell key={col.key}>
                        {col.sortable ? (
                          <SortButton onClick={() => handleSort(col.key)}>
                            {col.label}
                            {getSortIcon(col.key)}
                          </SortButton>
                        ) : (
                          col.label
                        )}
                      </HeaderCell>
                    ))}
                  </tr>
                </TableHeaderRow>
                <TableBody>
                  {data.map((employee, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <EmployeeNameButton 
                          onClick={() => handleViewEmployee(employee)}
                          title={`Ver perfil de ${employee.nombre}`}
                        >
                          {employee.nombre}
                        </EmployeeNameButton>
                      </TableCell>
                      <TableCell>
                        <code style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                          {employee.curp}
                        </code>
                      </TableCell>
                      <TableCell>{employee.puesto}</TableCell>
                      <TableCell>{employee.sucursal}</TableCell>
                      <TableCell style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {employee.periodo}
                      </TableCell>
                      <TableCell>
                        <strong>
                          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(employee.salario)}
                        </strong>
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(employee.comisiones)}
                      </TableCell>
                      <TableCell>
                        <strong style={{ color: '#1e3a8a' }}>
                          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(employee.total)}
                        </strong>
                      </TableCell>
                      <TableCell>
                        <StatusBadge $status={employee.estado}>
                          {employee.estado}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          )}
        </TableContainer>

        {!loading && data.length > 0 && (
          <PaginationContainer>
            <PaginationInfo>
              Mostrando {Math.min(pagination.pageSize * (pagination.page - 1) + 1, pagination.total)} - {Math.min(pagination.pageSize * pagination.page, pagination.total)} de {pagination.total} registros
            </PaginationInfo>
            
            <PaginationControls>
              <PageSizeSelect 
                value={pagination.pageSize} 
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map(size => (
                  <option key={size} value={size}>{size} por página</option>
                ))}
              </PageSizeSelect>

              <PaginationButton 
                onClick={() => handlePageChange(1)}
                disabled={pagination.page === 1}
              >
                <FaAngleDoubleLeft />
              </PaginationButton>
              
              <PaginationButton 
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <FaChevronLeft />
              </PaginationButton>

              {generatePageNumbers().map((pageNum, index) => (
                typeof pageNum === 'number' ? (
                  <PaginationButton
                    key={pageNum}
                    $active={pageNum === pagination.page}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </PaginationButton>
                ) : (
                  <span key={index} style={{ color: '#9ca3af', padding: '0 0.5rem' }}>
                    {pageNum}
                  </span>
                )
              ))}

              <PaginationButton 
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                <FaChevronRight />
              </PaginationButton>
              
              <PaginationButton 
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages}
              >
                <FaAngleDoubleRight />
              </PaginationButton>
            </PaginationControls>
          </PaginationContainer>
        )}
      </ViewerContent>
    </ViewerContainer>
  );
}

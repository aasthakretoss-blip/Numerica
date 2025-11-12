import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { 
  FaSort, FaSortUp, FaSortDown, FaSpinner, 
  FaAngleDoubleLeft, FaAngleDoubleRight, 
  FaChevronLeft, FaChevronRight 
} from 'react-icons/fa'
import { parseMoney, formatCurrency, formatPeriod } from '../utils/data.js'
import { useServerPagination } from '../hooks/useServerPagination.js'
import { surfaces, textColors, effects, brandColors, semanticColors } from '../styles/ColorTokens'

// Styled Components
const TableContainer = styled.div`
  width: 100%;
  background: ${surfaces.glass.strong};
  backdrop-filter: ${effects.blur.medium};
  border-radius: 20px;
  border: 1px solid ${surfaces.borders.medium};
  overflow: hidden;
  box-shadow: ${effects.shadows.medium};
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: ${brandColors.primary};
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  max-width: 100%;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  color: ${textColors.primary};
`;

const TableHeader = styled.thead`
  background: ${surfaces.buttons.filter};
  border-bottom: 2px solid ${surfaces.borders.accent};
`;

const HeaderCell = styled.th`
  padding: 1rem 0.75rem;
  text-align: left;
  font-weight: 600;
  color: ${brandColors.primary};
  border-bottom: 1px solid ${surfaces.borders.subtle};
  white-space: nowrap;
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
    color: ${brandColors.primaryDark};
  }
`;

const TableBody = styled.tbody`
  background: ${surfaces.glass.subtle};
`;

const TableRow = styled.tr`
  border-bottom: 1px solid ${surfaces.borders.subtle};
  
  &:hover {
    background: ${surfaces.buttons.filter};
  }
`;

const TableCell = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid ${surfaces.borders.subtle};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
`;

const EmployeeNameButton = styled.button`
  background: none;
  border: none;
  color: ${brandColors.primary};
  cursor: pointer;
  text-decoration: underline;
  font-size: inherit;
  font-weight: 600;
  
  &:hover {
    color: ${brandColors.primaryDark};
    text-decoration: underline;
  }
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  background: ${
    props => {
      switch (props.$status) {
        case 'Activo': return '${surfaces.buttons.success}';
        case 'Baja': return '${surfaces.overlays.light}';
        default: return '${surfaces.glass.light}';
      }
    }
  };
  color: ${
    props => {
      switch (props.$status) {
        case 'Activo': return '${semanticColors.success}';
        case 'Baja': return '${semanticColors.error}';
        default: return '${textColors.muted}';
      }
    }
  };
  border: 1px solid ${
    props => {
      switch (props.$status) {
        case 'Activo': return '${surfaces.borders.success}';
        case 'Baja': return '${semanticColors.error}';
        default: return '${surfaces.borders.subtle}';
      }
    }
  };
`;

const NoResultsContainer = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${textColors.muted};
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: ${surfaces.buttons.filter};
  border-top: 1px solid ${surfaces.borders.subtle};
  flex-wrap: wrap;
  gap: 1rem;
`;

const PaginationInfo = styled.div`
  color: ${textColors.secondary};
  font-size: 0.9rem;
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const PageSizeSelect = styled.select`
  background: ${surfaces.glass.strong};
  border: 1px solid ${surfaces.borders.medium};
  border-radius: 8px;
  padding: 0.5rem;
  color: ${textColors.primary};
  font-size: 0.9rem;
  margin-right: 1rem;
  
  option {
    background: ${surfaces.glass.strong};
    color: ${textColors.primary};
  }
`;

const PaginationButton = styled.button`
  background: ${props => props.$active ? brandColors.primary : surfaces.glass.strong};
  border: 1px solid ${props => props.$active ? brandColors.primary : surfaces.borders.medium};
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  color: ${props => props.$active ? 'white' : textColors.primary};
  cursor: pointer;
  transition: ${effects.states.transitionFast};
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &:hover:not(:disabled) {
    background: ${surfaces.buttons.filter};
    color: ${brandColors.primary};
    border-color: ${brandColors.primary};
  }
`;

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500, 1000]

export default function EmployeeTable({ 
  employees, 
  loading, 
  onViewEmployee, 
  pagination, 
  onPageChange, 
  onPageSizeChange,
  // Props para server-side sorting (actualmente no usado - todo es local sorting)
  sortBy = 'nombre',
  sortDir = 'asc', 
  onSortChange,
  // Callback para notificar cambios en el sorting local
  onLocalSortChange
}) {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  // Load database statistics on component mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('http://numericaapi.kretosstechnology.com/api/payroll/stats')
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setStats(result.stats)
          }
        }
      } catch (error) {
        console.error('Error loading stats:', error)
      }
    }
    loadStats()
  }, [])

  // Local state for sorting (solo para campos que no tienen server sorting)
  const [localSortBy, setLocalSortBy] = useState('nombre')
  const [localSortDir, setLocalSortDir] = useState('asc')
  
  // Notificar cambios en el sorting local al padre
  React.useEffect(() => {
    if (onLocalSortChange) {
      onLocalSortChange(localSortBy, localSortDir);
    }
  }, [localSortBy, localSortDir, onLocalSortChange]);

  // Campos que usan server-side sorting (ninguno - todo es local sorting)
  const serverSortFields = []

  // Función híbrida para manejar sorting
  const toggleSort = (key) => {
    console.log('🔄 EmployeeTable.toggleSort llamado:', { key, sortBy, sortDir, hasOnSortChange: !!onSortChange })
    
    if (serverSortFields.includes(key) && onSortChange) {
      // Server-side sorting para comisiones
      let newDirection
      if (key === sortBy) {
        newDirection = sortDir === 'asc' ? 'desc' : 'asc'
      } else {
        newDirection = 'asc'
      }
      
      console.log('📤 EmployeeTable: Enviando cambio de sorting al servidor para', key, ':', { key, newDirection })
      onSortChange(key, newDirection)
    } else {
      // Local sorting para otros campos
      console.log('🔄 EmployeeTable: Aplicando sorting local:', { key })
      if (key === localSortBy) {
        setLocalSortDir(localSortDir === 'asc' ? 'desc' : 'asc')
      } else {
        setLocalSortBy(key)
        setLocalSortDir('asc')
      }
    }
  }

  const getSortIcon = (key) => {
    if (serverSortFields.includes(key)) {
      // Para campos con server sorting, usar el estado del servidor
      if (sortBy !== key) return <FaSort />
      return sortDir === 'asc' ? <FaSortUp /> : <FaSortDown />
    } else {
      // Para campos con sorting local
      if (localSortBy !== key) return <FaSort />
      return localSortDir === 'asc' ? <FaSortUp /> : <FaSortDown />
    }
  }

  const columns = [
    { key: 'nombre', label: 'Empleado', sortable: true },
    { key: 'curp', label: 'CURP', sortable: true },
    { key: 'puesto', label: 'Puesto', sortable: true },
    { key: 'sucursal', label: 'Sucursal', sortable: true },
    { key: 'periodo', label: 'Período', sortable: true },
    { key: 'salario', label: 'Salario', sortable: true },
    { key: 'comisiones', label: 'Comisiones', sortable: true }, // Local sorting
    { key: 'totalPercepciones', label: 'Total', sortable: true }, // Local sorting
    { key: 'estado', label: 'Estado', sortable: true }
  ]

  // Apply local sorting to the data (solo para campos que no usan server sorting)
  const sortedData = useMemo(() => {
    const transformedData = employees.map(emp => ({
      nombre: emp.name || emp.nombre,
      curp: emp.curve || emp.curp,
      puesto: emp.position || emp.puesto,
      sucursal: emp.department || emp.sucursal,
      periodo: emp.periodo || emp.mes || 'N/A', // CORREGIDO: usar 'periodo' como key
      salario: emp.salary || emp.sueldo || 0,
      comisiones: emp.commissions || emp.comisiones || 0,
      totalPercepciones: emp.totalCost || emp.totalPercepciones || 0,
      estado: emp.status || emp.estado,
      perfilUrl: null
    }))

    // Solo aplicar sorting local si no es un campo con server sorting
    if (serverSortFields.includes(localSortBy)) {
      // Si estamos ordenando por un campo de servidor, no aplicar sorting local
      return transformedData
    }

    // Apply local sorting para campos que no tienen server sorting
    return [...transformedData].sort((a, b) => {
      let aValue = a[localSortBy]
      let bValue = b[localSortBy]

      // Handle numeric sorting for salary, commissions and total fields (local sorting only)
      if (['salario', 'comisiones', 'totalPercepciones'].includes(localSortBy)) {
        aValue = parseFloat(aValue) || 0
        bValue = parseFloat(bValue) || 0
      }

      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return localSortDir === 'asc' ? -1 : 1
      if (aValue > bValue) return localSortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [employees, localSortBy, localSortDir])

  if (loading) {
    return (
      <TableContainer>
        <LoadingContainer>
          <FaSpinner size={32} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '1rem' }}>Cargando datos de empleados...</p>
        </LoadingContainer>
      </TableContainer>
    );
  }

  // Generar números de página para mostrar
  const generatePageNumbers = () => {
    const { page, totalPages } = pagination;
    const pages = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      // Mostrar todas las páginas si son 7 o menos
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Paginación inteligente
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

  const handlePageChange = (newPage) => {
    if (onPageChange && newPage >= 1 && newPage <= pagination.totalPages) {
      onPageChange(newPage);
    }
  };

  const handlePageSizeChange = (newPageSize) => {
    if (onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }
  };

  // Función para navegar al perfil del empleado
  const handleViewEmployee = (employee) => {
    // Priorizar RFC/CURP, si no está disponible usar nombre limpio
    let identifier = employee.curp;
    
    // Si no hay CURP, crear un identificador basado en el nombre
    if (!identifier || identifier === 'N/A' || identifier === '') {
      identifier = employee.nombre
        .replace(/\s+/g, '') // Quitar espacios
        .replace(/[^a-zA-Z0-9]/g, '') // Quitar caracteres especiales
        .toUpperCase();
    }
    
    // Construir URL completa para abrir en nueva pestaña
    const fullUrl = `${window.location.origin}/perfil/${encodeURIComponent(identifier)}`;
    console.log('🔄 Abriendo perfil en nueva pestaña:', fullUrl, employee);
    
    // Abrir en nueva pestaña
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <TableContainer>
      <TableWrapper>
        <Table>
          <TableHeader>
            <tr>
              {columns.map(col => (
                <HeaderCell key={col.key}>
                  {col.sortable ? (
                    <SortButton onClick={() => toggleSort(col.key)}>
                      {col.label}
                      {getSortIcon(col.key)}
                    </SortButton>
                  ) : (
                    col.label
                  )}
                </HeaderCell>
              ))}
            </tr>
          </TableHeader>
          <TableBody>
            {sortedData.map((employee, index) => (
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
                  <code style={{ background: surfaces.buttons.filter, padding: '0.25rem 0.5rem', borderRadius: '4px', color: brandColors.primary }}>
                    {employee.curp}
                  </code>
                </TableCell>
                <TableCell>{employee.puesto}</TableCell>
                <TableCell>{employee.sucursal}</TableCell>
                <TableCell style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{employee.periodo}</TableCell>
                <TableCell>
                  <strong>
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(employee.salario)}
                  </strong>
                </TableCell>
                <TableCell>
                  {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(employee.comisiones)}
                </TableCell>
                <TableCell>
                  <strong style={{ color: brandColors.primary }}>
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(employee.totalPercepciones)}
                  </strong>
                </TableCell>
                <TableCell>
                  <StatusBadge $status={employee.estado}>
                    {employee.estado}
                  </StatusBadge>
                </TableCell>
              </TableRow>
            ))}
            {sortedData.length === 0 && !loading && (
              <tr>
                <TableCell colSpan={columns.length}>
                  <NoResultsContainer>
                    <h3 style={{ marginBottom: '0.5rem' }}>No se encontraron empleados</h3>
                    <p>Ajusta los filtros o términos de búsqueda</p>
                  </NoResultsContainer>
                </TableCell>
              </tr>
            )}
          </TableBody>
        </Table>
      </TableWrapper>
    </TableContainer>
  );
}

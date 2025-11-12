import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import {
  FaSpinner,
  FaTable,
  FaChevronUp,
  FaChevronDown,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaChevronLeft,
  FaChevronRight,
  FaMousePointer,
} from "react-icons/fa";
import { buildDemographicFilterParams } from "../services/demographicFiltersApi";
import { formatCveperForTable } from "../utils/periodUtils";
import { buildApiUrl } from "../config/apiConfig";
import authenticatedFetch from "../services/authenticatedFetch";

// Styled Components (reutilizando los mismos estilos de TablaDemografico)
const TableContainer = styled.div`
  width: 50%;
  min-width: 600px;
  max-width: 50vw;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  margin: 2rem 0;

  @media (max-width: 1400px) {
    width: 70%;
    max-width: 70vw;
  }

  @media (max-width: 1024px) {
    width: 90%;
    max-width: 90vw;
    min-width: 300px;
  }
`;

const TableHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: rgba(255, 255, 255, 0.15);
  border-bottom: ${(props) =>
    props.$collapsed ? "none" : "1px solid rgba(255, 255, 255, 0.1)"};
`;

const TableTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const TitleText = styled.h3`
  font-size: 1.5rem;
  font-weight: 400;
  margin: 0;
  color: #1e3a8a;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SelectionBadge = styled.span`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(46, 204, 113, 0.3);
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
  margin-left: 0.5rem;
  border: 1px solid rgba(46, 204, 113, 0.4);
  font-weight: 500;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: rgba(44, 62, 80, 0.7);
  text-align: center;
  gap: 1rem;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  color: rgba(30, 58, 138, 0.3);
  margin-bottom: 1rem;
`;

const ToggleButton = styled.button`
  background: rgba(30, 58, 138, 0.2);
  border: 1px solid rgba(30, 58, 138, 0.3);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  color: #1e3a8a;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;

  &:hover {
    background: rgba(30, 58, 138, 0.3);
    transform: translateY(-2px);
  }
`;

const TableContent = styled.div`
  max-height: ${(props) => (props.$collapsed ? "0" : "600px")};
  overflow: ${(props) => (props.$collapsed ? "hidden" : "auto")};
  transition: max-height 0.3s ease-in-out;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #1e3a8a;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  overflow-y: auto;
  max-width: 100%;
  max-height: 400px;

  /* Estilizar scrollbar horizontal */
  &::-webkit-scrollbar {
    height: 8px;
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(30, 58, 138, 0.3);
    border-radius: 4px;
    transition: background 0.3s ease;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(30, 58, 138, 0.5);
  }

  /* Para navegadores Firefox */
  scrollbar-width: thin;
  scrollbar-color: rgba(30, 58, 138, 0.3) rgba(255, 255, 255, 0.05);
`;

const Table = styled.table`
  width: 100%;
  min-width: 800px; /* Ancho mínimo para forzar scroll horizontal */
  border-collapse: collapse;
  font-size: 0.9rem;
  color: #2c3e50;
`;

const TableHeaderRow = styled.thead`
  background: rgba(255, 255, 255, 0.1);
  border-bottom: 2px solid rgba(30, 58, 138, 0.3);
  position: sticky;
  top: 0;
  z-index: 1;
`;

const HeaderCell = styled.th`
  padding: 1rem 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #1e3a8a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.1);
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
    color: #2c3e50;
  }
`;

const TableBody = styled.tbody`
  background: rgba(255, 255, 255, 0.05);
`;

const TableRow = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const TableCell = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 100px;
  max-width: 200px;
`;

const EmployeeNameButton = styled.button`
  background: none;
  border: none;
  color: #1e3a8a;
  cursor: pointer;
  text-decoration: underline;
  font-size: inherit;

  &:hover {
    color: #2c3e50;
  }
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  background: ${(props) => {
    switch (props.$status) {
      case "Activo":
        return "rgba(46, 204, 113, 0.2)";
      case "Baja":
        return "rgba(231, 76, 60, 0.2)";
      case "Finiquitado":
        return "rgba(241, 196, 15, 0.2)";
      default:
        return "rgba(149, 165, 166, 0.2)";
    }
  }};
  color: ${(props) => {
    switch (props.$status) {
      case "Activo":
        return "#2ecc71";
      case "Baja":
        return "#e74c3c";
      case "Finiquitado":
        return "#f39c12";
      default:
        return "#95a5a6";
    }
  }};
  border: 1px solid
    ${(props) => {
      switch (props.$status) {
        case "Activo":
          return "rgba(46, 204, 113, 0.3)";
        case "Baja":
          return "rgba(231, 76, 60, 0.3)";
        case "Finiquitado":
          return "rgba(241, 196, 15, 0.3)";
        default:
          return "rgba(149, 165, 166, 0.3)";
      }
    }};
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-wrap: wrap;
  gap: 1rem;
`;

const PaginationInfo = styled.div`
  color: rgba(44, 62, 80, 0.8);
  font-size: 0.9rem;
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const PageSizeSelect = styled.select`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 0.5rem;
  color: #2c3e50;
  font-size: 0.9rem;
  margin-right: 1rem;

  option {
    background: #2c3e50;
    color: white;
  }
`;

const PaginationButton = styled.button`
  background: ${(props) =>
    props.$active ? "rgba(30, 58, 138, 0.3)" : "rgba(255, 255, 255, 0.1)"};
  border: 1px solid
    ${(props) => (props.$active ? "#1e3a8a" : "rgba(255, 255, 255, 0.2)")};
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  color: ${(props) => (props.$active ? "#1e3a8a" : "#2c3e50")};
  cursor: pointer;
  transition: all 0.2s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: rgba(30, 58, 138, 0.2);
    color: #1e3a8a;
  }
`;

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250];

export default function TablaInteractivaDemografica({
  onViewEmployee,
  title = "Datos de Selección de Gráficos",
  graphSelection = null, // Objeto con la selección del gráfico: { type, data, filter }
  periodFilter = null,
}) {
  const navigate = useNavigate();

  // Estado del componente
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });

  // Estado para sorting local
  const [localSortBy, setLocalSortBy] = useState("nombre");
  const [localSortDir, setLocalSortDir] = useState("asc");

  // Definición de columnas
  const columns = [
    { key: "nombre", label: "Empleado", sortable: true },
    { key: "curp", label: "CURP", sortable: true },
    { key: "puesto", label: "Puesto", sortable: true },
    { key: "sucursal", label: "Sucursal", sortable: true },
    { key: "periodo", label: "Período", sortable: true },
    { key: "salario", label: "Salario", sortable: true },
    { key: "comisiones", label: "Comisiones", sortable: true },
    { key: "total", label: "Total", sortable: true },
    { key: "estado", label: "Estado", sortable: true },
  ];

  // Cargar datos basados en la selección del gráfico
  const loadDataFromSelection = async () => {
    if (!graphSelection || !graphSelection.data) {
      console.log(
        "🎯 TablaInteractivaDemografica: No hay selección de gráfico"
      );
      setEmployees([]);
      setPagination((prev) => ({ ...prev, total: 0, totalPages: 0 }));
      return;
    }

    try {
      setLoading(true);
      console.log(
        "🎯 TablaInteractivaDemografica: Cargando datos para selección:",
        graphSelection
      );

      // Construir filtros específicos basados en la selección del gráfico
      const filterParams = buildGraphSelectionFilter(graphSelection);

      const additionalParams = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        sortBy: "nombre",
        sortDir: "asc",
      };

      const params = buildDemographicFilterParams(
        filterParams,
        additionalParams
      );

      console.log("🎯 TablaInteractivaDemografica: Parámetros de consulta:", {
        filterParams,
        additionalParams,
        finalUrl: `${buildApiUrl(
          "/api/payroll/demographic"
        )}?${params.toString()}`,
      });

      const response = await authenticatedFetch(
        `${buildApiUrl("/api/payroll/demographic")}?${params}`
      );

      if (response.ok) {
        const result = await response.json();
        console.log("🎯 TablaInteractivaDemografica: Respuesta recibida:", {
          success: result.success,
          recordsCount: result.data?.length,
          total: result.total,
        });

        if (result.success) {
          setEmployees(result.data || []);
          setPagination((prev) => ({
            ...prev,
            total: result.total || 0,
            totalPages: Math.ceil((result.total || 0) / prev.pageSize),
          }));
        } else {
          console.error("❌ Error en respuesta del servidor:", result.error);
        }
      } else {
        console.error("❌ Error HTTP:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("❌ Error loading selection data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función para construir filtros basados en la selección del gráfico
  const buildGraphSelectionFilter = (selection) => {
    const baseFilter = {
      status: "A", // Solo empleados activos
      ...(periodFilter ? { periodFilter } : {}),
    };

    switch (selection.type) {
      case "pyramid_age_gender":
        // Selección de pirámide poblacional por edad y género
        return {
          ...baseFilter,
          ageRange: selection.data.ageRange, // e.g., [25, 30]
          gender: selection.data.gender, // 'male' o 'female'
        };

      case "puesto_gender":
        // Selección de distribución por puesto y género
        return {
          ...baseFilter,
          puesto: selection.data.puesto,
          gender: selection.data.gender,
        };

      case "salary_age_range":
        // Selección de pirámide salarial por edad
        return {
          ...baseFilter,
          salaryRange: selection.data.salaryRange, // e.g., [50000, 100000]
          ageRange: selection.data.ageRange,
        };

      case "sucursal_antiguedad":
        // Selección de antigüedad por sucursal
        return {
          ...baseFilter,
          sucursal: selection.data.sucursal,
          antiguedadRange: selection.data.antiguedadRange,
        };

      default:
        console.warn("🎯 Tipo de selección no reconocido:", selection.type);
        return baseFilter;
    }
  };

  // Efectos
  useEffect(() => {
    if (graphSelection && graphSelection.data) {
      console.log(
        "🎯 TablaInteractivaDemografica: Nueva selección detectada, recargando datos"
      );
      setPagination((prev) => ({ ...prev, page: 1 })); // Reset a primera página
      loadDataFromSelection();
    }
  }, [graphSelection, periodFilter]);

  useEffect(() => {
    // Recargar cuando cambien parámetros de paginación
    if (graphSelection && graphSelection.data) {
      loadDataFromSelection();
    }
  }, [pagination.page, pagination.pageSize]);

  // Funciones de manejo
  const toggleSort = (key) => {
    if (key === localSortBy) {
      setLocalSortDir(localSortDir === "asc" ? "desc" : "asc");
    } else {
      setLocalSortBy(key);
      setLocalSortDir("asc");
    }
  };

  const getSortIcon = (key) => {
    if (localSortBy !== key) return <FaSort />;
    return localSortDir === "asc" ? <FaSortUp /> : <FaSortDown />;
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
    }
  };

  const handlePageSizeChange = (newPageSize) => {
    setPagination((prev) => ({
      ...prev,
      pageSize: newPageSize,
      page: 1,
    }));
  };

  const handleViewEmployee = (employee) => {
    const rfc = employee.rfc?.trim();
    const identifier = employee.curp?.trim();
    let navigationPath;

    if (identifier) {
      navigationPath = `/perfil/${rfc}/${identifier}`;
    } else {
      const safeName =
        employee.nombre
          ?.replace(/\s+/g, "-")
          ?.toLowerCase()
          ?.replace(/[^a-z0-9-]/g, "") || "empleado";
      navigationPath = `/perfil/${safeName}`;
    }

    const fullUrl = `${window.location.origin}${navigationPath}`;
    console.log("🔄 Abriendo perfil en nueva pestaña:", fullUrl, employee);

    window.open(fullUrl, "_blank", "noopener,noreferrer");
  };

  // Generar números de página para mostrar
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
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(
          1,
          "...",
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  };

  // Transformar status
  const transformStatus = (status) => {
    switch (status) {
      case "A":
        return "Activo";
      case "B":
        return "Baja";
      case "F":
        return "Finiquitado";
      default:
        return status || "Desconocido";
    }
  };

  // Transformar y ordenar datos
  const transformedEmployees = useMemo(() => {
    const transformedData = employees.map((emp) => ({
      nombre: emp.nombre,
      curp: emp.curp,
      puesto: emp.puesto,
      sucursal: emp.sucursal,
      periodo: emp.mes || formatCveperForTable(emp.cveper),
      salario: emp.sueldo || 0,
      comisiones: emp.comisiones || 0,
      total: emp.totalPercepciones || 0,
      estado: transformStatus(emp.status),
    }));

    // Aplicar sorting local
    return [...transformedData].sort((a, b) => {
      let aValue = a[localSortBy];
      let bValue = b[localSortBy];

      // Parsing para campos numéricos
      if (["salario", "comisiones", "total"].includes(localSortBy)) {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;

        if (localSortDir === "desc") {
          return bValue - aValue;
        } else {
          return aValue - bValue;
        }
      } else {
        // Para campos de texto
        aValue = (aValue || "").toString().toLowerCase();
        bValue = (bValue || "").toString().toLowerCase();

        if (localSortDir === "desc") {
          return bValue.localeCompare(aValue);
        } else {
          return aValue.localeCompare(bValue);
        }
      }
    });
  }, [employees, localSortBy, localSortDir]);

  // Renderizar badge de selección
  const renderSelectionBadge = () => {
    if (!graphSelection || !graphSelection.data) return null;

    switch (graphSelection.type) {
      case "pyramid_age_gender":
        const { ageRange, gender } = graphSelection.data;
        const genderText = gender === "male" ? "Hombres" : "Mujeres";
        return (
          <SelectionBadge>
            {genderText} {ageRange[0]}-{ageRange[1]} años
          </SelectionBadge>
        );

      case "puesto_gender":
        const puestoGenderText =
          graphSelection.data.gender === "male" ? "Hombres" : "Mujeres";
        return (
          <SelectionBadge>
            {puestoGenderText} en {graphSelection.data.puesto}
          </SelectionBadge>
        );

      case "salary_age_range":
        const { salaryRange } = graphSelection.data;
        return (
          <SelectionBadge>
            Salario ${salaryRange[0].toLocaleString()}-$
            {salaryRange[1].toLocaleString()}
          </SelectionBadge>
        );

      case "sucursal_antiguedad":
        return (
          <SelectionBadge>
            {graphSelection.data.sucursal} -{" "}
            {graphSelection.data.antiguedadRange} años
          </SelectionBadge>
        );

      default:
        return <SelectionBadge>Selección activa</SelectionBadge>;
    }
  };

  return (
    <TableContainer>
      <TableHeader $collapsed={collapsed}>
        <TableTitle>
          <TitleText>
            <FaTable />
            {title}
            {renderSelectionBadge()}
          </TitleText>
          {!collapsed && graphSelection && graphSelection.data && (
            <div style={{ color: "rgba(44, 62, 80, 0.7)", fontSize: "0.9rem" }}>
              {pagination.total} registros encontrados
            </div>
          )}
        </TableTitle>
        <ToggleButton onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <FaChevronDown /> : <FaChevronUp />}
          {collapsed ? "Expandir" : "Contraer"}
        </ToggleButton>
      </TableHeader>

      <TableContent $collapsed={collapsed}>
        {!graphSelection || !graphSelection.data ? (
          <EmptyState>
            <EmptyIcon>
              <FaMousePointer />
            </EmptyIcon>
            <h3>Selecciona un elemento en los gráficos</h3>
            <p>
              Haz clic en cualquier barra de los gráficos de arriba para ver los
              datos específicos aquí.
              <br />
              Puedes seleccionar en: Pirámide poblacional, Distribución por
              puestos, Rangos salariales, etc.
            </p>
          </EmptyState>
        ) : loading ? (
          <LoadingContainer>
            <FaSpinner
              size={32}
              style={{ animation: "spin 1s linear infinite" }}
            />
            <p style={{ marginTop: "1rem" }}>Cargando datos de selección...</p>
          </LoadingContainer>
        ) : (
          <>
            <TableWrapper>
              <Table>
                <TableHeaderRow>
                  <tr>
                    {columns.map((col) => (
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
                </TableHeaderRow>
                <TableBody>
                  {transformedEmployees.map((employee, index) => (
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
                        <code
                          style={{
                            background: "rgba(255,255,255,0.1)",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                          }}
                        >
                          {employee.curp}
                        </code>
                      </TableCell>
                      <TableCell>{employee.puesto}</TableCell>
                      <TableCell>{employee.sucursal}</TableCell>
                      <TableCell
                        style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                      >
                        {employee.periodo}
                      </TableCell>
                      <TableCell>
                        <strong>
                          {new Intl.NumberFormat("es-MX", {
                            style: "currency",
                            currency: "MXN",
                          }).format(employee.salario)}
                        </strong>
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("es-MX", {
                          style: "currency",
                          currency: "MXN",
                        }).format(employee.comisiones)}
                      </TableCell>
                      <TableCell>
                        <strong style={{ color: "#1e3a8a" }}>
                          {new Intl.NumberFormat("es-MX", {
                            style: "currency",
                            currency: "MXN",
                          }).format(employee.total)}
                        </strong>
                      </TableCell>
                      <TableCell>
                        <StatusBadge $status={employee.estado}>
                          {employee.estado}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {transformedEmployees.length === 0 &&
                    !loading &&
                    graphSelection &&
                    graphSelection.data && (
                      <tr>
                        <TableCell colSpan={columns.length}>
                          <div
                            style={{
                              textAlign: "center",
                              padding: "2rem",
                              color: "rgba(44, 62, 80, 0.7)",
                            }}
                          >
                            <h3 style={{ marginBottom: "0.5rem" }}>
                              No se encontraron datos
                            </h3>
                            <p>No hay información para la selección actual</p>
                          </div>
                        </TableCell>
                      </tr>
                    )}
                </TableBody>
              </Table>
            </TableWrapper>

            {pagination.total > 0 && (
              <PaginationContainer>
                <PaginationInfo>
                  Mostrando{" "}
                  {Math.min(
                    pagination.pageSize * (pagination.page - 1) + 1,
                    pagination.total
                  )}{" "}
                  -{" "}
                  {Math.min(
                    pagination.pageSize * pagination.page,
                    pagination.total
                  )}{" "}
                  de {pagination.total} registros
                </PaginationInfo>

                <PaginationControls>
                  <PageSizeSelect
                    value={pagination.pageSize}
                    onChange={(e) =>
                      handlePageSizeChange(Number(e.target.value))
                    }
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size} por página
                      </option>
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

                  {generatePageNumbers().map((pageNum, index) =>
                    typeof pageNum === "number" ? (
                      <PaginationButton
                        key={pageNum}
                        $active={pageNum === pagination.page}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </PaginationButton>
                    ) : (
                      <span
                        key={index}
                        style={{
                          color: "rgba(44, 62, 80, 0.5)",
                          padding: "0 0.5rem",
                        }}
                      >
                        {pageNum}
                      </span>
                    )
                  )}

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
          </>
        )}
      </TableContent>
    </TableContainer>
  );
}

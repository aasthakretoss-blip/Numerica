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
} from "react-icons/fa";
import { buildDemographicFilterParams } from "../services/demographicFiltersApi";
import { formatCveperForTable } from "../utils/periodUtils";
import { buildApiUrl } from "../config/apiConfig";
import authenticatedFetch from "../services/authenticatedFetch";
// Styled Components
const TableContainer = styled.div`
  width: 100%;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  margin-bottom: 2rem;
`;

const TableHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: rgba(255, 255, 255, 0.15);
  flex-wrap: wrap;
  gap: 1rem;
  border-bottom: ${(props) =>
    props.$collapsed ? "none" : "1px solid rgba(255, 255, 255, 0.1)"};

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    padding: 1rem 1.25rem;
  }
`;

const TableTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: 0.5rem;
    width: 100%;
    justify-content: space-between;
  }
`;

const TitleText = styled.h3`
  font-size: 1.5rem;
  font-weight: 400;
  margin: 0;
  color: #1e3a8a;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  @media (max-width: 768px) {
    font-size: 1.2rem;
    width: 100%;
  }
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

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`;

const TableContent = styled.div`
  max-height: ${(props) => (props.$collapsed ? "0" : "800px")};
  overflow: hidden;
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
  max-width: 100%;
  max-height: 500px;
  overflow-y: auto;
`;

const Table = styled.table`
  width: 100%;
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
  background: #ffffff;
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
  background: "rgba(149, 165, 166, 0.2)";
  color: "#95a5a6";
`;

const NoResultsContainer = styled.div`
  text-align: center;
  padding: 2rem;
  color: rgba(44, 62, 80, 0.7);
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

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500, 1000];

export default function TablaDemografico({
  onViewEmployee,
  title = "Datos Demográficos",
  filters = {}, // Nuevos filtros desde el sistema de filtros demográficos
}) {
  const navigate = useNavigate();
  // Estado del componente
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });

  // Estado para server-side sorting (solo para campos no numéricos)
  const [sortBy, setSortBy] = useState("nombre");
  const [sortDir, setSortDir] = useState("asc");

  // Estado para local sorting (campos numéricos)
  const [localSortBy, setLocalSortBy] = useState("nombre");
  const [localSortDir, setLocalSortDir] = useState("asc");

  // Estado para el filtro del último mes
  const [latestPeriod, setLatestPeriod] = useState(null);
  const [periodFilter, setPeriodFilter] = useState(null);

  // Estado para el conteo de CURPs únicos
  const [uniqueCurpCount, setUniqueCurpCount] = useState(0);

  // Cargar último período disponible
  const loadLatestPeriod = async () => {
    try {
      const response = await authenticatedFetch(
        buildApiUrl("/api/payroll/periodos")
      );
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          // Obtener el período con más registros (generalmente el último mes completo)
          const sortedPeriods = result.data.sort(
            (a, b) => new Date(b.value) - new Date(a.value)
          );
          const latest = sortedPeriods[0];

          // VALIDACIÓN: Verificar que la fecha es válida antes de procesarla
          const periodDate = new Date(latest.value);

          if (isNaN(periodDate.getTime())) {
            console.warn("⚠️ Fecha del período inválida:", latest.value);
            // Usar período por defecto para octubre 2024
            const defaultPeriod = "2025-06";
            console.log("📅 Usando período por defecto:", defaultPeriod);
            setLatestPeriod({ value: "2025-06-30", label: "Junio 2025" });
            setPeriodFilter(defaultPeriod);
            return;
          }

          // Convertir fecha a formato YYYY-MM para filtro mensual
          const year = periodDate.getFullYear();
          const month = periodDate.getMonth() + 1;
          const monthFilter = `${year}-${String(month).padStart(2, "0")}`;

          console.log(
            "📅 Último período encontrado:",
            latest.value,
            "Filtro aplicado:",
            monthFilter
          );

          setLatestPeriod(latest);
          setPeriodFilter(monthFilter);
        } else {
          console.warn("⚠️ No se encontraron períodos válidos en la respuesta");
          // Usar período por defecto
          const defaultPeriod = "2024-10";
          console.log("📅 Usando período por defecto:", defaultPeriod);
          setLatestPeriod({ value: "2024-10-01", label: "Octubre 2024" });
          setPeriodFilter(defaultPeriod);
        }
      } else {
        console.warn(
          "⚠️ Error en respuesta del endpoint de períodos:",
          response.status
        );
        // Usar período por defecto
        const defaultPeriod = "2024-10";
        console.log(
          "📅 Usando período por defecto tras error HTTP:",
          defaultPeriod
        );
        setLatestPeriod({ value: "2024-10-01", label: "Octubre 2024" });
        setPeriodFilter(defaultPeriod);
      }
    } catch (error) {
      console.error("❌ Error loading latest period:", error);
      // Usar período por defecto en caso de error
      const defaultPeriod = "2024-10";
      console.log("📅 Usando período por defecto tras error:", defaultPeriod);
      setLatestPeriod({ value: "2024-10-01", label: "Octubre 2024" });
      setPeriodFilter(defaultPeriod);
    }
  };

  // Cargar conteo de CURPs únicos desde el servidor
  const loadUniqueCurpCount = async () => {
    try {
      // Usar el servicio de filtros demográficos para construir parámetros
      const filterParams = {
        ...filters,
        periodFilter: periodFilter || filters.periodFilter,
      };

      const params = buildDemographicFilterParams(filterParams);

      console.log(
        "🔍 TablaDemografico: Contando CURPs únicos con filtros:",
        filterParams
      );

      const url = buildApiUrl(
        `/api/payroll/demographic/unique-count?${params}`
      );
      console.log("🔍 DEBUG: Llamando endpoint para conteo CURPs:", url);

      const response = await authenticatedFetch(url);
      if (response.ok) {
        const result = await response.json();
        console.log("🔍 DEBUG: Respuesta del servidor:", result);
        if (result.success) {
          console.log(
            "🔍 DEBUG: Actualizando uniqueCurpCount de",
            uniqueCurpCount,
            "a",
            result.uniqueCurpCount
          );
          setUniqueCurpCount(result.uniqueCurpCount || 0);
          console.log("🔢 CURPs únicos cargados:", result.uniqueCurpCount);
        }
      } else {
        console.error(
          "❌ Error en respuesta del servidor:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("❌ Error loading unique CURP count:", error);
    }
  };

  // Cargar datos desde el servidor
  const loadData = async () => {
    try {
      setLoading(true);

      // Usar el servicio de filtros demográficos para construir parámetros
      const filterParams = {
        ...filters,
        periodFilter: periodFilter || filters.periodFilter,
      };

      const additionalParams = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        sortBy,
        sortDir,
      };

      const params = buildDemographicFilterParams(
        filterParams,
        additionalParams
      );

      console.log("📊 TablaDemografico: Aplicando filtros demográficos:", {
        filterParams,
        additionalParams,
        finalUrl: buildApiUrl(`/api/payroll/demographic?${params.toString()}`),
      });

      console.log("📊 TablaDemografico: Enviando parámetros:", {
        page: pagination.page,
        pageSize: pagination.pageSize,
        sortBy,
        sortDir,
        periodFilter,
        status: "Activo",
      });

      // CORRECCIÓN: Usar endpoint existente en lugar del endpoint demographic
      // Los endpoints /api/payroll/demographic no existen, usar /api/payroll normal
      console.log(
        "🔄 REDIRIGIENDO a endpoint existente /api/payroll desde demographic"
      );

      // Cargar datos usando endpoint existente
      const dataResponse = await authenticatedFetch(
        buildApiUrl(`/api/payroll?${params}`)
      );

      // Cargar conteo en paralelo (saltándonos por ahora hasta que exista el endpoint)
      await loadUniqueCurpCount();

      if (dataResponse.ok) {
        const result = await dataResponse.json();
        console.log("📋 TablaDemografico: Respuesta recibida:", {
          success: result.success,
          recordsCount: result.data?.length,
          total: result.total,
          sortingApplied: { sortBy, sortDir },
        });

        if (result.success) {
          setEmployees(result.data || []);
          setPagination((prev) => ({
            ...prev,
            total: result.pagination.total || 0,
            totalPages: Math.ceil(
              (result?.pagination?.total || 0) / prev?.pageSize
            ),
          }));
        } else {
          console.error("❌ Error en respuesta del servidor:", result.error);
        }
      } else {
        console.error(
          "❌ Error HTTP:",
          dataResponse.status,
          dataResponse.statusText
        );
      }
    } catch (error) {
      console.error("❌ Error loading demographic data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Efectos
  useEffect(() => {
    // Cargar el último período al montar el componente
    loadLatestPeriod();
  }, []);

  useEffect(() => {
    // Cargar datos cuando cambie la paginación, sorting, período o filtros demográficos
    if (periodFilter !== null) {
      console.log(
        "🔄 TablaDemografico: Recargando datos por cambio de filtros:",
        {
          pagination: { page: pagination.page, pageSize: pagination.pageSize },
          sort: { sortBy, sortDir },
          periodFilter,
          filters,
        }
      );
      loadData();
    }
  }, [
    pagination.page,
    pagination.pageSize,
    sortBy,
    sortDir,
    periodFilter,
    filters,
  ]);

  // Campos que usan server-side sorting (ningún campo numérico)
  const serverSortFields = [];

  // Definición de columnas (mismas que EmployeeTable)
  const columns = [
    { key: "nombre", label: "Empleado", sortable: true },
    { key: "curp", label: "CURP", sortable: true },
    { key: "puesto", label: "Puesto", sortable: true },
    { key: "sucursal", label: "Sucursal", sortable: true },
    { key: "periodo", label: "Período", sortable: true },
    { key: "salario", label: "Salario", sortable: true }, // Local sorting
    { key: "comisiones", label: "Comisiones", sortable: true }, // Local sorting
    { key: "total", label: "Total", sortable: true }, // Local sorting
    { key: "estado", label: "Estado", sortable: true },
  ];

  // Funciones de manejo - Lógica híbrida (server-side y local sorting)
  const toggleSort = (key) => {
    console.log("🔄 TablaDemografico.toggleSort llamado:", {
      key,
      sortBy,
      sortDir,
      localSortBy,
      localSortDir,
    });

    if (serverSortFields.includes(key)) {
      // Server-side sorting para campos no numéricos
      if (key === sortBy) {
        setSortDir(sortDir === "asc" ? "desc" : "asc");
      } else {
        setSortBy(key);
        setSortDir("asc");
      }
      console.log("📤 TablaDemografico: Server-side sorting para:", key);
    } else {
      // Local sorting para campos numéricos (salario, comisiones, total)
      if (key === localSortBy) {
        setLocalSortDir(localSortDir === "asc" ? "desc" : "asc");
      } else {
        setLocalSortBy(key);
        setLocalSortDir("asc");
      }
      console.log("🔄 TablaDemografico: Local sorting para:", key);
    }
  };

  const getSortIcon = (key) => {
    if (serverSortFields.includes(key)) {
      // Para campos con server sorting
      if (sortBy !== key) return <FaSort />;
      return sortDir === "asc" ? <FaSortUp /> : <FaSortDown />;
    } else {
      // Para campos con local sorting
      if (localSortBy !== key) return <FaSort />;
      return localSortDir === "asc" ? <FaSortUp /> : <FaSortDown />;
    }
  };

  const handlePageChange = (newPage) => {
    console.log("This is calling");
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
    console.log(employee, "employee");
    // Priorizar RFC/CURP para la navegación, usar nombre como fallback
    const rfc = employee.rfc?.trim();
    const identifier = employee.curp?.trim();
    let navigationPath;

    if (identifier) {
      navigationPath = `/perfil/${rfc}/${identifier}`;
    } else {
      // Fallback: usar el nombre del empleado limpio
      const safeName =
        employee.nombre
          ?.replace(/\s+/g, "-")
          ?.toLowerCase()
          ?.replace(/[^a-z0-9-]/g, "") || "empleado";
      navigationPath = `/perfil/${safeName}`;
    }

    // Construir URL completa para abrir en nueva pestaña
    const fullUrl = `${window.location.origin}${navigationPath}`;
    console.log("🔄 Abriendo perfil en nueva pestaña:", fullUrl, employee);

    // Abrir en nueva pestaña
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

  // Helper function to transform status values
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

  // Transformar datos con local sorting aplicado (MAPEO EXACTO DEL SERVICIO + SORTING LOCAL)
  const transformedEmployees = useMemo(() => {
    const transformedData = employees.map((emp) => ({
      // El payrollFilterService devuelve estos campos reales:
      // "CURP" as curp, "Nombre completo" as nombre, "Puesto" as puesto,
      // "Compañía" as sucursal, DATE(cveper)::text as mes, cveper as cveper,
      // COALESCE(" SUELDO CLIENTE ", 0) as sueldo,
      // COALESCE(" COMISIONES CLIENTE ", 0) + COALESCE(" COMISIONES FACTURADAS ", 0) as comisiones,
      // COALESCE(" TOTAL DE PERCEPCIONES ", 0) as " TOTAL DE PERCEPCIONES ", "Status" as status
      nombre: emp.nombre, // Ya viene como "nombre"
      curp: emp.curp, // Ya viene como "curp"
      rfc: emp.rfc,
      puesto: emp.puesto, // Ya viene como "puesto"
      sucursal: emp.sucursal, // Ya viene como "sucursal"
      periodo: emp.mes || formatCveperForTable(emp.cveper), // CORREGIDO: usar mes (ya es string fecha) o cveper como fallback
      salario: emp.sueldo || 0, // El servicio lo devuelve como "sueldo"
      comisiones: emp.comisiones || 0, // CORREGIDO: las comisiones ya vienen calculadas de la API
      total: emp[" TOTAL DE PERCEPCIONES "] || 0, // CORREGIDO: usar ' TOTAL DE PERCEPCIONES ' del endpoint
      estado: transformStatus(emp.status), // Transform DB status (A/B/F) to readable status
      perfilUrl: null,
    }));

    // Aplicar local sorting solo si no es un campo con server sorting
    if (serverSortFields.includes(localSortBy)) {
      // Si estamos ordenando por un campo de servidor, no aplicar sorting local
      return transformedData;
    }

    // Aplicar local sorting para campos numéricos (salario, comisiones, total)
    if (["salario", "comisiones", "total"].includes(localSortBy)) {
      console.log(
        "🔢 TablaDemografico: Aplicando local sorting para campo numérico:",
        localSortBy
      );

      return [...transformedData].sort((a, b) => {
        let aValue = a[localSortBy];
        let bValue = b[localSortBy];

        // Parsing numérico para campos monetarios
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;

        if (localSortDir === "desc") {
          return bValue - aValue; // Descendente: mayor a menor
        } else {
          return aValue - bValue; // Ascendente: menor a mayor
        }
      });
    } else {
      // Para campos de texto, aplicar sorting alfabético
      return [...transformedData].sort((a, b) => {
        let aValue = a[localSortBy];
        let bValue = b[localSortBy];

        // Convertir a string y manejar casos null/undefined
        aValue = (aValue || "").toString().toLowerCase();
        bValue = (bValue || "").toString().toLowerCase();

        if (localSortDir === "desc") {
          return bValue.localeCompare(aValue);
        } else {
          return aValue.localeCompare(bValue);
        }
      });
    }
  }, [employees, localSortBy, localSortDir]);

  return (
    <TableContainer>
      <TableHeader $collapsed={collapsed}>
        <TableTitle>
          <TitleText>
            <FaTable />
            {title}
            {periodFilter && (
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "rgba(255, 255, 255, 0.8)",
                  background: "rgba(46, 204, 113, 0.2)",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "6px",
                  marginLeft: "0.5rem",
                  border: "1px solid rgba(46, 204, 113, 0.3)",
                }}
              >
                {periodFilter}
              </span>
            )}
            <span
              style={{
                fontSize: "0.8rem",
                color: "rgba(255, 255, 255, 0.8)",
                background: "rgba(46, 204, 113, 0.2)",
                padding: "0.25rem 0.5rem",
                borderRadius: "6px",
                marginLeft: "0.5rem",
                border: "1px solid rgba(46, 204, 113, 0.3)",
              }}
            >
              Solo Activos
            </span>
          </TitleText>
          {!collapsed && (
            <div
              style={{
                color: "rgba(44, 62, 80, 0.7)",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <span>
                {pagination.total} registros{" "}
                {periodFilter && `(${periodFilter})`}
              </span>
              <span
                style={{
                  background: "rgba(30, 58, 138, 0.2)",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid rgba(30, 58, 138, 0.3)",
                  color: "#1e3a8a",
                  fontWeight: "500",
                }}
              >
                Empleados: {uniqueCurpCount}
              </span>
            </div>
          )}
        </TableTitle>
        <ToggleButton onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <FaChevronDown /> : <FaChevronUp />}
          {collapsed ? "Expandir" : "Contraer"}
        </ToggleButton>
      </TableHeader>

      <TableContent $collapsed={collapsed}>
        {loading ? (
          <LoadingContainer>
            <FaSpinner
              size={32}
              style={{ animation: "spin 1s linear infinite" }}
            />
            <p style={{ marginTop: "1rem" }}>Cargando datos demográficos...</p>
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
                            background: "rgba(30, 58, 138, 0.2)",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                            color: "rgb(26, 54, 93)",
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
                  {transformedEmployees.length === 0 && !loading && (
                    <tr>
                      <TableCell colSpan={columns.length}>
                        <NoResultsContainer>
                          <h3 style={{ marginBottom: "0.5rem" }}>
                            No se encontraron datos
                          </h3>
                          <p>No hay información demográfica disponible</p>
                        </NoResultsContainer>
                      </TableCell>
                    </tr>
                  )}
                </TableBody>
              </Table>
            </TableWrapper>

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
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
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
                      key={`${pageNum}-${index}`}
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
          </>
        )}
      </TableContent>
    </TableContainer>
  );
}

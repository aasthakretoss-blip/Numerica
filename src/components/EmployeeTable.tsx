import React, { useState, useEffect } from "react";
import type { PayrollData } from "../types";
import { parseMoney, formatCurrency, formatPeriod } from "../utils/data";
import { useServerPagination } from "../hooks/useServerPagination";
import { buildApiUrl } from "../config/apiConfig";
import { normalizePayrollStats } from "../utils/payrollStatsNormalizer";
import { useNavigate } from "react-router-dom";
import { authenticatedFetch } from "../services/authenticatedFetch";

// ✅ FIELD MAPPING: Map frontend column keys to backend orderBy field names
const FRONTEND_TO_BACKEND_FIELD_MAP: Record<string, string> = {
  nombre: "nombre",
  curp: "curp",
  puesto: "puesto",
  sucursal: "sucursal",
  mes: "periodo", // Frontend uses 'mes', backend expects 'periodo'
  periodo: "periodo",
  sueldo: "salario", // Frontend uses 'sueldo', backend expects 'salario'
  salario: "salario",
  comisiones: "comisiones",
  totalPercepciones: "totalpercepciones",
  percepcionesTotales: "percepcionestotales",
  estado: "estado",
};

const columns: {
  key: string;
  label: string;
  sortable: boolean;
  dataKey: keyof PayrollData | "profile";
}[] = [
  {
    key: "nombre",
    label: "Nombre completo",
    sortable: true,
    dataKey: "nombre",
  },
  { key: "curp", label: "CURP", sortable: true, dataKey: "curp" },
  { key: "puesto", label: "Puesto", sortable: true, dataKey: "puesto" },
  { key: "sucursal", label: "Sucursal", sortable: true, dataKey: "sucursal" },
  { key: "mes", label: "Período", sortable: true, dataKey: "mes" },
  { key: "sueldo", label: "Salario", sortable: true, dataKey: "sueldo" },
  {
    key: "comisiones",
    label: "Comisiones",
    sortable: true,
    dataKey: "comisiones",
  },
  {
    key: "percepcionesTotales",
    label: "Percepciones totales",
    sortable: true,
    dataKey: "totalPercepciones",
  },
  { key: "estado", label: "Estado", sortable: true, dataKey: "estado" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250, 500];

interface EmployeeTableProps {
  employees?: PayrollData[];
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSortChange?: (field: string, direction?: "asc" | "desc") => void;
  onViewEmployee?: (employee: PayrollData) => void;
  onEditEmployee?: (employee: PayrollData) => void;
  error?: string | null;
}

export default function EmployeeTable(props?: EmployeeTableProps) {
  const [stats, setStats] = useState(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const [isTableCollapsed, setIsTableCollapsed] = useState(false);
  const navigate = useNavigate();

  // ✅ FIXED: Use props if provided, otherwise use useServerPagination (for backward compatibility)
  // Check if props object exists and has employees array (even if empty)
  const useProps =
    props !== undefined && props !== null && "employees" in props;

  // ✅ CRITICAL FIX: Use a special disabled endpoint when props are provided
  // This prevents double API calls when BusquedaEmpleados passes data via props
  // Using '__DISABLED__' instead of empty string to avoid URL building issues
  const endpointToUse = useProps ? "__DISABLED__" : "/api/payroll";

  console.log("🔍 [EmployeeTable] Props check:", {
    hasProps: props !== undefined && props !== null,
    hasEmployees: props && "employees" in props,
    useProps: useProps,
    endpoint: endpointToUse,
    employeesCount: props?.employees?.length || 0,
  });

  const serverPagination = useServerPagination(
    endpointToUse, // Special value disables fetch when using props
    100,
    "nombre",
    "asc"
  );

  // Use props if provided, otherwise use serverPagination
  const data = useProps ? props.employees || [] : serverPagination.data;
  const pagination = useProps
    ? props.pagination || { page: 1, pageSize: 100, total: 0, totalPages: 0 }
    : serverPagination.pagination;
  const loading = useProps ? props.loading || false : serverPagination.loading;
  const error = useProps ? props.error || null : serverPagination.error;
  const sortBy = useProps ? props.sortBy || "nombre" : serverPagination.sortBy;
  const sortDir = useProps ? props.sortDir || "asc" : serverPagination.sortDir;
  const setPage = useProps
    ? props.onPageChange || (() => {})
    : serverPagination.setPage;
  const setPageSize = useProps
    ? props.onPageSizeChange || (() => {})
    : serverPagination.setPageSize;
  const handleSortChange = useProps
    ? props.onSortChange || (() => {})
    : serverPagination.handleSortChange;
  const refresh = useProps ? () => {} : serverPagination.refresh;

  // Calculate display range
  const from =
    pagination.total > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const to = Math.min(pagination.page * pagination.pageSize, pagination.total);

  // Function to navigate to employee profile
  const handleViewEmployee = (employee: PayrollData) => {
    // ✅ FIXED: Use onViewEmployee prop if provided, otherwise navigate
    if (useProps && props?.onViewEmployee) {
      props.onViewEmployee(employee);
      return;
    }

    console.log("👁️ EmployeeTable.handleViewEmployee called:", {
      employee,
    });
    // ✅ FIXED: Check all possible field names for CURP (same logic as table rendering)
    const rAny = employee as any;
    const identifier = employee.rfc?.trim() || rAny.RFC?.trim() || null;
    const curpidentifier = employee.curp?.trim();

    let navigationPath: string;

    if (identifier) {
      navigationPath = `/perfil/${encodeURIComponent(
        identifier
      )}/${encodeURIComponent(curpidentifier)}`;
      console.log("🔗 Navigating to profile:", {
        identifier,
        path: navigationPath,
      });
      const fullUrl = `${window.location.origin}${navigationPath}`;
      window.open(fullUrl, "_blank", "noopener,noreferrer");
      // navigate(navigationPath);
    } else {
      // Fallback: use cleaned name
      const cleanedName =
        employee.nombre
          ?.replace(/\s+/g, "")
          .replace(/[^a-zA-Z0-9]/g, "")
          .toUpperCase() || "unknown";
      navigationPath = `/perfil/${encodeURIComponent(cleanedName)}`;
      console.warn("⚠️ No CURP found, using name fallback:", {
        nombre: employee.nombre,
        path: navigationPath,
      });
      const fullUrl = `${window.location.origin}${navigationPath}`;
      window.open(fullUrl, "_blank", "noopener,noreferrer");
      // navigate(navigationPath);
    }
  };

  // Function to export data to CSV
  const exportToCSV = () => {
    const headers = columns.map((col) => col.label).join(",");
    const rows = data.map((r) => {
      // ✅ FIXED: Map data fields to expected format (handle both API format and props format)
      // Use bracket notation to access properties that may not be in PayrollData type
      const rAny = r as any;
      const nombre = r.nombre || rAny.name || "";
      const rfc = r.rfc || rAny.curp || rAny.RFC || "";
      const curp = rAny.curp || r.rfc || rAny.RFC || "";
      const puesto = r.puesto || rAny.position || rAny.Puesto || "";
      const sucursal = r.sucursal || rAny.department || rAny.Sucursal || "";
      const mes = r.mes || rAny.periodo || rAny.Mes || "";
      const sueldo = r.sueldo || rAny.salary || rAny.Sueldo || 0;
      const comisiones =
        r.comisiones || rAny.commissions || rAny.Comisiones || 0;
      const totalPercepciones =
        r.totalPercepciones ||
        r[" TOTAL DE PERCEPCIONES "] ||
        rAny.totalPercepciones ||
        0;
      const estado = r.estado || rAny.status || rAny.Estado || "";

      return [
        nombre,
        rfc,
        puesto,
        sucursal,
        mes,
        formatCurrency(parseMoney(sueldo)),
        formatCurrency(parseMoney(comisiones)),
        formatCurrency(parseMoney(totalPercepciones)),
        estado,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `empleados_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sorting functions
  const toggleSort = (key: string) => {
    console.log("🔄 EmployeeTable.toggleSort called:", {
      key,
      sortBy,
      sortDir,
    });

    // ✅ MAP frontend column key to backend field name
    const backendFieldName = FRONTEND_TO_BACKEND_FIELD_MAP[key] || key;
    console.log("🔵 Field mapping:", {
      frontendKey: key,
      backendField: backendFieldName,
    });

    // LOG ESPECIAL PARA PERCEPCIONES TOTALES
    if (key === "percepcionesTotales" || key === "totalPercepciones") {
      console.log("💰 PERCEPCIONES TOTALES CLICKED:", {
        clickedKey: key,
        mappedBackendField: backendFieldName,
        currentSortBy: sortBy,
        currentSortDir: sortDir,
        willToggle: sortBy === backendFieldName,
      });
    }

    // ✅ Check if this column is currently sorted (compare backend field names)
    let newDirection: "asc" | "desc";
    if (sortBy === backendFieldName) {
      // Same column clicked - toggle direction
      newDirection = sortDir === "asc" ? "desc" : "asc";
    } else {
      // Different column clicked - start with ascending
      newDirection = "asc";
    }

    console.log("📤 EmployeeTable: Sending sort change to backend:", {
      frontendKey: key,
      backendField: backendFieldName,
      direction: newDirection,
    });

    // ✅ IMPORTANT: Send backend field name, not frontend key
    handleSortChange(backendFieldName, newDirection);
  };

  const getSortIcon = (key: string) => {
    // ✅ Map frontend key to backend field name for comparison
    const backendFieldName = FRONTEND_TO_BACKEND_FIELD_MAP[key] || key;
    // Compare with sortBy (which now contains backend field name)
    const isActive = sortBy === backendFieldName;

    if (!isActive) {
      return (
        <div className="flex flex-col -space-y-1">
          <svg
            className="w-3 h-3 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
          <svg
            className="w-3 h-3 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      );
    }
    if (sortDir === "asc") {
      return (
        <svg
          className="w-4 h-4 text-blue-900"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      );
    } else {
      return (
        <svg
          className="w-4 h-4 text-blue-900"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      );
    }
  };

  // Load database statistics on component mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await authenticatedFetch(
          buildApiUrl("/api/payroll/stats")
        );
        if (response.ok) {
          const result = await response.json();
          // Normalize the response to old format
          const normalizedResult = normalizePayrollStats(result);
          if (normalizedResult.success) {
            setStats(normalizedResult.data);
          }
        }
      } catch (error) {
        console.error("Error loading stats:", error);
      }
    };
    loadStats();
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Error al cargar datos</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={refresh}
          className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Database Statistics Panel */}

      {/* Table - Clean white design matching reference image */}
      <div
        className={`overflow-auto rounded-lg border border-gray-300 bg-white shadow-sm ${
          isTableCollapsed ? "max-h-[400px]" : ""
        }`}
      >
        <table className="min-w-full text-sm whitespace-nowrap">
          <thead className="bg-[#d2d8e8] border-b-2 border-blue-200 text-left sticky top-0 z-10 shadow-sm">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 whitespace-nowrap font-semibold text-blue-900 border-r border-blue-200 ${
                    idx === columns.length - 1 ? "border-r-0" : ""
                  }`}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => toggleSort(col.key)}
                      className="flex items-center gap-2 hover:text-blue-800 transition-colors cursor-pointer w-full text-left"
                      disabled={loading}
                    >
                      <span>{col.label}</span>
                      <span className="ml-auto">{getSortIcon(col.key)}</span>
                    </button>
                  ) : (
                    <span>{col.label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  <div className="flex items-center justify-center space-x-3">
                    <div className="animate-spin h-6 w-6 border-3 border-blue-600 border-t-transparent rounded-full"></div>
                    <span className="text-base">Cargando datos...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  <div className="text-base">Sin resultados</div>
                </td>
              </tr>
            ) : (
              data.map((r, i) => {
                // ✅ FIXED: Map data fields to expected format (handle both API format and props format)
                // Use bracket notation to access properties that may not be in PayrollData type
                const rAny = r as any;
                const nombre = r.nombre || rAny.name || "N/A";
                const curp = rAny.curp || r.rfc || rAny.RFC || "N/A";
                const rfc = r.rfc || rAny.curp || rAny.RFC || "N/A";
                const puesto =
                  r.puesto || rAny.position || rAny.Puesto || "N/A";
                const sucursal =
                  r.sucursal || rAny.department || rAny.Sucursal || "N/A";
                const mesRaw: string | number | null =
                  (r.mes as string) ||
                  (rAny.periodo as string) ||
                  (rAny.Mes as string) ||
                  "";

                let mes = "";
                if (mesRaw) {
                  // Try parsing as a date
                  const parsed = new Date(mesRaw as string);
                  if (!isNaN(parsed.getTime())) {
                    mes = parsed.toISOString().split("T")[0]; // ✅ Format as YYYY-MM-DD
                  } else {
                    mes = String(mesRaw);
                  }
                }
                const sueldo = r.sueldo || rAny.salary || rAny.Sueldo || 0;
                const comisiones =
                  r.comisiones || rAny.commissions || rAny.Comisiones || 0;
                const totalPercepciones =
                  r.totalPercepciones ||
                  r[" TOTAL DE PERCEPCIONES "] ||
                  rAny.totalPercepciones ||
                  0;
                const estado = r.estado || rAny.status || rAny.Estado || "N/A";

                // ✅ FRONTEND LOGGING: Log values before display (only for first 5 rows and when sorting by percepciones)
                if (
                  i < 5 &&
                  (sortBy === "percepcionestotales" ||
                    sortBy === "totalpercepciones")
                ) {
                  const rawValue = totalPercepciones;
                  const parsedValue = parseMoney(rawValue);
                  const formattedValue = formatCurrency(parsedValue);

                  console.log(`🟡 [FRONTEND DISPLAY DEBUG] Row ${i + 1}:`, {
                    nombre: nombre,
                    rawTotalPercepciones: rawValue,
                    rawType: typeof rawValue,
                    parsedValue: parsedValue,
                    formattedValue: formattedValue,
                    hasTotalPercepciones: "totalPercepciones" in r,
                    hasTotalDePercepciones: " TOTAL DE PERCEPCIONES " in r,
                    allKeys: Object.keys(r).filter(
                      (k) =>
                        k.toLowerCase().includes("percepcion") ||
                        k.toLowerCase().includes("total")
                    ),
                  });
                }

                return (
                  <tr
                    key={`${rfc}-${mes}-${i}`}
                    className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleViewEmployee(r)}
                        className="text-[#1a365d] underline font-semibold text-left hover:text-[#1a365d] transition-colors"
                        title={`View profile of ${nombre}`}
                      >
                        {nombre}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <code
                        style={{
                          background: "rgba(30, 58, 138, 0.2)",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "4px",
                          color: "rgb(26, 54, 93)",
                        }}
                      >
                        {curp}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-gray-800">{puesto}</td>
                    <td className="px-4 py-3 text-gray-800">{sucursal}</td>
                    <td className="px-4 py-3 text-[rgb(44, 82, 130)] font-mono text-[0.85rem]">
                      {mes || ""}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#2c3e50]">
                      <strong>{formatCurrency(parseMoney(sueldo))}</strong>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(parseMoney(comisiones))}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#2c3e50]">
                      <strong>
                        {formatCurrency(parseMoney(totalPercepciones || 0))}
                      </strong>
                    </td>
                    <td className="px-4 py-3">
                      {estado === "Activo" || estado === "A" ? (
                        <span className="inline-flex items-center p-[0.25rem 0.75rem] text-[0.8rem] font-medium">
                          Activo
                        </span>
                      ) : estado === "Baja" || estado === "B" ? (
                        <span className="inline-flex items-center p-[0.25rem 0.75rem] text-[0.8rem] font-medium">
                          Baja
                        </span>
                      ) : (
                        <span className="inline-flex items-center p-[0.25rem 0.75rem] text-[0.8rem] font-medium">
                          {estado || "N/A"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

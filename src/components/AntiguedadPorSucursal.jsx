import { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import {
  FaSpinner,
  FaBuilding,
  FaChevronUp,
  FaChevronDown,
  FaFilter,
} from "react-icons/fa";
import { buildDemographicFilterParams } from "../services/demographicFiltersApi";
import { buildApiUrl } from "../config/apiConfig";
import authenticatedFetch from "../services/authenticatedFetch";

// Color oficial del sitio (alineado con otros componentes)
const OFFICIAL_BLUE = "#3b82f6";

// Styled Components
const ChartContainer = styled.div`
  width: 100%;
  min-width: 600px;
  height: auto;
  min-height: 80vh;
  max-height: none;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: visible;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;

  @media (max-width: 1200px) {
    width: 80%;
    min-width: 500px;
  }

  @media (max-width: 768px) {
    width: 95%;
    min-width: 300px;
  }
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: rgba(255, 255, 255, 0.15);
  border-bottom: ${(props) =>
    props.$collapsed ? "none" : "1px solid rgba(255, 255, 255, 0.1)"};

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    padding: 1rem 1.5rem;
    gap: 1rem;
  }
`;

const ChartTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-start;
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
  flex-wrap: wrap;

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }

  @media (max-width: 480px) {
    font-size: 1.1rem;
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
    padding: 0.65rem 1rem;
    font-size: 1rem;
  }

  @media (max-width: 480px) {
    font-size: 0.95rem;
  }
`;

const ChartContent = styled.div`
  flex: 1;
  max-height: ${(props) => (props.$collapsed ? "0" : "none")};
  overflow: ${(props) => (props.$collapsed ? "hidden" : "visible")};
  transition: max-height 0.3s ease-in-out;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #1e3a8a;
`;

const ChartWrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  gap: 1.5rem;
  flex: 1;
  min-height: 0;
`;

const TopStatsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 2fr;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
`;

const StatItem = styled.div`
  background: rgba(255, 255, 255, 0.05);
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
    border-color: rgba(168, 237, 234, 0.3);
  }
`;

const StatValue = styled.div`
  font-size: 1.2rem;
  font-weight: 600;
  color: #1e3a8a;
  margin-bottom: 0.2rem;
`;

const StatLabel = styled.div`
  font-size: 0.7rem;
  color: rgba(44, 62, 80, 0.7);
  line-height: 1.1;
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1.5rem;
  flex: 1;
  min-height: 0;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const LegendContainer = styled.div`
  background: rgba(255, 255, 255, 0.05);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  height: fit-content;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: rgba(59, 130, 246, 0.9);
  font-weight: 500;
  white-space: nowrap;
`;

const LegendColor = styled.div`
  width: 16px;
  height: 8px;
  border-radius: 2px;
  background: ${(props) => props.$color};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
`;

const LegendGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;

  @media (max-width: 480px) {
    gap: 0.3rem;
  }
`;

const MainChartArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: visible;
`;

const BarsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  height: auto;
  min-height: 60vh;
  overflow: visible;
  padding: 0.5rem;
`;

const BarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  min-height: 35px;
`;

const BranchLabel = styled.div`
  font-size: 1.06rem;
  color: rgba(44, 62, 80, 0.8);
  font-weight: 500;
  text-align: right;
  min-width: 200px;
  max-width: 200px;
  word-wrap: break-word;
  line-height: 1.2;
  padding-right: 0.75rem;
`;

const BarStack = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: 1;
  height: 30px;
  border-radius: 4px;
  overflow: hidden;
  background: transparent;
  overflow: visible;
`;

const BarSegment = styled.div`
  height: 100%;
  background: ${(props) => props.$color};
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: white;
  overflow: visible;
  font-weight: 600;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  min-width: 2px;
  transition: all 0.3s ease;

  &:hover {
    transform: scaleY(1.1);
    z-index: 10;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &:hover .tooltip-content {
    opacity: 1;
    pointer-events: auto;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  top: -45px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  z-index: 9999;

  ${BarSegment}:hover & {
    opacity: 1;
  }
`;

// Definir bandas de antigüedad en años
const SENIORITY_BANDS = [
  {
    min: 0,
    max: 1,
    label: "< 1 año",
    color: "linear-gradient(90deg, #2E8B57, #3CB371)",
    name: "Nuevo",
  },
  {
    min: 1,
    max: 3,
    label: "1-3 años",
    color: "linear-gradient(90deg, #1e3a8a, #3b82f6)",
    name: "Junior",
  },
  {
    min: 3,
    max: 5,
    label: "3-5 años",
    color: "linear-gradient(90deg, #FFD700, #FFA500)",
    name: "Intermedio",
  },
  {
    min: 5,
    max: 10,
    label: "5-10 años",
    color: "linear-gradient(90deg, #FF6347, #DC143C)",
    name: "Senior",
  },
  {
    min: 10,
    max: Infinity,
    label: "10+ años",
    color: "linear-gradient(90deg, #8B008B, #4B0082)",
    name: "Veterano",
  },
];

export default function AntiguedadPorSucursal({
  title = "Antigüedad por Sucursal",
  filters = {}, // Filtros demográficos aplicados
}) {
  // Estado del componente
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allEmployees, setAllEmployees] = useState([]);
  const [latestPeriod, setLatestPeriod] = useState(null);
  const [periodFilter, setPeriodFilter] = useState(null);
  const [totalUniqueEmployees, setTotalUniqueEmployees] = useState(0);

  // Función para obtener años de antigüedad de un empleado
  const getYearsOfSeniority = (emp) => {
    const seniorityFields = [
      "Fecha antigüedad",
      "fecha_antiguedad",
      "fechaAntiguedad",
      "start_date",
      "hire_date",
      "fecha",
    ];

    for (const field of seniorityFields) {
      if (emp[field] !== null && emp[field] !== undefined) {
        try {
          const rawValue = emp[field];
          let startDate;

          // Manejar diferentes tipos de valores de fecha
          if (rawValue instanceof Date) {
            // Ya es un objeto Date
            startDate = rawValue;
          } else if (typeof rawValue === "string" && rawValue.trim() !== "") {
            // Es una cadena, intentar parsear
            startDate = new Date(rawValue.trim());
          } else if (typeof rawValue === "number") {
            // Es un timestamp numérico
            startDate = new Date(rawValue);
          } else {
            // Tipo no válido, continuar con el siguiente campo
            continue;
          }

          const currentDate = new Date();

          // Validar que la fecha sea válida y no futura
          if (!isNaN(startDate.getTime()) && startDate <= currentDate) {
            const diffTime = Math.abs(currentDate - startDate);
            const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
            return diffYears;
          }
        } catch (error) {
          // Error al parsear esta fecha, continuar con el siguiente campo
          continue;
        }
      }
    }
    return null;
  };

  // Función para determinar banda de antigüedad
  const getSeniorityBand = (years) => {
    if (years === null || years === undefined || years < 0) return null;
    return (
      SENIORITY_BANDS.find((band) => years >= band.min && years < band.max) ||
      SENIORITY_BANDS[0]
    );
  };

  // Cargar último período disponible
  const loadLatestPeriod = async () => {
    try {
      const response = await authenticatedFetch(
        buildApiUrl("/api/payroll/periodos")
      );
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          const sortedPeriods = result.data.sort(
            (a, b) => new Date(b.value) - new Date(a.value)
          );
          const latest = sortedPeriods[0];

          const periodDate = new Date(latest.value);
          const monthFilter = `${periodDate.getFullYear()}-${String(
            periodDate.getMonth() + 1
          ).padStart(2, "0")}`;

          console.log(
            "📅 DistribuciónPorSucursal - Último período encontrado:",
            latest.value,
            "Filtro aplicado:",
            monthFilter
          );

          setLatestPeriod(latest);
          setPeriodFilter(monthFilter);
        }
      }
    } catch (error) {
      console.error("❌ Error loading latest period:", error);
    }
  };

  // Cargar conteo de CURPs únicos desde el servidor
  const loadUniqueCurpCount = async () => {
    try {
      const filterParams = {
        ...filters,
        periodFilter: periodFilter || filters.periodFilter,
      };

      const params = buildDemographicFilterParams(filterParams);

      console.log(
        "🔍 DistribuciónPorSucursal: Contando CURPs únicos con filtros:",
        filterParams
      );

      const url = `${buildApiUrl(
        "/api/payroll/demographic/unique-count"
      )}?${params}`;
      console.log("🔍 DEBUG: Llamando endpoint para conteo CURPs:", url);

      const response = await authenticatedFetch(url);
      if (response.ok) {
        const result = await response.json();
        console.log("🔍 DEBUG: Respuesta del servidor:", result);
        if (result.success) {
          setTotalUniqueEmployees(result.uniqueCurpCount || 0);
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

  // Cargar TODAS las páginas de datos
  const loadAllEmployees = async () => {
    try {
      setLoading(true);

      const filterParams = {
        ...filters,
        periodFilter: periodFilter || filters.periodFilter,
      };

      console.log(
        "📊 DistribuciónPorSucursal: Aplicando filtros demográficos:",
        {
          filterParams,
          finalUrl: buildApiUrl("/api/payroll/demographic"),
        }
      );

      // Cargar TODAS las páginas como hacen los otros componentes
      let allEmployeesData = [];
      let currentPage = 1;
      let totalPages = 1;
      let expectedTotal = 0;

      console.log("📊 DistribuciónPorSucursal: Cargando TODAS las páginas...");

      do {
        const additionalParams = {
          pageSize: 1000,
          page: currentPage,
        };

        const params = buildDemographicFilterParams(
          filterParams,
          additionalParams
        );

        console.log(
          `📄 DistribuciónPorSucursal: Cargando página ${currentPage}/${totalPages}...`
        );

        const response = await authenticatedFetch(
          `${buildApiUrl("/api/payroll/demographic")}?${params}`
        );

        if (response.ok) {
          const result = await response.json();

          if (result.success) {
            // Primera página: establecer totales esperados
            if (currentPage === 1) {
              expectedTotal = result.total || 0;
              totalPages = Math.ceil(expectedTotal / 1000);
              console.log(
                `📊 DistribuciónPorSucursal: Total esperado: ${expectedTotal}, Páginas: ${totalPages}`
              );

              console.log(
                '🗄️ CONFIRMACIÓN: Los datos provienen de la tabla "historico_nominas_gsau" (según regla establecida)'
              );
            }

            // Agregar empleados de esta página
            if (result.data && result.data.length > 0) {
              allEmployeesData = allEmployeesData.concat(result.data);
              console.log(
                `✅ DistribuciónPorSucursal: Página ${currentPage} cargada - ${result.data.length} registros (Total acumulado: ${allEmployeesData.length})`
              );
            } else {
              console.log(
                `⚠️ DistribuciónPorSucursal: Página ${currentPage} vacía`
              );
              break;
            }

            currentPage++;
          } else {
            console.error(
              `❌ DistribuciónPorSucursal: Error en página ${currentPage}:`,
              result.error
            );
            break;
          }
        } else {
          console.error(
            `❌ DistribuciónPorSucursal: Error HTTP en página ${currentPage}:`,
            response.status,
            response.statusText
          );
          break;
        }
      } while (
        currentPage <= totalPages &&
        allEmployeesData.length < expectedTotal
      );

      console.log(`📊 DistribuciónPorSucursal: CARGA COMPLETA:`);
      console.log(`  - Total empleados cargados: ${allEmployeesData.length}`);
      console.log(`  - Esperados: ${expectedTotal}`);
      console.log(`  - Páginas procesadas: ${currentPage - 1}/${totalPages}`);

      // Cargar conteo de CURPs únicos en paralelo
      await loadUniqueCurpCount();

      setAllEmployees(allEmployeesData);
    } catch (error) {
      console.error(
        "❌ DistribuciónPorSucursal: Error loading demographic data:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // Efectos principales
  useEffect(() => {
    const initializeComponent = async () => {
      console.log("📅 DistribuciónPorSucursal: Inicializando componente...");
      await loadLatestPeriod();
      console.log("✅ DistribuciónPorSucursal: Componente inicializado");
    };

    initializeComponent();
  }, []);

  useEffect(() => {
    if (periodFilter !== null) {
      console.log(
        "🔄 DistribuciónPorSucursal: Cargando datos completos - Period Filter:",
        periodFilter
      );
      loadAllEmployees();
    }
  }, [periodFilter, filters]);

  // Procesar datos para agrupar por sucursal y bandas salariales
  const seniorityData = useMemo(() => {
    if (!allEmployees.length) {
      console.log(
        "📊 DistribuciónPorSucursal - Sin empleados cargados, retornando estructura vacía"
      );
      return { branchData: {}, stats: { totalEmployees: 0, totalBranches: 0 } };
    }

    console.log(
      "📊 DistribuciónPorSucursal - INICIANDO procesamiento de datos:"
    );
    console.log("- Total empleados cargados:", allEmployees.length);
    console.log("- Filtros aplicados:", filters);

    // PASO 1: IDENTIFICAR CURPs ÚNICOS y sus datos más recientes
    const uniqueCurpsMap = new Map();

    allEmployees.forEach((emp, index) => {
      const curp = emp.curp || emp.CURP || emp.Curp;

      if (curp && typeof curp === "string" && curp.trim().length > 0) {
        const cleanCurp = curp.trim().toUpperCase();

        if (!uniqueCurpsMap.has(cleanCurp)) {
          uniqueCurpsMap.set(cleanCurp, {
            ...emp,
            cleanCurp: cleanCurp,
            originalIndex: index,
          });
        } else {
          // Mantener el registro más reciente
          const existing = uniqueCurpsMap.get(cleanCurp);
          const existingDate = new Date(
            existing.periodo || existing.fecha_periodo || "1900-01-01"
          );
          const currentDate = new Date(
            emp.periodo || emp.fecha_periodo || "1900-01-01"
          );

          if (currentDate >= existingDate) {
            uniqueCurpsMap.set(cleanCurp, {
              ...emp,
              cleanCurp: cleanCurp,
              originalIndex: index,
            });
          }
        }
      }
    });

    const uniqueEmployees = Array.from(uniqueCurpsMap.values());

    console.log(
      `📊 DistribuciónPorSucursal - Total registros originales: ${allEmployees.length}`
    );
    console.log(
      `📊 DistribuciónPorSucursal - CURPs únicos identificados: ${uniqueEmployees.length}`
    );

    // PASO 2: PROCESAR DATOS POR SUCURSAL Y RANGOS DE ANTIGÜEDAD
    const branchData = {};
    let processedCount = 0;
    let validSeniorityCount = 0;
    let invalidSeniorityCount = 0;

    const branchFields = [
      "sucursal", // Campo principal que sí existe
      "Sucursal",
      "Compañía",
      "compania",
      "branch",
    ];

    console.log(uniqueEmployees, "uniqueEmployees");

    uniqueEmployees.forEach((emp, index) => {
      processedCount++;

      console.log(emp, "emp");

      // Buscar campo de sucursal
      let sucursal = null;
      for (const field of branchFields) {
        if (emp[field]) {
          sucursal = String(emp[field]).trim();
          break;
        }
      }

      if (!sucursal) {
        if (index < 5) {
          console.warn(`⚠️ Empleado ${index + 1} sin sucursal válida:`, {
            campos: Object.keys(emp),
            sucursalFields: branchFields.filter((f) => emp[f]),
          });
        }
        return;
      }

      // Obtener años de antigüedad del empleado
      const yearsOfSeniority = getYearsOfSeniority(emp);
      const safeYears = yearsOfSeniority ?? 0;
      const seniorityBand = getSeniorityBand(safeYears);

      if (seniorityBand) {
        validSeniorityCount++;

        const key = sucursal.trim().toLowerCase();

        console.log(key, "key");

        // Inicializar sucursal si no existe
        if (!branchData[sucursal]) {
          branchData[sucursal] = {
            total: 0,
            bands: {},
          };

          // Inicializar todas las bandas de antigüedad
          SENIORITY_BANDS.forEach((band) => {
            branchData[sucursal].bands[band.name] = 0;
          });
        }

        // Incrementar contadores
        branchData[sucursal].total++;
        branchData[sucursal].bands[seniorityBand.name]++;

        // Log para los primeros empleados
        if (index < 5) {
          console.log(`🔍 Empleado ${index + 1}:`, {
            sucursal,
            antiguedad: `${yearsOfSeniority.toFixed(1)} años`,
            banda: seniorityBand.name,
            bandaLabel: seniorityBand.label,
          });
        }
      } else {
        invalidSeniorityCount++;
        if (index < 10) {
          console.warn(`⚠️ Empleado ${index + 1} con antigüedad inválida:`, {
            sucursal,
            yearsOfSeniority,
            seniorityBand,
            camposAntiguedad: [
              "Fecha antigüedad",
              "fecha_antiguedad",
              "fechaAntiguedad",
            ].map((f) => `${f}: ${emp[f]}`),
          });
        }
      }
    });

    // Ordenar sucursales alfabéticamente
    const sortedBranches = Object.keys(branchData).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );

    console.log(branchData, "branchData");

    const stats = {
      totalEmployees: processedCount,
      totalBranches: Object.keys(branchData).length,
      validSeniorityCount,
      invalidSeniorityCount,
    };

    console.log("📊 AntiguedadPorSucursal - RESUMEN FINAL:");
    console.log("- Total empleados procesados:", stats.totalEmployees);
    console.log("- Sucursales encontradas:", stats.totalBranches);
    console.log("- Con antigüedad válida:", stats.validSeniorityCount);
    console.log("- Con antigüedad inválida:", stats.invalidSeniorityCount);
    console.log(
      "- Sucursales ordenadas:",
      sortedBranches.slice(0, 10).join(", "),
      sortedBranches.length > 10 ? "..." : ""
    );

    return { branchData, sortedBranches, stats };
  }, [allEmployees, filters]);

  // Calcular alturas máximas para normalización
  const maxEmployeeCount = useMemo(() => {
    const max = Math.max(
      ...Object.values(seniorityData.branchData).map((branch) => branch.total),
      1
    );
    console.log(
      `📊 DistribuciónPorSucursal - Máximo empleados por sucursal: ${max}`
    );
    return max;
  }, [seniorityData.branchData]);

  return (
    <ChartContainer>
      <ChartHeader $collapsed={collapsed}>
        <ChartTitle>
          <TitleText>
            <FaBuilding />
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
            {(filters.sucursales?.length > 0 ||
              filters.puestos?.length > 0 ||
              filters.puestosCategorias?.length > 0) && (
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "rgba(255, 255, 255, 0.8)",
                  background: "rgba(30, 58, 138, 0.2)",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "6px",
                  marginLeft: "0.5rem",
                  border: "1px solid rgba(30, 58, 138, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <FaFilter size={10} />
                Filtros Activos
              </span>
            )}
          </TitleText>
        </ChartTitle>
        <ToggleButton onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <FaChevronDown /> : <FaChevronUp />}
          {collapsed ? "Expandir" : "Contraer"}
        </ToggleButton>
      </ChartHeader>

      <ChartContent $collapsed={collapsed}>
        {loading ? (
          <LoadingContainer>
            <FaSpinner
              size={32}
              style={{ animation: "spin 1s linear infinite" }}
            />
            <p style={{ marginTop: "1rem" }}>
              Analizando distribución por sucursal...
            </p>
          </LoadingContainer>
        ) : (
          <ChartWrapper>
            {/* Estadísticas en la parte superior */}
            <TopStatsContainer>
              <StatItem>
                <StatValue>
                  {seniorityData.stats?.totalEmployees || 0}
                </StatValue>
                <StatLabel>Total Empleados</StatLabel>
              </StatItem>
              <StatItem>
                <StatValue>{seniorityData.stats?.totalBranches || 0}</StatValue>
                <StatLabel>Total Sucursales</StatLabel>
              </StatItem>
              <StatItem>
                <LegendContainer>
                  <div
                    style={{
                      fontSize: "0.95rem",
                      color: OFFICIAL_BLUE,
                      marginBottom: "0.8rem",
                      fontWeight: "600",
                      textAlign: "center",
                    }}
                  >
                    Bandas de Antigüedad
                  </div>
                  <LegendGrid>
                    {SENIORITY_BANDS.map((band) => (
                      <LegendItem key={band.name}>
                        <LegendColor $color={band.color} />
                        <span>{band.label}</span>
                      </LegendItem>
                    ))}
                  </LegendGrid>
                </LegendContainer>
              </StatItem>
            </TopStatsContainer>

            <ContentContainer>
              <MainChartArea>
                <BarsContainer>
                  {seniorityData.sortedBranches?.map((branchName) => {
                    const branchInfo = seniorityData.branchData[branchName];
                    const totalEmployees = branchInfo.total;

                    return (
                      <BarRow key={branchName}>
                        <BranchLabel>{branchName}</BranchLabel>
                        <BarStack>
                          {SENIORITY_BANDS.map((band) => {
                            const count = branchInfo.bands[band.name] || 0;
                            if (count === 0) return null;

                            // Calcular ancho proporcional para barras horizontales
                            const width =
                              maxEmployeeCount > 0
                                ? (count / maxEmployeeCount) * 100
                                : 0;

                            return (
                              <BarSegment
                                key={band.name}
                                $color={band.color}
                                style={{ width: `${width}%` }}
                              >
                                {count > 3 && count}{" "}
                                {/* Solo mostrar números si hay suficiente espacio */}
                                <Tooltip className="tooltip-content">
                                  {branchName}
                                  <br />
                                  {band.label}: {count} empleado
                                  {count !== 1 ? "s" : ""}
                                </Tooltip>
                              </BarSegment>
                            );
                          })}
                        </BarStack>
                      </BarRow>
                    );
                  })}
                </BarsContainer>
              </MainChartArea>
            </ContentContainer>
          </ChartWrapper>
        )}
      </ChartContent>
    </ChartContainer>
  );
}

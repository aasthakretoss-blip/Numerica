import React, { useMemo } from "react";
import styled from "styled-components";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { FaChartLine, FaEye, FaEyeSlash } from "react-icons/fa";

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const GraphContainer = styled.div`
  background: ${(props) =>
    props.theme?.surfaces?.glass?.medium || "rgba(255, 255, 255, 0.15)"};
  backdrop-filter: ${(props) =>
    props.theme?.effects?.blur?.strong || "blur(20px)"};
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid
    ${(props) =>
      props.theme?.surfaces?.borders?.light || "rgba(255, 255, 255, 0.2)"};
  transition: ${(props) =>
    props.theme?.effects?.states?.transition || "all 0.3s ease"};

  ${(props) =>
    props.$collapsed &&
    `
    max-height: 120px;
    overflow: hidden;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: linear-gradient(transparent, ${
        props.theme?.surfaces?.glass?.medium || "rgba(255, 255, 255, 0.15)"
      });
      pointer-events: none;
    }
  `}
`;

const GraphHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const GraphTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;

  h3 {
    font-size: 1.5rem;
    font-weight: 500;
    margin: 0;
    color: ${(props) => props.theme?.brand?.primary || "#1e3a8a"};
  }

  .icon {
    color: ${(props) => props.theme?.brand?.primary || "#1e3a8a"};
  }
`;

const GraphControls = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
`;

const ToggleButton = styled.button`
  background: ${(props) =>
    props.$isActive
      ? props.theme?.surfaces?.buttons?.accentStrong || "rgba(30, 58, 138, 0.4)"
      : props.theme?.surfaces?.buttons?.accentMedium ||
        "rgba(30, 58, 138, 0.2)"};
  border: 1px solid
    ${(props) =>
      props.theme?.surfaces?.borders?.accent || "rgba(30, 58, 138, 0.3)"};
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  color: ${(props) => props.theme?.brand?.primary || "#1e3a8a"};
  font-size: 0.85rem;
  cursor: pointer;
  transition: ${(props) =>
    props.theme?.effects?.states?.transition || "all 0.2s ease"};
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 500;

  &:hover {
    background: ${(props) =>
      props.theme?.surfaces?.buttons?.accentStrong || "rgba(30, 58, 138, 0.4)"};
    transform: translateY(-1px);
  }
`;

const CollapseToggle = styled.button`
  background: ${(props) =>
    props.theme?.surfaces?.buttons?.secondary || "rgba(255, 255, 255, 0.1)"};
  border: 1px solid
    ${(props) =>
      props.theme?.surfaces?.borders?.accent || "rgba(30, 58, 138, 0.3)"};
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  color: ${(props) => props.theme?.brand?.primary || "#1e3a8a"};
  font-size: 0.85rem;
  cursor: pointer;
  transition: ${(props) =>
    props.theme?.effects?.states?.transition || "all 0.2s ease"};
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 500;

  &:hover {
    background: ${(props) =>
      props.theme?.surfaces?.buttons?.secondaryHover ||
      "rgba(255, 255, 255, 0.15)"};
    transform: translateY(-1px);
  }
`;

const GraphWrapper = styled.div`
  position: relative;
  height: 400px;
  width: 100%;

  ${(props) =>
    props.$collapsed &&
    `
    height: 0;
    overflow: hidden;
  `}
`;

const StatsPanel = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid
    ${(props) =>
      props.theme?.surfaces?.borders?.subtle || "rgba(255, 255, 255, 0.1)"};
`;

const StatItem = styled.div`
  text-align: center;

  .label {
    font-size: 0.8rem;
    opacity: 0.7;
    margin-bottom: 0.25rem;
  }

  .value {
    font-size: 1.1rem;
    font-weight: 600;
    color: ${(props) => props.theme?.brand?.primary || "#1e3a8a"};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  opacity: 0.7;

  h4 {
    margin: 0 0 0.5rem 0;
    color: ${(props) =>
      props.theme?.text?.secondary || "rgba(44, 62, 80, 0.8)"};
  }

  p {
    margin: 0;
    font-size: 0.9rem;
    color: ${(props) => props.theme?.text?.muted || "rgba(44, 62, 80, 0.7)"};
  }
`;

const EmployeeCompareGraph = ({
  employees = [],
  loading = false,
  sortBy = "nombre",
  sortDir = "asc",
  // Props adicionales para detectar el sorting local de la tabla
  localSortBy = "nombre",
  localSortDir = "asc",
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [visibleLines, setVisibleLines] = React.useState({
    salary: true,
    commissions: true,
    total: true,
  });

  // Procesar datos: agrupar por empleado+mes y sumar percepciones para evitar duplicados
  const processedData = useMemo(() => {
    if (!employees || employees.length === 0) return [];

    console.log("🔄 Procesando datos para gráfica:", {
      totalEmployees: employees.length,
      sortBy,
      sortDir,
      localSortBy,
      localSortDir,
      primeros5: employees.slice(0, 5).map((emp) => ({
        name: emp.name,
        curp: emp.curp,
        periodo: emp.periodo,
        salary: emp.salary,
        commissions: emp.commissions,
        total:
          emp[" TOTAL DE PERCEPCIONES "] ||
          emp.percepcionesTotales ||
          emp.totalPercepciones,
      })),
    });

    // ESTRATEGIA MEJORADA: Agrupar por empleado+mes MANTENIENDO EL ORDEN ORIGINAL de la tabla
    const groupedByEmployeeMonth = new Map();
    const employeeOrder = new Map(); // Para mantener el orden original

    employees.forEach((employee, index) => {
      const name = employee.name || "Sin nombre";
      const periodo = employee.periodo || "Sin periodo";

      // Crear clave única: nombre + periodo
      const key = `${name}|${periodo}`;

      if (groupedByEmployeeMonth.has(key)) {
        // Si ya existe, sumar las percepciones PERO mantener el índice más temprano
        const existing = groupedByEmployeeMonth.get(key);
        existing.salary += parseFloat(employee.salary) || 0;
        existing.commissions += parseFloat(employee.commissions) || 0;
        existing.total +=
          parseFloat(
            employee[" TOTAL DE PERCEPCIONES "] ||
              employee.percepcionesTotales ||
              employee.totalPercepciones
          ) || 0;
        existing.recordCount += 1;
        // NO cambiar originalIndex para mantener primera aparición
      } else {
        // Si no existe, crear nuevo registro y guardar orden
        const newRecord = {
          name: name,
          curp:
            employee.curp || employee.curve || employee.name || `emp_${index}`,
          periodo: periodo,
          salary: parseFloat(employee.salary) || 0,
          commissions: parseFloat(employee.commissions) || 0,
          total:
            parseFloat(
              employee[" TOTAL DE PERCEPCIONES "] ||
                employee.percepcionesTotales ||
                employee.totalPercepciones
            ) || 0,
          recordCount: 1,
          originalIndex: index, // Índice de primera aparición
          displayName: `${name} (${periodo})`, // Nombre para mostrar en la gráfica
        };

        groupedByEmployeeMonth.set(key, newRecord);
        employeeOrder.set(key, index); // Guardar orden de primera aparición
      }
    });

    // Convertir a array
    let processedArray = Array.from(groupedByEmployeeMonth.values());

    // MIMETIZAR EL SORTING LOCAL DE LA TABLA
    // La tabla usa localSortBy y localSortDir para campos numéricos (sorting local)
    if (
      [
        "percepcionesTotales",
        " TOTAL DE PERCEPCIONES ",
        "comisiones",
        "salario",
      ].includes(localSortBy)
    ) {
      // Aplicar el mismo sorting local que la tabla para campos numéricos
      processedArray.sort((a, b) => {
        let aValue, bValue;

        // Determinar qué campo ordenar según localSortBy
        switch (localSortBy) {
          case "salario":
            aValue = a.salary;
            bValue = b.salary;
            break;
          case "comisiones":
            aValue = a.commissions;
            bValue = b.commissions;
            break;
          case "percepcionesTotales":
          case " TOTAL DE PERCEPCIONES ":
          default:
            aValue = a.total;
            bValue = b.total;
        }

        // Aplicar parsing numérico (igual que en la tabla)
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;

        if (localSortDir === "desc") {
          return bValue - aValue; // Descendente: mayor a menor
        } else {
          return aValue - bValue; // Ascendente: menor a mayor
        }
      });

      console.log("🎯 Aplicando sorting LOCAL (mimetizando tabla):", {
        localSortBy,
        localSortDir,
        primeros5Ordenados: processedArray.slice(0, 5).map((emp) => ({
          name: emp.name,
          periodo: emp.periodo,
          salary: emp.salary,
          commissions: emp.commissions,
          total: emp.total,
          displayName: emp.displayName,
        })),
        mensaje: `Mimetizando sorting local de la tabla para ${localSortBy}`,
      });
    } else {
      // Para otros campos, mantener el orden original de la tabla
      processedArray.sort((a, b) => a.originalIndex - b.originalIndex);
    }

    // Limitar a los primeros 40 registros (ya ordenados)
    const limitedData = processedArray.slice(0, 40);

    console.log(
      "✅ Datos procesados para gráfica (agrupados por empleado+mes):",
      {
        originalRecords: employees.length,
        uniqueEmployeeMonth: processedArray.length,
        limitedTo40: limitedData.length,
        sortedBy: sortBy,
        sortDirection: sortDir,
        localSortBy: localSortBy,
        localSortDir: localSortDir,
        firstEmployee: limitedData[0]
          ? {
              name: limitedData[0].name,
              periodo: limitedData[0].periodo,
              salary: limitedData[0].salary,
              commissions: limitedData[0].commissions,
              total: limitedData[0].total,
            }
          : null,
        lastEmployee: limitedData[limitedData.length - 1]
          ? {
              name: limitedData[limitedData.length - 1].name,
              periodo: limitedData[limitedData.length - 1].periodo,
              salary: limitedData[limitedData.length - 1].salary,
              commissions: limitedData[limitedData.length - 1].commissions,
              total: limitedData[limitedData.length - 1].total,
            }
          : null,
        employeeMonthPairs: limitedData
          .slice(0, 10)
          .map((emp) => emp.displayName),
        duplicatesFound: employees.length - processedArray.length,
      }
    );

    return limitedData;
  }, [employees, sortBy, sortDir, localSortBy, localSortDir]);

  // Función para manejar click en puntos de la gráfica (igual que en la tabla)
  const handleChartClick = (event, elements) => {
    if (elements && elements.length > 0) {
      const pointIndex = elements[0].index;
      const employee = processedData[pointIndex];

      if (employee) {
        // Usar la misma lógica que la tabla para generar identificador
        let identifier = employee.curp;
        let rfc = employee.rfc;

        // Si no hay CURP, crear un identificador basado en el nombre
        if (!identifier || identifier === "N/A" || identifier === "") {
          identifier = employee.name
            .replace(/\s+/g, "") // Quitar espacios
            .replace(/[^a-zA-Z0-9]/g, "") // Quitar caracteres especiales
            .toUpperCase();
        }

        // Construir URL completa para abrir en nueva pestaña
        const fullUrl = `${window.location.origin}/perfil/${encodeURIComponent(
          rfc
        )}/${encodeURIComponent(identifier)}`;
        console.log("🎯 Abriendo perfil desde gráfica:", fullUrl, employee);

        // Abrir en nueva pestaña
        window.open(fullUrl, "_blank", "noopener,noreferrer");
      }
    }
  };

  // Configuración de la gráfica
  const chartData = useMemo(() => {
    if (processedData.length === 0) return null;

    const labels = processedData.map((emp) => {
      // Usar nombre + periodo para identificación única
      return emp.displayName;
    });

    const datasets = [];

    // Línea de Salarios (Verde)
    if (visibleLines.salary) {
      datasets.push({
        label: "Sueldo",
        data: processedData.map((emp) => emp.salary),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        borderWidth: 2,
        pointBackgroundColor: "#22c55e",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1,
        fill: false,
      });
    }

    // Línea de Comisiones (Rojo)
    if (visibleLines.commissions) {
      datasets.push({
        label: "Comisiones",
        data: processedData.map((emp) => emp.commissions),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderWidth: 2,
        pointBackgroundColor: "#ef4444",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1,
        fill: false,
      });
    }

    // Línea de Percepciones totales (Azul)
    if (visibleLines.total) {
      datasets.push({
        label: "Percepciones totales",
        data: processedData.map((emp) => emp.total),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 3, // Línea más gruesa para destacar el total
        pointBackgroundColor: "#3b82f6",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.1,
        fill: false,
      });
    }

    return { labels, datasets };
  }, [processedData, visibleLines]);

  // Opciones de la gráfica
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    // Habilitar click en puntos para navegar al perfil
    onClick: handleChartClick,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#2c3e50",
          font: {
            family: "Inter, system-ui, sans-serif",
            size: 12,
            weight: 500,
          },
          usePointStyle: true,
          pointStyle: "circle",
          padding: 20,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#2c3e50",
        bodyColor: "#2c3e50",
        borderColor: "rgba(30, 58, 138, 0.3)",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (context) => {
            const index = context[0].dataIndex;
            const employee = processedData[index];
            return `${employee.name} - ${employee.periodo} (${
              employee.recordCount
            } registro${employee.recordCount > 1 ? "s" : ""})`;
          },
          label: (context) => {
            const value = context.parsed.y;
            return `${context.dataset.label}: $${value.toLocaleString("es-MX", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
          },
          // Añadir nota sobre funcionalidad de click
          footer: () => {
            return "👆 Haz click para ver el perfil del empleado";
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: "Empleados por Mes (Primeros 40 empleado-mes únicos)",
          color: "#2c3e50",
          font: {
            family: "Inter, system-ui, sans-serif",
            size: 11,
            weight: 500,
          },
        },
        grid: {
          display: true,
          color: "rgba(44, 62, 80, 0.1)",
        },
        ticks: {
          color: "#2c3e50",
          font: {
            family: "Inter, system-ui, sans-serif",
            size: 9,
          },
          // Rotar etiquetas 45 grados para mejor legibilidad con nombres completos
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: "Percepciones ($)",
          color: "#2c3e50",
          font: {
            family: "Inter, system-ui, sans-serif",
            size: 11,
            weight: 500,
          },
        },
        grid: {
          display: true,
          color: "rgba(44, 62, 80, 0.1)",
        },
        ticks: {
          color: "#2c3e50",
          font: {
            family: "Inter, system-ui, sans-serif",
            size: 10,
          },
          callback: function (value) {
            return "$" + value.toLocaleString("es-MX");
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
    elements: {
      line: {
        borderCapStyle: "round",
        borderJoinStyle: "round",
      },
    },
  };

  // Calcular estadísticas
  const statistics = useMemo(() => {
    if (processedData.length === 0) return null;

    const totalSalary = processedData.reduce((sum, emp) => sum + emp.salary, 0);
    const totalCommissions = processedData.reduce(
      (sum, emp) => sum + emp.commissions,
      0
    );
    const totalPerceptions = processedData.reduce(
      (sum, emp) => sum + emp.total,
      0
    );
    const avgSalary = totalSalary / processedData.length;
    const avgCommissions = totalCommissions / processedData.length;
    const avgTotal = totalPerceptions / processedData.length;

    return {
      totalEmployees: processedData.length,
      totalSalary,
      totalCommissions,
      totalPerceptions,
      avgSalary,
      avgCommissions,
      avgTotal,
    };
  }, [processedData]);

  const toggleLine = (lineType) => {
    setVisibleLines((prev) => ({
      ...prev,
      [lineType]: !prev[lineType],
    }));
  };

  if (loading) {
    return (
      <GraphContainer>
        <GraphHeader>
          <GraphTitle>
            <FaChartLine className="icon" size={20} />
            <h3>Análisis Comparativo de Percepciones</h3>
          </GraphTitle>
        </GraphHeader>
        <EmptyState>
          <h4>Cargando datos...</h4>
          <p>Procesando información de empleados para la gráfica</p>
        </EmptyState>
      </GraphContainer>
    );
  }

  if (!chartData || processedData.length === 0) {
    return (
      <GraphContainer>
        <GraphHeader>
          <GraphTitle>
            <FaChartLine className="icon" size={20} />
            <h3>Análisis Comparativo de Percepciones</h3>
          </GraphTitle>
        </GraphHeader>
        <EmptyState>
          <h4>Sin datos disponibles</h4>
          <p>No hay empleados para mostrar en la gráfica</p>
        </EmptyState>
      </GraphContainer>
    );
  }

  return (
    <GraphContainer $collapsed={isCollapsed}>
      <GraphHeader>
        <GraphTitle>
          <FaChartLine className="icon" size={20} />
          <h3>Análisis Comparativo de Percepciones</h3>
        </GraphTitle>

        <GraphControls>
          <ToggleButton
            $isActive={visibleLines.salary}
            onClick={() => toggleLine("salary")}
          >
            {visibleLines.salary ? <FaEye /> : <FaEyeSlash />}
            Sueldo
          </ToggleButton>

          <ToggleButton
            $isActive={visibleLines.commissions}
            onClick={() => toggleLine("commissions")}
          >
            {visibleLines.commissions ? <FaEye /> : <FaEyeSlash />}
            Comisiones
          </ToggleButton>

          <ToggleButton
            $isActive={visibleLines.total}
            onClick={() => toggleLine("total")}
          >
            {visibleLines.total ? <FaEye /> : <FaEyeSlash />}
            Percepciones totales
          </ToggleButton>

          <CollapseToggle onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? "Expandir" : "Contraer"}
          </CollapseToggle>
        </GraphControls>
      </GraphHeader>

      <GraphWrapper $collapsed={isCollapsed}>
        <Line data={chartData} options={chartOptions} />
      </GraphWrapper>

      {statistics && !isCollapsed && (
        <StatsPanel>
          <StatItem>
            <div className="label">Empleados Mostrados</div>
            <div className="value">{statistics.totalEmployees}</div>
          </StatItem>
          <StatItem>
            <div className="label">Sueldo Promedio</div>
            <div className="value">
              ${statistics.avgSalary.toLocaleString("es-MX")}
            </div>
          </StatItem>
          <StatItem>
            <div className="label">Comisiones Promedio</div>
            <div className="value">
              ${statistics.avgCommissions.toLocaleString("es-MX")}
            </div>
          </StatItem>
          <StatItem>
            <div className="label">Percepciones totales Promedio</div>
            <div className="value">
              ${statistics.avgTotal.toLocaleString("es-MX")}
            </div>
          </StatItem>
        </StatsPanel>
      )}
    </GraphContainer>
  );
};

export default EmployeeCompareGraph;

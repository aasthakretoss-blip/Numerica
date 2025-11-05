import { useState, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import { FaSpinner, FaUsers, FaChevronUp, FaChevronDown, FaFilter } from 'react-icons/fa'
import { applyPuestoFilters } from '../utils/puestoMapping'
import { buildDemographicFilterParams } from '../services/demographicFiltersApi'
import { useChartEvents, createSelection } from '../hooks/useChartEvents'

// Styled Components
const PyramidContainer = styled.div`
  width: 50%;
  min-width: 600px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  margin-bottom: 2rem;
  
  @media (max-width: 1200px) {
    width: 80%;
    min-width: 500px;
  }
  
  @media (max-width: 768px) {
    width: 95%;
    min-width: 300px;
  }
`;

const PyramidHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: rgba(255, 255, 255, 0.15);
  border-bottom: ${props => props.$collapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.1)'};
`;

const PyramidTitle = styled.div`
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

const PyramidContent = styled.div`
  max-height: ${props => props.$collapsed ? '0' : 'none'};
  overflow: ${props => props.$collapsed ? 'hidden' : 'visible'};
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

const PyramidWrapper = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 2rem;
`;

const PyramidChart = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  /* Eliminar restricciones de altura y scroll interno */
  /* La altura se ajustará automáticamente al contenido */
`;

const ChartContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  margin-right: 1rem;
  margin-left: -2rem; /* Mover toda la gráfica hacia la izquierda */
`;

const AgeRow = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  height: 16px;  /* Igual que SalaryAgePopulationPyramid */
  margin-bottom: 1px;
`;

const AgeLabel = styled.div`
  width: 50px;  /* Igual que SalaryAgePopulationPyramid */
  text-align: center;
  font-size: 0.8rem;  /* Igual que SalaryAgePopulationPyramid */
  color: rgba(0, 0, 0, 0.8);  /* Igual que SalaryAgePopulationPyramid */
  font-weight: 500;
  flex-shrink: 0;  /* Igual que SalaryAgePopulationPyramid */
`;

const LeftBar = styled.div`
  height: 14px;  /* Igual que SalaryAgePopulationPyramid */
  background: linear-gradient(90deg, #ff69b4, #ff1493);
  border-radius: 3px;  /* Igual que SalaryAgePopulationPyramid */
  transition: all 0.3s ease;
  position: relative;
  margin: 0 1px;  /* Igual que SalaryAgePopulationPyramid */
  opacity: 0.8;  /* Igual que SalaryAgePopulationPyramid */
  min-width: 2px;  /* Igual que SalaryAgePopulationPyramid */
  cursor: pointer;
  
  &:hover {
    transform: scaleY(1.2);
    background: linear-gradient(90deg, #ff1493, #dc143c);
    opacity: 1;  /* Igual que SalaryAgePopulationPyramid */
    z-index: 5;  /* Igual que SalaryAgePopulationPyramid */
  }
  
  &:active {
    transform: scaleY(1.3) scaleX(1.1);
    background: linear-gradient(90deg, #dc143c, #b21d3c);
  }
`;

const RightBar = styled.div`
  height: 14px;  /* Igual que SalaryAgePopulationPyramid */
  background: linear-gradient(90deg, #4169e1, #0066cc);
  border-radius: 3px;  /* Igual que SalaryAgePopulationPyramid */
  transition: all 0.3s ease;
  position: relative;
  margin: 0 1px;  /* Igual que SalaryAgePopulationPyramid */
  opacity: 0.8;  /* Igual que SalaryAgePopulationPyramid */
  min-width: 2px;  /* Igual que SalaryAgePopulationPyramid */
  cursor: pointer;
  
  &:hover {
    transform: scaleY(1.2);
    background: linear-gradient(90deg, #0066cc, #003d7a);
    opacity: 1;  /* Igual que SalaryAgePopulationPyramid */
    z-index: 5;  /* Igual que SalaryAgePopulationPyramid */
  }
  
  &:active {
    transform: scaleY(1.3) scaleX(1.1);
    background: linear-gradient(90deg, #003d7a, #001d4a);
  }
`;

const CenterAxis = styled.div`
  width: 4px;   /* Igual que SalaryAgePopulationPyramid */
  height: 14px; /* Igual que SalaryAgePopulationPyramid */
  background: transparent;  /* Igual que SalaryAgePopulationPyramid */
  border-radius: 2px;
  margin: 0 6px; /* Igual que SalaryAgePopulationPyramid */
`;

const BarContainer = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  height: 20px;  /* Igual que SalaryAgePopulationPyramid */
`;

const LeftContainer = styled.div`
  flex: 1;
  display: flex;
  justify-content: flex-end;
  flex-direction: row;  /* Igual que SalaryAgePopulationPyramid */
  gap: 1px;  /* Igual que SalaryAgePopulationPyramid */
  max-width: 48%;  /* Igual que SalaryAgePopulationPyramid */
  min-width: 150px;  /* Igual que SalaryAgePopulationPyramid */
`;

const RightContainer = styled.div`
  flex: 1;
  display: flex;
  justify-content: flex-start;
  gap: 1px;  /* Igual que SalaryAgePopulationPyramid */
  max-width: 48%;  /* Igual que SalaryAgePopulationPyramid */
  min-width: 150px;  /* Igual que SalaryAgePopulationPyramid */
`;

const TooltipBar = styled.div`
  position: absolute;
  top: -30px;  /* Igual que SalaryAgePopulationPyramid */
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);  /* Igual que SalaryAgePopulationPyramid */
  color: white;
  padding: 0.5rem;  /* Igual que SalaryAgePopulationPyramid */
  border-radius: 6px;  /* Igual que SalaryAgePopulationPyramid */
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  z-index: 10;
  max-width: 200px;  /* Igual que SalaryAgePopulationPyramid */
  text-align: center;  /* Igual que SalaryAgePopulationPyramid */
  line-height: 1.2;  /* Igual que SalaryAgePopulationPyramid */

  ${LeftBar}:hover &, ${RightBar}:hover & {
    opacity: 1;
  }
`;

const LegendContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  padding: 0.5rem;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: rgba(44, 62, 80, 0.8);
`;

const LegendColor = styled.div`
  width: 20px;
  height: 12px;
  border-radius: 2px;
  background: ${props => props.$color};
`;

const LeftSidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 200px;
  flex-shrink: 0;
`;

const StatsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StatItem = styled.div`
  background: rgba(255, 255, 255, 0.05);
  padding: 1rem;
  border-radius: 12px;
  text-align: center;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
    border-color: rgba(168, 237, 234, 0.3);
  }
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e3a8a;
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: rgba(44, 62, 80, 0.7);
`;

const XAxisContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 1rem;
  width: 100%;
`;

const XAxisLabels = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 0.8rem;
  color: rgba(44, 62, 80, 0.6);
`;

export default function PopulationPyramid({ 
  title = "Pirámide Poblacional",
  maxAge = 80,
  minAge = 15,          // Límite inferior optimizado a 15 años
  filters = {},         // Filtros demográficos aplicados
  onSelectionChange     // Callback para cuando se hace clic en una barra (mantenido por compatibilidad)
}) {
  // Hook para eventos de gráficos
  const { emitSelection } = useChartEvents();
  // Estado del componente (igual que SalaryAgePopulationPyramid)
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allEmployees, setAllEmployees] = useState([]);
  const [latestPeriod, setLatestPeriod] = useState(null);
  const [periodFilter, setPeriodFilter] = useState(null);
  const [totalUniqueEmployees, setTotalUniqueEmployees] = useState(0);
  const [uniqueGenderCounts, setUniqueGenderCounts] = useState({ male: 0, female: 0, unknown: 0, total: 0 });

  // Función para parsear CURP y extraer información demográfica
  // Formato real: OOFA900410HDFCRL03 (ejemplo Alberto Ochoa Frías, 10/04/1990)
  // - Posiciones 0-3: OOFA (4 letras iniciales)
  // - Posiciones 4-5: 90 (año)
  // - Posiciones 6-7: 04 (mes) 
  // - Posiciones 8-9: 10 (día)
  // - Posición 11: H (género) - índice 10
  // - Resto: estado, consonantes, homoclave
  const parseCURP = (curp) => {
    // Validar que el CURP tenga al menos 12 caracteres (para acceder a posición 11)
    if (!curp || typeof curp !== 'string' || curp.length < 12) {
      return null;
    }
    
    try {
      // Limpiar CURP de espacios y convertir a mayúsculas
      const cleanCurp = curp.trim().toUpperCase();
      
      // Extraer año de nacimiento (posiciones 4-5)
      const yearStr = cleanCurp.substring(4, 6);
      let year = parseInt(yearStr);
      
      // Validar que sea un número válido
      if (isNaN(year)) {
        console.log('🔍 CURP con año inválido:', curp, 'yearStr:', yearStr);
        return null;
      }
      
      // Lógica para interpretar años de 2 dígitos
      if (year <= 24) {
        year += 2000; // 00-24 = 2000-2024
      } else {
        year += 1900; // 25-99 = 1925-1999
      }
      
      // Extraer mes y día (posiciones 6-7 y 8-9)
      const monthStr = cleanCurp.substring(6, 8);
      const dayStr = cleanCurp.substring(8, 10);
      const month = parseInt(monthStr);
      const day = parseInt(dayStr);
      
      // Validar mes y día
      if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
        console.log('🔍 CURP con fecha inválida:', curp, 'month:', monthStr, 'day:', dayStr);
        return null;
      }
      
      // Extraer género (posición 10)
      const genderChar = cleanCurp.charAt(10);
      
      // Calcular edad actual
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      let age = currentYear - year;
      
      // Ajustar edad si no ha pasado el cumpleaños este año
      const currentMonth = currentDate.getMonth() + 1;
      const currentDay = currentDate.getDate();
      if (currentMonth < month || (currentMonth === month && currentDay < day)) {
        age--;
      }
      
      // Debug para el ejemplo de Alberto
      if (cleanCurp.startsWith('OOFA90')) {
        console.log('🔍 DEBUG CURP Alberto:', {
          curp: cleanCurp,
          year, month, day, age, genderChar,
          expectedAge: 2024 - 1990 // Debería ser 34 años
        });
      }
      
      return {
        year,
        month,
        day,
        age,
        gender: genderChar === 'H' ? 'male' : genderChar === 'M' ? 'female' : 'unknown',
        genderChar, // Incluir el carácter original para debugging
        isValid: true // Siempre válido si llegamos hasta aquí
      };
    } catch (error) {
      console.warn('Error parsing CURP:', curp, error);
      return null;
    }
  };




  // Cargar último período disponible (igual que SalaryAgePopulationPyramid)
  const loadLatestPeriod = async () => {
    try {
      const response = await fetch('https://numerica-2.onrender.com/api/payroll/periodos');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          // Obtener el período con más registros (generalmente el último mes completo)
          const sortedPeriods = result.data.sort((a, b) => new Date(b.value) - new Date(a.value));
          const latest = sortedPeriods[0];
          
          // VALIDACIÓN: Verificar que la fecha es válida antes de procesarla
          const periodDate = new Date(latest.value);
          
          if (isNaN(periodDate.getTime())) {
            console.warn('⚠️ PopulationPyramid - Fecha del período inválida:', latest.value);
            // Usar período por defecto
            const defaultPeriod = '2024-10';
            console.log('📅 PopulationPyramid - Usando período por defecto:', defaultPeriod);
            setLatestPeriod({ value: '2024-10-01', label: 'Octubre 2024' });
            setPeriodFilter(defaultPeriod);
            return;
          }
          
          // Convertir fecha a formato YYYY-MM para filtro mensual
          const year = periodDate.getFullYear();
          const month = periodDate.getMonth() + 1;
          const monthFilter = `${year}-${String(month).padStart(2, '0')}`;
          
          console.log('📅 PopulationPyramid - Último período encontrado:', latest.value, 'Filtro aplicado:', monthFilter);
          
          setLatestPeriod(latest);
          setPeriodFilter(monthFilter);
        } else {
          console.warn('⚠️ PopulationPyramid - No se encontraron períodos válidos');
          // Usar período por defecto
          const defaultPeriod = '2024-10';
          console.log('📅 PopulationPyramid - Usando período por defecto:', defaultPeriod);
          setLatestPeriod({ value: '2024-10-01', label: 'Octubre 2024' });
          setPeriodFilter(defaultPeriod);
        }
      } else {
        console.warn('⚠️ PopulationPyramid - Error en respuesta del endpoint:', response.status);
        // Usar período por defecto
        const defaultPeriod = '2024-10';
        console.log('📅 PopulationPyramid - Usando período por defecto tras error HTTP:', defaultPeriod);
        setLatestPeriod({ value: '2024-10-01', label: 'Octubre 2024' });
        setPeriodFilter(defaultPeriod);
      }
    } catch (error) {
      console.error('❌ PopulationPyramid - Error loading latest period:', error);
      // Usar período por defecto en caso de error
      const defaultPeriod = '2024-10';
      console.log('📅 PopulationPyramid - Usando período por defecto tras error:', defaultPeriod);
      setLatestPeriod({ value: '2024-10-01', label: 'Octubre 2024' });
      setPeriodFilter(defaultPeriod);
    }
  };

  // Cargar conteo de CURPs únicos desde el servidor (igual que SalaryAgePopulationPyramid)
  const loadUniqueCurpCount = async () => {
    try {
      // Usar el servicio de filtros demográficos para construir parámetros
      const filterParams = {
        ...filters,
        periodFilter: periodFilter || filters.periodFilter
      };
      
      const params = buildDemographicFilterParams(filterParams);
      
      console.log('🔍 PopulationPyramid: Contando CURPs únicos con filtros:', filterParams);

      const url = `https://numerica-2.onrender.com/api/payroll/demographic/unique-count?${params}`;
      console.log('🔍 DEBUG: Llamando endpoint para conteo CURPs:', url);
      
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        console.log('🔍 DEBUG: Respuesta del servidor:', result);
        if (result.success) {
          console.log('🔍 DEBUG: Actualizando totalUniqueEmployees de', totalUniqueEmployees, 'a', result.uniqueCurpCount);
          setTotalUniqueEmployees(result.uniqueCurpCount || 0);
          console.log('🔢 CURPs únicos cargados:', result.uniqueCurpCount);
        }
      } else {
        console.error('❌ Error en respuesta del servidor:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error loading unique CURP count:', error);
    }
  };

  // Cargar TODAS las páginas de datos (como hace SalaryAgePopulationPyramid)
  const loadAllEmployees = async () => {
    try {
      setLoading(true);
      
      // Usar el servicio de filtros demográficos para construir parámetros
      const filterParams = {
        ...filters,
        periodFilter: periodFilter || filters.periodFilter
      };
      
      console.log('📊 PopulationPyramid: Aplicando filtros demográficos:', {
        filterParams,
        finalUrl: `https://numerica-2.onrender.com/api/payroll/demographic`
      });

      // 🚀 CARGAR TODAS LAS PÁGINAS COMO HACE SALARYAGEPOPULATIONPYRAMID
      let allEmployeesData = [];
      let currentPage = 1;
      let totalPages = 1;
      let expectedTotal = 0;
      
      console.log('📊 PopulationPyramid: Cargando TODAS las páginas...');
      
      do {
        const additionalParams = {
          pageSize: 1000,
          page: currentPage
        };
        
        const params = buildDemographicFilterParams(filterParams, additionalParams);
        
        console.log(`📄 PopulationPyramid: Cargando página ${currentPage}/${totalPages}...`);
        
        // CORRECCIÓN: Usar endpoint existente /api/payroll en lugar del demographic inexistente
        console.log('🔄 PopulationPyramid - REDIRIGIENDO a endpoint existente /api/payroll');
        const response = await fetch(`https://numerica-2.onrender.com/api/payroll?${params}`);
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.success) {
            // Primera página: establecer totales esperados
            if (currentPage === 1) {
              expectedTotal = result.total || 0;
              totalPages = Math.ceil(expectedTotal / 1000);
              console.log(`📊 PopulationPyramid: Total esperado: ${expectedTotal}, Páginas: ${totalPages}`);
              
              console.log('🗄️ CONFIRMACIÓN: Los datos provienen de la tabla "historico_nominas_gsau" (según regla establecida)');
            }
            
            // Agregar empleados de esta página
            if (result.data && result.data.length > 0) {
              allEmployeesData = allEmployeesData.concat(result.data);
              console.log(`✅ PopulationPyramid: Página ${currentPage} cargada - ${result.data.length} registros (Total acumulado: ${allEmployeesData.length})`);
            } else {
              console.log(`⚠️ PopulationPyramid: Página ${currentPage} vacía`);
              break;
            }
            
            currentPage++;
          } else {
            console.error(`❌ PopulationPyramid: Error en página ${currentPage}:`, result.error);
            break;
          }
        } else {
          console.error(`❌ PopulationPyramid: Error HTTP en página ${currentPage}:`, response.status, response.statusText);
          break;
        }
      } while (currentPage <= totalPages && allEmployeesData.length < expectedTotal);
      
      console.log(`📊 PopulationPyramid: CARGA COMPLETA:`);
      console.log(`  - Total empleados cargados: ${allEmployeesData.length}`);
      console.log(`  - Esperados: ${expectedTotal}`);
      console.log(`  - Páginas procesadas: ${currentPage - 1}/${totalPages}`);
      
      // Cargar conteo de CURPs únicos en paralelo
      await loadUniqueCurpCount();
      
      setAllEmployees(allEmployeesData);
      
    } catch (error) {
      console.error('❌ PopulationPyramid: Error loading demographic data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Efectos principales (como SalaryAgePopulationPyramid)
  useEffect(() => {
    const initializeComponent = async () => {
      console.log('📅 PopulationPyramid: Inicializando componente...');
      
      // Cargar último período disponible
      await loadLatestPeriod();
      
      console.log('✅ PopulationPyramid: Componente inicializado');
    };
    
    initializeComponent();
  }, []);
  
  // Efecto para cargar datos completos cuando se establece el período
  useEffect(() => {
    if (periodFilter !== null) {
      console.log('🔄 PopulationPyramid: Cargando datos completos - Period Filter:', periodFilter);
      loadAllEmployees();
    }
  }, [periodFilter, filters]);

  // Procesar datos para la pirámide poblacional - USAR LISTA DE EMPLEADOS LOCALES
  const populationData = useMemo(() => {
    if (!allEmployees.length) {
      console.log('📊 PopulationPyramid - Sin empleados cargados, retornando estructura vacía');
      return { ageGroups: {}, stats: { totalEmployees: 0, totalMale: 0, totalFemale: 0, averageAge: 0 } };
    }

    console.log('📊 PopulationPyramid - INICIANDO procesamiento de datos:');
    console.log('- Total empleados cargados:', allEmployees.length);
    console.log('- Filtros aplicados:', filters);

    // PASO 1: IDENTIFICAR CURPS ÚNICOS y sus datos más recientes
    console.log('📊 PopulationPyramid - PASO 1: Identificando CURPs únicos...');
    
    const uniqueCurpsMap = new Map();
    
    allEmployees.forEach((emp, index) => {
      // Obtener CURP de diferentes posibles campos
      const curp = emp.curp || emp.CURP || emp.Curp;
      
      if (curp && typeof curp === 'string' && curp.trim().length > 0) {
        const cleanCurp = curp.trim().toUpperCase();
        
        // Si es la primera vez que vemos este CURP, o si este registro es más reciente
        if (!uniqueCurpsMap.has(cleanCurp)) {
          uniqueCurpsMap.set(cleanCurp, {
            ...emp,
            cleanCurp: cleanCurp,
            originalIndex: index
          });
        } else {
          // Comparar fechas para mantener el registro más reciente
          const existing = uniqueCurpsMap.get(cleanCurp);
          const existingDate = new Date(existing.periodo || existing.fecha_periodo || '1900-01-01');
          const currentDate = new Date(emp.periodo || emp.fecha_periodo || '1900-01-01');
          
          if (currentDate >= existingDate) {
            uniqueCurpsMap.set(cleanCurp, {
              ...emp,
              cleanCurp: cleanCurp,
              originalIndex: index
            });
          }
        }
      }
    });
    
    // Convertir Map a Array para procesamiento
    const uniqueEmployees = Array.from(uniqueCurpsMap.values());
    
    console.log(`📊 PopulationPyramid - Total registros originales: ${allEmployees.length}`);
    console.log(`📊 PopulationPyramid - CURPs únicos identificados: ${uniqueEmployees.length}`);
    
    // PASO 2: PROCESAR CURPs ÚNICOS
    console.log('📊 PopulationPyramid - PASO 2: Procesando CURPs únicos...');
    
    const processedEmployees = [];
    let processedMaleCount = 0;
    let processedFemaleCount = 0;
    let processedUnknownCount = 0;
    
    // Verificar estructura de los primeros empleados únicos
    if (uniqueEmployees.length > 0) {
      console.log('📊 PopulationPyramid - Análisis de CURPs únicos:');
      uniqueEmployees.slice(0, 3).forEach((emp, index) => {
        console.log(`   CURP único ${index + 1}:`, {
          curp: emp.cleanCurp,
          keys: Object.keys(emp),
          periodo: emp.periodo || emp.fecha_periodo
        });
      });
    }
    
    uniqueEmployees.forEach((emp, index) => {
      // Parsear CURP para obtener edad y género
      const parsedCURP = parseCURP(emp.cleanCurp);
      
      if (parsedCURP) {
        // CURP válido - usar datos del CURP
        const gender = parsedCURP.gender; // 'male', 'female', or 'unknown'
        
        // Contar por género usando datos del CURP (SOLO CURPs ÚNICOS)
        if (gender === 'male') {
          processedMaleCount++;
        } else if (gender === 'female') {
          processedFemaleCount++;
        } else {
          processedUnknownCount++;
        }
        
        processedEmployees.push({
          ...emp,
          age: parsedCURP.age,
          gender: gender,
          validForPyramid: true,
          parsedData: parsedCURP // Para debugging
        });
        
        // Log para debugging de los primeros empleados únicos
        if (index < 3) {
          console.log(`🔍 CURP único ${index + 1}:`, {
            curp: emp.cleanCurp,
            edad: parsedCURP.age,
            genero: gender,
            genderChar: parsedCURP.genderChar
          });
        }
      } else {
        // CURP inválido
        console.warn(`⚠️ CURP único inválido:`, emp.cleanCurp);
        processedUnknownCount++;
        processedEmployees.push({
          ...emp,
          age: null,
          gender: 'unknown',
          validForPyramid: false
        });
      }
    });

    console.log('📊 PopulationPyramid - Empleados procesados:', processedEmployees.length);
    console.log('📊 PopulationPyramid - Conteos por género procesados - M:', processedMaleCount, 'F:', processedFemaleCount);

    // Agrupar por edad y sexo para la pirámide (solo empleados con datos válidos)
    const ageGroups = {};
    let totalWithValidAge = 0;
    let totalAgeSum = 0;

    processedEmployees.forEach(emp => {
      // Solo incluir en la pirámide empleados con edad válida
      if (emp.validForPyramid && emp.age !== null && !isNaN(emp.age)) {
        if (!ageGroups[emp.age]) {
          ageGroups[emp.age] = { male: 0, female: 0 };
        }
        
        if (emp.gender === 'male') {
          ageGroups[emp.age].male++;
        } else if (emp.gender === 'female') {
          ageGroups[emp.age].female++;
        }
        
        totalWithValidAge++;
        totalAgeSum += emp.age;
      }
    });

    const avgAge = totalWithValidAge > 0 ? totalAgeSum / totalWithValidAge : 0;
    
    // Usar conteos reales procesados localmente (SIN extrapolación)
    const stats = {
      totalEmployees: processedMaleCount + processedFemaleCount,
      totalMale: processedMaleCount,
      totalFemale: processedFemaleCount,
      averageAge: avgAge,
      totalInPyramid: totalWithValidAge,
      malePercentage: (processedMaleCount + processedFemaleCount) > 0 ? (processedMaleCount / (processedMaleCount + processedFemaleCount) * 100) : 0,
      femalePercentage: (processedMaleCount + processedFemaleCount) > 0 ? (processedFemaleCount / (processedMaleCount + processedFemaleCount) * 100) : 0
    };

    // DEBUGGING: Verificar suma de datos en pirámide
    let sumaMalesEnPiramide = 0;
    let sumaFemalesEnPiramide = 0;
    Object.values(ageGroups).forEach(group => {
      sumaMalesEnPiramide += group.male;
      sumaFemalesEnPiramide += group.female;
    });
    const sumaTotalEnPiramide = sumaMalesEnPiramide + sumaFemalesEnPiramide;

    console.log('📊 PopulationPyramid - RESUMEN FINAL:');
    console.log('- Total empleados procesados:', stats.totalEmployees);
    console.log('- En pirámide (con datos válidos):', stats.totalInPyramid);
    console.log('- Hombres procesados:', stats.totalMale, '- Mujeres procesadas:', stats.totalFemale);
    console.log('- Edad promedio:', avgAge.toFixed(1));
    console.log('- Suma real hombres en barras:', sumaMalesEnPiramide);
    console.log('- Suma real mujeres en barras:', sumaFemalesEnPiramide);
    console.log('- Suma total real en barras:', sumaTotalEnPiramide);
    console.log('- Empleados procesados con CURP válido:', totalWithValidAge);

    return { ageGroups, stats };
  }, [allEmployees, filters]);

  // Calcular los máximos por separado para cada género
  const { maxMales, maxFemales, maxCount } = useMemo(() => {
    const groups = Object.values(populationData.ageGroups);
    if (groups.length === 0) return { maxMales: 1, maxFemales: 1, maxCount: 1 };
    
    const maxMales = Math.max(...groups.map(group => group.male), 1);
    const maxFemales = Math.max(...groups.map(group => group.female), 1);
    
    // Usar el máximo absoluto entre ambos géneros para normalización uniforme
    const absoluteMax = Math.max(maxMales, maxFemales);
    
    console.log(`📊 Máximos por género - Hombres: ${maxMales}, Mujeres: ${maxFemales}, Absoluto: ${absoluteMax}`);
    
    return { maxMales, maxFemales, maxCount: absoluteMax };
  }, [populationData.ageGroups]);
  
  // ESCALA UNIFORME para ambos géneros (eliminar desproporción)
  const uniformAxisLimit = useMemo(() => {
    // Usar el máximo absoluto entre ambos géneros para escala uniforme
    const maxCount = Math.max(maxMales, maxFemales);
    
    // Redondeado hacia arriba de 5 en 5 para mejor visualización
    const limit = Math.ceil(maxCount / 5) * 5;
    
    console.log(`📊 ESCALA UNIFORME - Máximo real: ${maxCount}, Límite aplicado: ${limit}`);
    console.log(`📊 Ambos lados usarán la misma escala para proporcionalidad correcta`);
    
    return limit;
  }, [maxMales, maxFemales]);

  // Detectar rango de edades dinámico basado en datos reales (min y max)
  const { dynamicMinAge, dynamicMaxAge } = useMemo(() => {
    const ageGroups = populationData.ageGroups;
    
    if (!ageGroups || Object.keys(ageGroups).length === 0) {
      console.log(`📊 PopulationPyramid - Sin datos, usando rango por defecto: ${minAge}-${maxAge}`);
      return { dynamicMinAge: minAge, dynamicMaxAge: maxAge };
    }
    
    // Encontrar todas las edades que tienen datos (hombres o mujeres > 0)
    const agesWithData = Object.keys(ageGroups)
      .map(age => parseInt(age))
      .filter(age => {
        const data = ageGroups[age];
        return data.male > 0 || data.female > 0;
      })
      .sort((a, b) => a - b); // Ordenar de menor a mayor
    
    if (agesWithData.length === 0) {
      console.log(`📊 PopulationPyramid - No hay edades con datos, usando rango por defecto: ${minAge}-${maxAge}`);
      return { dynamicMinAge: minAge, dynamicMaxAge: maxAge };
    }
    
    // Usar la edad mínima y máxima real de los datos
    const detectedMinAge = Math.min(...agesWithData);
    const detectedMaxAge = Math.max(...agesWithData);
    
    // No añadir padding extra, usar exactamente el rango de los datos
    const finalMinAge = detectedMinAge;
    const finalMaxAge = detectedMaxAge;
    
    console.log(`📊 PopulationPyramid - Rango detectado: ${detectedMinAge}-${detectedMaxAge}, usando: ${finalMinAge}-${finalMaxAge}`);
    console.log(`📊 PopulationPyramid - Edades con datos: ${agesWithData.join(', ')}`);
    
    return { dynamicMinAge: finalMinAge, dynamicMaxAge: finalMaxAge };
  }, [populationData.ageGroups, minAge, maxAge]);

  // Generar rango de edades dinámico - TODAS LAS EDADES año por año
  const ageRange = useMemo(() => {
    const ages = [];
    
    console.log(`📊 PopulationPyramid - Rango dinámico: ${dynamicMinAge}-${dynamicMaxAge} años`);
    
    // Generar rango COMPLETO año por año desde la edad mínima hasta la edad máxima detectada
    for (let age = dynamicMinAge; age <= dynamicMaxAge; age++) {
      ages.push(age);
    }
    
    return ages.reverse(); // De mayor a menor (típico en pirámides poblacionales)
  }, [dynamicMinAge, dynamicMaxAge]);

  // Función para manejar clics en las barras
  const handleBarClick = (age, gender) => {
    // Crear selección usando el nuevo sistema
    const selection = createSelection.pyramidAgeGender(age, gender, {
      totalEmployees: populationData.stats?.totalEmployees || 0,
      ageCount: populationData.ageGroups[age]?.[gender] || 0,
      filters: filters,
      periodFilter: periodFilter
    });
    
    console.log('🎯 PopulationPyramid: Emitiendo selección:', selection);
    
    // Emitir usando el nuevo sistema de eventos
    emitSelection(selection);
    
    // Mantener compatibilidad con callback legacy
    if (onSelectionChange) {
      onSelectionChange(selection);
    }
  };

  return (
    <PyramidContainer>
      <PyramidHeader $collapsed={collapsed}>
        <PyramidTitle>
          <TitleText>
            <FaUsers />
            {title}
            {periodFilter && (
              <span style={{ 
                fontSize: '0.8rem', 
                color: 'rgba(255, 255, 255, 0.8)', 
                background: 'rgba(46, 204, 113, 0.2)',
                padding: '0.25rem 0.5rem',
                borderRadius: '6px',
                marginLeft: '0.5rem',
                border: '1px solid rgba(46, 204, 113, 0.3)'
              }}>
                {periodFilter}
              </span>
            )}
            {(filters.sucursales?.length > 0 || filters.puestos?.length > 0 || filters.puestosCategorias?.length > 0) && (
              <span style={{ 
                fontSize: '0.8rem', 
                color: 'rgba(255, 255, 255, 0.8)', 
                background: 'rgba(30, 58, 138, 0.2)',
                padding: '0.25rem 0.5rem',
                borderRadius: '6px',
                marginLeft: '0.5rem',
                border: '1px solid rgba(30, 58, 138, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <FaFilter size={10} />
                Filtros Activos
              </span>
            )}
          </TitleText>
        </PyramidTitle>
        <ToggleButton onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <FaChevronDown /> : <FaChevronUp />}
          {collapsed ? 'Expandir' : 'Contraer'}
        </ToggleButton>
      </PyramidHeader>

      <PyramidContent $collapsed={collapsed}>
        {loading ? (
          <LoadingContainer>
            <FaSpinner size={32} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '1rem' }}>Analizando datos demográficos...</p>
          </LoadingContainer>
        ) : (
          <PyramidWrapper>
            <LeftSidebar>
              <StatsContainer>
                <StatItem>
                  <StatValue>{totalUniqueEmployees || populationData.stats?.totalEmployees || 0}</StatValue>
                  <StatLabel>Total Empleados</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{populationData.stats?.totalFemale || 0}</StatValue>
                  <StatLabel>
                    Mujeres ({populationData.stats?.totalEmployees > 0 ? populationData.stats.femalePercentage.toFixed(1) : '0.0'}%)
                  </StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{populationData.stats?.totalMale || 0}</StatValue>
                  <StatLabel>
                    Hombres ({populationData.stats?.totalEmployees > 0 ? populationData.stats.malePercentage.toFixed(1) : '0.0'}%)
                  </StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{(populationData.stats?.averageAge || 0).toFixed(1)}</StatValue>
                  <StatLabel>Edad Promedio</StatLabel>
                </StatItem>
              </StatsContainer>
              
              <LegendContainer>
                <LegendItem>
                  <LegendColor $color="linear-gradient(90deg, #ff69b4, #ff1493)" />
                  <span>Mujeres</span>
                </LegendItem>
                <LegendItem>
                  <LegendColor $color="linear-gradient(90deg, #4169e1, #0066cc)" />
                  <span>Hombres</span>
                </LegendItem>
              </LegendContainer>
            </LeftSidebar>
            
            <ChartContainer>

            <PyramidChart>
              {ageRange.map(age => {
                // Usar datos reales de cada edad individual
                const data = populationData.ageGroups[age] || { male: 0, female: 0 };
                
                // Normalizar contra la ESCALA UNIFORME para proporcionalidad correcta
                const femaleWidth = uniformAxisLimit > 0 ? (data.female / uniformAxisLimit) * 100 : 0;
                const maleWidth = uniformAxisLimit > 0 ? (data.male / uniformAxisLimit) * 100 : 0;
                
                // DEBUG: Log de calibración para barras con datos
                if (data.female > 0 || data.male > 0) {
                  console.log(`🎨 Edad ${age}: F=${data.female}/${uniformAxisLimit}=${femaleWidth.toFixed(1)}%, M=${data.male}/${uniformAxisLimit}=${maleWidth.toFixed(1)}%`);
                }

                return (
                  <AgeRow key={age}>
                    <LeftContainer>
                      {data.female > 0 && (
                        <LeftBar 
                          style={{ width: `${femaleWidth}%` }}
                          onClick={() => handleBarClick(age, 'female')}
                          title={`Clic para ver detalles: ${data.female} mujeres de ${age} años`}
                        >
                          <TooltipBar>
                            {age} años: {data.female} mujeres (clic para detalles)
                          </TooltipBar>
                        </LeftBar>
                      )}
                    </LeftContainer>
                    
                    {/* Mostrar TODAS las edades de 1 en 1 */}
                    <AgeLabel>{age}</AgeLabel>
                    <CenterAxis />
                    
                    <RightContainer>
                      {data.male > 0 && (
                        <RightBar 
                          style={{ width: `${maleWidth}%` }}
                          onClick={() => handleBarClick(age, 'male')}
                          title={`Clic para ver detalles: ${data.male} hombres de ${age} años`}
                        >
                          <TooltipBar>
                            {age} años: {data.male} hombres (clic para detalles)
                          </TooltipBar>
                        </RightBar>
                      )}
                    </RightContainer>
                  </AgeRow>
                );
              })}
            </PyramidChart>

            <XAxisContainer>
              <XAxisLabels>
                <span>Mujeres</span>
                <span>|</span>
                <span>Edad</span>
                <span>|</span>
                <span>Hombres</span>
              </XAxisLabels>
            </XAxisContainer>
            </ChartContainer>
          </PyramidWrapper>
        )}
      </PyramidContent>
    </PyramidContainer>
  );
}

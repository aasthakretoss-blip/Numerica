import { useState, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import { FaSpinner, FaChartBar, FaChevronUp, FaChevronDown, FaFilter } from 'react-icons/fa'
import { buildDemographicFilterParams } from '../services/demographicFiltersApi'

// Color azul oficial del sitio (alineado con otros componentes)
const OFFICIAL_BLUE = '#3b82f6'

// Styled Components
const PyramidContainer = styled.div`
  width: 50%;  /* Media pantalla como la otra pirámide */
  max-width: 100%;
  min-width: 0;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  margin-bottom: 2rem;
  box-sizing: border-box;
  
  @media (max-width: 1200px) {
    width: 80%;
    min-width: 0;
  }
  
  @media (max-width: 768px) {
    width: 95%;
    min-width: 0;
  }
`;

const PyramidHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: rgba(255, 255, 255, 0.1);
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
  color: ${OFFICIAL_BLUE};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ToggleButton = styled.button`
  background: rgba(168, 237, 234, 0.2);
  border: 1px solid rgba(168, 237, 234, 0.3);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  color: #a8edea;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  
  &:hover {
    background: rgba(168, 237, 234, 0.3);
    transform: translateY(-2px);
  }
`;

const PyramidContent = styled.div`
  max-height: ${props => props.$collapsed ? '0' : '1200px'};
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: ${OFFICIAL_BLUE};
`;

const PyramidWrapper = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 1rem;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  
  @media (max-width: 768px) {
    flex-direction: column;
    padding: 0.5rem;
  }
`;

const PyramidChart = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: ${props => props.$chartHeight || '400px'};
  overflow: hidden;
`;

const ChartContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  
  @media (min-width: 1024px) {
    margin-right: 0.5rem;
    margin-left: -1rem;
  }
`;

const AgeRow = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  height: ${props => props.$rowHeight || '16px'};
  margin-bottom: 1px;
`;

const AgeLabel = styled.div`
  width: 50px;  /* Aumentar para mejor proporción con barras más anchas */
  text-align: center;
  font-size: 0.8rem;   /* Texto un poco más grande */
  color: rgba(0, 0, 0, 0.8);
  font-weight: 500;
  flex-shrink: 0;
`;

const SalaryBar = styled.div`
  height: 14px;  /* Aumentar altura de barras */
  border-radius: 3px;
  transition: all 0.3s ease;
  position: relative;
  margin: 0 1px;
  opacity: ${props => props.$opacity || 0.8};
  background: ${props => props.$gradient};
  min-width: 2px;  /* Ancho mínimo visible */
  
  &:hover {
    transform: scaleY(1.2);
    opacity: 1;
    z-index: 5;
  }
`;

const CenterAxis = styled.div`
  width: 4px;   /* Más ancho para mejor proporción */
  height: 14px;
  background: transparent;  /* Eliminado color azul para evitar ruido visual */
  border-radius: 2px;
  margin: 0 6px; /* Más separación para barras más anchas */
`;

const BarContainer = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  height: 20px;
`;

const LeftContainer = styled.div`
  flex: 1;
  display: flex;
  justify-content: flex-end;
  flex-direction: row;
  gap: 1px;
  max-width: ${props => props.$maxWidth || '48%'};  /* Aumentar a 48% */
  min-width: 150px; /* Aumentar ancho mínimo */
`;

const RightContainer = styled.div`
  flex: 1;
  display: flex;
  justify-content: flex-start;
  gap: 1px;
  max-width: ${props => props.$maxWidth || '48%'};  /* Aumentar a 48% */
  min-width: 150px; /* Aumentar ancho mínimo */
`;

const TooltipBar = styled.div`
  position: absolute;
  top: -30px;
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
  z-index: 10;
  max-width: 200px;
  text-align: center;
  line-height: 1.2;

  ${SalaryBar}:hover & {
    opacity: 1;
  }
`;

const LegendContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.5rem;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: rgba(59, 130, 246, 0.9); /* Azul más contrastante */
  font-weight: 400;
`;

const LegendColor = styled.div`
  width: 20px;
  height: 8px;
  border-radius: 2px;
  background: ${props => props.$color};
`;

const LeftSidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 180px;  /* Volver a tamaño original */
  max-width: 220px;  /* Volver a tamaño original */
  flex-shrink: 0;
  
  @media (max-width: 1024px) {
    min-width: 160px;
    max-width: 180px;
  }
  
  @media (max-width: 768px) {
    min-width: 0;
    max-width: none;
    width: 100%;
  }
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
  color: ${OFFICIAL_BLUE};
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: rgba(59, 130, 246, 0.8); /* Azul más visible */
  font-weight: 500;
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
  color: rgba(255, 255, 255, 0.6);
`;

// Definir bandas salariales y colores
const SALARY_BANDS = [
  { min: 0, max: 10000, label: "< $10K", color: "linear-gradient(90deg, #2E8B57, #3CB371)", name: "Bajo" },
  { min: 10000, max: 20000, label: "$10K - $20K", color: "linear-gradient(90deg, #1e3a8a, #3b82f6)", name: "Medio-Bajo" },
  { min: 20000, max: 35000, label: "$20K - $35K", color: "linear-gradient(90deg, #FFD700, #FFA500)", name: "Medio" },
  { min: 35000, max: 50000, label: "$35K - $50K", color: "linear-gradient(90deg, #FF6347, #DC143C)", name: "Medio-Alto" },
  { min: 50000, max: Infinity, label: "> $50K", color: "linear-gradient(90deg, #8B008B, #4B0082)", name: "Alto" }
];

export default function SalaryAgePopulationPyramid({ 
  title = "Pirámide Poblacional por Rango Salarial y Edad",
  maxAge = 80,
  minAge = 15,
  filters = {} // Filtros desde el sistema de filtros demográficos
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salaryData, setSalaryData] = useState([]);
  const [latestPeriod, setLatestPeriod] = useState(null);
  const [periodFilter, setPeriodFilter] = useState(null);
  const [totalUniqueEmployees, setTotalUniqueEmployees] = useState(0);
  const [uniqueGenderCounts, setUniqueGenderCounts] = useState({ male: 0, female: 0, unknown: 0, total: 0 });

  // Función para parsear CURP y extraer edad y género (igual que PopulationPyramid)
  const parseCURP = (curp) => {
    if (!curp || typeof curp !== 'string' || curp.length < 12) {
      return null;
    }
    
    try {
      const cleanCurp = curp.trim().toUpperCase();
      const yearStr = cleanCurp.substring(4, 6);
      let year = parseInt(yearStr);
      
      if (isNaN(year)) {
        return null;
      }
      
      if (year <= 24) {
        year += 2000;
      } else {
        year += 1900;
      }
      
      const monthStr = cleanCurp.substring(6, 8);
      const dayStr = cleanCurp.substring(8, 10);
      const month = parseInt(monthStr);
      const day = parseInt(dayStr);
      
      if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
      }
      
      // Extraer género (posición 10 del CURP)
      const genderChar = cleanCurp.charAt(10);
      
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      let age = currentYear - year;
      
      const currentMonth = currentDate.getMonth() + 1;
      const currentDay = currentDate.getDate();
      if (currentMonth < month || (currentMonth === month && currentDay < day)) {
        age--;
      }
      
      return { 
        age, 
        gender: genderChar === 'H' ? 'male' : genderChar === 'M' ? 'female' : 'unknown',
        genderChar, // Para debugging
        isValid: true 
      };
    } catch (error) {
      return null;
    }
  };

  // Cargar último período disponible (igual que TablaDemografico)
  const loadLatestPeriod = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/payroll/periodos');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          // Obtener el período con más registros (generalmente el último mes completo)
          const sortedPeriods = result.data.sort((a, b) => new Date(b.value) - new Date(a.value));
          const latest = sortedPeriods[0];
          
          // Convertir fecha a formato YYYY-MM para filtro mensual
          const periodDate = new Date(latest.value);
          const monthFilter = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`;
          
          console.log('📅 SalaryAgePopulationPyramid - Último período encontrado:', latest.value, 'Filtro aplicado:', monthFilter);
          
          setLatestPeriod(latest);
          setPeriodFilter(monthFilter);
        }
      }
    } catch (error) {
      console.error('❌ Error loading latest period:', error);
    }
  };

  // Cargar conteo de CURPs únicos desde el servidor (igual que TablaDemografico)
  const loadUniqueCurpCount = async () => {
    try {
      // Usar el servicio de filtros demográficos para construir parámetros
      const filterParams = {
        ...filters,
        periodFilter: periodFilter || filters.periodFilter
      };
      
      const params = buildDemographicFilterParams(filterParams);
      
      console.log('🔍 SalaryAgePopulationPyramid: Contando CURPs únicos con filtros:', filterParams);

      const url = `http://localhost:3001/api/payroll/demographic/unique-count?${params}`;
      console.log('🔍 DEBUG: Llamando endpoint para conteo CURPs:', url);
      
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        console.log('🔍 DEBUG: Respuesta del servidor:', result);
        if (result.success) {
          console.log('🔍 DEBUG: Actualizando uniqueCurpCount de', totalUniqueEmployees, 'a', result.uniqueCurpCount);
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

  // Cargar TODAS las páginas de datos (como hace Demografico.jsx)
  const loadSalaryData = async () => {
    try {
      setLoading(true);
      
      // Usar el servicio de filtros demográficos para construir parámetros
      const filterParams = {
        ...filters,
        periodFilter: periodFilter || filters.periodFilter
      };
      
      console.log('📊 SalaryAgePopulationPyramid: Aplicando filtros demográficos:', {
        filterParams,
        finalUrl: `http://localhost:3001/api/payroll/demographic`
      });

      // 🚀 CARGAR TODAS LAS PÁGINAS COMO HACE DEMOGRAFICO.JSX
      let allEmployees = [];
      let currentPage = 1;
      let totalPages = 1;
      let expectedTotal = 0;
      
      console.log('📊 SalaryAgePopulationPyramid: Cargando TODAS las páginas...');
      
      do {
        const additionalParams = {
          pageSize: 1000,
          page: currentPage
        };
        
        const params = buildDemographicFilterParams(filterParams, additionalParams);
        
        console.log(`📄 SalaryAgePopulationPyramid: Cargando página ${currentPage}/${totalPages}...`);
        
        const response = await fetch(`http://localhost:3001/api/payroll/demographic?${params}`);
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.success) {
            // Primera página: establecer totales esperados
            if (currentPage === 1) {
              expectedTotal = result.total || 0;
              totalPages = Math.ceil(expectedTotal / 1000);
              console.log(`📊 SalaryAgePopulationPyramid: Total esperado: ${expectedTotal}, Páginas: ${totalPages}`);
              
              console.log('🗄️ CONFIRMACIÓN: Los datos provienen de la tabla "historico_nominas_gsau" (según regla establecida)');
              
              // DEBUG: Solo en la primera página
              if (result.data && result.data.length > 0) {
                console.log('🔍 DEBUG: Primer registro completo:', result.data[0]);
                console.log('🔍 DEBUG: Campos disponibles:', Object.keys(result.data[0]));
                console.log('🔍 DEBUG: Buscando campos CURP:', Object.keys(result.data[0]).filter(key => key.toLowerCase().includes('curp')));
                console.log('🔍 DEBUG: Buscando campos percepciones:', Object.keys(result.data[0]).filter(key => key.toLowerCase().includes('percepc')));
                
                const curpField = Object.keys(result.data[0]).find(key => key.toLowerCase().includes('curp'));
                if (curpField) {
                  console.log('🔍 DEBUG: Campo CURP encontrado:', curpField, '= "' + result.data[0][curpField] + '"');
                }
                
                const percepcionesField = Object.keys(result.data[0]).find(key => key.toLowerCase().includes('percepc'));
                if (percepcionesField) {
                  console.log('🔍 DEBUG: Campo percepciones encontrado:', percepcionesField, '=', result.data[0][percepcionesField]);
                }
              }
            }
            
            // Agregar empleados de esta página
            if (result.data && result.data.length > 0) {
              allEmployees = allEmployees.concat(result.data);
              console.log(`✅ SalaryAgePopulationPyramid: Página ${currentPage} cargada - ${result.data.length} registros (Total acumulado: ${allEmployees.length})`);
            } else {
              console.log(`⚠️ SalaryAgePopulationPyramid: Página ${currentPage} vacía`);
              break;
            }
            
            currentPage++;
          } else {
            console.error(`❌ SalaryAgePopulationPyramid: Error en página ${currentPage}:`, result.error);
            break;
          }
        } else {
          console.error(`❌ SalaryAgePopulationPyramid: Error HTTP en página ${currentPage}:`, response.status, response.statusText);
          break;
        }
      } while (currentPage <= totalPages && allEmployees.length < expectedTotal);
      
      console.log(`📊 SalaryAgePopulationPyramid: CARGA COMPLETA:`);
      console.log(`  - Total empleados cargados: ${allEmployees.length}`);
      console.log(`  - Esperados: ${expectedTotal}`);
      console.log(`  - Páginas procesadas: ${currentPage - 1}/${totalPages}`);
      
      // Cargar conteo de CURPs únicos en paralelo
      await loadUniqueCurpCount();
      
      setSalaryData(allEmployees);
      
    } catch (error) {
      console.error('❌ SalaryAgePopulationPyramid: Error loading demographic data:', error);
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
    // Cargar datos cuando cambie el período o filtros demográficos
    if (periodFilter !== null) {
      console.log('🔄 SalaryAgePopulationPyramid: Recargando datos por cambio de filtros:', {
        periodFilter,
        filters
      });
      loadSalaryData();
    }
  }, [periodFilter, filters]);

  // Determinar banda salarial
  const getSalaryBand = (costoNomina) => {
    const salary = parseFloat(costoNomina) || 0;
    return SALARY_BANDS.find(band => salary >= band.min && salary < band.max) || SALARY_BANDS[0];
  };

  // Procesar datos para la pirámide Y calcular totales únicos por género
  const pyramidData = useMemo(() => {
    if (!salaryData.length) return { ageGroups: {}, stats: {}, uniqueGenderCounts: { male: 0, female: 0, unknown: 0, total: 0 } };

    console.log('📊 Procesando datos para pirámide salarial...');
    console.log('🔍 Total empleados a procesar:', salaryData.length);
    
    const processedEmployees = [];
    const ageGroups = {};
    let totalEmployees = 0;
    let totalSalary = 0;
    let validSalaryCount = 0;
    let maleCount = 0;
    let femaleCount = 0;
    
    // Contadores para debugging
    let invalidCurp = 0;
    let invalidAge = 0;
    let invalidSalary = 0;

    // Estadísticas por banda salarial y sexo
    const salaryBandStats = {};
    const genderStats = { M: 0, F: 0 };
    SALARY_BANDS.forEach(band => {
      salaryBandStats[band.name] = { count: 0, totalSalary: 0, male: 0, female: 0 };
    });

    // PASO 1: Agrupar por CURP único y sumar percepciones
    const employeesByCurp = {};
    const curpFieldsFound = new Set();
    const costoFieldsFound = new Set();
    let recordsProcessed = 0;
    let recordsWithCurp = 0;
    
    console.log('\n🔍 DIAGNÓSTICO DETALLADO DE PROCESAMIENTO DE DATOS:');
    console.log('='.repeat(60));
    
    salaryData.forEach((emp, index) => {
      recordsProcessed++;
      
      // Buscar el campo CURP correcto
      const curpField = Object.keys(emp).find(key => key.toLowerCase().includes('curp'));
      const curp = curpField ? emp[curpField] : null;
      
      // Registrar campos CURP encontrados
      if (curpField) curpFieldsFound.add(curpField);
      
      // Buscar el campo de percepciones/costo correcto
      const costoField = Object.keys(emp).find(key => 
        key.toLowerCase().includes('costo') || 
        key.toLowerCase().includes('percepc') || 
        key.toLowerCase().includes('total')
      );
      const costoNomina = parseFloat(emp[costoField]) || 0;
      
      // Registrar campos de costo encontrados
      if (costoField) costoFieldsFound.add(costoField);
      
      // Mostrar detalles de los primeros 5 registros
      if (index < 5) {
        console.log(`📋 Registro ${index + 1}:`);
        console.log(`  - CURP Campo: '${curpField}' = '${curp}'`);
        console.log(`  - Costo Campo: '${costoField}' = ${costoNomina}`);
        console.log(`  - Campos disponibles: [${Object.keys(emp).slice(0, 10).join(', ')}...]`);
        console.log('  ---');
      }
      
      if (!curp) {
        if (index < 5) console.log('⚠️ DEBUG: Empleado sin CURP:', emp);
        invalidCurp++;
        return;
      }
      
      recordsWithCurp++;
      
      // Si es la primera vez que vemos este CURP, inicializar
      if (!employeesByCurp[curp]) {
        employeesByCurp[curp] = {
          ...emp,
          curp: curp,
          totalCostoNomina: 0,
          registros: 0
        };
      }
      
      // Sumar el costo de nómina
      employeesByCurp[curp].totalCostoNomina += costoNomina;
      employeesByCurp[curp].registros++;
    });
    
    console.log('\n📊 RESUMEN DE PROCESAMIENTO:');
    console.log(`  - Registros totales recibidos: ${recordsProcessed}`);
    console.log(`  - Registros con CURP válido: ${recordsWithCurp}`);
    console.log(`  - Registros sin CURP: ${invalidCurp}`);
    console.log(`  - CURPs únicos encontrados: ${Object.keys(employeesByCurp).length}`);
    console.log(`  - Campos CURP encontrados: [${Array.from(curpFieldsFound).join(', ')}]`);
    console.log(`  - Campos Costo encontrados: [${Array.from(costoFieldsFound).join(', ')}]`);
    console.log('='.repeat(60));
    
    console.log('👥 DEBUG: Empleados únicos por CURP:', Object.keys(employeesByCurp).length);
    console.log('👥 DEBUG: Ejemplo de empleado agrupado:', Object.values(employeesByCurp)[0]);
    
    // ANÁLISIS DETALLADO DE COSTOS DE NÓMINA
    let empleadosConSalarioCero = 0;
    let empleadosConSalarioPositivo = 0;
    const ejemplosConSalarioCero = [];
    
    Object.values(employeesByCurp).forEach(emp => {
      if (emp.totalCostoNomina <= 0) {
        empleadosConSalarioCero++;
        if (ejemplosConSalarioCero.length < 5) {
          ejemplosConSalarioCero.push({
            curp: emp.curp,
            costo: emp.totalCostoNomina,
            registros: emp.registros
          });
        }
      } else {
        empleadosConSalarioPositivo++;
      }
    });
    
    console.log('💰 ANÁLISIS DE COSTOS DE NÓMINA:');
    console.log('  - Empleados con salario > $0:', empleadosConSalarioPositivo);
    console.log('  - Empleados con salario = $0:', empleadosConSalarioCero);
    console.log('  - Total empleados únicos:', Object.keys(employeesByCurp).length);
    console.log('  - ¿Suma correcta?', (empleadosConSalarioPositivo + empleadosConSalarioCero) === Object.keys(employeesByCurp).length);
    
    if (ejemplosConSalarioCero.length > 0) {
      console.log('💰 EJEMPLOS DE EMPLEADOS CON SALARIO $0:');
      ejemplosConSalarioCero.forEach((ejemplo, i) => {
        console.log(`  ${i + 1}. CURP: ${ejemplo.curp}, Costo: $${ejemplo.costo}, Registros: ${ejemplo.registros}`);
      });
    }
    
    // PASO 1.5: Calcular distribución por género usando SOLO datos locales procesados
    // (Ignoramos totalUniqueEmployees del servidor para evitar discrepancias)
    let localMaleCount = 0;
    let localFemaleCount = 0;
    let localUnknownCount = 0;
    let localTotal = 0;
    
    // Contar distribución real de empleados procesados localmente
    Object.values(employeesByCurp).forEach(emp => {
      const curpData = parseCURP(emp.curp);
      
      if (curpData) {
        if (curpData.gender === 'male') {
          localMaleCount++;
        } else if (curpData.gender === 'female') {
          localFemaleCount++;
        } else {
          localUnknownCount++;
        }
        localTotal++;
      }
    });
    
    // Usar SOLO los conteos locales (datos reales procesados)
    const uniqueGenderCounts = {
      male: localMaleCount,
      female: localFemaleCount, 
      unknown: localUnknownCount,
      total: localTotal
    };
    
    console.log('👥🧮 DISTRIBUCIÓN TOTAL POR GÉNERO (BASADO EN SERVIDOR):');
    console.log('  - Total del servidor:', totalUniqueEmployees);
    console.log('  - Hombres calculados:', uniqueGenderCounts.male);
    console.log('  - Mujeres calculadas:', uniqueGenderCounts.female);
    console.log('  - Sin género identificado:', uniqueGenderCounts.unknown);
    console.log('  - Suma verificación:', uniqueGenderCounts.male + uniqueGenderCounts.female + uniqueGenderCounts.unknown);
    console.log('  - ¿Suma correcta?', (uniqueGenderCounts.male + uniqueGenderCounts.female + uniqueGenderCounts.unknown) === totalUniqueEmployees);
    
    // PASO 2: Procesar TODOS los empleados únicos (sin exclusiones)
    // Todos los empleados deben tener datos válidos
    const validEmployees = [];
    
    Object.values(employeesByCurp).forEach(emp => {
      const curpData = parseCURP(emp.curp);
      const costoNomina = emp.totalCostoNomina;
      
      // Solo verificar que el CURP sea válido
      if (!curpData) {
        console.warn('⚠️ Empleado con CURP inválido:', emp.curp);
        invalidCurp++;
        return;
      }
      
      // TODOS los empleados deben ser incluidos
      validEmployees.push({
        emp,
        curpData,
        costoNomina,
        age: curpData.age,
        gender: curpData.gender,
        salaryBand: getSalaryBand(costoNomina)
      });
    });
    
    console.log(`🧮 Empleados procesados: ${validEmployees.length}`);
    
    // Calcular proporciones reales de distribución por edad y banda salarial
    // para cada género basado en los datos locales
    const distributionStats = {
      female: { byAge: {}, bySalaryBand: {}, total: 0 },
      male: { byAge: {}, bySalaryBand: {}, total: 0 }
    };
    
    // Inicializar estructuras
    for (let age = minAge; age <= maxAge; age++) {
      distributionStats.female.byAge[age] = { total: 0 };
      distributionStats.male.byAge[age] = { total: 0 };
      
      SALARY_BANDS.forEach(band => {
        distributionStats.female.byAge[age][band.name] = 0;
        distributionStats.male.byAge[age][band.name] = 0;
      });
    }
    
    SALARY_BANDS.forEach(band => {
      distributionStats.female.bySalaryBand[band.name] = 0;
      distributionStats.male.bySalaryBand[band.name] = 0;
    });
    
    // Procesar empleados válidos para obtener distribuciones locales
    validEmployees.forEach(({ age, gender, salaryBand }) => {
      const genderKey = gender === 'female' ? 'female' : 'male';
      
      // Incrementar contadores por edad y banda salarial
      distributionStats[genderKey].byAge[age].total++;
      distributionStats[genderKey].byAge[age][salaryBand.name]++;
      distributionStats[genderKey].bySalaryBand[salaryBand.name]++;
      distributionStats[genderKey].total++;
    });
    
    console.log('📊 Distribución local calculada:', {
      femaleTotal: distributionStats.female.total,
      maleTotal: distributionStats.male.total,
      totalValid: distributionStats.female.total + distributionStats.male.total
    });
    
    // Ahora aplicamos esta distribución al total proporcionado por el servidor
    // para crear los datos de la gráfica
    
    // Inicializar la estructura de grupos de edad para la gráfica
    for (let age = minAge; age <= maxAge; age++) {
      if (!ageGroups[age]) {
        ageGroups[age] = {
          female: {}, // Mujeres a la izquierda
          male: {}    // Hombres a la derecha
        };
        SALARY_BANDS.forEach(band => {
          ageGroups[age].female[band.name] = 0;
          ageGroups[age].male[band.name] = 0;
        });
      }
    }
    
    // Usar DIRECTAMENTE los empleados válidos procesados (sin extrapolación)
    console.log('🎯 Usando datos reales procesados directamente (sin extrapolación):', {
      totalValidEmployees: validEmployees.length,
      maleInDistribution: distributionStats.male.total,
      femaleInDistribution: distributionStats.female.total
    });
    
    // Aplicar la distribución REAL calculada directamente (1:1)
    for (let age = minAge; age <= maxAge; age++) {
      SALARY_BANDS.forEach(band => {
        // Usar los conteos REALES calculados directamente
        const maleCount = distributionStats.male.byAge[age][band.name] || 0;
        const femaleCount = distributionStats.female.byAge[age][band.name] || 0;
        
        ageGroups[age].male[band.name] = maleCount;
        ageGroups[age].female[band.name] = femaleCount;
        
        // Actualizar estadísticas para las leyendas
        salaryBandStats[band.name].male += maleCount;
        salaryBandStats[band.name].female += femaleCount;
        salaryBandStats[band.name].count += (maleCount + femaleCount);
      });
    }
    
    // Calcular totales ajustados usando los datos reales
    const finalMaleCount = distributionStats.male.total;
    const finalFemaleCount = distributionStats.female.total;
    totalEmployees = finalMaleCount + finalFemaleCount;
    
    // Ajustar los datos de costo promedio usando la distribución original
    validEmployees.forEach(({ costoNomina }) => {
      totalSalary += costoNomina;
      validSalaryCount++;
    });

    const avgSalary = validSalaryCount > 0 ? totalSalary / validSalaryCount : 0;
    const avgAge = validEmployees.length > 0 
      ? validEmployees.reduce((sum, { age }) => sum + age, 0) / validEmployees.length 
      : 0;

    const stats = {
      totalEmployees,
      averageSalary: avgSalary,
      averageAge: avgAge,
      salaryBandStats,
      validSalaryCount,
      maleCount: finalMaleCount,      // CORRECCIÓN: usar finalMaleCount
      femaleCount: finalFemaleCount,  // CORRECCIÓN: usar finalFemaleCount
      genderStats
    };

    console.log('📊 Estadísticas de pirámide salarial:', stats);
    console.log('👥 Distribución por género:', { mujeres: finalFemaleCount, hombres: finalMaleCount });
    console.log('🧮 VALIDACIÓN CONTEO DE GÉNERO:');
    console.log('  - Suma manuales (M+F):', finalMaleCount + finalFemaleCount);
    console.log('  - Total empleados procesados:', totalEmployees);
    console.log('  - ¿Coinciden?', (finalMaleCount + finalFemaleCount) === totalEmployees);
    console.log('  - Distribución por banda salarial:');
    SALARY_BANDS.forEach(band => {
      const bandStats = salaryBandStats[band.name];
      console.log(`    ${band.name}: Total=${bandStats.count}, M=${bandStats.male}, F=${bandStats.female}, Suma=${bandStats.male + bandStats.female}`);
    });
    console.log('❌ EXCLUSIONES:');
    console.log('  - CURP inválido:', invalidCurp);
    console.log('  - Edad fuera de rango:', invalidAge, '(rango:', minAge, '-', maxAge, ')');
    console.log('  - Salario cero o negativo:', invalidSalary);
    console.log('  - TOTAL PROCESADOS:', totalEmployees);
    console.log('  - TOTAL EXCLUIDOS:', invalidCurp + invalidAge + invalidSalary);
    
    console.log('\n🔢 COMPARACIÓN DE TOTALES:');
    console.log('  - Servidor (endpoint unique-count):', totalUniqueEmployees);
    console.log('  - Calculado localmente (todos CURPs):', uniqueGenderCounts.total);
    console.log('  - Diferencia:', Math.abs(totalUniqueEmployees - uniqueGenderCounts.total));
    
    return { ageGroups, stats, processedEmployees, uniqueGenderCounts };
  }, [salaryData, minAge, maxAge, totalUniqueEmployees]);

  // Calcular el máximo GLOBAL para normalización proporcional Y escalado dinámico
  const { globalMaxCount, maxCounts, scaleStats, scaleFactor, containerWidthPercent } = useMemo(() => {
    const maxCounts = {};
    let globalMax = 1;
    const bandMaxes = [];
    
    // Calcular máximo por banda
    SALARY_BANDS.forEach(band => {
      const maleMax = Math.max(...Object.values(pyramidData.ageGroups).map(ageData => ageData.male?.[band.name] || 0), 0);
      const femaleMax = Math.max(...Object.values(pyramidData.ageGroups).map(ageData => ageData.female?.[band.name] || 0), 0);
      const bandMax = Math.max(maleMax, femaleMax);
      maxCounts[band.name] = bandMax;
      bandMaxes.push(bandMax);
      
      // Actualizar máximo global
      if (bandMax > globalMax) {
        globalMax = bandMax;
      }
    });
    
    // ESCALADO DINÁMICO AGRESIVO: Maximizar uso del espacio horizontal
    const TARGET_MAX_WIDTH = 95; // 95% del contenedor para la barra más grande
    const MIN_VISIBLE_WIDTH = 12; // 12% mínimo para barras pequeñas
    const MIN_SCALE_FACTOR = 45;  // Factor mínimo ajustado para mejor proporción
    
    let scaleFactor = MIN_SCALE_FACTOR;
    let containerWidthPercent = 100;
    
    if (globalMax > 0) {
      // Calcular factor base más agresivo
      const baseScaleFactor = TARGET_MAX_WIDTH / globalMax;
      
      // Usar factor más generoso para mejor visibilidad
      scaleFactor = Math.max(baseScaleFactor, MIN_SCALE_FACTOR);
      
      // Solo ajustar contenedor si realmente es necesario
      const effectiveMaxWidth = globalMax * scaleFactor;
      if (effectiveMaxWidth > TARGET_MAX_WIDTH) {
        // Reducir factor pero mantener visibilidad mínima
        scaleFactor = Math.max(TARGET_MAX_WIDTH / globalMax, MIN_SCALE_FACTOR * 0.8);
        containerWidthPercent = 100; // Mantener contenedor al 100%
      }
    }
    
    // Stats para debugging
    const scaleStats = {
      globalMax,
      scaleFactor: scaleFactor.toFixed(2),
      containerWidthPercent: containerWidthPercent.toFixed(1),
      effectiveMaxWidth: (globalMax * scaleFactor).toFixed(1),
      bandMaxes: SALARY_BANDS.map(band => ({
        name: band.name,
        max: maxCounts[band.name],
        effectiveWidth: (maxCounts[band.name] * scaleFactor).toFixed(1) + '%'
      }))
    };
    
    console.log('📏 ESCALA DINÁMICA:', scaleStats);
    
    return { 
      globalMaxCount: globalMax, 
      maxCounts, 
      scaleStats, 
      scaleFactor,
      containerWidthPercent
    };
  }, [pyramidData.ageGroups]);

    // Generar rango de edades y calcular altura dinámica
  const { ageRange, chartHeight, rowHeight } = useMemo(() => {
    const ageGroups = pyramidData.ageGroups;
    if (!ageGroups || Object.keys(ageGroups).length === 0) {
      return { ageRange: [], chartHeight: '400px', rowHeight: '18px' };
    }
    
    // Encontrar TODAS las edades que tienen datos (solo para determinar el rango)
    const agesWithData = Object.keys(ageGroups)
      .map(age => parseInt(age))
      .filter(age => {
        const data = ageGroups[age];
        return SALARY_BANDS.some(band => 
          (data.female?.[band.name] || 0) > 0 || (data.male?.[band.name] || 0) > 0
        );
      })
      .sort((a, b) => a - b);
      
    if (agesWithData.length === 0) {
      return { ageRange: [], chartHeight: '400px', rowHeight: '18px' };
    }
    
    // Determinar rango EXACTO basado SOLO en las edades que tienen datos
    const actualMinAge = agesWithData[0];  // Edad mínima con datos
    const actualMaxAge = agesWithData[agesWithData.length - 1]; // Edad máxima con datos
    
    // Generar TODAS las edades en el rango de datos reales, incluso las vacías entre min y max
    const ages = [];
    for (let age = actualMinAge; age <= actualMaxAge; age++) {
      ages.push(age); // Incluir TODAS las edades entre min y max con datos
    }
    
    const finalAges = ages.reverse(); // De mayor a menor
    
    // Calcular altura dinámica con mejor distribución
    const totalRows = finalAges.length;
    const maxAvailableHeight = 600; // Aumentar altura máxima disponible
    const minRowHeight = 15;        // Aumentar altura mínima de fila
    const maxRowHeight = 25;        // Aumentar altura máxima de fila
    const xAxisHeight = 50;         // Más espacio para etiquetas
    
    let calculatedRowHeight = maxRowHeight;
    let calculatedChartHeight = maxAvailableHeight;
    
    if (totalRows > 0) {
      // Calcular altura de fila para que todas las filas quepan sin scroll
      const availableForRows = maxAvailableHeight - xAxisHeight;
      const idealRowHeight = availableForRows / totalRows;
      
      // Ajustar altura de fila dentro de límites razonables
      calculatedRowHeight = Math.max(minRowHeight, Math.min(maxRowHeight, idealRowHeight));
      
      // Calcular altura total del gráfico
      const totalRowsHeight = totalRows * (calculatedRowHeight + 2); // +2 para más separación
      calculatedChartHeight = totalRowsHeight + xAxisHeight;
    }
    
    console.log('📐 ALTURA DINÁMICA CALCULADA:', {
      totalRows,
      calculatedRowHeight: calculatedRowHeight.toFixed(1) + 'px',
      calculatedChartHeight: calculatedChartHeight.toFixed(1) + 'px',
      maxAvailableHeight,
      ageRange: finalAges.length + ' edades'
    });
    
    return { 
      ageRange: finalAges, 
      chartHeight: `${calculatedChartHeight}px`,
      rowHeight: `${calculatedRowHeight}px`
    };
  }, [pyramidData.ageGroups, minAge, maxAge]);

  return (
    <PyramidContainer>
      <PyramidHeader $collapsed={collapsed}>
        <PyramidTitle>
          <TitleText>
            <FaChartBar />
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
            <span style={{ 
              fontSize: '0.8rem', 
              color: 'rgba(255, 255, 255, 0.8)', 
              background: 'rgba(46, 204, 113, 0.2)',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
              marginLeft: '0.5rem',
              border: '1px solid rgba(46, 204, 113, 0.3)'
            }}>
              Solo Activos
            </span>
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
            <p style={{ marginTop: '1rem' }}>Analizando datos salariales...</p>
          </LoadingContainer>
        ) : (
          <PyramidWrapper>
            <LeftSidebar>
              <StatsContainer>
                <StatItem>
                  <StatValue>{pyramidData.stats?.totalEmployees || 0}</StatValue>
                  <StatLabel>Total Empleados (CURP única)</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>${(pyramidData.stats?.averageSalary || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}</StatValue>
                  <StatLabel>Costo de Nómina Promedio</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{(pyramidData.stats?.averageAge || 0).toFixed(1)}</StatValue>
                  <StatLabel>Edad Promedio</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{pyramidData.uniqueGenderCounts?.female || 0}</StatValue>
                  <StatLabel>Mujeres</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{pyramidData.uniqueGenderCounts?.male || 0}</StatValue>
                  <StatLabel>Hombres</StatLabel>
                </StatItem>
              </StatsContainer>
              
              <LegendContainer>
                <div style={{ fontSize: '0.9rem', color: OFFICIAL_BLUE, marginBottom: '0.5rem', fontWeight: '500' }}>
                  Bandas Salariales
                </div>
                {SALARY_BANDS.map(band => (
                  <LegendItem key={band.name}>
                    <LegendColor $color={band.color} />
                    <span>{band.label}</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                      ({pyramidData.stats?.salaryBandStats?.[band.name]?.count || 0})
                    </span>
                  </LegendItem>
                ))}
              </LegendContainer>
            </LeftSidebar>
            
            <ChartContainer>
              <PyramidChart $chartHeight={chartHeight}>
                {ageRange.length === 0 && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3rem',
                    color: OFFICIAL_BLUE,
                    textAlign: 'center'
                  }}>
                    <p>No hay datos disponibles para mostrar</p>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      Total de empleados procesados: {pyramidData.stats?.totalEmployees || 0}
                    </p>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      Grupos de edad: {Object.keys(pyramidData.ageGroups || {}).length}
                    </p>
                  </div>
                )}
                {ageRange.map(age => {
                  const ageData = pyramidData.ageGroups[age] || {};
                  const femaleData = ageData.female || {};
                  const maleData = ageData.male || {};
                  
                  // Calcular el total para esta edad
                  const totalForAge = SALARY_BANDS.reduce((sum, band) => 
                    sum + (femaleData[band.name] || 0) + (maleData[band.name] || 0), 0
                  );
                  
                  // MOSTRAR TODAS LAS EDADES, incluso con 0 empleados
                  // if (totalForAge === 0) return null; // <- COMENTADO

                  return (
                    <AgeRow key={age} $rowHeight={rowHeight}>
                      {/* Mujeres a la izquierda - INVERTIR ORDEN para efecto espejo */}
                      <LeftContainer $maxWidth={`${containerWidthPercent / 2}%`}>
                        {SALARY_BANDS.slice().reverse().map(band => {
                          const count = femaleData[band.name] || 0;
                          if (count === 0) return null;
                          
                          // Usar escala DINÁMICA para proporcionalidad optimizada
                          const width = globalMaxCount > 0 ? (count / globalMaxCount) * scaleFactor : 0;
                          
                          return (
                            <SalaryBar
                              key={`female-${age}-${band.name}`}
                              style={{ width: `${width}%` }}
                              $gradient={band.color}
                              $opacity={0.8 + (count / globalMaxCount) * 0.2}
                            >
                              <TooltipBar>
                                Edad: {age} años<br/>
                                Mujeres - {band.label}<br/>
                                Empleadas: {count}<br/>
                                Ancho: {width.toFixed(1)}% (escala: {scaleFactor.toFixed(2)}x)
                              </TooltipBar>
                            </SalaryBar>
                          );
                        })}
                      </LeftContainer>
                      
                      <AgeLabel>{age % 2 === 0 ? age : ''}</AgeLabel>
                      <CenterAxis />
                      
                      {/* Hombres a la derecha */}
                      <RightContainer $maxWidth={`${containerWidthPercent / 2}%`}>
                        {SALARY_BANDS.map(band => {
                          const count = maleData[band.name] || 0;
                          if (count === 0) return null;
                          
                          // Usar escala DINÁMICA para proporcionalidad optimizada
                          const width = globalMaxCount > 0 ? (count / globalMaxCount) * scaleFactor : 0;
                          
                          return (
                            <SalaryBar
                              key={`male-${age}-${band.name}`}
                              style={{ width: `${width}%` }}
                              $gradient={band.color}
                              $opacity={0.8 + (count / globalMaxCount) * 0.2}
                            >
                              <TooltipBar>
                                Edad: {age} años<br/>
                                Hombres - {band.label}<br/>
                                Empleados: {count}<br/>
                                Ancho: {width.toFixed(1)}% (escala: {scaleFactor.toFixed(2)}x)
                              </TooltipBar>
                            </SalaryBar>
                          );
                        })}
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

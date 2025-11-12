import { useState, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import { FaSpinner, FaBriefcase, FaChevronUp, FaChevronDown, FaFilter } from 'react-icons/fa'
import { applyPuestoFilters } from '../utils/puestoMapping'
import { buildDemographicFilterParams } from '../services/demographicFiltersApi'

// Styled Components
const ChartContainer = styled.div`
  width: 100%;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  margin-bottom: 2rem;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: rgba(255, 255, 255, 0.15);
  border-bottom: ${props => props.$collapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.1)'};
`;

const ChartTitle = styled.div`
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

const ChartContent = styled.div`
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

const ChartWrapper = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const StatItem = styled.div`
  background: rgba(255, 255, 255, 0.05);
  padding: 1rem;
  border-radius: 12px;
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
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: rgba(44, 62, 80, 0.7);
`;

const BarsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow-y: auto;
  max-height: 400px; /* Altura fija similar al PopulationPyramid */
  
  /* Estilizar scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(30, 58, 138, 0.3);
    border-radius: 3px;
    transition: background 0.3s ease;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(30, 58, 138, 0.5);
  }
`;

const PuestoRow = styled.div`
  display: flex;
  align-items: center;
  min-height: 32px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.3s ease;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-1px);
  }
`;

const PuestoLabel = styled.div`
  font-size: 0.8rem;
  font-weight: 500;
  color: #1e3a8a;
  width: 200px; /* Ancho fijo para alineación consistente */
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
`;

const PuestoName = styled.div`
  font-weight: 600;
  color: #1e3a8a;
  font-size: 0.85rem;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PuestoTotal = styled.div`
  font-size: 0.75rem;
  color: rgba(30, 58, 138, 0.8);
  font-weight: 500;
  background: rgba(30, 58, 138, 0.1);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  margin-left: 0.5rem;
  flex-shrink: 0;
`;

const BarContainer = styled.div`
  display: flex;
  align-items: center;
  height: 32px;
  flex: 1;
  position: relative;
  padding: 0 1rem;
`;

const CenterAxis = styled.div`
  position: absolute;
  left: 50%;
  top: 0;
  width: 2px;
  height: 100%;
  background: rgba(30, 58, 138, 0.6);
  z-index: 2;
`;

const FemaleBar = styled.div`
  position: absolute;
  right: 50%;
  height: 30px;
  background: linear-gradient(90deg, #ff69b4, #ff1493);
  border-radius: 4px 0 0 4px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.5rem;
  color: #1e3a8a; /* Azul oficial de la página */
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scaleY(1.1);
    background: linear-gradient(90deg, #ff1493, #dc143c);
  }
`;

const MaleBar = styled.div`
  position: absolute;
  left: 50%;
  height: 30px;
  background: linear-gradient(90deg, #4169e1, #0066cc);
  border-radius: 0 4px 4px 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 0.5rem;
  color: #1e3a8a; /* Azul oficial de la página */
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scaleY(1.1);
    background: linear-gradient(90deg, #0066cc, #003d7a);
  }
`;

const AxisLabels = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding: 0 1rem;
  font-size: 0.75rem;
  color: rgba(44, 62, 80, 0.6);
`;

const LegendContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1rem;
  padding: 1rem;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: rgba(44, 62, 80, 0.8);
`;

const LegendColor = styled.div`
  width: 20px;
  height: 12px;
  border-radius: 2px;
  background: ${props => props.$color};
`;

export default function PuestoSueldoGrafica({ 
  title = "Distribución por Puesto y Género",
  activeEmployees = [], 
  filters = {},
  periodFilter
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Estado para conteos reales desde el servidor (igual que TablaDemografico)
  const [serverStats, setServerStats] = useState({
    uniqueTotalCount: 0,
    uniqueMaleCount: 0,
    uniqueFemaleCount: 0
  });
  
  // Cargar conteo real de empleados únicos desde el servidor (IGUAL QUE TablaDemografico)
  const loadUniqueEmployeeStats = async () => {
    try {
      // Usar el servicio de filtros demográficos para construir parámetros
      const filterParams = {
        ...filters,
        periodFilter: periodFilter || filters.periodFilter
      };
      
      const params = buildDemographicFilterParams(filterParams);
      
      console.log('🔍 PuestoSueldoGrafica - Consultando servidor para conteos únicos:', filterParams);

      const url = `http://numericaapi.kretosstechnology.com:3001/api/payroll/demographic/unique-count?${params}`;
      console.log('🔍 PuestoSueldoGrafica - URL del servidor:', url);
      
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        console.log('🔍 PuestoSueldoGrafica - Respuesta del servidor:', result);
        if (result.success) {
          setServerStats({
            uniqueTotalCount: result.uniqueCurpCount || 0,
            uniqueMaleCount: result.uniqueMaleCount || 0,
            uniqueFemaleCount: result.uniqueFemaleCount || 0
          });
          console.log('📊 PuestoSueldoGrafica - Conteos REALES desde servidor:', {
            total: result.uniqueCurpCount,
            hombres: result.uniqueMaleCount,
            mujeres: result.uniqueFemaleCount
          });
        }
      } else {
        console.error('❌ PuestoSueldoGrafica - Error en respuesta del servidor:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ PuestoSueldoGrafica - Error consultando conteos:', error);
    }
  };
  
  // Cargar conteos reales cuando cambien los filtros
  useEffect(() => {
    if (periodFilter !== null) {
      console.log('🔄 PuestoSueldoGrafica - Recargando conteos por cambio de filtros:', {
        periodFilter,
        filters
      });
      loadUniqueEmployeeStats();
    }
  }, [periodFilter, filters]);

  // Función para parsear CURP y extraer género
  const parseCURP = (curp) => {
    if (!curp || typeof curp !== 'string' || curp.length < 11) {
      return null;
    }
    
    try {
      const cleanCurp = curp.trim().toUpperCase();
      const genderChar = cleanCurp.charAt(10);
      return {
        gender: genderChar === 'H' ? 'male' : genderChar === 'M' ? 'female' : 'unknown',
        genderChar
      };
    } catch (error) {
      return null;
    }
  };

  // Procesar datos para la gráfica de puestos
  const chartData = useMemo(() => {
    console.log('🔍 PuestoSueldoGrafica - DIAGNÓSTICO COMPLETO:');
    console.log('- activeEmployees.length:', activeEmployees.length);
    console.log('- filters:', filters);
    
    if (!activeEmployees.length) {
      console.log('❌ PuestoSueldoGrafica - No hay empleados activos');
      return { puestoData: [], stats: {} };
    }

    // Aplicar filtros demográficos a los empleados
    const filteredEmployees = applyPuestoFilters(activeEmployees, filters);
    
    console.log('📊 PuestoSueldoGrafica - Empleados después de filtros:', filteredEmployees.length);
    console.log('📊 PuestoSueldoGrafica - Primeros 3 empleados:', filteredEmployees.slice(0, 3));
    
    // DEDUPLICAR EMPLEADOS POR CURP - Contar solo empleados únicos
    const uniqueEmployeesMap = new Map();
    
    filteredEmployees.forEach(emp => {
      const curp = emp.curp || emp.CURP || emp.Curp;
      if (curp && !uniqueEmployeesMap.has(curp)) {
        uniqueEmployeesMap.set(curp, emp);
      }
    });
    
    const uniqueEmployees = Array.from(uniqueEmployeesMap.values());
    console.log('📊 PuestoSueldoGrafica - Empleados únicos (deduplicados):', uniqueEmployees.length);
    
    // Agrupar empleados ÚNICOS por puesto y género
    const puestoGroups = {};
    let totalMales = 0;
    let totalFemales = 0;
    let totalEmployees = 0;
    
    uniqueEmployees.forEach(emp => {
      // Obtener CURP de diferentes campos posibles
      const curp = emp.curp || emp.CURP || emp.Curp;
      const parsedCURP = parseCURP(curp);
      
      // Obtener el puesto del empleado
      const puesto = emp.puesto || emp.Puesto || emp.PUESTO || 'Sin Puesto';
      
      if (!puestoGroups[puesto]) {
        puestoGroups[puesto] = { male: 0, female: 0 };
      }
      
      if (parsedCURP) {
        totalEmployees++;
        if (parsedCURP.gender === 'male') {
          puestoGroups[puesto].male++;
          totalMales++;
        } else if (parsedCURP.gender === 'female') {
          puestoGroups[puesto].female++;
          totalFemales++;
        }
      } else {
        // Si no se puede parsear el CURP, usar género del empleado si existe
        if (emp.gender === 'male' || emp.Sexo === 'H') {
          puestoGroups[puesto].male++;
          totalMales++;
          totalEmployees++;
        } else if (emp.gender === 'female' || emp.Sexo === 'M') {
          puestoGroups[puesto].female++;
          totalFemales++;
          totalEmployees++;
        }
      }
    });

    // Convertir a array y ordenar por total descendente
    const puestoData = Object.entries(puestoGroups)
      .map(([puesto, data]) => ({
        puesto,
        male: data.male,
        female: data.female,
        total: data.male + data.female
      }))
      .filter(item => item.total > 0) // Solo puestos con empleados
      .sort((a, b) => b.total - a.total); // Ordenar por total descendente

    const stats = {
      totalEmployees, // Ahora es el conteo real de empleados únicos
      totalMales,
      totalFemales,
      totalPuestos: puestoData.length,
      malePercentage: totalEmployees > 0 ? (totalMales / totalEmployees * 100) : 0,
      femalePercentage: totalEmployees > 0 ? (totalFemales / totalEmployees * 100) : 0
    };

    console.log('📊 PuestoSueldoGrafica - EMPLEADOS ÚNICOS procesados:', {
      registrosOriginales: filteredEmployees.length,
      empleadosUnicos: uniqueEmployees.length,
      stats
    });

    return { puestoData, stats };
  }, [activeEmployees, filters]);

  // Calcular el máximo para normalización
  const maxValue = useMemo(() => {
    if (!chartData.puestoData.length) return 1;
    
    const maxMale = Math.max(...chartData.puestoData.map(item => item.male), 1);
    const maxFemale = Math.max(...chartData.puestoData.map(item => item.female), 1);
    
    return Math.max(maxMale, maxFemale);
  }, [chartData.puestoData]);

  return (
    <ChartContainer>
      <ChartHeader $collapsed={collapsed}>
        <ChartTitle>
          <TitleText>
            <FaBriefcase />
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
        </ChartTitle>
        <ToggleButton onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <FaChevronDown /> : <FaChevronUp />}
          {collapsed ? 'Expandir' : 'Contraer'}
        </ToggleButton>
      </ChartHeader>

      <ChartContent $collapsed={collapsed}>
        {loading ? (
          <LoadingContainer>
            <FaSpinner size={32} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '1rem' }}>Procesando datos por puesto...</p>
          </LoadingContainer>
        ) : (
          <ChartWrapper>
            <StatsContainer>
              <StatItem>
                <StatValue>
                  {serverStats.uniqueTotalCount > 0 ? serverStats.uniqueTotalCount : (chartData.stats?.totalEmployees || 0)}
                </StatValue>
                <StatLabel>
                  Total Empleados {serverStats.uniqueTotalCount > 0 ? '(Real)' : '(Local)'}
                </StatLabel>
              </StatItem>
              <StatItem>
                <StatValue>{chartData.stats?.totalPuestos || 0}</StatValue>
                <StatLabel>Puestos Diferentes</StatLabel>
              </StatItem>
              <StatItem>
                <StatValue>
                  {serverStats.uniqueFemaleCount > 0 ? serverStats.uniqueFemaleCount : (chartData.stats?.totalFemales || 0)}
                </StatValue>
                <StatLabel>
                  Mujeres {serverStats.uniqueFemaleCount > 0 ? '(Real)' : '(Local)'} 
                  ({serverStats.uniqueTotalCount > 0 && serverStats.uniqueTotalCount > 0 
                    ? ((serverStats.uniqueFemaleCount / serverStats.uniqueTotalCount) * 100).toFixed(1) 
                    : (chartData.stats?.femalePercentage || 0).toFixed(1)}%)
                </StatLabel>
              </StatItem>
              <StatItem>
                <StatValue>
                  {serverStats.uniqueMaleCount > 0 ? serverStats.uniqueMaleCount : (chartData.stats?.totalMales || 0)}
                </StatValue>
                <StatLabel>
                  Hombres {serverStats.uniqueMaleCount > 0 ? '(Real)' : '(Local)'} 
                  ({serverStats.uniqueTotalCount > 0 && serverStats.uniqueTotalCount > 0 
                    ? ((serverStats.uniqueMaleCount / serverStats.uniqueTotalCount) * 100).toFixed(1) 
                    : (chartData.stats?.malePercentage || 0).toFixed(1)}%)
                </StatLabel>
              </StatItem>
            </StatsContainer>

            <BarsContainer>
              {chartData.puestoData.map((item, index) => {
                const femaleWidth = maxValue > 0 ? (item.female / maxValue) * 45 : 0; // 45% max width
                const maleWidth = maxValue > 0 ? (item.male / maxValue) * 45 : 0; // 45% max width
                
                return (
                  <PuestoRow key={index}>
                    <PuestoLabel>
                      <PuestoName>{item.puesto}</PuestoName>
                      <PuestoTotal>{item.total}</PuestoTotal>
                    </PuestoLabel>
                    <BarContainer>
                      <CenterAxis />
                      
                      {item.female > 0 && (
                        <FemaleBar style={{ width: `${femaleWidth}%` }}>
                          {item.female}
                        </FemaleBar>
                      )}
                      
                      {item.male > 0 && (
                        <MaleBar style={{ width: `${maleWidth}%` }}>
                          {item.male}
                        </MaleBar>
                      )}
                    </BarContainer>
                  </PuestoRow>
                );
              })}
            </BarsContainer>

            <AxisLabels>
              <span>{maxValue} ← Mujeres</span>
              <span>0</span>
              <span>Hombres → {maxValue}</span>
            </AxisLabels>

            <LegendContainer>
              <LegendItem>
                <LegendColor $color="linear-gradient(90deg, #ff69b4, #ff1493)" />
                <span>Mujeres (Positivo)</span>
              </LegendItem>
              <LegendItem>
                <LegendColor $color="linear-gradient(90deg, #4169e1, #0066cc)" />
                <span>Hombres (Negativo)</span>
              </LegendItem>
            </LegendContainer>
          </ChartWrapper>
        )}
      </ChartContent>
    </ChartContainer>
  );
}

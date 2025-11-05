import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FaChartBar } from 'react-icons/fa';
import { buildApiUrl } from '../config/apiConfig';
import { calculateLatestPeriodFromDatabase } from '../services/demographicFiltersApi';
import TablaDemografico from '../components/TablaDemografico';
import InteractiveDataViewer from '../components/InteractiveDataViewer';
import PopulationPyramid from '../components/PopulationPyramid';
import PuestoSueldoGrafica from '../components/PuestoSueldoGrafica';
import SalaryAgePopulationPyramid from '../components/SalaryAgePopulationPyramid';
import AntiguedadPorSucursal from '../components/AntiguedadPorSucursal';
import DemographicFilterSystem from '../components/DemographicFilterSystem';
import { ChartEventsProvider } from '../hooks/useChartEvents';

const PageContainer = styled.div`
  padding: 2rem;
  color: #2c3e50;
  min-height: calc(100vh - 80px);
`;

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 300;
  margin: 0;
  letter-spacing: 1px;
`;

const ChartsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin: 2rem 0;
  
  @media (max-width: 1400px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const InteractiveDataContainer = styled.div`
  width: 100%;
  margin: 2rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Demografico = () => {
  // Estado para empleados activos compartido
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [periodFilter, setPeriodFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Estado para los filtros demográficos
  const [demographicFilters, setDemographicFilters] = useState({});
  
  // El sistema de eventos centralizado manejará las selecciones automáticamente

  // Cargar último período disponible desde la base de datos
  const loadLatestPeriod = async () => {
    try {
      console.log('📅 Demografico: Calculando último período desde la base de datos...');
      
      // Usar nuestra nueva función que consulta directamente la BD
      const latestPeriodInfo = await calculateLatestPeriodFromDatabase();
      
      if (latestPeriodInfo) {
        console.log('📅 Demografico - Último período calculado:', latestPeriodInfo);
        
        // Probar el período calculado para asegurar que funciona
        await testAndSetBestPeriodFormat(latestPeriodInfo.value);
      } else {
        console.warn('⚠️ No se pudo calcular el último período');
        console.log('🆘 Probando sin filtro de período como fallback...');
        await testNoFilterFallback();
      }
    } catch (error) {
      console.error('❌ Error calculando último período:', error);
      console.log('🆘 Error en cálculo de período, probando sin filtro de período...');
      // FALLBACK de emergencia: sin filtro
      await testNoFilterFallback();
    }
  };

  // Función para probar diferentes formatos de período y elegir el que devuelva datos
  const testAndSetBestPeriodFormat = async (originalPeriod) => {
    const periodDate = new Date(originalPeriod);
    
    // Diferentes formatos a probar
    const formatsToTest = [
      originalPeriod, // Formato original
      originalPeriod.substring(0, 7), // YYYY-MM del formato original
      `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`, // YYYY-MM calculado
      originalPeriod.split('T')[0], // Solo la parte de fecha si es timestamp
    ];
    
    console.log('🧪 Probando formatos de período:', formatsToTest);
    
    for (const format of formatsToTest) {
      try {
        console.log(`🔍 Probando formato: "${format}"`);
        
        // Probar con una consulta rápida usando el endpoint existente
        const params = new URLSearchParams({
          cveper: format,
          status: 'A',
          pageSize: '1',
          page: '1'
        });
        const testResponse = await fetch(buildApiUrl(`/api/payroll?${params.toString()}`));
        
        if (testResponse.ok) {
          const testResult = await testResponse.json();
          
          if (testResult.success && testResult.data && testResult.data.length > 0) {
            console.log(`✅ Formato "${format}" funciona: ${testResult.data.length} empleados encontrados`);
            setPeriodFilter(format);
            return;
          } else {
            console.log(`⚠️ Formato "${format}" no devuelve datos:`, testResult.data?.length || 0, 'empleados');
          }
        } else {
          console.log(`❌ Formato "${format}" devuelve error HTTP:`, testResponse.status);
        }
      } catch (error) {
        console.log(`❌ Error probando formato "${format}":`, error.message);
      }
    }
    
    // Si ningún formato funcionó, probar sin filtro de período usando testNoFilterFallback
    console.warn('⚠️ Ningún formato devolvió datos, probando sin filtro de período...');
    const fallbackResult = await testNoFilterFallback();
    if (fallbackResult) {
      return; // testNoFilterFallback ya configuró el periodFilter
    }
    
    // Último recurso: usar formato original
    console.warn('⚠️ Como último recurso, usando formato original:', originalPeriod);
    setPeriodFilter(originalPeriod);
  };

  // Función fallback para casos sin períodos válidos
  const testNoFilterFallback = async () => {
    try {
      console.log('🧪 Probando sin filtro de período...');
      const params = new URLSearchParams({
        status: 'A',
        pageSize: '1',
        page: '1'
      });
      const testResponse = await fetch(buildApiUrl(`/api/payroll?${params.toString()}`));
      
      if (testResponse.ok) {
        const testResult = await testResponse.json();
        
        if (testResult.success && testResult.data && testResult.data.length > 0) {
          console.log(`✅ Sin filtro funciona: encontrados empleados activos`);
          console.log('📝 Nota: Se mostrarán TODOS los empleados activos (sin filtro de período)');
          setPeriodFilter(''); // Filtro vacío = sin filtro
          return true;
        } else {
          console.warn('❌ Sin filtro tampoco devuelve datos válidos');
          return false;
        }
      } else {
        console.error('❌ Error HTTP probando sin filtro:', testResponse.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Error de red probando sin filtro:', error);
      return false;
    }
  };

  // Cargar conteo real de empleados únicos
  const loadUniqueEmployeeCount = async () => {
    try {
      const params = new URLSearchParams();
      if (periodFilter && periodFilter !== '') {
        params.append('cveper', periodFilter);
      }
      params.append('status', 'A');
      
      const response = await fetch(buildApiUrl(`/api/payroll/demographic/unique-count?${params}`));
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return result.uniqueCurpCount || 1608; // 1608 es el número confirmado
        }
      }
    } catch (error) {
      console.error('Error loading unique count:', error);
    }
    return 1608; // Valor confirmado por defecto
  };

  // Cargar empleados activos del último mes - NUEVA ESTRATEGIA: CARGA PAGINADA
  const loadActiveEmployees = async () => {
    try {
      setLoading(true);
      
      console.log('📊 Demografico - Iniciando carga paginada de TODOS los empleados');
      
      // Primero obtener el conteo total real
      const realTotalCount = await loadUniqueEmployeeCount();
      console.log('📊 Total de empleados a cargar:', realTotalCount);
      
      // Configuración de paginación
      const PAGE_SIZE = 1000; // Tamaño máximo que acepta el servidor
      const totalPages = Math.ceil(realTotalCount / PAGE_SIZE);
      
      console.log('📊 Estrategia paginada - Páginas necesarias:', totalPages, 'Tamaño por página:', PAGE_SIZE);
      
      // Cargar todas las páginas en paralelo
      const pagePromises = [];
      for (let page = 1; page <= totalPages; page++) {
        const params = new URLSearchParams({
          page: page,
          pageSize: PAGE_SIZE,
          sortBy: 'nombre',
          sortDir: 'asc',
          ...(periodFilter && periodFilter !== '' ? { cveper: periodFilter } : {}),
          status: 'A'
        });
        
        pagePromises.push(
          fetch(buildApiUrl(`/api/payroll/demographic?${params}`))
            .then(res => res.json())
            .then(result => ({ page, data: result.data || [], total: result.total }))
        );
      }
      
      console.log('📊 Cargando', pagePromises.length, 'páginas en paralelo...');
      const pageResults = await Promise.all(pagePromises);
      
      // Combinar todos los empleados de todas las páginas
      let allEmployees = [];
      let totalLoaded = 0;
      
      pageResults.forEach((result, index) => {
        if (result.data && result.data.length > 0) {
          allEmployees = allEmployees.concat(result.data);
          totalLoaded += result.data.length;
          console.log(`📊 Página ${result.page}: ${result.data.length} empleados (Total acumulado: ${totalLoaded})`);
        } else {
          console.warn(`⚠️ Página ${result.page}: Sin datos`);
        }
      });
      
      console.log('📊 CARGA COMPLETA - Empleados cargados:', allEmployees.length, 'de', realTotalCount, 'esperados');
      
      if (allEmployees.length > 0) {
          // Procesar y separar por género localmente
          let maleCount = 0;
          let femaleCount = 0;
          
          const processedEmployees = allEmployees.map(emp => {
            let gender = 'unknown';
            
            // CORREGIDO: Usar EXCLUSIVAMENTE la CURP para determinar género
            // Posición 11 (índice 10) en la CURP: H = Hombre, M = Mujer
            const curp = emp.curp || emp.CURP || emp.Curp;
            if (curp && curp.length >= 11) {
              const genderChar = curp.charAt(10).toUpperCase();
              if (genderChar === 'H') {
                gender = 'male';
                maleCount++;
              } else if (genderChar === 'M') {
                gender = 'female';
                femaleCount++;
              }
              console.log(`🔍 CURP ${curp}: Carácter género=${genderChar}, Resultado=${gender}`);
            } else {
              console.warn(`⚠️ Empleado sin CURP válida:`, emp.nombre || 'Sin nombre', 'CURP:', curp);
            }
            
            return {
              ...emp,
              gender,
              validForPyramid: gender !== 'unknown'
            };
          });
          
          const actualCount = allEmployees.length;
          
          // Ya no necesitamos extrapolación - tenemos TODOS los empleados
          console.log('📊 RESUMEN DE CARGA PAGINADA (DATOS COMPLETOS):');
          console.log('- TOTAL EMPLEADOS CARGADOS:', actualCount);
          console.log('- ESPERADOS:', realTotalCount);
          console.log('- Hombres reales:', maleCount, 'Mujeres reales:', femaleCount);
          console.log('✅ Demografico - Usando datos completos de todas las páginas');
          
          if (actualCount > 0) {
            console.log('👷 Demografico - Primer empleado (ejemplo):', allEmployees[0]);
          }
          
          // Pasar datos finales - SIN extrapolación
          const employeeData = {
            employees: processedEmployees,
            maleCount: maleCount,      // Conteos reales
            femaleCount: femaleCount,  // Conteos reales
            totalCount: actualCount    // Total real cargado
          };
          
          console.log('🚀 DATOS FINALES QUE SE PASAN A LOS COMPONENTES:');
          console.log('- employees.length:', employeeData.employees.length);
          console.log('- maleCount:', employeeData.maleCount);
          console.log('- femaleCount:', employeeData.femaleCount);
          console.log('- totalCount:', employeeData.totalCount);
          
          setActiveEmployees(employeeData);
      } else {
        console.error('❌ Demografico - No se cargaron empleados');
      }
      
    } catch (error) {
      console.error('Error loading active employees:', error);
    } finally {
      setLoading(false);
    }
  };

  // Efectos
  useEffect(() => {
    loadLatestPeriod();
  }, []);
  
  useEffect(() => {
    if (periodFilter !== null) {
      loadActiveEmployees();
    }
  }, [periodFilter]);

  const handleViewEmployee = (employee) => {
    console.log('Ver empleado:', employee);
    // TODO: Implementar vista de perfil de empleado
  };
  
  // Handler para cambios en los filtros demográficos - usando useCallback para evitar re-renders
  const handleFiltersChange = useCallback((filters) => {
    console.log('🔍 Demografico - Filtros cambiados:', filters);
    setDemographicFilters(prevFilters => {
      // Solo actualizar si hay cambios reales
      const hasChanged = JSON.stringify(prevFilters) !== JSON.stringify(filters);
      if (hasChanged) {
        console.log('✅ Demografico - Aplicando cambios de filtros:', { prevFilters, filters });
        return filters;
      }
      console.log('⏭️ Demografico - Sin cambios en filtros, saltando actualización');
      return prevFilters;
    });
  }, []);
  
  // El sistema de eventos centralizado maneja las selecciones automáticamente
  // Ya no necesitamos handlers manuales para las selecciones

  return (
    <ChartEventsProvider>
      <PageContainer>
        <PageHeader>
          <FaChartBar size={40} color="#1a365d" />
          <PageTitle>Dashboard Demográfico</PageTitle>
        </PageHeader>
      
      {/* Sistema de filtros demográficos */}
      <DemographicFilterSystem
        onFiltersChange={handleFiltersChange}
        periodFilter={periodFilter}
        disabled={loading}
        showActiveFilters={true}
      />

      <TablaDemografico 
        onViewEmployee={handleViewEmployee}
        title="Tabla Demográfica"
        filters={demographicFilters}
      />

      <ChartsContainer>
        <PopulationPyramid 
          title="Pirámide Poblacional por Edad y Género"
          minAge={15}
          maxAge={80}
          activeEmployees={activeEmployees?.employees || []}
          maleCount={activeEmployees?.maleCount || 0}
          femaleCount={activeEmployees?.femaleCount || 0}
          totalCount={activeEmployees?.totalCount || 0}
          filters={demographicFilters}
        />
        
        <PuestoSueldoGrafica
          title="Distribución por Puesto y Género"
          activeEmployees={activeEmployees?.employees || []}
          filters={demographicFilters}
          periodFilter={periodFilter}
        />
      </ChartsContainer>
      
      {/* Componente de datos interactivo - ancho completo y horizontal */}
      <InteractiveDataContainer>
        <InteractiveDataViewer 
          onViewEmployee={handleViewEmployee}
          filters={demographicFilters}
          periodFilter={periodFilter}
        />
      </InteractiveDataContainer>

      <SalaryAgePopulationPyramid
        title="Pirámide Poblacional por Rango Salarial y Edad"
        minAge={15}
        maxAge={80}
        filters={demographicFilters}
      />

      <AntiguedadPorSucursal
        title="Antigüedad por Sucursal"
        filters={demographicFilters}
      />

      {/* Aquí se agregarán más componentes de visualización paso a paso */}
      </PageContainer>
    </ChartEventsProvider>
  );
};

export default Demografico;

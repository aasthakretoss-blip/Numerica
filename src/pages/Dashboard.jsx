import React, { useState, useEffect } from 'react';
import styled, { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { FaCoins, FaCheck, FaChartBar, FaUsers } from 'react-icons/fa';
import { buildApiUrl } from '../config/apiConfig';
import { authenticatedFetch } from '../services/authenticatedFetch';
import { normalizePayrollStats } from '../utils/payrollStatsNormalizer';

const DashboardContainer = styled.div`
  padding: 2rem;
  color: ${props => props.theme?.text?.primary || 'white'};
  min-height: calc(100vh - 80px);
`;

const WelcomeSection = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.strong || 'blur(20px)'};
  border-radius: 20px;
  padding: 2.38rem 2rem;
  margin-bottom: 3rem;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.2)'};
  text-align: center;
`;

const WelcomeTitle = styled.h1`
  font-size: 2.8rem;
  font-weight: 700;
  margin: 0 0 0.79rem 0;
  letter-spacing: 1px;
  background: ${props => props.theme?.gradients?.text?.primary || 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const WelcomeSubtitle = styled.p`
  font-size: 1.3rem;
  opacity: 0.9;
  margin: 0;
  line-height: 1.6;
`;

const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
`;

const QuickActionCard = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.strong || 'blur(20px)'};
  border-radius: 20px;
  padding: 1.5rem;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.2)'};
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.2s ease'};
  cursor: pointer;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: ${props => props.theme?.effects?.shadows?.large || '0 10px 30px rgba(0, 0, 0, 0.3)'};
    background: ${props => props.theme?.surfaces?.glass?.strong || 'rgba(255, 255, 255, 0.2)'};
  }
`;

const CardIcon = styled.div`
  width: 60px;
  height: 60px;
  background: ${props => props.$gradient || 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)'};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  font-size: 1.75rem;
  color: white;
  transition: all 0.3s ease;
`;

const CardTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 500;
  margin: 0 0 0.5rem 0;
  color: ${props => props.theme?.brand?.primary || '#a8edea'};
  text-align: center;
`;

const CardDescription = styled.p`
  font-size: 0.9rem;
  opacity: 0.8;
  line-height: 1.4;
  text-align: center;
  margin: 0;
`;


const StatsSection = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.strong || 'blur(20px)'};
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.2)'};
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 2rem;
  font-weight: 300;
  margin: 0 0 2rem 0;
  color: ${props => props.theme?.brand?.primary || '#a8edea'};
  text-align: center;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
`;

const StatCard = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.light || 'rgba(255, 255, 255, 0.1)'};
  border: 1px solid ${props => props.theme?.surfaces?.borders?.subtle || 'rgba(255, 255, 255, 0.15)'};
  border-radius: 15px;
  padding: 2rem;
  text-align: center;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.2s ease'};
  
  &:hover {
    background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
    transform: translateY(-3px);
  }
`;

const StatValue = styled.div`
  font-size: 2.5rem;
  font-weight: 600;
  color: ${props => props.theme?.brand?.primary || '#a8edea'};
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 1rem;
  opacity: 0.8;
`;


const Dashboard = ({ userPermissions = {}, user }) => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  // Estados para las estadísticas
  const [stats, setStats] = useState({
    empleadosActivos: '---',
    ultimoPeriodo: '---',
    camposNominas: '---',
    camposFondos: '---'
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  
  // Cargar estadísticas al montar el componente
  useEffect(() => {
    loadDashboardStats();
    loadUserProfile();
  }, []);
  
  // Cargar perfil del usuario
  const loadUserProfile = async () => {
    if (user?.attributes?.email) {
      try {
        const response = await authenticatedFetch(
          buildApiUrl('/api/user/profile')
        );
        
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data.user);
        }
      } catch (error) {
        console.error('❌ [Dashboard] Error cargando perfil:', error);
      }
    }
  };
  
  // Obtener nombre para mostrar
  const getUserDisplayName = () => {
    if (userProfile?.firstName) {
      return userProfile.firstName;
    }
    return user?.attributes?.email?.split('@')[0] || 'Usuario';
  };
  
  const loadDashboardStats = async () => {
    const startTime = performance.now();
    try {
      setLoadingStats(true);
      const apiUrl = buildApiUrl('/api/payroll/stats');
      
      console.log('📡 [Dashboard] Iniciando carga de estadísticas');
      console.log('   Endpoint:', apiUrl);
      console.log('   Timestamp:', new Date().toISOString());
      
      const response = await authenticatedFetch(apiUrl);
      const fetchTime = (performance.now() - startTime).toFixed(2);
      
      console.log(`✓ [Dashboard] Respuesta recibida (${fetchTime}ms)`);
      console.log('   Status:', response.status);
      console.log('   OK:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Normalize the response to old format (pass API URL for logging)
      const normalizedResult = normalizePayrollStats(result, apiUrl);
      
      // DEBUG: Ver la estructura exacta de la respuesta
      console.log('🔍 [Dashboard DEBUG] Estructura completa de result:', JSON.stringify(result, null, 2));
      console.log('🔍 [Dashboard DEBUG] Normalized result:', JSON.stringify(normalizedResult, null, 2));
      
      // Validar estructura de respuesta
      if (!normalizedResult.success) {
        throw new Error('Response.success === false');
      }
      
      // Use normalized data (always in old format)
      const innerStats = normalizedResult.data || {};
      console.log('🔍 [Dashboard DEBUG] innerStats (normalized):', innerStats);
      
      // Validar que existan los campos requeridos
      const requiredFields = ['totalRecords', 'uniqueEmployees', 'latestPeriod'];
      const missingFields = requiredFields.filter(field => !(field in innerStats));
      
      if (missingFields.length > 0) {
        console.warn(`⚠️ [Dashboard] Campos faltantes en respuesta:`, missingFields);
      }
      
      console.log('📊 [Dashboard] Estadísticas recibidas:');
      console.log(`   • Empleados activos: ${innerStats.activeEmployees || innerStats.uniqueEmployees}`);
      console.log(`   • Total empleados histórico: ${innerStats.uniqueEmployees}`);
      console.log(`   • Total nóminas: ${innerStats.totalRecords?.toLocaleString()}`);
      console.log(`   • Total fondos: ${innerStats.totalFondosRecords?.toLocaleString()}`);
      console.log(`   • Período: ${innerStats.earliestPeriod} → ${innerStats.latestPeriod}`);
      
      // Formatear la fecha del último período
      let formattedPeriod = '---';
      const periodToUse = innerStats.latestPeriod || innerStats.earliestPeriod;
      
      if (periodToUse) {
        try {
          const dateStr = periodToUse.toString();
          formattedPeriod = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        } catch (e) {
          console.error('❌ [Dashboard] Error formateando período:', e);
          formattedPeriod = periodToUse;
        }
      }
      
      // Usar activeEmployees si existe (empleados del último mes con estado "A")
      // Si no, usar uniqueEmployees como fallback, y si no totalEmployees
      const empleadosActivos = innerStats.activeEmployees || innerStats.uniqueEmployees;
      
      // Para "Campos en Histórico Nóminas": totalRecords es preferido, pero totalEmployees es aceptable
      const camposNominas = innerStats.totalRecords ;
      
      // Para fondos, buscar en múltiples posibles nombres de campo
      const camposFondos = innerStats.totalFondosRecords || 
                          innerStats.totalFondos || 
                          innerStats.fondosRecords || 
                          '---';
      
      const newStats = {
        empleadosActivos: empleadosActivos?.toLocaleString('es-MX') || '---',
        ultimoPeriodo: formattedPeriod,
        camposNominas: camposNominas?.toLocaleString('es-MX') || '---',
        camposFondos: camposFondos !== '---' ? camposFondos.toLocaleString('es-MX') : '---'
      };
      
      setStats(newStats);
      
      const totalTime = (performance.now() - startTime).toFixed(2);
      console.log(`✅ [Dashboard] Carga completada (${totalTime}ms)`);
      console.log('   Estado actualizado:', newStats);
      
    } catch (error) {
      const totalTime = (performance.now() - startTime).toFixed(2);
      console.error(`❌ [Dashboard] Error al cargar estadísticas (${totalTime}ms):`);
      console.error('   Tipo:', error.name);
      console.error('   Mensaje:', error.message);
      console.error('   Stack:', error.stack);
      
      // Fallback values
      setStats({
        empleadosActivos: 'Error',
        ultimoPeriodo: 'Error',
        camposNominas: 'Error',
        camposFondos: 'Error'
      });
    } finally {
      setLoadingStats(false);
    }
  };
  
  const quickActions = [
    {
      title: 'Búsqueda de Empleados',
      description: 'Histórico nóminas',
      icon: FaUsers,
      path: '/busqueda-empleados',
      gradient: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)'
    },
    {
      title: 'Análisis Demográfico',
      description: 'Visualiza estadísticas y tendencias demográficas',
      icon: FaChartBar,
      path: '/demografico',
      gradient: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)'
    },
    {
      title: 'FPL',
      description: 'Fondo de Productividad Laboral',
      icon: FaCheck,
      path: '/fpl',
      gradient: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)'
    },
    {
      title: 'Simulador de Créditos',
      description: 'Calcula cuotas, intereses y cronogramas de pago.',
      icon: FaCoins,
      path: '/simulador-creditos',
      gradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)'
    }
  ];


  const handleActionClick = (path) => {
    navigate(path);
  };

  return (
    <StyledThemeProvider theme={theme}>
      <DashboardContainer>
        <WelcomeSection>
          <WelcomeTitle>Numerica</WelcomeTitle>
          <WelcomeSubtitle>
            Información en acción
          </WelcomeSubtitle>
        </WelcomeSection>

        <QuickActionsGrid>
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <QuickActionCard key={index} onClick={() => handleActionClick(action.path)}>
                <CardIcon $gradient={action.gradient}>
                  <Icon />
                </CardIcon>
                <CardTitle>{action.title}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </QuickActionCard>
            );
          })}
        </QuickActionsGrid>

        <StatsSection>
          <StatsGrid>
            <StatCard>
              <StatValue>{stats.empleadosActivos}</StatValue>
              <StatLabel>Empleados Activos</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{stats.ultimoPeriodo}</StatValue>
              <StatLabel>Último Período Cargado</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{stats.camposNominas}</StatValue>
              <StatLabel>Campos en Histórico Nóminas</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{stats.camposFondos}</StatValue>
              <StatLabel>Campos en Histórico Fondos</StatLabel>
            </StatCard>
          </StatsGrid>
        </StatsSection>
      </DashboardContainer>
    </StyledThemeProvider>
  );
};

export default Dashboard;

import React, { useState } from 'react';
import styled, { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';
import { FaHome, FaTachometerAlt, FaChartLine, FaUsers } from 'react-icons/fa';

const DashboardContainer = styled.div`
  padding: 2rem;
  color: ${props => props.theme?.text?.primary || 'white'};
  min-height: calc(100vh - 80px);
`;

const WelcomeSection = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.strong || 'blur(20px)'};
  border-radius: 20px;
  padding: 3rem 2rem;
  margin-bottom: 3rem;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.2)'};
  text-align: center;
`;

const WelcomeTitle = styled.h1`
  font-size: 2.8rem;
  font-weight: 300;
  margin: 0 0 1rem 0;
  letter-spacing: 1px;
  background: ${props => props.theme?.gradients?.text?.primary || 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const WelcomeSubtitle = styled.p`
  font-size: 1.3rem;
  opacity: 0.9;
  margin: 0 0 2rem 0;
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
  padding: 2rem;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.2)'};
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.2s ease'};
  cursor: pointer;
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: ${props => props.theme?.effects?.shadows?.large || '0 10px 30px rgba(0, 0, 0, 0.3)'};
    background: ${props => props.theme?.surfaces?.glass?.strong || 'rgba(255, 255, 255, 0.2)'};
  }
`;

const CardIcon = styled.div`
  width: 70px;
  height: 70px;
  background: ${props => props.$gradient || 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)'};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  font-size: 2rem;
    color: '#2c3e50'
  transition: all 0.3s ease;
`;

const CardTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 500;
  margin: 0 0 1rem 0;
  color: ${props => props.theme?.brand?.primary || '#a8edea'};
  text-align: center;
`;

const CardDescription = styled.p`
  font-size: 1rem;
  opacity: 0.8;
  line-height: 1.5;
  text-align: center;
  margin: 0 0 1.5rem 0;
`;

const CardButton = styled.button`
  width: 100%;
  background: transparent;
  border: 2px solid ${props => props.theme?.surfaces?.borders?.accent || 'rgba(168, 237, 234, 0.5)'};
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  color: ${props => props.theme?.brand?.primary || '#a8edea'};
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.2s ease'};
  
  &:hover {
    background: ${props => props.theme?.surfaces?.borders?.accent || 'rgba(168, 237, 234, 0.3)'};
    border-color: ${props => props.theme?.brand?.primary || '#a8edea'};
    transform: translateY(-2px);
  }
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

const RecentActivity = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.strong || 'blur(20px)'};
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.2)'};
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ActivityItem = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.light || 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.2s ease'};
  
  &:hover {
    background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  }
`;

const ActivityIcon = styled.div`
  width: 40px;
  height: 40px;
  background: ${props => props.color || '#667eea'};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1rem;
`;

const ActivityContent = styled.div`
  flex: 1;
`;

const ActivityTitle = styled.div`
  font-weight: 500;
  margin-bottom: 0.25rem;
`;

const ActivityTime = styled.div`
  font-size: 0.8rem;
  opacity: 0.6;
`;

const Dashboard = ({ userPermissions = {}, user }) => {
  const { theme } = useTheme();
  
  const quickActions = [
    {
      title: 'Búsqueda de Empleados',
      description: 'Histórico nóminas',
      icon: FaUsers,
      path: '/busqueda-empleados',
      gradient: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)'
    },
    {
      title: 'Análisis Demográfico',
      description: 'Visualiza estadísticas y tendencias demográficas',
      icon: FaChartLine,
      path: '/demografico',
      gradient: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)'
    },
    {
      title: 'FPL',
      description: 'Fondo de Productividad Laboral',
      icon: FaTachometerAlt,
      path: '/fpl',
      gradient: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)'
    },
    {
      title: 'Simulador de Créditos',
      description: 'Calcula cuotas, intereses y cronogramas de pago.',
      icon: FaHome,
      path: '/simulador-creditos',
      gradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)'
    }
  ];

  const recentActivities = [
    {
      title: 'Nueva búsqueda de empleados',
      time: 'Hace 5 minutos',
      icon: FaUsers,
        color: '#1e3a8a'
    },
    {
      title: 'Reporte demográfico generado',
      time: 'Hace 15 minutos',
      icon: FaChartLine,
      color: '#2ecc71'
    },
    {
      title: 'Simulación de crédito completada',
      time: 'Hace 1 hora',
      icon: FaHome,
      color: '#e74c3c'
    }
  ];

  const handleActionClick = (path) => {
    window.location.hash = `#${path}`;
    alert(`Navegando a ${path}...`);
  };

  return (
    <StyledThemeProvider theme={theme}>
      <DashboardContainer>
        <WelcomeSection>
          <WelcomeTitle>Numerica</WelcomeTitle>
          <WelcomeSubtitle>
            {user ? `Bienvenido de vuelta, ${user?.attributes?.email || user?.signInDetails?.loginId || 'Usuario'}` : 'Bienvenido al sistema Numerica'}
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
                <CardButton>Acceder</CardButton>
              </QuickActionCard>
            );
          })}
        </QuickActionsGrid>

        <StatsSection>
          <SectionTitle>Estadísticas del Sistema</SectionTitle>
          <StatsGrid>
            <StatCard>
              <StatValue>1,247</StatValue>
              <StatLabel>Empleados Registrados</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>156</StatValue>
              <StatLabel>Consultas Hoy</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>98.5%</StatValue>
              <StatLabel>Disponibilidad del Sistema</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>23</StatValue>
              <StatLabel>Simulaciones Activas</StatLabel>
            </StatCard>
          </StatsGrid>
        </StatsSection>

        <RecentActivity>
          <SectionTitle>Actividad Reciente</SectionTitle>
          <ActivityList>
            {recentActivities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <ActivityItem key={index}>
                  <ActivityIcon color={activity.color}>
                    <Icon />
                  </ActivityIcon>
                  <ActivityContent>
                    <ActivityTitle>{activity.title}</ActivityTitle>
                    <ActivityTime>{activity.time}</ActivityTime>
                  </ActivityContent>
                </ActivityItem>
              );
            })}
          </ActivityList>
        </RecentActivity>
      </DashboardContainer>
    </StyledThemeProvider>
  );
};

export default Dashboard;

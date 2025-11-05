import React from 'react';
import styled, { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';

const HomeContainer = styled.div`
  text-align: center;
  color: ${props => props.theme?.text?.primary || 'white'};
`;

const WelcomeCard = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.medium || 'blur(15px)'};
  padding: 2rem;
  border-radius: 20px;
  box-shadow: ${props => props.theme?.effects?.shadows?.large || '0 10px 30px rgba(0, 0, 0, 0.3)'};
  margin: 2rem 0;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.2)'};
`;

const Title = styled.h2`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  font-weight: 300;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  opacity: 0.9;
  line-height: 1.6;
  margin-bottom: 2rem;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
`;

const FeatureCard = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.light || 'rgba(255, 255, 255, 0.1)'};
  padding: 1.5rem;
  border-radius: 15px;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.subtle || 'rgba(255, 255, 255, 0.15)'};
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.2s ease'};
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${props => props.theme?.effects?.shadows?.large || '0 10px 30px rgba(0, 0, 0, 0.3)'};
    background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  }
`;

const FeatureTitle = styled.h3`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: ${props => props.theme?.brand?.primary || '#a8edea'};
`;

const FeatureDescription = styled.p`
  opacity: 0.8;
  line-height: 1.5;
`;

const ActionButton = styled.button`
  background: ${props => props.disabled ? 
    (props.theme?.surfaces?.buttons?.disabled || 'rgba(100, 100, 100, 0.5)') : 
    (props.theme?.gradients?.buttons?.primary || 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100)')};
  border: none;
  border-radius: 25px;
  padding: 0.75rem 1.5rem;
  color: ${props => props.theme?.text?.primary || 'white'};
  font-size: 0.9rem;
  font-weight: 500;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.2s ease'};
  margin-top: 1rem;
  opacity: ${props => props.disabled ? 0.6 : 1};
  
  &:hover {
    transform: ${props => props.disabled ? 'none' : 'translateY(-2px)'};
    box-shadow: ${props => props.disabled ? 'none' : (props.theme?.effects?.shadows?.medium || '0 5px 15px rgba(0, 0, 0, 0.2)')};
  }
`;

const Home = ({ userPermissions = {}, user }) => {
  const { theme } = useTheme();
  
  const handleUploadClick = () => {
    if (userPermissions.canUpload) {
      alert('🚀 Iniciando proceso de subida de archivos...');
    } else {
      alert('❌ No tienes permisos para subir archivos.');
    }
  };

  const handleFundsClick = () => {
    if (userPermissions.canViewFunds) {
      alert('💰 Mostrando información de fondos...');
    } else {
      alert('❌ No tienes permisos para ver la información de fondos.');
    }
  };

  return (
    <StyledThemeProvider theme={theme}>
      <HomeContainer>
        <WelcomeCard>
          <Title>Bienvenido a Numerica</Title>
          <Subtitle>
            {user ? `Hola ${user?.attributes?.email || user?.signInDetails?.loginId || 'Usuario'}, ` : ''}Selecciona alguna de las opciones de visualización
          </Subtitle>
          
          {userPermissions && (
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <ActionButton
                onClick={handleUploadClick}
                disabled={!userPermissions.canUpload}
              >
                {userPermissions.canUpload ? '📤 Subir Archivos' : '🔒 Subir Archivos (Sin Acceso)'}
              </ActionButton>
              
              <ActionButton 
                onClick={handleFundsClick}
                disabled={!userPermissions.canViewFunds}
              >
                {userPermissions.canViewFunds ? '💰 Ver Fondos' : '🔒 Ver Fondos (Sin Acceso)'}
              </ActionButton>
            </div>
          )}
        </WelcomeCard>

        <FeatureGrid>
          <FeatureCard>
            <FeatureTitle>Análisis de Datos</FeatureTitle>
            <FeatureDescription>
              Procesa y analiza grandes volúmenes de datos numéricos
              con herramientas avanzadas de estadística.
            </FeatureDescription>
            {userPermissions.role === 'admin' && (
              <ActionButton onClick={() => alert('🔧 Accediendo a herramientas de administrador...')}>
                ⚙️ Panel de Administrador
              </ActionButton>
            )}
          </FeatureCard>

          <FeatureCard>
            <FeatureTitle>Visualización</FeatureTitle>
            <FeatureDescription>
              Crea gráficos interactivos y dashboards personalizados
              para visualizar tus datos de manera efectiva.
            </FeatureDescription>
            <ActionButton onClick={() => alert('📊 Abriendo herramientas de visualización...')}>
              📊 Crear Gráfico
            </ActionButton>
          </FeatureCard>

          <FeatureCard>
            <FeatureTitle>Automatización</FeatureTitle>
            <FeatureDescription>
              Automatiza procesos de cálculo y generación de reportes
              para optimizar tu flujo de trabajo.
            </FeatureDescription>
            <ActionButton onClick={() => alert('🤖 Configurando automatización...')}>
              🤖 Automatizar
            </ActionButton>
          </FeatureCard>
        </FeatureGrid>
      </HomeContainer>
    </StyledThemeProvider>
  );
};

export default Home;

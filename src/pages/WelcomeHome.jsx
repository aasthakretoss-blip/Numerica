import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';

const HomeContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme?.gradients?.background?.primary || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const ContentCard = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.strong || 'blur(20px)'};
  border-radius: 30px;
  padding: 4rem 3rem;
  text-align: center;
  max-width: 600px;
  width: 100%;
  box-shadow: ${props => props.theme?.effects?.shadows?.large || '0 10px 30px rgba(0, 0, 0, 0.3)'};
  border: 1px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.2)'};
`;

const Logo = styled.h1`
  font-size: 4rem;
  font-weight: 300;
  margin: 0 0 1rem 0;
  letter-spacing: 3px;
  background: ${props => props.theme?.gradients?.text?.primary || 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-transform: uppercase;
`;

const Tagline = styled.p`
  font-size: 1.3rem;
  color: ${props => props.theme?.text?.primary || 'white'};
  margin: 0 0 1rem 0;
  font-weight: 300;
  line-height: 1.6;
  opacity: 0.9;
`;

const Description = styled.p`
  font-size: 1rem;
  color: ${props => props.theme?.text?.secondary || 'rgba(255, 255, 255, 0.8)'};
  margin: 0 0 3rem 0;
  line-height: 1.8;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  flex-wrap: wrap;
`;

const PrimaryButton = styled.button`
  background: ${props => props.theme?.gradients?.buttons?.primary || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  border: none;
  border-radius: 25px;
  padding: 1rem 2.5rem;
  color: ${props => props.theme?.text?.primary || 'white'};
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.2s ease'};
  letter-spacing: 0.5px;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: ${props => props.theme?.effects?.shadows?.large || '0 10px 30px rgba(0, 0, 0, 0.3)'};
  }
  
  &:active {
    transform: translateY(-1px);
  }
`;

const SecondaryButton = styled.button`
  background: transparent;
  border: 2px solid ${props => props.theme?.surfaces?.borders?.accent || 'rgba(168, 237, 234, 0.5)'};
  border-radius: 25px;
  padding: 1rem 2.5rem;
  color: ${props => props.theme?.text?.primary || 'white'};
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.2s ease'};
  letter-spacing: 0.5px;
  opacity: 0.9;
  
  &:hover {
    background: ${props => props.theme?.surfaces?.glass?.light || 'rgba(255, 255, 255, 0.1)'};
    border-color: ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.3)'};
    transform: translateY(-3px);
    opacity: 1;
  }
  
  &:active {
    transform: translateY(-1px);
  }
`;

const FeatureList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.2)'};
`;

const Feature = styled.div`
  text-align: center;
  padding: 1rem;
`;

const FeatureIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 1rem;
`;

const FeatureTitle = styled.h3`
  font-size: 1.1rem;
  color: ${props => props.theme?.brand?.primary || '#a8edea'};
  margin: 0 0 0.5rem 0;
  font-weight: 500;
`;

const FeatureDescription = styled.p`
  font-size: 0.9rem;
  color: ${props => props.theme?.text?.secondary || 'rgba(255, 255, 255, 0.8)'};
  margin: 0;
  line-height: 1.5;
`;

const WelcomeHome = () => {
  const { theme } = useTheme(); // Obtener el theme del contexto
  const navigate = useNavigate();

  const handleGetStarted = () => {
    // Navegar directamente a la página de autenticación de AWS Amplify
    // En este caso, como usa Amplify Authenticator, simplemente navegamos y 
    // el sistema detectará que no hay usuario autenticado
    window.location.reload();
  };

  const handleLearnMore = () => {
    alert('Información adicional sobre Numerica...');
  };

  return (
    <StyledThemeProvider theme={theme}>
      <HomeContainer>
        <ContentCard>
          <Logo>Numerica</Logo>
          <Tagline>Sistema de Gestión Empresarial Avanzado</Tagline>
          <Description>
            Optimiza la gestión de tu empresa con herramientas inteligentes para análisis de datos,
            gestión de personal, simulaciones financieras y mucho más.
          </Description>
          
          <ButtonContainer>
            <PrimaryButton onClick={handleGetStarted}>
              Iniciar Sesión
            </PrimaryButton>
            <SecondaryButton onClick={handleLearnMore}>
              Más Información
            </SecondaryButton>
          </ButtonContainer>

          <FeatureList>
            <Feature>
              <FeatureIcon>🔍</FeatureIcon>
              <FeatureTitle>Búsqueda Inteligente</FeatureTitle>
              <FeatureDescription>
                Encuentra información de empleados de manera rápida y eficiente
              </FeatureDescription>
            </Feature>
            
            <Feature>
              <FeatureIcon>📊</FeatureIcon>
              <FeatureTitle>Análisis Demográfico</FeatureTitle>
              <FeatureDescription>
                Visualiza tendencias y estadísticas detalladas de tu organización
              </FeatureDescription>
            </Feature>
            
            <Feature>
              <FeatureIcon>💰</FeatureIcon>
              <FeatureTitle>Simulador Financiero</FeatureTitle>
              <FeatureDescription>
                Calcula créditos y proyecciones financieras con precisión
              </FeatureDescription>
            </Feature>
          </FeatureList>
        </ContentCard>
      </HomeContainer>
    </StyledThemeProvider>
  );
};

export default WelcomeHome;

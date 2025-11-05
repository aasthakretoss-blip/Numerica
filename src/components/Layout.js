import React from 'react';
import styled, { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';

const LayoutContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme?.gradients?.background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
`;

const Header = styled.header`
  background: #1e3a8a;
  padding: 1rem 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const HeaderTitle = styled.h1`
  color: white;
  margin: 0;
  font-size: 2rem;
  font-weight: 300;
  letter-spacing: 2px;
  text-align: center;
`;

const Main = styled.main`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Layout = ({ children, title = "Numerica" }) => {
  const { theme } = useTheme();
  
  return (
    <StyledThemeProvider theme={theme}>
      <LayoutContainer>
        <Header>
          <HeaderTitle>{title}</HeaderTitle>
        </Header>
        <Main>
          {children}
        </Main>
      </LayoutContainer>
    </StyledThemeProvider>
  );
};

export default Layout;

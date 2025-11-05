import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled, { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';
import { surfaces, textColors, effects, brandColors } from '../styles/ColorTokens';
import { 
  FaSearch, 
  FaChartBar, 
  FaCheck, 
  FaCoins,
  FaChevronRight,
  FaChevronLeft,
  FaUpload
} from 'react-icons/fa';

const SidebarContainer = styled.div`
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: ${props => props.$isExpanded ? '250px' : '70px'};
  background: ${brandColors.primary};
  border-right: 1px solid ${surfaces.borders.light};
  transition: ${effects.states.transition};
  z-index: 1000;
  display: flex;
  flex-direction: column;
  box-shadow: ${effects.shadows.large};

  &:hover {
    width: 250px;
  }

  @media (max-width: 768px) {
    width: ${props => props.$isMobileOpen ? '100%' : '0'};
    overflow: hidden;
  }
`;

const SidebarHeader = styled.div`
  padding: 1.5rem 1rem;
  border-bottom: 1px solid ${surfaces.borders.light};
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${surfaces.glass.subtle};
  }
`;

const Logo = styled.div`
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  letter-spacing: 1px;
  opacity: ${props => props.$show ? 1 : 0};
  transform: translateX(${props => props.$show ? '0' : '20px'});
  transition: all 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
`;

const MenuList = styled.ul`
  list-style: none;
  padding: 1rem 0;
  margin: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const MenuItem = styled.li`
  margin: 0;
`;

const MenuLink = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem 1.25rem;
  color: ${props => props.$isActive ? 'white' : surfaces.glass.medium};
  text-decoration: none;
  cursor: pointer;
  transition: ${effects.states.transitionFast};
  position: relative;
  background: ${props => props.$isActive ? surfaces.glass.subtle : 'transparent'};
  
  &:hover {
    color: white;
    background: ${surfaces.glass.subtle};
    transform: ${effects.states.hoverTransform};
  }
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: ${props => props.$isActive ? 'white' : 'transparent'};
    transition: all 0.2s ease;
  }
  
  &:hover::before {
    background: white;
  }
`;

const IconWrapper = styled.div`
  font-size: 1.2rem;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: ${props => props.$showText ? '1rem' : '0'};
`;

const MenuText = styled.span`
  font-size: 0.95rem;
  font-weight: 500;
  opacity: ${props => props.$show ? 1 : 0};
  transform: translateX(${props => props.$show ? '0' : '20px'});
  transition: all 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
`;

const BottomMenuItem = styled(MenuItem)`
  margin-top: auto;
  border-top: 1px solid ${surfaces.borders.light};
  padding-top: 1rem;
`;

const ToggleButton = styled.button`
  position: absolute;
  right: -15px;
  top: 50%;
  transform: translateY(-50%);
  background: ${surfaces.glass.strong};
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  color: ${brandColors.primary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: ${effects.states.transitionFast};
  z-index: 1001;
  box-shadow: ${effects.shadows.medium};

  &:hover {
    background: white;
    transform: translateY(-50%) scale(1.1);
    box-shadow: ${effects.shadows.intense};
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const MobileToggle = styled.button`
  display: none;
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 1002;
  background: ${brandColors.primary};
  border: none;
  border-radius: 50%;
  width: 45px;
  height: 45px;
  color: white;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  box-shadow: ${effects.shadows.medium};
  transition: ${effects.states.transitionFast};

  &:hover {
    background: ${brandColors.primaryDark};
    transform: scale(1.1);
  }

  @media (max-width: 768px) {
    display: flex;
  }
`;

const Overlay = styled.div`
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;

  @media (max-width: 768px) {
    display: ${props => props.$show ? 'block' : 'none'};
  }
`;

const Sidebar = ({ isExpanded, onToggle, isMobile = false }) => {
  const { theme } = useTheme(); // Obtener el theme del contexto
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Debug: Verificar el estado del theme
  React.useEffect(() => {
    console.log('🎨 Theme Debug en Sidebar:', {
      hasTheme: !!theme,
      surfaces: theme?.surfaces,
      brand: theme?.brand,
      text: theme?.text,
      effects: theme?.effects
    });
  }, [theme]);

  const menuItems = [
    { 
      path: '/busqueda-empleados', 
      label: 'Búsqueda de empleados', 
      icon: FaSearch 
    },
    { 
      path: '/demografico', 
      label: 'Demográfico', 
      icon: FaChartBar 
    },
    { 
      path: '/fpl', 
      label: 'FPL', 
      icon: FaCheck 
    },
    { 
      path: '/simulador-creditos', 
      label: 'Simulador de créditos', 
      icon: FaCoins 
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setIsMobileOpen(false);
    }
  };

  const handleLogoClick = () => {
    navigate('/');
    if (isMobile) {
      setIsMobileOpen(false);
    }
  };

  const showText = isExpanded || isHovered || isMobileOpen;

  return (
    <StyledThemeProvider theme={theme}>
      <MobileToggle onClick={() => setIsMobileOpen(!isMobileOpen)}>
        <FaChevronRight />
      </MobileToggle>

      <Overlay $show={isMobileOpen} onClick={() => setIsMobileOpen(false)} />

      <SidebarContainer
        $isExpanded={isExpanded || isHovered}
        $isMobileOpen={isMobileOpen}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <SidebarHeader onClick={handleLogoClick}>
          <Logo $show={showText}>Numerica</Logo>
        </SidebarHeader>

        <MenuList>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <MenuItem key={item.path}>
                <MenuLink
                  onClick={() => handleNavigation(item.path)}
                  $isActive={isActive}
                >
                  <IconWrapper $showText={showText}>
                    <Icon />
                  </IconWrapper>
                  <MenuText $show={showText}>
                    {item.label}
                  </MenuText>
                </MenuLink>
              </MenuItem>
            );
          })}
          
          {/* Opción de Subir al final */}
          <BottomMenuItem key="/subir">
            <MenuLink
              onClick={() => handleNavigation('/subir')}
              $isActive={location.pathname === '/subir'}
            >
              <IconWrapper $showText={showText}>
                <FaUpload />
              </IconWrapper>
              <MenuText $show={showText}>
                Subir
              </MenuText>
            </MenuLink>
          </BottomMenuItem>
        </MenuList>

        <ToggleButton onClick={onToggle}>
          {isExpanded ? <FaChevronLeft /> : <FaChevronRight />}
        </ToggleButton>
      </SidebarContainer>
    </StyledThemeProvider>
  );
};

export default Sidebar;

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from '@aws-amplify/auth';
import styled, { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';
import { buildApiUrl } from '../config/apiConfig';
import Sidebar from './Sidebar';

const LayoutContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme?.gradients?.backgrounds?.primary || 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)'};
  display: flex;
  position: relative;
`;

const MainContent = styled.div`
  flex: 1;
  margin-left: ${props => props.$sidebarExpanded ? '250px' : '70px'};
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 100vh;
  position: relative;

  @media (max-width: 768px) {
    margin-left: 0;
  }
`;

const Header = styled.header`
  background: ${props => props.theme?.brand?.primary || '#1a365d'};
  padding: 1rem 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
`;

const HeaderTitle = styled.h1`
  color: white;
  margin: 0;
  font-size: 1.8rem;
  font-weight: 300;
  letter-spacing: 1px;

  @media (max-width: 768px) {
    font-size: 1.4rem;
    margin-left: 3rem;
  }
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.4);
  }

  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    gap: 0.5rem;
  }
`;

const UserAvatar = styled.div`
  width: 35px;
  height: 35px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
  }
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;

  @media (max-width: 768px) {
    display: none;
  }
`;

const UserName = styled.span`
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1;
`;

const UserRole = styled.span`
  font-size: 0.75rem;
  opacity: 0.8;
  line-height: 1;
`;

const ContentArea = styled.main`
  flex: 1;
  position: relative;
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: ${props => props.$show ? 'block' : 'none'};

  @media (min-width: 769px) {
    display: none;
  }
`;

// Dropdown components
const UserDropdownContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const UserSectionClickable = styled(UserSection)`
  cursor: pointer;
  position: relative;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-1px);
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.1);
  min-width: 200px;
  z-index: 1000;
  overflow: hidden;
  opacity: ${props => props.$show ? '1' : '0'};
  visibility: ${props => props.$show ? 'visible' : 'hidden'};
  transform: ${props => props.$show ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)'};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(20px);
  
  &::before {
    content: '';
    position: absolute;
    top: -6px;
    right: 20px;
    width: 12px;
    height: 12px;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-bottom: none;
    border-right: none;
    transform: rotate(45deg);
  }
`;

const DropdownItem = styled.div`
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #2c3e50;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: #f8f9fa;
    color: #1a365d;
    transform: translateX(4px);
  }
  
  &.logout-item {
    color: #e53e3e;
    
    &:hover {
      background: #fed7d7;
      color: #c53030;
    }
  }
`;

const DropdownIcon = styled.span`
  font-size: 1.1rem;
  width: 20px;
  text-align: center;
`;

const DropdownText = styled.span`
  flex: 1;
`;

const ChevronIcon = styled.span`
  margin-left: 8px;
  font-size: 0.8rem;
  transition: transform 0.2s ease;
  transform: ${props => props.$open ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

// Notification banner for unverified email
const VerificationBanner = styled.div`
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
  padding: 0.75rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.9rem;
  font-weight: 500;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: #dc2626;
  }
`;

const BannerContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const BannerIcon = styled.span`
  font-size: 1.2rem;
`;

const BannerActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const BannerButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-1px);
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const LayoutWithSidebar = ({ children, user, userPermissions = {} }) => {
  const { theme } = useTheme(); // Obtener el theme del contexto
  const { signOut } = useAuthenticator();
  const navigate = useNavigate();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [emailVerified, setEmailVerified] = useState(true); // Por defecto true para evitar parpadeo
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  const [userProfile, setUserProfile] = useState(null); // Datos del perfil del usuario
  const location = useLocation();
  const dropdownRef = useRef(null);
  
  // Verificar el estado de verificación de email y obtener datos del perfil
  useEffect(() => {
    const checkEmailVerification = async () => {
      if (user) {
        try {
          const session = await fetchAuthSession();
          const cognitoIdToken = session?.tokens?.idToken?.payload;
          const isEmailVerified = cognitoIdToken?.email_verified === true;
          
          setEmailVerified(isEmailVerified);
          
          // Mostrar banner solo si no está verificado
          if (!isEmailVerified) {
            setTimeout(() => {
              setShowVerificationBanner(true);
            }, 2000); // Esperar 2 segundos antes de mostrar
          }
          
        } catch (error) {
          console.error('Error verificando estado del email:', error);
          setEmailVerified(true); // Asumir verificado en caso de error
        }
      }
    };

    checkEmailVerification();
  }, [user]);

  // Obtener datos del perfil del usuario
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user?.attributes?.email) {
        try {
          console.log('🔄 Cargando perfil del usuario para header:', user.attributes.email);
          
          const response = await fetch(buildApiUrl('/api/user/profile'), {
            headers: {
              'x-user-email': user.attributes.email || user.username || 'alberto.ochoaf@gmail.com'
            }
          });

          if (response.ok) {
            const data = await response.json();
            setUserProfile(data.user);
            console.log('✅ Perfil del usuario cargado en header:', data.user);
            console.log('🆕 Header data update:', {
              firstName: data.user?.firstName,
              lastName: data.user?.lastName,
              email: data.user?.email,
              fullDisplayName: `${data.user?.firstName} ${data.user?.lastName}`,
              initials: data.user?.firstName && data.user?.lastName ? 
                `${data.user.firstName.charAt(0)}${data.user.lastName.charAt(0)}`.toUpperCase() : 'fallback'
            });
          } else {
            console.log('⚠️ No se pudo cargar el perfil del usuario para el header');
            console.log('🗝 Response status:', response.status);
            console.log('🗝 Response text:', await response.text());
          }
        } catch (error) {
          console.error('❌ Error cargando perfil del usuario:', error);
        }
      }
    };

    loadUserProfile();
  }, [user]);

  // Debug: Verificar el estado del theme
  React.useEffect(() => {
    console.log('🎨 Theme Debug en LayoutWithSidebar:', {
      hasTheme: !!theme,
      gradients: theme?.gradients,
      surfaces: theme?.surfaces,
      text: theme?.text,
      effects: theme?.effects
    });
    
    if (!theme || !theme.surfaces) {
      console.warn('⚠️ ADVERTENCIA: Theme está undefined o incompleto en LayoutWithSidebar!', theme);
    }
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarExpanded(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return 'Panel de Control';
      case '/busqueda-empleados':
        return 'Búsqueda de Empleados';
      case '/demografico':
        return 'Análisis Demográfico';
      case '/fpl':
        return 'FPL';
      case '/simulador-creditos':
        return 'Simulador de Créditos';
      case '/subir':
        return 'Subir';
      case '/profile':
        return 'Mi Perfil';
      case '/':
        return 'Dashboard';
      default:
        return 'Numerica';
    }
  };

  const getUserInitials = (email, firstName, lastName) => {
    // Si tenemos nombre y apellido del perfil, usarlos
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    
    // Fallback al email
    if (!email) return 'U';
    return email
      .split('@')[0]
      .split('.')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const getUserDisplayName = () => {
    if (userProfile?.firstName && userProfile?.lastName) {
      return `${userProfile.firstName} ${userProfile.lastName}`;
    }
    if (userProfile?.firstName) {
      return userProfile.firstName;
    }
    return user?.attributes?.email?.split('@')[0] || 'Usuario';
  };

  const getUserRole = () => {
    // Verificar si es admin basado en el email o permisos
    const userEmail = user?.attributes?.email || user?.username;
    if (userEmail === 'alberto.ochoaf@gmail.com') {
      return 'admin';
    }
    return userPermissions.role || 'user';
  };

  // Handle dropdown functionality
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleProfileClick = () => {
    console.log('🔍 Navegando a Mi Perfil...');
    navigate('/profile');
    setDropdownOpen(false);
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Cerrando sesión...');
      await signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handlers para el banner de verificación
  const handleVerifyEmail = () => {
    navigate('/profile');
    setShowVerificationBanner(false);
  };

  const handleCloseBanner = () => {
    setShowVerificationBanner(false);
  };

  return (
    <StyledThemeProvider theme={theme}>
      <LayoutContainer>
        <Sidebar 
          isExpanded={sidebarExpanded}
          onToggle={toggleSidebar}
          isMobile={isMobile}
        />
        
        <Overlay $show={isMobile && sidebarExpanded} onClick={toggleSidebar} />
        
        <MainContent $sidebarExpanded={!isMobile && sidebarExpanded}>
          {!emailVerified && showVerificationBanner && (
            <VerificationBanner>
              <BannerContent>
                <BannerIcon>⚠️</BannerIcon>
                <span>
                  Tu correo electrónico no está verificado. Verifica tu email para acceder a todas las funcionalidades.
                </span>
              </BannerContent>
              <BannerActions>
                <BannerButton onClick={handleVerifyEmail}>
                  Verificar Ahora
                </BannerButton>
                <CloseButton onClick={handleCloseBanner}>
                  ×
                </CloseButton>
              </BannerActions>
            </VerificationBanner>
          )}
          
          <Header>
            <HeaderTitle>{getPageTitle()}</HeaderTitle>
            <UserDropdownContainer ref={dropdownRef}>
              <UserSectionClickable onClick={toggleDropdown}>
                <UserAvatar>
                  {getUserInitials(
                    user?.attributes?.email,
                    userProfile?.firstName,
                    userProfile?.lastName
                  )}
                </UserAvatar>
                <UserInfo>
                  <UserName>
                    {getUserDisplayName()}
                  </UserName>
                  <UserRole>
                    {getUserRole()}
                  </UserRole>
                </UserInfo>
                <ChevronIcon $open={dropdownOpen}>
                  ▼
                </ChevronIcon>
              </UserSectionClickable>
              
              <DropdownMenu $show={dropdownOpen}>
                <DropdownItem onClick={handleProfileClick}>
                  <DropdownIcon>👤</DropdownIcon>
                  <DropdownText>Mi Perfil</DropdownText>
                </DropdownItem>
                <DropdownItem className="logout-item" onClick={handleLogout}>
                  <DropdownIcon>🚪</DropdownIcon>
                  <DropdownText>Cerrar Sesión</DropdownText>
                </DropdownItem>
              </DropdownMenu>
            </UserDropdownContainer>
          </Header>
          
          <ContentArea>
            {children}
          </ContentArea>
        </MainContent>
      </LayoutContainer>
    </StyledThemeProvider>
  );
};

export default LayoutWithSidebar;

import React, { useState, useEffect } from 'react';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import styled from 'styled-components';
import { surfaces, textColors, effects, brandColors, gradients, semanticColors } from '../styles/ColorTokens';
import '@aws-amplify/ui-react/styles.css';

const AuthContainer = styled.div`
  .amplify-authenticator {
    --amplify-primary-color: ${brandColors.primary};
    --amplify-primary-tint: ${brandColors.primaryDark};
    --amplify-primary-shade: ${brandColors.primaryDeep};
    --amplify-background-color: transparent;
    
    background: ${gradients.backgrounds.primary};
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .amplify-card {
      background: ${surfaces.glass.strong};
      backdrop-filter: ${effects.blur.medium};
      border-radius: 20px;
      border: 1px solid ${surfaces.borders.medium};
      box-shadow: ${effects.shadows.strong};
      
      .amplify-heading {
        color: ${textColors.primary};
        font-weight: 300;
        letter-spacing: 1px;
      }
      
      .amplify-input {
        background: ${surfaces.inputs.background};
        border: 1px solid ${surfaces.borders.medium};
        border-radius: 10px;
        color: ${textColors.primary};
        backdrop-filter: ${effects.blur.light};
        
        &::placeholder {
          color: ${textColors.subtle};
        }
        
        &:focus {
          border-color: ${brandColors.primary};
          background: ${surfaces.inputs.focus};
          box-shadow: ${effects.states.focusRing};
        }
      }
      
      .amplify-button--primary {
        background: ${gradients.buttons.primary};
        border: none;
        border-radius: 25px;
        
        &:hover {
          transform: ${effects.states.hoverTransform};
          box-shadow: ${effects.shadows.colored};
        }
      }
      
      .amplify-text {
        color: ${textColors.secondary};
      }
      
      .amplify-label {
        color: ${textColors.primary};
      }
      
      .amplify-button--link {
        color: ${textColors.accent};
        
        &:hover {
          color: ${textColors.accentHover};
        }
      }
    }
  }
`;

const UserInfo = styled.div`
  position: absolute;
  top: 1rem;
  right: 2rem;
  background: ${surfaces.glass.strong};
  backdrop-filter: ${effects.blur.light};
  padding: 1rem 1.5rem;
  border-radius: 15px;
  border: 1px solid ${surfaces.borders.medium};
  color: ${textColors.primary};
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: ${effects.shadows.medium};
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const UserEmail = styled.span`
  font-size: 0.9rem;
  opacity: 0.8;
`;

const UserRole = styled.span`
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  background: ${props => {
    switch(props.role) {
      case 'admin': return 'linear-gradient(135deg, #ff6b6b, #ffa726)';
      case 'moderator': return 'linear-gradient(135deg, #4ecdc4, #45b7d1)';
      default: return 'linear-gradient(135deg, #6c757d, #495057)';
    }
  }};
  border-radius: 12px;
  color: white;
  font-weight: 500;
  text-align: center;
`;

const LogoutButton = styled.button`
  background: ${surfaces.buttons.secondary};
  border: 1px solid ${semanticColors.errorLight};
  color: ${semanticColors.error};
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: ${effects.states.transition};
  
  &:hover {
    background: ${semanticColors.errorLight};
    border-color: ${semanticColors.error};
    transform: ${effects.states.hoverTransform};
  }
`;

const PermissionsDisplay = styled.div`
  position: absolute;
  bottom: 2rem;
  right: 2rem;
  background: ${surfaces.glass.strong};
  backdrop-filter: ${effects.blur.light};
  padding: 1rem;
  border-radius: 15px;
  border: 1px solid ${surfaces.borders.medium};
  color: ${textColors.primary};
  max-width: 300px;
  box-shadow: ${effects.shadows.medium};
`;

const PermissionItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0.5rem 0;
  font-size: 0.9rem;
`;

const PermissionStatus = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  background: ${props => props.$allowed ? 
    gradients.buttons.success : 
    gradients.buttons.error};
  color: white;
`;

const AuthenticatedContent = ({ children }) => {
  const { user, signOut } = useAuthenticator();
  const [userPermissions, setUserPermissions] = useState({
    role: 'user',
    canUpload: false,
    canViewFunds: false,
    permissionsLoaded: false
  });

  useEffect(() => {
    const fetchUserPermissions = async () => {
      try {
        console.log('Usuario completo:', user);
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken;
        
        if (idToken) {
          const payload = idToken.payload;
          console.log('ID Token Payload:', payload);
          
          setUserPermissions({
            role: payload['custom:role'] || 'user',
            canUpload: payload['custom:can_upload'] === 'true',
            canViewFunds: payload['custom:can_view_funds'] === 'true',
            permissionsLoaded: payload['custom:permissions_loaded'] === 'true'
          });
        } else {
          console.warn('No se encontró idToken en la sesión');
        }
      } catch (error) {
        console.error('Error fetching user permissions:', error);
        setUserPermissions({
          role: 'user',
          canUpload: false,
          canViewFunds: false,
          permissionsLoaded: false
        });
      }
    };

    if (user) {
      console.log('Usuario detectado, obteniendo permisos...');
      fetchUserPermissions();
    } else {
      console.log('No hay usuario autenticado');
    }
  }, [user]);

  if (!user) return null;

  return (
    <>
      <UserInfo>
        <UserDetails>
          <UserEmail>{user?.attributes?.email || user?.signInDetails?.loginId || 'Usuario'}</UserEmail>
          <UserRole role={userPermissions.role}>
            {userPermissions.role.toUpperCase()}
          </UserRole>
        </UserDetails>
        <LogoutButton onClick={signOut}>
          Cerrar Sesión
        </LogoutButton>
      </UserInfo>
      
      <PermissionsDisplay>
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Permisos</h4>
        <PermissionItem>
          <span>Subir archivos:</span>
          <PermissionStatus $allowed={userPermissions.canUpload}>
            {userPermissions.canUpload ? 'Permitido' : 'Denegado'}
          </PermissionStatus>
        </PermissionItem>
        <PermissionItem>
          <span>Ver fondos:</span>
          <PermissionStatus $allowed={userPermissions.canViewFunds}>
            {userPermissions.canViewFunds ? 'Permitido' : 'Denegado'}
          </PermissionStatus>
        </PermissionItem>
        <PermissionItem>
          <span>Permisos cargados:</span>
          <PermissionStatus $allowed={userPermissions.permissionsLoaded}>
            {userPermissions.permissionsLoaded ? 'Sí' : 'No'}
          </PermissionStatus>
        </PermissionItem>
      </PermissionsDisplay>
      
      {React.cloneElement(children, { userPermissions, user })}
    </>
  );
};

const AuthenticatedApp = ({ children }) => {
  return (
    <AuthContainer>
      <Authenticator
        loginMechanisms={['email']}
        signUpAttributes={['email']}
        hideSignUp={true}
        components={{
          Header() {
            return (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem 0',
                color: '#2c3e50'
              }}>
                <h1 style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: '300', 
                  letterSpacing: '2px',
                  margin: 0
                }}>
                  Numerica
                </h1>
                <p style={{ 
                  fontSize: '1rem', 
                  opacity: 0.8,
                  margin: '0.5rem 0 0 0'
                }}>
                  Sistema de Autenticación Avanzado
                </p>
              </div>
            );
          }
        }}
      >
        <AuthenticatedContent>
          {children}
        </AuthenticatedContent>
      </Authenticator>
    </AuthContainer>
  );
};

export default AuthenticatedApp;

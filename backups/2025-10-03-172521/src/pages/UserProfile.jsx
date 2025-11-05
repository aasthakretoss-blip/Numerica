import React, { useState, useEffect } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import styled from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';
import { buildApiUrl } from '../config/apiConfig';

const ProfileContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background: ${props => props.theme?.surfaces?.glass?.strong || '#ab99881a'};
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.medium || 'rgba(255, 255, 255, 0.2)'};
  box-shadow: ${props => props.theme?.effects?.shadows?.medium || '0 8px 32px rgba(0, 0, 0, 0.1)'};
  
  @media (max-width: 768px) {
    margin: 1rem;
    padding: 1.5rem;
  }
`;

const ProfileHeader = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const ProfileTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 300;
  color: ${props => props.theme?.textColors?.primary || '#1d242bff'};
  margin: 0;
  letter-spacing: 1px;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const ProfileSubtitle = styled.p`
  font-size: 1.1rem;
  color: ${props => props.theme?.textColors?.secondary || '#150d0dff'};
  margin: 0.5rem 0 0 0;
`;

const ProfileAvatar = styled.div`
  width: 120px;
  height: 120px;
  background: ${props => props.theme?.gradients?.buttons?.primary || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 2rem auto;
  font-size: 3rem;
  font-weight: 600;
  color: white;
  border: 4px solid ${props => props.theme?.surfaces?.borders?.strong || 'rgba(255, 255, 255, 0.3)'};
  box-shadow: ${props => props.theme?.effects?.shadows?.strong || '0 8px 24px rgba(0, 0, 0, 0.15)'};
`;

const ProfileForm = styled.form`
  display: grid;
  gap: 2rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FormLabel = styled.label`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.theme?.textColors?.primary || '#2c3e50'};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FormInput = styled.input`
  padding: 1rem 1.5rem;
  border: 2px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(0, 0, 0, 0.1)'};
  border-radius: 12px;
  font-size: 1rem;
  background: ${props => props.theme?.surfaces?.glass?.light || 'rgba(255, 255, 255, 0.8)'};
  backdrop-filter: blur(10px);
  color: ${props => props.theme?.textColors?.primary || '#1d365ff'};
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme?.brand?.primary || '#e1e5f7ff'};
    box-shadow: 0 0 0 3px ${props => props.theme?.brand?.primary || '#a8b4e9ff'}33;
    transform: translateY(-2px);
  }
  
  &:disabled {
    background: ${props => props.theme?.surfaces?.disabled || 'rgba(0, 0, 0, 0.05)'};
    color: ${props => props.theme?.textColors?.disabled || '#9ca3af'};
    cursor: not-allowed;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Button = styled.button`
  padding: 1rem 2rem;
  border-radius: 12px;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;
  
  ${props => props.$variant === 'primary' ? `
    background: ${props.theme?.gradients?.buttons?.primary || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
    color: white;
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
    }
  ` : `
    background: ${props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.6)'};
    color: ${props.theme?.textColors?.primary || '#2c3e50'};
    border: 2px solid ${props.theme?.surfaces?.borders?.medium || 'rgba(0, 0, 0, 0.1)'};
    
    &:hover:not(:disabled) {
      background: ${props.theme?.surfaces?.glass?.strong || 'rgba(255, 255, 255, 0.8)'};
      transform: translateY(-1px);
    }
  `}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  ${props => {
    if (props.$status === 'active') {
      return `
        background: ${props.theme?.semanticColors?.successLight || '#d1fae5'};
        color: ${props.theme?.semanticColors?.success || '#059669'};
      `;
    } else {
      return `
        background: ${props.theme?.semanticColors?.warningLight || '#fef3c7'};
        color: ${props.theme?.semanticColors?.warning || '#d97706'};
      `;
    }
  }}
`;

const InfoCard = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.light || 'rgba(255, 255, 255, 1)'};
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.9)'};
  margin-bottom: 2rem;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0.5rem 0;
  font-size: 0.9rem;
  
  .label {
    color: ${props => props.theme?.textColors?.secondary || '#6c7682'};
    font-weight: 500;
  }
  
  .value {
    color: ${props => props.theme?.textColors?.primary || '#2c3e50'};
    font-weight: 600;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem;
  
  &::after {
    content: '';
    width: 40px;
    height: 40px;
    border: 3px solid ${props => props.theme?.surfaces?.borders?.light || '#e5e7eb'};
    border-top: 3px solid ${props => props.theme?.brand?.primary || '#667eea'};
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const SuccessMessage = styled.div`
  background: ${props => props.theme?.semanticColors?.successLight || '#d1fae5'};
  color: ${props => props.theme?.semanticColors?.success || '#059669'};
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  font-weight: 500;
  text-align: center;
  border: 1px solid ${props => props.theme?.semanticColors?.success || '#059669'};
`;

const ErrorMessage = styled.div`
  background: ${props => props.theme?.semanticColors?.errorLight || '#fee2e2'};
  color: ${props => props.theme?.semanticColors?.error || '#dc2626'};
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  font-weight: 500;
  text-align: center;
  border: 1px solid ${props => props.theme?.semanticColors?.error || '#dc2626'};
`;

const UserProfile = () => {
  const { theme } = useTheme();
  const { user } = useAuthenticator();
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Load profile data
  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // Debug logs
      console.log('🔍 Debug - Usuario completo:', user);
      console.log('🔍 Debug - user.attributes:', user?.attributes);
      console.log('🔍 Debug - Email del usuario:', user?.attributes?.email);
      console.log('🔍 Debug - Username:', user?.username);
      
      const response = await fetch(buildApiUrl('/api/user/profile'), {
        headers: {
          'x-user-email': user?.attributes?.email || user?.username || 'alberto.ochoaf@gmail.com'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data.user);
        setFormData({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          phoneNumber: data.user.phoneNumber || ''
        });
      } else {
        throw new Error('Error al cargar el perfil');
      }
    } catch (err) {
      setError('Error al cargar los datos del perfil');
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setMessage(null);
      setError(null);
      
      // Debug logs
      console.log('🔄 Debug - Enviando PUT con email:', user?.attributes?.email || user?.username);
      
      const response = await fetch(buildApiUrl('/api/user/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.attributes?.email || user?.username || 'alberto.ochoaf@gmail.com'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Perfil actualizado exitosamente');
        setProfileData(prev => ({ ...prev, ...data.user }));
      } else {
        throw new Error(data.error || 'Error al actualizar el perfil');
      }
    } catch (err) {
      setError(err.message || 'Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const getUserInitials = (email) => {
    if (!email) return 'U';
    return email
      .split('@')[0]
      .split('.')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    // Si es un timestamp ISO, extraer solo la parte de la fecha
    if (typeof dateString === 'string' && dateString.includes('T')) {
      dateString = dateString.split('T')[0];
    }
    return new Date(dateString + 'T12:00:00').toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <ProfileContainer theme={theme}>
        <LoadingSpinner theme={theme} />
      </ProfileContainer>
    );
  }

  return (
    <ProfileContainer theme={theme}>
      <ProfileHeader>
        <ProfileAvatar theme={theme}>
          {getUserInitials(profileData?.email)}
        </ProfileAvatar>
        <ProfileTitle theme={theme}>Mi Perfil</ProfileTitle>
        <ProfileSubtitle theme={theme}>
          Administra tu información personal
        </ProfileSubtitle>
      </ProfileHeader>

      {profileData && (
        <InfoCard theme={theme}>
          <InfoRow theme={theme}>
            <span className="label">Correo Electrónico:</span>
            <span className="value">{profileData.email}</span>
          </InfoRow>
          <InfoRow theme={theme}>
            <span className="label">Estado:</span>
            <StatusBadge theme={theme} $status={profileData.status}>
              {profileData.status === 'active' ? '✅ Activo' : '⚠️ Pendiente'}
            </StatusBadge>
          </InfoRow>
          <InfoRow theme={theme}>
            <span className="label">Teléfono Verificado:</span>
            <span className="value">
              {profileData.phoneVerified ? '✅ Verificado' : '❌ Sin verificar'}
            </span>
          </InfoRow>
          <InfoRow theme={theme}>
            <span className="label">Miembro desde:</span>
            <span className="value">{formatDate(profileData.createdAt)}</span>
          </InfoRow>
          {profileData.lastLogin && (
            <InfoRow theme={theme}>
              <span className="label">Último acceso:</span>
              <span className="value">{formatDate(profileData.lastLogin)}</span>
            </InfoRow>
          )}
        </InfoCard>
      )}

      {message && <SuccessMessage theme={theme}>{message}</SuccessMessage>}
      {error && <ErrorMessage theme={theme}>{error}</ErrorMessage>}

      <ProfileForm onSubmit={handleSubmit}>
        <FormRow>
          <FormGroup>
            <FormLabel theme={theme}>Nombre</FormLabel>
            <FormInput
              theme={theme}
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="Ingresa tu nombre"
              required
            />
          </FormGroup>
          
          <FormGroup>
            <FormLabel theme={theme}>Apellidos</FormLabel>
            <FormInput
              theme={theme}
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Ingresa tus apellidos"
              required
            />
          </FormGroup>
        </FormRow>

        <FormGroup>
          <FormLabel theme={theme}>Número de Teléfono</FormLabel>
          <FormInput
            theme={theme}
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            placeholder="+52 1 234 567 8900"
          />
        </FormGroup>

        <ButtonGroup>
          <Button
            theme={theme}
            $variant="primary"
            type="submit"
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
          
          <Button
            theme={theme}
            $variant="secondary"
            type="button"
            onClick={loadProfile}
            disabled={loading || saving}
          >
            Cancelar
          </Button>
        </ButtonGroup>
      </ProfileForm>
    </ProfileContainer>
  );
};

export default UserProfile;

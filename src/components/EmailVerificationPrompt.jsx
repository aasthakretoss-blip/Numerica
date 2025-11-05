import React, { useState } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { updateUserAttribute, confirmUserAttribute } from '@aws-amplify/auth';
import styled from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';

const VerificationContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, #1a365d 0%, #2a4365 100%);
  z-index: 9999;
`;

const VerificationCard = styled.div`
  max-width: 500px;
  width: 100%;
  background: ${props => props.theme?.surfaces?.glass?.strong || 'rgba(255, 255, 255, 0.95)'};
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 3rem;
  text-align: center;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.medium || 'rgba(255, 255, 255, 0.2)'};
  box-shadow: ${props => props.theme?.effects?.shadows?.strong || '0 10px 40px rgba(0, 0, 0, 0.2)'};
`;

const Icon = styled.div`
  width: 80px;
  height: 80px;
  background: ${props => props.theme?.gradients?.buttons?.primary || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 2rem;
  font-size: 2rem;
  color: white;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  color: ${props => props.theme?.textColors?.primary || '#2c3e50'};
  margin: 0 0 1rem;
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: ${props => props.theme?.textColors?.secondary || '#6c7682'};
  margin: 0 0 2rem;
  line-height: 1.6;
`;

const EmailDisplay = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.light || 'rgba(0, 0, 0, 0.05)'};
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  font-weight: 600;
  color: ${props => props.theme?.brand?.primary || '#667eea'};
`;

const CodeInput = styled.input`
  width: 100%;
  padding: 1rem 1.5rem;
  border: 2px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(0, 0, 0, 0.1)'};
  border-radius: 12px;
  font-size: 1.1rem;
  text-align: center;
  letter-spacing: 0.5rem;
  font-weight: 600;
  background: ${props => props.theme?.surfaces?.glass?.light || 'rgba(255, 255, 255, 0.8)'};
  color: ${props => props.theme?.textColors?.primary || '#2c3e50'};
  margin: 1rem 0;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme?.brand?.primary || '#667eea'};
    box-shadow: 0 0 0 3px ${props => props.theme?.brand?.primary || '#667eea'}33;
  }
  
  &::placeholder {
    letter-spacing: normal;
    color: ${props => props.theme?.textColors?.tertiary || '#9ca3af'};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
`;

const Button = styled.button`
  padding: 1rem 2rem;
  border-radius: 12px;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  ${props => props.variant === 'primary' ? `
    background: ${props.theme?.gradients?.buttons?.primary || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
    color: white;
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
    }
  ` : `
    background: transparent;
    color: ${props.theme?.brand?.primary || '#667eea'};
    border: 2px solid ${props.theme?.brand?.primary || '#667eea'};
    
    &:hover:not(:disabled) {
      background: ${props.theme?.brand?.primary || '#667eea'};
      color: white;
    }
  `}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const Message = styled.div`
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  font-weight: 500;
  
  ${props => props.type === 'success' ? `
    background: ${props.theme?.semanticColors?.successLight || '#d1fae5'};
    color: ${props.theme?.semanticColors?.success || '#059669'};
    border: 1px solid ${props.theme?.semanticColors?.success || '#059669'};
  ` : props.type === 'error' ? `
    background: ${props.theme?.semanticColors?.errorLight || '#fee2e2'};
    color: ${props.theme?.semanticColors?.error || '#dc2626'};
    border: 1px solid ${props.theme?.semanticColors?.error || '#dc2626'};
  ` : `
    background: ${props.theme?.semanticColors?.infoLight || '#dbeafe'};
    color: ${props.theme?.semanticColors?.info || '#2563eb'};
    border: 1px solid ${props.theme?.semanticColors?.info || '#2563eb'};
  `}
`;

const SkipLink = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme?.textColors?.tertiary || '#9ca3af'};
  font-size: 0.9rem;
  cursor: pointer;
  margin-top: 1rem;
  text-decoration: underline;
  
  &:hover {
    color: ${props => props.theme?.textColors?.secondary || '#6c7682'};
  }
`;

const EmailVerificationPrompt = ({ user, onSkip }) => {
  const { theme } = useTheme();
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState(null);
  
  const userEmail = user?.attributes?.email || user?.username || 'usuario@correo.com';

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    if (!verificationCode.trim()) {
      setMessage({ type: 'error', text: 'Por favor ingresa el código de verificación' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      
      // Para usuarios autenticados, usar confirmUserAttribute
      await confirmUserAttribute({
        userAttributeKey: 'email',
        confirmationCode: verificationCode.trim()
      });
      
      setMessage({ type: 'success', text: '¡Correo verificado exitosamente! Redirigiendo...' });
      
      // Recargar la página para actualizar el estado de autenticación
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error verificando código:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Error al verificar el código. Inténtalo de nuevo.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setResending(true);
      setMessage(null);
      
      // Para usuarios autenticados, solicitar nuevo código actualizando el atributo
      await updateUserAttribute({
        userAttribute: {
          attributeKey: 'email',
          value: userEmail
        }
      });
      
      setMessage({ 
        type: 'success', 
        text: 'Código de verificación enviado. Revisa tu correo.' 
      });
      
    } catch (error) {
      console.error('Error enviando código:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Error al enviar el código.' 
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <VerificationContainer theme={theme}>
      <VerificationCard theme={theme}>
        <Icon theme={theme}>✉️</Icon>
        
        <Title theme={theme}>Verifica tu Correo Electrónico</Title>
        
        <Subtitle theme={theme}>
          Para completar tu registro y acceder a todas las funcionalidades, 
          necesitas verificar tu correo electrónico.
        </Subtitle>
        
        <EmailDisplay theme={theme}>{userEmail}</EmailDisplay>
        
        <Subtitle theme={theme}>
          Hemos enviado un código de verificación a tu correo. 
          Ingrésalo a continuación:
        </Subtitle>

        {message && (
          <Message theme={theme} type={message.type}>
            {message.text}
          </Message>
        )}

        <form onSubmit={handleVerifyCode}>
          <CodeInput
            theme={theme}
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Código de 6 dígitos"
            maxLength={6}
            disabled={loading}
          />

          <ButtonGroup>
            <Button
              theme={theme}
              variant="primary"
              type="submit"
              disabled={loading || !verificationCode.trim()}
            >
              {loading ? 'Verificando...' : 'Verificar Correo'}
            </Button>

            <Button
              theme={theme}
              variant="secondary"
              type="button"
              onClick={handleResendCode}
              disabled={resending}
            >
              {resending ? 'Reenviando...' : 'Reenviar Código'}
            </Button>
          </ButtonGroup>
        </form>

        <SkipLink theme={theme} onClick={onSkip}>
          Continuar sin verificar (funcionalidad limitada)
        </SkipLink>
      </VerificationCard>
    </VerificationContainer>
  );
};

export default EmailVerificationPrompt;

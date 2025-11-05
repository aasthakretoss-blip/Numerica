import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import authService from '../services/authService';

const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);
  padding: 2rem;
`;

const LoginCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  padding: 3rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const LoginTitle = styled.h2`
  color: white;
  text-align: center;
  margin-bottom: 2rem;
  font-size: 2.5rem;
  font-weight: 300;
  letter-spacing: 1px;
`;

const LoginForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0.5px;
`;

const Input = styled.input`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  padding: 1rem;
  color: white;
  font-size: 1rem;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
  
  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.15);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
  }
`;

const LoginButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 25px;
  padding: 1rem 2rem;
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const BackButton = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 25px;
  padding: 0.75rem 1.5rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border-color: rgba(255, 255, 255, 0.5);
  }
`;

const RegisterButtonYellow = styled.button`
  background: #2c3e50;
  border: 2px solid #1a365d;
  border-radius: 25px;
  padding: 0.9rem 2rem;
  color: white;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  
  &:hover {
    background: #1a365d;
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(44, 62, 80, 0.4);
  }
  
  &:active {
    transform: scale(1.02);
  }
`;

const ErrorMessage = styled.div`
  color: #ff6b6b;
  text-align: center;
  font-size: 0.9rem;
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(255, 107, 107, 0.3);
`;

const ForgotPassword = styled.a`
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  font-size: 0.85rem;
  text-decoration: none;
  margin-top: 1rem;
  cursor: pointer;
  transition: color 0.3s ease;
  
  &:hover {
    color: white;
  }
`;

const RegisterBox = styled.div`
  background: rgba(255, 237, 74, 0.95);
  border: 3px solid #f1c40f;
  border-radius: 15px;
  padding: 2rem;
  margin-top: 2rem;
  text-align: center;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 4px 16px rgba(241, 196, 15, 0.3);
  transform: rotate(-1deg);
  transition: all 0.3s ease;
  
  &:hover {
    transform: rotate(0deg) translateY(-3px);
    box-shadow: 0 8px 24px rgba(241, 196, 15, 0.4);
  }
`;

const RegisterBoxText = styled.p`
  color: #2c3e50;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
`;

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Por favor, completa todos los campos');
      setIsLoading(false);
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Por favor, ingresa un email válido');
      setIsLoading(false);
      return;
    }

    try {
      // Autenticación real con AWS Cognito
      const result = await authService.login(formData.email, formData.password);
      
      console.log('✅ Login exitoso:', result.user.email);
      console.log('🔐 Permisos:', result.user.permissions);
      
      // Redirigir a la página principal
      navigate('/');
    } catch (err) {
      console.error('❌ Error de autenticación:', err);
      
      // Mostrar mensaje de error amigable al usuario
      if (err.code === 'NEW_PASSWORD_REQUIRED') {
        setError('Debes cambiar tu contraseña temporal. Contacta al administrador.');
      } else {
        setError(err.message || 'Error al iniciar sesión. Por favor, inténtalo de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackClick = () => {
    navigate('/');
  };

  const handleRegisterClick = () => {
    navigate('/signup');
  };

  return (
    <LoginContainer>
      <LoginCard>
        <LoginTitle>Iniciar Sesión</LoginTitle>
        <LoginForm onSubmit={handleSubmit}>
          <InputGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              name="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </InputGroup>
          
          <InputGroup>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </InputGroup>
          
          <LoginButton type="submit" disabled={isLoading}>
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </LoginButton>
          
          <BackButton type="button" onClick={handleBackClick}>
            Volver al Inicio
          </BackButton>
          
          {error && <ErrorMessage>{error}</ErrorMessage>}
          
          <ForgotPassword href="#" onClick={(e) => e.preventDefault()}>
            ¿Olvidaste tu contraseña?
          </ForgotPassword>
        </LoginForm>
      </LoginCard>
      
      <RegisterBox>
        <RegisterBoxText>¿No tienes cuenta?</RegisterBoxText>
        <RegisterButtonYellow type="button" onClick={handleRegisterClick}>
          Regístrate aquí
        </RegisterButtonYellow>
      </RegisterBox>
    </LoginContainer>
  );
};

export default Login;

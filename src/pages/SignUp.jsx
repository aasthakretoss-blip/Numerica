import React, { useState } from 'react';
import { signUp, confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { brandColors, gradients } from '../styles/ColorTokens';
import { buildApiUrl } from '../config/apiConfig';

const SignUpContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${gradients.buttons.primary};
  padding: 2rem;
`;

const SignUpCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 3rem;
  max-width: 500px;
  width: 100%;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 300;
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
  letter-spacing: 2px;
  text-align: center;
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: #6c757d;
  margin: 0 0 2rem 0;
  text-align: center;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 600;
  color: #2c3e50;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Input = styled.input`
  padding: 1rem 1.5rem;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  color: #2c3e50;
  transition: all 0.3s ease;
  
  &::placeholder {
    color: #9ca3af;
  }
  
  &:focus {
    outline: none;
    border-color: ${brandColors.primary};
    box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.2);
    transform: translateY(-2px);
  }
  
  &:disabled {
    background: rgba(0, 0, 0, 0.05);
    color: #9ca3af;
    cursor: not-allowed;
  }
`;

const PasswordRequirements = styled.div`
  font-size: 0.8rem;
  color: #6c757d;
  padding: 0.5rem;
  background: rgba(26, 54, 93, 0.05);
  border-radius: 8px;
  
  ul {
    margin: 0;
    padding-left: 1.5rem;
  }
  
  li {
    margin: 0.25rem 0;
    color: ${props => props.$valid ? '#059669' : '#6c757d'};
  }
`;

const PasswordStrength = styled.div`
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 0.5rem;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.$strength}%;
    background: ${props => {
      if (props.$strength < 33) return '#ef4444';
      if (props.$strength < 66) return '#f59e0b';
      return '#10b981';
    }};
    transition: all 0.3s ease;
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
  background: ${gradients.buttons.primary};
  color: white;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(26, 54, 93, 0.4);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const Message = styled.div`
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-weight: 500;
  text-align: center;
  
  ${props => props.$type === 'error' ? `
    background: #fee2e2;
    color: #dc2626;
    border: 1px solid #dc2626;
  ` : props.$type === 'success' ? `
    background: #d1fae5;
    color: #059669;
    border: 1px solid #059669;
  ` : `
    background: #dbeafe;
    color: #2563eb;
    border: 1px solid #2563eb;
  `}
`;

const BackLink = styled.a`
  display: block;
  text-align: center;
  margin-top: 1.5rem;
  color: ${brandColors.primary};
  text-decoration: none;
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }
`;

const LoginBox = styled.div`
  background: rgba(255, 237, 74, 0.95);
  border: 3px solid #f1c40f;
  border-radius: 15px;
  padding: 2rem;
  margin-top: 2rem;
  text-align: center;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 4px 16px rgba(241, 196, 15, 0.3);
  transform: rotate(-1deg);
  transition: all 0.3s ease;
  
  &:hover {
    transform: rotate(0deg) translateY(-3px);
    box-shadow: 0 8px 24px rgba(241, 196, 15, 0.4);
  }
`;

const LoginBoxText = styled.p`
  color: #2c3e50;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
`;

const LoginButton = styled.button`
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

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    symbol: false,
    noSpaces: true
  });
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  // Validación de contraseña con useEffect para evitar bucle infinito
  React.useEffect(() => {
    const newRequirements = {
      length: formData.password.length >= 10,
      uppercase: /[A-Z]/.test(formData.password),
      lowercase: /[a-z]/.test(formData.password),
      symbol: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
      noSpaces: !/\s/.test(formData.password)
    };

    const validCount = Object.values(newRequirements).filter(Boolean).length;
    setPasswordStrength((validCount / 5) * 100);
    setRequirements(newRequirements);
  }, [formData.password]);

  const isPasswordValid = Object.values(requirements).every(Boolean);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    // Validaciones básicas
    if (!formData.email || !formData.fullName || !formData.password || !formData.confirmPassword) {
      setMessage({ text: 'Todos los campos son requeridos excepto el teléfono', type: 'error' });
      return;
    }

    if (!isPasswordValid) {
      setMessage({ text: 'La contraseña no cumple con los requisitos', type: 'error' });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage({ text: 'Las contraseñas no coinciden', type: 'error' });
      return;
    }

    try {
      setLoading(true);

      // Paso 1: Validar email contra numerica_users
      console.log('🔍 Validando email:', formData.email);
      // const validateResponse = await fetch(buildApiUrl('/api/auth/validate-email'), {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email: formData.email })
      // });

      // const validateData = await validateResponse.json();

      // if (!validateResponse.ok) {
      //   setMessage({ text: validateData.error, type: 'error' });
      //   setLoading(false);
      //   return;
      // }

      // console.log('✅ Email validado:', validateData);

      // Paso 2: Registrar usuario en AWS Cognito
      console.log('📝 Registrando usuario en Cognito...');
      const [firstName, ...lastNameParts] = formData.fullName.trim().split(' ');
      const lastName = lastNameParts.join(' ');

      // Construir userAttributes dinámicamente
      const userAttributes = {
        email: formData.email,
        name: formData.fullName
      };

      // Solo agregar phone_number si tiene valor
      if (formData.phoneNumber && formData.phoneNumber.trim() !== '') {
        userAttributes.phone_number = `+52${formData.phoneNumber}`;
      }

      await signUp({
        username: formData.email,
        password: formData.password,
        options: {
          userAttributes
        }
      });

      console.log('✅ Usuario registrado en Cognito');

      // Paso 3: Confirmar registro en backend
      console.log('🔄 Confirmando registro en backend...');
      const confirmResponse = await fetch(buildApiUrl('/api/auth/confirm-registration'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          firstName,
          lastName,
          phoneNumber: formData.phoneNumber
        })
      });

      const confirmData = await confirmResponse.json();
      console.log('✅ Registro confirmado en backend:', confirmData);

      setMessage({
        text: '¡Registro exitoso! Para verificar tu cuenta, ingresa el código proporcionado personalmente: 1489999',
        type: 'success'
      });

      // Cambiar a pantalla de verificación
      setVerificationStep(true);
      setLoading(false);

    } catch (error) {
      console.error('❌ Error en registro:', error);
      
      if (error.name === 'UsernameExistsException') {
        setMessage({ text: 'Este email ya está registrado. Por favor inicia sesión.', type: 'error' });
      } else if (error.name === 'InvalidPasswordException') {
        setMessage({ text: 'La contraseña no cumple con los requisitos de AWS Cognito', type: 'error' });
      } else {
        setMessage({ text: error.message || 'Error al registrar usuario', type: 'error' });
      }
    } finally {
      if (!verificationStep) {
        setLoading(false);
      }
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (!verificationCode || verificationCode.length !== 7) {
      setMessage({ text: 'Por favor ingresa el código de 7 dígitos (1489999)', type: 'error' });
      return;
    }

    try {
      setLoading(true);

      console.log('🔐 Verificando código manual...');
      
      // Llamar al backend para confirmar con código manual
      const verifyResponse = await fetch(buildApiUrl('/api/auth/verify-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: formData.email,
          code: verificationCode 
        })
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        setMessage({ text: verifyData.error || 'Error al verificar código', type: 'error' });
        setLoading(false);
        return;
      }

      console.log('✅ Usuario verificado exitosamente');

      setMessage({
        text: '¡Verificación exitosa! Redirigiendo al inicio de sesión...',
        type: 'success'
      });

      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      console.error('❌ Error verificando código:', error);
      setMessage({ text: error.message || 'Error al verificar código', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Función de reenvío deshabilitada para código manual
  const handleResendCode = async () => {
    setMessage({ 
      text: 'El código es: 1489999. Este es un código fijo proporcionado personalmente.', 
      type: 'info' 
    });
  };

  // Si estamos en el paso de verificación, mostrar formulario de código
  if (verificationStep) {
    return (
      <SignUpContainer>
        <SignUpCard>
          <Title>Verificación</Title>
          <Subtitle>Ingresa el código proporcionado personalmente</Subtitle>

          {message.text && (
            <Message $type={message.type}>{message.text}</Message>
          )}

          <Form onSubmit={handleVerification}>
            <FormGroup>
              <Label>Código de Verificación *</Label>
              <Input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="1489999"
                maxLength={7}
                required
                disabled={loading}
              />
              <span style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.5rem' }}>
                Ingresa el código: 1489999
              </span>
            </FormGroup>

            <Button type="submit" disabled={loading}>
              {loading ? 'Verificando...' : 'Verificar Código'}
            </Button>

            <Button 
              type="button" 
              onClick={handleResendCode} 
              disabled={loading}
              style={{ background: gradients.buttons.secondary, marginTop: '0.5rem' }}
            >
              Mostrar Código
            </Button>
          </Form>

          <BackLink href="/">
            ← Volver al inicio de sesión
          </BackLink>
        </SignUpCard>
      </SignUpContainer>
    );
  }

  // Manejador para ir al login
  const handleGoToLogin = () => {
    navigate('/login');
  };

  // Formulario de registro normal
  return (
    <SignUpContainer>
      <SignUpCard>
        <Title>Registro</Title>
        <Subtitle>Crea tu cuenta en Numerica</Subtitle>

        {message.text && (
          <Message $type={message.type}>{message.text}</Message>
        )}

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Correo Electrónico *</Label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="tu.email@ejemplo.com"
              required
              disabled={loading}
            />
          </FormGroup>

          <FormGroup>
            <Label>Nombre Completo *</Label>
            <Input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Juan Pérez García"
              required
              disabled={loading}
            />
          </FormGroup>

          <FormGroup>
            <Label>Teléfono (Opcional)</Label>
            <Input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="5512345678"
              disabled={loading}
            />
          </FormGroup>

          <FormGroup>
            <Label>Contraseña *</Label>
            <Input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Ingresa tu contraseña"
              required
              disabled={loading}
            />
            <PasswordStrength $strength={passwordStrength} />
            <PasswordRequirements>
              <strong>Requisitos de contraseña:</strong>
              <ul>
                <li style={{ color: requirements.length ? '#059669' : '#6c757d' }}>
                  {requirements.length ? '✓' : '○'} Mínimo 10 caracteres
                </li>
                <li style={{ color: requirements.uppercase ? '#059669' : '#6c757d' }}>
                  {requirements.uppercase ? '✓' : '○'} Al menos una mayúscula
                </li>
                <li style={{ color: requirements.lowercase ? '#059669' : '#6c757d' }}>
                  {requirements.lowercase ? '✓' : '○'} Al menos una minúscula
                </li>
                <li style={{ color: requirements.symbol ? '#059669' : '#6c757d' }}>
                  {requirements.symbol ? '✓' : '○'} Al menos un símbolo (!@#$%...)
                </li>
                <li style={{ color: requirements.noSpaces ? '#059669' : '#6c757d' }}>
                  {requirements.noSpaces ? '✓' : '○'} Sin espacios
                </li>
              </ul>
            </PasswordRequirements>
          </FormGroup>

          <FormGroup>
            <Label>Confirmar Contraseña *</Label>
            <Input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirma tu contraseña"
              required
              disabled={loading}
            />
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>
                Las contraseñas no coinciden
              </span>
            )}
          </FormGroup>

          <Button type="submit" disabled={loading || !isPasswordValid}>
            {loading ? 'Registrando...' : 'Crear Cuenta'}
          </Button>
        </Form>
      </SignUpCard>
      
      <LoginBox>
        <LoginBoxText>¿Ya tienes cuenta?</LoginBoxText>
        <LoginButton type="button" onClick={handleGoToLogin}>
          Inicia sesión aquí
        </LoginButton>
      </LoginBox>
    </SignUpContainer>
  );
};

export default SignUp;


import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import LayoutWithSidebar from './LayoutWithSidebar';
import Dashboard from '../pages/Dashboard';
import BusquedaEmpleados from '../pages/BusquedaEmpleados';
import Demografico from '../pages/Demografico';
import FPL from '../pages/FPL';
import SimuladorCreditos from '../pages/SimuladorCreditos';
import Home from '../pages/Home';
import UploadDataBase from './UploadDataBase';
import Payroll from '../pages/Payroll';
import EmployeeProfile from './EmployeeProfile';
import UserProfile from '../pages/UserProfile';
import EmailVerificationPrompt from './EmailVerificationPrompt';

const AppRouter = ({ userPermissions, user }) => {
  const { authStatus } = useAuthenticator();
  const isAuthenticated = authStatus === 'authenticated';
  const [emailVerified, setEmailVerified] = useState(true); // Por defecto true para evitar parpadeo
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(true);

  // Verificar el estado de verificación de email cuando el usuario está autenticado
  useEffect(() => {
    const checkEmailVerification = async () => {
      if (isAuthenticated && user) {
        try {
          console.log('🔍 Verificando estado de email para usuario:', user);
          
          // Obtener la sesión actual para verificar el estado del email
          const session = await fetchAuthSession();
          const cognitoIdToken = session?.tokens?.idToken?.payload;
          
          console.log('📧 Estado de verificación de email:', cognitoIdToken?.email_verified);
          
          // Verificar si el email está verificado
          const isEmailVerified = cognitoIdToken?.email_verified === true;
          
          setEmailVerified(isEmailVerified);
          
          // Si no está verificado, mostrar el prompt después de un pequeño delay
          if (!isEmailVerified) {
            setTimeout(() => {
              setShowVerificationPrompt(true);
            }, 1000);
          }
          
        } catch (error) {
          console.error('Error verificando estado del email:', error);
          // En caso de error, asumir que está verificado para no bloquear la app
          setEmailVerified(true);
        } finally {
          setCheckingVerification(false);
        }
      } else {
        setCheckingVerification(false);
      }
    };

    checkEmailVerification();
  }, [isAuthenticated, user]);

  // FORZAR AUTENTICACIÓN: Si no está autenticado, no mostrar nada
  // Esto permite que el Authenticator de nivel superior maneje la autenticación
  if (!isAuthenticated) {
    return null; // El Authenticator principal se encargará de mostrar el login
  }

  // Mostrar loading mientras verificamos el estado del email
  if (checkingVerification) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontSize: '1.2rem',
        color: '#667eea'
      }}>
        Cargando...
      </div>
    );
  }

  // Si el email no está verificado y el usuario no ha elegido omitir, mostrar el prompt
  if (!emailVerified && showVerificationPrompt) {
    return (
      <EmailVerificationPrompt 
        user={user} 
        onSkip={() => setShowVerificationPrompt(false)}
      />
    );
  }

  // Si está autenticado, mostrar el dashboard con sidebar
  return (
    <LayoutWithSidebar user={user} userPermissions={userPermissions}>
      <Routes>
        <Route path="/" element={<Dashboard userPermissions={userPermissions} user={user} />} />
        <Route path="/dashboard" element={<Dashboard userPermissions={userPermissions} user={user} />} />
        <Route path="/busqueda-empleados" element={<BusquedaEmpleados />} />
        <Route path="/demografico" element={<Demografico />} />
        <Route path="/fpl" element={<FPL />} />
        <Route path="/simulador-creditos" element={<SimuladorCreditos />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/subir" element={<UploadDataBase />} />
        <Route path="/home" element={<Home userPermissions={userPermissions} user={user} />} />
        <Route path="/profile" element={<UserProfile />} />
        {/* Rutas del perfil de empleado */}
        <Route path="/perfil/:rfc" element={<EmployeeProfile />} />
        <Route path="/perfil/:rfc/fpl" element={<EmployeeProfile />} />
        <Route path="/perfil/:rfc/historico" element={<EmployeeProfile />} />
        <Route path="/perfil/:rfc/documentos" element={<EmployeeProfile />} />
      </Routes>
    </LayoutWithSidebar>
  );
};

export default AppRouter;

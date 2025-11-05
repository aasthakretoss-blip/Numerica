import React, { useEffect } from 'react';
import AppRouter from './components/AppRouter';
import { ThemeProvider } from './contexts/ThemeContext';
import { initializeDefaultVariables } from './styles/CSSVariables';
import './App.css';

function App({ userPermissions, user }) {
  // Inicializar variables CSS al montar la app
  useEffect(() => {
    initializeDefaultVariables();
  }, []);

  return (
    <ThemeProvider>
      <AppRouter userPermissions={userPermissions} user={user} />
    </ThemeProvider>
  );
}

export default App;

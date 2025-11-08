import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import AuthenticatedApp from './components/AuthenticatedApp.jsx';
import SignUp from './pages/SignUp.jsx';
import GlobalStyles from './styles/GlobalStyles';
import { initializeDefaultVariables } from './styles/CSSVariables';
import reportWebVitals from './reportWebVitals';
import { Amplify } from 'aws-amplify';
import awsConfig from './aws-exports';

// Configurar Amplify
Amplify.configure(awsConfig);
console.log('✅ AWS Amplify configurado correctamente', awsConfig);

// 🎨 Aplicar tokens de color como variables CSS
initializeDefaultVariables();

// 🔍 Verificar tokens en modo desarrollo
if (process.env.NODE_ENV === 'development') {
  // Importar y ejecutar verificador después de que la app se monte
  setTimeout(() => {
    import('./utils/verifyColorTokens').then(({ runFullVerification }) => {
      runFullVerification();
    });
  }, 2000);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GlobalStyles />
    <Router>
      <Routes>
        {/* Ruta pública de registro */}
        <Route path="/signup" element={<SignUp />} />
        
        {/* Todas las demás rutas requieren autenticación */}
        <Route path="/*" element={
          <AuthenticatedApp>
            <App />
          </AuthenticatedApp>
        } />
      </Routes>
    </Router>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

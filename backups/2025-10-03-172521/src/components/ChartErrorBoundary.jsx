import React from 'react';
import styled from 'styled-components';
import { FaExclamationTriangle, FaChartLine } from 'react-icons/fa';

const ErrorContainer = styled.div`
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  margin: 1rem 0;
`;

const ErrorIcon = styled.div`
  color: #ff6b6b;
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const ErrorTitle = styled.h3`
  color: #ff6b6b;
  font-size: 1.2rem;
  margin: 0 0 1rem 0;
`;

const ErrorMessage = styled.p`
  color: rgba(255, 107, 107, 0.8);
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
`;

const RetryButton = styled.button`
  background: rgba(255, 107, 107, 0.2);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  color: #ff6b6b;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 107, 107, 0.3);
    transform: translateY(-2px);
  }
`;

class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chart Error:', error, errorInfo);
    
    // Check if it's the specific Chart.js bar controller error
    const isBarControllerError = error.message && error.message.includes('bar') && error.message.includes('registered controller');
    
    if (isBarControllerError) {
      console.error('🚨 Chart.js Bar Controller Error - This will be fixed in the next deployment');
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isBarControllerError = this.state.error && 
        this.state.error.message && 
        this.state.error.message.includes('bar') && 
        this.state.error.message.includes('registered controller');

      return (
        <ErrorContainer>
          <ErrorIcon>
            {isBarControllerError ? <FaChartLine /> : <FaExclamationTriangle />}
          </ErrorIcon>
          <ErrorTitle>
            {isBarControllerError 
              ? 'Gráfica Temporalmente No Disponible' 
              : 'Error en la Gráfica'
            }
          </ErrorTitle>
          <ErrorMessage>
            {isBarControllerError 
              ? 'La gráfica de amortización no está disponible temporalmente. El simulador funciona correctamente sin la gráfica.'
              : 'Ha ocurrido un error al mostrar la gráfica.'
            }
          </ErrorMessage>
          <RetryButton onClick={this.handleRetry}>
            Intentar de Nuevo
          </RetryButton>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ChartErrorBoundary;

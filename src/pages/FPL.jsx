import React from 'react';
import styled from 'styled-components';

const PageContainer = styled.div`
  padding: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
`;

const PageHeader = styled.div`
  text-align: center;
  width: 100%;
  padding: 0.5rem 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
`;

const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 300;
  margin: 0;
  color: #2c3e50;
  letter-spacing: 1px;
  
  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

const PDFContainer = styled.div`
  width: 100vw;
  background: white;
  overflow: hidden;
  flex: 1;
  height: 0;
`;

const PDFIframe = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
`;

const FallbackMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
  color: #666;
`;

const DownloadLink = styled.a`
  display: inline-block;
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: #1a365d;  /* Azul marino oficial */
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 500;
  transition: background-color 0.2s;
  
  &:hover {
    background: #2c5282;  /* Azul marino más claro para hover */
  }
`;

const ErrorMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
  color: #666;
  background: #f8f9fa;
`;

const FPL = () => {
  const [pdfError, setPdfError] = React.useState(false);

  const handlePdfError = () => {
    setPdfError(true);
  };

  return (
    <PageContainer>

      
      <PDFContainer>
        {pdfError ? (
          <ErrorMessage>
            <h3>No se puede mostrar el PDF</h3>
            <p>Tu navegador no soporta la visualización de PDFs integrada.</p>
            <DownloadLink 
              href="/BeneficiosFPL.pdf" 
              download
              target="_blank"
            >
              Descargar PDF
            </DownloadLink>
          </ErrorMessage>
        ) : (
          <PDFIframe 
            src="/BeneficiosFPL.pdf#navpanes=0&scrollbar=0&toolbar=0&statusbar=0&messages=0&view=FitH" 
            title="Beneficios FPL"
            onError={handlePdfError}
            onLoad={(e) => {
              // Si el iframe no puede cargar el PDF, mostrar fallback
              if (e.target.contentDocument === null) {
                handlePdfError();
              }
            }}
          />
        )}
      </PDFContainer>
    </PageContainer>
  );
};

export default FPL;


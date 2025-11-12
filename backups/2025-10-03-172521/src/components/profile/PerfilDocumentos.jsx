import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTheme } from '../../contexts/ThemeContext';
import MenuPerfil from '../MenuPerfil';
import { FiSearch, FiDownload, FiFile, FiRefreshCw, FiEye } from 'react-icons/fi';

const PerfilContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  
  @media (max-width: 768px) {
    gap: 1.5rem;
  }
`;

const ContentContainer = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.strong || 'blur(20px)'};
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.light || 'rgba(255, 255, 255, 0.2)'};
  margin: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    gap: 1.5rem;
  }
`;

const FieldsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  align-items: start;
  
  @media (max-width: 768px) {
    gap: 1.5rem;
  }
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const FieldLabel = styled.label`
  color: ${props => props.theme?.text?.secondary || 'rgba(255, 255, 255, 0.9)'};
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const TextBox = styled.input`
  background: ${props => props.theme?.surfaces?.dark?.medium || 'rgba(184, 184, 184, 0.2)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.medium || 'blur(15px)'};
  border: 1px solid ${props => props.theme?.surfaces?.borders?.subtle || 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  padding: 0.75rem 1rem;
  color: ${props => props.theme?.text?.secondary || 'rgba(255, 255, 255, 0.9)'};
  font-size: 0.9rem;
  font-weight: 500;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.3s ease'};
  box-shadow: ${props => props.theme?.effects?.shadows?.subtle || '0 2px 4px rgba(0, 0, 0, 0.1)'};
  width: 100%;
  box-sizing: border-box;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme?.brand?.primary || '#a8edea'};
    box-shadow: ${props => props.theme?.effects?.focusRing || '0 0 0 3px rgba(168, 237, 234, 0.2)'};
    background: ${props => props.theme?.surfaces?.inputs?.focus || 'rgba(255, 255, 255, 0.15)'};
  }
  
  &:read-only {
    background: ${props => props.theme?.surfaces?.dark?.subtle || 'rgba(0, 0, 0, 0.1)'};
    cursor: default;
  }
  
  &::placeholder {
    color: ${props => props.theme?.text?.subtle || 'rgba(255, 255, 255, 0.6)'};
  }
`;

// Nuevos componentes para búsqueda y visualización de documentos
const SearchSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
`;

const SearchControls = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }
`;

const SearchButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${props => props.theme?.brand?.primary || '#a8edea'};
  color: ${props => props.theme?.text?.dark || '#1a1a1a'};
  border: none;
  border-radius: 12px;
  padding: 0.75rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.3s ease'};
  box-shadow: ${props => props.theme?.effects?.shadows?.subtle || '0 2px 4px rgba(0, 0, 0, 0.1)'};
  white-space: nowrap;
  
  &:hover {
    background: ${props => props.theme?.brand?.primaryHover || '#98e8e5'};
    transform: translateY(-1px);
    box-shadow: ${props => props.theme?.effects?.shadows?.medium || '0 4px 8px rgba(0, 0, 0, 0.15)'};
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  svg {
    font-size: 1rem;
  }
`;

const DocumentsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
`;

const DocumentCard = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.light || 'rgba(255, 255, 255, 0.1)'};
  backdrop-filter: ${props => props.theme?.effects?.blur?.medium || 'blur(15px)'};
  border: 1px solid ${props => props.theme?.surfaces?.borders?.subtle || 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  padding: 1rem;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.3s ease'};
  
  &:hover {
    background: ${props => props.theme?.surfaces?.glass?.medium || 'rgba(255, 255, 255, 0.15)'};
    border-color: ${props => props.theme?.brand?.primary || '#a8edea'};
    transform: translateY(-1px);
    box-shadow: ${props => props.theme?.effects?.shadows?.medium || '0 4px 8px rgba(0, 0, 0, 0.15)'};
  }
`;

const DocumentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const DocumentTitle = styled.h3`
  color: ${props => props.theme?.text?.primary || '#ffffff'};
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  svg {
    color: ${props => props.theme?.brand?.primary || '#a8edea'};
  }
`;

const DocumentActions = styled.div`
  display: flex;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-end;
  }
`;

const ActionButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !['variant'].includes(prop),
})`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: ${props => props.variant === 'primary' 
    ? (props.theme?.brand?.primary || '#a8edea')
    : (props.theme?.surfaces?.dark?.medium || 'rgba(184, 184, 184, 0.2)')
  };
  color: ${props => props.variant === 'primary' 
    ? (props.theme?.text?.dark || '#1a1a1a')
    : (props.theme?.text?.secondary || 'rgba(255, 255, 255, 0.9)')
  };
  border: 1px solid ${props => props.theme?.surfaces?.borders?.subtle || 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: ${props => props.theme?.effects?.states?.transition || 'all 0.3s ease'};
  white-space: nowrap;
  
  &:hover {
    background: ${props => props.variant === 'primary' 
      ? (props.theme?.brand?.primaryHover || '#98e8e5')
      : (props.theme?.surfaces?.dark?.light || 'rgba(255, 255, 255, 0.1)')
    };
    transform: translateY(-1px);
    box-shadow: ${props => props.theme?.effects?.shadows?.subtle || '0 2px 4px rgba(0, 0, 0, 0.1)'};
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  svg {
    font-size: 0.9rem;
  }
`;

const DocumentInfo = styled.div`
  color: ${props => props.theme?.text?.subtle || 'rgba(255, 255, 255, 0.7)'};
  font-size: 0.8rem;
  line-height: 1.4;
  margin-bottom: 0.75rem;
`;

const PDFViewer = styled.div`
  width: 100%;
  height: 600px;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.subtle || 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  overflow: hidden;
  margin-top: 1rem;
  background: ${props => props.theme?.surfaces?.dark?.subtle || 'rgba(0, 0, 0, 0.1)'};
  
  iframe {
    width: 100%;
    height: 100%;
    border: none;
    border-radius: inherit;
  }
  
  @media (max-width: 768px) {
    height: 400px;
  }
`;

const StatusMessage = styled.div`
  padding: 1rem;
  border-radius: 12px;
  text-align: center;
  font-size: 0.9rem;
  background: ${props => {
    if (props.type === 'loading') return props.theme?.surfaces?.info?.medium || 'rgba(168, 237, 234, 0.1)';
    if (props.type === 'error') return props.theme?.surfaces?.error?.medium || 'rgba(255, 99, 99, 0.1)';
    if (props.type === 'success') return props.theme?.surfaces?.success?.medium || 'rgba(99, 255, 132, 0.1)';
    return props.theme?.surfaces?.dark?.subtle || 'rgba(0, 0, 0, 0.1)';
  }};
  border: 1px solid ${props => {
    if (props.type === 'loading') return props.theme?.brand?.primary || '#a8edea';
    if (props.type === 'error') return props.theme?.colors?.error || '#ff6363';
    if (props.type === 'success') return props.theme?.colors?.success || '#63ff84';
    return props.theme?.surfaces?.borders?.subtle || 'rgba(255, 255, 255, 0.1)';
  }};
  color: ${props => {
    if (props.type === 'loading') return props.theme?.brand?.primary || '#a8edea';
    if (props.type === 'error') return props.theme?.colors?.error || '#ff6363';
    if (props.type === 'success') return props.theme?.colors?.success || '#63ff84';
    return props.theme?.text?.secondary || 'rgba(255, 255, 255, 0.9)';
  }};
  
  svg {
    margin-right: 0.5rem;
    font-size: 1rem;
    ${props => props.type === 'loading' && 'animation: spin 2s linear infinite;'}
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const PerfilDocumentos = ({ rfc }) => {
  const [nombreData, setNombreData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [searchingDocuments, setSearchingDocuments] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [downloadingDocument, setDownloadingDocument] = useState(null);
  const [searchMessage, setSearchMessage] = useState('');
  const theme = useTheme();

  // El parámetro rfc es en realidad el CURP
  const curpFromURL = rfc;

  // Función para buscar documentos en Google Drive
  const searchDocuments = async () => {
    if (!nombreData?.nombreCompleto) {
      setSearchMessage('Debe tener un nombre completo válido para buscar documentos');
      return;
    }
    
    setSearchingDocuments(true);
    setSearchMessage('');
    setDocuments([]);
    setSelectedDocument(null);
    
    try {
      console.log('🔍 Buscando documentos para empleado:', nombreData.nombreCompleto);
      
      const response = await fetch(
        `http://numericaapi.kretosstechnology.com/api/documents/search-by-name?employeeName=${encodeURIComponent(nombreData.nombreCompleto)}`
      );
      
      if (!response.ok) {
        throw new Error('Error al buscar documentos');
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Encontrados ${result.files.length} documentos`);
        setDocuments(result.files);
        
        if (result.files.length === 0) {
          setSearchMessage('No se encontraron documentos PDF para este empleado');
        } else {
          setSearchMessage(`Se encontraron ${result.files.length} documento(s)`);
        }
      } else {
        throw new Error(result.error || 'Error desconocido al buscar documentos');
      }
    } catch (error) {
      console.error('❌ Error buscando documentos:', error);
      setSearchMessage(`Error: ${error.message}`);
      setDocuments([]);
    } finally {
      setSearchingDocuments(false);
    }
  };
  
  // Función para obtener URL de descarga y mostrar PDF
  const viewDocument = async (document) => {
    try {
      console.log('👀 Obteniendo URL de vista previa para:', document.name);
      setSelectedDocument({ ...document, loading: true });
      
      const response = await fetch(
        `http://numericaapi.kretosstechnology.com/api/documents/download/${document.id}`
      );
      
      if (!response.ok) {
        throw new Error('Error al obtener URL de visualización');
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ URL de visualización obtenida');
        setSelectedDocument({ 
          ...document, 
          viewUrl: result.downloadUrl,
          loading: false 
        });
      } else {
        throw new Error(result.error || 'Error obteniendo URL');
      }
    } catch (error) {
      console.error('❌ Error obteniendo URL de visualización:', error);
      setSelectedDocument({ 
        ...document, 
        error: error.message,
        loading: false 
      });
    }
  };
  
  // Función para descargar documento
  const downloadDocument = async (documentFile) => {
    try {
      console.log('📥 Iniciando descarga para:', documentFile.name);
      setDownloadingDocument(documentFile.id);
      
      const response = await fetch(
        `http://numericaapi.kretosstechnology.com/api/documents/download/${documentFile.id}`
      );
      
      if (!response.ok) {
        throw new Error('Error al obtener URL de descarga');
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Iniciando descarga desde:', result.downloadUrl);
        
        // Crear link temporal para descarga
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = documentFile.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ Descarga iniciada exitosamente');
      } else {
        throw new Error(result.error || 'Error obteniendo URL de descarga');
      }
    } catch (error) {
      console.error('❌ Error descargando documento:', error);
      alert(`Error al descargar: ${error.message}`);
    } finally {
      setDownloadingDocument(null);
    }
  };
  
  // Obtener nombre completo desde CURP
  useEffect(() => {
    const fetchNombreCompleto = async () => {
      if (!curpFromURL) return;
      
      setLoading(true);
      try {
        console.log('🔍 Buscando nombre completo para CURP:', curpFromURL);
        
        const response = await fetch(`http://numericaapi.kretosstechnology.com/api/payroll/name-from-curp?curp=${encodeURIComponent(curpFromURL)}`);
        
        if (!response.ok) {
          throw new Error('Error al obtener nombre completo');
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          console.log('✅ Nombre completo obtenido:', result.data.nombreCompleto);
          setNombreData(result.data);
        } else {
          console.log('⚠️ No se encontró nombre completo para CURP:', curpFromURL);
          setNombreData(null);
        }
      } catch (error) {
        console.error('❌ Error obteniendo nombre completo:', error);
        setNombreData(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNombreCompleto();
  }, [curpFromURL]);
  
  // Auto-buscar documentos cuando se obtiene el nombre
  useEffect(() => {
    if (nombreData?.nombreCompleto && !searchingDocuments && documents.length === 0) {
      searchDocuments();
    }
  }, [nombreData]);

  return (
    <PerfilContainer>
      {/* Barra superior de navegación */}
      <MenuPerfil rfc={rfc} />
      
      {/* Contenido principal con textbox de nombre completo */}
      <ContentContainer>
        <FieldsContainer>
          <FieldGroup>
            <FieldLabel>Nombre Completo del Empleado</FieldLabel>
            <TextBox
              type="text"
              value={loading ? 'Obteniendo nombre...' : (nombreData?.nombreCompleto || 'Nombre no encontrado')}
              readOnly
              placeholder="Nombre completo del empleado"
              title="Nombre completo obtenido desde el CURP del empleado"
            />
          </FieldGroup>
        </FieldsContainer>
        
        {/* Sección de búsqueda de documentos */}
        <SearchSection>
          <FieldLabel>Documentos del Empleado</FieldLabel>
          
          <SearchControls>
            <SearchButton
              onClick={searchDocuments}
              disabled={loading || searchingDocuments || !nombreData?.nombreCompleto}
            >
              {searchingDocuments ? (
                <><FiRefreshCw /> Buscando...</>
              ) : (
                <><FiSearch /> Buscar Documentos</>
              )}
            </SearchButton>
            
            {searchMessage && (
              <StatusMessage 
                type={documents.length > 0 ? 'success' : searchingDocuments ? 'loading' : 'error'}
              >
                {searchingDocuments && <FiRefreshCw />}
                {searchMessage}
              </StatusMessage>
            )}
          </SearchControls>
          
          {/* Lista de documentos encontrados */}
          {documents.length > 0 && (
            <DocumentsContainer>
              {documents.map((doc) => (
                <DocumentCard key={doc.id}>
                  <DocumentHeader>
                    <DocumentTitle>
                      <FiFile /> {doc.name}
                    </DocumentTitle>
                    
                    <DocumentActions>
                      <ActionButton
                        variant="primary"
                        onClick={() => viewDocument(doc)}
                        disabled={selectedDocument?.loading}
                      >
                        <FiEye /> Ver
                      </ActionButton>
                      
                      <ActionButton
                        onClick={() => downloadDocument(doc)}
                        disabled={downloadingDocument === doc.id}
                      >
                        {downloadingDocument === doc.id ? (
                          <><FiRefreshCw /> Descargando...</>
                        ) : (
                          <><FiDownload /> Descargar</>
                        )}
                      </ActionButton>
                    </DocumentActions>
                  </DocumentHeader>
                  
                  <DocumentInfo>
                    <strong>Tamaño:</strong> {doc.size ? `${(doc.size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}<br />
                    <strong>Tipo:</strong> {doc.mimeType || 'application/pdf'}<br />
                    <strong>Modificado:</strong> {doc.modifiedTime ? new Date(doc.modifiedTime).toLocaleDateString() : 'N/A'}
                  </DocumentInfo>
                  
                  {/* Visor PDF si este documento está seleccionado */}
                  {selectedDocument?.id === doc.id && (
                    <>
                      {selectedDocument.loading && (
                        <StatusMessage type="loading">
                          <FiRefreshCw /> Cargando vista previa...
                        </StatusMessage>
                      )}
                      
                      {selectedDocument.error && (
                        <StatusMessage type="error">
                          Error cargando vista previa: {selectedDocument.error}
                        </StatusMessage>
                      )}
                      
                      {selectedDocument.viewUrl && !selectedDocument.loading && !selectedDocument.error && (
                        <PDFViewer>
                          <iframe
                            src={`${selectedDocument.viewUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                            title={`Vista previa de ${doc.name}`}
                            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                          />
                        </PDFViewer>
                      )}
                    </>
                  )}
                </DocumentCard>
              ))}
            </DocumentsContainer>
          )}
          
          {/* Mensaje cuando no hay documentos y no se está buscando */}
          {documents.length === 0 && !searchingDocuments && nombreData?.nombreCompleto && searchMessage && (
            <StatusMessage type="error">
              No se encontraron documentos PDF para {nombreData.nombreCompleto}
            </StatusMessage>
          )}
        </SearchSection>
      </ContentContainer>
    </PerfilContainer>
  );
};

export default PerfilDocumentos;

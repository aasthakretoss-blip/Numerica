import React, { useState, useRef } from 'react';
import styled, { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';
import { FaUpload, FaFileExcel, FaTimes, FaCheck, FaSpinner, FaDatabase } from 'react-icons/fa';
import { 
  brandColors, 
  semanticColors, 
  surfaces, 
  gradients, 
  textColors, 
  effects,
  getStateColors 
} from '../styles/ColorTokens';

const Container = styled.div`
  padding: 2rem;
  background: ${props => props.theme?.surfaces?.glass?.medium || surfaces.glass.medium};
  backdrop-filter: ${props => props.theme?.effects?.blur?.strong || effects.blur.strong};
  border-radius: 20px;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.light || surfaces.borders.light};
  margin: 2rem;
  min-height: calc(100vh - 200px);
  transition: ${props => props.theme?.effects?.states?.transition || effects.states.transition};
`;

const Title = styled.h2`
  font-size: 2.8rem;
  font-weight: 300;
  margin: 0 0 2rem 0;
  letter-spacing: 1px;
  text-align: center;
  background: ${props => props.theme?.gradients?.text?.primary || gradients.text.primary};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const UploadSection = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.light || surfaces.glass.light};
  border: 2px dashed ${props => props.theme?.surfaces?.borders?.medium || surfaces.borders.medium};
  border-radius: 15px;
  padding: 3rem 2rem;
  text-align: center;
  margin-bottom: 2rem;
  transition: ${props => props.theme?.effects?.states?.transition || effects.states.transition};
  cursor: pointer;
  backdrop-filter: ${props => props.theme?.effects?.blur?.light || effects.blur.light};

  &:hover {
    border-color: ${props => props.theme?.surfaces?.borders?.accent || surfaces.borders.accent};
    background: ${props => props.theme?.surfaces?.glass?.medium || surfaces.glass.medium};
    transform: ${props => props.theme?.effects?.states?.hoverTransform || effects.states.hoverTransform};
  }

  &.dragover {
    border-color: ${props => props.theme?.surfaces?.borders?.accentStrong || surfaces.borders.accentStrong};
    background: ${props => props.theme?.surfaces?.glass?.strong || surfaces.glass.strong};
    box-shadow: ${props => props.theme?.effects?.shadows?.medium || effects.shadows.medium};
  }
`;

const UploadIcon = styled.div`
  font-size: 3rem;
  color: ${props => props.theme?.text?.accent || textColors.accent};
  margin-bottom: 1rem;
  transition: ${props => props.theme?.effects?.states?.transition || effects.states.transition};
`;

const UploadText = styled.p`
  color: ${props => props.theme?.text?.primary || textColors.primary};
  font-size: 1.2rem;
  margin-bottom: 1rem;
  font-weight: 500;
`;

const UploadSubtext = styled.p`
  color: ${props => props.theme?.text?.muted || textColors.muted};
  font-size: 0.9rem;
  margin: 0;
`;

const FileInput = styled.input`
  display: none;
`;

const PathSection = styled.div`
  margin-bottom: 2rem;
`;

const Label = styled.label`
  display: block;
  color: ${props => props.theme?.text?.primary || textColors.primary};
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

const PathInput = styled.input`
  width: 100%;
  padding: 1rem;
  background: ${props => props.theme?.surfaces?.inputs?.background || surfaces.inputs.background};
  border: 1px solid ${props => props.theme?.surfaces?.inputs?.border || surfaces.inputs.border};
  border-radius: 8px;
  color: ${props => props.theme?.text?.primary || textColors.primary};
  font-size: 0.9rem;
  transition: ${props => props.theme?.effects?.states?.transition || effects.states.transition};
  
  &::placeholder {
    color: ${props => props.theme?.text?.subtle || textColors.subtle};
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme?.surfaces?.borders?.accentStrong || surfaces.borders.accentStrong};
    background: ${props => props.theme?.surfaces?.inputs?.focus || surfaces.inputs.focus};
    box-shadow: ${props => props.theme?.effects?.states?.focusRing || effects.states.focusRing};
  }
`;

const FileInfo = styled.div`
  background: ${props => props.theme?.surfaces?.glass?.light || surfaces.glass.light};
  padding: 1.5rem;
  border-radius: 15px;
  margin-bottom: 2rem;
  border: 1px solid ${props => props.theme?.surfaces?.borders?.subtle || surfaces.borders.subtle};
  backdrop-filter: ${props => props.theme?.effects?.blur?.light || effects.blur.light};
  transition: ${props => props.theme?.effects?.states?.transition || effects.states.transition};
  
  &:hover {
    background: ${props => props.theme?.surfaces?.glass?.medium || surfaces.glass.medium};
  }
`;

const FileInfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  color: ${props => props.theme?.text?.primary || textColors.primary};

  &:last-child {
    margin-bottom: 0;
  }
`;

const FileInfoLabel = styled.span`
  font-weight: 500;
  color: ${props => props.theme?.text?.secondary || textColors.secondary};
`;

const FileInfoValue = styled.span`
  color: ${props => props.theme?.text?.accent || textColors.accent};
  font-weight: 600;
`;

const DetectedType = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${props => {
    if (props.type === 'nominas') {
      return props.theme?.semanticColors ? `rgba(${props.theme.semanticColors.success.slice(1).match(/../g).map(hex => parseInt(hex, 16)).join(', ')}, 0.2)` : `rgba(46, 204, 113, 0.2)`;
    }
    if (props.type === 'fondos') {
      return props.theme?.semanticColors ? `rgba(${props.theme.semanticColors.info.slice(1).match(/../g).map(hex => parseInt(hex, 16)).join(', ')}, 0.2)` : `rgba(3, 0, 92, 0.2)`;
    }
    return props.theme?.semanticColors ? `rgba(${props.theme.semanticColors.warning.slice(1).match(/../g).map(hex => parseInt(hex, 16)).join(', ')}, 0.2)` : `rgba(243, 156, 18, 0.2)`;
  }};
  border: 1px solid ${props => {
    if (props.type === 'nominas') {
      return props.theme?.semanticColors?.success || semanticColors.success;
    }
    if (props.type === 'fondos') {
      return props.theme?.semanticColors?.info || semanticColors.info;
    }
    return props.theme?.semanticColors?.warning || semanticColors.warning;
  }};
  border-radius: 20px;
  color: ${props => props.theme?.text?.primary || textColors.primary};
  font-size: 0.9rem;
  font-weight: 500;
  transition: ${props => props.theme?.effects?.states?.transition || effects.states.transition};
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
`;

const Button = styled.button`
  padding: 1rem 2rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: ${props => props.theme?.effects?.states?.transition || effects.states.transition};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  backdrop-filter: ${props => props.theme?.effects?.blur?.light || effects.blur.light};

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: ${props => props.theme?.surfaces?.buttons?.disabled || surfaces.buttons.disabled};
  }
`;

const UploadButton = styled(Button)`
  background: ${props => props.theme?.gradients?.buttons?.primary || gradients.buttons.primary};
  color: ${props => props.theme?.text?.primary || textColors.primary};
  box-shadow: ${props => props.theme?.effects?.shadows?.medium || effects.shadows.medium};

  &:hover:not(:disabled) {
    transform: ${props => props.theme?.effects?.states?.hoverTransform || effects.states.hoverTransform};
    box-shadow: ${props => props.theme?.effects?.shadows?.colored || effects.shadows.colored};
    opacity: 0.9;
  }
`;

const ClearButton = styled(Button)`
  background: ${props => props.theme?.surfaces?.buttons?.secondary || surfaces.buttons.secondary};
  color: ${props => props.theme?.text?.primary || textColors.primary};
  border: 1px solid ${props => props.theme?.surfaces?.borders?.medium || surfaces.borders.medium};

  &:hover:not(:disabled) {
    background: ${props => props.theme?.surfaces?.glass?.medium || surfaces.glass.medium};
    border-color: ${props => props.theme?.surfaces?.borders?.accent || surfaces.borders.accent};
    transform: ${props => props.theme?.effects?.states?.hoverTransform || effects.states.hoverTransform};
  }
`;

const StatusMessage = styled.div`
  padding: 1rem;
  border-radius: 12px;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  backdrop-filter: ${props => props.theme?.effects?.blur?.light || effects.blur.light};
  transition: ${props => props.theme?.effects?.states?.transition || effects.states.transition};

  &.success {
    background: ${props => {
      const successColor = props.theme?.semanticColors?.success || semanticColors.success;
      const hex = successColor.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, 0.2)`;
    }};
    border: 1px solid ${props => {
      const successColor = props.theme?.semanticColors?.success || semanticColors.success;
      const hex = successColor.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, 0.5)`;
    }};
    color: ${props => props.theme?.semanticColors?.success || semanticColors.success};
  }

  &.error {
    background: ${props => {
      const errorColor = props.theme?.semanticColors?.error || semanticColors.error;
      const hex = errorColor.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, 0.2)`;
    }};
    border: 1px solid ${props => {
      const errorColor = props.theme?.semanticColors?.error || semanticColors.error;
      const hex = errorColor.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, 0.5)`;
    }};
    color: ${props => props.theme?.semanticColors?.error || semanticColors.error};
  }

  &.info {
    background: ${props => {
      const infoColor = props.theme?.semanticColors?.info || semanticColors.info;
      const hex = infoColor.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, 0.2)`;
    }};
    border: 1px solid ${props => {
      const infoColor = props.theme?.semanticColors?.info || semanticColors.info;
      const hex = infoColor.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, 0.5)`;
    }};
    color: ${props => props.theme?.semanticColors?.info || semanticColors.info};
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const UploadDataBase = () => {
  const { theme } = useTheme();
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePath, setFilePath] = useState('');
  const [detectedType, setDetectedType] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const fileInputRef = useRef(null);

  // Columns for detection
  const NOMINAS_COLUMNS = [
    'RFC', 'Nombre completo', 'Puesto', 'Compañía', 'CURP', 'SDI', 'SUELDO', 'NETO A PAGAR'
  ];
  
  const FONDOS_COLUMNS = [
    'numrfc', 'nombre', 'cvecia', 'descripcion_cvecia', 'saldo_inicial', 'saldo_final'
  ];

  const handleFileSelect = (file) => {
    const supportedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'text/csv' // .csv
    ];
    
    if (file && supportedTypes.includes(file.type)) {
      setSelectedFile(file);
      setFilePath(file.name);
      validateFile(file);
    } else {
      setStatusMessage({
        type: 'error',
        message: 'Por favor selecciona un archivo Excel (.xlsx) o CSV (.csv)'
      });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const validateFile = async (file) => {
    setIsValidating(true);
    setStatusMessage(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/validate-file', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setDetectedType(result.type);
        setStatusMessage({
          type: 'success',
          message: `Archivo validado: Detectado como formato de ${result.type === 'nominas' ? 'Nóminas' : 'Fondos'}`
        });
      } else {
        setStatusMessage({
          type: 'error',
          message: result.message || 'Error al validar el archivo'
        });
        setDetectedType('unknown');
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: 'Error al conectar con el servidor'
      });
      setDetectedType('unknown');
    } finally {
      setIsValidating(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !detectedType || detectedType === 'unknown') {
      setStatusMessage({
        type: 'error',
        message: 'Por favor selecciona un archivo válido primero'
      });
      return;
    }

    setIsUploading(true);
    setStatusMessage({
      type: 'info',
      message: 'Subiendo archivo y validando datos...'
    });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', detectedType);
      
      const response = await fetch('/api/upload-data', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setStatusMessage({
          type: 'success',
          message: `¡Datos cargados exitosamente! ${result.recordsInserted} registros insertados, ${result.duplicatesSkipped || 0} duplicados omitidos.`
        });
        // Clear form after successful upload
        setTimeout(() => {
          clearForm();
        }, 3000);
      } else {
        setStatusMessage({
          type: 'error',
          message: result.message || 'Error al cargar los datos'
        });
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: 'Error al conectar con el servidor'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearForm = () => {
    setSelectedFile(null);
    setFilePath('');
    setDetectedType(null);
    setStatusMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <StyledThemeProvider theme={theme}>
      <Container>
        <Title>Sistema de Carga de Datos</Title>
        
        <UploadSection
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <UploadIcon>
            <FaFileExcel />
          </UploadIcon>
          <UploadText>
            Arrastra tu archivo Excel o CSV aquí o haz clic para seleccionar
          </UploadText>
          <UploadSubtext>
            Formatos soportados: .xlsx (Excel), .csv (CSV)
          </UploadSubtext>
          <FileInput
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
        </UploadSection>

        <PathSection>
          <Label>Ruta del archivo seleccionado:</Label>
          <PathInput
            type="text"
            value={filePath}
            readOnly
            placeholder="Ningún archivo seleccionado"
          />
        </PathSection>

        {selectedFile && (
          <FileInfo>
            <FileInfoRow>
              <FileInfoLabel>Nombre:</FileInfoLabel>
              <FileInfoValue>{selectedFile.name}</FileInfoValue>
            </FileInfoRow>
            <FileInfoRow>
              <FileInfoLabel>Tamaño:</FileInfoLabel>
              <FileInfoValue>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</FileInfoValue>
            </FileInfoRow>
            <FileInfoRow>
              <FileInfoLabel>Tipo:</FileInfoLabel>
              <FileInfoValue>{selectedFile.type}</FileInfoValue>
            </FileInfoRow>
            <FileInfoRow>
              <FileInfoLabel>Estado:</FileInfoLabel>
              {isValidating ? (
                <FileInfoValue>
                  <FaSpinner className="spin" /> Validando...
                </FileInfoValue>
              ) : detectedType ? (
                <DetectedType type={detectedType}>
                  <FaDatabase />
                  {detectedType === 'nominas' ? 'Nóminas' : 
                   detectedType === 'fondos' ? 'Fondos' : 'Formato no reconocido'}
                </DetectedType>
              ) : (
                <FileInfoValue>Pendiente validación</FileInfoValue>
              )}
            </FileInfoRow>
          </FileInfo>
        )}

        {statusMessage && (
          <StatusMessage className={statusMessage.type}>
            {statusMessage.type === 'success' && <FaCheck />}
            {statusMessage.type === 'error' && <FaTimes />}
            {statusMessage.type === 'info' && <FaSpinner className="spin" />}
            {statusMessage.message}
          </StatusMessage>
        )}

        <ButtonContainer>
          <UploadButton
            onClick={handleUpload}
            disabled={!selectedFile || detectedType === 'unknown' || isUploading || isValidating}
          >
            {isUploading ? <FaSpinner className="spin" /> : <FaUpload />}
            {isUploading ? 'Subiendo...' : 'Subir a Base de Datos'}
          </UploadButton>
          
          <ClearButton onClick={clearForm} disabled={isUploading}>
            <FaTimes />
            Limpiar
          </ClearButton>
        </ButtonContainer>
      </Container>
    </StyledThemeProvider>
  );
};

export default UploadDataBase;

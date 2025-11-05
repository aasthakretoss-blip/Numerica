import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaUser, FaSpinner, FaCalendarAlt, FaBuilding, FaIdCard, FaUserTie, FaClock } from 'react-icons/fa';

const DatosContainer = styled.div`
  width: 100%;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-radius: 15px;
  padding: 1.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  border: 2px solid #1e3a8a;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: linear-gradient(90deg, #1d4ed8, #1e3a8a, #3b82f6);
  }
  
  @media (max-width: 768px) {
    padding: 1.25rem;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);

  .icon {
    font-size: 2rem;
    color: #1e3a8a;
  }

  h2 {
    margin: 0;
    color: #2c3e50;
    font-size: 1.5rem;
    font-weight: 600;
  }
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
`;

const InfoField = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  padding: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #1e3a8a;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  }
  
  @media (max-width: 768px) {
    padding: 0.8rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: #495057;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    min-width: 140px;
    
    @media (max-width: 768px) {
      font-size: 0.8rem;
      min-width: auto;
    }
  }

  .value {
    font-size: 1.1rem;
    font-weight: 700;
    font-family: 'Arial', sans-serif;
    text-align: right;
    color: #1e3a8a;
    
    @media (max-width: 768px) {
      font-size: 1rem;
      text-align: left;
    }

    &.highlight {
      color: #1d4ed8;
    }

    &.status-active {
      color: #2ecc71;
    }

    &.status-inactive {
      color: #e74c3c;
    }
  }

  .icon {
    font-size: 0.9rem;
    opacity: 0.8;
  }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  color: rgba(44, 62, 80, 0.8);
  text-align: center;

  .spinner {
    font-size: 2rem;
    color: #1e3a8a;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const ErrorState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  color: rgba(44, 62, 80, 0.8);
  text-align: center;

  .icon {
    font-size: 3rem;
    color: #e74c3c;
    margin-bottom: 1rem;
    opacity: 0.7;
  }

  h3 {
    margin: 0 0 0.5rem 0;
    color: #e74c3c;
    font-size: 1.25rem;
  }

  p {
    margin: 0;
    opacity: 0.8;
  }
`;

const LastUpdateInfo = styled.div`
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  text-align: center;
  font-size: 0.8rem;
  color: rgba(44, 62, 80, 0.6);
  
  .timestamp {
    color: #1e3a8a;
    font-weight: 500;
  }
`;

// Función para calcular la antigüedad
const calcularAntiguedad = (fechaInicio) => {
  if (!fechaInicio) return 'N/A';
  
  const inicio = new Date(fechaInicio);
  const ahora = new Date();
  const diferencia = ahora - inicio;
  
  const años = Math.floor(diferencia / (1000 * 60 * 60 * 24 * 365.25));
  const meses = Math.floor((diferencia % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
  
  if (años > 0) {
    return meses > 0 ? `${años} años, ${meses} meses` : `${años} años`;
  } else {
    return meses > 0 ? `${meses} meses` : 'Menos de 1 mes';
  }
};

// Función para formatear fecha - solo muestra la fecha sin timestamp
const formatearFecha = (fecha) => {
  if (!fecha) return 'N/A';
  
  // Si es un timestamp ISO, extraer solo la parte de la fecha
  if (typeof fecha === 'string' && fecha.includes('T')) {
    fecha = fecha.split('T')[0]; // Tomar solo la parte antes de 'T'
  }
  
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const DatosEmpleado = ({ rfc, selectedCveper, onEmployeeDataLoaded }) => {
  const [empleado, setEmpleado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarDatosEmpleado = async () => {
      if (!rfc) {
        setError('CURP no proporcionado');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('🔍 Cargando datos para CURP:', rfc);
        
        // Usar el endpoint directo para percepciones con CURP
        const params = new URLSearchParams({
          curp: rfc, // El parámetro rfc realmente contiene el CURP
          pageSize: '1000',
          page: '1'
        });
        
        // Si hay cveper seleccionado, agregarlo
        if (selectedCveper && selectedCveper.length > 0) {
          // Si es un arreglo, tomar el primer elemento
          const cveperValue = Array.isArray(selectedCveper) ? selectedCveper[0] : selectedCveper;
          params.append('cveper', cveperValue);
        }
        
        const response = await fetch(`https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com/prod/api/percepciones?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar datos del empleado');
        }

        const result = await response.json();
        
        if (!result.success || !result.data || result.data.length === 0) {
          throw new Error('No se encontraron datos para el empleado con CURP: ' + rfc);
        }

        // Tomar el primer registro (ya filtrado por CURP y cveper si se especificó)
        const empleadoData = result.data[0];
        
        console.log('📊 Datos del empleado obtenidos:', {
          curp: rfc,
          totalRegistros: result.data.length,
          cveper: empleadoData.cveper || empleadoData['cveper'],
          nombreCompleto: empleadoData['Nombre completo']
        });
        
        console.log('🔍 Campos principales encontrados:', {
          rfc: empleadoData['RFC'],
          curp: empleadoData['CURP'],
          nombre: empleadoData['Nombre completo'],
          puesto: empleadoData['Puesto'],
          compania: empleadoData['Compañía'],
          cveper: empleadoData.cveper || empleadoData['cveper']
        });
        
        // Mapear datos usando los nombres exactos de la base historico_nominas_gsau
        const datosEmpleado = {
          nombreCompleto: empleadoData['Nombre completo'] || 'No disponible',
          puesto: empleadoData['Puesto'] || 'No disponible',
          curp: empleadoData['CURP'] || empleadoData['RFC'] || rfc,
          rfc: empleadoData['RFC'] || 'No disponible',
          claveTrabajador: empleadoData['Clave trabajador'] || 'No disponible',
          compania: empleadoData['Compañía'] || 'No disponible',
          periodicidad: empleadoData['Periodicidad'] || 'No disponible',
          status: empleadoData['Status'] || 'No disponible',
          numeroIMSS: empleadoData['Número IMSS'] || 'No disponible',
          fechaAntiguedad: empleadoData['Fecha antigüedad'] || null,
          antiguedadFPL: empleadoData['Fecha baja'] || null,
          cveper: empleadoData.cveper || empleadoData['cveper'] || null,
          ultimaActualizacion: new Date().toISOString()
        };

        console.log('✅ Datos del empleado transformados:', {
          curpBuscado: rfc,
          empleadoEncontrado: datosEmpleado.nombreCompleto,
          totalRegistros: result.data.length,
          cveper: datosEmpleado.cveper
        });

        setEmpleado(datosEmpleado);
        
        // Notificar el CURP y los datos completos al componente padre
        if (onEmployeeDataLoaded && datosEmpleado.curp) {
          onEmployeeDataLoaded(datosEmpleado.curp, datosEmpleado);
        }
        
      } catch (err) {
        console.error('Error loading employee data:', err);
        setError('No se pudieron cargar los datos del empleado');
      } finally {
        setLoading(false);
      }
    };

    cargarDatosEmpleado();
  }, [rfc, selectedCveper]);

  if (loading) {
    return (
      <DatosContainer>
        <LoadingState>
          <FaSpinner className="spinner" />
          <p>Cargando datos del empleado...</p>
        </LoadingState>
      </DatosContainer>
    );
  }

  if (error) {
    return (
      <DatosContainer>
        <ErrorState>
          <FaUser className="icon" />
          <h3>Error al cargar datos</h3>
          <p>{error}</p>
        </ErrorState>
      </DatosContainer>
    );
  }

  return (
    <DatosContainer>
      <Header>
        <FaUser className="icon" />
        <h2>Datos del Empleado</h2>
      </Header>

      <InfoGrid>
        <InfoField>
          <div className="label">
            <FaUser className="icon" />
            Nombre Completo
          </div>
          <div className="value highlight">{empleado.nombreCompleto}</div>
        </InfoField>

        <InfoField>
          <div className="label">
            <FaUserTie className="icon" />
            Puesto
          </div>
          <div className="value">{empleado.puesto}</div>
        </InfoField>

        <InfoField>
          <div className="label">
            <FaIdCard className="icon" />
            CURP
          </div>
          <div className="value">{empleado.curp}</div>
        </InfoField>

        <InfoField>
          <div className="label">
            <FaIdCard className="icon" />
            Clave Trabajador
          </div>
          <div className="value">{empleado.claveTrabajador}</div>
        </InfoField>

        <InfoField>
          <div className="label">
            <FaBuilding className="icon" />
            Compañía
          </div>
          <div className="value">{empleado.compania}</div>
        </InfoField>

        <InfoField>
          <div className="label">
            <FaClock className="icon" />
            Periodicidad
          </div>
          <div className="value">{empleado.periodicidad}</div>
        </InfoField>

        <InfoField>
          <div className="label">
            <FaUser className="icon" />
            Status
          </div>
          <div className={`value ${empleado.status === 'Activo' ? 'status-active' : 'status-inactive'}`}>
            {empleado.status}
          </div>
        </InfoField>

        <InfoField>
          <div className="label">
            <FaIdCard className="icon" />
            Número IMSS
          </div>
          <div className="value">{empleado.numeroIMSS}</div>
        </InfoField>

        <InfoField>
          <div className="label">
            <FaCalendarAlt className="icon" />
            Fecha Antigüedad
          </div>
          <div className="value">{formatearFecha(empleado.fechaAntiguedad)}</div>
        </InfoField>

        <InfoField>
          <div className="label">
            <FaClock className="icon" />
            Antigüedad Total
          </div>
          <div className="value">{calcularAntiguedad(empleado.fechaAntiguedad)}</div>
        </InfoField>

        <InfoField>
          <div className="label">
            <FaCalendarAlt className="icon" />
            Antigüedad en FPL
          </div>
          <div className="value">{calcularAntiguedad(empleado.antiguedadFPL)}</div>
        </InfoField>

        <InfoField>
          <div className="label">
            <FaCalendarAlt className="icon" />
            CVEPER
          </div>
          <div className="value highlight">{formatearFecha(empleado.cveper)}</div>
        </InfoField>
      </InfoGrid>

      <LastUpdateInfo>
        Datos del último registro disponible - 
        <span className="timestamp"> {formatearFecha(empleado.ultimaActualizacion)}</span>
      </LastUpdateInfo>
    </DatosContainer>
  );
};

export default DatosEmpleado;

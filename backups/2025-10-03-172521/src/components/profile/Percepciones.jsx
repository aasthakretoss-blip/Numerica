import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaMoneyBillWave, FaSpinner, FaCalculator, FaClock, FaCoffee, FaGift } from 'react-icons/fa';

const PercepcionesContainer = styled.div`
  width: 100%;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-radius: 15px;
  padding: 1.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  border: 2px solid #1e3a8a;
  position: relative;
  min-height: 800px;
  overflow: visible;
  
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

    &.money {
      color: #16a34a;
      font-family: 'Courier New', monospace;
    }

    &.zero {
      color: #6b7280;
      opacity: 0.7;
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

// Función para formatear montos en pesos mexicanos
const formatearMonto = (monto) => {
  if (!monto || monto === 0) return '$0.00';
  
  // Convertir a número si es string
  const numero = typeof monto === 'string' ? parseFloat(monto) : monto;
  
  if (isNaN(numero)) return '$0.00';
  
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(numero);
};

// Función para obtener el ícono según el tipo de percepción
const obtenerIconoPercepcion = (tipo) => {
  switch (tipo) {
    case 'sueldo':
    case 'salario':
      return <FaMoneyBillWave />;
    case 'comision':
      return <FaCalculator />;
    case 'tiempo':
    case 'horas':
      return <FaClock />;
    case 'despensa':
    case 'vales':
      return <FaCoffee />;
    case 'bono':
    case 'premio':
      return <FaGift />;
    default:
      return <FaMoneyBillWave />;
  }
};

const Percepciones = ({ curp, selectedCveper }) => {
  const [percepciones, setPercepciones] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarPercepciones = async () => {
      if (!curp) {
        setError('CURP no proporcionado');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('🔍 Cargando percepciones:', { curp, selectedCveper });

        // Construir parámetros para la consulta
        const params = new URLSearchParams({
          curp: curp,
          pageSize: '10',
          page: '1'
        });

        // Si hay cveper seleccionado, agregarlo como filtro
        if (selectedCveper) {
          params.append('cveper', selectedCveper); // Usar 'cveper' que es lo que espera el backend
        }

        const response = await fetch(`https://numerica-2.onrender.com/api/percepciones?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar percepciones del empleado');
        }

        const result = await response.json();
        
        if (!result.success || !result.data || result.data.length === 0) {
          throw new Error('No se encontraron datos de percepciones para el empleado');
        }

        // Tomar el primer registro (el más reciente si está ordenado)
        const percepcionData = result.data[0];

  console.log('✅ Datos de percepciones cargados:', percepcionData);
        console.log('📊 Total de campos en los datos:', Object.keys(percepcionData).length);
        console.log('💰 Campos de percepciones encontrados:', Object.keys(percepcionData).filter(key => key.trim().length > 5));

        setPercepciones({
          ...percepcionData,
          ultimaActualizacion: new Date().toISOString()
        });
        
      } catch (err) {
        console.error('Error loading percepciones data:', err);
        setError('No se pudieron cargar los datos de percepciones');
      } finally {
        setLoading(false);
      }
    };

    cargarPercepciones();
  }, [curp, selectedCveper]);

  if (loading) {
    return (
      <PercepcionesContainer>
        <LoadingState>
          <FaSpinner className="spinner" />
          <p>Cargando percepciones del empleado...</p>
        </LoadingState>
      </PercepcionesContainer>
    );
  }

  if (error) {
    return (
      <PercepcionesContainer>
        <ErrorState>
          <FaMoneyBillWave className="icon" />
          <h3>Error al cargar percepciones</h3>
          <p>{error}</p>
        </ErrorState>
      </PercepcionesContainer>
    );
  }

  console.log('🎯 Renderizando componente Percepciones con', percepciones ? 'datos' : 'sin datos');
  console.log('🔢 Intentando renderizar aproximadamente 25 campos de percepciones');

  return (
    <PercepcionesContainer>
      <Header>
        <FaMoneyBillWave className="icon" />
        <h2>Percepciones</h2>
      </Header>

      <InfoGrid>
        {/* SDI y campos relacionados */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('salario')}
            SDI
          </div>
          <div className={`value money ${!percepciones?.[' SDI '] || percepciones[' SDI '] == 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' SDI '])}
          </div>
        </InfoField>

        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('salario')}
            SDI ES
          </div>
          <div className={`value money ${!percepciones?.[' sdi_es '] || percepciones[' sdi_es '] == 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' sdi_es '])}
          </div>
        </InfoField>

        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('salario')}
            SD
          </div>
          <div className={`value money ${!percepciones?.[' SD '] || percepciones[' SD '] == 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' SD '])}
          </div>
        </InfoField>

        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('salario')}
            SDIM
          </div>
          <div className={`value money ${!percepciones?.[' sdim '] || percepciones[' sdim '] == 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' sdim '])}
          </div>
        </InfoField>

        {/* Sueldos */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('sueldo')}
            Sueldo Cliente
          </div>
          <div className={`value money ${!percepciones?.[' SUELDO CLIENTE '] || percepciones[' SUELDO CLIENTE '] == 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' SUELDO CLIENTE '])}
          </div>
        </InfoField>

        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('sueldo')}
            Sueldo
          </div>
          <div className={`value money ${!percepciones?.[' SUELDO '] || percepciones[' SUELDO '] == 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' SUELDO '])}
          </div>
        </InfoField>

        {/* Comisiones */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('comision')}
            Comisiones Cliente
          </div>
          <div className={`value money ${!percepciones?.[' COMISIONES CLIENTE '] || percepciones[' COMISIONES CLIENTE '] == 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' COMISIONES CLIENTE '])}
          </div>
        </InfoField>

        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('comision')}
            Comisiones Facturadas
          </div>
          <div className={`value money ${!percepciones?.[' COMISIONES FACTURADAS '] || percepciones[' COMISIONES FACTURADAS '] == 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' COMISIONES FACTURADAS '])}
          </div>
        </InfoField>

        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('comision')}
            Comisiones
          </div>
          <div className={`value money ${!percepciones?.[' COMISIONES '] || percepciones[' COMISIONES '] == 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' COMISIONES '])}
          </div>
        </InfoField>

        {/* Destajo */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('comision')}
            Destajo Informado
          </div>
          <div className={`value money ${!percepciones?.[' DESTAJO INFORMADO '] || percepciones[' DESTAJO INFORMADO '] == 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' DESTAJO INFORMADO '])}
          </div>
        </InfoField>

        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('comision')}
            Destajo
          </div>
          <div className={`value money ${!percepciones?.[' DESTAJO '] || percepciones[' DESTAJO '] == 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' DESTAJO '])}
          </div>
        </InfoField>

        {/* Premios */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('premio')}
            Premio Puntualidad
          </div>
          <div className={`value money ${!percepciones?.[' PREMIO PUNTUALIDAD '] || percepciones[' PREMIO PUNTUALIDAD '] == 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' PREMIO PUNTUALIDAD '])}
          </div>
        </InfoField>

        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('premio')}
            Premio Asistencia
          </div>
          <div className={`value money ${!percepciones?.[' PREMIO ASISTENCIA '] || percepciones[' PREMIO ASISTENCIA '] == 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' PREMIO ASISTENCIA '])}
          </div>
        </InfoField>

        {/* Vales de despensa */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('despensa')}
            Vales de Despensa
          </div>
          <div className={`value money ${!percepciones?.[' VALES DE DESPENSA '] || percepciones[' VALES DE DESPENSA '] == 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' VALES DE DESPENSA '])}
          </div>
        </InfoField>

        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('despensa')}
            Vales Despensa Neto
          </div>
          <div className={`value money ${!percepciones?.[' VALES DESPENSA NETO '] || percepciones[' VALES DESPENSA NETO '] == 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' VALES DESPENSA NETO '])}
          </div>
        </InfoField>

        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('despensa')}
            Vales Despensa Pensión Aliment.
          </div>
          <div className={`value money ${!percepciones?.[' VALES DESPENSA PENSION ALIMENT '] || percepciones[' VALES DESPENSA PENSION ALIMENT '] == 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' VALES DESPENSA PENSION ALIMENT '])}
          </div>
        </InfoField>

        {/* Bono */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('bono')}
            Bono
          </div>
          <div className={`value money ${!percepciones?.[' BONO '] || percepciones[' BONO '] == 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' BONO '])}
          </div>
        </InfoField>

        {/* Día festivo trabajado */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('tiempo')}
            Día Festivo Trabajado
          </div>
          <div className={`value money ${!percepciones?.[' DIA FESTIVO TRABAJADO '] || percepciones[' DIA FESTIVO TRABAJADO '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' DIA FESTIVO TRABAJADO '])}
          </div>
        </InfoField>

        {/* Vacaciones */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('tiempo')}
            Sueldo x Días AC Vacaciones
          </div>
          <div className={`value money ${!percepciones?.[' SUELDO X DIAS AC VACACIONES '] || percepciones[' SUELDO X DIAS AC VACACIONES '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' SUELDO X DIAS AC VACACIONES '])}
          </div>
        </InfoField>

        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('tiempo')}
            Prima Vacacional
          </div>
          <div className={`value money ${!percepciones?.[' PRIMA VACACIONAL '] || percepciones[' PRIMA VACACIONAL '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' PRIMA VACACIONAL '])}
          </div>
        </InfoField>

        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('tiempo')}
            Vacaciones Pendientes
          </div>
          <div className={`value money ${!percepciones?.[' VACACIONES PENDIENTES '] || percepciones[' VACACIONES PENDIENTES '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' VACACIONES PENDIENTES '])}
          </div>
        </InfoField>

        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('tiempo')}
            Vacaciones Finiquito
          </div>
          <div className={`value money ${!percepciones?.[' VACACIONES FINIQUITO '] || percepciones[' VACACIONES FINIQUITO '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' VACACIONES FINIQUITO '])}
          </div>
        </InfoField>

        {/* Aguinaldo */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('bono')}
            Aguinaldo
          </div>
          <div className={`value money ${!percepciones?.[' AGUINALDO '] || percepciones[' AGUINALDO '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' AGUINALDO '])}
          </div>
        </InfoField>

        {/* Gratificación */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('bono')}
            Gratificación
          </div>
          <div className={`value money ${!percepciones?.[' GRATIFICACION '] || percepciones[' GRATIFICACION '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' GRATIFICACION '])}
          </div>
        </InfoField>

        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('bono')}
            Gratificación Extraordinaria
          </div>
          <div className={`value money ${!percepciones?.[' GRATIFICACION EXTRAORDINARIA '] || percepciones[' GRATIFICACION EXTRAORDINARIA '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' GRATIFICACION EXTRAORDINARIA '])}
          </div>
        </InfoField>

        {/* Compensación */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('bono')}
            Compensación
          </div>
          <div className={`value money ${!percepciones?.[' COMPENSACION '] || percepciones[' COMPENSACION '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' COMPENSACION '])}
          </div>
        </InfoField>

        {/* Prima Dominical */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('tiempo')}
            Prima Dominical
          </div>
          <div className={`value money ${!percepciones?.[' PRIMA DOMINICAL '] || percepciones[' PRIMA DOMINICAL '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' PRIMA DOMINICAL '])}
          </div>
        </InfoField>

        {/* Prima de Antigüedad */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('tiempo')}
            Prima de Antigüedad
          </div>
          <div className={`value money ${!percepciones?.[' PRIMA DE ANTIGÜEDAD '] || percepciones[' PRIMA DE ANTIGÜEDAD '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' PRIMA DE ANTIGÜEDAD '])}
          </div>
        </InfoField>

        {/* Pago por Separación */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('bono')}
            Pago por Separación
          </div>
          <div className={`value money ${!percepciones?.[' PAGO POR SEPARACION '] || percepciones[' PAGO POR SEPARACION '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' PAGO POR SEPARACION '])}
          </div>
        </InfoField>

        {/* Subsidios */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('bono')}
            Subsidio por Incapacidad
          </div>
          <div className={`value money ${!percepciones?.[' SUBSIDIO POR INCAPACIDAD '] || percepciones[' SUBSIDIO POR INCAPACIDAD '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' SUBSIDIO POR INCAPACIDAD '])}
          </div>
        </InfoField>

        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('bono')}
            Subsidio al Empleo
          </div>
          <div className={`value money ${!percepciones?.[' SUBSIDIO AL EMPLEO '] || percepciones[' SUBSIDIO AL EMPLEO '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' SUBSIDIO AL EMPLEO '])}
          </div>
        </InfoField>

        {/* Horas Extra */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('horas')}
            Horas Extra Doble
          </div>
          <div className={`value money ${!percepciones?.[' HORAS EXTRA DOBLE '] || percepciones[' HORAS EXTRA DOBLE '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' HORAS EXTRA DOBLE '])}
          </div>
        </InfoField>

        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('horas')}
            Horas Extra Doble3
          </div>
          <div className={`value money ${!percepciones?.[' HORAS EXTRA DOBLE3 '] || percepciones[' HORAS EXTRA DOBLE3 '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' HORAS EXTRA DOBLE3 '])}
          </div>
        </InfoField>

        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('horas')}
            Horas Extra Triple
          </div>
          <div className={`value money ${!percepciones?.[' HORAS EXTRA TRIPLE '] || percepciones[' HORAS EXTRA TRIPLE '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' HORAS EXTRA TRIPLE '])}
          </div>
        </InfoField>

        {/* Séptimo Día */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('tiempo')}
            Séptimo Día
          </div>
          <div className={`value money ${!percepciones?.[' SEPTIMO DIA '] || percepciones[' SEPTIMO DIA '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' SEPTIMO DIA '])}
          </div>
        </InfoField>

        {/* PTU */}
        <InfoField>
          <div className="label">
            {obtenerIconoPercepcion('bono')}
            PTU
          </div>
          <div className={`value money ${!percepciones?.[' PTU '] || percepciones[' PTU '] === 0 ? 'zero' : ''}`}>
            {formatearMonto(percepciones?.[' PTU '])}
          </div>
        </InfoField>
      </InfoGrid>

      <LastUpdateInfo>
        Datos del período seleccionado - 
        <span className="timestamp">Actualizado el {new Date().toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</span>
      </LastUpdateInfo>
    </PercepcionesContainer>
  );
};

export default Percepciones;

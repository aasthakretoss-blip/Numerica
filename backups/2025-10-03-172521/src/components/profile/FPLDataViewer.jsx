import React, { useState, useEffect, useCallback } from 'react';
import InformacionBasicaFPLSection from './sections/InformacionBasicaFPLSection';
import MovimientosFondoSection from './sections/MovimientosFondoSection';
import AportacionesSDISection from './sections/AportacionesSDISection';

const FPLDataViewer = ({ rfc, selectedFechaFPL }) => {
  const [fplData, setFplData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFPLData = useCallback(async (rfcValue, fechaFPLValue) => {
    if (!rfcValue) {
      console.log('Missing RFC, clearing data');
      setFplData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🏦 Cargando datos FPL para RFC:', rfcValue, 'Fecha FPL:', fechaFPLValue);
      
      const params = new URLSearchParams({
        rfc: rfcValue
      });
      
      // NUEVO: Manejar el nuevo formato con metadatos originales
      if (fechaFPLValue) {
        let fechaValue, originalFecpla, originalAntiguedad;
        
        // Si es un objeto con metadatos (nuevo formato)
        if (typeof fechaFPLValue === 'object' && fechaFPLValue.metadata) {
          fechaValue = fechaFPLValue.fechaCalculada;
          originalFecpla = fechaFPLValue.metadata.originalFecpla;
          originalAntiguedad = fechaFPLValue.metadata.originalAntiguedad;
          
          console.log('📅 Usando búsqueda específica con datos originales:', {
            fechaCalculada: fechaValue,
            originalFecpla,
            originalAntiguedad
          });
          
          // Usar parámetros específicos para búsqueda exacta
          params.append('originalFecpla', originalFecpla);
          params.append('originalAntiguedad', originalAntiguedad);
        } else {
          // Formato anterior (fallback)
          fechaValue = Array.isArray(fechaFPLValue) ? fechaFPLValue[0] : fechaFPLValue;
          params.append('fechaFPL', fechaValue);
          console.log('📅 Usando búsqueda general con fechaFPL:', fechaValue);
        }
      }
      
      // Usar el nuevo endpoint de datos FPL completos
      const response = await fetch(`http://numericaapi.kretosstechnology.com/api/fpl/data-from-rfc?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar datos FPL del empleado');
      }
      
      const result = await response.json();
      
      if (!result.success || !result.data) {
        console.warn('No se encontraron datos FPL para el RFC:', rfcValue);
        setFplData(null);
        setError('No se encontraron datos FPL para este RFC en la fecha seleccionada');
        return;
      }
      
      // Usar los datos FPL directos
      const empleadoFPLData = result.data;
      
      console.log('🏦 Datos FPL obtenidos:', {
        rfc: rfcValue,
        nombre: empleadoFPLData.nombre,
        sucursal: empleadoFPLData['Descripción cvetno'],
        fecpla: empleadoFPLData.fecpla,
        status: empleadoFPLData.status
      });
      
      console.log('🔍 Campos FPL principales encontrados:', {
        numrfc: empleadoFPLData.numrfc,
        nombre: empleadoFPLData.nombre,
        cvecia: empleadoFPLData.cvecia,
        cvetno: empleadoFPLData.cvetno,
        fecpla: empleadoFPLData.fecpla,
        status: empleadoFPLData.status
      });
      
      // Pasar los datos raw completos a los componentes
      setFplData(empleadoFPLData);
      
    } catch (error) {
      console.error('Error fetching FPL data:', error);
      setError(`Error al cargar datos FPL: ${error.message}`);
      setFplData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar datos cuando cambian RFC o fecha FPL
  useEffect(() => {
    if (rfc) {
      fetchFPLData(rfc, selectedFechaFPL);
    }
  }, [rfc, selectedFechaFPL, fetchFPLData]);

  if (!rfc) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '2rem',
        color: 'rgba(255, 255, 255, 0.7)' 
      }}>
        RFC no disponible
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '2rem',
        background: 'rgba(255, 107, 107, 0.1)',
        border: '1px solid rgba(255, 107, 107, 0.3)',
        borderRadius: '12px',
        margin: '1rem 0'
      }}>
        <h3 style={{ color: '#ff6b6b', marginBottom: '1rem' }}>Error al cargar datos FPL</h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
          {error}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Sección A - Información Básica FPL */}
      <InformacionBasicaFPLSection 
        data={fplData} 
        loading={loading} 
      />
      
      {/* Sección B - Movimientos de Fondo */}
      <MovimientosFondoSection 
        data={fplData} 
        loading={loading} 
      />
      
      {/* Sección C - Aportaciones y SDI */}
      <AportacionesSDISection 
        data={fplData} 
        loading={loading} 
      />
    </div>
  );
};

export default FPLDataViewer;

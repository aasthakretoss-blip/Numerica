import React, { useState, useEffect, useCallback } from 'react';
import { buildApiUrl } from '../../config/apiConfig';
import { authenticatedFetch } from '../../services/authenticatedFetch';
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
      
      let apiUrl;
      
      // If fechaFPLValue is provided, use /api/fpl/data-from-rfc with metadata for reverse lookup
      if (fechaFPLValue) {
        let fechaValue = Array.isArray(fechaFPLValue) ? fechaFPLValue[0] : fechaFPLValue;
        
        // Normalize date format if needed
        if (typeof fechaValue === 'string' && fechaValue.includes('T')) {
          fechaValue = fechaValue.split('T')[0];
        }
        
        // The fechaFPLValue might be just a string (date) or an object with metadata
        // Check if we have metadata for reverse lookup
        let metadata = null;
        if (typeof fechaFPLValue === 'object' && !Array.isArray(fechaFPLValue) && fechaFPLValue.metadata) {
          metadata = fechaFPLValue.metadata;
        }
        
        const params = new URLSearchParams({
          rfc: rfcValue
        });
        
        // Use metadata for precise reverse lookup if available
        if (metadata && metadata.originalFecpla && metadata.originalAntiguedad) {
          params.append('originalFecpla', metadata.originalFecpla);
          params.append('originalAntiguedad', metadata.originalAntiguedad);
          console.log('📅 Usando endpoint FPL con metadata para búsqueda inversa:', {
            originalFecpla: metadata.originalFecpla,
            originalAntiguedad: metadata.originalAntiguedad
          });
        } else {
          // Fallback to calculated date
          params.append('fechaFPL', fechaValue);
          console.log('📅 Usando endpoint FPL con fecha calculada:', fechaValue);
        }
        
        apiUrl = buildApiUrl(`/api/fpl/data-from-rfc?${params.toString()}`);
      } else {
        // If no date selected, use /api/fondos to get most recent
        const params = new URLSearchParams({
          rfc: rfcValue,
          pageSize: '1',
          page: '1'
        });
        apiUrl = buildApiUrl(`/api/fondos?${params.toString()}`);
        console.log('📅 Usando endpoint fondos para datos más recientes');
      }
      
      console.log('📡 API URL para datos FPL:', apiUrl);
      
      const response = await authenticatedFetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('🔍 DEBUG: Respuesta completa del servidor:', result);
      
      // Extract data based on endpoint used
      let empleadoFPLData;
      if (result.data) {
        // /api/fpl/data-from-rfc returns single object
        if (Array.isArray(result.data)) {
          empleadoFPLData = result.data[0];
        } else {
          empleadoFPLData = result.data;
        }
      } else {
        empleadoFPLData = null;
      }
      
      if (!result.success || !empleadoFPLData) {
        console.warn('No se encontraron datos FPL para el RFC:', rfcValue);
        console.warn('Respuesta del servidor:', result);
        setFplData(null);
        setError(`No se encontraron datos FPL: ${result.error || result.message || 'Sin datos'}`);
        return;
      }
      console.log('🔍 DEBUG: Datos extraídos:', empleadoFPLData);
      
      console.log(`🏦 Datos FPL encontrados para RFC: ${rfcValue}`);
      
      // LOGGING DETALLADO PARA DEBUGGING - Mostrar TODAS las propiedades del empleado FPL
      console.log('🔍 EMPLEADO FPL COMPLETO - TODAS LAS PROPIEDADES:');
      console.log('📋 Total propiedades:', Object.keys(empleadoFPLData).length);
      console.log('📝 Lista de propiedades:', Object.keys(empleadoFPLData));
      console.log('💾 Objeto completo:', empleadoFPLData);
      
      // Logging específico para campos que esperamos encontrar
      console.log('🎯 CAMPOS ESPECÍFICOS BUSCADOS:');
      console.log('- cvecia:', empleadoFPLData.cvecia);
      console.log('- cvetno:', empleadoFPLData.cvetno);
      console.log('- descripcion_cvetno:', empleadoFPLData.descripcion_cvetno);
      console.log('- Descripción cvetno:', empleadoFPLData['Descripción cvetno']);
      console.log('- nombre:', empleadoFPLData.nombre);
      console.log('- Nombre completo:', empleadoFPLData['Nombre completo']);
      console.log('- numrfc:', empleadoFPLData.numrfc);
      console.log('- RFC:', empleadoFPLData['RFC']);
      console.log('- saldo_inicial:', empleadoFPLData.saldo_inicial);
      console.log('- aportacion_al_fideicomiso:', empleadoFPLData.aportacion_al_fideicomiso);
      console.log('- status:', empleadoFPLData.status);
      console.log('- Status:', empleadoFPLData['Status']);
      
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

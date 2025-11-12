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
    const requestId = Date.now();
    console.log(`\n[FPL FRONTEND] [${requestId}] ==========================================`);
    console.log(`[FPL FRONTEND] [${requestId}] Starting FPL data fetch`);
    console.log(`[FPL FRONTEND] [${requestId}] RFC: ${rfcValue || 'MISSING'}`);
    console.log(`[FPL FRONTEND] [${requestId}] Fecha FPL: ${fechaFPLValue ? JSON.stringify(fechaFPLValue) : 'NOT PROVIDED'}`);
    
    if (!rfcValue) {
      console.log(`[FPL FRONTEND] [${requestId}] Missing RFC, clearing data`);
      setFplData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
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
          console.log(`[FPL FRONTEND] [${requestId}] Using FPL endpoint with metadata for reverse lookup`);
          console.log(`[FPL FRONTEND] [${requestId}] originalFecpla: ${metadata.originalFecpla}`);
          console.log(`[FPL FRONTEND] [${requestId}] originalAntiguedad: ${metadata.originalAntiguedad}`);
        } else {
          // Fallback to calculated date
          params.append('fechaFPL', fechaValue);
          console.log(`[FPL FRONTEND] [${requestId}] Using FPL endpoint with calculated date: ${fechaValue}`);
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
        console.log(`[FPL FRONTEND] [${requestId}] Using fondos endpoint for most recent data`);
      }
      
      console.log(`[FPL FRONTEND] [${requestId}] API URL: ${apiUrl}`);
      console.log(`[FPL FRONTEND] [${requestId}] Sending request...`);
      
      const response = await authenticatedFetch(apiUrl);
      
      console.log(`[FPL FRONTEND] [${requestId}] Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[FPL FRONTEND] [${requestId}] ERROR: Request failed with status ${response.status}`);
        console.error(`[FPL FRONTEND] [${requestId}] Error response:`, errorText);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`[FPL FRONTEND] [${requestId}] Response received successfully`);
      console.log(`[FPL FRONTEND] [${requestId}] Response success: ${result.success}`);
      console.log(`[FPL FRONTEND] [${requestId}] Response keys:`, Object.keys(result));
      
      // Extract data based on endpoint used
      let empleadoFPLData;
      if (result.data) {
        // /api/fpl/data-from-rfc returns single object
        if (Array.isArray(result.data)) {
          empleadoFPLData = result.data[0];
          console.log(`[FPL FRONTEND] [${requestId}] Data is array, using first element`);
        } else {
          empleadoFPLData = result.data;
          console.log(`[FPL FRONTEND] [${requestId}] Data is object, using directly`);
        }
      } else {
        empleadoFPLData = null;
        console.log(`[FPL FRONTEND] [${requestId}] No data in response`);
      }
      
      if (!result.success || !empleadoFPLData) {
        console.warn(`[FPL FRONTEND] [${requestId}] No FPL data found for RFC: ${rfcValue}`);
        console.warn(`[FPL FRONTEND] [${requestId}] Server response:`, result);
        setFplData(null);
        setError(`No FPL data found: ${result.error || result.message || 'No data available'}`);
        console.log(`[FPL FRONTEND] [${requestId}] ==========================================\n`);
        return;
      }
      
      console.log(`[FPL FRONTEND] [${requestId}] FPL data extracted successfully`);
      console.log(`[FPL FRONTEND] [${requestId}] Total properties: ${Object.keys(empleadoFPLData).length}`);
      console.log(`[FPL FRONTEND] [${requestId}] Property keys:`, Object.keys(empleadoFPLData));
      
      // Logging specific fields we expect to find
      console.log(`[FPL FRONTEND] [${requestId}] Key fields check:`);
      console.log(`[FPL FRONTEND] [${requestId}]   - numrfc: ${empleadoFPLData.numrfc || empleadoFPLData.rfc || 'N/A'}`);
      console.log(`[FPL FRONTEND] [${requestId}]   - fecpla: ${empleadoFPLData.fecpla || 'N/A'}`);
      console.log(`[FPL FRONTEND] [${requestId}]   - nombre: ${empleadoFPLData.nombre || empleadoFPLData['Nombre completo'] || 'N/A'}`);
      
      // Pasar los datos raw completos a los componentes
      setFplData(empleadoFPLData);
      console.log(`[FPL FRONTEND] [${requestId}] FPL data set successfully`);
      console.log(`[FPL FRONTEND] [${requestId}] ==========================================\n`);
      
    } catch (error) {
      console.error(`[FPL FRONTEND] [${requestId}] ERROR: Failed to fetch FPL data`);
      console.error(`[FPL FRONTEND] [${requestId}] Error message:`, error.message);
      console.error(`[FPL FRONTEND] [${requestId}] Error stack:`, error.stack);
      setError(`Error loading FPL data: ${error.message}`);
      setFplData(null);
      console.log(`[FPL FRONTEND] [${requestId}] ==========================================\n`);
    } finally {
      setLoading(false);
      console.log(`[FPL FRONTEND] [${requestId}] Loading state set to false`);
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

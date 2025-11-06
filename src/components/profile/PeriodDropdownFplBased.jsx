import React, { useState, useEffect, useCallback, useRef } from 'react';
import DropDownMenu from '../DropDownMenu';
import { buildApiUrl } from '../../config/apiConfig';
import { authenticatedFetch } from '../../services/authenticatedFetch';

const PeriodDropdownFplBased = ({ 
  rfc, 
  curp,
  onPeriodChange, 
  selectedPeriod = [], 
  disabled = false, 
  className = "" 
}) => {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasAutoSelectedRef = useRef(false);
  const currentRfcRef = useRef(null);

  const fetchPeriods = useCallback(async (rfcValue, curpValue, shouldAutoSelect = false) => {
    // If no RFC but we have CURP, try to get RFC first
    let actualRfc = rfcValue;
    if (!actualRfc && curpValue) {
      console.log('🔍 No RFC disponible, obteniendo RFC desde CURP:', curpValue);
      try {
        const rfcUrl = buildApiUrl(`/api/payroll/rfc-from-curp?curp=${encodeURIComponent(curpValue)}`);
        const rfcResponse = await authenticatedFetch(rfcUrl);
        if (rfcResponse.ok) {
          const rfcResult = await rfcResponse.json();
          if (rfcResult.success && rfcResult.data && rfcResult.data.rfc) {
            actualRfc = rfcResult.data.rfc;
            console.log('✅ RFC obtenido desde CURP:', actualRfc);
          }
        }
      } catch (error) {
        console.error('❌ Error obteniendo RFC desde CURP:', error);
      }
    }
    
    if (!actualRfc) {
      console.log('🔍 No RFC provided, clearing periods');
      setPeriods([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log(`📅 Fetching fecpla periods for RFC: ${actualRfc}`);
      
      const url = `${buildApiUrl('/api/payroll/fecpla-from-rfc')}?rfc=${encodeURIComponent(actualRfc)}`;
      console.log('🌐 Calling URL:', url);
      
      const response = await authenticatedFetch(url);
      console.log('🔄 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 Raw API Response:', data);
      
      if (data.success && data.data && Array.isArray(data.data)) {
        const formattedPeriods = data.data.map(period => {
          let cleanValue = period.value || period.fecpla || period;
          let sortableDate = null;
          let displayLabel = period.label || cleanValue;
          
          // Procesar fecha para ordenamiento y display - usar formato YYYY-MM-DD como PeriodDropdownCurpBased
          try {
            if (cleanValue) {
              // Normalize to YYYY-MM-DD format
              if (cleanValue.includes && cleanValue.includes('T')) {
                cleanValue = cleanValue.split('T')[0];
              } else if (!cleanValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const date = new Date(cleanValue);
                if (!isNaN(date.getTime())) {
                  cleanValue = date.toISOString().split('T')[0];
                }
              }
              
              const date = new Date(cleanValue);
              if (!isNaN(date.getTime())) {
                sortableDate = date;
                displayLabel = cleanValue; // Use YYYY-MM-DD format directly
              }
            }
          } catch (error) {
            console.warn('⚠️ Error procesando fecha:', cleanValue, error);
          }
          
          return {
            value: cleanValue,
            label: displayLabel,
            count: period.count || 1,
            sortableDate: sortableDate
          };
        })
        .sort((a, b) => {
          // Ordenar del más reciente al más antiguo
          if (a.sortableDate && b.sortableDate && 
              !isNaN(a.sortableDate.getTime()) && !isNaN(b.sortableDate.getTime())) {
            return b.sortableDate.getTime() - a.sortableDate.getTime();
          }
          // Fallback: ordenamiento alfabético descendente
          return b.value.localeCompare(a.value);
        });
        
        console.log('✅ Formatted and sorted FPL periods:', formattedPeriods);
        setPeriods(formattedPeriods);
        
        // Seleccionar automáticamente el más reciente SOLO si se indica
        if (formattedPeriods.length > 0 && onPeriodChange && shouldAutoSelect) {
          const mostRecent = [formattedPeriods[0].value];
          console.log('🎆 Auto-selecting most recent FPL period:', mostRecent);
          onPeriodChange(mostRecent);
          hasAutoSelectedRef.current = true;
        }
        
        console.log(`✅ ${formattedPeriods.length} períodos FPL cargados y ordenados para RFC ${actualRfc}`);
      } else {
        console.warn('⚠️ Unexpected API response structure:', data);
        setPeriods([]);
      }
      
    } catch (error) {
      console.error('❌ Error fetching FPL periods:', error);
      setError(`Error: ${error.message}`);
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  }, [onPeriodChange]);

  // Cargar períodos cuando cambia el RFC o CURP
  useEffect(() => {
    console.log('🔄 RFC changed to:', rfc, 'CURP:', curp);
    if (rfc || curp) {
      // Si es un nuevo RFC, resetear el flag de auto-selección
      if (currentRfcRef.current !== rfc) {
        console.log('🆕 New RFC detected, resetting auto-selection flag');
        hasAutoSelectedRef.current = false;
        currentRfcRef.current = rfc;
      }
      
      // Determinar si debe auto-seleccionar (solo si no lo ha hecho antes para este RFC)
      const shouldAutoSelect = !hasAutoSelectedRef.current;
      fetchPeriods(rfc, curp, shouldAutoSelect);
    } else {
      setPeriods([]);
      hasAutoSelectedRef.current = false;
      currentRfcRef.current = null;
    }
  }, [rfc, curp, fetchPeriods]);

  const handlePeriodSelection = (selectedValues) => {
    console.log('🎯 FPL handlePeriodSelection called with:', selectedValues);
    const selectedPeriod = selectedValues && selectedValues.length > 0 ? selectedValues[0] : null;
    
    console.log(`📅 Período FPL seleccionado:`, selectedPeriod);
    
    if (onPeriodChange) {
      onPeriodChange(selectedValues);
    }
  };

  // Determinar el label del dropdown
  const getDropdownLabel = () => {
    if (loading) return "Cargando fechas FPL...";
    if (error) return "Error al cargar";
    if (!rfc && !curp) return "Selecciona RFC/CURP primero";
    if (periods.length === 0 && !loading) return "Sin fechas FPL disponibles";
    return "Fecha FPL Calculada:";
  };

  console.log('🔧 FPL Component state:', { rfc, curp, periods: periods.length, loading, error, selectedPeriod });

  return (
    <div className={className}>
      <DropDownMenu
        label={getDropdownLabel()}
        options={periods}
        selectedValues={selectedPeriod && Array.isArray(selectedPeriod) ? selectedPeriod : (selectedPeriod ? [selectedPeriod] : [])}
        onChange={handlePeriodSelection}
        placeholder="Seleccionar fecha FPL..."
        searchPlaceholder="Buscar fecha..."
        showCount={true}
        disabled={disabled || loading || (!rfc && !curp) || periods.length === 0 || !!error}
        preserveOrder={true}
        singleSelect={true}
        className="period-dropdown-fpl-based"
      />
      
      {error && (
        <div style={{ 
          color: '#ff6b6b', 
          fontSize: '0.8rem', 
          marginTop: '0.5rem',
          padding: '0.25rem'
        }}>
          {error}
        </div>
      )}
      
    </div>
  );
};

export default PeriodDropdownFplBased;

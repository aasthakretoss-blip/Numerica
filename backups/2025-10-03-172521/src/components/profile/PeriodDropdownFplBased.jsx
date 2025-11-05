import React, { useState, useEffect, useCallback, useRef } from 'react';
import DropDownMenu from '../DropDownMenu';

const PeriodDropdownFplBased = ({ 
  rfc, 
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

  const fetchPeriods = useCallback(async (rfcValue, shouldAutoSelect = false) => {
    if (!rfcValue) {
      console.log('🔍 No RFC provided, clearing periods');
      setPeriods([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log(`📅 Fetching fecpla periods for RFC: ${rfcValue}`);
      
      const url = `http://localhost:3001/api/payroll/fecpla-from-rfc?rfc=${encodeURIComponent(rfcValue)}`;
      console.log('🌐 Calling URL:', url);
      
      const response = await fetch(url);
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
          
          // Procesar fecha para ordenamiento y display
          try {
            if (cleanValue) {
              const date = new Date(cleanValue);
              if (!isNaN(date.getTime())) {
                // Para el ordenamiento, usar el objeto Date
                sortableDate = date;
                // Para display, usar formato más limpio si no está ya formateado
                if (!displayLabel || displayLabel === cleanValue) {
                  displayLabel = date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
                }
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
          const mostRecent = formattedPeriods[0].value;
          console.log('🎆 Auto-selecting most recent FPL period:', mostRecent);
          onPeriodChange(mostRecent);
          hasAutoSelectedRef.current = true;
        }
        
        console.log(`✅ ${formattedPeriods.length} períodos FPL cargados y ordenados para RFC ${rfcValue}`);
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

  // Cargar períodos cuando cambia el RFC
  useEffect(() => {
    console.log('🔄 RFC changed to:', rfc);
    if (rfc) {
      // Si es un nuevo RFC, resetear el flag de auto-selección
      if (currentRfcRef.current !== rfc) {
        console.log('🆕 New RFC detected, resetting auto-selection flag');
        hasAutoSelectedRef.current = false;
        currentRfcRef.current = rfc;
      }
      
      // Determinar si debe auto-seleccionar (solo si no lo ha hecho antes para este RFC)
      const shouldAutoSelect = !hasAutoSelectedRef.current;
      fetchPeriods(rfc, shouldAutoSelect);
    } else {
      setPeriods([]);
      hasAutoSelectedRef.current = false;
      currentRfcRef.current = null;
    }
  }, [rfc, fetchPeriods]);

  const handlePeriodSelection = (selectedValues) => {
    console.log('🎯 FPL handlePeriodSelection called with:', selectedValues);
    const selectedPeriod = selectedValues && selectedValues.length > 0 ? selectedValues[0] : null;
    
    console.log(`📅 Período FPL seleccionado para RFC ${rfc}:`, selectedPeriod);
    
    if (onPeriodChange) {
      onPeriodChange(selectedPeriod);
    }
  };

  // Determinar el label del dropdown
  const getDropdownLabel = () => {
    if (loading) return "Cargando fechas FPL...";
    if (error) return "Error al cargar";
    if (!rfc) return "Selecciona RFC primero";
    if (periods.length === 0 && !loading) return "Sin fechas FPL disponibles";
    return "Fecha FPL:";
  };

  console.log('🔧 FPL Component state:', { rfc, periods: periods.length, loading, error, selectedPeriod });

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
        disabled={disabled || loading || !rfc || periods.length === 0 || !!error}
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

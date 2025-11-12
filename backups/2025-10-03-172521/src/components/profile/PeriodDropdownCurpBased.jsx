import React, { useState, useEffect, useCallback, useRef } from 'react';
import DropDownMenu from '../DropDownMenu';

const PeriodDropdownCurpBased = ({ 
  curp, 
  onPeriodChange, 
  selectedPeriod = [], 
  disabled = false, 
  className = "",
  forcePeriodSelection = null // Nuevo prop para forzar selección desde gráfica histórica
}) => {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasAutoSelectedRef = useRef(false);
  const currentCurpRef = useRef(null);
  const forcedPeriodRef = useRef(null);

  const fetchPeriods = useCallback(async (curpValue, shouldAutoSelect = false) => {
    if (!curpValue) {
      console.log('🔍 No CURP provided, clearing periods');
      setPeriods([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log(`📅 Fetching periods for CURP: ${curpValue}`);
      
      const url = `http://numericaapi.kretosstechnology.com/api/payroll/periodos-from-curp?curp=${encodeURIComponent(curpValue)}`;
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
          let cleanValue = period.value || period.periodo || period;
          let sortableDate = null;
          
          // Limpiar timestamp para mostrar solo año-mes-día
          try {
            if (cleanValue) {
              if (cleanValue.includes('T')) {
                // Si tiene timestamp, extraer solo la fecha
                const date = new Date(cleanValue);
                if (!isNaN(date.getTime())) {
                  cleanValue = date.toISOString().split('T')[0];
                  sortableDate = date;
                }
              } else if (cleanValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // Ya está en formato YYYY-MM-DD
                sortableDate = new Date(cleanValue + 'T00:00:00');
              } else {
                // Intentar parsear como fecha
                const date = new Date(cleanValue);
                if (!isNaN(date.getTime())) {
                  cleanValue = date.toISOString().split('T')[0];
                  sortableDate = date;
                }
              }
            }
          } catch (error) {
            console.warn('⚠️ Error procesando fecha:', cleanValue, error);
          }
          
          return {
            value: cleanValue,
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
        
        console.log('✅ Formatted and sorted periods:', formattedPeriods);
        setPeriods(formattedPeriods);
        
        // Seleccionar automáticamente el más reciente SOLO si se indica
        if (formattedPeriods.length > 0 && onPeriodChange && shouldAutoSelect) {
          const mostRecent = formattedPeriods[0].value;
          console.log('🎆 Auto-selecting most recent period:', mostRecent);
          onPeriodChange(mostRecent);
          hasAutoSelectedRef.current = true;
        }
        
        // Aplicar período forzado DESPUÉS del por defecto (independientemente de shouldAutoSelect)
        if (forcePeriodSelection && forcedPeriodRef.current !== forcePeriodSelection && formattedPeriods.length > 0) {
          console.log('🎯 [DropdownCURP] Período forzado detectado desde gráfica histórica:', forcePeriodSelection);
          
          // Normalizar el período forzado al mismo formato que los períodos en la lista (YYYY-MM-DD)
          let normalizedForcedPeriod = forcePeriodSelection;
          try {
            if (forcePeriodSelection.includes('T')) {
              const date = new Date(forcePeriodSelection);
              if (!isNaN(date.getTime())) {
                normalizedForcedPeriod = date.toISOString().split('T')[0];
                console.log('🔧 [DropdownCURP] Período forzado normalizado de', forcePeriodSelection, 'a', normalizedForcedPeriod);
              }
            }
          } catch (error) {
            console.warn('⚠️ [DropdownCURP] Error normalizando período forzado:', error);
          }
          
          // Verificar si el período forzado existe en la lista
          const forcedPeriodExists = formattedPeriods.some(period => period.value === normalizedForcedPeriod);
          if (forcedPeriodExists) {
            setTimeout(() => {
              console.log('✅ [DropdownCURP] Aplicando selección forzada (sobrescribiendo por defecto):', normalizedForcedPeriod);
              onPeriodChange(normalizedForcedPeriod);
              forcedPeriodRef.current = forcePeriodSelection; // Usar el original para la referencia
            }, 200); // Delay mayor para asegurar que se aplique después del por defecto
          } else {
            console.warn('⚠️ [DropdownCURP] Período forzado no encontrado en la lista:', normalizedForcedPeriod, 'Original:', forcePeriodSelection);
          }
        }
        
        console.log(`✅ ${formattedPeriods.length} períodos cargados y ordenados para ${curpValue}`);
      } else {
        console.warn('⚠️ Unexpected API response structure:', data);
        setPeriods([]);
      }
      
    } catch (error) {
      console.error('❌ Error fetching periods:', error);
      setError(`Error: ${error.message}`);
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  }, [onPeriodChange, forcePeriodSelection]);

  // Cargar períodos cuando cambia el CURP o forcePeriodSelection
  useEffect(() => {
    console.log('🔄 CURP changed to:', curp, 'forcePeriodSelection:', forcePeriodSelection);
    if (curp) {
      // Si es un nuevo CURP o hay un período forzado, resetear el flag de auto-selección
      if (currentCurpRef.current !== curp || forcePeriodSelection) {
        console.log('🆕 New CURP detected or forced period, resetting auto-selection flag');
        hasAutoSelectedRef.current = false;
        currentCurpRef.current = curp;
        // Resetear también el período forzado procesado si es un nuevo CURP
        if (currentCurpRef.current !== curp) {
          forcedPeriodRef.current = null;
        }
      }
      
      // Determinar si debe auto-seleccionar (solo si no lo ha hecho antes para este CURP)
      const shouldAutoSelect = !hasAutoSelectedRef.current;
      fetchPeriods(curp, shouldAutoSelect);
    } else {
      setPeriods([]);
      hasAutoSelectedRef.current = false;
      currentCurpRef.current = null;
      forcedPeriodRef.current = null;
    }
  }, [curp, fetchPeriods, forcePeriodSelection]);

  const handlePeriodSelection = (selectedValues) => {
    console.log('🎯 handlePeriodSelection called with:', selectedValues);
    const selectedPeriod = selectedValues && selectedValues.length > 0 ? selectedValues[0] : null;
    
    console.log(`📅 Período seleccionado para ${curp}:`, selectedPeriod);
    
    if (onPeriodChange) {
      onPeriodChange(selectedPeriod);
    }
  };

  // Determinar el label del dropdown
  const getDropdownLabel = () => {
    if (loading) return "Cargando períodos...";
    if (error) return "Error al cargar";
    if (!curp) return "Selecciona empleado primero";
    if (periods.length === 0 && !loading) return "Sin períodos disponibles";
    return "Periodo:";
  };

  console.log('🔧 Component state:', { curp, periods: periods.length, loading, error, selectedPeriod });

  return (
    <div className={className}>
      <DropDownMenu
        label={getDropdownLabel()}
        options={periods}
        selectedValues={selectedPeriod && Array.isArray(selectedPeriod) ? selectedPeriod : (selectedPeriod ? [selectedPeriod] : [])}
        onChange={handlePeriodSelection}
        placeholder="Seleccionar período..."
        searchPlaceholder="Buscar período..."
        showCount={true}
        disabled={disabled || loading || !curp || periods.length === 0 || !!error}
        preserveOrder={true}
        singleSelect={true}
        className="period-dropdown-curp-based"
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

export default PeriodDropdownCurpBased;

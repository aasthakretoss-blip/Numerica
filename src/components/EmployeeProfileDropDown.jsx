import React, { useState, useEffect, useMemo } from 'react';
import DropDownMenu from './DropDownMenu';
import { buildApiUrl } from '../config/apiConfig';

/**
 * DropDownMenu especializado para el perfil de empleado.
 * A diferencia de otros DropDownMenus CVEPER que solo muestran mes y año,
 * este componente muestra día, mes y año completo para períodos CVEPER.
 * 
 * Características especiales:
 * - Muestra fecha completa (DD/MM/YYYY) en lugar de solo MM/YYYY
 * - Carga automáticamente todos los campos disponibles de CVEPER
 * - Selecciona por defecto el período más reciente
 * - Preserva el orden cronológico descendente (más reciente primero)
 */
const EmployeeProfileDropDown = ({
  label = "Dato de percepción",
  options = [],
  selectedValues = [],
  onChange,
  placeholder = "Seleccionar período...",
  searchPlaceholder = "Buscar período...",
  showCount = true,
  disabled = false,
  className = "",
  curp = null, // CURP del empleado para cargar períodos específicos
  onPeriodsLoaded = null, // Callback cuando se cargan los períodos
  autoSelectLatest = true // Si debe seleccionar automáticamente el más reciente
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formattedOptions, setFormattedOptions] = useState([]);
  const [hasLoadedPeriods, setHasLoadedPeriods] = useState(false);
  
  // Estados para períodos específicos del empleado
  const [employeePeriods, setEmployeePeriods] = useState([]);
  const [usingEmployeeSpecificPeriods, setUsingEmployeeSpecificPeriods] = useState(false);

  // Formatear opciones para mostrar fecha completa (DD/MM/YYYY)
  const formatPeriodOption = (option) => {
    try {
      let dateValue = option.value;
      let displayValue = '';
      
      // Si el valor tiene formato de fecha ISO (YYYY-MM-DD) o timestamp
      if (typeof dateValue === 'string' && (dateValue.includes('-') || dateValue.includes('T'))) {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          // Formatear como DD/MM/YYYY para el perfil de empleado
          displayValue = date.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric'
          });
        }
      }
      
      // Si no se pudo formatear, usar el valor original
      if (!displayValue) {
        displayValue = String(dateValue);
      }
      
      return {
        ...option,
        value: dateValue, // Mantener valor original para el backend
        displayValue: displayValue, // Valor formateado para mostrar
        formattedLabel: `${displayValue}${option.count ? ` (${option.count.toLocaleString('es-MX')})` : ''}`
      };
    } catch (error) {
      console.warn('❌ Error formateando período:', option, error);
      return {
        ...option,
        displayValue: String(option.value),
        formattedLabel: String(option.value)
      };
    }
  };

  // Procesar y formatear opciones cuando cambien
  useEffect(() => {
    // Determinar qué opciones usar: específicas del empleado o generales
    const sourceOptions = usingEmployeeSpecificPeriods && employeePeriods.length > 0 
      ? employeePeriods 
      : (options && options.length > 0 ? options : []);
    
    if (sourceOptions.length > 0) {
      console.log('📅 EmployeeProfileDropDown: Procesando opciones de períodos:', {
        usando: usingEmployeeSpecificPeriods ? 'Períodos específicos del empleado' : 'Períodos generales',
        totalOpciones: sourceOptions.length,
        primerasOpciones: sourceOptions.slice(0, 3),
        curp
      });

      // Formatear cada opción para mostrar fecha completa
      const formatted = sourceOptions.map(formatPeriodOption);
      
      // Ordenar por fecha descendente (más reciente primero)
      formatted.sort((a, b) => {
        try {
          const dateA = new Date(a.value);
          const dateB = new Date(b.value);
          return dateB.getTime() - dateA.getTime(); // Descendente
        } catch (error) {
          return 0;
        }
      });

      // Crear opciones formateadas para el DropDownMenu base
      const menuOptions = formatted.map(opt => ({
        value: opt.displayValue, // Valor formateado que se mostrará (DD/MM/YYYY)
        originalValue: opt.value, // Mantener valor original para el backend
        count: opt.count
      }));

      console.log('✅ EmployeeProfileDropDown: Opciones formateadas:', {
        totalFormateadas: menuOptions.length,
        primerasFormateadas: menuOptions.slice(0, 3).map(opt => ({
          valorFormateado: opt.value,
          valorOriginal: opt.originalValue,
          conteo: opt.count
        }))
      });

      setFormattedOptions(menuOptions);

      // Auto-seleccionar el período más reciente si está habilitado
      if (autoSelectLatest && selectedValues.length === 0 && menuOptions.length > 0 && usingEmployeeSpecificPeriods) {
        const mostRecent = menuOptions[0]; // Ya están ordenados por fecha descendente
        console.log('🎯 EmployeeProfileDropDown: Auto-seleccionando período más reciente específico:', mostRecent);
        // Usar el valor original para el backend
        onChange([mostRecent.originalValue]);
      }

      // Notificar que se cargaron los períodos
      if (onPeriodsLoaded && usingEmployeeSpecificPeriods) {
        onPeriodsLoaded(menuOptions);
      }
    } else {
      setFormattedOptions([]);
    }
  }, [options, employeePeriods, usingEmployeeSpecificPeriods, autoSelectLatest, selectedValues.length, onChange, onPeriodsLoaded, curp]);

  // Cargar períodos específicos del empleado cuando se proporciona CURP
  useEffect(() => {
    if (curp && curp.trim() !== '') {
      loadEmployeePeriods(curp.trim());
    } else {
      // Si no hay CURP, limpiar períodos específicos
      setEmployeePeriods([]);
      setUsingEmployeeSpecificPeriods(false);
      setHasLoadedPeriods(false);
    }
  }, [curp]);

  const loadEmployeePeriods = async (employeeCurp) => {
    if (isLoading) return; // Evitar llamadas múltiples

    setIsLoading(true);
    console.log('🔍 Cargando períodos CVEPER específicos para empleado:', employeeCurp);

    try {
      // Usar el endpoint de percepciones que accede a historico_nominas_gsau
      const params = new URLSearchParams({
        curp: employeeCurp, // Búsqueda por CURP
        pageSize: '1000',
        page: '1'
      });
      
      const url = `${buildApiUrl('/api/percepciones')}?${params.toString()}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log('📅 Respuesta completa de períodos CVEPER desde historico_nominas_gsau:', {
        empleado: employeeCurp,
        totalRegistros: result.data ? result.data.length : 0,
        success: result.success,
        primerRegistro: result.data && result.data.length > 0 ? result.data[0] : null,
        url: url,
        campos: result.data && result.data.length > 0 ? Object.keys(result.data[0]) : [],
        todosLosRegistros: result.data && result.data.length > 0 ? result.data.slice(0, 3) : [],
        resultadoCompleto: result
      });

      if (result.success && result.data && result.data.length > 0) {
        console.log('🔎 DEBUGGING: Analizando respuesta completa:', {
          totalRegistrosRecibidos: result.data.length,
          curpBuscado: employeeCurp,
          primerRegistroCompleto: result.data[0]
        });
        
        // Identificar el campo CURP correcto (puede ser 'CURP', 'curp', etc.)
        const firstRecord = result.data[0];
        const curpField = Object.keys(firstRecord).find(key => 
          key.toLowerCase().includes('curp') || key.toLowerCase() === 'curp'
        ) || 'CURP'; // Defaultear a mayúsculas
        
        // Identificar el campo CVEPER correcto
        const cveperField = Object.keys(firstRecord).find(key => 
          key.toLowerCase().includes('cveper') || key.toLowerCase() === 'cveper'
        ) || 'cveper';
        
        console.log('🔍 Campos identificados:', {
          camposCurp: curpField,
          camposCveper: cveperField,
          ejemploCampos: Object.keys(firstRecord),
          valorCurpEnPrimerRegistro: firstRecord[curpField],
          valorCveperEnPrimerRegistro: firstRecord[cveperField]
        });
        
        // Filtrar registros que pertenecen al CURP buscado
        const registrosDelEmpleado = result.data.filter(emp => {
          const curpMatch = emp[curpField] === employeeCurp;
          const tieneCveper = emp[cveperField] != null && emp[cveperField] !== '' && emp[cveperField] !== undefined;
          return curpMatch && tieneCveper;
        });
        
        console.log('📊 Registros filtrados del empleado:', {
          totalRegistrosOriginales: result.data.length,
          registrosFiltradosDelEmpleado: registrosDelEmpleado.length,
          ejemplosRegistrosFiltrados: registrosDelEmpleado.slice(0, 3)
        });
        
        // Extraer TODAS las fechas CVEPER únicas para este CURP
        const uniqueCveperValues = [...new Set(
          registrosDelEmpleado.map(emp => emp[cveperField])
        )].filter(cveper => cveper != null && cveper !== ''); // Eliminar valores nulos o vacíos
        
        console.log('📅 TODAS las fechas CVEPER únicas encontradas:', {
          totalFechasUnicas: uniqueCveperValues.length,
          todasLasFechas: uniqueCveperValues,
          campoUsado: cveperField,
          curpReferencia: employeeCurp
        });
        
        // Convertir a formato de opciones para el dropdown
        const employeeOptions = uniqueCveperValues.map(cveper => ({
          value: cveper,
          count: registrosDelEmpleado.filter(emp => emp[cveperField] === cveper).length
        }));
        
        console.log('✅ Opciones finales para el dropdown "Dato de percepción":', {
          totalOpciones: employeeOptions.length,
          opciones: employeeOptions.map(opt => ({
            fecha: opt.value,
            cantidadRegistros: opt.count
          }))
        });
        
        if (employeeOptions.length > 0) {
          setEmployeePeriods(employeeOptions);
          setUsingEmployeeSpecificPeriods(true);
          setHasLoadedPeriods(true);
        } else {
          console.warn('⚠️ No se encontraron fechas CVEPER válidas para el CURP:', employeeCurp);
          setEmployeePeriods([]);
          setUsingEmployeeSpecificPeriods(false);
          setHasLoadedPeriods(true);
        }
      } else {
        console.log('⚠️ No se encontraron registros CVEPER para el empleado, usando períodos generales como fallback');
        // Si no hay datos específicos, usar las opciones generales como fallback
        setEmployeePeriods([]);
        setUsingEmployeeSpecificPeriods(false);
        setHasLoadedPeriods(true);
      }

    } catch (error) {
      console.error('❌ Error cargando períodos CVEPER específicos del empleado:', error);
      setEmployeePeriods([]);
      setUsingEmployeeSpecificPeriods(false);
      setHasLoadedPeriods(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar cambios en la selección
  const handleSelectionChange = (newValues) => {
    console.log('🔄 EmployeeProfileDropDown: Cambio de selección:', {
      valoresAnteriores: selectedValues,
      valoresNuevos: newValues,
      curp
    });
    
    // Convertir valores formateados (DD/MM/YYYY) de vuelta a valores originales para el backend
    const originalValues = newValues.map(formattedValue => {
      const option = formattedOptions.find(opt => opt.value === formattedValue);
      return option ? option.originalValue : formattedValue;
    });
    
    console.log('🔄 Convirtiendo valores:', {
      formateados: newValues,
      originales: originalValues
    });
    
    onChange(originalValues);
  };

  // Crear el label personalizado para el dropdown
  const customLabel = useMemo(() => {
    // Solo mostrar el label, no la CURP
    return label;
  }, [label]);

  // Placeholder personalizado basado en el estado
  const customPlaceholder = useMemo(() => {
    if (isLoading) {
      return "Cargando períodos...";
    }
    if (formattedOptions.length === 0) {
      return "Sin períodos disponibles";
    }
    return placeholder;
  }, [isLoading, formattedOptions.length, placeholder]);

  // Mapear valores seleccionados del backend (valores originales) a formato de visualización
  const displaySelectedValues = useMemo(() => {
    return selectedValues.map(originalValue => {
      const option = formattedOptions.find(opt => opt.originalValue === originalValue);
      return option ? option.value : originalValue;
    });
  }, [selectedValues, formattedOptions]);

  return (
    <DropDownMenu
      label={customLabel}
      options={formattedOptions}
      selectedValues={displaySelectedValues}
      onChange={handleSelectionChange}
      placeholder={customPlaceholder}
      searchPlaceholder={searchPlaceholder}
      showCount={showCount}
      disabled={disabled || isLoading}
      className={className}
      preserveOrder={true} // Mantener orden cronológico
    />
  );
};

export default EmployeeProfileDropDown;

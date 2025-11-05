import { createContext, useContext, useState, useCallback } from 'react';

// Contexto para eventos de gráficos
const ChartEventsContext = createContext();

// Provider del contexto
export function ChartEventsProvider({ children }) {
  const [currentSelection, setCurrentSelection] = useState(null);
  const [selectionHistory, setSelectionHistory] = useState([]);

  // Función para emitir un evento de selección desde cualquier gráfico
  const emitSelection = useCallback((selectionData) => {
    console.log('🎯 ChartEvents: Nueva selección recibida:', selectionData);
    
    // Validar datos básicos
    if (!selectionData || !selectionData.type || !selectionData.data) {
      console.warn('🎯 ChartEvents: Datos de selección inválidos:', selectionData);
      return;
    }

    // Crear objeto de selección completo
    const selection = {
      id: `selection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...selectionData
    };

    // Actualizar selección actual
    setCurrentSelection(selection);
    
    // Agregar al historial (mantener últimas 10 selecciones)
    setSelectionHistory(prev => {
      const newHistory = [selection, ...prev];
      return newHistory.slice(0, 10);
    });

    console.log('🎯 ChartEvents: Selección actualizada:', selection);
  }, []);

  // Función para limpiar la selección actual
  const clearSelection = useCallback(() => {
    console.log('🎯 ChartEvents: Limpiando selección');
    setCurrentSelection(null);
  }, []);

  // Función para obtener la selección anterior
  const getPreviousSelection = useCallback(() => {
    return selectionHistory[1] || null;
  }, [selectionHistory]);

  const value = {
    currentSelection,
    selectionHistory,
    emitSelection,
    clearSelection,
    getPreviousSelection
  };

  return (
    <ChartEventsContext.Provider value={value}>
      {children}
    </ChartEventsContext.Provider>
  );
}

// Hook para usar el sistema de eventos
export function useChartEvents() {
  const context = useContext(ChartEventsContext);
  
  if (!context) {
    throw new Error('useChartEvents debe ser usado dentro de ChartEventsProvider');
  }
  
  return context;
}

// Tipos de selección soportados
export const SELECTION_TYPES = {
  PYRAMID_AGE_GENDER: 'pyramid_age_gender',         // PopulationPyramid
  SALARY_AGE_GENDER_BAND: 'salary_age_gender_band', // SalaryAgePopulationPyramid
  POSITION_GENDER: 'position_gender',               // PuestoSueldoGrafica
  GENERAL_FILTER: 'general_filter'                  // Filtros generales
};

// Utilidad para crear selecciones estandarizadas
export const createSelection = {
  // Selección de pirámide poblacional (edad + género)
  pyramidAgeGender: (age, gender, additionalData = {}) => ({
    type: SELECTION_TYPES.PYRAMID_AGE_GENDER,
    data: {
      age,
      gender, // 'male' o 'female'
      ageRange: [age, age],
      ...additionalData
    },
    source: 'PopulationPyramid'
  }),

  // Selección de pirámide salarial (edad + género + banda salarial)
  salaryAgeGenderBand: (age, gender, salaryBand, additionalData = {}) => ({
    type: SELECTION_TYPES.SALARY_AGE_GENDER_BAND,
    data: {
      age,
      gender, // 'male' o 'female'
      salaryBand, // objeto con min, max, label, etc.
      ageRange: [age, age],
      ...additionalData
    },
    source: 'SalaryAgePopulationPyramid'
  }),

  // Selección de gráfica de puestos (puesto + género)
  positionGender: (position, gender, count, additionalData = {}) => ({
    type: SELECTION_TYPES.POSITION_GENDER,
    data: {
      position,
      gender, // 'male' o 'female'
      count,
      ...additionalData
    },
    source: 'PuestoSueldoGrafica'
  }),

  // Selección de filtro general
  generalFilter: (filterType, filterValue, additionalData = {}) => ({
    type: SELECTION_TYPES.GENERAL_FILTER,
    data: {
      filterType, // 'sucursal', 'puesto', etc.
      filterValue,
      ...additionalData
    },
    source: 'GeneralFilter'
  })
};

/**
 * 🎨 THEME CONTEXT PARA NUMERICA
 * 
 * Sistema de gestión de temas centralizado
 * Permite cambio dinámico de paletas y modo oscuro/claro
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import colors, { 
  brandColors, 
  semanticColors, 
  gradients, 
  surfaces, 
  textColors, 
  effects,
  createGlassSurface,
  createDarkSurface,
  getStateColors,
  withOpacity
} from '../styles/ColorTokens';
import { applyCSSDVariables } from '../styles/CSSVariables';

// =============================================================================
// 🎯 DEFINICIÓN DEL CONTEXTO
// =============================================================================
const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  }
  return context;
};

// =============================================================================
// 🎨 TEMAS PREDEFINIDOS (Para futuras expansiones)
// =============================================================================
const themes = {
  // Tema actual - Numerica Original
  numerica: {
    name: 'Numerica Original',
    brand: brandColors,
    semantic: semanticColors,
    gradients: gradients,
    surfaces: surfaces,
    text: textColors,
    effects: effects,
  },
  
  // Placeholder para temas futuros
  dark: {
    name: 'Modo Oscuro',
    // Se puede expandir más tarde
    brand: { ...brandColors },
    semantic: { ...semanticColors },
    gradients: { ...gradients },
    surfaces: { ...surfaces },
    text: { ...textColors },
    effects: { ...effects },
  }
};

// =============================================================================
// 🏗️ THEME PROVIDER COMPONENT
// =============================================================================
export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('numerica');
  const [customColors, setCustomColors] = useState({});
  
  // Obtener tema activo
  const activeTheme = themes[currentTheme];
  
  // Merge tema activo con customizaciones
  const mergedTheme = {
    ...activeTheme,
    brand: { ...activeTheme.brand, ...customColors.brand },
    semantic: { ...activeTheme.semantic, ...customColors.semantic },
    gradients: { ...activeTheme.gradients, ...customColors.gradients },
    surfaces: { ...activeTheme.surfaces, ...customColors.surfaces },
    text: { ...activeTheme.text, ...customColors.text },
    effects: { ...activeTheme.effects, ...customColors.effects },
    // Agregar aliases para acceso directo
    status: {
      success: semanticColors.success,
      error: semanticColors.error,
      warning: semanticColors.warning,
      info: semanticColors.info
    }
  };

  // =============================================================================
  // 🔧 FUNCIONES DE GESTIÓN DE TEMA
  // =============================================================================
  
  /**
   * Cambiar tema completo
   */
  const changeTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
      localStorage.setItem('numerica-theme', themeName);
    }
  };

  /**
   * Personalizar colores específicos sin cambiar tema
   */
  const updateColors = (colorUpdates) => {
    const newCustomColors = {
      ...customColors,
      ...colorUpdates
    };
    
    setCustomColors(newCustomColors);
    
    // 🎨 Aplicar automáticamente las variables CSS
    applyCSSDVariables(newCustomColors);
    
    // Guardar customizaciones en localStorage
    localStorage.setItem('numerica-custom-colors', JSON.stringify(newCustomColors));
  };

  /**
   * Actualizar color específico de marca
   */
  const updateBrandColor = (colorKey, newValue) => {
    updateColors({
      brand: {
        ...customColors.brand,
        [colorKey]: newValue
      }
    });
  };

  /**
   * Actualizar gradiente específico  
   */
  const updateGradient = (gradientKey, newGradient) => {
    // Si es un gradiente anidado como backgrounds.primary
    if (gradientKey === 'backgrounds' && typeof newGradient === 'object') {
      updateColors({
        gradients: {
          ...customColors.gradients,
          backgrounds: {
            ...customColors.gradients?.backgrounds,
            ...newGradient
          }
        }
      });
    } else {
      updateColors({
        gradients: {
          ...customColors.gradients,
          [gradientKey]: newGradient
        }
      });
    }
  };

  /**
   * Resetear a tema por defecto
   */
  const resetTheme = () => {
    setCustomColors({});
    setCurrentTheme('numerica');
    localStorage.removeItem('numerica-custom-colors');
    localStorage.removeItem('numerica-theme');
  };

  /**
   * Obtener paleta completa actual (con customizaciones)
   */
  const getCurrentPalette = () => mergedTheme;

  // =============================================================================
  // 💾 PERSISTENCIA DE TEMA
  // =============================================================================
  
  // Cargar tema y customizaciones guardadas
  useEffect(() => {
    const savedTheme = localStorage.getItem('numerica-theme');
    const savedColors = localStorage.getItem('numerica-custom-colors');
    
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
    
    let finalCustomColors = {};
    if (savedColors) {
      try {
        const parsed = JSON.parse(savedColors);
        setCustomColors(parsed);
        finalCustomColors = parsed;
      } catch (e) {
        console.warn('Error al cargar colores personalizados:', e);
      }
    }
    
    // 🎨 Aplicar variables CSS al cargar
    applyCSSDVariables(finalCustomColors);
  }, []);

  // =============================================================================
  // 🎨 HELPERS CONTEXTUALIZADOS
  // =============================================================================
  
  const contextualHelpers = {
    // Crear superficie glassmorphism con tema actual
    createGlass: (opacity, blurIntensity) => createGlassSurface(opacity, blurIntensity),
    
    // Crear superficie oscura con tema actual  
    createDark: (opacity, blurIntensity) => createDarkSurface(opacity, blurIntensity),
    
    // Obtener estados de color con tema actual
    getStates: (type) => getStateColors(type, mergedTheme),
    
    // Aplicar opacidad con tema actual
    withOpacity: (color, opacity) => withOpacity(color, opacity),
    
    // Generar gradiente personalizado
    createGradient: (startColor, endColor, direction = '135deg') => 
      `linear-gradient(${direction}, ${startColor} 0%, ${endColor} 100%)`,
  };

  // =============================================================================
  // 🌟 VALUE DEL CONTEXT
  // =============================================================================
  const contextValue = {
    // Estado actual
    theme: mergedTheme,
    currentThemeName: currentTheme,
    customColors,
    
    // Funciones de gestión
    changeTheme,
    updateColors,
    updateBrandColor,
    updateGradient,
    resetTheme,
    getCurrentPalette,
    
    // Helpers contextualizados
    ...contextualHelpers,
    
    // Acceso directo a colores (para compatibilidad)
    colors: mergedTheme,
    brand: mergedTheme.brand,
    semantic: mergedTheme.semantic,
    gradients: mergedTheme.gradients,
    surfaces: mergedTheme.surfaces,
    text: mergedTheme.text,
    effects: mergedTheme.effects,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// =============================================================================
// 🔗 HOOKS ESPECIALIZADOS
// =============================================================================

/**
 * Hook para acceso rápido a colores de marca
 */
export const useBrandColors = () => {
  const { brand } = useTheme();
  return brand;
};

/**
 * Hook para acceso rápido a gradientes
 */
export const useGradients = () => {
  const { gradients } = useTheme();
  return gradients;
};

/**
 * Hook para gestión de colores (para componentes de configuración)
 */
export const useColorManagement = () => {
  const { 
    updateBrandColor, 
    updateGradient, 
    updateColors, 
    resetTheme,
    getCurrentPalette 
  } = useTheme();
  
  return {
    updateBrandColor,
    updateGradient, 
    updateColors,
    resetTheme,
    getCurrentPalette
  };
};

/**
 * Hook para crear superficies dinámicas
 */
export const useSurfaces = () => {
  const { createGlass, createDark, surfaces } = useTheme();
  
  return {
    createGlass,
    createDark,
    glass: surfaces.glass,
    dark: surfaces.dark,
    borders: surfaces.borders,
  };
};

export default ThemeProvider;

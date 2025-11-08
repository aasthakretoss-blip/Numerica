/**
 * 🎨 SISTEMA DE TOKENS DE COLOR - NUMERICA
 * 
 * Sistema centralizado para gestionar toda la paleta de colores
 * Categorizado por función para máxima consistencia visual
 * 
 * Uso: import { colors, gradients, surfaces } from '../styles/ColorTokens'
 */

// =============================================================================
// 🎯 COLORES PRIMARIOS DE MARCA
// =============================================================================
export const brandColors = {
  // Color signature de Numerica - Azul Marino Oscuro
  primary: '#1a365d',           // Azul marino principal (más oscuro)
  primaryDark: '#2c5282',       // Azul marino oscuro  
  primaryDeep: '#2a4365',       // Azul marino profundo
  
  // Colores de contraste para fondos claros
  surface: 'rgba(26, 54, 93, 0.1)',         // Azul marino translúcido
  surfaceDeep: '#2c5282',       // Azul marino sólido
  neutral: '#6b7280',           // Gris neutro - formularios
}

// =============================================================================
// 🚦 COLORES SEMÁNTICOS (ESTADOS)
// =============================================================================
export const semanticColors = {
  // Estados de éxito/activo
  success: '#2ecc71',           // Verde principal - estados activos
  successDark: '#27ae60',       // Verde oscuro - hover states
  successLight: '#a7f3d0',     // Verde claro - backgrounds
  
  // Estados de error/inactivo  
  error: '#e74c3c',             // Rojo principal - estados error
  errorDark: '#c0392b',         // Rojo oscuro - hover states
  errorLight: '#ff6b6b',        // Rojo claro - elementos suaves
  
  // Estados de advertencia
  warning: '#f39c12',           // Naranja principal
  warningDark: '#e67e22',       // Naranja oscuro
  warningLight: '#ffc107',      // Amarillo advertencia
  
  // Estados informativos
  info: '#03005cff',              // Azul info
  infoDark: '#020077ff',          // Azul info oscuro
}

// =============================================================================
// 🌊 GRADIENTES FUNCIONALES
// =============================================================================
export const gradients = {
  // Gradiente principal de marca
  primary: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
  
  // Gradientes organizados por contexto
  backgrounds: {
    primary: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
    secondary: 'linear-gradient(135deg, #ffffff 0%, #f8f8f8 100%)'  
  },
  
  text: {
    primary: 'linear-gradient(135deg, #1a365d 0%, #2a4365 100%)'  
  },
  
  buttons: {
    primary: 'linear-gradient(135deg, #1a365d 0%, #2a4365 100%)',
    success: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
    error: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    warning: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
  },
  
  // Gradientes semánticos específicos
  success: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
  error: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
  warning: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
  
  // Gradientes para categorías (Dashboard)
  category1: 'linear-gradient(135deg, #ffffffff 0%, #010001ff 100%)', // Búsqueda
  category2: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)', // Demográfico  
  category3: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)', // FPL
  category4: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)', // Créditos
  
  // Aliases para compatibilidad
  textPrimary: 'linear-gradient(135deg, #1a365d 0%, #2a4365 100%)',
  background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
}

// =============================================================================
// 💎 SUPERFICIES GLASSMORPHISM
// =============================================================================
export const surfaces = {
  // Fondos glassmorphism - orden de intensidad
  glass: {
    subtle: 'rgba(255, 255, 255, 0.3)',       // Muy sutil
    light: 'rgba(3, 1, 58, 0.5)',        // Estándar - más usado
    medium: 'rgba(255, 255, 255, 0.7)',       // Hover intenso
    strong: 'rgba(255, 255, 255, 0.9)',       // Muy visible
  },
  
  // Fondos oscuros
  dark: {
    subtle: 'rgba(0, 0, 0, 0.1)',
    medium: 'rgba(0, 0, 0, 0.2)',             // Sidebar estándar
    strong: 'rgba(0, 0, 0, 0.3)',
    overlay: 'rgba(0, 0, 0, 0.5)',            // Modales/overlays
  },
  
  // Inputs y formularios
  inputs: {
    background: 'rgba(255, 255, 255, 0.1)',
    focus: 'rgba(255, 255, 255, 0.15)',
    border: 'rgba(255, 255, 255, 0.3)'
  },
  
  // Botones específicos
  buttons: {
    primary: 'rgba(30, 58, 138, 0.9)',
    primaryOpaque: 'rgba(30, 58, 138, 0.9)', 
    secondary: 'rgba(107, 114, 128, 0.1)',
    disabled: 'rgba(156, 163, 175, 0.3)',
    filter: 'rgba(30, 58, 138, 0.2)',
    filterHover: 'rgba(30, 58, 138, 0.3)',
    filterActive: 'rgba(30, 58, 138, 0.4)',
    success: 'rgba(46, 204, 113, 0.2)',
    successHover: 'rgba(46, 204, 113, 0.3)'
  },
  
  // Overlays
  overlays: {
    light: 'rgba(0, 0, 0, 0.3)',
    medium: 'rgba(0, 0, 0, 0.5)',
    strong: 'rgba(0, 0, 0, 0.7)'
  },
  
  // Bordes glassmorphism
  borders: {
    subtle: 'rgba(200, 200, 200, 0.3)',       // Bordes suaves
    light: 'rgba(200, 200, 200, 0.5)',        // Bordes estándar  
    medium: 'rgba(200, 200, 200, 0.5)',       // Bordes estándar (alias)
    strong: 'rgba(150, 150, 150, 0.7)',       // Bordes visibles
    accent: 'rgba(30, 58, 138, 0.5)',         // Bordes con color primario
    accentStrong: 'rgba(30, 58, 138, 0.8)',   // Focus/hover states
    success: 'rgba(46, 204, 113, 0.5)',       // Bordes de éxito
  }
}

// =============================================================================
// 📏 COLORES DE TEXTO Y CONTENIDO
// =============================================================================
export const textColors = {
  // Texto sobre fondos claros
  primary: '#2c3e50',                         // Texto principal oscuro
  secondary: 'rgba(44, 62, 80, 0.9)',        // Texto secundario
  muted: 'rgba(44, 62, 80, 0.7)',            // Texto discreto
  disabled: 'rgba(44, 62, 80, 0.5)',         // Texto deshabilitado
  subtle: 'rgba(44, 62, 80, 0.6)',           // Placeholders
  inverted: '#2c3e50',                        // Texto para fondos claros
  
  // Texto de accent/destacado
  accent: '#1a365d',                          // Texto con color primario azul marino
  accentHover: '#2c5282',                     // Hover sobre accent
}

// =============================================================================
// 🏛️ EFECTOS Y ESTADOS
// =============================================================================
export const effects = {
  // Sombras categorizadas
  shadows: {
    small: '0 2px 8px rgba(0, 0, 0, 0.1)',
    subtle: '0 2px 4px rgba(0, 0, 0, 0.1)',
    medium: '0 4px 12px rgba(0, 0, 0, 0.15)', 
    large: '0 20px 60px rgba(0, 0, 0, 0.3)',
    strong: '0 8px 25px rgba(0, 0, 0, 0.2)',
    intense: '0 15px 35px rgba(0, 0, 0, 0.25)',
    focus: '0 0 20px rgba(30, 58, 138, 0.2)',
    colored: '0 8px 25px rgba(30, 58, 138, 0.4)',  // Sombra con color primario
  },
  
  // Backdrop filters
  blur: {
    light: 'blur(10px)',
    medium: 'blur(15px)', 
    strong: 'blur(20px)',
  },
  
  // Estados hover/focus
  states: {
    hoverTransform: 'translateY(-2px)',
    hoverTransformStrong: 'translateY(-5px)',
    focusRing: '0 0 0 3px rgba(30, 58, 138, 0.2)',
    transition: 'all 0.3s ease',
    transitionFast: 'all 0.2s ease-in-out',
  }
}

// =============================================================================
// 🔧 FUNCIONES HELPER PARA COLORES DINÁMICOS  
// =============================================================================

/**
 * Generar color con opacidad específica
 */
export const withOpacity = (color, opacity) => {
  // Si es un color hex, convertir a rgba
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);  
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  // Si ya es rgba, reemplazar opacidad
  if (color.startsWith('rgba')) {
    return color.replace(/[\d.]+\)$/g, `${opacity})`);
  }
  return color;
};

/**
 * Generar superficie glassmorphism personalizada
 */
export const createGlassSurface = (opacity = 0.1, blurIntensity = 'medium') => ({
  background: `rgba(255, 255, 255, ${opacity})`,
  backdropFilter: effects.blur[blurIntensity],
  border: `1px solid ${surfaces.borders.medium}`,
});

/**
 * Generar superficie oscura personalizada  
 */
export const createDarkSurface = (opacity = 0.2, blurIntensity = 'medium') => ({
  background: `rgba(0, 0, 0, ${opacity})`,
  backdropFilter: effects.blur[blurIntensity],
  border: `1px solid ${surfaces.borders.subtle}`,
});

/**
 * Estados de color para elementos interactivos
 */
export const getStateColors = (type = 'primary') => {
  const states = {
    primary: {
      normal: brandColors.primary,
      hover: textColors.primary,
      focus: brandColors.primary,
      background: surfaces.glass.light,
      backgroundHover: surfaces.glass.medium,
      border: surfaces.borders.medium,
      borderHover: surfaces.borders.accentStrong,
    },
    success: {
      normal: semanticColors.success,
      hover: semanticColors.successDark,
      focus: semanticColors.success,
      background: withOpacity(semanticColors.success, 0.1),
      backgroundHover: withOpacity(semanticColors.success, 0.2),
      border: withOpacity(semanticColors.success, 0.3),
      borderHover: semanticColors.success,
    },
    error: {
      normal: semanticColors.error,
      hover: semanticColors.errorDark,  
      focus: semanticColors.error,
      background: withOpacity(semanticColors.error, 0.1),
      backgroundHover: withOpacity(semanticColors.error, 0.2),
      border: withOpacity(semanticColors.error, 0.3),
      borderHover: semanticColors.error,
    }
  };
  
  return states[type] || states.primary;
};

// =============================================================================
// 🎨 PALETA COMPLETA PARA EXPORT
// =============================================================================
export const colors = {
  ...brandColors,
  ...semanticColors,
  text: textColors,
  surfaces,
  gradients,
  effects,
  
  // Shortcuts para acceso rápido
  primary: brandColors.primary,
  white: textColors.primary,
  accent: textColors.accent,
  
  // Colores de estado para compatibilidad
  status: {
    success: semanticColors.success,
    error: semanticColors.error,
    warning: semanticColors.warning,
    info: semanticColors.info
  },
  
  // Alias de marca
  brand: {
    primary: brandColors.primary,
    secondary: brandColors.primaryDark,
    tertiary: brandColors.primaryDeep
  }
}

// Export default para import simple
export default colors;

// =============================================================================  
// 📚 GUÍA DE USO
// =============================================================================
/*
EJEMPLOS DE USO:

1. Import básico:
   import colors from '../styles/ColorTokens'
   color: colors.primary

2. Import específico:
   import { brandColors, gradients } from '../styles/ColorTokens'
   background: gradients.primary

3. Funciones helper:
   import { createGlassSurface, getStateColors } from '../styles/ColorTokens'
   ...createGlassSurface(0.15, 'strong')

4. Estados dinámicos:
   const primaryStates = getStateColors('primary')
   color: primaryStates.normal
   '&:hover': { color: primaryStates.hover }

5. Con styled-components:
   const Card = styled.div`
     ${createGlassSurface(0.1, 'medium')};
     color: ${colors.text.primary};
     border-color: ${colors.surfaces.borders.accent};
   `

*/

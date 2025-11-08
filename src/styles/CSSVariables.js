/**
 * 🎨 GENERADOR DE VARIABLES CSS - NUMERICA
 * 
 * Convierte los tokens de color en variables CSS estándar
 * Para compatibilidad con CSS puro y frameworks
 */

import { 
  brandColors, 
  semanticColors, 
  gradients, 
  surfaces, 
  textColors,
  effects,
  withOpacity
} from './ColorTokens';

// =============================================================================
// 🔧 GENERADOR DE VARIABLES CSS
// =============================================================================

/**
 * Generar todas las variables CSS basadas en tokens
 */
export const generateCSSVariables = (customColors = {}) => {
  // Merge colores base con customizaciones
  const mergedBrand = { ...brandColors, ...customColors.brand };
  const mergedSemantic = { ...semanticColors, ...customColors.semantic };
  const mergedGradients = { ...gradients, ...customColors.gradients };
  
  return {
    // =============================================================================
    // 🎯 COLORES DE MARCA
    // =============================================================================
    '--brand-primary': mergedBrand.primary,
    '--brand-primary-dark': mergedBrand.primaryDark,
    '--brand-primary-deep': mergedBrand.primaryDeep,
    '--brand-surface': mergedBrand.surface,
    '--brand-surface-deep': mergedBrand.surfaceDeep,
    '--brand-neutral': mergedBrand.neutral,
    
    // Variaciones con opacidad del color primario
    '--brand-primary-alpha-10': withOpacity(mergedBrand.primary, 0.1),
    '--brand-primary-alpha-20': withOpacity(mergedBrand.primary, 0.2),
    '--brand-primary-alpha-30': withOpacity(mergedBrand.primary, 0.3),
    '--brand-primary-alpha-50': withOpacity(mergedBrand.primary, 0.5),
    '--brand-primary-alpha-80': withOpacity(mergedBrand.primary, 0.8),
    
    // =============================================================================
    // 🚦 COLORES SEMÁNTICOS
    // =============================================================================
    '--semantic-success': mergedSemantic.success,
    '--semantic-success-dark': mergedSemantic.successDark,
    '--semantic-success-alpha-10': withOpacity(mergedSemantic.success, 0.1),
    '--semantic-success-alpha-20': withOpacity(mergedSemantic.success, 0.2),
    '--semantic-success-alpha-30': withOpacity(mergedSemantic.success, 0.3),
    
    '--semantic-error': mergedSemantic.error,
    '--semantic-error-dark': mergedSemantic.errorDark,
    '--semantic-error-alpha-10': withOpacity(mergedSemantic.error, 0.1),
    '--semantic-error-alpha-20': withOpacity(mergedSemantic.error, 0.2),
    '--semantic-error-alpha-30': withOpacity(mergedSemantic.error, 0.3),
    
    '--semantic-warning': mergedSemantic.warning,
    '--semantic-warning-dark': mergedSemantic.warningDark,
    '--semantic-warning-alpha-10': withOpacity(mergedSemantic.warning, 0.1),
    '--semantic-warning-alpha-20': withOpacity(mergedSemantic.warning, 0.2),
    
    // =============================================================================
    // 🌊 GRADIENTES
    // =============================================================================
    '--gradient-primary': mergedGradients.primary,
    '--gradient-background': mergedGradients.background,
    '--gradient-text-primary': mergedGradients.textPrimary,
    '--gradient-success': mergedGradients.success,
    '--gradient-error': mergedGradients.error,
    '--gradient-warning': mergedGradients.warning,
    '--gradient-category-1': mergedGradients.category1,
    '--gradient-category-2': mergedGradients.category2,
    '--gradient-category-3': mergedGradients.category3,
    '--gradient-category-4': mergedGradients.category4,
    
    // =============================================================================
    // 💎 SUPERFICIES
    // =============================================================================
    '--surface-glass-subtle': surfaces.glass.subtle,
    '--surface-glass-light': surfaces.glass.light,
    '--surface-glass-medium': surfaces.glass.medium,
    '--surface-glass-strong': surfaces.glass.strong,
    
    '--surface-dark-subtle': surfaces.dark.subtle,
    '--surface-dark-medium': surfaces.dark.medium,
    '--surface-dark-strong': surfaces.dark.strong,
    '--surface-dark-overlay': surfaces.dark.overlay,
    
    '--border-subtle': surfaces.borders.subtle,
    '--border-medium': surfaces.borders.medium,
    '--border-strong': surfaces.borders.strong,
    '--border-accent': surfaces.borders.accent,
    '--border-accent-strong': surfaces.borders.accentStrong,
    
    // =============================================================================
    // 📝 COLORES DE TEXTO
    // =============================================================================
    '--text-primary': textColors.primary,
    '--text-secondary': textColors.secondary,
    '--text-muted': textColors.muted,
    '--text-disabled': textColors.disabled,
    '--text-subtle': textColors.subtle,
    '--text-accent': textColors.accent,
    '--text-accent-hover': textColors.accentHover,
    
    // =============================================================================
    // 🎛️ EFECTOS
    // =============================================================================
    '--shadow-subtle': effects.shadows.subtle,
    '--shadow-medium': effects.shadows.medium,
    '--shadow-strong': effects.shadows.strong,
    '--shadow-intense': effects.shadows.intense,
    '--shadow-colored': effects.shadows.colored,
    
    '--blur-light': effects.blur.light,
    '--blur-medium': effects.blur.medium,
    '--blur-strong': effects.blur.strong,
    
    '--transition': effects.states.transition,
    '--transition-fast': effects.states.transitionFast,
    '--hover-transform': effects.states.hoverTransform,
    '--hover-transform-strong': effects.states.hoverTransformStrong,
    '--focus-ring': effects.states.focusRing,
    
    // =============================================================================
    // 🔵 VARIABLES DE AMPLIFY (Sobrescribir valores por defecto)
    // =============================================================================
    '--amplify-colors-primary-10': withOpacity(mergedBrand.primary, 0.1),
    '--amplify-colors-primary-20': withOpacity(mergedBrand.primary, 0.2),
    '--amplify-colors-primary-40': withOpacity(mergedBrand.primary, 0.4),
    '--amplify-colors-primary-60': withOpacity(mergedBrand.primary, 0.6),
    '--amplify-colors-primary-80': mergedBrand.primary, // Azul oscuro para el botón
    '--amplify-colors-primary-90': withOpacity(mergedBrand.primary, 0.9),
    '--amplify-colors-primary-100': mergedBrand.primary,
    '--amplify-colors-brand-primary-10': withOpacity(mergedBrand.primary, 0.1),
    '--amplify-colors-brand-primary-20': withOpacity(mergedBrand.primary, 0.2),
    '--amplify-colors-brand-primary-40': withOpacity(mergedBrand.primary, 0.4),
    '--amplify-colors-brand-primary-60': withOpacity(mergedBrand.primary, 0.6),
    '--amplify-colors-brand-primary-80': mergedBrand.primary, // Azul oscuro para el botón
    '--amplify-colors-brand-primary-90': withOpacity(mergedBrand.primary, 0.9),
    '--amplify-colors-brand-primary-100': mergedBrand.primary,
  };
};

// =============================================================================
// 🔧 UTILIDADES PARA APLICAR VARIABLES
// =============================================================================

/**
 * Aplicar variables CSS al :root del documento
 */
export const applyCSSDVariables = (customColors = {}) => {
  const variables = generateCSSVariables(customColors);
  const root = document.documentElement;
  
  Object.entries(variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  
  // Debug: mostrar variables aplicadas
  console.log('🎨 Variables CSS aplicadas:', Object.keys(variables).length);
};

/**
 * Remover todas las variables CSS personalizadas
 */
export const removeCSSVariables = () => {
  const variables = generateCSSVariables();
  const root = document.documentElement;
  
  Object.keys(variables).forEach(property => {
    root.style.removeProperty(property);
  });
};

/**
 * Generar string CSS con todas las variables para inyección
 */
export const generateCSSVariablesString = (customColors = {}) => {
  const variables = generateCSSVariables(customColors);
  
  const cssString = `:root {\n${
    Object.entries(variables)
      .map(([property, value]) => `  ${property}: ${value};`)
      .join('\n')
  }\n}`;
  
  return cssString;
};

/**
 * Hook para usar variables CSS con React
 */
export const useCSSVariables = () => {
  const applyVariables = (customColors) => {
    applyCSSDVariables(customColors);
  };
  
  const removeVariables = () => {
    removeCSSVariables();
  };
  
  const generateString = (customColors) => {
    return generateCSSVariablesString(customColors);
  };
  
  return {
    applyVariables,
    removeVariables,
    generateString,
  };
};

// =============================================================================
// 🎨 PRESET DE VARIABLES PARA DESARROLLO
// =============================================================================

/**
 * Aplicar variables por defecto al montar la aplicación
 */
export const initializeDefaultVariables = () => {
  applyCSSDVariables();
  console.log('✅ Variables CSS de Numerica aplicadas');
};

// Export por defecto
const cssVariables = {
  generateCSSVariables,
  applyCSSDVariables,
  removeCSSVariables,
  generateCSSVariablesString,
  useCSSVariables,
  initializeDefaultVariables,
};

export default cssVariables;

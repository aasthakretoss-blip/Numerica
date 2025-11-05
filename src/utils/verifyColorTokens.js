/**
 * 🔍 VERIFICADOR DE TOKENS DE COLOR - NUMERICA
 * 
 * Script para verificar que todos los tokens están correctamente
 * aplicados como variables CSS y disponibles en el DOM
 */

import { generateCSSVariables } from '../styles/CSSVariables';
import { 
  brandColors, 
  semanticColors, 
  surfaces, 
  textColors, 
  effects, 
  gradients 
} from '../styles/ColorTokens';

/**
 * Verificar que las variables CSS están aplicadas en el DOM
 */
export const verifyDOMVariables = () => {
  const root = document.documentElement;
  const variables = generateCSSVariables();
  
  const results = {
    applied: [],
    missing: [],
    total: Object.keys(variables).length
  };
  
  Object.keys(variables).forEach(variableName => {
    const value = getComputedStyle(root).getPropertyValue(variableName);
    
    if (value && value.trim()) {
      results.applied.push({
        name: variableName,
        value: value.trim()
      });
    } else {
      results.missing.push(variableName);
    }
  });
  
  return results;
};

/**
 * Verificar integridad de los tokens de color
 */
export const verifyTokenIntegrity = () => {
  const checks = {
    brandColors: {
      passed: true,
      required: ['primary', 'primaryDark', 'primaryDeep'],
      missing: []
    },
    surfaces: {
      passed: true,
      required: ['glass', 'borders', 'inputs', 'buttons'],
      missing: []
    },
    textColors: {
      passed: true,
      required: ['primary', 'secondary', 'accent', 'muted'],
      missing: []
    },
    effects: {
      passed: true,
      required: ['shadows', 'blur', 'states'],
      missing: []
    }
  };
  
  // Verificar brandColors
  checks.brandColors.required.forEach(key => {
    if (!brandColors[key]) {
      checks.brandColors.missing.push(key);
      checks.brandColors.passed = false;
    }
  });
  
  // Verificar surfaces
  checks.surfaces.required.forEach(key => {
    if (!surfaces[key]) {
      checks.surfaces.missing.push(key);
      checks.surfaces.passed = false;
    }
  });
  
  // Verificar textColors
  checks.textColors.required.forEach(key => {
    if (!textColors[key]) {
      checks.textColors.missing.push(key);
      checks.textColors.passed = false;
    }
  });
  
  // Verificar effects
  checks.effects.required.forEach(key => {
    if (!effects[key]) {
      checks.effects.missing.push(key);
      checks.effects.passed = false;
    }
  });
  
  return checks;
};

/**
 * Ejecutar verificación completa
 */
export const runFullVerification = () => {
  console.log('🔍 VERIFICADOR DE TOKENS DE COLOR - NUMERICA');
  console.log('=' .repeat(50));
  
  // Verificar integridad de tokens
  const tokenIntegrity = verifyTokenIntegrity();
  console.log('✅ Verificación de integridad de tokens:');
  Object.entries(tokenIntegrity).forEach(([category, result]) => {
    if (result.passed) {
      console.log(`   ✓ ${category}: OK`);
    } else {
      console.log(`   ❌ ${category}: Faltan propiedades:`, result.missing);
    }
  });
  
  // Verificar variables CSS en DOM
  const domVariables = verifyDOMVariables();
  console.log('\n🎨 Variables CSS aplicadas al DOM:');
  console.log(`   Total: ${domVariables.total}`);
  console.log(`   Aplicadas: ${domVariables.applied.length}`);
  console.log(`   Faltantes: ${domVariables.missing.length}`);
  
  if (domVariables.missing.length > 0) {
    console.log('   ❌ Variables CSS faltantes:', domVariables.missing);
  }
  
  // Mostrar muestra de variables aplicadas
  console.log('\n📋 Muestra de variables aplicadas:');
  domVariables.applied.slice(0, 10).forEach(variable => {
    console.log(`   ${variable.name}: ${variable.value}`);
  });
  
  // Verificar colores específicos más usados
  console.log('\n🎯 Verificación de colores críticos:');
  const criticalColors = [
    '--brand-primary',
    '--surface-glass-light',
    '--border-medium',
    '--text-primary',
    '--shadow-medium'
  ];
  
  criticalColors.forEach(colorVar => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(colorVar);
    if (value && value.trim()) {
      console.log(`   ✓ ${colorVar}: ${value.trim()}`);
    } else {
      console.log(`   ❌ ${colorVar}: NO ENCONTRADO`);
    }
  });
  
  // Resumen final
  const overallScore = (
    (Object.values(tokenIntegrity).filter(r => r.passed).length / Object.keys(tokenIntegrity).length) * 0.5 +
    (domVariables.applied.length / domVariables.total) * 0.5
  ) * 100;
  
  console.log('\n🏆 PUNTUACIÓN GENERAL:', `${Math.round(overallScore)}%`);
  
  if (overallScore >= 95) {
    console.log('🎉 ¡Excelente! Los tokens están perfectamente configurados.');
  } else if (overallScore >= 80) {
    console.log('👍 Bueno. Hay algunas áreas menores que mejorar.');
  } else {
    console.log('⚠️  Necesita atención. Algunos tokens no están aplicados correctamente.');
  }
  
  return {
    tokenIntegrity,
    domVariables,
    overallScore
  };
};

// Función para ejecutar desde DevTools
window.verifyNumericalTokens = runFullVerification;

export default {
  verifyDOMVariables,
  verifyTokenIntegrity,
  runFullVerification
};

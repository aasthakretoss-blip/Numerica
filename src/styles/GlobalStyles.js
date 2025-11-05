import { createGlobalStyle } from 'styled-components';
import { surfaces, textColors, effects, gradients } from './ColorTokens';

const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    line-height: 1.6;
    overflow-x: hidden;
  }

  code {
    font-family: 'Fira Code', 'Monaco', 'Consolas', 'Ubuntu Mono', monospace;
  }

  /* Scrollbar personalizado */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${surfaces.glass.subtle};
  }

  ::-webkit-scrollbar-thumb {
    background: ${surfaces.borders.strong};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${surfaces.borders.accentStrong};
  }

  /* Animaciones suaves */
  * {
    transition: ${effects.states.transitionFast};
  }

  /* Botones base */
  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    text-decoration: none;
    display: inline-block;
    text-align: center;
    transition: ${effects.states.transition};
    background: ${surfaces.glass.light};
    color: ${textColors.primary};
    border: 1px solid ${surfaces.borders.medium};
    backdrop-filter: ${effects.blur.light};
  }

  .btn:hover {
    background: ${surfaces.glass.medium};
    transform: ${effects.states.hoverTransform};
    box-shadow: ${effects.shadows.strong};
  }

  .btn-primary {
    background: ${gradients.buttons.primary};
    border: none;
  }

  .btn-primary:hover {
    background: ${gradients.buttons.primary};
    opacity: 0.9;
  }
`;

export default GlobalStyles;

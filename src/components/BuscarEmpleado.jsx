import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { surfaces, textColors, effects, brandColors } from '../styles/ColorTokens';

const TextBoxContainer = styled.div`
  position: relative;
  min-width: 250px;
  max-width: 300px;
`;

const TextBoxInput = styled.input`
  width: 100%;
  background: ${surfaces.inputs.background};
  backdrop-filter: ${effects.blur.medium};
  border: 1px solid ${surfaces.inputs.border};
  border-radius: 12px;
  padding: 0.75rem 3rem 0.75rem 1rem;
  color: ${textColors.primary};
  font-size: 0.9rem;
  transition: ${effects.states.transition};
  box-shadow: ${effects.shadows.subtle};
  box-sizing: border-box;
  
  &::placeholder {
    color: ${textColors.muted};
    font-weight: 500;
  }
  
  &:hover {
    background: ${surfaces.buttons.filter};
    border-color: ${surfaces.borders.accent};
    transform: ${effects.states.hoverTransform};
    box-shadow: ${effects.shadows.medium};
    
    &::placeholder {
      color: ${textColors.accent};
    }
  }
  
  &:focus {
    outline: none;
    border-color: ${brandColors.primary};
    box-shadow: ${effects.states.focusRing};
    background: ${surfaces.inputs.focus};
    color: ${textColors.accent};
    transform: none;
    
    &::placeholder {
      color: ${textColors.subtle};
    }
  }
  
  ${props => props.$hasValue && `
    color: ${textColors.accent};
    font-weight: 600;
    background: ${surfaces.inputs.focus};
    border-color: ${surfaces.borders.accentStrong};
  `}
`;

const SearchIconContainer = styled.div`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${textColors.muted};
  font-size: 0.8rem;
  pointer-events: none;
  transition: ${effects.states.transition};
  
  ${props => props.$focused && `
    color: ${textColors.accent};
  `}
  
  ${props => props.$hasValue && `
    color: ${textColors.accent};
  `}
`;

const ClearButton = styled.button`
  position: absolute;
  right: 2.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: ${textColors.muted};
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 4px;
  transition: ${effects.states.transitionFast};
  display: ${props => props.$show ? 'block' : 'none'};
  
  &:hover {
    background: ${surfaces.buttons.filter};
    color: ${textColors.accent};
  }
`;

const BuscarEmpleado = ({
  placeholder = "Nombre / CURP",
  value = "",
  onChange,
  disabled = false,
  className = ""
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  const handleInputChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleClear = () => {
    if (onChange) {
      onChange("");
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const hasValue = value && value.trim().length > 0;

  return (
    <TextBoxContainer className={className}>
      <TextBoxInput
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        $hasValue={hasValue}
      />
      
      <ClearButton 
        $show={hasValue}
        onClick={handleClear}
        title="Limpiar búsqueda"
        type="button"
      >
        <FaTimes size={10} />
      </ClearButton>
      
      <SearchIconContainer 
        $focused={isFocused}
        $hasValue={hasValue}
      >
        <FaSearch />
      </SearchIconContainer>
    </TextBoxContainer>
  );
};

export default BuscarEmpleado;

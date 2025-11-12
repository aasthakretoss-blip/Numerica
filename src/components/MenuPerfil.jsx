import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styled, {
  ThemeProvider as StyledThemeProvider,
} from "styled-components";
import { useTheme } from "../contexts/ThemeContext";
import { FaUser, FaClipboardList, FaHistory, FaFileAlt } from "react-icons/fa";

const MenuContainer = styled.nav`
  display: flex;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  padding: 1rem;
  gap: 0.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
  }

  @media (max-width: 480px) {
    padding: 0.75rem;
    gap: 0.5rem;
  }
`;

const MenuButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 16px;
  background: ${(props) =>
    props.$isActive
      ? props.theme?.brand?.primary || "#1a365d"
      : "rgba(255, 255, 255, 0.1)"};
  color: ${(props) =>
    props.$isActive
      ? "white"
      : props.theme?.text?.primary || "rgba(44, 62, 80, 0.8)"};
  font-weight: ${(props) => (props.$isActive ? "600" : "500")};
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex: 1;
  position: relative;
  border: 1px solid
    ${(props) =>
      props.$isActive
        ? props.theme?.brand?.primary || "#1a365d"
        : "rgba(255, 255, 255, 0.1)"};

  &:hover {
    background: ${(props) =>
      props.$isActive
        ? props.theme?.brand?.primaryDark || "#2c5282"
        : props.theme?.surfaces?.glass?.medium || "rgba(255, 255, 255, 0.2)"};
    color: ${(props) =>
      props.$isActive ? "white" : props.theme?.text?.primary || "#2c3e50"};
    transform: translateY(-2px);
    box-shadow: ${(props) =>
      props.theme?.effects?.shadows?.medium ||
      "0 8px 25px rgba(0, 0, 0, 0.15)"};
    border-color: ${(props) =>
      props.$isActive
        ? props.theme?.brand?.primaryDark || "#2c5282"
        : "rgba(255, 255, 255, 0.3)"};
  }

  &:active {
    transform: translateY(0);
    box-shadow: ${(props) =>
      props.theme?.effects?.shadows?.small || "0 4px 15px rgba(0, 0, 0, 0.1)"};
  }

  .icon {
    font-size: 1.1rem;
    min-width: 1.1rem;
  }

  .label {
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 1rem;
    justify-content: flex-start;
  }

  @media (max-width: 480px) {
    padding: 0.875rem;
    font-size: 0.9rem;
    gap: 0.625rem;

    .icon {
      font-size: 1rem;
    }
  }
`;

const tabs = [
  {
    key: "empleado",
    label: "Empleado",
    icon: FaUser,
    path: "",
  },
  {
    key: "fpl",
    label: "FPL",
    icon: FaClipboardList,
    path: "/fpl",
  },
  {
    key: "historico",
    label: "Histórico",
    icon: FaHistory,
    path: "/historico",
  },
  {
    key: "documentos",
    label: "Documentos",
    icon: FaFileAlt,
    path: "/documentos",
  },
];

const MenuPerfil = ({ rfc, curp }) => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Determinar qué tab está activa basada en la URL
  const activeTab = location.pathname.includes("/fpl")
    ? "fpl"
    : location.pathname.includes("/historico")
    ? "historico"
    : location.pathname.includes("/documentos")
    ? "documentos"
    : "empleado";

  const handleTabChange = (tabKey) => {
    if (!rfc) return;

    const basePath = `/perfil/${rfc}/${curp}`;
    const selectedTab = tabs.find((tab) => tab.key === tabKey);

    if (selectedTab) {
      navigate(`${basePath}${selectedTab.path}`);
    }
  };

  return (
    <StyledThemeProvider theme={theme}>
      <MenuContainer>
        {tabs.map((tabItem) => {
          const Icon = tabItem.icon;
          return (
            <MenuButton
              key={tabItem.key}
              $isActive={activeTab === tabItem.key}
              onClick={() => handleTabChange(tabItem.key)}
              title={`Ver ${tabItem.label}`}
            >
              <Icon className="icon" />
              <span className="label">{tabItem.label}</span>
            </MenuButton>
          );
        })}
      </MenuContainer>
    </StyledThemeProvider>
  );
};

export default MenuPerfil;

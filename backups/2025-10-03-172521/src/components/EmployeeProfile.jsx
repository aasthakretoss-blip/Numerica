import React from "react";
import { useParams, useLocation } from "react-router-dom";
import styled, {
  ThemeProvider as StyledThemeProvider,
} from "styled-components";
import { useTheme } from "../contexts/ThemeContext";
import PerfilEmpleado from "./profile/PerfilEmpleado";
import PerfilFPL from "./profile/PerfilFPL";
import PerfilHistorico from "./profile/PerfilHistorico";
import PerfilDocumentos from "./profile/PerfilDocumentos";

// Usando la misma estructura que BusquedaEmpleados
const PageContainer = styled.div`
  padding: 2rem 2rem 2rem 2rem;
  padding-right: calc(2rem - 10px);
  color: ${(props) => props.theme?.text?.primary || "#2c3e50"};
  min-height: calc(100vh - 80px);
  max-width: calc(100vw - 10px);
  overflow-x: hidden;
  box-sizing: border-box;
`;

const ContentSection = styled.div`
  background: ${(props) =>
    props.theme?.surfaces?.glass?.medium || "rgba(255, 255, 255, 0.15)"};
  backdrop-filter: ${(props) =>
    props.theme?.effects?.blur?.strong || "blur(20px)"};
  border-radius: 20px;
  padding: 2rem;
  margin-right: 10px;
  border: 1px solid
    ${(props) =>
      props.theme?.surfaces?.borders?.light || "rgba(255, 255, 255, 0.2)"};
  width: calc(100% - 10px);
  box-sizing: border-box;
  overflow: hidden;
`;

const EmployeeProfile = () => {
  const { theme } = useTheme();
  const { rfc } = useParams();
  const state = location.state;
  console.log(state, "state");
  const curp = state?.curp;
  const location = useLocation();

  // Determinar qué tab está activa basada en la URL
  const activeTab = location.pathname.includes("/fpl")
    ? "fpl"
    : location.pathname.includes("/historico")
    ? "historico"
    : location.pathname.includes("/documentos")
    ? "documentos"
    : "empleado";

  const renderActiveTab = () => {
    const commonProps = { rfc, curp };

    switch (activeTab) {
      case "fpl":
        return <PerfilFPL {...commonProps} />;
      case "historico":
        return <PerfilHistorico {...commonProps} />;
      case "documentos":
        return <PerfilDocumentos {...commonProps} />;
      default:
        return <PerfilEmpleado {...commonProps} />;
    }
  };

  return (
    <StyledThemeProvider theme={theme}>
      <PageContainer>
        <ContentSection>{renderActiveTab()}</ContentSection>
      </PageContainer>
    </StyledThemeProvider>
  );
};

export default EmployeeProfile;

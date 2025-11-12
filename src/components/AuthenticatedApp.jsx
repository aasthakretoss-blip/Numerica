import React, { useState, useEffect } from "react";
import {
  Authenticator,
  useAuthenticator,
  translations,
} from "@aws-amplify/ui-react";
import { fetchAuthSession } from "aws-amplify/auth";
import { I18n } from "aws-amplify/utils";
import styled from "styled-components";
import {
  surfaces,
  textColors,
  effects,
  brandColors,
  gradients,
  semanticColors,
} from "../styles/ColorTokens";
import { buildApiUrl } from "../config/apiConfig";
import "@aws-amplify/ui-react/styles.css";
import authenticatedFetch from "../services/authenticatedFetch";

// Configurar traducciones personalizadas
I18n.putVocabularies({
  es: {
    "Sign In": "Iniciar sesión",
    "Sign in": "Iniciar sesión",
    "Forgot your password?": "Recuperar contraseña",
  },
});
I18n.setLanguage("es");

const AuthContainer = styled.div`
  .amplify-authenticator {
    --amplify-primary-color: #1a365d;
    --amplify-primary-tint: #2c5282;
    --amplify-primary-shade: #2a4365;
    --amplify-background-color: transparent;

    background: ${gradients.backgrounds.primary};
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;

    .amplify-label,
    label.amplify-label,
    .amplify-field__label {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      margin: 0 !important;
    }

    .amplify-card {
      background: ${surfaces.glass.strong};
      backdrop-filter: ${effects.blur.medium};
      border-radius: 20px;
      border: 1px solid ${surfaces.borders.medium};
      box-shadow: ${effects.shadows.strong};

      .amplify-heading {
        color: ${textColors.primary};
        font-weight: 300;
        letter-spacing: 1px;
      }

      .amplify-input {
        background: ${surfaces.inputs.background};
        border: 1px solid ${surfaces.borders.medium};
        border-radius: 10px;
        color: ${textColors.primary};
        backdrop-filter: ${effects.blur.light};

        &::placeholder {
          color: ${textColors.subtle};
        }

        &:focus {
          border-color: ${brandColors.primary};
          background: ${surfaces.inputs.focus};
          box-shadow: ${effects.states.focusRing};
        }
      }

      .amplify-button--primary,
      button.amplify-button[type="submit"],
      button[data-amplify-form-submit] {
        background: #1a365d !important;
        background-color: #1a365d !important;
        border: none !important;
        border-radius: 25px;
        margin-top: 1.5rem;

        &:hover,
        &:focus,
        &:active {
          background: #2c5282 !important;
          background-color: #2c5282 !important;
          transform: ${effects.states.hoverTransform};
          box-shadow: ${effects.shadows.colored};
        }
      }

      .amplify-text {
        color: ${textColors.secondary};
      }

      .amplify-label {
        color: ${textColors.primary};
      }

      .amplify-button--link {
        color: ${textColors.accent};

        &:hover {
          color: ${textColors.accentHover};
        }
      }

      /* Ocultar el footer completamente */
      .amplify-flex[data-amplify-footer] {
        display: none !important;
      }

      /* Contenedor padre del link - en columna */
      form > div:has(.amplify-button--link[data-amplify-router-link]) {
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 0.5rem !important;
        width: 100% !important;
        margin-bottom: 1rem !important;
      }

      /* Ajustar padding del formulario */
      .amplify-card form {
        padding-bottom: 2rem !important;
      }

      /* Link de registro personalizado */
      .custom-signup-link {
        color: #1a365d !important;
        text-decoration: none !important;
        font-size: 0.9rem !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        transition: color 0.2s ease !important;

        &:hover {
          color: #2c5282 !important;
        }
      }
    }
  }
`;

const UserInfo = styled.div`
  position: absolute;
  top: 1rem;
  right: 2rem;
  background: ${surfaces.glass.strong};
  backdrop-filter: ${effects.blur.light};
  padding: 1rem 1.5rem;
  border-radius: 15px;
  border: 1px solid ${surfaces.borders.medium};
  color: ${textColors.primary};
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: ${effects.shadows.medium};
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const UserEmail = styled.span`
  font-size: 0.9rem;
  opacity: 0.8;
`;

const UserRole = styled.span`
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  background: ${(props) => {
    switch (props.role) {
      case "admin":
        return "linear-gradient(135deg, #ff6b6b, #ffa726)";
      case "moderator":
        return "linear-gradient(135deg, #4ecdc4, #45b7d1)";
      default:
        return "linear-gradient(135deg, #6c757d, #495057)";
    }
  }};
  border-radius: 12px;
  color: white;
  font-weight: 500;
  text-align: center;
`;

const LogoutButton = styled.button`
  background: ${surfaces.buttons.secondary};
  border: 1px solid ${semanticColors.errorLight};
  color: ${semanticColors.error};
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: ${effects.states.transition};

  &:hover {
    background: ${semanticColors.errorLight};
    border-color: ${semanticColors.error};
    transform: ${effects.states.hoverTransform};
  }
`;

const PermissionsDisplay = styled.div`
  position: absolute;
  bottom: 2rem;
  right: 2rem;
  background: ${surfaces.glass.strong};
  backdrop-filter: ${effects.blur.light};
  padding: 1rem;
  border-radius: 15px;
  border: 1px solid ${surfaces.borders.medium};
  color: ${textColors.primary};
  max-width: 300px;
  box-shadow: ${effects.shadows.medium};
`;

const PermissionItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0.5rem 0;
  font-size: 0.9rem;
`;

const PermissionStatus = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  background: ${(props) =>
    props.$allowed ? gradients.buttons.success : gradients.buttons.error};
  color: white;
`;

const AuthenticatedContent = ({ children }) => {
  const { user, signOut } = useAuthenticator();
  const didFetchRef = React.useRef(false);
  const [userPermissions, setUserPermissions] = useState({
    role: "user",
    canUpload: false,
    canViewFunds: false,
    permissionsLoaded: false,
  });

  useEffect(() => {
    const fetchUserPermissions = async () => {
      try {
        console.log("Usuario completo:", user);
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken;

        if (idToken) {
          const payload = idToken.payload;
          console.log("ID Token Payload:", payload);

          // Si el email está verificado y es el primer login, activar usuario en backend
          if (payload.email_verified === true && payload.email) {
            try {
              const activateResponse = await authenticatedFetch(
                buildApiUrl("/api/auth/activate-user"),
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: payload.email }),
                }
              );

              if (activateResponse.ok) {
                console.log("✅ Usuario activado en backend");
              }
            } catch (error) {
              console.warn("⚠️ Error activando usuario en backend:", error);
              // No bloquear el login si falla la activación
            }
          }

          setUserPermissions({
            role: payload["custom:role"] || "user",
            canUpload: payload["custom:can_upload"] === "true",
            canViewFunds: payload["custom:can_view_funds"] === "true",
            permissionsLoaded: payload["custom:permissions_loaded"] === "true",
          });
        } else {
          console.warn("No se encontró idToken en la sesión");
        }
      } catch (error) {
        console.error("Error fetching user permissions:", error);
        setUserPermissions({
          role: "user",
          canUpload: false,
          canViewFunds: false,
          permissionsLoaded: false,
        });
      }
    };

    if (user) {
      if (didFetchRef.current) return;
      didFetchRef.current = true;
      console.log("Usuario detectado, obteniendo permisos...");
      fetchUserPermissions();
    } else {
      console.log("No hay usuario autenticado");
    }
  }, [user]);

  if (!user) return null;

  return (
    <>
      <UserInfo>
        <UserDetails>
          <UserEmail>
            {user?.attributes?.email ||
              user?.signInDetails?.loginId ||
              "Usuario"}
          </UserEmail>
          <UserRole role={userPermissions.role}>
            {userPermissions.role.toUpperCase()}
          </UserRole>
        </UserDetails>
        <LogoutButton onClick={signOut}>Cerrar Sesión</LogoutButton>
      </UserInfo>

      <PermissionsDisplay>
        <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem" }}>Permisos</h4>
        <PermissionItem>
          <span>Subir archivos:</span>
          <PermissionStatus $allowed={userPermissions.canUpload}>
            {userPermissions.canUpload ? "Permitido" : "Denegado"}
          </PermissionStatus>
        </PermissionItem>
        <PermissionItem>
          <span>Ver fondos:</span>
          <PermissionStatus $allowed={userPermissions.canViewFunds}>
            {userPermissions.canViewFunds ? "Permitido" : "Denegado"}
          </PermissionStatus>
        </PermissionItem>
        <PermissionItem>
          <span>Permisos cargados:</span>
          <PermissionStatus $allowed={userPermissions.permissionsLoaded}>
            {userPermissions.permissionsLoaded ? "Sí" : "No"}
          </PermissionStatus>
        </PermissionItem>
      </PermissionsDisplay>

      {React.cloneElement(children, { userPermissions, user })}
    </>
  );
};

const AuthenticatedApp = ({ children }) => {
  return (
    <AuthContainer>
      <Authenticator
        loginMechanisms={["email"]}
        signUpAttributes={["email"]}
        hideSignUp={true}
        formFields={{
          signIn: {
            username: {
              label: "",
              placeholder: "Correo electrónico",
            },
            password: {
              label: "",
              placeholder: "Contraseña",
            },
          },
        }}
        components={{
          Header() {
            return (
              <div
                style={{
                  textAlign: "center",
                  padding: "2rem 0",
                  color: "#2c3e50",
                }}
              >
                <h1
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: "bold",
                    letterSpacing: "1px",
                    margin: 0,
                    color: "#1a365d",
                  }}
                >
                  Numerica
                </h1>
                <p
                  style={{
                    fontSize: "1.18rem",
                    margin: "0.5rem 0 0 0",
                    color: "#1a365d",
                  }}
                >
                  Información en acción
                </p>
              </div>
            );
          },
          Footer() {
            return null;
          },
        }}
      >
        <AuthenticatedContent>{children}</AuthenticatedContent>
      </Authenticator>
    </AuthContainer>
  );
};

export default AuthenticatedApp;

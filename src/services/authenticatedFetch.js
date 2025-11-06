import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Wrapper de fetch que incluye automáticamente el token de autenticación
 * en todas las peticiones a la API
 */
export const authenticatedFetch = async (url, options = {}) => {
  try {
    // Obtener la sesión de autenticación actual
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken;

    // Token will be added if available

    // Preparar los headers por defecto
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    // Agregar el token de Authorization si está disponible
    if (idToken) {
      defaultHeaders['Authorization'] = `Bearer ${idToken.toString()}`;
    }

    // Combinar headers por defecto con headers personalizados
    const headers = {
      ...defaultHeaders,
      ...(options.headers || {})
    };

    // Realizar la petición con los headers de autenticación
    const response = await fetch(url, {
      ...options,
      headers
    });

    return response;

  } catch (error) {
    // En caso de error de autenticación, intentar hacer la petición sin token
    return fetch(url, options);
  }
};

/**
 * Helper para peticiones GET autenticadas
 */
export const authenticatedGet = async (url, options = {}) => {
  return authenticatedFetch(url, {
    method: 'GET',
    ...options
  });
};

/**
 * Helper para peticiones POST autenticadas
 */
export const authenticatedPost = async (url, data, options = {}) => {
  return authenticatedFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options
  });
};

/**
 * Helper para peticiones PUT autenticadas
 */
export const authenticatedPut = async (url, data, options = {}) => {
  return authenticatedFetch(url, {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options
  });
};

/**
 * Helper para peticiones DELETE autenticadas
 */
export const authenticatedDelete = async (url, options = {}) => {
  return authenticatedFetch(url, {
    method: 'DELETE',
    ...options
  });
};

export default authenticatedFetch;

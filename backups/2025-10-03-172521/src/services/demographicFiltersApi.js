/**
 * Servicio para manejar los filtros del dashboard demográfico
 * Reutiliza la funcionalidad existente de BusquedaEmpleados pero adaptada para demográfico
 */

import {
  getPuestoCategoria,
  formatPuestosForDropdown,
  formatCategoriasForDropdown,
} from "../utils/puestoMapping";
import { buildApiUrl, isProduction, API_BASE_URL } from "../config/apiConfig";

/**
 * Carga todas las opciones de filtros para el dashboard demográfico
 * Similar a loadStaticFilterOptions de BusquedaEmpleados pero simplificado
 */
export const loadDemographicFilterOptions = async () => {
  try {
    console.log("🔄 Cargando opciones de filtros demográficos...");

    // Hacer petición a la API para obtener opciones estáticas
    // Reutilizamos el endpoint existente de payroll/filter-options
    const response = await fetch(
      `${API_BASE_URL}/api/payroll/filter-options`
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Error al cargar opciones de filtros");
    }

    const { data } = result;
    console.log("✅ Opciones de filtros cargadas:", {
      puestos: data.puestos?.length || 0,
      sucursales: data.sucursales?.length || 0, // sucursales vienen directamente del API
      status: data.estados?.length || 0,
    });

    // Generar categorías de puestos usando nuestro mapeo
    const puestosCategorias = [];
    const categoriasSet = new Set();

    // Procesar puestos y generar categorías con conteos
    if (data.puestos && data.puestos.length > 0) {
      const categoriaCounts = {};

      data.puestos.forEach((puesto) => {
        const categoria = getPuestoCategoria(puesto.value);
        if (categoria && categoria !== "Sin Categorizar") {
          if (!categoriaCounts[categoria]) {
            categoriaCounts[categoria] = 0;
          }
          categoriaCounts[categoria] += puesto.count || 0;
          categoriasSet.add(categoria);
        }
      });

      // Convertir conteos a formato de dropdown
      Object.entries(categoriaCounts).forEach(([categoria, count]) => {
        puestosCategorias.push({
          value: categoria,
          count: count,
        });
      });

      // Ordenar categorías alfabéticamente
      puestosCategorias.sort((a, b) => a.value.localeCompare(b.value, "es"));
    }

    // Procesar y formatear todas las opciones
    const filterOptions = {
      sucursales: formatPuestosForDropdown(data.sucursales || []), // sucursales vienen directamente del API
      puestos: formatPuestosForDropdown(data.puestos || []),
      puestosCategorias: puestosCategorias,
      status: formatPuestosForDropdown(data.estados || []),
    };

    console.log("📊 Filtros procesados para dashboard demográfico:", {
      sucursales: filterOptions.sucursales.length,
      puestos: filterOptions.puestos.length,
      puestosCategorias: filterOptions.puestosCategorias.length,
      status: filterOptions.status.length,
    });

    return filterOptions;
  } catch (error) {
    console.error("❌ Error cargando opciones de filtros demográficos:", error);
    throw error;
  }
};

/**
 * Carga conteos dinámicos de filtros basados en filtros activos
 * Adaptación de loadDynamicFilterCounts para el contexto demográfico
 */
export const loadDemographicFilterCounts = async (activeFilters = {}) => {
  try {
    console.log(
      "🔄 Recargando conteos dinámicos para demográfico:",
      activeFilters
    );

    const params = new URLSearchParams();

    // Aplicar filtros activos
    if (activeFilters.sucursales && activeFilters.sucursales.length > 0) {
      activeFilters.sucursales.forEach((sucursal) =>
        params.append("sucursal", sucursal)
      );
    }

    if (activeFilters.puestos && activeFilters.puestos.length > 0) {
      activeFilters.puestos.forEach((puesto) =>
        params.append("puesto", puesto)
      );
    }

    if (
      activeFilters.puestosCategorias &&
      activeFilters.puestosCategorias.length > 0
    ) {
      activeFilters.puestosCategorias.forEach((categoria) =>
        params.append("puestoCategoria", categoria)
      );
    }

    // Siempre filtrar por empleados activos para el dashboard demográfico
    params.append("status", "A");

    // Aplicar filtro de período si está disponible
    if (activeFilters.periodFilter) {
      params.append("cveper", activeFilters.periodFilter);
    }

    const response = await fetch(
      `${API_BASE_URL}/api/payroll/filter-options?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Error al cargar conteos dinámicos");
    }

    const { data } = result;

    // Generar categorías dinámicas con conteos actualizados
    const puestosCategorias = [];
    if (data.puestos && data.puestos.length > 0) {
      const categoriaCounts = {};

      data.puestos.forEach((puesto) => {
        const categoria = getPuestoCategoria(puesto.value);
        if (categoria && categoria !== "Sin Categorizar") {
          if (!categoriaCounts[categoria]) {
            categoriaCounts[categoria] = 0;
          }
          categoriaCounts[categoria] += puesto.count || 0;
        }
      });

      Object.entries(categoriaCounts).forEach(([categoria, count]) => {
        puestosCategorias.push({
          value: categoria,
          count: count,
        });
      });

      puestosCategorias.sort((a, b) => a.value.localeCompare(b.value, "es"));
    }

    const dynamicOptions = {
      sucursales: formatPuestosForDropdown(data.sucursales || []),
      puestos: formatPuestosForDropdown(data.puestos || []),
      puestosCategorias: puestosCategorias,
      status: formatPuestosForDropdown(data.estados || []),
    };

    console.log("📊 Conteos dinámicos actualizados:", {
      sucursales: dynamicOptions.sucursales.length,
      puestos: dynamicOptions.puestos.length,
      puestosCategorias: dynamicOptions.puestosCategorias.length,
    });

    return dynamicOptions;
  } catch (error) {
    console.error("❌ Error cargando conteos dinámicos:", error);
    throw error;
  }
};

/**
 * Construye parámetros de URL para filtros demográficos
 * Reutiliza lógica similar a BusquedaEmpleados
 */
export const buildDemographicFilterParams = (
  filters,
  additionalParams = {}
) => {
  const params = new URLSearchParams();

  // Aplicar filtros de dropdown
  if (filters.sucursales && filters.sucursales.length > 0) {
    filters.sucursales.forEach((sucursal) =>
      params.append("sucursal", sucursal)
    );
  }

  if (filters.puestos && filters.puestos.length > 0) {
    filters.puestos.forEach((puesto) => params.append("puesto", puesto));
  }

  if (filters.puestosCategorias && filters.puestosCategorias.length > 0) {
    filters.puestosCategorias.forEach((categoria) =>
      params.append("puestoCategoria", categoria)
    );
  }

  // Siempre filtrar por empleados activos en demográfico
  params.append("status", "A");

  // Aplicar período si está disponible
  if (filters.periodFilter) {
    params.append("cveper", filters.periodFilter);
  }

  // Parámetros adicionales (paginación, sorting, etc.)
  Object.entries(additionalParams).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      params.append(key, value);
    }
  });

  return params;
};

/**
 * Valida si los filtros han cambiado (para optimizar recargas)
 */
export const hasFiltersChanged = (oldFilters, newFilters) => {
  const keys = ["sucursales", "puestos", "puestosCategorias", "periodFilter"];

  for (const key of keys) {
    const oldValue = oldFilters[key];
    const newValue = newFilters[key];

    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      if (
        oldValue.length !== newValue.length ||
        !oldValue.every((val) => newValue.includes(val))
      ) {
        return true;
      }
    } else if (oldValue !== newValue) {
      return true;
    }
  }

  return false;
};

export default {
  loadDemographicFilterOptions,
  loadDemographicFilterCounts,
  buildDemographicFilterParams,
  hasFiltersChanged,
};

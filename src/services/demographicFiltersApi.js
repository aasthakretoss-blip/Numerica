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
import authenticatedFetch from "./authenticatedFetch";

/**
 * Carga todas las opciones de filtros para el dashboard demográfico
 * Similar a loadStaticFilterOptions de BusquedaEmpleados pero simplificado
 */
export const loadDemographicFilterOptions = async () => {
  try {
    console.log("🔄 Cargando opciones de filtros demográficos...");

    // Hacer petición a la API para obtener opciones estáticas
    // Reutilizamos el endpoint existente de payroll/filter-options
    const response = await authenticatedFetch(
      buildApiUrl("/api/payroll/filter-options")
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
        params.append("puestoCategorizado", categoria)
      );
    }

    // Siempre filtrar por empleados activos para el dashboard demográfico
    params.append("status", "A");

    // Aplicar filtro de período si está disponible y no está vacío
    if (activeFilters.periodFilter && activeFilters.periodFilter !== "") {
      params.append("cveper", activeFilters.periodFilter);
    }

    const response = await authenticatedFetch(
      buildApiUrl(`/api/payroll/filter-options?${params.toString()}`)
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
 * Calcula el último período disponible desde los datos reales de la base de datos
 * Realiza una consulta para obtener el cveper más reciente
 */
export const calculateLatestPeriodFromDatabase = async () => {
  try {
    console.log("📅 Calculando último período desde la base de datos...");

    // Hacer una consulta específica para obtener el período más reciente
    // Usando pageSize=1 y sortBy=cveper, sortDir=desc para obtener el más reciente
    const params = new URLSearchParams({
      pageSize: "1",
      page: "1",
      sortBy: "cveper",
      sortDir: "desc",
      status: "A", // Solo empleados activos para obtener período actual
    });

    const response = await authenticatedFetch(
      buildApiUrl(`/api/payroll?${params.toString()}`)
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success && result.data && result.data.length > 0) {
      const latestEmployee = result.data[0];
      const latestCveper = latestEmployee.cveper;

      console.log("📅 Empleado con cveper más reciente:", {
        nombre: latestEmployee.nombre,
        cveper: latestCveper,
        tipo: typeof latestCveper,
      });

      // Extraer la fecha del cveper
      let periodDate;
      if (typeof latestCveper === "string" && latestCveper.includes("T")) {
        // Es un timestamp ISO
        periodDate = new Date(latestCveper);
      } else if (
        typeof latestCveper === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(latestCveper)
      ) {
        // Es una fecha YYYY-MM-DD
        periodDate = new Date(latestCveper + "T12:00:00");
      } else {
        console.warn("⚠️ Formato de cveper inesperado:", latestCveper);
        // Usar fecha por defecto
        periodDate = new Date("2024-10-01T12:00:00");
      }

      // Validar que la fecha sea válida
      if (isNaN(periodDate.getTime())) {
        console.warn("⚠️ Fecha del período inválida:", latestCveper);
        // Usar fecha por defecto
        periodDate = new Date("2024-10-01T12:00:00");
      }

      // Convertir a formato YYYY-MM para filtros
      const year = periodDate.getFullYear();
      const month = periodDate.getMonth() + 1;
      const monthFilter = `${year}-${String(month).padStart(2, "0")}`;

      const periodInfo = {
        rawCveper: latestCveper,
        periodDate: periodDate,
        monthFilter: monthFilter,
        label: `${periodDate.toLocaleDateString("es-MX", {
          month: "long",
          year: "numeric",
        })}`,
        value: periodDate.toISOString().split("T")[0], // YYYY-MM-DD
      };

      console.log("✅ Último período calculado desde BD:", periodInfo);
      return periodInfo;
    } else {
      console.warn(
        "⚠️ No se encontraron datos para calcular el último período"
      );
      // Retornar período por defecto
      const defaultPeriod = new Date("2024-10-01T12:00:00");
      return {
        rawCveper: "2024-10-01",
        periodDate: defaultPeriod,
        monthFilter: "2024-10",
        label: "Octubre 2024",
        value: "2024-10-01",
      };
    }
  } catch (error) {
    console.error("❌ Error calculando último período desde BD:", error);
    // Retornar período por defecto en caso de error
    const defaultPeriod = new Date("2024-10-01T12:00:00");
    return {
      rawCveper: "2024-10-01",
      periodDate: defaultPeriod,
      monthFilter: "2024-10",
      label: "Octubre 2024",
      value: "2024-10-01",
    };
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

  // Aplicar filtro de búsqueda (nombre/Curp)
  if (filters.search && filters.search.trim() !== "") {
    params.append("search", filters.search.trim());
  }

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
      params.append("puestoCategorizado", categoria)
    );
  }

  // Siempre filtrar por empleados activos en demográfico (solo si no se especifica otro status)
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      filters.status.forEach((estado) => params.append("status", estado));
    } else {
      params.append("status", filters.status);
    }
  } else {
    params.append("status", "A");
  }

  // Aplicar período si está disponible y no está vacío
  if (filters.periodFilter && filters.periodFilter !== "") {
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
  calculateLatestPeriodFromDatabase,
  buildDemographicFilterParams,
  hasFiltersChanged,
};

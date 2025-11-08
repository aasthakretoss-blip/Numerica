/**
 * Utilidad para mapear puestos y categorías
 * Basado en el archivo puesto_index.csv
 */

// Mapeo de puestos a categorías basado en puesto_index.csv
const PUESTO_CATEGORIA_MAPPING = {
  'ACCESORIOS': 'Apoyo Operativo',
  'ADMINISTRACION': 'Administrativo',
  'ADMINISTRACION DE GARANTIAS': 'Garantias y Seguros',
  'ADMINISTRADOR DE GARANTIAS': 'Garantias y Seguros',
  'ADMINISTRADOR DE SEMINUEVOS': 'Administrativo',
  'ADMINISTRADOR DE VENTAS DE FLOTILLAS': 'Ventas',
  'ADMINISTRATIVO DE POSTVENTA': 'Ventas',
  'ADMINISTRATIVO DE SERVICIO': 'Administrativo',
  'ADMINISTRATIVO DE VENTAS': 'Ventas',
  'ASESOR COMERCIAL': 'Ventas',
  'ASESOR DE SEGUROS': 'Garantias y Seguros',
  'ASESOR DE SERVICIO': 'Servicio',
  'ASESOR DE VENTAS': 'Ventas',
  'AUXILIAR ADMINISTRATIVO': 'Administrativo',
  'AUXILIAR CONTABLE': 'Administrativo',
  'AUXILIAR DE ALMACEN': 'Apoyo Operativo',
  'AUXILIAR DE SERVICIO': 'Servicio',
  'CAJERO': 'Administrativo',
  'COORDINADOR': 'Administrativo',
  'COORDINADOR DE SEMINUEVOS': 'Ventas',
  'COORDINADOR DE SERVICIO': 'Servicio',
  'COORDINADOR DE VENTAS': 'Ventas',
  'DIRECTOR': 'Directivo',
  'DIRECTOR DE SUCURSAL': 'Directivo',
  'EJECUTIVO': 'Administrativo',
  'EJECUTIVO DE VENTAS': 'Ventas',
  'ESPECIALISTA': 'Técnico',
  'GERENTE': 'Gerencial',
  'GERENTE DE POSTVENTA': 'Gerencial',
  'GERENTE DE SERVICIO': 'Gerencial',
  'GERENTE DE VENTAS': 'Gerencial',
  'GERENTE GENERAL': 'Gerencial',
  'INTENDENCIA': 'Apoyo Operativo',
  'JEFE': 'Jefatura',
  'JEFE DE ALMACEN': 'Jefatura',
  'JEFE DE SEMINUEVOS': 'Jefatura',
  'JEFE DE SERVICIO': 'Jefatura',
  'JEFE DE TALLER': 'Jefatura',
  'JEFE DE VENTAS': 'Jefatura',
  'LAVADOR': 'Apoyo Operativo',
  'MECANICO': 'Técnico',
  'RECEPCIONISTA': 'Administrativo',
  'SECRETARIA': 'Administrativo',
  'SUPERVISOR': 'Supervisión',
  'SUPERVISOR DE SERVICIO': 'Supervisión',
  'SUPERVISOR DE VENTAS': 'Supervisión',
  'TECNICO': 'Técnico',
  'TECNICO EN SERVICIO': 'Técnico',
  'VENDEDOR': 'Ventas',
  'VIGILANTE': 'Seguridad'
};

/**
 * Obtiene la categoría de un puesto
 * @param {string} puesto - Nombre del puesto
 * @returns {string} - Categoría del puesto
 */
export const getPuestoCategoria = (puesto) => {
  if (!puesto) return 'Sin Categorizar';
  
  const puestoUpper = puesto.toString().toUpperCase().trim();
  
  // Búsqueda exacta primero
  if (PUESTO_CATEGORIA_MAPPING[puestoUpper]) {
    return PUESTO_CATEGORIA_MAPPING[puestoUpper];
  }
  
  // Búsqueda por palabras clave si no hay coincidencia exacta
  const keywordMappings = {
    'VENDEDOR': 'Ventas',
    'VENTAS': 'Ventas',
    'ASESOR': 'Ventas',
    'GERENTE': 'Gerencial',
    'DIRECTOR': 'Directivo',
    'JEFE': 'Jefatura',
    'SUPERVISOR': 'Supervisión',
    'COORDINADOR': 'Administrativo',
    'ADMINISTRATIVO': 'Administrativo',
    'AUXILIAR': 'Apoyo Operativo',
    'TECNICO': 'Técnico',
    'MECANICO': 'Técnico',
    'SERVICIO': 'Servicio',
    'SEMINUEVOS': 'Ventas',
    'GARANTIAS': 'Garantias y Seguros',
    'SEGUROS': 'Garantias y Seguros',
    'ALMACEN': 'Apoyo Operativo',
    'RECEPCION': 'Administrativo',
    'SECRETARIA': 'Administrativo',
    'CAJERO': 'Administrativo',
    'CONTABLE': 'Administrativo',
    'INTENDENCIA': 'Apoyo Operativo',
    'LAVADOR': 'Apoyo Operativo',
    'VIGILANTE': 'Seguridad'
  };
  
  for (const [keyword, categoria] of Object.entries(keywordMappings)) {
    if (puestoUpper.includes(keyword)) {
      return categoria;
    }
  }
  
  return 'Sin Categorizar';
};

/**
 * Obtiene todas las categorías únicas disponibles
 * @returns {Array} - Array de categorías únicas
 */
export const getAllCategorias = () => {
  const categorias = [...new Set(Object.values(PUESTO_CATEGORIA_MAPPING))];
  return categorias.sort();
};

/**
 * Agrupa puestos por categoría
 * @param {Array} puestos - Array de puestos
 * @returns {Object} - Objeto con categorías como keys y arrays de puestos como values
 */
export const groupPuestosByCategoria = (puestos) => {
  const grouped = {};
  
  puestos.forEach(puesto => {
    const categoria = getPuestoCategoria(puesto);
    if (!grouped[categoria]) {
      grouped[categoria] = [];
    }
    grouped[categoria].push(puesto);
  });
  
  return grouped;
};

/**
 * Obtiene los puestos de una categoría específica
 * @param {string} categoria - Nombre de la categoría
 * @returns {Array} - Array de puestos en esa categoría
 */
export const getPuestosByCategoria = (categoria) => {
  return Object.entries(PUESTO_CATEGORIA_MAPPING)
    .filter(([_, cat]) => cat === categoria)
    .map(([puesto, _]) => puesto);
};

/**
 * Convierte lista de puestos a opciones para dropdown
 * @param {Array} puestos - Array de puestos con conteos
 * @returns {Array} - Array formateado para DropDownMenu
 */
export const formatPuestosForDropdown = (puestos) => {
  return puestos.map(item => ({
    value: typeof item === 'string' ? item : (item.value || item.puesto || item),
    count: typeof item === 'object' ? (item.count || 0) : 0
  }));
};

/**
 * Convierte lista de categorías a opciones para dropdown
 * @param {Array} categorias - Array de categorías con conteos
 * @returns {Array} - Array formateado para DropDownMenu
 */
export const formatCategoriasForDropdown = (categorias) => {
  return categorias.map(item => ({
    value: typeof item === 'string' ? item : (item.value || item.categoria || item),
    count: typeof item === 'object' ? (item.count || 0) : 0
  }));
};

/**
 * Aplica filtros a una lista de empleados
 * @param {Array} employees - Lista de empleados
 * @param {Object} filters - Filtros a aplicar
 * @returns {Array} - Lista filtrada de empleados
 */
export const applyPuestoFilters = (employees, filters) => {
  let filteredEmployees = [...employees];
  
  // Filtro por sucursal
  if (filters.sucursales && filters.sucursales.length > 0) {
    filteredEmployees = filteredEmployees.filter(emp => 
      filters.sucursales.includes(emp.sucursal || emp.department)
    );
  }
  
  // Filtro por puesto
  if (filters.puestos && filters.puestos.length > 0) {
    filteredEmployees = filteredEmployees.filter(emp => 
      filters.puestos.includes(emp.puesto || emp.position)
    );
  }
  
  // Filtro por puesto categorizado
  if (filters.puestosCategorias && filters.puestosCategorias.length > 0) {
    filteredEmployees = filteredEmployees.filter(emp => {
      const puesto = emp.puesto || emp.position;
      const categoria = getPuestoCategoria(puesto);
      return filters.puestosCategorias.includes(categoria);
    });
  }
  
  return filteredEmployees;
};

const puestoMapping = {
  getPuestoCategoria,
  getAllCategorias,
  groupPuestosByCategoria,
  getPuestosByCategoria,
  formatPuestosForDropdown,
  formatCategoriasForDropdown,
  applyPuestoFilters,
  PUESTO_CATEGORIA_MAPPING
};

export default puestoMapping;

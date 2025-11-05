// Tipos para datos de nómina basados en la tabla historico_nominas_gsau
export interface PayrollData {
  rfc: string;
  nombre: string;
  puesto: string;
  sucursal: string;
  mes: string;
  sueldo: number;
  comisiones: number;
  totalPercepciones: number;
  status: string;
  estado: string;
  perfilUrl?: string | null;
  cveper?: string;
  puestoCategorizado?: string;
}

// Tipos para paginación del servidor
export interface PaginationResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Respuesta completa de la API
export interface PayrollApiResponse {
  success: boolean;
  data: PayrollData[];
  pagination: PaginationResponse;
  error?: string;
}

// Tipos para filtros
export interface PayrollFilters {
  search?: string;
  puesto?: string;
  compania?: string;
  status?: string;
  puestoCategorizado?: string;
  cveper?: string;
}

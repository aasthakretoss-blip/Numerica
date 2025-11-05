// Importes removidos - ahora usamos endpoint público sin autenticación
import { buildApiUrl, isProduction } from '../config/apiConfig';

const API_BASE_URL = "https://numerica-2.onrender.com";

// Tipos para la API
export interface UniqueValueResponse {
  success: boolean;
  data: Array<{
    value: string | number;
    count: number;
  }>;
  column: string;
  table: string;
  count: number;
}

export interface EmployeeData {
  nombre_completo: string;
  curve: string;
  fecha_ingreso: string;
  periodo: string;
  status: string;
  sueldo: number;
  comisiones: number;
  costo_nomina: number;
  puesto: string;
  categoria_puesto: string;
  antiguedad_anos: number;
}

export interface EmployeesResponse {
  success: boolean;
  data: EmployeeData[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  filters?: any;
}

export interface TableStructureResponse {
  success: boolean;
  table: string;
  columns: Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
    character_maximum_length: number | null;
  }>;
  count: number;
}

export interface LatestPeriodResponse {
  success: boolean;
  latestPeriod: string | null;
}

class NominasApiService {
  // Simplificamos para usar el endpoint público sin autenticación
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }


  // Obtener último periodo disponible
  async getLatestPeriod(): Promise<LatestPeriodResponse> {
    try {
      // Usamos el endpoint /api/payroll para obtener datos y extraer el período más reciente
      const response = await this.makeRequest<any>('/api/payroll?pageSize=1');
      const latestPeriod = response.data?.[0]?.mes || null;
      return {
        success: true,
        latestPeriod
      };
    } catch (error) {
      return {
        success: false,
        latestPeriod: null
      };
    }
  }

  // Obtener datos de empleados con filtros
  async getEmployeesData(filters: {
    periodo?: (string | number)[];
    nombres?: (string | number)[];
    curves?: (string | number)[];
    status?: (string | number)[];
    puestos?: (string | number)[];
    categorias?: (string | number)[];
    limit?: number;
    offset?: number;
  }): Promise<EmployeesResponse> {
    try {
      // Construir parámetros para /api/payroll
      const params = new URLSearchParams();
      
      if (filters.nombres && filters.nombres.length > 0) {
        params.append('search', filters.nombres[0].toString());
      }
      if (filters.puestos && filters.puestos.length > 0) {
        params.append('puesto', filters.puestos[0].toString());
      }
      if (filters.status && filters.status.length > 0) {
        params.append('status', filters.status[0].toString());
      }
      
      params.append('pageSize', (filters.limit || 50).toString());
      params.append('page', Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1 + '');
      
      const response = await this.makeRequest<any>(`/api/payroll?${params.toString()}`);
      
      // Transformar la respuesta al formato esperado
      const transformedData = response.data.map((item: any) => ({
        nombre_completo: item.nombre,
        curve: item.rfc, // Usamos RFC como curve temporalmente
        fecha_ingreso: null, // No disponible en la nueva estructura
        periodo: item.mes,
        status: item.estado,
        sueldo: parseFloat(item.sueldo) || 0,
        comisiones: parseFloat(item.comisiones) || 0,
        costo_nomina: parseFloat(item.totalPercepciones) || 0,
        puesto: item.puesto,
        categoria_puesto: item.sucursal, // Usamos sucursal como categoría temporalmente
        antiguedad_anos: 0 // No disponible
      }));
      
      return {
        success: true,
        data: transformedData,
        pagination: {
          total: response.pagination.total,
          limit: response.pagination.pageSize,
          offset: (response.pagination.page - 1) * response.pagination.pageSize,
          hasMore: response.pagination.page < response.pagination.totalPages
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Obtener estructura de tabla
  async getTableStructure(tableName: string): Promise<TableStructureResponse> {
    return this.makeRequest<TableStructureResponse>(`/api/nominas/tables/${tableName}/structure`);
  }

  // Obtener listas de tablas
  async getTables(): Promise<{ success: boolean; data: Array<{ table_name: string; table_type: string }>}> {
    return this.makeRequest('/api/nominas/tables');
  }

  // Mapeo de nombres de columna a nombres de tabla y columna real
  getColumnMapping() {
    return {
      nombres: { table: 'nomina_historica', column: 'CONCAT(nombre, \' \', apellido)' },
      curves: { table: 'nomina_historica', column: 'curve' },
      status: { table: 'nomina_historica', column: 'status_empleado' },
      periodos: { table: 'nomina_historica', column: 'cveper' },
      puestos: { table: 'nomina_historica', column: 'puesto' },
      categorias: { table: 'nomina_historica', column: 'categoria_puesto' }
    };
  }

  // Helper para obtener opciones de filtro según el tipo
  async getFilterOptions(filterType: keyof ReturnType<typeof this.getColumnMapping>, search?: string) {
    try {
      // Obtener todos los datos para extraer opciones únicas
      const response = await this.makeRequest<any>('/api/payroll?pageSize=500');
      const data = response.data;
      
      let values: string[] = [];
      
      switch (filterType) {
        case 'puestos':
          values = [...new Set(data.map((item: any) => item.puesto).filter(Boolean))];
          break;
        case 'status':
          values = [...new Set(data.map((item: any) => item.estado).filter(Boolean))];
          break;
        case 'categorias':
          values = [...new Set(data.map((item: any) => item.sucursal).filter(Boolean))];
          break;
        default:
          values = [];
      }
      
      const transformedData = values.map(value => ({
        value,
        count: data.filter((item: any) => {
          switch (filterType) {
            case 'puestos': return item.puesto === value;
            case 'status': return item.estado === value;
            case 'categorias': return item.sucursal === value;
            default: return false;
          }
        }).length
      }));
      
      return {
        success: true,
        data: transformedData,
        column: filterType,
        table: 'historico_nominas_gsau',
        count: transformedData.length
      };
    } catch (error) {
      console.error(`Error obteniendo opciones para ${filterType}:`, error);
      return {
        success: false,
        data: [],
        column: filterType,
        table: 'historico_nominas_gsau',
        count: 0
      };
    }
  }
}

export const nominasApi = new NominasApiService();
export default nominasApi;

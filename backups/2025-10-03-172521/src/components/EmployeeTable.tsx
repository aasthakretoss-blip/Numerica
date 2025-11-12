import { useState, useEffect } from 'react'
import type { PayrollData } from '../types'
import { parseMoney, formatCurrency, formatPeriod } from '../utils/data'
import { useServerPagination } from '../hooks/useServerPagination'

const columns: { key: string; label: string; sortable: boolean; dataKey: keyof PayrollData | 'profile' }[] = [
  { key: 'nombre', label: 'Empleado', sortable: true, dataKey: 'nombre' },
  { key: 'rfc', label: 'RFC', sortable: true, dataKey: 'rfc' },
  { key: 'puesto', label: 'Puesto', sortable: true, dataKey: 'puesto' },
  { key: 'sucursal', label: 'Compañía', sortable: true, dataKey: 'sucursal' },
  { key: 'mes', label: 'Período', sortable: true, dataKey: 'mes' },
  { key: 'sueldo', label: 'Sueldo', sortable: true, dataKey: 'sueldo' },
  { key: 'comisiones', label: 'Comisiones', sortable: true, dataKey: 'comisiones' },
  { key: 'totalPercepciones', label: 'Total Percepciones', sortable: true, dataKey: 'totalPercepciones' },
  { key: 'estado', label: 'Estado', sortable: true, dataKey: 'estado' },
  { key: 'profile', label: 'Perfil', sortable: false, dataKey: 'profile' }
]

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250, 500]

export default function EmployeeTable() {
  const [stats, setStats] = useState<any>(null)
  
  const {
    data,
    pagination,
    loading,
    error,
    sortBy,
    sortDir,
    setPage,
    setPageSize,
    refresh,
    handleSortChange
  } = useServerPagination('/api/payroll', 25)

  // Calculate display range
  const from = pagination.total > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0
  const to = Math.min(pagination.page * pagination.pageSize, pagination.total)

  // Sorting functions
  const toggleSort = (key: string) => {
    console.log('🔄 EmployeeTable.toggleSort called:', { key, sortBy, sortDir })
    
    let newDirection: 'asc' | 'desc'
    if (key === sortBy) {
      newDirection = sortDir === 'asc' ? 'desc' : 'asc'
    } else {
      newDirection = 'asc'
    }
    
    console.log('📤 EmployeeTable: Sending sort change:', { key, newDirection })
    handleSortChange(key, newDirection)
  }

  const getSortIcon = (key: string) => {
    if (sortBy !== key) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    if (sortDir === 'asc') {
      return (
        <svg className="w-4 h-4 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
        </svg>
      )
    } else {
      return (
        <svg className="w-4 h-4 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8V20m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
  }

  // Load database statistics on component mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('http://numericaapi.kretosstechnology.com/api/payroll/stats')
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setStats(result.stats)
          }
        }
      } catch (error) {
        console.error('Error loading stats:', error)
      }
    }
    loadStats()
  }, [])

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Error al cargar datos</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button 
          onClick={refresh}
          className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Database Statistics Panel */}
      {stats && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-3">📊 Estadísticas de Base de Datos AWS - Historic</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
            <div className="text-center">
              <div className="font-bold text-blue-800 text-lg">{stats.totalRecords?.toLocaleString('es-MX')}</div>
              <div className="text-blue-900">Total Registros</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-green-600 text-lg">{stats.uniqueEmployees?.toLocaleString('es-MX')}</div>
              <div className="text-green-800">RFCs Únicos</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-blue-600 text-lg">{stats.uniquePeriods}</div>
              <div className="text-blue-800">Períodos</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-blue-700 text-lg">{stats.averageRecordsPerEmployee}</div>
              <div className="text-blue-800">Promedio/Empleado</div>
            </div>
          </div>
          {/* Status Distribution */}
          {stats.statusDistribution && (
            <div className="border-t border-blue-200 pt-3">
              <h4 className="text-xs font-medium text-blue-800 mb-2">Distribución por Estado:</h4>
              <div className="flex flex-wrap gap-2">
                {stats.statusDistribution.map((status: any, index: number) => (
                  <span key={index} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    status.statusName === 'Activo' ? 'bg-green-100 text-green-800' :
                    status.statusName === 'Baja' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {status.statusName}: {status.count.toLocaleString('es-MX')} ({status.percentage}%)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Sticky Status Indicator */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200 py-2">
        <div className="text-center">
          <span className="text-xs text-gray-500 font-mono">
            {loading ? (
              "Cargando datos de Historic..."
            ) : (
              `Mostrando ${from}–${to} de ${pagination.total} registros • Página ${pagination.page} de ${pagination.totalPages} • Conectado a AWS`
            )}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              {columns.map(col => (
                <th key={col.key} className="px-4 py-2 whitespace-nowrap font-medium text-gray-700">
                  {col.sortable ? (
                    <button
                      onClick={() => toggleSort(col.key)}
                      className="flex items-center gap-2 hover:text-blue-800 transition-colors cursor-pointer"
                      disabled={loading}
                    >
                      <span>{col.label}</span>
                      {getSortIcon(col.key)}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-800 border-t-transparent rounded-full"></div>
                    <span>Cargando datos...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-gray-500">
                  Sin resultados
                </td>
              </tr>
            ) : (
              data.map((r, i) => (
                <tr key={`${r.rfc}-${r.mes}-${i}`} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{r.nombre}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.rfc}</td>
                  <td className="px-4 py-2">{r.puesto}</td>
                  <td className="px-4 py-2">{r.sucursal}</td>
                  <td className="px-4 py-2">{formatPeriod(r.mes)}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {formatCurrency(parseMoney(r.sueldo))}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {formatCurrency(parseMoney(r.comisiones))}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {formatCurrency(parseMoney(r.totalPercepciones))}
                  </td>
                  <td className="px-4 py-2">
                    {r.estado === 'Activo' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Activo
                      </span>
                    ) : r.estado === 'Baja' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Baja
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        N/A
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {r.perfilUrl ? (
                      <a href={r.perfilUrl} target="_blank" className="text-blue-800 hover:underline text-sm" rel="noreferrer">
                        Perfil
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          {/* Page Size Selector */}
          <div className="flex items-center space-x-2">
            <label htmlFor="pageSize" className="text-sm text-gray-700 font-medium">
              Registros por página:
            </label>
            <select
              id="pageSize"
              value={pagination.pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage(1)}
              disabled={pagination.page <= 1 || loading}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Primera
            </button>
            <button
              onClick={() => setPage(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            
            {/* Page Numbers */}
            <div className="flex items-center space-x-1 mx-2">
              {(() => {
                const totalPages = pagination.totalPages
                const currentPage = pagination.page
                const pages = []
                
                if (totalPages <= 7) {
                  // Show all pages if 7 or fewer
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i)
                  }
                } else {
                  // Show smart pagination
                  if (currentPage <= 4) {
                    pages.push(1, 2, 3, 4, 5, -1, totalPages)
                  } else if (currentPage >= totalPages - 3) {
                    pages.push(1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
                  } else {
                    pages.push(1, -1, currentPage - 1, currentPage, currentPage + 1, -1, totalPages)
                  }
                }
                
                return pages.map((page, index) => (
                  page === -1 ? (
                    <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-400">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setPage(page)}
                      disabled={loading}
                      className={`px-3 py-1 text-sm border rounded transition-colors ${
                        page === currentPage
                          ? 'bg-blue-800 text-white border-blue-800'
                          : 'border-gray-300 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {page}
                    </button>
                  )
                ))
              })()
            }
            </div>
            
            <button
              onClick={() => setPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
            <button
              onClick={() => setPage(pagination.totalPages)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Última
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


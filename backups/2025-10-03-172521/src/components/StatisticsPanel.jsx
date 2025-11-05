import { useState, useEffect } from 'react'
import { formatCurrency } from '../utils/data.js'
import { buildApiUrl, isProduction } from '../config/apiConfig'

export default function StatisticsPanel() {
  const [stats, setStats] = useState(null)
  const [detailedStats, setDetailedStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showDetailed, setShowDetailed] = useState(false)

  // Load basic statistics
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true)
        const apiUrl = buildApiUrl('/api/payroll/stats')
        console.log('📊 StatisticsPanel: Fetching stats from:', apiUrl, { isProduction })
        const response = await fetch(apiUrl)
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setStats(result.stats)
          } else {
            setError('Error al cargar estadísticas')
          }
        } else {
          setError('Error de conexión con el servidor')
        }
      } catch (error) {
        console.error('Error loading stats:', error)
        setError('Error de red al cargar estadísticas')
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  // Load detailed statistics when requested
  const loadDetailedStats = async () => {
    try {
      setLoading(true)
      // Here we would call additional endpoints for detailed stats
      // For now, simulating with placeholder data
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setDetailedStats({
        topCompanies: [
          { company: "GRUPO NUMERICA", count: 25000, percentage: "49.0" },
          { company: "NUMERICA COMERCIAL", count: 15000, percentage: "29.4" },
          { company: "NUMERICA SERVICIOS", count: 11000, percentage: "21.6" }
        ],
        topPeriods: [
          { period: "24_NOVIEMBRE", count: 4500, percentage: "8.8" },
          { period: "24_OCTUBRE", count: 4300, percentage: "8.4" },
          { period: "24_SEPTIEMBRE", count: 4200, percentage: "8.2" }
        ],
        salaryRanges: [
          { range: "$0 - $10,000", count: 20000, percentage: "39.2" },
          { range: "$10,001 - $25,000", count: 18000, percentage: "35.3" },
          { range: "$25,001 - $50,000", count: 10000, percentage: "19.6" },
          { range: "$50,001+", count: 3000, percentage: "5.9" }
        ],
        employeeStats: {
          totalActiveEmployees: 1800,
          totalInactiveEmployees: 649,
          totalUnknownStatus: 0
        }
      })
    } catch (error) {
      console.error('Error loading detailed stats:', error)
      setError('Error al cargar estadísticas detalladas')
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Error al cargar estadísticas</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Statistics Panel */}
      {stats && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-blue-800">
              📊 Análisis de Nóminas - Base de Datos AWS
            </h2>
            <div className="text-xs text-blue-800 bg-blue-100 px-2 py-1 rounded">
              Historic
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center bg-white/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-800">
                {stats.totalRecords?.toLocaleString('es-MX')}
              </div>
              <div className="text-sm text-blue-900 font-medium">Total Registros</div>
              <div className="text-xs text-blue-700 mt-1">Histórico completo</div>
            </div>
            
            <div className="text-center bg-white/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">
                {stats.uniqueEmployees?.toLocaleString('es-MX')}
              </div>
              <div className="text-sm text-green-800 font-medium">Empleados Únicos</div>
              <div className="text-xs text-green-600 mt-1">RFCs distintos</div>
            </div>
            
            <div className="text-center bg-white/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{stats.uniquePeriods}</div>
              <div className="text-sm text-blue-800 font-medium">Períodos</div>
              <div className="text-xs text-blue-600 mt-1">Meses disponibles</div>
            </div>
            
            <div className="text-center bg-white/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-700">{stats.averageRecordsPerEmployee}</div>
              <div className="text-sm text-blue-800 font-medium">Promedio/Empleado</div>
              <div className="text-xs text-blue-600 mt-1">Registros históricos</div>
            </div>
          </div>

          {/* Status Distribution */}
          {stats.statusDistribution && (
            <div className="border-t border-blue-200 pt-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-3">Distribución por Estado Laboral</h3>
              <div className="space-y-2">
                {stats.statusDistribution.map((status, index) => (
                  <div key={index} className="flex items-center justify-between bg-white/60 rounded-lg px-4 py-2">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        status.statusName === 'Activo' ? 'bg-green-100 text-green-800' :
                        status.statusName === 'Baja' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {status.statusName}
                      </span>
                      <span className="text-sm text-gray-600">({status.status})</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="font-bold text-gray-900">
                        {status.count.toLocaleString('es-MX')}
                      </span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            status.statusName === 'Activo' ? 'bg-green-500' :
                            status.statusName === 'Baja' ? 'bg-red-500' :
                            'bg-gray-400'
                          }`}
                          style={{ width: `${status.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-12 text-right">
                        {status.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toggle Detailed Stats */}
          <div className="border-t border-blue-200 pt-4 mt-4">
            <button
              onClick={() => {
                if (!showDetailed && !detailedStats) {
                  loadDetailedStats()
                }
                setShowDetailed(!showDetailed)
              }}
              disabled={loading}
              className="flex items-center space-x-2 text-blue-800 hover:text-blue-900 transition-colors disabled:opacity-50"
            >
              <span className="text-sm font-medium">
                {showDetailed ? 'Ocultar' : 'Mostrar'} análisis detallado
              </span>
              <svg 
                className={`w-4 h-4 transition-transform ${showDetailed ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Detailed Statistics Panel */}
      {showDetailed && detailedStats && (
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📈 Análisis Detallado</h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Top Companies */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-semibold text-gray-800 mb-3">🏢 Principales Compañías</h4>
              <div className="space-y-2">
                {detailedStats.topCompanies.map((company, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 truncate">{company.company}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{company.count.toLocaleString('es-MX')}</span>
                      <span className="text-xs text-gray-500">({company.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Periods */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-semibold text-gray-800 mb-3">📅 Períodos Principales</h4>
              <div className="space-y-2">
                {detailedStats.topPeriods.map((period, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{period.period}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{period.count.toLocaleString('es-MX')}</span>
                      <span className="text-xs text-gray-500">({period.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Salary Ranges */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-semibold text-gray-800 mb-3">💰 Rangos Salariales</h4>
              <div className="space-y-2">
                {detailedStats.salaryRanges.map((range, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{range.range}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{range.count.toLocaleString('es-MX')}</span>
                      <span className="text-xs text-gray-500">({range.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Employee Summary */}
          <div className="mt-6 bg-white rounded-lg p-4 border">
            <h4 className="font-semibold text-gray-800 mb-3">👥 Resumen de Empleados</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-green-600">
                  {detailedStats.employeeStats.totalActiveEmployees.toLocaleString('es-MX')}
                </div>
                <div className="text-sm text-gray-700">Empleados Activos</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-600">
                  {detailedStats.employeeStats.totalInactiveEmployees.toLocaleString('es-MX')}
                </div>
                <div className="text-sm text-gray-700">Empleados dados de Baja</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-600">
                  {detailedStats.employeeStats.totalUnknownStatus.toLocaleString('es-MX')}
                </div>
                <div className="text-sm text-gray-700">Estado Desconocido</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && showDetailed && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-800 border-t-transparent rounded-full"></div>
            <span className="text-gray-600">Cargando análisis detallado...</span>
          </div>
        </div>
      )}
    </div>
  )
}

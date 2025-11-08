import { useState } from 'react'
import EmployeeTable from './EmployeeTable'
import StatisticsPanel from './StatisticsPanel'

export default function PayrollDashboard() {
  const [activeTab, setActiveTab] = useState('table')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sistema de Nóminas - Grupo Numérica
          </h1>
          <p className="text-gray-600">
            Gestión y análisis de datos históricos de nóminas desde AWS • Base de datos: Historic
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('table')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'table'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Tabla de Empleados</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Estadísticas y Análisis</span>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {activeTab === 'table' && (
            <div className="p-6">
              <EmployeeTable />
            </div>
          )}
          
          {activeTab === 'stats' && (
            <div className="p-6">
              <StatisticsPanel />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            🔗 Conectado a AWS • 🗄️ PostgreSQL • ⚡ Datos en tiempo real 
            <span className="mx-2">•</span>
            <span className="font-medium">51,000+ registros históricos</span>
          </p>
        </div>
      </div>
    </div>
  )
}

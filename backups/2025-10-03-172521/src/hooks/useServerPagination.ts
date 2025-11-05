import { useState, useEffect } from 'react'
import type { PayrollData } from '../types'
import { buildApiUrl } from '../config/apiConfig'

export interface PaginationInfo {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ServerPaginationResult {
  data: PayrollData[]
  pagination: PaginationInfo
  loading: boolean
  error: string | null
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  refresh: () => void
}

export function useServerPagination(
  endpoint: string = '/api/payroll',
  initialPageSize: number = 25
): ServerPaginationResult {
  const [data, setData] = useState<PayrollData[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: initialPageSize,
    totalPages: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (page: number, pageSize: number) => {
    setLoading(true)
    setError(null)
    
    try {
      const url = `${buildApiUrl(endpoint)}?page=${page}&pageSize=${pageSize}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido del servidor')
      }
      
      // Transform the response to match the expected structure
      const items = result.data || []
      const paginationInfo: PaginationInfo = {
        total: result.pagination?.total || 0,
        page: result.pagination?.page || page,
        pageSize: result.pagination?.pageSize || pageSize,
        totalPages: result.pagination?.totalPages || Math.ceil((result.pagination?.total || 0) / pageSize)
      }
      
      setData(items)
      setPagination(paginationInfo)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión'
      setError(errorMessage)
      console.error('Error fetching paginated data:', err)
      
      // Set empty state on error
      setData([])
      setPagination({
        total: 0,
        page: 1,
        pageSize,
        totalPages: 0
      })
    } finally {
      setLoading(false)
    }
  }

  // Initial load and when pagination changes
  useEffect(() => {
    fetchData(pagination.page, pagination.pageSize)
  }, [pagination.page, pagination.pageSize, endpoint])

  const setPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return
    setPagination(prev => ({ ...prev, page }))
  }

  const setPageSize = (pageSize: number) => {
    // Reset to page 1 when changing page size
    setPagination(prev => ({ ...prev, pageSize, page: 1 }))
  }

  const refresh = () => {
    fetchData(pagination.page, pagination.pageSize)
  }

  return {
    data,
    pagination,
    loading,
    error,
    setPage,
    setPageSize,
    refresh
  }
}

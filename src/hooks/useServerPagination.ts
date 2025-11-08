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
  sortBy: string
  sortDir: 'asc' | 'desc'
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  refresh: () => void
  handleSortChange: (field: string, direction?: 'asc' | 'desc') => void
}

export function useServerPagination(
  endpoint: string = '/api/payroll',
  initialPageSize: number = 25,
  initialSortBy: string = 'periodo',
  initialSortDir: 'asc' | 'desc' = 'asc'
): ServerPaginationResult {
  const [data, setData] = useState([] as PayrollData[])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: initialPageSize,
    totalPages: 0
  } as PaginationInfo)
  const [sortByState, setSortByState] = useState(initialSortBy)
  const [sortDirState, setSortDirState] = useState(initialSortDir)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null as string | null)

  const fetchData = async (page: number, pageSize: number, sortByParam: string = sortByState, sortDirParam: 'asc' | 'desc' = sortDirState) => {
    setLoading(true)
    setError(null)
    
    try {
      const url = buildApiUrl(`${endpoint}?page=${page}&pageSize=${pageSize}&orderBy=${encodeURIComponent(sortByParam)}&orderDirection=${sortDirParam}`)
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

  // Initial load and when pagination or sorting changes
  useEffect(() => {
    fetchData(pagination.page, pagination.pageSize, sortByState, sortDirState)
  }, [pagination.page, pagination.pageSize, sortByState, sortDirState, endpoint])

  const setPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return
    setPagination(prev => ({ ...prev, page }))
  }

  const setPageSize = (pageSize: number) => {
    // Reset to page 1 when changing page size
    setPagination(prev => ({ ...prev, pageSize, page: 1 }))
  }

  const refresh = () => {
    fetchData(pagination.page, pagination.pageSize, sortByState, sortDirState)
  }

  const handleSortChange = (field: string, direction?: 'asc' | 'desc') => {
    const newSortDir: 'asc' | 'desc' = direction || (sortByState === field && sortDirState === 'asc' ? 'desc' : 'asc')
    setSortByState(field)
    setSortDirState(newSortDir)
    // Reset to page 1 when sorting changes
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  return {
    data,
    pagination,
    loading,
    error,
    sortBy: sortByState,
    sortDir: sortDirState,
    setPage,
    setPageSize,
    refresh,
    handleSortChange
  }
}

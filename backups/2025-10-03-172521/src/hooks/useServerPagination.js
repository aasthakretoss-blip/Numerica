import { useState, useEffect } from 'react'
import { buildApiUrl, isProduction } from '../config/apiConfig'

export function useServerPagination(
  endpoint = '/api/payroll',
  initialPageSize = 25,
  initialSortBy = 'nombre',
  initialSortDir = 'asc'
) {
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: initialPageSize,
    totalPages: 0
  })
  const [sortBy, setSortBy] = useState(initialSortBy)
  const [sortDir, setSortDir] = useState(initialSortDir)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = async (page, pageSize, sortByParam = sortBy, sortDirParam = sortDir) => {
    setLoading(true)
    setError(null)
    
    try {
      const baseUrl = isProduction ? 'http://numericaapi.kretosstechnology.com:3001' : 'http://numericaapi.kretosstechnology.com:3001'
      const url = `${baseUrl}${endpoint}?page=${page}&pageSize=${pageSize}&sortBy=${sortByParam}&sortDir=${sortDirParam}`
      console.log('📡 useServerPagination: Fetching with sorting:', { sortBy: sortByParam, sortDir: sortDirParam, url, isProduction })
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
      const paginationInfo = {
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
    fetchData(pagination.page, pagination.pageSize, sortBy, sortDir)
  }, [pagination.page, pagination.pageSize, sortBy, sortDir, endpoint])

  const setPage = (page) => {
    if (page < 1 || page > pagination.totalPages) return
    setPagination(prev => ({ ...prev, page }))
  }

  const setPageSize = (pageSize) => {
    // Reset to page 1 when changing page size
    setPagination(prev => ({ ...prev, pageSize, page: 1 }))
  }

  const refresh = () => {
    fetchData(pagination.page, pagination.pageSize, sortBy, sortDir)
  }

  const handleSortChange = (newSortBy, newSortDir) => {
    console.log('📊 useServerPagination: Sort change received:', { newSortBy, newSortDir })
    setSortBy(newSortBy)
    setSortDir(newSortDir)
    // Reset to page 1 when sorting changes
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  return {
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
  }
}

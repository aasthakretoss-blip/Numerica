import { useState, useEffect, useRef } from 'react'
import { buildApiUrl, isProduction } from '../config/apiConfig'

export function useServerPagination(
  endpoint = '/api/payroll',
  initialPageSize = 25,
  initialSortBy = 'periodo', // ✅ Default: periodo (mapped to cveper in backend) - ASC as requested
  initialSortDir = 'asc' // ✅ Default: ascending as requested by user
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
  
  // ✅ CRITICAL: Use ref to track if endpoint is disabled to prevent any fetch attempts
  const isDisabledRef = useRef(endpoint === '__DISABLED__' || !endpoint || endpoint.trim() === '')
  
  // Update ref when endpoint changes
  useEffect(() => {
    isDisabledRef.current = endpoint === '__DISABLED__' || !endpoint || endpoint.trim() === ''
    console.log('🔍 [useServerPagination.js] Endpoint changed:', { endpoint, isDisabled: isDisabledRef.current })
  }, [endpoint])

  const fetchData = async (page, pageSize, sortByParam = sortBy, sortDirParam = sortDir) => {
    // ✅ FIXED: Skip fetch if endpoint is disabled (when component is using props instead)
    // Check both the endpoint parameter and the ref for extra safety
    // ✅ CRITICAL: This check MUST be the first thing in the function
    if (isDisabledRef.current || !endpoint || endpoint.trim() === '' || endpoint === '__DISABLED__') {
      console.log('⏭️ [useServerPagination.js fetchData] Skipping fetch - endpoint is disabled:', endpoint, 'isDisabledRef:', isDisabledRef.current)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // ✅ FIXED: Use orderBy and orderDirection as API parameters (matching backend expectations)
      // ✅ CRITICAL: sortByParam should be the backend field name (e.g., 'salario', 'comisiones', 'periodo', 'percepcionestotales')
      // Backend expects: orderBy and orderDirection (not sortField/sortOrder)
      const url = buildApiUrl(`${endpoint}?page=${page}&pageSize=${pageSize}&orderBy=${encodeURIComponent(sortByParam)}&orderDirection=${sortDirParam}`)
      console.log('📡 [useServerPagination.js] Fetching with sorting:', { 
        sortBy: sortByParam, 
        sortDir: sortDirParam, 
        orderBy: sortByParam,
        orderDirection: sortDirParam,
        url, 
        isProduction
      })
      
      // LOG ESPECIAL PARA PERCEPCIONES TOTALES
      if (sortByParam === 'percepcionesTotales' || sortByParam === 'totalPercepciones') {
        console.log('💰 useServerPagination - FETCH with PERCEPCIONES TOTALES:', {
          sortBy: sortByParam,
          sortDir: sortDirParam,
          page,
          pageSize,
          fullUrl: url
        })
      }
      
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
      
      // ✅ FRONTEND LOGGING: Log data BEFORE any transformation
      console.log('\n🟢🟢🟢 [FRONTEND DATA DEBUG] 🟢🟢🟢');
      console.log('🟢 API Response received - success:', result.success);
      console.log('🟢 Total items in response:', items.length);
      console.log('🟢 Current sortBy:', sortByParam);
      console.log('🟢 Current sortDir:', sortDirParam);
      
      if (items.length > 0) {
        console.log('🟢 First 10 items from API (BEFORE any frontend processing):');
        items.slice(0, 10).forEach((item, idx) => {
          const totalPercepciones = item.totalPercepciones || item[" TOTAL DE PERCEPCIONES "] || item["totalPercepciones"];
          const sueldo = item.sueldo || item[" SUELDO CLIENTE "];
          const comisiones = item.comisiones;
          
          console.log(`  [${idx + 1}] nombre: ${item.nombre || 'N/A'}`);
          console.log(`      totalPercepciones: ${totalPercepciones} (type: ${typeof totalPercepciones}, isZero: ${totalPercepciones === 0 || totalPercepciones === '0'})`);
          console.log(`      sueldo: ${sueldo} (type: ${typeof sueldo})`);
          console.log(`      comisiones: ${comisiones} (type: ${typeof comisiones})`);
          console.log(`      All keys: ${Object.keys(item).join(', ')}`);
          console.log(`      Has 'totalPercepciones': ${'totalPercepciones' in item}`);
          console.log(`      Has ' TOTAL DE PERCEPCIONES ': ${' TOTAL DE PERCEPCIONES ' in item}`);
        });
      } else {
        console.log('⚠️ No items in API response!');
      }
      console.log('🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢\n');
      
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
  // ✅ FIXED: Skip fetch if endpoint is disabled (when component is using props instead)
  useEffect(() => {
    // ✅ CRITICAL: Early return to prevent any fetch when endpoint is disabled
    // Check both the endpoint and the ref for extra safety
    if (isDisabledRef.current || !endpoint || endpoint.trim() === '' || endpoint === '__DISABLED__') {
      console.log('⏭️ [useServerPagination.js useEffect] Skipping fetch - endpoint is disabled:', endpoint, 'isDisabledRef:', isDisabledRef.current)
      return // Don't fetch if endpoint is disabled (props mode)
    }
    console.log('🔄 [useServerPagination.js useEffect] Fetching data with endpoint:', endpoint)
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
    // ✅ FIXED: Don't refresh if endpoint is disabled (props mode)
    if (isDisabledRef.current || !endpoint || endpoint.trim() === '' || endpoint === '__DISABLED__') {
      console.log('⏭️ [useServerPagination.js] Skipping refresh - endpoint is disabled (props mode)')
      return
    }
    fetchData(pagination.page, pagination.pageSize, sortBy, sortDir)
  }

  const handleSortChange = (newSortBy, newSortDir) => {
    console.log('📊 useServerPagination: Sort change received:', { newSortBy, newSortDir })
    
    // LOG ESPECIAL PARA PERCEPCIONES TOTALES
    if (newSortBy === 'percepcionesTotales' || newSortBy === 'totalPercepciones') {
      console.log('💰 useServerPagination - PERCEPCIONES TOTALES detected:', {
        receivedKey: newSortBy,
        receivedDirection: newSortDir,
        willUpdateState: true
      })
    }
    
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

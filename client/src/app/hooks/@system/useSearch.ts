// @system — useSearch hook
// Provides debounced full-text search with loading, error, and pagination state.
//
// Usage:
//   const { hits, total, loading, error, search } = useSearch({ index: 'products' })
//   search('headphones')
//
//   // With pagination:
//   const { hits, total, page, totalPages, setPage } = useSearch({ index: 'products', limit: 10 })

import { useState, useCallback, useRef, useEffect } from 'react'
import { search as searchApi, SearchHit, SearchResult } from '../api/@system/search'

export interface UseSearchOptions<T = SearchHit> {
  /** Index name to search against */
  index: string
  /** Max results per page (default 20) */
  limit?: number
  /** Initial query (default empty — does not auto-fetch) */
  initialQuery?: string
  /** Debounce delay in ms (default 300) */
  debounceMs?: number
  /** Provider-specific filter expression */
  filters?: string
  /** Sort rules, comma-separated (e.g. 'price:asc') */
  sort?: string
  /** Comma-separated list of fields to retrieve */
  fields?: string
  /** Callback fired when results change */
  onResults?: (result: SearchResult<T>) => void
}

export interface UseSearchResult<T = SearchHit> {
  /** Current result hits */
  hits: T[]
  /** Total matching documents */
  total: number
  /** Current page (1-based) */
  page: number
  /** Total pages */
  totalPages: number
  /** Last search query */
  query: string
  /** Whether a search is in flight */
  loading: boolean
  /** Error message if last search failed */
  error: string | null
  /** Processing time of last search in ms */
  processingTimeMs?: number
  /** Active search provider */
  provider: string | null
  /** Trigger a search — debounced */
  search: (query: string) => void
  /** Go to a specific page (uses current query) */
  setPage: (page: number) => void
  /** Clear results and reset state */
  clear: () => void
}

export function useSearch<T = SearchHit>(options: UseSearchOptions<T>): UseSearchResult<T> {
  const {
    index,
    limit = 20,
    initialQuery = '',
    debounceMs = 300,
    filters,
    sort,
    fields,
    onResults,
  } = options

  const [hits, setHits]               = useState<T[]>([])
  const [total, setTotal]             = useState(0)
  const [page, setPageState]          = useState(1)
  const [totalPages, setTotalPages]   = useState(0)
  const [query, setQuery]             = useState(initialQuery)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [processingTimeMs, setProcessingTimeMs] = useState<number | undefined>()
  const [provider, setProvider]       = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestQueryRef = useRef<string>('')

  const executeSearch = useCallback(
    async (q: string, targetPage: number) => {
      if (!q.trim()) {
        setHits([])
        setTotal(0)
        setTotalPages(0)
        setPageState(1)
        setError(null)
        setLoading(false)
        return
      }

      const thisQuery = q
      latestQueryRef.current = q

      setLoading(true)
      setError(null)

      try {
        const offset = (targetPage - 1) * limit
        const res = await searchApi<T>({ index, q, filters, sort, limit, offset, fields })

        // Ignore stale responses if a newer query has been fired
        if (latestQueryRef.current !== thisQuery) return

        if (res.status !== 200 || !res.data) {
          setError(res.message ?? 'Search failed')
          return
        }

        const data = res.data
        setHits(data.hits)
        setTotal(data.total)
        setPageState(data.page)
        setTotalPages(data.totalPages)
        setProcessingTimeMs(data.processingTimeMs)
        setProvider(data.provider)

        onResults?.(data)
      } catch (err) {
        if (latestQueryRef.current !== thisQuery) return
        setError(err instanceof Error ? err.message : 'Search failed')
      } finally {
        if (latestQueryRef.current === thisQuery) {
          setLoading(false)
        }
      }
    },
    [index, limit, filters, sort, fields, onResults]
  )

  const search = useCallback(
    (q: string) => {
      setQuery(q)
      setPageState(1)

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        executeSearch(q, 1)
      }, debounceMs)
    },
    [executeSearch, debounceMs]
  )

  const setPage = useCallback(
    (newPage: number) => {
      setPageState(newPage)
      executeSearch(query, newPage)
    },
    [executeSearch, query]
  )

  const clear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    latestQueryRef.current = ''
    setHits([])
    setTotal(0)
    setPageState(1)
    setTotalPages(0)
    setQuery('')
    setError(null)
    setLoading(false)
    setProcessingTimeMs(undefined)
  }, [])

  // Run initial query if provided
  useEffect(() => {
    if (initialQuery) {
      executeSearch(initialQuery, 1)
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { hits, total, page, totalPages, query, loading, error, processingTimeMs, provider, search, setPage, clear }
}

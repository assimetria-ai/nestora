// @system — Search API calls
// Wraps the SearchAdapter API endpoints exposed by the server.
// Do not modify this file. Add product-specific search calls in @custom/

import { apiRequest } from './utils'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SearchHit {
  id: string | number
  [key: string]: unknown
}

export interface SearchResult<T = SearchHit> {
  ok: boolean
  provider: string
  hits: T[]
  total: number
  page: number
  totalPages: number
  processingTimeMs?: number
}

export interface SearchParams {
  /** Index / collection name to search */
  index: string
  /** Search query string */
  q: string
  /** Provider-specific filter expression */
  filters?: string
  /** Sort rules, e.g. 'price:asc,name:desc' (comma-separated) */
  sort?: string
  /** Max results per page (default 20, max 100) */
  limit?: number
  /** Pagination offset (default 0) */
  offset?: number
  /** Comma-separated list of fields to retrieve */
  fields?: string
}

export interface IndexDocument {
  index: string
  id: string | number
  document: Record<string, unknown>
}

export interface BulkIndexDocuments {
  index: string
  documents: Array<Record<string, unknown>>
}

export interface CreateIndexOptions {
  uid: string
  primaryKey?: string
  searchableAttributes?: string[]
  attributesForFaceting?: string[]
}

export interface SearchHealthInfo {
  ok: boolean
  provider: string
  configured: boolean
  [key: string]: unknown
}

// ─── Search ──────────────────────────────────────────────────────────────────

export const search = <T = SearchHit>(params: SearchParams) => {
  const qs = new URLSearchParams()
  qs.set('index', params.index)
  qs.set('q', params.q)
  if (params.filters) qs.set('filters', params.filters)
  if (params.sort)    qs.set('sort', params.sort)
  if (params.limit !== undefined)  qs.set('limit', String(params.limit))
  if (params.offset !== undefined) qs.set('offset', String(params.offset))
  if (params.fields)  qs.set('fields', params.fields)

  return apiRequest.get<SearchResult<T>>(`/search?${qs.toString()}`)
}

// ─── Indexing (admin) ─────────────────────────────────────────────────────────

export const indexDocument = (data: IndexDocument) =>
  apiRequest.post('/search/index', data)

export const indexDocuments = (data: BulkIndexDocuments) =>
  apiRequest.post('/search/index/bulk', data)

export const createIndex = (data: CreateIndexOptions) =>
  apiRequest.post('/search/indexes', data)

// ─── Deletion (admin) ─────────────────────────────────────────────────────────

export const deleteDocument = (indexName: string, id: string | number) =>
  apiRequest.delete(`/search/index/${encodeURIComponent(indexName)}/${encodeURIComponent(String(id))}`)

export const deleteIndex = (indexName: string) =>
  apiRequest.delete(`/search/indexes/${encodeURIComponent(indexName)}`)

// ─── Health (admin) ───────────────────────────────────────────────────────────

export const getSearchHealth = () =>
  apiRequest.get<SearchHealthInfo>('/search/health')

export const getSearchHealthAll = () =>
  apiRequest.get<{ ok: boolean; adapters: Record<string, SearchHealthInfo> }>('/search/health/all')

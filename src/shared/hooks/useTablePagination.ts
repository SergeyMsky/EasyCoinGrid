import { useState } from 'react'

export const TABLE_PAGE_SIZE = 10

type StoredPage = {
  key: string
  page: number
}

export function useTablePagination<T>(items: T[], resetKey: string) {
  const [storedPage, setStoredPage] = useState<StoredPage>(() => ({ key: `${resetKey}:${items.length}`, page: 1 }))
  const totalPages = Math.max(1, Math.ceil(items.length / TABLE_PAGE_SIZE))
  const requestedPage = storedPage.key === `${resetKey}:${items.length}` ? storedPage.page : 1
  const currentPage = Math.min(requestedPage, totalPages)
  const start = (currentPage - 1) * TABLE_PAGE_SIZE

  function onPageChange(page: number) {
    setStoredPage({ key: `${resetKey}:${items.length}`, page: Math.max(1, Math.min(page, totalPages)) })
  }

  return {
    currentPage,
    pageItems: items.slice(start, start + TABLE_PAGE_SIZE),
    onPageChange,
  }
}

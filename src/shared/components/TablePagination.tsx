import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/components/Button'

type TablePaginationProps = {
  currentPage: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
}

export function TablePagination({ currentPage, pageSize, totalItems, onPageChange }: TablePaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize)
  if (totalPages <= 1) return null

  const firstItem = (currentPage - 1) * pageSize + 1
  const lastItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="flex flex-col items-center justify-between gap-2 border-t border-outline px-3 py-2 sm:flex-row">
      <p className="text-xs text-muted" aria-live="polite">
        Showing {firstItem}–{lastItem} of {totalItems}
      </p>
      <nav className="flex items-center gap-2" aria-label="Table pagination">
        <Button
          type="button"
          variant="dashboard"
          size="sm"
          aria-label="Previous page"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-1">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span className="min-w-16 text-center text-xs text-muted" aria-current="page">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          type="button"
          variant="dashboard"
          size="sm"
          aria-label="Next page"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-1">
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </nav>
    </div>
  )
}

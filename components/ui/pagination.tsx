"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  page,
  setPage,
  pageSize,
  setPageSize,
  totalItems,
  pageSizeOptions = [5, 10, 20, 50],
  className = "",
}: {
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalItems: number;
  pageSizeOptions?: number[];
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Helper to generate page numbers with ellipsis
  function getPageNumbers() {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }
    return pages;
  }

  return (
    <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-2 mt-4 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Rows per page:</span>
        <select
          className="border rounded px-2 py-1 bg-background text-foreground"
          value={pageSize}
          onChange={e => setPageSize(Number(e.target.value))}
        >
          {pageSizeOptions.map(opt => (
            <option key={opt} value={opt}>{opt} / page</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="border rounded px-2 py-1 bg-background text-foreground disabled:opacity-50"
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) =>
            p === '...'
              ? <span key={"ellipsis-" + idx} className="px-2">...</span>
              : <button
                  key={p}
                  className={`border rounded px-2 py-1 ${p === page ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-accent'} transition`}
                  onClick={() => setPage(Number(p))}
                  disabled={p === page}
                >
                  {p}
                </button>
          )}
        </div>
        <button
          className="border rounded px-2 py-1 bg-background text-foreground disabled:opacity-50"
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="text-sm text-muted-foreground ml-4">
        Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalItems)} of {totalItems}
      </div>
    </div>
  );
}

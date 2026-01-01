"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Edit, Eye, Search } from "lucide-react"
import Link from "next/link"
import Pagination from "@/components/ui/pagination"

interface ProductionBatch {
  id: string
  quantity: number
  remainingQuantity: number
  productionDate: Date
  productType?: {
    name: string
  } | null
  storageLocation?: {
    name: string
  } | null
}

interface ProductionBatchesTableProps {
  batches: ProductionBatch[]
  totalItems: number
  currentPage: number
  pageSize: number
}

export function ProductionBatchesTable({ 
  batches, 
  totalItems, 
  currentPage, 
  pageSize 
}: ProductionBatchesTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  
  // Handle search with debounce
  const handleSearch = (term: string) => {
    setSearchTerm(term)
    const params = new URLSearchParams(searchParams.toString())
    
    if (term) {
      params.set('search', term)
      params.set('page', '1') // Reset to first page on new search
    } else {
      params.delete('search')
    }
    
    // Update URL with new search term
    router.push(`/dashboard/production?${params.toString()}`)
  }
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`/dashboard/production?${params.toString()}`)
  }
  
  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('pageSize', newSize.toString())
    params.set('page', '1') // Reset to first page when changing page size
    router.push(`/dashboard/production?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search batches..."
            className="pl-8 w-full md:max-w-sm"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch(searchTerm)
              }
            }}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch Number</TableHead>
              <TableHead>Production Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Total Quantity</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {searchTerm ? 'No matching production batches found.' : 'No production batches found.'}
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.id}</TableCell>
                  <TableCell>{new Date(batch.productionDate).toLocaleDateString()}</TableCell>
                  <TableCell>{batch.storageLocation?.name || "Unknown"}</TableCell>
                  <TableCell>{batch.quantity.toLocaleString()}</TableCell>
                  <TableCell>{batch.remainingQuantity.toLocaleString()}</TableCell>
                  <TableCell>
                    {batch.remainingQuantity === 0 ? (
                      <Badge variant="secondary">Depleted</Badge>
                    ) : batch.remainingQuantity < batch.quantity * 0.2 ? (
                      <Badge variant="destructive">Low</Badge>
                    ) : (
                      <Badge variant="outline">Available</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/dashboard/production/${batch.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Button>
                      </Link>
                      <Link href={`/dashboard/production/${batch.id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {totalItems > 0 && (
        <Pagination
          page={currentPage}
          setPage={handlePageChange}
          pageSize={pageSize}
          setPageSize={handlePageSizeChange}
          totalItems={totalItems}
          pageSizeOptions={[10, 30, 50, 100]}
        />
      )}
    </div>
  )
}

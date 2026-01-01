"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

interface Partner {
  id: string
  name: string
  contactName?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  gstNumber?: string | null
  bankName?: string | null
  accountNumber?: string | null
  ifscCode?: string | null
  type: string
}

interface Transaction {
  id: string
  date: Date
  invoiceNumber: string
  amount: number
  products: string
  quantity: number
  paymentStatus: string
  pendingAmount: number
}

interface ViewPartnerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partner: Partner
}

function getPaymentStatusBadge(status: string) {
  switch (status) {
    case "COMPLETE":
      return { label: "Paid", color: "bg-green-100 text-green-800" };
    case "PARTIAL":
      return { label: "Partial Paid", color: "bg-yellow-100 text-yellow-800" };
    case "PENDING":
    default:
      return { label: "Credit/Pending", color: "bg-gray-200 text-gray-800" };
  }
}

export function ViewPartnerDialog({ open, onOpenChange, partner }: ViewPartnerDialogProps) {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [transactionLimit, setTransactionLimit] = useState<'5' | '10' | 'all'>('5')

  useEffect(() => {
    if (open && partner.id) {
      fetchTransactions()
    }
  }, [open, partner.id])

  const fetchTransactions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/partners/${partner.id}/transactions`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const partnerType = partner.type === "VENDOR" ? "Vendor" : partner.type === "CLIENT" ? "Client" : "Vendor & Client"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>
            {partner.name} - {partnerType} Details
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium">Contact Person</h3>
              <p className="text-sm">{partner.contactName || "Not specified"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Phone</h3>
              <p className="text-sm">{partner.phone || "Not specified"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Email</h3>
              <p className="text-sm">{partner.email || "Not specified"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">GST Number</h3>
              <p className="text-sm">{partner.gstNumber || "Not specified"}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium">Address</h3>
            <p className="text-sm">{partner.address || "Not specified"}</p>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium mb-2">Bank Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h4 className="text-xs text-muted-foreground">Bank Name</h4>
                <p className="text-sm">{partner.bankName || "Not specified"}</p>
              </div>
              <div>
                <h4 className="text-xs text-muted-foreground">Account Number</h4>
                <p className="text-sm">{partner.accountNumber || "Not specified"}</p>
              </div>
              <div>
                <h4 className="text-xs text-muted-foreground">IFSC Code</h4>
                <p className="text-sm">{partner.ifscCode || "Not specified"}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium mb-2">Recent Transactions</h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground">Show:</span>
              <select
                className="border rounded px-2 py-1 text-xs bg-background"
                value={transactionLimit}
                onChange={e => setTransactionLimit(e.target.value as '5' | '10' | 'all')}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="all">All</option>
              </select>
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading transactions...</p>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions found.</p>
            ) : (
              <div className={`${transactionLimit === 'all' ? 'max-h-60 overflow-y-auto' : ''} border rounded-md`}>
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Invoice #</th>
                      <th className="p-2 text-left">Products</th>
                      <th className="p-2 text-right">Quantity</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(transactionLimit === 'all' ? transactions : transactions.slice(0, transactionLimit === '10' ? 10 : 5)).map((transaction) => (
                      <tr key={transaction.id} className="border-t">
                        <td className="p-2">{new Date(transaction.date).toLocaleDateString()}</td>
                        <td className="p-2">{transaction.invoiceNumber}</td>
                        <td className="p-2">{transaction.products}</td>
                        <td className="p-2 text-right">{transaction.quantity.toLocaleString()}</td>
                        <td className="p-2 text-right">₹{transaction.amount.toLocaleString()}</td>
                        <td className="p-2 text-center">
                          {(() => {
                            const { label, color } = getPaymentStatusBadge(transaction.paymentStatus);
                            return (
                              <span className={`text-xs px-2 py-1 rounded-full ${color}`}>{label}</span>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

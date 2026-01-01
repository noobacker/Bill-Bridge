"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/components/i18n/i18n-provider";

interface Transaction {
  id: string;
  type: "SALE" | "PURCHASE" | "EXPENSE";
  amount: number;
  date: string;
  description: string;
  vendor: string | null;
  client: string | null;
  itemDetails: string | null;
}

interface RecentTransactionsProps {
  limit?: number;
  className?: string;
}

export function RecentTransactions({ limit = 5, className }: RecentTransactionsProps) {
  const { t } = useI18n();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/dashboard/transactions?limit=${limit}`);
        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [limit]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "SALE":
        return <ArrowUp className="h-3 w-3 text-emerald-500" />
      case "PURCHASE":
        return <ArrowDown className="h-3 w-3 text-red-500" />
      case "EXPENSE":
        return <DollarSign className="h-3 w-3 text-amber-500" />
      default:
        return <ArrowDown className="h-3 w-3 text-red-500" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "SALE":
        return "text-emerald-500"
      case "PURCHASE":
        return "text-red-500"
      case "EXPENSE":
        return "text-amber-500"
      default:
        return "text-red-500"
    }
  }

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "SALE":
        return "default"
      case "PURCHASE":
        return "destructive"
      case "EXPENSE":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t("dashboard.recentTransactions.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-3 w-[80px]" />
                </div>
                <Skeleton className="h-4 w-[60px]" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("dashboard.recentTransactions.empty")}
          </p>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {transaction.type === "SALE" && transaction.client
                      ? transaction.client
                      : transaction.type === "PURCHASE" && transaction.vendor
                      ? transaction.vendor
                      : transaction.description}
                  </p>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                      <span>{formatDate(transaction.date)}</span>
                      <Badge
                        variant={getBadgeVariant(transaction.type)}
                        className="text-[10px] px-1 py-0"
                      >
                        {transaction.type}
                      </Badge>
                    </div>
                    {transaction.itemDetails && (
                      <p className="text-xs text-muted-foreground">
                        {transaction.itemDetails}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {getTransactionIcon(transaction.type)}
                  <span
                    className={`text-sm font-medium ${getTransactionColor(transaction.type)}`}
                  >
                    {formatAmount(transaction.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

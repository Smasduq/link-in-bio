"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { apiFetch, API_URL } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth-token";
import { formatNgn, type ProductSale } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";

export default function SalesPage() {
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [loading, setLoading] = useState(true);

  const exportCsv = async () => {
    const token = getStoredAuthToken();
    const res = await fetch(`${API_URL}/api/sales/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "product-sales.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    apiFetch<ProductSale[]>("/api/sales")
      .then(setSales)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Sales</h1>
          <p className="text-sm text-muted-foreground">Product purchases across your store</p>
        </div>
        <Button variant="secondary" type="button" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {sales.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">No sales yet.</CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Buyer</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Downloads</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-t border-border">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(sale.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{sale.product_title}</td>
                  <td className="px-4 py-3">{sale.buyer_email}</td>
                  <td className="px-4 py-3">{formatNgn(sale.amount_paid)}</td>
                  <td className="px-4 py-3">
                    {sale.download_count}
                    {sale.download_flagged ? " ⚠" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

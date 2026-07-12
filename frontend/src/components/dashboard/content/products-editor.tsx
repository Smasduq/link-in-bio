"use client";

import { useEffect, useState } from "react";
import { Crown, Eye, EyeOff, Package, Plus, Trash2, Upload } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { apiUploadFile } from "@/lib/api-upload";
import { formatNgn, type Product } from "@/lib/products";
import { canAddProduct, isPremiumFromProfile } from "@/lib/premium-features";
import type { Profile } from "@/types/database";
import { ProUpgradeCta } from "@/components/billing/pro-upgrade-cta";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageLoader } from "@/components/ui/spinner";

export function ProductsEditor() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: "" });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [deliverableFile, setDeliverableFile] = useState<File | null>(null);

  const allowNewProduct = canAddProduct(isPremium, products.length);

  const loadProducts = async () => {
    setProducts(await apiFetch<Product[]>("/api/products"));
  };

  useEffect(() => {
    Promise.all([loadProducts(), apiFetch<Profile>("/api/profile")])
      .then(([, profile]) => setIsPremium(isPremiumFromProfile(profile)))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!allowNewProduct) return;
    setSaving(true);
    try {
      const created = await apiFetch<Product>("/api/products", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          price: Number(form.price),
        }),
      });
      let updated = created;
      if (coverFile) {
        updated = await apiUploadFile<Product>(`/api/products/${created.id}/cover`, coverFile);
      }
      if (deliverableFile) {
        updated = await apiUploadFile<Product>(`/api/products/${created.id}/file`, deliverableFile);
      }
      if (coverFile && deliverableFile) {
        updated = await apiFetch<Product>(`/api/products/${created.id}`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: true }),
        });
      }
      setProducts((current) => [updated, ...current]);
      setModalOpen(false);
      setForm({ title: "", description: "", price: "" });
      setCoverFile(null);
      setDeliverableFile(null);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product: Product) => {
    const updated = await apiFetch<Product>(`/api/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !product.is_active }),
    });
    setProducts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm("Delete this product?")) return;
    await apiFetch(`/api/products/${productId}`, { method: "DELETE" });
    setProducts((current) => current.filter((item) => item.id !== productId));
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!allowNewProduct ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Crown className="h-4 w-4 text-amber-600" />
            Free plan includes 1 product. Upgrade for unlimited.
          </p>
        ) : (
          <span />
        )}
        <Button onClick={() => setModalOpen(true)} disabled={!allowNewProduct}>
          <Plus className="h-4 w-4" /> New product
        </Button>
      </div>

      {!allowNewProduct ? (
        <ProUpgradeCta
          title="Need more products?"
          description="Upgrade to Pro to sell unlimited digital products on your page."
        />
      ) : null}

      {products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Package className="mx-auto h-10 w-10 text-emerald-600" />
            <p className="mt-4 font-semibold">No products yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Upload a cover image and deliverable file to start selling.</p>
            {allowNewProduct ? (
              <Button className="mt-4" onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4" /> Add your first product
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => (
            <Card key={product.id}>
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                {product.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.cover_image_url} alt="" className="h-24 w-24 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-secondary">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{product.title}</h2>
                    {!product.is_active ? (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">Hidden</span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{formatNgn(product.total_charge)} buyer price</p>
                  <p className="text-xs text-muted-foreground">
                    {product.sales_count} sales · {formatNgn(product.revenue)} revenue · {product.file_name}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(product)} aria-label="Toggle visibility">
                    {product.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteProduct(product.id)} aria-label="Delete" className="hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create product">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Price (NGN)" type="number" min="100" step="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <div className="space-y-2">
            <label className="text-sm font-medium">Cover image</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Deliverable file (PDF, ZIP, etc.)</label>
            <input type="file" onChange={(e) => setDeliverableFile(e.target.files?.[0] || null)} required />
          </div>
          <Button type="submit" className="w-full" loading={saving} disabled={!allowNewProduct}>
            <Upload className="h-4 w-4" /> Create product
          </Button>
        </form>
      </Modal>
    </div>
  );
}

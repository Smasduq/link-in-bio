"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingBag, Tag } from "lucide-react";
import { formatNgn, type PublicProduct } from "@/lib/products";
import {
  getThemeBlockBorderRadius,
  getThemeBodyFontStyle,
  getThemeDisplayFontStyle,
  getThemeMutedTextColor,
  getThemeProductCardStyle,
  normalizeTheme,
} from "@/lib/profile-theme";
import { ProductPurchaseModal } from "@/components/public/product-purchase-modal";
import { ThemedProfileButton } from "@/components/public/themed-profile-button";
import type { ThemeSettings } from "@/types/database";

type ProductCardsProps = {
  products: PublicProduct[];
  theme: ThemeSettings;
};

export function ProductCards({ products, theme }: ProductCardsProps) {
  const [selected, setSelected] = useState<PublicProduct | null>(null);
  const normalized = normalizeTheme(theme);
  const radius = getThemeBlockBorderRadius(normalized);
  const cardStyle = getThemeProductCardStyle(normalized);

  if (products.length === 0) return null;

  return (
    <>
      <section className="mb-6 space-y-3" aria-label="Digital products" style={getThemeBodyFontStyle(normalized)}>
        <h2
          className="flex items-center justify-center gap-1.5 text-center text-xs font-semibold uppercase tracking-[0.12em]"
          style={{ ...getThemeDisplayFontStyle(normalized), color: getThemeMutedTextColor(normalized, 0.6) }}
        >
          <Tag className="h-3.5 w-3.5" style={{ color: normalized.accentColor }} aria-hidden />
          Digital products
        </h2>
        <div className="grid gap-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="profile-product-card profile-block overflow-hidden"
              style={cardStyle}
            >
              {product.cover_image_url ? (
                <div
                  className="relative h-36 w-full overflow-hidden border-b"
                  style={{
                    borderColor: `${normalized.accentColor}22`,
                    borderTopLeftRadius: radius,
                    borderTopRightRadius: radius,
                  }}
                >
                  <Image src={product.cover_image_url} alt="" fill className="object-cover" sizes="480px" />
                </div>
              ) : null}
              <div className="space-y-3 p-4">
                <div>
                  <h3
                    className="text-base font-bold"
                    style={{ ...getThemeDisplayFontStyle(normalized), color: normalized.textColor }}
                  >
                    {product.title}
                  </h3>
                  {product.description ? (
                    <p className="mt-1 text-sm" style={{ color: getThemeMutedTextColor(normalized) }}>
                      {product.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: `${normalized.accentColor}18` }}>
                  <span className="text-lg font-bold tabular-nums" style={{ color: normalized.accentColor }}>
                    {formatNgn(product.total_charge)}
                  </span>
                  <ThemedProfileButton theme={normalized} onClick={() => setSelected(product)}>
                    <ShoppingBag className="h-4 w-4" />
                    Buy now
                  </ThemedProfileButton>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selected ? (
        <ProductPurchaseModal
          product={selected}
          theme={normalized}
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}

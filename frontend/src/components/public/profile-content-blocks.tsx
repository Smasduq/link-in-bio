"use client";

import { useState } from "react";
import Image from "next/image";
import { Globe, Link as LinkIcon, Mail, Music2, Play, ShoppingBag, Tag } from "lucide-react";
import { detectPlatform } from "@/lib/social";
import {
  getLinkButtonStyle,
  getLinkIconColor,
  getThemeBlockBorderRadius,
  getThemeBodyFontStyle,
  getThemeDisplayFontStyle,
  getThemeMutedTextColor,
  getThemeProductCardStyle,
  normalizeTheme,
} from "@/lib/profile-theme";
import { formatNgn, type PublicProduct } from "@/lib/products";
import { EmailCaptureBlock } from "@/components/public/email-capture-block";
import { ProductPurchaseModal } from "@/components/public/product-purchase-modal";
import { ProfileEmbedBlock } from "@/components/public/profile-embed-block";
import { ThemedProfileButton } from "@/components/public/themed-profile-button";
import { TrackedProfileLink } from "@/components/public/tracked-profile-link";
import type { ContentBlock, LayoutMode, Link as ProfileLinkType, ThemeSettings } from "@/types/database";

type ProfileContentBlocksProps = {
  username: string;
  blocks: ContentBlock[];
  layoutMode: LayoutMode;
  theme: ThemeSettings;
};

function SectionHeader({ title, theme }: { title: string; theme: ThemeSettings }) {
  const normalized = normalizeTheme(theme);
  return (
    <h2
      className="mb-3 flex items-center justify-center gap-1.5 text-center text-xs font-semibold uppercase tracking-[0.12em]"
      style={{ ...getThemeDisplayFontStyle(normalized), color: getThemeMutedTextColor(normalized, 0.6) }}
    >
      <Tag className="h-3.5 w-3.5" style={{ color: normalized.accentColor }} aria-hidden />
      {title}
    </h2>
  );
}

function TypeBadge({ label, theme }: { label: string; theme: ThemeSettings }) {
  const normalized = normalizeTheme(theme);
  return (
    <span
      className="absolute right-3 top-3 z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        backgroundColor: `${normalized.accentColor}22`,
        color: normalized.accentColor,
        border: `1px solid ${normalized.accentColor}44`,
      }}
    >
      {label}
    </span>
  );
}

function ProfileLinkCard({
  link,
  theme,
  showBadge,
  badgeLabel,
}: {
  link: ProfileLinkType;
  theme: ThemeSettings;
  showBadge: boolean;
  badgeLabel?: string | null;
}) {
  const normalized = normalizeTheme(theme);
  const PlatformIcon = detectPlatform(link.url).icon;
  const buttonStyle = getLinkButtonStyle(normalized, { featured: link.is_featured });
  const iconColor = getLinkIconColor(normalized, link.is_featured);

  return (
    <div className="relative">
      {showBadge && badgeLabel ? <TypeBadge label={badgeLabel} theme={theme} /> : null}
      <TrackedProfileLink
        linkId={link.id}
        href={link.url}
        className={`profile-link group relative flex w-full items-center gap-3 border transition-all duration-200 active:scale-[0.99] ${
          link.is_featured ? "px-5 py-5 text-base" : "px-4 py-3.5 text-sm"
        }`}
        style={buttonStyle}
      >
        <span
          className={`profile-link-icon flex shrink-0 items-center justify-center rounded-lg ${
            link.is_featured ? "h-11 w-11 bg-white/20" : "h-9 w-9 bg-white/10"
          }`}
        >
          {link.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={link.icon} alt="" className={link.is_featured ? "h-5 w-5 object-contain" : "h-4 w-4 object-contain"} />
          ) : (
            <PlatformIcon className={link.is_featured ? "h-5 w-5" : "h-4 w-4"} style={{ color: iconColor }} />
          )}
        </span>
        <span className={`flex-1 text-left font-semibold ${link.is_featured ? "text-base" : "text-sm"}`}>{link.title}</span>
        <Globe
          className={`shrink-0 opacity-0 transition-opacity group-hover:opacity-60 ${link.is_featured ? "h-4 w-4" : "h-3.5 w-3.5"}`}
          style={{ color: iconColor }}
        />
      </TrackedProfileLink>
    </div>
  );
}

function SingleProductCard({
  product,
  theme,
  showBadge,
  badgeLabel,
  onBuy,
}: {
  product: PublicProduct;
  theme: ThemeSettings;
  showBadge: boolean;
  badgeLabel?: string | null;
  onBuy: (product: PublicProduct) => void;
}) {
  const normalized = normalizeTheme(theme);
  const radius = getThemeBlockBorderRadius(normalized);
  const cardStyle = getThemeProductCardStyle(normalized);

  return (
    <article className="profile-product-card profile-block relative overflow-hidden" style={cardStyle}>
      {showBadge && badgeLabel ? <TypeBadge label={badgeLabel} theme={theme} /> : null}
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
          <h3 className="text-base font-bold" style={{ ...getThemeDisplayFontStyle(normalized), color: normalized.textColor }}>
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
          <ThemedProfileButton theme={normalized} onClick={() => onBuy(product)}>
            <ShoppingBag className="h-4 w-4" />
            Buy now
          </ThemedProfileButton>
        </div>
      </div>
    </article>
  );
}

export function ProfileContentBlocks({ username, blocks, layoutMode, theme }: ProfileContentBlocksProps) {
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(null);
  const normalized = normalizeTheme(theme);
  const isFreeform = layoutMode === "freeform";

  if (blocks.length === 0) {
    return (
      <p
        className="rounded-xl border px-4 py-6 text-center text-sm opacity-60"
        style={{ borderColor: `${normalized.textColor}22`, color: normalized.textColor }}
      >
        No content yet.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3" style={getThemeBodyFontStyle(normalized)}>
        {blocks.map((block) => {
          const showBadge = isFreeform && Boolean(block.badge_label);
          const sectionHeader =
            !isFreeform && block.show_section_header && block.section_title ? (
              <SectionHeader title={block.section_title} theme={theme} />
            ) : null;

          if (block.block_type === "link" && block.link) {
            return (
              <div key={block.id}>
                {sectionHeader}
                <ProfileLinkCard link={block.link} theme={theme} showBadge={showBadge} badgeLabel={block.badge_label} />
              </div>
            );
          }

          if (block.block_type === "embed" && block.link?.embed_src) {
            return (
              <div key={block.id} className="relative">
                {sectionHeader}
                {showBadge && block.badge_label ? <TypeBadge label={block.badge_label} theme={theme} /> : null}
                <ProfileEmbedBlock
                  title={block.link.title}
                  type={block.link.type}
                  embedSrc={block.link.embed_src}
                  embedHeight={block.link.embed_height}
                  theme={theme}
                />
              </div>
            );
          }

          if (block.block_type === "product" && block.product) {
            return (
              <div key={block.id}>
                {sectionHeader}
                <SingleProductCard
                  product={block.product}
                  theme={theme}
                  showBadge={showBadge}
                  badgeLabel={block.badge_label}
                  onBuy={setSelectedProduct}
                />
              </div>
            );
          }

          if (block.block_type === "newsletter" && block.newsletter_heading) {
            return (
              <div key={block.id} className="relative">
                {sectionHeader}
                {showBadge && block.badge_label ? <TypeBadge label={block.badge_label} theme={theme} /> : null}
                <EmailCaptureBlock username={username} heading={block.newsletter_heading} theme={theme} />
              </div>
            );
          }

          return null;
        })}
      </div>

      {selectedProduct ? (
        <ProductPurchaseModal
          product={selectedProduct}
          theme={normalized}
          open={Boolean(selectedProduct)}
          onClose={() => setSelectedProduct(null)}
        />
      ) : null}
    </>
  );
}

export const CONTENT_BLOCK_ICONS = {
  link: LinkIcon,
  embed: Play,
  product: ShoppingBag,
  newsletter: Mail,
} as const;

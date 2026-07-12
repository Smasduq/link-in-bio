"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BarChart3,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  Lightbulb,
  Link2,
  Monitor,
  Palette,
  Pencil,
  Plus,
  Search,
  Share2,
  Smartphone,
  Tablet,
  TrendingDown,
  TrendingUp,
  Upload,
  User,
  Users,
} from "lucide-react";
import type { AnalyticsResponse, Link as LinkType, Profile } from "@/types/database";
import {
  buildGrowthSuggestions,
  buildProfileChecklist,
  buildRecentActivity,
  buildTopLinks,
  computeCtr,
  DashboardPeriod,
  filterChartData,
  formatNumber,
  formatPercent,
  getGreeting,
  getPublicUrl,
  getThemeLabel,
  periodTrend,
  sparklinePoints,
} from "@/lib/dashboard-utils";
import { canAccessAnalyticsPeriod, isAnalyticsPeriodPro } from "@/lib/premium-features";
import { getBackgroundStyle, getLinkButtonStyle, normalizeTheme } from "@/lib/profile-theme";
import { SITE_NAME } from "@/lib/site";
import { ProUpgradeCta } from "@/components/billing/pro-upgrade-cta";
import { useAnimatedCounter, useInView, useRipple } from "@/components/dashboard/overview/hooks";
import "@/styles/dashboard-overview.css";

type DashboardOverviewProps = {
  profile: Profile;
  links: LinkType[];
  analytics: AnalyticsResponse;
};

const PERIODS: { id: DashboardPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 Days" },
  { id: "30d", label: "Last 30 Days" },
  { id: "90d", label: "Last 90 Days" },
  { id: "all", label: "All Time" },
];

function RippleButton({
  href,
  children,
  variant = "secondary",
  onClick,
  external,
  className,
}: {
  href?: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  external?: boolean;
  className?: string;
}) {
  const ripple = useRipple();
  const classes = `lb-btn lb-btn--${variant}${className ? ` ${className}` : ""}`;

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={classes} onClick={ripple}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} onClick={ripple}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={(e) => { ripple(e); onClick?.(); }}>
      {children}
    </button>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  sparkData,
  delay,
  suffix = "",
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  delta: number;
  sparkData: number[];
  delay: number;
  suffix?: string;
}) {
  const { ref, visible } = useInView();
  const animated = useAnimatedCounter(value, visible);
  const trendClass =
    delta > 0 ? "lb-stat__delta--up" : delta < 0 ? "lb-stat__delta--down" : "lb-stat__delta--flat";

  return (
    <article
      ref={ref as React.RefObject<HTMLElement>}
      className="lb-card lb-stat"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="lb-card__body lb-stat__body">
        <div className="lb-stat__icon" aria-hidden>
          <Icon />
        </div>
        <div className="lb-stat__main">
          <div className="lb-stat__row">
            <p className="lb-stat__value">{formatNumber(animated)}{suffix}</p>
            <svg className="lb-stat__spark" viewBox="0 0 80 32" aria-hidden>
              <path d={sparklinePoints(sparkData)} fill="none" stroke="var(--lb-emerald)" strokeWidth="2" />
            </svg>
          </div>
          <p className="lb-stat__label">{label}</p>
          <span className={`lb-stat__delta ${trendClass}`}>
            {delta > 0 ? <TrendingUp size={14} /> : delta < 0 ? <TrendingDown size={14} /> : null}
            {delta > 0 ? "+" : ""}
            {Math.round(delta)}% vs prior period
          </span>
        </div>
      </div>
    </article>
  );
}

function AnalyticsChart({
  data,
  period,
  onPeriodChange,
  isPremium,
}: {
  data: AnalyticsResponse["daily_stats"];
  period: DashboardPeriod;
  onPeriodChange: (p: DashboardPeriod) => void;
  isPremium: boolean;
}) {
  const router = useRouter();
  const filtered = useMemo(() => {
    const safePeriod = canAccessAnalyticsPeriod(period, isPremium) ? period : "today";
    return filterChartData(data, safePeriod);
  }, [data, period, isPremium]);
  const width = 640;
  const height = 200;
  const padding = { top: 16, right: 12, bottom: 28, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxVal = Math.max(
    ...filtered.flatMap((d) => [d.page_views, d.link_clicks]),
    1
  );

  const toPoints = (key: "page_views" | "link_clicks") =>
    filtered
      .map((d, i) => {
        const x = padding.left + (i / Math.max(filtered.length - 1, 1)) * innerW;
        const y = padding.top + innerH - (d[key] / maxVal) * innerH;
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");

  const toArea = (key: "page_views" | "link_clicks") => {
    if (filtered.length === 0) return "";
    const line = filtered
      .map((d, i) => {
        const x = padding.left + (i / Math.max(filtered.length - 1, 1)) * innerW;
        const y = padding.top + innerH - (d[key] / maxVal) * innerH;
        return `${x},${y}`;
      })
      .join(" L");
    const lastX = padding.left + innerW;
    const baseY = padding.top + innerH;
    const firstX = padding.left;
    return `M${firstX},${baseY} L${line} L${lastX},${baseY} Z`;
  };

  return (
    <div className="lb-card lb-analytics">
      <div className="lb-section__head">
        <h2 className="lb-section__title">Analytics</h2>
        <Link href="/dashboard/analytics" className="lb-section__link">
          Full report
        </Link>
      </div>

      <div className="lb-analytics__tabs" role="tablist" aria-label="Analytics period">
        {PERIODS.map((p) => {
          const locked = !isPremium && isAnalyticsPeriodPro(p.id);
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={period === p.id}
              aria-disabled={locked}
              title={locked ? "Upgrade to Pro for 7, 30 & 90 day analytics" : undefined}
              className={`lb-analytics__tab ${period === p.id ? "is-active" : ""}${locked ? " lb-analytics__tab--locked" : ""}`}
              onClick={() => {
                if (locked) {
                  router.push("/upgrade");
                  return;
                }
                onPeriodChange(p.id);
              }}
            >
              {p.label}
              {locked ? <span className="lb-analytics__pro-badge">Pro</span> : null}
            </button>
          );
        })}
      </div>

      <div className="lb-analytics__legend">
        <span><span className="lb-analytics__dot lb-analytics__dot--views" /> Views</span>
        <span><span className="lb-analytics__dot lb-analytics__dot--clicks" /> Clicks</span>
      </div>

      <svg className="lb-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Views and clicks chart">
        <defs>
          <linearGradient id="lbGradViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(16,185,129,0.35)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0)" />
          </linearGradient>
          <linearGradient id="lbGradClicks" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(99,102,241,0.25)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0)" />
          </linearGradient>
        </defs>
        <g className="lb-chart__grid">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={padding.left}
              x2={width - padding.right}
              y1={padding.top + innerH * t}
              y2={padding.top + innerH * t}
            />
          ))}
        </g>
        {filtered.length > 0 && (
          <>
            <path className="lb-chart__area--clicks" d={toArea("link_clicks")} />
            <path className="lb-chart__area--views" d={toArea("page_views")} />
            <path className="lb-chart__line lb-chart__line--clicks" d={toPoints("link_clicks")} />
            <path className="lb-chart__line lb-chart__line--views" d={toPoints("page_views")} />
          </>
        )}
      </svg>
    </div>
  );
}

function PhonePreview({ profile, links }: { profile: Profile; links: LinkType[] }) {
  const theme = normalizeTheme(profile.theme_settings);
  const bgStyle = getBackgroundStyle(theme);
  const activeLinks = links.filter((l) => l.is_active).slice(0, 4);
  const publicUrl = getPublicUrl(profile.username);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="lb-card lb-card--glass">
      <div className="lb-card__body">
        <div className="lb-section__head">
          <h2 className="lb-section__title">Portfolio preview</h2>
        </div>
        <div className="lb-phone-wrap">
          <div className="lb-phone" aria-hidden>
            <div className="lb-phone__screen">
              <div className="lb-phone__notch" />
              <div className="lb-phone__preview" style={bgStyle}>
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="lb-phone__avatar" />
                ) : (
                  <div className="lb-phone__avatar lb-phone__avatar--fallback" style={{ color: theme.accentColor }}>
                    {profile.username[0]?.toUpperCase()}
                  </div>
                )}
                <p className="lb-phone__handle" style={{ color: theme.accentColor }}>
                  @{profile.username}
                </p>
                {profile.bio && <p className="lb-phone__bio">{profile.bio}</p>}
                <div className="lb-phone__links">
                  {activeLinks.map((link) => (
                    <div
                      key={link.id}
                      className={`lb-phone__link ${link.is_featured ? "lb-phone__link--featured" : ""}`}
                      style={getLinkButtonStyle(theme, { featured: link.is_featured })}
                    >
                      {link.title}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="lb-phone__actions">
            <RippleButton href={publicUrl} external variant="primary">
              <ExternalLink /> Open live page
            </RippleButton>
            <RippleButton variant="secondary" onClick={copyLink}>
              <Copy /> {copied ? "Copied!" : "Copy link"}
            </RippleButton>
            <RippleButton href="/dashboard/appearance" variant="ghost">
              <Pencil /> Edit portfolio
            </RippleButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopLinkRow({ link, index }: { link: ReturnType<typeof buildTopLinks>[number]; index: number }) {
  const { ref, visible } = useInView();

  return (
    <article
      ref={ref as React.RefObject<HTMLElement>}
      className="lb-card lb-toplink"
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className="lb-toplink__icon">{link.platform.slice(0, 2).toUpperCase()}</div>
      <div className="min-w-0 flex-1">
        <p className="lb-toplink__title">{link.platform}</p>
        <p className="lb-toplink__meta">
          <span className="lb-toplink__meta-title">{link.title}</span>
          {" · "}
          {formatPercent(link.ctr)} CTR
        </p>
      </div>
      <div className="lb-toplink__stats">
        <p className="lb-toplink__clicks">{formatNumber(link.clicks)}</p>
        <span className={`lb-toplink__trend ${link.trend >= 0 ? "lb-toplink__trend--up" : "lb-toplink__trend--down"}`}>
          {link.trend >= 0 ? "↑" : "↓"} {Math.abs(Math.round(link.trend))}%
        </span>
      </div>
      <div className="lb-toplink__bar">
        <div
          className="lb-toplink__bar-fill"
          style={{ width: visible ? `${link.maxClicks ? (link.clicks / link.maxClicks) * 100 : 0}%` : "0%" }}
        />
      </div>
    </article>
  );
}

export function DashboardOverview({ profile, links, analytics }: DashboardOverviewProps) {
  const isPremium = Boolean(profile.is_premium);
  const [period, setPeriod] = useState<DashboardPeriod>(isPremium ? "7d" : "today");
  const [search, setSearch] = useState("");

  const overview = analytics.overview;
  const viewSpark = analytics.daily_stats.map((d) => d.page_views);
  const clickSpark = analytics.daily_stats.map((d) => d.link_clicks);
  const ctr = computeCtr(overview.total_page_views, overview.total_link_clicks);
  const uniqueVisitors = overview.unique_visitors_total;
  const uniqueSpark = overview.unique_visitors_by_day.slice(-7).map((d) => d.unique_visitors);

  const checklist = buildProfileChecklist(profile, links);
  const completionPct = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
  const { ref: completionRef, visible: completionVisible } = useInView();
  const completionAnimated = useAnimatedCounter(completionPct, completionVisible);

  const topLinks = buildTopLinks(analytics.links, overview.total_page_views);
  const activity = buildRecentActivity(profile, links);
  const suggestions = buildGrowthSuggestions(profile, links);
  const theme = normalizeTheme(profile.theme_settings);
  const themeLabel = getThemeLabel(profile);
  const publicUrl = getPublicUrl(profile.username);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    const empty = { nav: [] as { label: string; href: string }[], links: [] as LinkType[] };
    if (!q) return empty;

    const nav = [
      { label: "Links", href: "/dashboard/links" },
      { label: "Appearance", href: "/dashboard/appearance" },
      { label: "Analytics", href: "/dashboard/analytics" },
      { label: "Settings", href: "/dashboard/settings" },
    ].filter((item) => item.label.toLowerCase().includes(q));

    const matchedLinks = links.filter(
      (l) => l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q)
    );

    return { nav, links: matchedLinks };
  }, [search, links]);

  const greeting = getGreeting(profile.full_name);
  const hasTraffic = overview.total_page_views > 0;

  const activityGroups = ["Today", "Yesterday", "Earlier"] as const;

  return (
    <div className="lb-dashboard">
      <div className="lb-dashboard__bg" aria-hidden>
        <div className="lb-dashboard__orb lb-dashboard__orb--1" />
        <div className="lb-dashboard__orb lb-dashboard__orb--2" />
      </div>

      <div className="lb-dashboard__content lb-fade-in">
        {/* Search */}
        <section className="lb-search" aria-label="Dashboard search">
          <div className="lb-search__wrap">
            <span className="lb-search__icon" aria-hidden>
              <Search size={18} strokeWidth={2} />
            </span>
            <input
              type="search"
              className="lb-search__input"
              placeholder="Search links, analytics, settings…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search dashboard"
            />
          </div>
          {search.trim() && (
            <div className="lb-search__hint">
              {searchResults.nav.length || searchResults.links.length ? (
                <>
                  {searchResults.nav.map((item) => (
                    <Link key={item.href} href={item.href} className="lb-section__link" style={{ marginRight: "1rem" }}>
                      {item.label}
                    </Link>
                  ))}
                  {searchResults.links.slice(0, 3).map((link) => (
                    <span key={link.id} style={{ marginRight: "0.75rem" }}>
                      {link.title}
                    </span>
                  ))}
                </>
              ) : (
                "No matches found"
              )}
            </div>
          )}
        </section>

        {/* Header */}
        <header className="lb-header">
          <div>
            <h1 className="lb-header__greeting">{greeting} 👋</h1>
            <p className="lb-header__sub">
              {hasTraffic
                ? `Your ${SITE_NAME} page is attracting visitors today. Let's see how it's performing.`
                : "Your portfolio is live. Share it to start collecting insights."}
            </p>
          </div>
          <div className="lb-header__actions">
            <RippleButton href={publicUrl} external variant="secondary">
              <ExternalLink /> View portfolio
            </RippleButton>
            <RippleButton
              variant="secondary"
              onClick={() => {
                if (navigator.share) {
                  void navigator.share({ title: profile.full_name || profile.username, url: publicUrl });
                } else {
                  void navigator.clipboard.writeText(publicUrl);
                }
              }}
            >
              <Share2 /> Share portfolio
            </RippleButton>
            <RippleButton href="/dashboard/appearance" variant="primary">
              <Pencil /> Edit portfolio
            </RippleButton>
          </div>
        </header>

        {/* Stats */}
        <section className="lb-grid lb-grid--stats lb-stagger" aria-label="Overview statistics">
          <StatCard
            icon={Eye}
            label="Profile views"
            value={overview.total_page_views}
            delta={periodTrend(viewSpark)}
            sparkData={viewSpark}
            delay={0}
          />
          <StatCard
            icon={Link2}
            label="Link clicks"
            value={overview.total_link_clicks}
            delta={periodTrend(clickSpark)}
            sparkData={clickSpark}
            delay={80}
          />
          <StatCard
            icon={BarChart3}
            label="Click-through rate"
            value={Math.round(ctr)}
            delta={periodTrend([ctr * 0.8, ctr * 0.9, ctr])}
            sparkData={[ctr * 0.7, ctr * 0.85, ctr * 0.9, ctr]}
            delay={160}
            suffix="%"
          />
          {isPremium ? (
            <StatCard
              icon={Users}
              label="Unique visitors"
              value={uniqueVisitors}
              delta={periodTrend(uniqueSpark)}
              sparkData={uniqueSpark}
              delay={240}
            />
          ) : (
            <article className="lb-card lb-stat">
              <div className="lb-card__body lb-stat__body">
                <div className="lb-stat__icon" aria-hidden>
                  <Users />
                </div>
                <div className="lb-stat__main">
                  <p className="lb-stat__label">Unique visitors</p>
                  <Link href="/upgrade" className="lb-section__link" style={{ marginTop: "0.5rem", display: "inline-block" }}>
                    Unlock with Pro →
                  </Link>
                </div>
              </div>
            </article>
          )}
        </section>

        {/* Analytics + Phone */}
        <section className="lb-section lb-grid lb-grid--2">
          <AnalyticsChart
            data={analytics.daily_stats}
            period={period}
            onPeriodChange={setPeriod}
            isPremium={isPremium}
          />
          <PhonePreview profile={profile} links={links} />
        </section>

        {/* Top links */}
        <section className="lb-section" aria-labelledby="top-links-heading">
          <div className="lb-section__head">
            <h2 id="top-links-heading" className="lb-section__title">Top performing links</h2>
            <Link href="/dashboard/links" className="lb-section__link">Manage links</Link>
          </div>
          {topLinks.length === 0 ? (
            <div className="lb-card lb-empty">
              <div className="lb-empty__illus"><Link2 /></div>
              <h3 className="lb-empty__title">No links yet</h3>
              <p className="lb-empty__text">Start building your {SITE_NAME} page — add your first link to track performance.</p>
              <RippleButton href="/dashboard/links" variant="primary">
                <Plus /> Add your first link
              </RippleButton>
            </div>
          ) : (
            <div className="lb-toplinks">
              {topLinks.map((link, i) => (
                <TopLinkRow key={link.id} link={link} index={i} />
              ))}
            </div>
          )}
        </section>

        {/* Visitor insights */}
        <section className="lb-section" aria-labelledby="insights-heading">
          <div className="lb-section__head">
            <h2 id="insights-heading" className="lb-section__title">Visitor insights</h2>
          </div>
          {isPremium ? (
            <>
              <div className="lb-insights">
                <InsightCard title="Top regions" items={analytics.visitor_insights.top_regions} />
                <InsightCard title="Top devices" items={analytics.visitor_insights.top_devices.map((item) => ({
                  ...item,
                  icon: item.label === "Mobile" ? Smartphone : item.label === "Tablet" ? Tablet : Monitor,
                }))} />
                <InsightCard title="Most active time" items={analytics.visitor_insights.most_active_time} />
              </div>
              {!hasTraffic && analytics.visitor_insights.top_regions.every((item) => item.count === 0) && (
                <p className="lb-search__hint" style={{ marginTop: "0.75rem" }}>
                  Insights populate as your page receives traffic.
                </p>
              )}
            </>
          ) : (
            <ProUpgradeCta
              title="Visitor insights"
              description="See top regions, devices, and most active times — included with Pro."
            />
          )}
        </section>

        {/* Completion + Quick actions row */}
        <section className="lb-section lb-grid lb-grid--2">
          <article className="lb-card lb-completion" ref={completionRef as React.RefObject<HTMLElement>}>
            <div className="lb-card__body lb-completion__body">
              <div className="lb-completion__header">
                <h2 className="lb-section__title lb-completion__title">Profile completion</h2>
                <p className="lb-completion__pct">{completionAnimated}%</p>
              </div>
              <div className="lb-completion__track">
                <div className="lb-completion__fill" style={{ width: completionVisible ? `${completionPct}%` : "0%" }} />
              </div>
              <ul className="lb-completion__list">
                {checklist.map((item) => (
                  <li key={item.id} className="lb-completion__item">
                    <span className={`lb-completion__check ${item.done ? "lb-completion__check--done" : "lb-completion__check--todo"}`}>
                      {item.done ? "✓" : ""}
                    </span>
                    <span className="lb-completion__label">{item.label}</span>
                  </li>
                ))}
              </ul>
              <RippleButton
                href={checklist.find((c) => !c.done)?.href ?? "/dashboard/settings"}
                variant="primary"
                className="lb-completion__cta"
              >
                Complete now
              </RippleButton>
            </div>
          </article>

          <div className="lb-actions-wrap">
            <div className="lb-section__head">
              <h2 className="lb-section__title">Quick actions</h2>
            </div>
            <div className="lb-actions-scroll" role="region" aria-label="Quick actions">
              {[
                { label: "Add link", href: "/dashboard/links", icon: Plus },
                { label: "Customize theme", href: "/dashboard/appearance", icon: Palette },
                { label: "Edit profile", href: "/dashboard/settings", icon: User },
                { label: "Share portfolio", href: publicUrl, icon: Share2, external: true },
                { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
                { label: "Upload avatar", href: "/dashboard/settings", icon: Upload },
              ].map((action) => (
                <Link key={action.label} href={action.href} className="lb-card lb-action lb-card--lift" {...(action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                  <span className="lb-action__icon"><action.icon /></span>
                  <span className="lb-action__label">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Activity + Suggestions + Themes */}
        <section className="lb-section lb-grid lb-grid--3">
          <article className="lb-card">
            <div className="lb-card__body">
              <h2 className="lb-section__title">Recent activity</h2>
              <div className="lb-timeline">
                {activityGroups.map((group) => {
                  const items = activity.filter((a) => a.group === group);
                  if (items.length === 0) return null;
                  return (
                    <div key={group}>
                      <p className="lb-timeline__group-title">{group}</p>
                      {items.map((item) => (
                        <div key={item.id} className="lb-timeline__item">
                          <span className="lb-timeline__dot" />
                          <p className="lb-timeline__text">{item.label}</p>
                          <time className="lb-timeline__time">{item.timestamp}</time>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {activity.length === 0 && (
                  <p className="lb-search__hint">Activity will appear as you update your portfolio.</p>
                )}
              </div>
            </div>
          </article>

          <article className="lb-card">
            <div className="lb-card__body">
              <h2 className="lb-section__title">Growth suggestions</h2>
              <div className="lb-suggestions">
                {suggestions.map((s) => (
                  <div key={s.id} className="lb-card lb-suggestion">
                    <p className="lb-suggestion__text">
                      <strong><Lightbulb size={14} style={{ display: "inline", verticalAlign: "middle" }} /></strong>{" "}
                      {s.message}
                    </p>
                    <RippleButton href={s.href} variant="ghost">{s.action}</RippleButton>
                  </div>
                ))}
                {suggestions.length === 0 && (
                  <p className="lb-search__hint">Your profile looks great. Keep sharing your page!</p>
                )}
              </div>
            </div>
          </article>

          <article className="lb-card">
            <div className="lb-card__body">
              <h2 className="lb-section__title">Portfolio theme</h2>
              <div className="lb-themes">
                <div className="lb-card lb-theme">
                  <div className="lb-theme__swatch" style={getBackgroundStyle(theme)} />
                  <p className="lb-theme__label">Current</p>
                  <p className="lb-search__hint">{themeLabel}</p>
                </div>
                <Link href={publicUrl} target="_blank" rel="noopener noreferrer" className="lb-card lb-theme lb-card--lift" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="lb-theme__swatch" style={{ ...getBackgroundStyle(theme), opacity: 0.85 }} />
                  <p className="lb-theme__label">Preview</p>
                </Link>
                <Link href="/dashboard/appearance" className="lb-card lb-theme lb-card--lift" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="lb-theme__swatch" style={{ background: "var(--lb-ash)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Palette style={{ color: "var(--lb-emerald)" }} />
                  </div>
                  <p className="lb-theme__label">Customize</p>
                </Link>
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

function InsightCard({
  title,
  items,
}: {
  title: string;
  items: { label: string; pct: number; count?: number; icon?: typeof Globe }[];
}) {
  const { ref, visible } = useInView();
  const hasData = items.some((item) => (item.count ?? item.pct) > 0);

  return (
    <article ref={ref as React.RefObject<HTMLElement>} className="lb-card">
      <div className="lb-card__body">
        <h3 className="lb-section__title" style={{ fontSize: "0.9375rem" }}>{title}</h3>
        {!hasData ? (
          <p className="lb-search__hint">No data yet</p>
        ) : (
          <ul className="lb-insight__list">
            {items.filter((item) => item.pct > 0).map((item) => (
              <li key={item.label} className="lb-insight__row">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
                  {item.icon && <item.icon size={14} />}
                  {item.label}
                </span>
                <div className="lb-insight__bar-wrap">
                  <div className="lb-insight__bar" style={{ width: visible ? `${item.pct}%` : "0%" }} />
                </div>
                <span className="lb-insight__pct">{item.pct}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export function DashboardLoading() {
  return (
    <div className="lb-dashboard">
      <div className="lb-loading" role="status" aria-live="polite">
        <div className="lb-loading__spinner" />
        <p>Loading your workspace…</p>
      </div>
    </div>
  );
}

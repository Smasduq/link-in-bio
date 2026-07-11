"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const HERO_BG = {
  mobile: "/images/hero/mobile/hero-bg.jpg",
  desktop: "/images/hero/hero-bg.jpg",
  alt: "Group of friends laughing together",
};

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initial: string;
  delay: string;
};

type CollageItem = {
  id: string;
  alt: string;
  src: string;
  mobileSrc: string;
  /** Mobile-first visibility: show from this breakpoint upward */
  showFrom: "base" | "sm" | "md" | "lg";
  /** Mobile-first position & size classes */
  position: string;
  size: string;
  testimonial?: Testimonial;
  testimonialAlign?: "left" | "right";
};

const COLLAGE_ITEMS: CollageItem[] = [
  {
    id: "creator-phone",
    alt: "Creator smiling while checking phone",
    src: "/images/hero/creator-phone.jpg",
    mobileSrc: "/images/hero/mobile/creator-phone.jpg",
    showFrom: "md",
    size: "w-[4.75rem] sm:w-24 md:w-32 lg:w-36",
    position: "left-0 top-[2%] sm:left-[1%] sm:top-[4%] md:left-[2%] md:top-[6%]",
    testimonialAlign: "left",
    testimonial: {
      quote: "Finally! My audience can find everything.",
      name: "Maya R.",
      role: "Creator",
      initial: "M",
      delay: "0s",
    },
  },
  {
    id: "entrepreneur-laptop",
    alt: "Entrepreneur working on laptop",
    src: "/images/hero/entrepreneur-laptop.jpg",
    mobileSrc: "/images/hero/mobile/entrepreneur-laptop.jpg",
    showFrom: "md",
    size: "w-[4.75rem] sm:w-24 md:w-32 lg:w-36",
    position: "right-0 top-[2%] sm:right-[1%] sm:top-[4%] md:right-[3%] md:top-[5%]",
    testimonialAlign: "right",
    testimonial: {
      quote: "Clients book me faster now.",
      name: "James K.",
      role: "Consultant",
      initial: "J",
      delay: "1.2s",
    },
  },
  {
    id: "creator-video",
    alt: "Content creator recording a video",
    src: "/images/hero/creator-video.jpg",
    mobileSrc: "/images/hero/mobile/creator-video.jpg",
    showFrom: "base",
    size: "w-[4.25rem] sm:w-[5.5rem] md:w-28 lg:w-32",
    position: "left-0 bottom-[10%] sm:left-[2%] sm:bottom-[12%] md:left-[4%] md:bottom-[10%]",
  },
  {
    id: "team-success",
    alt: "Freelancers celebrating project success",
    src: "/images/hero/team-success.jpg",
    mobileSrc: "/images/hero/mobile/team-success.jpg",
    showFrom: "base",
    size: "w-[4.25rem] sm:w-[5.5rem] md:w-28 lg:w-32",
    position: "right-0 bottom-[10%] sm:right-[2%] sm:bottom-[12%] md:right-[4%] md:bottom-[8%]",
  },
  {
    id: "musician-studio",
    alt: "Musician with headphones in studio",
    src: "/images/hero/musician-studio.jpg",
    mobileSrc: "/images/hero/mobile/musician-studio.jpg",
    showFrom: "md",
    size: "w-28 md:w-32 lg:w-36",
    position: "left-[1%] top-[38%] md:top-[40%]",
    testimonialAlign: "left",
    testimonial: {
      quote: "My music finally has one home.",
      name: "Aria L.",
      role: "Musician",
      initial: "A",
      delay: "0.6s",
    },
  },
  {
    id: "photographer",
    alt: "Photographer reviewing camera screen",
    src: "/images/hero/photographer.jpg",
    mobileSrc: "/images/hero/mobile/photographer.jpg",
    showFrom: "md",
    size: "w-28 md:w-32 lg:w-36",
    position: "right-[1%] top-[34%] md:top-[36%]",
  },
  {
    id: "designer-collab",
    alt: "Designer collaborating on creative work",
    src: "/images/hero/designer-collab.jpg",
    mobileSrc: "/images/hero/mobile/designer-collab.jpg",
    showFrom: "lg",
    size: "w-28 lg:w-32",
    position: "left-[12%] bottom-[3%] lg:left-[16%]",
    testimonialAlign: "left",
    testimonial: {
      quote: "My followers love how clean my page looks.",
      name: "Dev P.",
      role: "Designer",
      initial: "D",
      delay: "1.8s",
    },
  },
  {
    id: "student-mobile",
    alt: "Student sharing work on mobile",
    src: "/images/hero/student-mobile.jpg",
    mobileSrc: "/images/hero/mobile/student-mobile.jpg",
    showFrom: "lg",
    size: "w-28 lg:w-32",
    position: "right-[10%] bottom-[4%] lg:right-[14%]",
  },
];

const SHOW_FROM_CLASS = {
  base: "flex",
  sm: "hidden sm:flex",
  md: "hidden md:flex",
  lg: "hidden lg:flex",
} as const;

function MobileTestimonialOverlay({ item }: { item: Testimonial }) {
  return (
    <div className="absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/75 via-black/45 to-transparent px-2 pb-2 pt-5 sm:px-2.5 sm:pb-2.5 md:hidden">
      <p className="text-[9px] font-medium leading-snug text-white sm:text-[10px]">
        &ldquo;{item.quote}&rdquo;
      </p>
      <p className="mt-0.5 text-[8px] font-semibold text-emerald-300 sm:text-[9px]">
        {item.name} · {item.role}
      </p>
    </div>
  );
}

function DesktopTestimonialCard({
  item,
  align,
}: {
  item: Testimonial;
  align: "left" | "right";
}) {
  return (
    <div
      className={`hero-testimonial relative z-10 -mt-3 hidden w-full items-start gap-2.5 rounded-2xl border border-border bg-card/85 p-3 shadow-card backdrop-blur-xl md:flex ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
      style={{ animationDelay: item.delay }}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-[11px] font-bold text-white">
        {item.initial}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium leading-snug text-foreground">&ldquo;{item.quote}&rdquo;</p>
        <p className="mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{item.name}</p>
        <p className="text-[10px] text-muted-foreground">{item.role}</p>
      </div>
    </div>
  );
}

function useMobileViewport() {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export function HeroBackground() {
  const isMobile = useMobileViewport();
  const [reduceMotion, setReduceMotion] = useState(true);
  const [parallax, setParallax] = useState(0);

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    const onScroll = () => {
      if (window.innerWidth < 768) return;
      const y = Math.min(window.scrollY, window.innerHeight);
      setParallax(y * 0.05);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const enableParallax = !reduceMotion && !isMobile;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="hero-main-bg absolute inset-0 z-0"
        style={{ transform: enableParallax ? `translateY(${parallax * 0.4}px)` : undefined }}
      >
        <Image
          src={isMobile ? HERO_BG.mobile : HERO_BG.desktop}
          alt={HERO_BG.alt}
          fill
          priority
          sizes="(max-width: 767px) 100vw, 100vw"
          quality={isMobile ? 75 : 85}
          className="object-cover object-[center_35%] md:object-center"
        />
        <div className="hero-bg-radial-vignette absolute inset-0" />
        <div className="hero-bg-tint absolute inset-0" />
        <div className="hero-bg-top-fade absolute inset-x-0 top-0" />
        <div className="hero-bg-bottom-fade absolute inset-x-0 bottom-0" />
      </div>

      <div
        className={`absolute inset-0 z-[1] ${enableParallax ? "hero-collage" : ""}`}
        style={{ transform: enableParallax ? `translateY(${parallax}px)` : undefined }}
      >
        {COLLAGE_ITEMS.map((item, index) => {
          const imageSrc = isMobile ? item.mobileSrc : item.src;
          const isPriority = isMobile
            ? item.id === "creator-video" || item.id === "team-success"
            : index < 2;

          return (
            <div
              key={item.id}
              className={`hero-tile-${index + 1} absolute flex-col gap-1.5 sm:gap-2 ${item.size} ${item.position} ${SHOW_FROM_CLASS[item.showFrom]}`}
            >
              <div className="hero-photo-frame relative aspect-[4/5] w-full overflow-hidden rounded-xl border-2 border-white/80 shadow-[0_12px_32px_rgba(0,0,0,0.14)] sm:rounded-2xl sm:shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
                <Image
                  src={imageSrc}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 640px) 76px, (max-width: 1024px) 128px, 144px"
                  className="object-cover"
                  priority={isPriority}
                  quality={isMobile ? 70 : 80}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5 md:from-black/15" />

                {item.testimonial && <MobileTestimonialOverlay item={item.testimonial} />}
              </div>

              {item.testimonial && (
                <DesktopTestimonialCard
                  item={item.testimonial}
                  align={item.testimonialAlign ?? "left"}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="hero-glow absolute left-1/2 top-[24%] z-[1] h-48 w-[85vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/10 blur-[70px] dark:bg-emerald-500/5 md:top-[28%] md:h-72 md:w-[min(640px,92vw)] md:blur-[90px]" />
    </div>
  );
}

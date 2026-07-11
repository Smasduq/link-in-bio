"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import "../../styles/finale-cta.css";

const FAQ_ITEMS = [
  {
    question: "Is LinkBio free?",
    answer:
      "Yes. You can create your page for free and upgrade whenever you need more customization and analytics.",
  },
  {
    question: "Can I customize my page?",
    answer:
      "Absolutely. Personalize colors, links, themes, and layouts to match your brand.",
  },
  {
    question: "Can I track clicks?",
    answer:
      "Yes. LinkBio provides analytics so you can understand how visitors interact with your links.",
  },
  {
    question: "How long does setup take?",
    answer: "Less than one minute. Create your account, add your links, and publish instantly.",
  },
] as const;

const TRUST = ["Free forever", "Takes less than 30 seconds", "No credit card"] as const;

export function FinalCtaFaqSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [openIndex, setOpenIndex] = useState(0);
  const baseId = useId();

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCtaVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "120px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const toggleFaq = useCallback((index: number) => {
    setOpenIndex((cur) => (cur === index ? -1 : index));
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`finale${ctaVisible ? " finale--cta-visible" : ""}`}
      aria-labelledby="finale-heading"
    >
      {/* Cinematic background — image via CSS for instant responsive src, no JS swap */}
      <div className="finale__bg" aria-hidden>
        <div className="finale__bg-zoom" />
        <div className="finale__overlay" />
        <div className="finale__glow finale__glow--1" />
        <div className="finale__glow finale__glow--2" />
      </div>

      {/* Center CTA */}
      <div className="finale__content">
        <div className="finale__cta-block">
          <h2 id="finale-heading" className="finale__headline">
            Every creator deserves one place that tells their story.
          </h2>
          <p className="finale__subheading">
            Build a beautiful page that brings together your social links, portfolio, videos, music,
            products, and everything that makes you unique.
          </p>

          <div className="finale__actions">
            <Link href="/sign-up" className="finale__btn finale__btn--primary">
              Create Your Free Page
            </Link>
            <Link href="/sign-up" className="finale__btn finale__btn--secondary">
              Explore Templates
            </Link>
          </div>

          <ul className="finale__trust">
            {TRUST.map((item) => (
              <li key={item} className="finale__trust-item">
                <span className="finale__trust-check" aria-hidden>✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* FAQ below CTA */}
        <div className="finale__faq">
          <p className="finale__faq-label">Common questions</p>
          <div className="finale__faq-list" role="region" aria-label="Frequently asked questions">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openIndex === index;
              const panelId = `${baseId}-panel-${index}`;
              const buttonId = `${baseId}-btn-${index}`;

              return (
                <article
                  key={item.question}
                  className={`finale__faq-card${isOpen ? " finale__faq-card--open" : ""}`}
                >
                  <h3 className="finale__faq-question">
                    <button
                      id={buttonId}
                      type="button"
                      className="finale__faq-trigger"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggleFaq(index)}
                    >
                      <span>{item.question}</span>
                      <span className="finale__faq-icon" aria-hidden />
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    aria-hidden={!isOpen}
                    className="finale__faq-panel"
                  >
                    <div className="finale__faq-panel-inner">
                      <p>{item.answer}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fade into footer */}
      <div className="finale__footer-bridge" aria-hidden />
    </section>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { SpatialNetworkBackground } from "@/components/background/SpatialNetworkBackground";
import { useThemeContext } from "@/contexts/ThemeContext";
import { ArrowRight, Sparkles } from "lucide-react";

interface AboutContent {
  hero: {
    title: string;
    subtitle?: string;
    description: string;
  };
  sections: Array<{
    id: string;
    title: string;
    tagline: string;
    content: string;
    highlights: string[];
    image: string;
  }>;
  cta: {
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  };
}

export function AboutView() {
  const { colors, animatedBackground } = useThemeContext();
  const [content, setContent] = useState<AboutContent | null>(null);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    new Set(),
  );
  const [scrollY, setScrollY] = useState(0);

  // Load content from backend API
  useEffect(() => {
    fetch("/api/config/about")
      .then((res) => res.json())
      .then((data) => setContent(data))
      .catch((err) => console.error("Failed to load about content:", err));
  }, []);

  // Scroll tracking for parallax and blur effects
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target) {
        setScrollY(target.scrollTop);
      }
    };

    const scrollContainer = document.querySelector(".about-scroll-container");
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
      return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }
  }, [content]);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -100px 0px" },
    );

    document
      .querySelectorAll("[data-section]")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [content]);

  if (!content) {
    return (
      <div className="relative w-full h-full bg-[var(--color-background-1)] dark:bg-[var(--color-background-1)] flex items-center justify-center">
        <SpatialNetworkBackground
          particleCount={animatedBackground.particleCount}
          connectionDistance={animatedBackground.connectionDistance}
          primaryColor={colors.animatedBgColor}
          secondaryColor={colors.animatedBgColor}
          particleOpacity={animatedBackground.particleOpacity}
          lineOpacity={animatedBackground.lineOpacity}
          particleSize={animatedBackground.particleSize}
          lineWidth={animatedBackground.lineWidth}
          animationSpeed={animatedBackground.animationSpeed}
        />
        <div className="relative text-[var(--color-text-muted)]">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-[var(--color-background-1)] dark:bg-[var(--color-background-1)]">
      {/* Three.js Spatial Network Background */}
      <SpatialNetworkBackground
        particleCount={animatedBackground.particleCount}
        connectionDistance={animatedBackground.connectionDistance}
        primaryColor={colors.animatedBgColor}
        secondaryColor={colors.animatedBgColor}
        particleOpacity={animatedBackground.particleOpacity}
        lineOpacity={animatedBackground.lineOpacity}
        particleSize={animatedBackground.particleSize}
        lineWidth={animatedBackground.lineWidth}
        animationSpeed={animatedBackground.animationSpeed}
      />

      {/* Content */}
      <div className="relative h-full overflow-y-auto scroll-smooth about-scroll-container">
        {/* Sticky Video Background with Blur Effect */}
        <div className="sticky top-0 w-full h-screen overflow-hidden bg-black z-0">
          <video
            className="w-full h-full object-cover transition-all duration-300"
            style={{
              filter: `blur(${Math.min(scrollY / 20, 20)}px)`,
              opacity: Math.max(1 - scrollY / 600, 0.3),
              transform: `scale(${1 + scrollY / 2000})`,
            }}
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/videos/about_video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Gradient overlay that intensifies on scroll */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black transition-opacity duration-300"
            style={{
              opacity: Math.min(scrollY / 200, 0.8),
            }}
          />

          {/* Hero text - Floats in from right, fades and moves on scroll */}
          <div
            className="absolute top-8 md:top-16 right-8 md:right-16 max-w-xl transition-all duration-500 animate-float-in-right"
            style={{
              opacity: Math.max(1 - scrollY / 200, 0),
              transform: `translateY(${scrollY / 2}px)`,
              visibility: scrollY > 250 ? "hidden" : "visible",
            }}
          >
            <div className="border-l-4 border-[var(--color-accent-primary)] pl-6 py-4 bg-white/50 backdrop-blur-sm rounded-r-xl shadow-2xl">
              <h1 className="text-3xl md:text-5xl font-bold text-[var(--color-primary-navy)] mb-3 leading-tight">
                {content.hero.title}
              </h1>
              <p
                className="text-base md:text-lg text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: content.hero.description }}
              />
            </div>
          </div>
        </div>

        {/* Rest of Content - Scrolls over the video with backdrop */}
        <div className="relative z-10">
          <div
            className="max-w-7xl mx-auto px-6 md:px-8 py-16 md:py-24 bg-[var(--color-background-1)]/95 backdrop-blur-xl rounded-t-3xl shadow-2xl"
            style={{
              transform: `translateY(${-scrollY / 10}px)`,
            }}
          >
            {/* Content Sections */}
            <div className="space-y-32">
              {content.sections.map((section, index) => {
                const isVisible = visibleSections.has(section.id);
                const isEven = index % 2 === 0;

                return (
                  <div
                    key={section.id}
                    id={section.id}
                    data-section
                    className={`grid md:grid-cols-2 gap-12 md:gap-16 items-center transition-all duration-1000 ${
                      isVisible
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-12"
                    } ${isEven ? "" : "md:grid-flow-dense"}`}
                  >
                    {/* Text Content */}
                    <div
                      className={`${isEven ? "" : "md:col-start-2"} space-y-6`}
                    >
                      <div className="inline-block px-3 py-1 bg-[var(--color-accent-primary)]/10 rounded-full">
                        <span className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                          {section.tagline}
                        </span>
                      </div>

                      <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-heading)] leading-tight">
                        {section.title}
                      </h2>

                      <p className="text-lg text-[var(--color-text-primary)] leading-relaxed">
                        {section.content}
                      </p>

                      {/* Highlights */}
                      <ul className="space-y-3 mt-6">
                        {section.highlights.map((highlight, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-3 text-[var(--color-text-primary)]"
                            style={{
                              animation: isVisible
                                ? `slide-in 0.5s ease-out ${idx * 0.1}s both`
                                : "none",
                            }}
                          >
                            <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Image/Visual */}
                    <div
                      className={`${isEven ? "" : "md:col-start-1 md:row-start-1"}`}
                    >
                      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[var(--color-background-1)]/95 backdrop-blur-xl shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 group">
                        {/* Image */}
                        <img
                          src={section.image}
                          alt={section.title}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA Section */}
            <div className="mt-32 text-center">
              <div className="max-w-3xl mx-auto p-12 md:p-16 bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-primary)]/80 rounded-3xl shadow-2xl">
                <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-white)] mb-4">
                  {content.cta.title}
                </h2>
                <p className="text-lg text-[var(--color-white)]/90 mb-8">
                  {content.cta.description}
                </p>
                <a
                  href={content.cta.buttonLink}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--color-white)] text-[var(--color-accent-primary)] font-semibold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
                >
                  {content.cta.buttonText}
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

            {/* Bottom Spacing */}
            <div className="h-16" />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes float-in-right {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        .animate-float-in-right {
          animation: float-in-right 2s cubic-bezier(0.34, 1.56, 0.64, 1)
            forwards;
        }
      `}</style>
    </div>
  );
}

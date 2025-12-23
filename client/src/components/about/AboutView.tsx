
import React, { useState, useEffect } from "react";
import { SpatialNetworkBackground } from "@/components/background/SpatialNetworkBackground";
import { useThemeContext } from "@/contexts/ThemeContext";
import { ArrowRight } from "lucide-react";

export function AboutView() {
  const { colors, animatedBackground } = useThemeContext();
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    new Set(),
  );
  const [scrollY, setScrollY] = useState(0);

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
  }, []);

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
  }, []);

  const isVisible = (id: string) => visibleSections.has(id);

  return (
    <div className="relative w-full overflow-hidden bg-[var(--color-background)] -mt-[var(--header-height)]" style={{ height: 'calc(100% + var(--header-height))' }}>
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
            className="absolute top-24 md:top-32 right-8 md:right-16 max-w-xl transition-all duration-500 animate-float-in-right"
            style={{
              opacity: Math.max(1 - scrollY / 200, 0),
              transform: `translateY(${scrollY / 2}px)`,
              visibility: scrollY > 250 ? "hidden" : "visible",
            }}
          >
            <div className="px-6 py-4 bg-white/85 backdrop-blur-xl rounded-xl shadow-2xl">
              <h1 className="text-3xl md:text-5xl font-bold text-[var(--color-text-heading)] mb-3 leading-tight">
                Databricks: The Data Intelligence Platform
              </h1>
              <p className="text-base md:text-lg text-[var(--color-text-primary)] leading-relaxed">
                Unified Data & AI capabilities.
                <br /><br />
                Databricks offers a unified platform for data, analytics and AI.
                <br /><br />
                With the Data Intelligence Platform, Databricks democratizes insights to everyone in an organization. Built on an open lakehouse architecture, the Data Intelligence Platform provides a unified foundation for all data and governance, combined with AI models tuned to an organization&apos;s unique characteristics.
              </p>
            </div>
          </div>
        </div>

        {/* Rest of Content - Scrolls over the video with backdrop */}
        <div className="relative z-10">
          <div
            className="max-w-7xl mx-auto px-6 md:px-8 py-16 md:py-24 bg-white/70 backdrop-blur-xl rounded-t-3xl shadow-2xl"
            style={{
              transform: `translateY(${-scrollY / 10}px)`,
            }}
          >
            {/* Content Sections */}
            <div className="space-y-32">

              {/* Section 1: Building the data foundations */}
              <div
                id="foundations"
                data-section
                className={`grid md:grid-cols-2 gap-12 md:gap-16 items-center transition-all duration-1000 ${
                  isVisible("foundations") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
              >
                <div className="space-y-6">
                  <div className="inline-block px-3 py-1 bg-[var(--color-accent-primary)]/10 rounded-full">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                      Unified Data & AI Platform
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-heading)] leading-tight">
                    Building the data foundations
                  </h2>
                  <p className="text-lg text-[var(--color-text-primary)] leading-relaxed">
                    Unlocking AI power starts by setting up the right foundations and making your data AI-ready. This means ingesting all the relevant data into the unified data platform, from various sources (files, operational databases, APIs, etc.), and processing it into curated data products, using Databricks capabilities:
                  </p>
                  <ul className="space-y-3 mt-6">
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Unity Catalog for centralized governance</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Ingestion, processing & orchestration pipelines with Lakeflow</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Advanced data warehousing with DBSQL</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
                    <img src="/images/img1.png" alt="Building the data foundations" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>

              {/* Section 2: Unlocking value at every level */}
              <div
                id="analytics"
                data-section
                className={`grid md:grid-cols-2 gap-12 md:gap-16 items-center transition-all duration-1000 md:grid-flow-dense ${
                  isVisible("analytics") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
              >
                <div className="md:col-start-2 space-y-6">
                  <div className="inline-block px-3 py-1 bg-[var(--color-accent-primary)]/10 rounded-full">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                      Descriptive and predictive intelligence
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-heading)] leading-tight">
                    Unlocking value at every level
                  </h2>
                  <p className="text-lg text-[var(--color-text-primary)] leading-relaxed">
                    Use the prepared data to build advanced descriptive analytics (what happened), as well predictive ML models and advanced AI agents, using tools built on top of your data (Bring the AI to your data, not the other way around).
                  </p>
                  <ul className="space-y-3 mt-6">
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Dashboards & advanced queries (what happened)</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Machine Learning Models (what will happen)</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>AI Agents (root cause, how to respond, etc.)</span>
                    </li>
                  </ul>
                </div>
                <div className="md:col-start-1 md:row-start-1">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
                    <img src="/images/img2.png" alt="Unlocking value at every level" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>

              {/* Section 3: The Databricks Advantage */}
              <div
                id="databricks-architecture"
                data-section
                className={`grid md:grid-cols-2 gap-12 md:gap-16 items-center transition-all duration-1000 ${
                  isVisible("databricks-architecture") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
              >
                <div className="space-y-6">
                  <div className="inline-block px-3 py-1 bg-[var(--color-accent-primary)]/10 rounded-full">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                      Production grade AI
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-heading)] leading-tight">
                    The Databricks Advantage
                  </h2>
                  <p className="text-lg text-[var(--color-text-primary)] leading-relaxed">
                    Databricks provides the foundational infrastructure for building production-grade AI applications. From data ingestion to model serving, everything runs on a single, governed platform that scales with your needs.
                  </p>
                  <ul className="space-y-3 mt-6">
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Agent Bricks: the fastest way to build agents</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>MLflow for experiment tracking and quality monitoring</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Model serving with guardrails (AI Gateway)</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Unity Catalog for governance and security</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
                    <img src="/images/img3.png" alt="The Databricks Advantage" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>

              {/* Section 4: Power AI with tools */}
              <div
                id="use-cases"
                data-section
                className={`grid md:grid-cols-2 gap-12 md:gap-16 items-center transition-all duration-1000 md:grid-flow-dense ${
                  isVisible("use-cases") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
              >
                <div className="md:col-start-2 space-y-6">
                  <div className="inline-block px-3 py-1 bg-[var(--color-accent-primary)]/10 rounded-full">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                      Agent patterns
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-heading)] leading-tight">
                    Power AI with tools
                  </h2>
                  <p className="text-lg text-[var(--color-text-primary)] leading-relaxed">
                    From retrieving relevant knowledge from PDFs to querying databases and APIs, tools are the key to getting more operational value from your AI agents.
                  </p>
                  <ul className="space-y-3 mt-6">
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Get context from text corpus (RAG)</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Query tables (text-to-sql)</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Combine different tools (multi-tool agent)</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Combine and orchestrate different agents</span>
                    </li>
                  </ul>
                </div>
                <div className="md:col-start-1 md:row-start-1">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
                    <img src="/images/img4.png" alt="Power AI with tools" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>

            </div>

            {/* CTA Section */}
            <div className="mt-32 text-center">
              <div className="max-w-3xl mx-auto p-12 md:p-16 bg-[var(--color-accent-primary)] rounded-3xl shadow-xl">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Ready to Build Your AI Future?
                </h2>
                <p className="text-lg text-white/90 mb-8">
                  Explore tools and start creating intelligent agents on Databricks.
                </p>
                <a
                  href="/tools"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[var(--color-accent-primary)] font-semibold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
                >
                  Explore Tools
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

            {/* Bottom Spacing */}
            <div className="h-16" />
          </div>
        </div>
      </div>

      <style>{`
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

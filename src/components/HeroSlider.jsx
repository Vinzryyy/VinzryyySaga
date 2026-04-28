import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { SITE_CONFIG } from "../config/siteConfig";

function HeroSlider() {
  const slides = SITE_CONFIG.hero.slides;
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (paused) return;
    timeoutRef.current = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => clearTimeout(timeoutRef.current);
  }, [current, paused, slides.length]);

  return (
    <section
      id="home"
      className="relative h-[100svh] w-full overflow-hidden bg-black"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {slides.map((slide, index) => {
        const active = index === current;

        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out
              ${active ? "opacity-100 z-10" : "opacity-0 z-0"}
            `}
          >
            {/* Cinematic Zoom */}
            <div className="absolute inset-0 scale-110">
              <img
                src={slide.image}
                alt={slide.title}
                className={`
                  h-full w-full object-cover
                  transition-transform duration-[10000ms] ease-out
                  ${active ? "scale-100 translate-y-0" : "scale-125 -translate-y-10"}
                `}
              />
            </div>

            {/* Premium Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
          </div>
        );
      })}

      {/* Editorial Caption */}
      <div className="relative z-20 flex h-full items-center px-10 md:px-24">
        <div className="max-w-[90%] md:max-w-[700px]">
          <div className="inline-block px-4 py-1.5 bg-[color:var(--retro-burgundy)] text-white text-[10px] font-black uppercase tracking-[0.3em] mb-6 animate-[fadeUp_1s_ease-out]">
            Premium Fan Collection
          </div>
          
          <h1
            key={slides[current].title}
            className="
              font-header text-6xl md:text-9xl font-black text-white
              leading-[0.85] tracking-tighter
              animate-[fadeUp_0.8s_ease-out]
            "
          >
            {slides[current].title}<br/>
            <span className="text-[color:var(--retro-burgundy)]">{slides[current].subtitle}</span>
          </h1>

          <p
            key={slides[current].meta}
            className="
              mt-8 text-sm md:text-lg tracking-widest text-white/60 font-medium uppercase
              animate-[fadeUp_1s_ease-out]
              flex items-center gap-4
            "
          >
            <span className="w-12 h-[1px] bg-white/30" />
            {slides[current].meta}
          </p>
          
          <div className="mt-12 flex items-center gap-8 animate-[fadeUp_1.2s_ease-out]">
            <Link to="/gallery" className="group flex items-center gap-3 text-white font-bold text-sm tracking-widest uppercase hover:text-[color:var(--retro-burgundy)] transition-colors">
              Enter Gallery
              <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:border-[color:var(--retro-burgundy)] transition-colors">
                <i className="ri-arrow-right-down-line" />
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Minimal Progress Navigation */}
      <div className="absolute bottom-12 left-10 md:left-24 z-20 flex flex-col gap-6">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className="group relative flex items-center gap-4"
          >
            <span className={`text-[10px] font-black tracking-tighter transition-colors ${index === current ? "text-white" : "text-white/20"}`}>
              0{index + 1}
            </span>
            <div className={`h-[2px] transition-all duration-500 ${index === current ? "w-16 bg-[color:var(--retro-burgundy)]" : "w-8 bg-white/10 group-hover:w-12"}`} />
          </button>
        ))}
      </div>
      
      {/* Vertical Side Text */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 z-20 hidden lg:block">
        <div className="rotate-90 origin-right text-[10px] font-black tracking-[0.5em] text-white/20 uppercase whitespace-nowrap">
          {SITE_CONFIG.branding.name} | Mermaid Archive | {new Date().getFullYear()}
        </div>
      </div>
    </section>
  );
}

export default HeroSlider;

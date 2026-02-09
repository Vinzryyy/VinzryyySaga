import { useEffect, useState, useRef } from "react";

const slides = [
  {
    id: 1,
    image: "/src/assets/Slider4.jpeg",
    title: "KLP48 Teater Malaysia",
    meta: "Malaysia • 2025",
  },
  {
    id: 2,
    image: "/src/assets/Slider2.jpeg",
    title: "Tanjong Beach",
    meta: "Singapore • 2025",
  },
  {
    id: 3,
    image: "/src/assets/Slider3.jpeg",
    title: "Motion Imei 2025",
    meta: "Jakarta • 2025",
  },
];

function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (paused) return;

    timeoutRef.current = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5500);

    return () => clearTimeout(timeoutRef.current);
  }, [current, paused]);

  return (
    <section
      id="home"
      className="relative h-[100svh] w-full overflow-hidden pt-24 md:pt-32"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {slides.map((slide, index) => {
        const active = index === current;

        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-[1400ms] ease-out
              ${active ? "opacity-100" : "opacity-0"}
            `}
          >
            {/* Image with subtle zoom */}
            <img
              src={slide.image}
              alt={slide.title}
              className={`
                h-full w-full object-cover
                transition-transform duration-[7000ms] ease-out
                ${active ? "scale-105" : "scale-100"}
              `}
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
          </div>
        );
      })}

      {/* Caption */}
      <div className="relative z-10 flex h-full items-end px-5 pb-16 md:px-16 md:pb-24">
        <div className="max-w-[95%] md:max-w-[60%]">
          <h1
            key={slides[current].title}
            className="
              font-header text-3xl font-extrabold text-white
              sm:text-4xl md:text-6xl
              animate-[fadeUp_0.8s_ease-out]
            "
          >
            {slides[current].title}
          </h1>

          <p
            key={slides[current].meta}
            className="
              mt-2 text-sm tracking-wide text-white/80
              md:text-base
              animate-[fadeUp_1s_ease-out]
            "
          >
            {slides[current].meta}
          </p>
        </div>
      </div>

      {/* Progress Indicators */}
      <div className="absolute bottom-6 right-5 z-10 flex gap-3 md:bottom-10 md:right-16">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className="relative h-1.5 w-10 overflow-hidden rounded-full bg-white/30"
            aria-label={`Go to slide ${index + 1}`}
          >
            {index === current && (
              <span className="absolute inset-0 bg-white animate-[progress_5.5s_linear]" />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

export default HeroSlider;

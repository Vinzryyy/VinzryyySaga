import { useEffect, useState } from "react";

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navItems = ["home", "2024", "2025", "2026"];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className="fixed top-0 z-50 w-full">
      {/* Gradient glass background */}
      <div
        className={`
          pointer-events-none absolute inset-0
          bg-gradient-to-b
          from-black/60
          via-black/30
          to-transparent
          backdrop-blur-sm
          transition-opacity duration-300
          ${scrolled ? "opacity-100" : "opacity-90"}
        `}
      />

      {/* Navbar content */}
      <div className="relative mx-auto flex max-w-[1200px] items-center px-4 py-4 md:py-5">
        
        {/* Logo */}
        <img
          src="/logo.png"
          alt="logo"
          className="w-[90px] md:w-[120px]"
        />

        <div className="flex-1" />

        {/* Desktop Menu */}
        <ul className="hidden items-center gap-10 md:flex">
          {navItems.map((item) => (
            <li key={item}>
              <a
                href={`#${item}`}
                className="
                  font-semibold tracking-wide
                  text-white/90
                  hover:text-white
                  transition-colors
                "
              >
                {item === "home" ? "Home" : item}
              </a>
            </li>
          ))}
        </ul>

        {/* Mobile Menu Button */}
        <button
          className="ml-2 text-3xl text-white md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <i className={open ? "ri-close-line" : "ri-menu-3-line"} />
        </button>
      </div>

      {/* Mobile Menu */}
      <ul
        className={`
          fixed left-0 top-[68px] z-40 w-full
          bg-black/80 backdrop-blur-md
          flex flex-col items-center gap-8 py-10
          text-lg font-semibold text-white
          transition-transform duration-500 md:hidden
          ${open ? "translate-y-0" : "-translate-y-[120%]"}
        `}
        onClick={() => setOpen(false)}
      >
        {navItems.map((item) => (
          <li key={item}>
            <a
              href={`#${item}`}
              className="hover:opacity-80 transition-opacity"
            >
              {item === "home" ? "Home" : item}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Navbar;

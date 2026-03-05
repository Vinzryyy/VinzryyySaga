import { useEffect, useState } from "react";

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navItems = [
    { label: "Home", hash: "home" },
    { label: "Gallery", hash: "gallery" },
    { label: "2024", hash: "2024" },
    { label: "2025", hash: "2025" },
    { label: "2026", hash: "2026" },
    { label: "About", hash: "about" },
    { label: "Contact", hash: "contact" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (hash) => {
    window.location.hash = hash;
    setOpen(false);
  };

  return (
    <nav className="fixed top-0 z-50 w-full">
      {/* Gradient glass background - Warm Pastel */}
      <div
        className={`
          pointer-events-none absolute inset-0
          bg-gradient-to-b
          from-white/80
          via-white/50
          to-transparent
          backdrop-blur-md
          transition-opacity duration-300
          ${scrolled ? "opacity-100 shadow-sm" : "opacity-90"}
        `}
      />

      {/* Navbar content */}
      <div className="relative mx-auto flex max-w-[1200px] items-center px-4 py-4 md:py-5">

        {/* Logo */}
        <a
          href="#home"
          onClick={(e) => { e.preventDefault(); handleNavClick("home"); }}
          className="flex items-center gap-2"
        >
          <img
            src="/logo.png"
            alt="VinzryyySaga"
            className="w-[90px] md:w-[120px]"
          />
        </a>

        <div className="flex-1" />

        {/* Desktop Menu */}
        <ul className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <li key={item.hash}>
              <a
                href={`#${item.hash}`}
                onClick={(e) => { e.preventDefault(); handleNavClick(item.hash); }}
                className="
                  font-medium tracking-wide
                  text-[color:var(--color-text-primary)]
                  hover:text-[color:var(--color-accent)]
                  transition-colors
                "
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Mobile Menu Button */}
        <button
          className="text-2xl text-[color:var(--color-text-primary)] md:hidden"
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
          bg-white/95 backdrop-blur-md
          flex flex-col items-center gap-6 py-8
          text-lg font-medium text-[color:var(--color-text-primary)]
          transition-transform duration-500 md:hidden
          ${open ? "translate-y-0" : "-translate-y-[120%]"}
        `}
        onClick={() => setOpen(false)}
      >
        {navItems.map((item) => (
          <li key={item.hash}>
            <a
              href={`#${item.hash}`}
              onClick={(e) => { e.preventDefault(); handleNavClick(item.hash); }}
              className="hover:text-[color:var(--color-accent)] transition-colors"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Navbar;

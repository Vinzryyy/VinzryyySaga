import { useEffect, useState } from "react";
import { SITE_CONFIG } from "../config/siteConfig";
import { useGallery } from "../context";

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { eras } = useGallery();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (hash) => {
    window.location.hash = hash;
    setOpen(false);
  };

  const navItems = SITE_CONFIG.navigation.main;
  const currentHash = window.location.hash.replace("#", "") || "home";

  return (
    <nav className={`fixed top-0 z-[100] w-full transition-all duration-500 ${scrolled ? "py-3" : "py-6"}`}>
      <div className="container-custom">
        <div
          className={`
            relative flex items-center justify-between px-6 py-3 rounded-full transition-all duration-500
            ${scrolled ? "bg-white/80 backdrop-blur-2xl shadow-[0_8px_32px_rgba(61,52,43,0.15)] border border-white/40" : "bg-transparent"}
          `}
        >
          {/* Logo Branding */}
          <a
            href="#home"
            onClick={(e) => { e.preventDefault(); handleNavClick("home"); }}
            className="group flex items-center gap-2"
          >
            <div className="flex flex-col">
              <span className={`font-header text-xl font-black tracking-tighter transition-colors ${scrolled ? "text-[color:var(--retro-brown-dark)]" : "text-white"}`}>
                {SITE_CONFIG.branding.fullName}<span className="text-[color:var(--retro-burgundy)]">.</span>
              </span>
              <span className={`text-[8px] font-black uppercase tracking-[0.4em] -mt-1 opacity-60 ${scrolled ? "text-[color:var(--retro-brown-dark)]" : "text-white"}`}>
                {SITE_CONFIG.branding.tagline}
              </span>
            </div>
          </a>

          {/* Desktop Menu */}
          <ul className="hidden items-center gap-2 lg:flex">
            {navItems.map((item) => (
              <li key={item.hash}>
                <a
                  href={`#${item.hash}`}
                  onClick={(e) => { e.preventDefault(); handleNavClick(item.hash); }}
                  className={`
                    relative px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 rounded-full
                    ${currentHash === item.hash 
                      ? (scrolled ? "bg-[color:var(--retro-burgundy)] text-white shadow-lg" : "bg-white text-black shadow-xl") 
                      : (scrolled ? "text-[color:var(--retro-text-secondary)] hover:bg-[color:var(--retro-burgundy)]/10" : "text-white/70 hover:text-white hover:bg-white/10")}
                  `}
                >
                  {item.label}
                </a>
              </li>
            ))}
            
            <div className={`h-4 w-[1px] mx-2 ${scrolled ? "bg-black/10" : "bg-white/20"}`} />
            
            <div className="flex gap-1">
              {eras.map(era => (
                <a 
                  key={era.id}
                  href={`#${era.id}`}
                  onClick={(e) => { e.preventDefault(); handleNavClick(era.id); }}
                  className={`
                    px-4 h-8 flex items-center justify-center rounded-full transition-all text-[9px] font-black uppercase tracking-widest
                    ${currentHash === era.id
                      ? "bg-[color:var(--retro-burgundy)] text-white"
                      : (scrolled ? "text-black/30 hover:bg-black/5 hover:text-black" : "text-white/30 hover:bg-white/10 hover:text-white")}
                  `}
                >
                  {era.label}
                </a>
              ))}
            </div>
          </ul>

          {/* Mobile Actions */}
          <div className="flex items-center gap-4 lg:hidden">
            <button
              className={`text-2xl transition-colors ${scrolled ? "text-[color:var(--retro-brown-dark)]" : "text-white"}`}
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              <i className={open ? "ri-close-fill" : "ri-menu-4-fill"} />
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Mobile Menu */}
      <div
        className={`
          fixed inset-0 z-[-1] bg-[color:var(--retro-brown-dark)] transition-all duration-700 ease-[cubic-bezier(0.85,0,0.15,1)]
          flex flex-col items-center justify-center
          ${open ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}
        `}
      >
        <div className="absolute top-0 left-0 w-full p-20 opacity-10 pointer-events-none">
          <span className="text-[12rem] font-black text-white leading-none">FIGHT</span>
        </div>
        
        <ul className="relative z-10 flex flex-col items-center gap-8">
          {navItems.map((item) => (
            <li key={item.hash}>
              <a
                href={`#${item.hash}`}
                onClick={(e) => { e.preventDefault(); handleNavClick(item.hash); }}
                className="font-header text-5xl font-black text-white hover:text-[color:var(--retro-burgundy)] transition-colors tracking-tighter"
              >
                {item.label}
              </a>
            </li>
          ))}
          
          <div className="flex flex-wrap justify-center gap-4 mt-12 px-10">
            {eras.map(era => (
              <a 
                key={era.id}
                href={`#${era.id}`}
                onClick={(e) => { e.preventDefault(); handleNavClick(era.id); }}
                className="px-6 py-3 rounded-full border border-white/20 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
              >
                {era.label}
              </a>
            ))}
          </div>
        </ul>

        <div className="absolute bottom-10 text-center">
          <p className="text-white/40 text-[10px] uppercase tracking-[0.5em]">{SITE_CONFIG.branding.name} | {SITE_CONFIG.branding.tagline}</p>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

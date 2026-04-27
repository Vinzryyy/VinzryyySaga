import { useEffect, useMemo, useRef, useState } from "react";
import { SITE_CONFIG } from "../config/siteConfig";
import { useGallery } from "../context";

const getHash = () =>
  typeof window === "undefined"
    ? ""
    : window.location.hash.replace("#", "").toLowerCase() || "home";

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeHash, setActiveHash] = useState(() => getHash());
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);
  const { eras } = useGallery();

  // Inject era items as children of the Archive dropdown
  const navItems = useMemo(() => {
    return SITE_CONFIG.navigation.main.map((item) => {
      if (item.label === "Archive" && Array.isArray(item.children)) {
        return {
          ...item,
          children: [
            ...item.children,
            ...eras.map((era) => ({
              label: era.label,
              hash: String(era.id),
              description: `Frame tahun ${era.id}`,
              icon: "ri-calendar-line",
            })),
          ],
        };
      }
      return item;
    });
  }, [eras]);

  // Scroll state + progress bar
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(1, y / docHeight) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Active hash sync
  useEffect(() => {
    const sync = () => setActiveHash(getHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Click-away to close dropdowns
  useEffect(() => {
    if (!openDropdown) return undefined;
    const onDocClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    const onEsc = (event) => {
      if (event.key === "Escape") setOpenDropdown(null);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [openDropdown]);

  const navigateTo = (hash) => {
    const target = hash || "home";
    const current = window.location.hash.replace("#", "").toLowerCase();
    if (current === target) {
      const el = document.getElementById(target);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      window.location.hash = target;
    }
    setOpen(false);
    setOpenDropdown(null);
  };

  const isItemActive = (item) => {
    if (item.hash && item.hash === activeHash) return true;
    if (Array.isArray(item.children)) {
      return item.children.some((child) => child.hash === activeHash);
    }
    return false;
  };

  const palette = scrolled
    ? {
        text: "text-[color:var(--retro-text-primary)]",
        textMuted: "text-[color:var(--retro-text-secondary)]",
        border: "border-[color:var(--retro-brown-dark)]/10",
        pill: "bg-white/85 backdrop-blur-2xl shadow-[0_8px_32px_rgba(61,52,43,0.12)] border-white/40",
        hoverBg: "hover:bg-[color:var(--retro-burgundy)]/10",
        accentText: "text-[color:var(--retro-burgundy)]",
      }
    : {
        text: "text-white",
        textMuted: "text-white/70",
        border: "border-white/15",
        pill: "bg-transparent border-transparent",
        hoverBg: "hover:bg-white/10",
        accentText: "text-white",
      };

  return (
    <>
      <nav
        className={`fixed top-0 z-[100] w-full transition-all duration-500 ${
          scrolled ? "py-3" : "py-5"
        }`}
      >
        <div className="container-custom">
          <div
            ref={dropdownRef}
            className={`relative flex items-center justify-between gap-4 px-5 py-2.5 rounded-full border transition-all duration-500 ${palette.pill}`}
          >
            {/* Logo */}
            <a
              href="#home"
              onClick={(event) => {
                event.preventDefault();
                navigateTo("home");
              }}
              className="group flex items-center gap-2 flex-shrink-0"
            >
              <div className="flex flex-col leading-none">
                <span className={`font-header text-xl font-black tracking-tighter ${palette.text}`}>
                  {SITE_CONFIG.branding.fullName}
                  <span className="text-[color:var(--retro-burgundy)]">.</span>
                </span>
                <span className={`text-[8px] font-black uppercase tracking-[0.4em] mt-0.5 opacity-60 ${palette.text}`}>
                  {SITE_CONFIG.branding.tagline}
                </span>
              </div>
            </a>

            {/* Desktop menu */}
            <ul className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                const active = isItemActive(item);
                const dropOpen = openDropdown === item.label;

                if (!hasChildren) {
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={() => navigateTo(item.hash)}
                        className={`
                          inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.18em] transition-all
                          ${active
                            ? "bg-[color:var(--retro-burgundy)] text-white shadow-md"
                            : `${palette.textMuted} ${palette.hoverBg} hover:${palette.text}`}
                        `}
                      >
                        {item.label}
                      </button>
                    </li>
                  );
                }

                return (
                  <li key={item.label} className="relative">
                    <button
                      type="button"
                      aria-expanded={dropOpen}
                      aria-haspopup="menu"
                      onClick={() =>
                        setOpenDropdown((current) => (current === item.label ? null : item.label))
                      }
                      className={`
                        inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.18em] transition-all
                        ${active || dropOpen
                          ? "bg-[color:var(--retro-burgundy)] text-white shadow-md"
                          : `${palette.textMuted} ${palette.hoverBg} hover:${palette.text}`}
                      `}
                    >
                      {item.label}
                      <i
                        className={`ri-arrow-down-s-line text-base transition-transform ${
                          dropOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {dropOpen && (
                      <div
                        role="menu"
                        className="absolute left-1/2 top-full mt-3 -translate-x-1/2 w-[320px] rounded-2xl bg-white shadow-[0_24px_64px_rgba(61,52,43,0.18)] border border-[color:var(--retro-brown-dark)]/10 p-2 origin-top animate-[fadeIn_0.18s_ease-out]"
                      >
                        {item.hash && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => navigateTo(item.hash)}
                            className="w-full flex items-center justify-between gap-3 px-3 py-2 mb-1 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-burgundy)]/5"
                          >
                            <span>Buka {item.label}</span>
                            <i className="ri-arrow-right-up-line text-base" />
                          </button>
                        )}
                        <div className="grid gap-1 max-h-[60vh] overflow-y-auto">
                          {item.children.map((child) => (
                            <button
                              key={`${item.label}-${child.hash}`}
                              type="button"
                              role="menuitem"
                              onClick={() => navigateTo(child.hash)}
                              className={`
                                group flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-colors
                                ${child.hash === activeHash
                                  ? "bg-[color:var(--retro-burgundy)]/10"
                                  : "hover:bg-[color:var(--retro-burgundy)]/5"}
                              `}
                            >
                              {child.icon && (
                                <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)] flex items-center justify-center group-hover:bg-[color:var(--retro-burgundy)] group-hover:text-white transition-colors">
                                  <i className={`${child.icon} text-base`} />
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-sm text-[color:var(--retro-text-primary)] leading-tight">
                                  {child.label}
                                </p>
                                {child.description && (
                                  <p className="text-xs text-[color:var(--color-text-muted)] mt-0.5 leading-snug">
                                    {child.description}
                                  </p>
                                )}
                              </div>
                              {child.hash === activeHash && (
                                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[color:var(--retro-burgundy)] mt-2" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Mobile hamburger */}
            <button
              type="button"
              className={`lg:hidden text-2xl ${palette.text} transition-colors`}
              onClick={() => setOpen((current) => !current)}
              aria-label={open ? "Tutup menu" : "Buka menu"}
              aria-expanded={open}
            >
              <i className={open ? "ri-close-fill" : "ri-menu-4-fill"} />
            </button>
          </div>
        </div>

        {/* Scroll progress bar */}
        {scrolled && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-transparent">
            <div
              className="h-full bg-[color:var(--retro-burgundy)]/70 transition-[width] duration-150 ease-out"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </nav>

      {/* Mobile menu — only mounted when open, slides in from the right */}
      {open && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[110] bg-[color:var(--retro-brown-dark)]/60 backdrop-blur-sm lg:hidden animate-[fadeIn_0.25s_ease-out]"
          />
          {/* Panel */}
          <aside
            className="fixed top-0 right-0 bottom-0 z-[120] w-[min(92vw,400px)] bg-[color:var(--retro-bg-primary)] shadow-2xl lg:hidden flex flex-col animate-[slideInRight_0.3s_ease-out]"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-[color:var(--retro-brown-dark)]/10">
              <span className="font-header text-lg font-black tracking-tighter text-[color:var(--retro-text-primary)]">
                {SITE_CONFIG.branding.fullName}
                <span className="text-[color:var(--retro-burgundy)]">.</span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup menu"
                className="w-9 h-9 rounded-full bg-[color:var(--retro-brown-dark)]/5 hover:bg-[color:var(--retro-brown-dark)]/10 flex items-center justify-center text-[color:var(--retro-text-primary)] text-xl"
              >
                <i className="ri-close-line" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-6">
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                  return (
                    <li key={item.label}>
                      {item.hash && (
                        <button
                          type="button"
                          onClick={() => navigateTo(item.hash)}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                            item.hash === activeHash
                              ? "bg-[color:var(--retro-burgundy)] text-white"
                              : "text-[color:var(--retro-text-primary)] hover:bg-[color:var(--retro-burgundy)]/5"
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            {item.icon && <i className={`${item.icon} text-lg opacity-70`} />}
                            <span className="font-header text-base font-black tracking-tight">
                              {item.label}
                            </span>
                          </span>
                          <i className="ri-arrow-right-line text-base opacity-50" />
                        </button>
                      )}
                      {!item.hash && (
                        <div className="px-4 py-3 flex items-center gap-3">
                          {item.icon && (
                            <i className={`${item.icon} text-lg text-[color:var(--retro-burgundy)]/70`} />
                          )}
                          <span className="font-header text-base font-black tracking-tight text-[color:var(--retro-text-primary)]">
                            {item.label}
                          </span>
                        </div>
                      )}
                      {hasChildren && (
                        <ul className="mt-1 ml-3 pl-3 border-l border-[color:var(--retro-brown-dark)]/10 space-y-1">
                          {item.children.map((child) => (
                            <li key={`m-${item.label}-${child.hash}`}>
                              <button
                                type="button"
                                onClick={() => navigateTo(child.hash)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                  child.hash === activeHash
                                    ? "bg-[color:var(--retro-burgundy)]/15 text-[color:var(--retro-burgundy)] font-bold"
                                    : "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--retro-burgundy)]/5 hover:text-[color:var(--retro-burgundy)]"
                                }`}
                              >
                                <p className="font-bold leading-tight">{child.label}</p>
                                {child.description && (
                                  <p className="text-xs text-[color:var(--color-text-muted)] mt-0.5">
                                    {child.description}
                                  </p>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>

            <footer className="px-6 py-5 border-t border-[color:var(--retro-brown-dark)]/10">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
                {SITE_CONFIG.branding.name} · {SITE_CONFIG.branding.tagline}
              </p>
            </footer>
          </aside>
        </>
      )}
    </>
  );
}

export default Navbar;

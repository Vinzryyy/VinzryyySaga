import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SITE_CONFIG } from "../config/siteConfig";
import { useGallery } from "../context";
import { hashToHref, hrefToActiveId } from "../utils/routes";

const NAVBAR_HIDDEN_KEY = 'navbar-hidden';

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const dropdownRef = useRef(null);
  const { eras } = useGallery();
  const location = useLocation();
  const navigate = useNavigate();
  // Hide/show navbar manual toggle, persist localStorage. Saat hidden,
  // navbar slide ke atas leaving small tab buat re-show.
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(NAVBAR_HIDDEN_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggleHidden = () => {
    setHidden((v) => {
      const next = !v;
      try {
        localStorage.setItem(NAVBAR_HIDDEN_KEY, next ? '1' : '0');
      } catch {
        /* storage blocked */
      }
      return next;
    });
  };
  // ArmeniacaTown routes default to navbar-hidden — peta UI udah punya
  // header sendiri (Keluar / Peta Kota / Ulangi gerbang) jadi nav global
  // cuma bikin clutter. User masih bisa re-open via ▾ menu tab.
  const isArmeniacaTownRoute = location.pathname.startsWith('/armeniacaTown');
  const prevWasTownRef = useRef(false);
  useEffect(() => {
    if (isArmeniacaTownRoute && !prevWasTownRef.current) {
      setHidden(true);
    }
    prevWasTownRef.current = isArmeniacaTownRoute;
  }, [isArmeniacaTownRoute]);
  const activeHash = useMemo(
    () => hrefToActiveId(location.pathname, location.hash),
    [location.pathname, location.hash]
  );

  // Inject era items as children of the Archive dropdown; also drop
  // any child whose availableFromIso hasn't been reached yet so the
  // Photo Frame entry (and any future scheduled entry) stays hidden
  // until launch. mountTimeMs is captured once via useState init so
  // navItems stays memoized across re-renders; if the page sits open
  // across a launch moment, a refresh reveals the entry.
  const [mountTimeMs] = useState(() => Date.now());
  const navItems = useMemo(() => {
    const isAvailable = (child) => {
      if (!child.availableFromIso) return true;
      const launch = new Date(child.availableFromIso).getTime();
      return !Number.isFinite(launch) || mountTimeMs >= launch;
    };
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
          ].filter(isAvailable),
        };
      }
      if (Array.isArray(item.children)) {
        return { ...item, children: item.children.filter(isAvailable) };
      }
      return item;
    });
  }, [eras, mountTimeMs]);

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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Auto-expand the section containing the active page when the mobile menu opens
  useEffect(() => {
    if (!open) return;
    const parent = navItems.find(
      (item) =>
        Array.isArray(item.children) &&
        item.children.some((child) => child.hash === activeHash)
    );
    setMobileExpanded(parent?.label ?? null);
  }, [open, activeHash, navItems]);

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
    // Sentinel hashes that re-open popup modals instead of navigating
    // to a route. Keeps siteConfig data-driven without special-case props.
    const popupEvents = {
      'photo-frame-popup': 'announcement:open',
      'videotron-popup': 'videotron:open',
    };
    if (hash in popupEvents) {
      window.dispatchEvent(new CustomEvent(popupEvents[hash]));
      setOpen(false);
      setOpenDropdown(null);
      return;
    }
    const href = hashToHref(hash);
    const currentHref = `${location.pathname}${location.hash}`;
    if (href === currentHref) {
      // Same target — re-scroll to the element (or top) instead of a no-op nav.
      const id = (location.hash || "").replace("#", "");
      const el = id ? document.getElementById(id) : null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      navigate(href);
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
      {/* Re-show tab — render saat navbar hidden. Small clickable strip
          di top-center. */}
      {hidden && (
        <button
          type="button"
          onClick={toggleHidden}
          className="fixed top-0 left-1/2 -translate-x-1/2 z-[101] px-4 py-1 rounded-b-lg bg-black/60 backdrop-blur-sm border-x border-b border-white/15 text-white/65 hover:text-white hover:bg-black/80 text-[10px] tracking-[0.3em] uppercase transition"
          aria-label="Tampilkan navbar"
          title="Tampilkan navbar"
        >
          ▾ menu
        </button>
      )}
      <nav
        className={`fixed top-0 z-[100] w-full transition-transform duration-300 ease-out ${
          scrolled ? "py-3" : "py-5"
        } ${hidden ? "-translate-y-full" : "translate-y-0"}`}
        style={{
          transitionProperty: 'transform, padding',
          transitionDuration: '300ms, 500ms',
        }}
      >
        <div className="container-custom">
          <div
            ref={dropdownRef}
            className={`relative flex items-center justify-between gap-4 px-5 py-2.5 rounded-full border transition-all duration-500 ${palette.pill}`}
          >
            {/* Logo — CSS mask renders the white wordmark in any color so it
                adapts to the scrolled (cream bg) vs transparent (dark hero)
                navbar states. The PNG provides the shape; backgroundColor
                provides the tint. */}
            <a
              href="/"
              onClick={(event) => {
                event.preventDefault();
                navigateTo("home");
              }}
              aria-label="Armeniaca — Home"
              className="group flex items-center gap-3 flex-shrink-0"
            >
              <div
                role="img"
                aria-label="Armeniaca wordmark"
                className="h-8 md:h-10 transition-colors duration-500"
                style={{
                  aspectRatio: "2481 / 943",
                  maskImage: "url(/logo-armeniaca.png)",
                  WebkitMaskImage: "url(/logo-armeniaca.png)",
                  maskSize: "contain",
                  WebkitMaskSize: "contain",
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                  maskPosition: "center",
                  WebkitMaskPosition: "center",
                  backgroundColor: scrolled
                    ? "var(--retro-text-primary)"
                    : "white",
                }}
              />
              <span
                className={`hidden md:inline-block text-[8px] font-black uppercase tracking-[0.4em] opacity-60 ${palette.text}`}
              >
                {SITE_CONFIG.branding.tagline}
              </span>
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

            {/* Hide navbar toggle — small button di kanan, sebelah
                hamburger. Klik → navbar slide up, re-show via top tab. */}
            <button
              type="button"
              onClick={toggleHidden}
              className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${palette.text} ${palette.hoverBg} transition`}
              aria-label="Sembunyikan navbar"
              title="Sembunyikan navbar"
            >
              <span className="text-[14px] leading-none">▴</span>
            </button>
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
                  const expanded = mobileExpanded === item.label;
                  const active = isItemActive(item);
                  return (
                    <li key={item.label}>
                      {hasChildren ? (
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() =>
                            setMobileExpanded((current) =>
                              current === item.label ? null : item.label
                            )
                          }
                          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                            active
                              ? "bg-[color:var(--retro-burgundy)] text-white"
                              : "text-[color:var(--retro-text-primary)] hover:bg-[color:var(--retro-burgundy)]/5"
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            {item.icon && (
                              <i
                                className={`${item.icon} text-lg ${
                                  active ? "opacity-90" : "opacity-70"
                                }`}
                              />
                            )}
                            <span className="font-header text-base font-black tracking-tight">
                              {item.label}
                            </span>
                          </span>
                          <i
                            className={`ri-arrow-down-s-line text-base transition-transform ${
                              expanded ? "rotate-180" : ""
                            } ${active ? "opacity-90" : "opacity-50"}`}
                          />
                        </button>
                      ) : (
                        item.hash && (
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
                        )
                      )}
                      {hasChildren && expanded && (
                        <ul className="mt-1 ml-3 pl-3 border-l border-[color:var(--retro-brown-dark)]/10 space-y-1 animate-[fadeIn_0.18s_ease-out]">
                          {item.hash && (
                            <li>
                              <button
                                type="button"
                                onClick={() => navigateTo(item.hash)}
                                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] hover:bg-[color:var(--retro-burgundy)]/5"
                              >
                                <span>Buka {item.label}</span>
                                <i className="ri-arrow-right-up-line text-base" />
                              </button>
                            </li>
                          )}
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

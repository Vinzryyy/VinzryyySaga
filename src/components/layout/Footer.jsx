/**
 * Footer Component
 * Site footer with navigation, social links, and copyright
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../../config/siteConfig';
import { useGallery } from '../../context';
import { hashToHref } from '../../utils/routes';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { eras } = useGallery();

  const socialLinks = [
    { name: 'Instagram', icon: 'ri-instagram-line', url: SITE_CONFIG.social.instagram },
    { name: 'Twitter', icon: 'ri-twitter-x-line', url: SITE_CONFIG.social.twitter },
  ].filter((item) => Boolean(item.url));

  // Derive footer page links from the same SITE_CONFIG source as the
  // navbar so adding/renaming a page only happens in one place. Pure-
  // dropdown parents (no own hash) fall back to their first child.
  const navigateLinks = SITE_CONFIG.navigation.main
    .map((item) => {
      const hash = item.hash || item.children?.[0]?.hash;
      if (!hash) return null;
      return { name: item.label, to: hashToHref(hash) };
    })
    .filter(Boolean);

  const eraLinks = eras.map((era) => ({
    name: era.label,
    to: `/gallery/${era.id}`,
  }));

  return (
    <footer className="relative overflow-hidden bg-[color:var(--retro-bg-secondary)] border-t border-[color:var(--retro-border)]">
      {/* Soft warm wash on top edge */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, var(--retro-gold) 50%, transparent)',
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-10">
          {/* Brand */}
          <div className="md:col-span-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[color:var(--retro-text-light)]">
              Arsip Visual · Est. 2024
            </p>
            <h2 className="font-header text-4xl md:text-5xl font-semibold text-[color:var(--retro-text-primary)] mt-3 leading-none">
              {SITE_CONFIG.branding.name}
              <span className="text-[color:var(--retro-burgundy)]">.</span>
            </h2>
            <p className="font-header italic text-[color:var(--retro-burgundy)] text-sm mt-2 tracking-wide">
              {SITE_CONFIG.branding.tagline}
            </p>

            <p className="text-[color:var(--retro-text-secondary)] text-sm leading-relaxed max-w-md mt-5">
              {SITE_CONFIG.footer.description}
            </p>

            {/* Social Links */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3 mt-7">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      group w-10 h-10 flex items-center justify-center
                      border border-[color:var(--retro-border)]
                      text-[color:var(--retro-text-secondary)]
                      rounded-full
                      transition-all duration-300
                      hover:border-[color:var(--retro-burgundy)]
                      hover:text-[color:var(--retro-burgundy)]
                      hover:-translate-y-0.5
                    "
                    aria-label={social.name}
                  >
                    <i className={`${social.icon} text-lg`} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Navigate */}
          <div className="md:col-span-3 md:pl-8 md:border-l md:border-[color:var(--retro-border)]/60">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[color:var(--retro-text-light)]">
              Navigate
            </p>
            <h4 className="font-header text-2xl font-semibold text-[color:var(--retro-text-primary)] mt-3 mb-5">
              Halaman
            </h4>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 md:grid-cols-1">
              {navigateLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.to}
                    className="
                      group inline-flex items-center gap-2
                      text-[color:var(--retro-text-secondary)] hover:text-[color:var(--retro-burgundy)]
                      text-sm transition-colors
                    "
                  >
                    <span
                      className="
                        h-px w-3 bg-[color:var(--retro-border-dark)]
                        transition-all duration-300
                        group-hover:w-5 group-hover:bg-[color:var(--retro-burgundy)]
                      "
                      aria-hidden="true"
                    />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Era Arsip */}
          {eraLinks.length > 0 && (
            <div className="md:col-span-4 md:pl-8 md:border-l md:border-[color:var(--retro-border)]/60">
              <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[color:var(--retro-text-light)]">
                Archive
              </p>
              <h4 className="font-header text-2xl font-semibold text-[color:var(--retro-text-primary)] mt-3 mb-5">
                Era Arsip
              </h4>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                {eraLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.to}
                      className="
                        group inline-flex items-center gap-2
                        text-[color:var(--retro-text-secondary)] hover:text-[color:var(--retro-burgundy)]
                        text-sm transition-colors
                      "
                    >
                      <span
                        className="
                          h-px w-3 bg-[color:var(--retro-border-dark)]
                          transition-all duration-300
                          group-hover:w-5 group-hover:bg-[color:var(--retro-burgundy)]
                        "
                        aria-hidden="true"
                      />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Decorative divider */}
        <div className="mt-14 flex items-center gap-4" aria-hidden="true">
          <span className="h-px flex-1 bg-[color:var(--retro-border)]/70" />
          <span className="text-[color:var(--retro-burgundy)]/60 text-xs tracking-[0.4em]">
            ✦ ✦ ✦
          </span>
          <span className="h-px flex-1 bg-[color:var(--retro-border)]/70" />
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="font-header italic text-[color:var(--retro-text-light)] text-sm">
            &copy; {currentYear} {SITE_CONFIG.branding.name} — All rights reserved.
          </p>
          <p className="text-[color:var(--retro-text-light)] text-sm flex items-center gap-1.5">
            <span>{SITE_CONFIG.footer.creditPrefix}</span>
            <i className="ri-heart-fill text-[color:var(--retro-burgundy)]" />
            <span>{SITE_CONFIG.footer.creditSuffix}</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

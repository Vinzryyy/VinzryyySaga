/**
 * Footer Component
 * Site footer with navigation, social links, and copyright
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../../config/siteConfig';
import { useGallery } from '../../context';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { eras } = useGallery();

  const socialLinks = [
    { name: 'Instagram', icon: 'ri-instagram-line', url: SITE_CONFIG.social.instagram },
    { name: 'Twitter', icon: 'ri-twitter-x-line', url: SITE_CONFIG.social.twitter },
  ].filter((item) => Boolean(item.url));

  const quickLinks = [
    { name: 'Home', to: '/' },
    { name: 'Archive', to: '/gallery' },
    ...eras.map((era) => ({ name: era.label, to: `/gallery/${era.id}` })),
    { name: 'About', to: '/about' },
  ];

  return (
    <footer className="bg-[color:var(--color-bg-secondary)] border-t border-[color:var(--color-bg-tertiary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <span className="font-header text-2xl font-bold text-[color:var(--color-text-primary)]">
                {SITE_CONFIG.branding.name.toUpperCase()}<span className="text-[color:var(--color-accent)]">.</span>
              </span>
            </div>
            <p className="text-[color:var(--color-text-secondary)] text-sm leading-relaxed max-w-md">
              {SITE_CONFIG.footer.description}
            </p>

            {/* Social Links */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-4 mt-6">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    className="
                      w-10 h-10 flex items-center justify-center
                      bg-[color:var(--color-bg-tertiary)] hover:bg-[color:var(--color-accent)]
                      text-[color:var(--color-text-secondary)] hover:text-white
                      rounded-full
                      transition-all duration-300
                      hover:scale-110
                    "
                    aria-label={social.name}
                  >
                    <i className={`${social.icon} text-xl`} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-header text-lg font-semibold text-[color:var(--color-text-primary)] mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.to}
                    className="
                      text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-accent)]
                      text-sm transition-colors
                    "
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[color:var(--color-bg-tertiary)]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[color:var(--color-text-light)] text-sm">
              (c) {currentYear} {SITE_CONFIG.branding.name}. All rights reserved.
            </p>
            <p className="text-[color:var(--color-text-light)] text-sm flex items-center gap-1">
              {SITE_CONFIG.footer.creditPrefix}
              <i className="ri-heart-fill text-[color:var(--color-accent)]" />
              {SITE_CONFIG.footer.creditSuffix}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

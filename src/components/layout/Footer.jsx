/**
 * Footer Component
 * Site footer with navigation, social links, and copyright
 */

import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { name: 'Instagram', icon: 'ri-instagram-line', url: '#' },
    { name: 'Twitter', icon: 'ri-twitter-x-line', url: '#' },
    { name: 'Facebook', icon: 'ri-facebook-circle-line', url: '#' },
    { name: '500px', icon: 'ri-camera-line', url: '#' },
  ];

  const quickLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Gallery', href: '#gallery' },
    { name: '2024', href: '#2024' },
    { name: '2025', href: '#2025' },
    { name: '2026', href: '#2026' },
    { name: 'About', href: '#about' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <footer className="bg-[color:var(--color-bg-secondary)] border-t border-[color:var(--color-bg-tertiary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo.png" alt="Logo" className="w-12 h-12" />
              <span className="font-header text-xl font-bold text-[color:var(--color-text-primary)]">
                VinzryyySaga
              </span>
            </div>
            <p className="text-[color:var(--color-text-secondary)] text-sm leading-relaxed max-w-md">
              Capturing moments, telling stories. Professional photography
              showcasing the beauty of life through a unique lens.
            </p>

            {/* Social Links */}
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
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-header text-lg font-semibold text-[color:var(--color-text-primary)] mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="
                      text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-accent)]
                      text-sm transition-colors
                    "
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-header text-lg font-semibold text-[color:var(--color-text-primary)] mb-4">
              Contact
            </h4>
            <div className="space-y-2">
              <a
                href="mailto:contact@vinzryyysaga.com"
                className="flex items-center gap-2 text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-accent)] text-sm transition-colors"
              >
                <i className="ri-mail-line" />
                contact@vinzryyysaga.com
              </a>
              <p className="text-[color:var(--color-text-secondary)] text-sm">
                Kuala Lumpur, Malaysia
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[color:var(--color-bg-tertiary)]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[color:var(--color-text-light)] text-sm">
              © {currentYear} VinzryyySaga. All rights reserved.
            </p>
            <p className="text-[color:var(--color-text-light)] text-sm flex items-center gap-1">
              Made with <i className="ri-heart-fill text-[color:var(--color-accent)]" /> using React & Vite
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

/**
 * HomePage Component
 * Landing page with hero, featured gallery, and call-to-action
 */

import React, { useMemo } from 'react';
import { useGallery } from '../context';
import Section from '../components/layout/Section';
import PageHeader from '../components/layout/PageHeader';
import GalleryGrid from '../components/gallery/GalleryGrid';
import XInsights from '../components/gallery/XInsights';
import Button from '../components/ui/Button';
import { useScrollReveal } from '../hooks/useScrollReveal';

const HomePage = () => {
  const { featuredImages, images, eras } = useGallery();

  const stats = useMemo(() => {
    if (!images || images.length === 0) {
      return [];
    }

    const sorted = [...images].sort((a, b) => a.date.localeCompare(b.date));
    const first = new Date(sorted[0].date);
    const dateFormat = (date) =>
      new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
    const monthFormat = (date) =>
      new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);

    const monthCounts = new Map();
    for (const item of images) {
      const d = new Date(item.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const current = monthCounts.get(key) || { label: monthFormat(d), count: 0 };
      current.count += 1;
      monthCounts.set(key, current);
    }
    const peakMonth = [...monthCounts.values()].reduce(
      (best, current) => (current.count > best.count ? current : best),
      { label: '-', count: 0 }
    );

    return [
      { number: images.length.toLocaleString('en-US'), label: 'Archive Frames', icon: 'ri-camera-lens-line' },
      { number: eras.length.toString(), label: 'Archive Years', icon: 'ri-history-line' },
      { number: dateFormat(first), label: 'First Captured', icon: 'ri-calendar-line' },
      { number: peakMonth.label, label: 'Peak Activity', icon: 'ri-line-chart-line' },
    ];
  }, [images, eras.length]);

  const { elementRef, isVisible } = useScrollReveal({
    threshold: 0.1,
    triggerOnce: true,
  });

  return (
    <main>
      {/* Featured Gallery Section */}
      <Section id="gallery" padding="xl" className="relative overflow-hidden">
        {/* Background Decorative Text */}
        <div className="absolute -top-10 -left-10 text-[15rem] font-bold text-[color:var(--retro-gold)]/5 pointer-events-none select-none">
          ELI
        </div>

        <PageHeader
          title="The Mermaid Archive"
          subtitle="A curated journey through the most iconic moments of Helisma Putri"
          className="relative z-10"
        />

        {/* Stats - Refined to look like 'Milestones' */}
        <div
          ref={elementRef}
          className={`
            grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20
            transform transition-all duration-1000 delay-200
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}
          `}
        >
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="group relative p-8 bg-[color:var(--retro-bg-primary)]/60 rounded-3xl backdrop-blur-xl border border-[color:var(--retro-border)] shadow-retro transition-all duration-500 hover:bg-[color:var(--retro-gold)]/10 hover:-translate-y-2"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-[color:var(--retro-bg-primary)] rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-[color:var(--retro-gold)] group-hover:text-[color:var(--retro-bg-dark)] transition-colors duration-300">
                <i className={`${stat.icon} text-xl`} />
              </div>
              <div className="text-4xl font-black text-[color:var(--color-text-primary)] mb-1 tracking-tighter">
                {stat.number}
              </div>
              <div className="text-xs uppercase tracking-widest font-bold text-[color:var(--color-text-muted)] group-hover:text-[color:var(--retro-gold)] transition-colors">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="relative z-10">
          <GalleryGrid
            imagesOverride={featuredImages}
          />
        </div>

        {/* View All CTA - More Stylized */}
        <div className="text-center mt-20">
          <a href="#gallery" className="group relative inline-flex items-center gap-4 px-10 py-5 bg-[color:var(--retro-burgundy)] text-[color:var(--retro-cream)] rounded-full font-bold overflow-hidden transition-all hover:pr-14 hover:shadow-2xl hover:shadow-[color:var(--retro-burgundy)]/40">
            <span className="relative z-10">Explore Full Archive</span>
            <i className="ri-arrow-right-line relative z-10 group-hover:translate-x-2 transition-transform" />
            <div className="absolute inset-0 bg-black/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </a>
        </div>
      </Section>

      <Section id="storyline" padding="lg" background="gradient">
        <XInsights />
      </Section>

      {/* Behind the Frames - More Magazine Style */}
      <Section id="about-preview" background="gradient" padding="xl" className="overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Image Composition */}
          <div className="relative group">
            <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl transition-transform duration-700 group-hover:scale-[0.98]">
              <img
                src="/archive/img-000.jpg"
                alt="Eli JKT48 Recent Moment"
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 filter-sepia"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--retro-brown-dark)]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            {/* Floating Card */}
            <div className="absolute -bottom-10 -right-10 p-8 bg-[color:var(--retro-bg-primary)]/90 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-[color:var(--retro-border)] max-w-[280px] hidden md:block animate-float">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[color:var(--retro-gold)]/20 flex items-center justify-center">
                  <i className="ri-double-quotes-l text-2xl text-[color:var(--retro-gold)]" />
                </div>
                <div className="font-bold text-sm text-[color:var(--retro-text-primary)]">Artist Note</div>
              </div>
              <p className="text-sm italic text-[color:var(--retro-text-secondary)] leading-relaxed">
                "Every stage is a story. My mission is to ensure Eli's light never fades from the frame."
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="lg:pl-10">
            <div className="inline-block px-4 py-1 bg-[color:var(--retro-gold)]/10 text-[color:var(--retro-gold)] rounded-full text-xs font-bold uppercase tracking-widest mb-6">
              Curated Documentation
            </div>
            <h2 className="font-header text-5xl md:text-7xl font-black text-[color:var(--color-text-primary)] mb-8 leading-[0.9] tracking-tighter">
              Behind the <br/><span className="text-[color:var(--retro-burgundy)]">Frames.</span>
            </h2>
            <p className="text-[color:var(--color-text-secondary)] text-xl leading-relaxed mb-10">
              Capturing the journey of Eli JKT48 is a labor of love. Every photograph 
              is a piece of history, documenting the growth and the shine of our 
              lovely mermaid. 
            </p>
            
            <div className="space-y-6 mb-12">
              {[
                { title: 'High Fidelity', desc: 'Sourcing only the highest resolution media for clarity.' },
                { title: 'Emotional Context', desc: 'Preserving the raw energy of theater performances.' },
                { title: 'Fan Archive', desc: 'A dedicated home for the Eli JKT48 community.' }
              ].map(item => (
                <div key={item.title} className="flex gap-4">
                  <div className="mt-1 w-5 h-5 rounded-full border-2 border-[color:var(--retro-gold)] flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-[color:var(--color-text-primary)]">{item.title}</h4>
                    <p className="text-sm text-[color:var(--color-text-muted)]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <a href="#about">
              <Button variant="pastel" size="xl" className="rounded-full bg-[color:var(--retro-sepia)] hover:bg-[color:var(--retro-brown)] text-[color:var(--retro-cream)]">
                Learn About Armeniaca
              </Button>
            </a>
          </div>
        </div>
      </Section>

    </main>
  );
};

export default HomePage;

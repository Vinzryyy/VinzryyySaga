/**
 * AboutPage Component
 * Photographer biography, equipment, and achievements
 */

import React from 'react';
import Section from '../components/layout/Section';
import PageHeader from '../components/layout/PageHeader';
import { useScrollReveal } from '../hooks/useScrollReveal';

const AboutPage = () => {
  const { elementRef, isVisible } = useScrollReveal({
    threshold: 0.1,
    triggerOnce: true,
  });

  const achievements = [
    { year: '2024', title: 'International Photography Awards', award: 'Portrait Category Winner' },
    { year: '2023', title: 'World Press Photo', award: 'Honorable Mention' },
    { year: '2022', title: 'Sony World Photography', award: 'Shortlisted' },
    { year: '2021', title: 'National Geographic', award: 'Travel Photographer of the Year' },
  ];

  const equipment = [
    { category: 'Cameras', items: ['Sony A7R V', 'Canon R5', 'Fujifilm GFX 100', 'Hasselblad X2D'] },
    { category: 'Lenses', items: ['24-70mm f/2.8', '70-200mm f/2.8', '85mm f/1.2', '16-35mm f/2.8'] },
    { category: 'Accessories', items: ['Gitzo Tripod', 'Profoto Lights', 'DJI Drone', 'Peak Design Gear'] },
  ];

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <Section id="about" padding="xl" background="gradient">
        <PageHeader
          title="About Me"
          subtitle="The story behind the lens and the passion that drives every shot"
        />
      </Section>

      {/* Bio Section */}
      <Section padding="lg">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div
            ref={elementRef}
            className={`
              relative transform transition-all duration-700
              ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}
            `}
          >
            <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-white/50 shadow-pastel">
              <img
                src="https://images.unsplash.com/photo-1552168324-d612d7772f8e?w=800&q=80"
                alt="Portrait of photographer"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Signature placeholder */}
            <div className="mt-6">
              <p className="font-header text-2xl text-[color:var(--color-accent)] italic">Vinzryyy</p>
            </div>
          </div>

          {/* Content */}
          <div
            className={`
              transform transition-all duration-700 delay-200
              ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
            `}
          >
            <h2 className="font-header text-3xl md:text-4xl font-bold text-[color:var(--color-text-primary)] mb-6">
              Hello, I'm Vinzryyy
            </h2>

            <div className="space-y-4 text-[color:var(--color-text-secondary)] leading-relaxed">
              <p>
                Photography isn't just what I do—it's how I see the world. Every frame
                is an opportunity to capture emotion, tell a story, and preserve a
                moment that would otherwise fade into memory.
              </p>
              <p>
                My journey began over a decade ago with a simple point-and-shoot camera
                and an insatiable curiosity about the world around me. Since then, I've
                had the privilege of shooting in over 50 countries, from the bustling
                streets of Tokyo to the serene landscapes of Iceland.
              </p>
              <p>
                I specialize in portrait, landscape, and event photography, always
                striving to find the extraordinary in the ordinary. My work has been
                featured in international publications and exhibitions, but nothing
                compares to the joy of delivering images that make my clients see
                themselves in a new light.
              </p>
              <p>
                When I'm not behind the camera, you'll find me exploring new locations,
                mentoring aspiring photographers, or sharing my knowledge through
                workshops and online content.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-[color:var(--color-bg-tertiary)]">
              <div>
                <div className="text-2xl font-bold text-[color:var(--color-accent)]">10+</div>
                <div className="text-sm text-[color:var(--color-text-light)]">Years Experience</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[color:var(--color-accent)]">50+</div>
                <div className="text-sm text-[color:var(--color-text-light)]">Countries Shot</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[color:var(--color-accent)]">500+</div>
                <div className="text-sm text-[color:var(--color-text-light)]">Projects Completed</div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Achievements Section */}
      <Section background="gradient" padding="lg">
        <h2 className="font-header text-3xl font-bold text-[color:var(--color-text-primary)] text-center mb-12">
          Recognition & Awards
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {achievements.map((achievement) => (
            <div
              key={achievement.year}
              className="
                p-6 bg-white/60 rounded-xl
                border border-[color:var(--color-bg-tertiary)]
                shadow-pastel
                hover:shadow-pastel-lg
                transition-all
              "
            >
              <div className="text-[color:var(--color-accent)] font-mono text-sm mb-2">
                {achievement.year}
              </div>
              <h3 className="text-[color:var(--color-text-primary)] font-semibold mb-1">
                {achievement.title}
              </h3>
              <p className="text-[color:var(--color-text-secondary)] text-sm">
                {achievement.award}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Equipment Section */}
      <Section padding="lg">
        <h2 className="font-header text-3xl font-bold text-[color:var(--color-text-primary)] text-center mb-12">
          Equipment & Gear
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {equipment.map((group) => (
            <div
              key={group.category}
              className="p-6 bg-white/60 rounded-xl border border-[color:var(--color-bg-tertiary)] shadow-pastel"
            >
              <h3 className="text-xl font-semibold text-[color:var(--color-text-primary)] mb-4 flex items-center gap-2">
                <i className="ri-equipment-line text-[color:var(--color-accent)]" />
                {group.category}
              </h3>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="text-[color:var(--color-text-secondary)] flex items-center gap-2"
                  >
                    <i className="ri-checkbox-blank-circle-line text-xs text-[color:var(--color-pastel-pink)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Philosophy Section */}
      <Section background="gradient" padding="lg">
        <div className="max-w-3xl mx-auto text-center">
          <i className="ri-quote-line text-5xl text-[color:var(--color-accent)] mb-6" />
          <blockquote className="font-header text-2xl md:text-3xl text-[color:var(--color-text-primary)] leading-relaxed mb-6">
            "Photography is the art of frozen time... the ability to store emotion
            and feelings within a frame. Every picture tells a story, and I'm here
            to help tell yours."
          </blockquote>
          <cite className="text-[color:var(--color-text-secondary)] not-italic">— Vinzryyy</cite>
        </div>
      </Section>
    </main>
  );
};

export default AboutPage;

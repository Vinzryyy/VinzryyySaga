import React, { useMemo } from 'react';
import xArchive from '../../data/xArchive.json';

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);

const formatMonth = (date) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);

const XInsights = () => {
  const story = useMemo(() => {
    const items = [...xArchive].filter((item) => item.date).sort((a, b) => a.date.localeCompare(b.date));
    if (items.length === 0) return null;

    const firstDate = new Date(items[0].date);
    const latestDate = new Date(items[items.length - 1].date);

    const monthMap = new Map();
    for (const item of items) {
      const d = new Date(item.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const current = monthMap.get(key) || { key, label: formatMonth(d), count: 0 };
      current.count += 1;
      monthMap.set(key, current);
    }

    const monthly = [...monthMap.values()].sort((a, b) => a.key.localeCompare(b.key));
    const maxCount = Math.max(...monthly.map((m) => m.count));
    const topMonth = monthly.reduce((best, current) => (current.count > best.count ? current : best), monthly[0]);

    const segmentSize = Math.max(1, Math.floor(items.length / 3));
    const segments = [
      items.slice(0, segmentSize),
      items.slice(segmentSize, segmentSize * 2),
      items.slice(segmentSize * 2),
    ].filter((segment) => segment.length > 0);

    const chapterTitles = [
      'Chapter 1: First Signal',
      'Chapter 2: Growing Rhythm',
      'Chapter 3: Archive Momentum',
    ];

    const chapterNarratives = [
      'The timeline opens with foundational posts that define tone, framing, and visual identity for the archive.',
      'Posting rhythm stabilizes. The account starts to feel less like isolated uploads and more like a serialized story.',
      'Coverage becomes denser and more intentional, creating a clear momentum arc toward a new chapter.',
    ];

    const chapters = segments.map((segment, index) => {
      const start = new Date(segment[0].date);
      const end = new Date(segment[segment.length - 1].date);
      return {
        title: chapterTitles[index] || `Chapter ${index + 1}`,
        narrative: chapterNarratives[index] || 'A transition point in the archive storyline.',
        count: segment.length,
        period: `${formatDate(start)} - ${formatDate(end)}`,
      };
    });

    return {
      totalPosts: items.length,
      activeMonths: monthly.length,
      firstPost: formatDate(firstDate),
      latestPost: formatDate(latestDate),
      topMonth,
      monthly,
      maxCount,
      chapters,
    };
  }, []);

  if (!story) return null;

  return (
    <section className="px-3 sm:px-4">
      <div className="max-w-7xl mx-auto bg-white/55 backdrop-blur-xl border border-white/40 rounded-[2rem] md:rounded-[2.5rem] p-5 sm:p-6 md:p-8 shadow-retro">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--retro-burgundy)] mb-2">
              Storyline
            </p>
            <h2 className="font-header text-2xl sm:text-3xl md:text-4xl font-black text-[color:var(--color-text-primary)] tracking-tight">
              The @armeniaca15 Chronicle
            </h2>
            <p className="text-sm sm:text-base text-[color:var(--color-text-secondary)] mt-2">
              A visual story told across {story.activeMonths} active months.
            </p>
          </div>
          <div className="px-4 py-2 rounded-full bg-[color:var(--retro-burgundy)]/10 text-[color:var(--retro-burgundy)] text-[10px] font-black uppercase tracking-[0.18em] w-fit">
            Peak: {story.topMonth.label} ({story.topMonth.count})
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <div className="p-3 sm:p-4 rounded-2xl bg-white/70 border border-white/50">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-text-muted)] mb-1">Captured</p>
            <p className="text-xl sm:text-2xl font-black text-[color:var(--color-text-primary)]">{story.totalPosts}</p>
          </div>
          <div className="p-3 sm:p-4 rounded-2xl bg-white/70 border border-white/50">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-text-muted)] mb-1">Active Months</p>
            <p className="text-xl sm:text-2xl font-black text-[color:var(--color-text-primary)]">{story.activeMonths}</p>
          </div>
          <div className="p-3 sm:p-4 rounded-2xl bg-white/70 border border-white/50 col-span-2 lg:col-span-1">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-text-muted)] mb-1">First</p>
            <p className="text-sm sm:text-base font-bold text-[color:var(--color-text-primary)]">{story.firstPost}</p>
          </div>
          <div className="p-3 sm:p-4 rounded-2xl bg-white/70 border border-white/50 col-span-2 lg:col-span-1">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-text-muted)] mb-1">Latest</p>
            <p className="text-sm sm:text-base font-bold text-[color:var(--color-text-primary)]">{story.latestPost}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-5 mb-8">
          {story.chapters.map((chapter) => (
            <article key={chapter.title} className="rounded-2xl border border-white/50 bg-white/70 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--retro-burgundy)] mb-2">
                {chapter.title}
              </p>
              <p className="text-sm text-[color:var(--color-text-secondary)] leading-relaxed mb-4">{chapter.narrative}</p>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[color:var(--color-text-primary)]">{chapter.period}</span>
                <span className="font-black text-[color:var(--retro-burgundy)]">{chapter.count} posts</span>
              </div>
            </article>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/50 bg-white/70 p-5">
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[color:var(--retro-burgundy)] mb-4">Scene Map</h3>
            <div className="space-y-3">
              {story.monthly.map((month) => (
                <div key={month.key} className="grid grid-cols-[78px_1fr_28px] sm:grid-cols-[105px_1fr_34px] items-center gap-2 sm:gap-3">
                  <span className="text-[11px] font-bold text-[color:var(--color-text-secondary)]">{month.label}</span>
                  <div className="h-2.5 rounded-full bg-[color:var(--retro-burgundy)]/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[color:var(--retro-burgundy)]"
                      style={{ width: `${(month.count / story.maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-black text-[color:var(--retro-burgundy)] text-right">{month.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/50 bg-white/70 p-5">
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[color:var(--retro-burgundy)] mb-4">Editorial Notes</h3>
            <ul className="space-y-3 text-sm text-[color:var(--color-text-secondary)] leading-relaxed">
              <li className="flex gap-2"><span className="font-black text-[color:var(--retro-burgundy)]">01</span><span>The archive starts on {story.firstPost}, setting a clear documentary tone from day one.</span></li>
              <li className="flex gap-2"><span className="font-black text-[color:var(--retro-burgundy)]">02</span><span>{story.activeMonths} months of activity indicate consistent commitment, not one-off posting.</span></li>
              <li className="flex gap-2"><span className="font-black text-[color:var(--retro-burgundy)]">03</span><span>{story.topMonth.label} is the strongest burst, making it a natural focal chapter.</span></li>
              <li className="flex gap-2"><span className="font-black text-[color:var(--retro-burgundy)]">04</span><span>The latest captured point ({story.latestPost}) closes this dataset and sets up the next story arc.</span></li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default XInsights;

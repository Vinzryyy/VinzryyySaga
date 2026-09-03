/**
 * PageEntrance — consistent fade-up entrance for every page.
 *
 * Wraps the current route's element and plays a single CSS animation
 * on mount (no JS, no GSAP). Works in tandem with PageBlossomTransition:
 * the blossom curtain hides the swap; PageEntrance reveals the new page
 * with a gentle 400ms fade-up after it mounts.
 *
 * Uses `key={pathname}` from the parent to remount on navigation,
 * retriggering the animation.
 */

import { useLocation } from 'react-router-dom';

const PageEntrance = ({ children }) => {
  const { pathname } = useLocation();

  return (
    <div
      key={pathname}
      className="animate-page-entrance"
    >
      {children}
    </div>
  );
};

export default PageEntrance;

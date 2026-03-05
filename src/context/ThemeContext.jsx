/**
 * Theme Context
 * Manages application theme - Light Pastel Theme Only
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'photography-gallery-theme';

export const ThemeProvider = ({ children }) => {
  // Always use light theme - no dark mode
  const [theme] = useState('light');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Persist theme to localStorage (always light)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, 'light');
  }, []);

  // Ensure document is set to light mode
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
  }, []);

  // Toggle theme (kept for compatibility, but does nothing)
  const toggleTheme = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), 300);
  }, []);

  const contextValue = useMemo(
    () => ({
      theme: 'light',
      isDark: false,
      isLight: true,
      isTransitioning,
      toggleTheme,
      setTheme: () => {}, // No-op
    }),
    [isTransitioning, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;

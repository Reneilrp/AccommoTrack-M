import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const asideRef = useRef(null);

  // collapse returns a promise that resolves when the CSS transition ends
  const collapse = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      // Do not auto-collapse on mobile
      setIsSidebarOpen(false);
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const el = asideRef.current;
      const onEnd = (e) => {
        // ensure we respond to width/transform transitions
        if (e.target === el) {
          el.removeEventListener('transitionend', onEnd);
          resolve();
        }
      };

      if (el) {
        el.addEventListener('transitionend', onEnd);
      }

      // start collapse
      setIsSidebarOpen(false);

      // fallback: resolve after 400ms in case transitionend doesn't fire
      setTimeout(() => {
        if (el) el.removeEventListener('transitionend', onEnd);
        resolve();
      }, 500);
    });
  }, []);

  const open = useCallback(() => {
    return new Promise((resolve) => {
      const el = asideRef.current;
      const onEnd = (e) => {
        if (e.target === el) {
          el.removeEventListener('transitionend', onEnd);
          resolve();
        }
      };

      if (el) {
        el.addEventListener('transitionend', onEnd);
      }

      setIsSidebarOpen(true);

      setTimeout(() => {
        if (el) el.removeEventListener('transitionend', onEnd);
        resolve();
      }, 500);
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ isSidebarOpen, setIsSidebarOpen, collapse, open, asideRef }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}

export default SidebarContext;

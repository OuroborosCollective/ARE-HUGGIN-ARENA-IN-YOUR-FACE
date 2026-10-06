import { useState, useEffect } from 'react';

export type ThemeMode = 'system' | 'dark' | 'light';

export interface DeviceScreenInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  touchTargetSize: string; // recommended tailwind min-height/min-width
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenLabel: string;
  touchTargetClass: string;
  isSmallScreen: boolean;
  systemTheme: 'dark' | 'light';
  prefersDarkMode: boolean;
}

export function useDeviceScreen(): DeviceScreenInfo {
  const getSystemTheme = (): 'dark' | 'light' => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  };

  const [screenInfo, setScreenInfo] = useState<DeviceScreenInfo>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const height = typeof window !== 'undefined' ? window.innerHeight : 800;
    const isTouch = typeof window !== 'undefined'
      ? ('ontouchstart' in window || navigator.maxTouchPoints > 0)
      : false;
    const isMobile = width < 640;
    const isTablet = width >= 640 && width < 1024;
    const isDesktop = width >= 1024;
    const deviceType: 'mobile' | 'tablet' | 'desktop' = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
    const systemTheme = getSystemTheme();

    return {
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice: isTouch,
      width,
      height,
      orientation: width >= height ? 'landscape' : 'portrait',
      touchTargetSize: isMobile || isTouch ? 'min-h-[44px] min-w-[44px]' : 'min-h-[36px]',
      touchTargetClass: isMobile || isTouch ? 'min-h-[44px] px-3.5 py-2.5 text-sm' : 'min-h-[36px] px-3 py-1.5 text-xs',
      deviceType,
      screenLabel: `${isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'} (${width}×${height})`,
      isSmallScreen: isMobile || isTablet,
      systemTheme,
      prefersDarkMode: systemTheme === 'dark'
    };
  });

  useEffect(() => {
    const mediaQuery = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

    const updateScreenInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobile = width < 640;
      const isTablet = width >= 640 && width < 1024;
      const isDesktop = width >= 1024;
      const deviceType: 'mobile' | 'tablet' | 'desktop' = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
      const currentSystemTheme = mediaQuery?.matches ? 'dark' : 'light';

      setScreenInfo({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice: isTouch,
        width,
        height,
        orientation: width >= height ? 'landscape' : 'portrait',
        touchTargetSize: isMobile || isTouch ? 'min-h-[44px] min-w-[44px]' : 'min-h-[36px]',
        touchTargetClass: isMobile || isTouch ? 'min-h-[44px] px-3.5 py-2.5 text-sm' : 'min-h-[36px] px-3 py-1.5 text-xs',
        deviceType,
        screenLabel: `${isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'} (${width}×${height})`,
        isSmallScreen: isMobile || isTablet,
        systemTheme: currentSystemTheme,
        prefersDarkMode: currentSystemTheme === 'dark'
      });
    };

    window.addEventListener('resize', updateScreenInfo, { passive: true });
    window.addEventListener('orientationchange', updateScreenInfo, { passive: true });
    
    if (mediaQuery) {
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', updateScreenInfo);
      } else if ((mediaQuery as any).addListener) {
        (mediaQuery as any).addListener(updateScreenInfo);
      }
    }

    return () => {
      window.removeEventListener('resize', updateScreenInfo);
      window.removeEventListener('orientationchange', updateScreenInfo);
      if (mediaQuery) {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', updateScreenInfo);
        } else if ((mediaQuery as any).removeListener) {
          (mediaQuery as any).removeListener(updateScreenInfo);
        }
      }
    };
  }, []);

  return screenInfo;
}

export function useThemePreference() {
  const screen = useDeviceScreen();
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('app_theme_preference') as ThemeMode;
      if (saved && ['system', 'dark', 'light'].includes(saved)) {
        return saved;
      }
    } catch (e) {
      console.warn('Failed to load theme preference:', e);
    }
    return 'system';
  });

  const effectiveTheme: 'dark' | 'light' = themeMode === 'system'
    ? screen.systemTheme
    : themeMode;

  useEffect(() => {
    try {
      localStorage.setItem('app_theme_preference', themeMode);
    } catch (e) {
      console.warn('Failed to persist theme preference:', e);
    }

    const root = document.documentElement;
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [themeMode, effectiveTheme]);

  return {
    themeMode,
    setThemeMode,
    effectiveTheme,
    systemTheme: screen.systemTheme,
    isSystem: themeMode === 'system'
  };
}



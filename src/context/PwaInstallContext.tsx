'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaContextType {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  installApp: () => Promise<void>;
  showGuide: boolean;
  setShowGuide: (val: boolean) => void;
}

const PwaContext = createContext<PwaContextType>({
  canInstall: false,
  isInstalled: false,
  isIOS: false,
  installApp: async () => {},
  showGuide: false,
  setShowGuide: () => {},
});

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    // Detect standalone mode (already installed app)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Capture native install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      // Direct 1-click install triggered to device!
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else if (isInstalled) {
      alert('Ứng dụng ZEN CRM đã được cài đặt trên thiết bị của bạn!');
    } else {
      // Show guide only when browser does not allow programmatic prompt (like iOS Safari)
      setShowGuide(true);
    }
  };

  return (
    <PwaContext.Provider
      value={{
        canInstall: !!deferredPrompt || isIOS,
        isInstalled,
        isIOS,
        installApp,
        showGuide,
        setShowGuide,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  return useContext(PwaContext);
}

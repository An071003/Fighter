import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppStore, visualClockRef } from '@/domain/store';
import { ExperienceCanvas } from '@/experience3d/ExperienceCanvas';
import { KeyboardHelp } from '@/interface/common/KeyboardHelp';
import { StatusToast } from '@/interface/common/StatusToast';
import { PartDetails } from '@/interface/inspect/PartDetails';
import { BottomTransport } from '@/interface/shell/BottomTransport';
import { TopBar } from '@/interface/shell/TopBar';
import { StoryHud } from '@/interface/story/StoryHud';
import { AppProviders } from './providers';

declare global {
  interface Window {
    __AERIS_DEBUG__?: {
      getState: typeof useAppStore.getState;
      getVisualClock: () => typeof visualClockRef;
    };
  }
}

export const App: React.FC = () => {
  const mode = useAppStore((s) => s.mode);
  const assetReady = useAppStore((s) => s.assetReady);
  const storyActive = useAppStore((s) => s.storyPhaseIndex !== null);

  useEffect(() => {
    // Expose read-only test diagnostic handle for Playwright QA assertions
    window.__AERIS_DEBUG__ = {
      getState: useAppStore.getState,
      getVisualClock: () => visualClockRef,
    };
  }, []);

  return (
    <AppProviders>
      <main
        data-testid="aeris-app-root"
        data-scene-mode={mode}
        data-asset-ready={assetReady ? 'true' : 'false'}
        className="relative w-screen h-screen overflow-hidden bg-[#0A0A0B] text-[#EDEEF0]"
      >
        {/* Single Primary 3D WebGL Canvas */}
        <ExperienceCanvas />

        {/* Intro Loading Silhouette Overlay */}
        <AnimatePresence>
          {mode === 'loading' && (
            <motion.div
              key="loading-overlay"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              data-testid="loading-overlay"
              className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#0A0A0B]/92 backdrop-blur-md pointer-events-none"
            >
              <svg
                viewBox="0 0 120 120"
                className="w-20 h-20 text-[#F2F3F5] mb-4 animate-pulse"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M60 12 L74 52 L110 72 L110 80 L72 74 L66 102 L82 110 L82 114 L60 108 L38 114 L38 110 L54 102 L48 74 L10 80 L10 72 L46 52 Z" />
              </svg>
              <div className="font-mono text-xs tracking-widest uppercase text-[#F2F3F5]">
                ĐANG NẠP CẤU TRÚC 3D AERIS X-9 (46 BỘ PHẬN)...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Semantic HTML Overlay Interface (Zero Three.js Imports) */}
        {storyActive ? (
          <StoryHud />
        ) : (
          <>
            <TopBar />
            <PartDetails />
            <BottomTransport />
          </>
        )}
        <StatusToast />
        <KeyboardHelp />
      </main>
    </AppProviders>
  );
};

export default App;

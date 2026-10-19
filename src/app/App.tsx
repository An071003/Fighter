import React from 'react';
import { AppProviders } from './providers';

export const App: React.FC = () => {
  return (
    <AppProviders>
      <main
        className="relative w-screen h-screen overflow-hidden bg-[#070A0F] text-[#E9F0F5]"
        data-testid="aeris-app-root"
      >
        <div className="sr-only">AERIS X-9 — Simulations &amp; Dynamics</div>
      </main>
    </AppProviders>
  );
};

export default App;

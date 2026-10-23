import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import AppRoot from './AppRoot';
import './index.css';
import { initErrorMonitoring } from './lib/logger';
import LoadingScreen from './components/LoadingScreen';

// Initialize production error monitoring
initErrorMonitoring();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<LoadingScreen />}>
      <AppRoot />
    </Suspense>
  </StrictMode>,
);

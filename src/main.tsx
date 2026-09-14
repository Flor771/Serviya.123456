import { StrictMode, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { WarrantyLauncher } from './components/WarrantyLauncher';

void import('./App.tsx').then((AppModule) => {
  const App = (AppModule as { default?: ComponentType; App?: ComponentType }).default
    ?? (AppModule as { default?: ComponentType; App?: ComponentType }).App;

  if (!App) {
    throw new Error('SERVIYA: no se encontró el componente App en App.tsx');
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
      <PWAInstallPrompt />
      <WarrantyLauncher />
    </StrictMode>,
  );
});

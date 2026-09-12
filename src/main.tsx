import { StrictMode, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import * as AppModule from './App.tsx';
import './index.css';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

// App.tsx actualmente expone el componente raíz como export nombrado.
const App = (AppModule as typeof AppModule & { default?: ComponentType }).default
  ?? (AppModule as typeof AppModule & { App?: ComponentType }).App;

if (!App) {
  throw new Error('SERVIYA: no se encontró el componente App en App.tsx');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <PWAInstallPrompt />
  </StrictMode>,
);

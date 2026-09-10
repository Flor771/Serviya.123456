import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as AppModule from './App.tsx';
import './index.css';

// App.tsx currently exposes the root component as a named export.
// Resolve it without requiring a default export so Render's Vite build succeeds.
const App = (AppModule as typeof AppModule & { default?: React.ComponentType }).default
  ?? (AppModule as typeof AppModule & { App?: React.ComponentType }).App;

if (!App) {
  throw new Error('SERVIYA: no se encontró el componente App en App.tsx');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

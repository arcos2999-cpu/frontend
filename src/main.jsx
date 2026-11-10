import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { push } from './lib/push.js';
import { registrarServiceWorker } from './lib/pwa.js';
import { sesion } from './lib/sesion.js';
import './estilos/app.css';

registrarServiceWorker();
if (sesion.activa()) push.sincronizar();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

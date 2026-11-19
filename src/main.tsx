// Fonts are bundled with the app: no third-party request, and they work offline.
import '@fontsource-variable/nunito';
import '@fontsource-variable/noto-sans-georgian';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { initPwa } from './pwa';

initPwa();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

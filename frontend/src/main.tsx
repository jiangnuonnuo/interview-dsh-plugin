import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App.js';
import { createMemoryEntryPort } from './features/entry/memory-port.js';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App port={createMemoryEntryPort()} />
  </React.StrictMode>
);

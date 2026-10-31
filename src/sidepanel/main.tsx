import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../shared/ui/index.css';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

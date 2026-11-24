import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { enforceHttpsTransport } from './utils/security';

enforceHttpsTransport();

createRoot(document.getElementById('root')!).render(<App />);

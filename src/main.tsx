import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { FirebaseAuthProvider } from './context/FirebaseAuthContext';
import './index.css';

// Intercept and prevent Vite dev HMR WebSocket disconnection errors from bubbling up
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = typeof reason === 'string' ? reason : reason?.message || '';
  if (
    msg.includes('WebSocket closed without opened') ||
    msg.includes('failed to connect to websocket') ||
    msg.includes('WebSocket')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <FirebaseAuthProvider>
    <App />
  </FirebaseAuthProvider>
);

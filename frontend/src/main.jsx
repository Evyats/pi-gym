import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@ncdai/react-wheel-picker/style.css'
import './styles.css'

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/gym/sw.js', { scope: '/gym/' }))
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/admin.css'
import { perfLog } from './utils/perf'

perfLog('bootstrap', 'main.tsx evaluated')

const root = ReactDOM.createRoot(document.getElementById('root')!)

if (import.meta.env.DEV) {
    perfLog('bootstrap', 'rendering app without StrictMode in dev')
    root.render(<App />)
} else {
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
    )
}

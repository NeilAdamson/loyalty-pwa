import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0', // Needed for Docker binding
        port: 5173,
        watch: {
            usePolling: true, // Needed for Windows/WSL2 bind mount hot reload reliably
        }
    }
})

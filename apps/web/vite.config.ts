import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        include: [
            'react-router-dom',
            'axios',
            'jwt-decode',
            'qrcode.react',
            'canvas-confetti',
            'html5-qrcode'
        ]
    },
    server: {
        host: '0.0.0.0', // Needed for Docker binding
        port: 5173,
        watch: {
            usePolling: true, // Needed for Windows/WSL2 bind mount hot reload reliably
        },
        warmup: {
            clientFiles: [
                './src/main.tsx',
                './src/App.tsx',
                './src/pages/admin/AdminLogin.tsx',
                './src/routes/PlatformAdminApp.tsx',
                './src/components/admin/AdminShell.tsx'
            ]
        }
    }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 4200, // Use port 4200 to match Google/GitHub OAuth redirect URIs
    proxy: {
      // When you call /api/... in your frontend, Vite will forward it to this target
      "/api": {
        target: "https://api-thor.e2enetworks.net/myaccount/api/v1",
        changeOrigin: true, // Makes the host header match the target
        rewrite: (path) => path.replace(/^\/api/, ""), // Removes '/api' prefix before sending to backend
        secure: true,
      },
    },
  },
})

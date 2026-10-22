import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { registerSW } from 'virtual:pwa-register'
import { router } from '@/app/router'
import { StoreProvider } from '@/shared/store/StoreProvider'
import { applyTheme } from '@/shared/lib/theme'
import { motion } from '@/shared/lib/motion'
import { t } from '@/shared/i18n'
import '@/app/styles/index.css'

applyTheme()
motion.watch()
// The update overlay lives in index.html, so its text is set here.
const updating = document.querySelector('#updating .splash-text')
if (updating) updating.textContent = t.nav.updating

registerSW({
  immediate: true,
  /**
   * iOS often resumes an installed PWA without reloading it, so also check for a new
   * version whenever the app comes back to the foreground, and hourly while it's open.
   */
  onRegisteredSW(_url, reg) {
    if (!reg) return
    // A new version is downloading (and an old one is running): show the overlay until the reload.
    reg.addEventListener('updatefound', () => {
      if (!navigator.serviceWorker.controller) return
      document.getElementById('updating')!.hidden = false
      // The plugin reloads the page once the new worker activates; the shell then says so.
      sessionStorage.setItem('roadmap-just-updated', '1')
    })
    const check = () => { if (navigator.onLine) void reg.update() }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
    setInterval(check, 60 * 60 * 1000)
  },
})

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: true, retry: 1 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <RouterProvider router={router} />
      </StoreProvider>
    </QueryClientProvider>
  </StrictMode>,
)

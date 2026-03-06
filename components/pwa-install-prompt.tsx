'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if user previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    const dismissedTime = localStorage.getItem('pwa-install-dismissed-time')
    
    // Check if 30 days have passed since dismissal
    if (dismissed && dismissedTime) {
      const daysPassed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24)
      if (daysPassed > 30) {
        localStorage.removeItem('pwa-install-dismissed')
        localStorage.removeItem('pwa-install-dismissed-time')
      } else {
        console.log('PWA install prompt dismissed, skipping')
        setIsDismissed(true)
        return
      }
    } else if (dismissed) {
      console.log('PWA install prompt dismissed without time, skipping')
      setIsDismissed(true)
      return
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      console.log('✅ beforeinstallprompt event fired')
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show prompt after a short delay for better UX
      setTimeout(() => {
        console.log('📱 Showing install prompt')
        setShowPrompt(true)
      }, 1500)
    }

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt as EventListener
    )

    // Log if the event is not supported
    if (!('beforeinstallprompt' in window)) {
      console.log('ℹ️ beforeinstallprompt event not supported (Firefox/Safari/incognito)')
    } else {
      console.log('ℹ️ beforeinstallprompt event is supported')
    }

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt as EventListener
      )
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    setShowPrompt(false)
    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('✅ User accepted the install prompt')
        localStorage.setItem('pwa-install-dismissed', 'true')
      } else {
        console.log('❌ User dismissed the install prompt')
      }
    } catch (err) {
      console.error('Install prompt error:', err)
    }

    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setIsDismissed(true)
    // Don't show again for 30 days
    localStorage.setItem('pwa-install-dismissed', 'true')
    localStorage.setItem(
      'pwa-install-dismissed-time',
      Date.now().toString()
    )
    console.log('👋 Install prompt dismissed for 30 days')
  }

  if (!showPrompt || isDismissed) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Alert className="relative bg-background border shadow-lg pr-12">
        <div className="flex items-start gap-3">
          <Download className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <AlertDescription className="text-sm">
              <p className="font-medium mb-1">Install PDF Zen Studio</p>
              <p className="text-muted-foreground">
                Get quick access to your PDF workspace. Install the app for a
                better experience.
              </p>
            </AlertDescription>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleInstall}>
                Install
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Not now
              </Button>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    </div>
  )
}

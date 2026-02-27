'use server'

import type { Browser } from 'puppeteer'
import { logger } from '@/lib/utils/logger'

// Singleton pour le navigateur Puppeteer
let browserInstance: Browser | null = null
let browserLaunchPromise: Promise<Browser> | null = null
let lastUsed: number = Date.now()

// Timeout d'inactivité avant de fermer le navigateur (5 minutes)
const IDLE_TIMEOUT = 5 * 60 * 1000

// Arguments Chrome recommandés pour Vercel (évitent timeouts)
const VERCEL_CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--disable-gpu',
  '--no-first-run',
  '--no-zygote',
  '--single-process',
  '--font-render-hinting=none',
  '--disable-animations',
  '--disable-background-timer-throttling',
  '--disable-restore-session-state',
]

// Configuration Puppeteer optimisée (local + Vercel)
const getLaunchOptions = async (): Promise<Record<string, unknown>> => {
  const isVercel = process.env.VERCEL === '1'

  // Vercel : utiliser @sparticuz/chromium-min (binaire compatible serverless)
  if (isVercel) {
    try {
      const chromium = await import('@sparticuz/chromium-min')
      const chrom = chromium.default
      const executablePath = await chrom.executablePath()
      logger.debug('[Puppeteer Pool] Vercel: @sparticuz/chromium-min', { executablePath: executablePath?.slice(0, 50) })
      return {
        executablePath,
        args: [...(chrom.args || []), ...VERCEL_CHROME_ARGS],
        headless: chrom.headless ?? true,
        defaultViewport: chrom.defaultViewport ?? null,
        timeout: 30000,
        protocolTimeout: 180000,
      }
    } catch (vercelError) {
      const msg = vercelError instanceof Error ? vercelError.message : String(vercelError)
      logger.error('[Puppeteer Pool] Vercel Chromium init failed', { error: msg })
      throw new Error(`Chromium Vercel: ${msg}`)
    }
  }

  const launchOptions: Record<string, unknown> = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--single-process',
    ],
    timeout: 30000,
    protocolTimeout: 180000,
  }

  // En développement local, essayer d'utiliser le Chrome système
  if (process.env.NODE_ENV === 'development') {
    const possiblePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
      '/usr/bin/google-chrome', // Linux
      '/usr/bin/chromium-browser', // Linux
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
    ]

    const fs = await import('fs')
    for (const path of possiblePaths) {
      try {
        if (fs.existsSync(path)) {
          launchOptions.executablePath = path
          logger.debug('[Puppeteer Pool] Chrome système', { path })
          break
        }
      } catch {
        // Ignorer
      }
    }
  }

  return launchOptions
}

// Obtenir ou créer une instance du navigateur
export async function getBrowser(): Promise<Browser> {
  // Si un lancement est déjà en cours, attendre
  if (browserLaunchPromise) {
    return browserLaunchPromise
  }

  // Si le navigateur existe et est connecté, le réutiliser
  if (browserInstance) {
    try {
      // Vérifier si le navigateur est toujours actif
      const pages = await browserInstance.pages()
      lastUsed = Date.now()
      logger.debug('[Puppeteer Pool] Réutilisation du navigateur', { pagesCount: pages.length })
      return browserInstance
    } catch (error) {
      // Le navigateur est mort, le recréer
      logger.warn('[Puppeteer Pool] Navigateur existant non fonctionnel, redémarrage...')
      browserInstance = null
    }
  }

  browserLaunchPromise = (async () => {
    try {
      const startTime = Date.now()
      const puppeteer = process.env.VERCEL === '1'
        ? (await import('puppeteer-core')).default
        : (await import('puppeteer')).default
      const launchOptions = await getLaunchOptions()

      const browser = await puppeteer.launch(launchOptions as any)
      browserInstance = browser
      lastUsed = Date.now()

      logger.debug('[Puppeteer Pool] Navigateur prêt', { duration: `${Date.now() - startTime}ms` })

      // Démarrer le timer d'inactivité
      startIdleTimer()

      return browser
    } finally {
      browserLaunchPromise = null
    }
  })()

  return browserLaunchPromise
}

// Timer pour fermer le navigateur après inactivité
let idleTimer: NodeJS.Timeout | null = null

function startIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer)
  }

  idleTimer = setTimeout(async () => {
    const timeSinceLastUse = Date.now() - lastUsed
    if (timeSinceLastUse >= IDLE_TIMEOUT && browserInstance) {
      try {
        logger.debug('[Puppeteer Pool] Fermeture du navigateur après inactivité')
        await browserInstance.close()
        browserInstance = null
      } catch (error) {
        logger.warn('[Puppeteer Pool] Erreur lors de la fermeture du navigateur', { error })
        browserInstance = null
      }
    } else if (browserInstance) {
      // Redémarrer le timer si le navigateur est encore en cours d'utilisation
      startIdleTimer()
    }
  }, IDLE_TIMEOUT)
}

// Fermer proprement le navigateur (pour les arrêts de serveur)
export async function closeBrowser(): Promise<void> {
  if (idleTimer) {
    clearTimeout(idleTimer)
    idleTimer = null
  }

  if (browserInstance) {
    try {
      await browserInstance.close()
      logger.debug('[Puppeteer Pool] Navigateur fermé')
    } catch (error) {
      logger.warn('[Puppeteer Pool] Erreur lors de la fermeture', { error })
    } finally {
      browserInstance = null
    }
  }
}

// Créer une nouvelle page dans le navigateur partagé
export async function createPage() {
  const browser = await getBrowser()
  const page = await browser.newPage()

  // Configurer la page
  page.setDefaultTimeout(180000)
  page.setDefaultNavigationTimeout(180000)

  return page
}

'use server'

import type { Browser } from 'puppeteer'
import { logger } from '@/lib/utils/logger'

// Singleton pour le navigateur Puppeteer
let browserInstance: Browser | null = null
let browserLaunchPromise: Promise<Browser> | null = null
let lastUsed: number = Date.now()

// Timeout d'inactivité avant de fermer le navigateur (5 minutes)
const IDLE_TIMEOUT = 5 * 60 * 1000

// Configuration Puppeteer optimisée
const getLaunchOptions = async () => {
  const launchOptions: any = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--single-process', // Plus rapide pour les opérations simples
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
          logger.info('[Puppeteer Pool] Utilisation de Chrome système', { path })
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
      logger.info('[Puppeteer Pool] Réutilisation du navigateur existant', { pagesCount: pages.length })
      return browserInstance
    } catch (error) {
      // Le navigateur est mort, le recréer
      logger.warn('[Puppeteer Pool] Navigateur existant non fonctionnel, redémarrage...')
      browserInstance = null
    }
  }

  // Lancer un nouveau navigateur
  browserLaunchPromise = (async () => {
    try {
      logger.info('[Puppeteer Pool] Lancement d\'un nouveau navigateur...')
      const startTime = Date.now()

      const puppeteer = (await import('puppeteer')).default
      const launchOptions = await getLaunchOptions()

      const browser = await puppeteer.launch(launchOptions)
      browserInstance = browser
      lastUsed = Date.now()

      logger.info('[Puppeteer Pool] Navigateur lancé avec succès', {
        duration: `${Date.now() - startTime}ms`
      })

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
        logger.info('[Puppeteer Pool] Fermeture du navigateur après inactivité')
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
      logger.info('[Puppeteer Pool] Navigateur fermé proprement')
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

/**
 * Helper pour l'authentification dans les tests E2E
 */

import { Page } from '@playwright/test'

/**
 * Se connecter avec des identifiants de test
 * 
 * Note: Si les identifiants n'existent pas, cette fonction peut échouer.
 * Dans ce cas, les tests qui nécessitent une authentification réelle seront skipés.
 */
export async function login(page: Page, email: string = 'test@example.com', password: string = 'password123'): Promise<boolean> {
  try {
    await page.goto('/auth/login')
    
    // Attendre que le formulaire soit chargé
    await page.waitForSelector('input[type="email"]', { timeout: 10000 })
    await page.waitForSelector('input[type="password"]', { timeout: 10000 })
    
    // Remplir le formulaire
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    
    // Soumettre - attendre que le bouton soit cliquable
    const submitButton = page.locator('button[type="submit"], button:has-text("Se connecter"), button:has-text("Connexion")')
    await submitButton.waitFor({ state: 'visible', timeout: 5000 })
    await submitButton.click()
    
    // Attendre la redirection ou vérifier les erreurs
    try {
      // Attendre soit la redirection, soit un message d'erreur
      await Promise.race([
        page.waitForURL(/\/dashboard/, { timeout: 15000 }),
        page.waitForSelector('[role="alert"], .error, .toast, [data-testid="error"]', { timeout: 5000 }).then(() => {
          throw new Error('Erreur de connexion détectée')
        }),
      ])
      
      // Si on arrive ici, la redirection a réussi
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
      return true
    } catch (error) {
      // Vérifier si on est déjà sur le dashboard (peut-être déjà connecté)
      const currentUrl = page.url()
      if (currentUrl.includes('/dashboard')) {
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
        return true
      }
      
      // Si on est toujours sur la page de login, la connexion a échoué
      if (currentUrl.includes('/auth/login')) {
        console.warn(`Connexion échouée avec ${email}. Les tests nécessitant une authentification seront skipés.`)
        return false
      }
      
      throw error
    }
  } catch (error) {
    console.warn(`Erreur lors de la connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    return false
  }
}

/**
 * Se déconnecter
 */
export async function logout(page: Page) {
  // Cliquer sur le menu utilisateur (à adapter selon votre UI)
  await page.click('[data-testid="user-menu"], button:has-text("Déconnexion")')
  await page.click('button:has-text("Déconnexion"), a:has-text("Déconnexion")')
  
  // Attendre la redirection vers la page de connexion
  await page.waitForURL(/\/auth\/login/, { timeout: 5000 })
}

/**
 * Vérifier que l'utilisateur est connecté
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 2000 })
    return true
  } catch {
    return false
  }
}


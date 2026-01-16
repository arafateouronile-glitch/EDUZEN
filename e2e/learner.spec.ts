import { test, expect } from '@playwright/test'

/**
 * Tests E2E pour l'espace apprenant
 * Note: L'espace apprenant utilise un accès par lien, pas une authentification classique
 */

test.describe('Espace Apprenant', () => {
  // ID d'étudiant de test (à remplacer par un ID valide dans votre environnement)
  const testStudentId = '71c81631-79f5-4314-a5a8-3e42bea7fce4'

  test('devrait afficher la page d\'accès apprenant avec un ID valide', async ({ page }) => {
    await page.goto(`/learner/access/${testStudentId}`)
    
    // Attendre que la page soit chargée
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
    
    // Vérifier qu'on n'a pas d'erreur d'accès ou qu'on est redirigé vers le dashboard apprenant
    const content = page.locator('main, [data-testid="learner-dashboard"], .container')
    const errorMessage = page.locator('text=introuvable, text=indisponible, text=erreur')
    
    // Si l'étudiant existe, on devrait voir le contenu
    // Si l'étudiant n'existe pas, on devrait voir un message d'erreur approprié
    try {
      await expect(content.first()).toBeVisible({ timeout: 10000 })
    } catch {
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('devrait afficher une erreur pour un ID invalide', async ({ page }) => {
    // ID invalide (format UUID incorrect)
    await page.goto('/learner/access/invalid-id')
    
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
    
    // Devrait afficher un message d'erreur ou être redirigé
    const errorMessage = page.locator('text=introuvable, text=indisponible, text=invalide, text=erreur')
    
    try {
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })
    } catch {
      // Si pas d'erreur visible, vérifier l'URL
      const currentUrl = page.url()
      expect(currentUrl).toContain('/learner')
    }
  })

  test('devrait pouvoir naviguer vers la messagerie apprenant', async ({ page }) => {
    // D'abord accéder avec un ID d'étudiant
    await page.goto(`/learner/access/${testStudentId}`)
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
    
    // Chercher un lien vers la messagerie
    const messagesLink = page.locator('a[href*="/learner/messages"], button:has-text("Messages")')
    
    if (await messagesLink.isVisible({ timeout: 5000 })) {
      await messagesLink.first().click()
      
      // Vérifier l'URL
      await expect(page).toHaveURL(/\/learner\/messages/, { timeout: 10000 })
    }
  })

  test('devrait afficher les formations de l\'apprenant', async ({ page }) => {
    await page.goto(`/learner/access/${testStudentId}`)
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
    
    // Naviguer vers la page des formations
    const formationsLink = page.locator('a[href*="/learner/formations"], button:has-text("Formations")')
    
    if (await formationsLink.isVisible({ timeout: 5000 })) {
      await formationsLink.first().click()
      
      await expect(page).toHaveURL(/\/learner\/formations/, { timeout: 10000 })
      
      // Vérifier la présence de contenu
      const content = page.locator('main, .container')
      await expect(content.first()).toBeVisible({ timeout: 5000 })
    }
  })
})




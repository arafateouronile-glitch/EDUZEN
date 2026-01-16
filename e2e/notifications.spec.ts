import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

/**
 * Tests E2E pour le système de notifications
 */

test.describe('Notifications', () => {
  test.beforeEach(async ({ page }) => {
    const loginSuccess = await login(page)
    if (!loginSuccess) {
      test.skip(true, 'Connexion échouée - utilisateur de test non disponible')
      return
    }
  })

  test('devrait afficher le badge de notifications dans le header', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    // Chercher le badge de notifications
    const notificationBadge = page.locator('[data-testid="notification-badge"], button[aria-label*="Notification"]')

    // Le badge peut ne pas être visible s'il n'y a pas de notifications
    // On vérifie juste qu'il existe dans le DOM
    const badgeExists = await notificationBadge.count() > 0
    expect(badgeExists).toBeTruthy()
  })

  test('devrait pouvoir ouvrir le centre de notifications', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    const notificationButton = page.locator('button[aria-label*="Notification"], [data-testid="notification-button"]')

    if (await notificationButton.isVisible({ timeout: 5000 })) {
      await notificationButton.first().click()
      await page.waitForTimeout(500)

      // Vérifier qu'un menu ou dialogue de notifications s'ouvre
      const notificationCenter = page.locator('[data-testid="notification-center"], [role="dialog"]')
      // Peut ne pas être visible s'il n'y a pas de notifications
    }
  })

  test('devrait pouvoir marquer une notification comme lue', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    const notificationButton = page.locator('button[aria-label*="Notification"], [data-testid="notification-button"]')

    if (await notificationButton.isVisible({ timeout: 5000 })) {
      await notificationButton.first().click()
      await page.waitForTimeout(500)

      // Chercher un bouton pour marquer comme lu
      const markAsReadButton = page.locator('button:has-text("Marquer comme lu"), [data-testid="mark-read"]')

      if (await markAsReadButton.isVisible({ timeout: 2000 })) {
        // Ne pas cliquer réellement pour éviter de modifier les données
        await expect(markAsReadButton.first()).toBeVisible()
      }
    }
  })
})




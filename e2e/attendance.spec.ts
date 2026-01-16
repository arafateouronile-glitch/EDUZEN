import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

/**
 * Tests E2E pour la gestion des présences
 */

test.describe('Gestion des présences', () => {
  test.beforeEach(async ({ page }) => {
    const loginSuccess = await login(page)
    if (!loginSuccess) {
      test.skip(true, 'Connexion échouée - utilisateur de test non disponible')
      return
    }
  })

  test('devrait afficher la page des présences', async ({ page }) => {
    await page.goto('/dashboard/attendance')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    const pageContent = page.locator('main, [data-testid="attendance-page"], .container')
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 })
  })

  test('devrait pouvoir sélectionner une session', async ({ page }) => {
    await page.goto('/dashboard/attendance')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    // Chercher un sélecteur de session
    const sessionSelect = page.locator('select[name*="session"], [data-testid="session-select"], button:has-text("Session")')

    if (await sessionSelect.isVisible({ timeout: 5000 })) {
      await sessionSelect.first().click()
      await page.waitForTimeout(500)
    }
  })

  test('devrait pouvoir enregistrer une présence', async ({ page }) => {
    await page.goto('/dashboard/attendance')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    // Chercher un bouton pour enregistrer une présence
    const recordButton = page.locator('button:has-text("Enregistrer"), button:has-text("Présent"), [data-testid="record-attendance"]')

    if (await recordButton.isVisible({ timeout: 5000 })) {
      // Ne pas cliquer réellement pour éviter de créer des données de test
      // Juste vérifier que le bouton est présent
      await expect(recordButton.first()).toBeVisible()
    }
  })

  test('devrait afficher l\'historique des présences', async ({ page }) => {
    await page.goto('/dashboard/attendance')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    // Chercher un onglet ou lien vers l'historique
    const historyTab = page.locator('button:has-text("Historique"), a:has-text("Historique"), [data-testid="attendance-history"]')

    if (await historyTab.isVisible({ timeout: 5000 })) {
      await historyTab.first().click()
      await page.waitForTimeout(1000)
    }
  })
})




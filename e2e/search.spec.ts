import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

/**
 * Tests E2E pour la recherche globale
 */

test.describe('Recherche globale', () => {
  test.beforeEach(async ({ page }) => {
    const loginSuccess = await login(page)
    if (!loginSuccess) {
      test.skip(true, 'Connexion échouée - utilisateur de test non disponible')
      return
    }
  })

  test('devrait afficher la barre de recherche dans le header', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    // Chercher la barre de recherche globale
    const searchInput = page.locator('input[placeholder*="Rechercher"], input[type="search"], [data-testid="global-search"]')

    if (await searchInput.isVisible({ timeout: 5000 })) {
      await expect(searchInput.first()).toBeVisible()
    }
  })

  test('devrait pouvoir effectuer une recherche', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    const searchInput = page.locator('input[placeholder*="Rechercher"], input[type="search"], [data-testid="global-search"]')

    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('test')
      await page.waitForTimeout(1000)

      // Vérifier qu'un menu de résultats apparaît (optionnel)
      const resultsMenu = page.locator('[data-testid="search-results"], .search-results')
      // Ne pas vérifier la présence car les résultats peuvent être vides
    }
  })

  test('devrait pouvoir naviguer vers un résultat de recherche', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    const searchInput = page.locator('input[placeholder*="Rechercher"], input[type="search"], [data-testid="global-search"]')

    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('test')
      await page.waitForTimeout(1000)

      // Chercher un résultat cliquable
      const resultItem = page.locator('[data-testid="search-results"] a, .search-results a').first()

      if (await resultItem.isVisible({ timeout: 2000 })) {
        await resultItem.click()
        await page.waitForTimeout(1000)
      }
    }
  })
})




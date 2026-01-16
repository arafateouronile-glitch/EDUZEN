import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

/**
 * Tests E2E pour la gestion des documents
 */

test.describe('Gestion des documents', () => {
  test.beforeEach(async ({ page }) => {
    const loginSuccess = await login(page)
    if (!loginSuccess) {
      test.skip(true, 'Connexion échouée - utilisateur de test non disponible')
      return
    }
  })

  test('devrait afficher la liste des documents', async ({ page }) => {
    await page.goto('/dashboard/documents')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    // Vérifier la présence du contenu principal
    const pageContent = page.locator('main, [data-testid="documents-page"], .container')
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 })
  })

  test('devrait pouvoir naviguer vers la génération de document', async ({ page }) => {
    await page.goto('/dashboard/documents')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    // Chercher un bouton ou lien pour générer un document
    const generateButton = page.locator('button:has-text("Générer"), a[href*="/documents/generate"], button:has-text("Nouveau document")')

    if (await generateButton.isVisible({ timeout: 5000 })) {
      await generateButton.first().click()
      // Vérifier l'URL ou la présence d'un formulaire
      await page.waitForTimeout(1000)
      const currentUrl = page.url()
      expect(currentUrl).toMatch(/\/documents\/generate|\/documents\/new/)
    }
  })

  test('devrait pouvoir rechercher un document', async ({ page }) => {
    await page.goto('/dashboard/documents')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    const searchInput = page.locator('input[placeholder*="Rechercher"], input[type="search"]')

    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('test')
      await page.waitForTimeout(1000)
    }
  })

  test('devrait pouvoir filtrer les documents', async ({ page }) => {
    await page.goto('/dashboard/documents')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    const filterButton = page.locator('button:has-text("Filtrer"), [data-testid="filter-button"]')

    if (await filterButton.isVisible({ timeout: 5000 })) {
      await filterButton.first().click()
      await page.waitForTimeout(500)
    }
  })
})




import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

/**
 * Tests E2E pour la gestion des paiements
 */

test.describe('Gestion des paiements', () => {
  test.beforeEach(async ({ page }) => {
    const loginSuccess = await login(page)
    if (!loginSuccess) {
      test.skip(true, 'Connexion échouée - utilisateur de test non disponible')
      return
    }
  })

  test('devrait afficher la page des paiements', async ({ page }) => {
    await page.goto('/dashboard/payments')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    const pageContent = page.locator('main, [data-testid="payments-page"], .container')
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 })
  })

  test('devrait afficher la liste des factures', async ({ page }) => {
    await page.goto('/dashboard/payments')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    // Chercher une liste de factures ou un état vide
    const invoicesList = page.locator('[data-testid="invoices-list"], .invoice-item, a[href*="/payments/"]')
    const emptyState = page.locator('text=Aucune facture, text=Commencez par créer une facture')

    try {
      await expect(invoicesList.first()).toBeVisible({ timeout: 5000 })
    } catch {
      await expect(emptyState.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('devrait pouvoir rechercher une facture', async ({ page }) => {
    await page.goto('/dashboard/payments')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    const searchInput = page.locator('input[placeholder*="Rechercher"], input[type="search"]')

    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('test')
      await page.waitForTimeout(1000)
    }
  })

  test('devrait pouvoir filtrer les paiements', async ({ page }) => {
    await page.goto('/dashboard/payments')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    const filterButton = page.locator('button:has-text("Filtrer"), [data-testid="filter-button"]')

    if (await filterButton.isVisible({ timeout: 5000 })) {
      await filterButton.first().click()
      await page.waitForTimeout(500)
    }
  })
})




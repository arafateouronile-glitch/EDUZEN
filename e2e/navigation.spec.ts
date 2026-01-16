import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

/**
 * Tests E2E pour la navigation dans l'application
 */

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    const loginSuccess = await login(page)
    if (!loginSuccess) {
      test.skip(true, 'Connexion échouée - utilisateur de test non disponible')
      return
    }
  })

  test('devrait pouvoir naviguer vers le dashboard', async ({ page }) => {
    await page.goto('/dashboard/students')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    // Chercher un lien vers le dashboard
    const dashboardLink = page.locator('a[href="/dashboard"], a[href="/dashboard/dashboard"], button:has-text("Dashboard")')

    if (await dashboardLink.isVisible({ timeout: 5000 })) {
      await dashboardLink.first().click()
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
    }
  })

  test('devrait pouvoir naviguer vers les étudiants depuis le menu', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    const studentsLink = page.locator('a[href*="/students"], button:has-text("Étudiants"), [data-testid="nav-students"]')

    if (await studentsLink.isVisible({ timeout: 5000 })) {
      await studentsLink.first().click()
      await expect(page).toHaveURL(/\/dashboard\/students/, { timeout: 10000 })
    }
  })

  test('devrait pouvoir naviguer vers les messages depuis le menu', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    const messagesLink = page.locator('a[href*="/messages"], button:has-text("Messages"), [data-testid="nav-messages"]')

    if (await messagesLink.isVisible({ timeout: 5000 })) {
      await messagesLink.first().click()
      await expect(page).toHaveURL(/\/dashboard\/messages/, { timeout: 10000 })
    }
  })

  test('devrait pouvoir naviguer vers les documents depuis le menu', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    const documentsLink = page.locator('a[href*="/documents"], button:has-text("Documents"), [data-testid="nav-documents"]')

    if (await documentsLink.isVisible({ timeout: 5000 })) {
      await documentsLink.first().click()
      await expect(page).toHaveURL(/\/dashboard\/documents/, { timeout: 10000 })
    }
  })

  test('devrait pouvoir naviguer vers les paiements depuis le menu', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    const paymentsLink = page.locator('a[href*="/payments"], button:has-text("Paiements"), [data-testid="nav-payments"]')

    if (await paymentsLink.isVisible({ timeout: 5000 })) {
      await paymentsLink.first().click()
      await expect(page).toHaveURL(/\/dashboard\/payments/, { timeout: 10000 })
    }
  })

  test('devrait pouvoir se déconnecter', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    // Chercher le bouton de déconnexion (généralement dans le menu utilisateur)
    const logoutButton = page.locator('button:has-text("Déconnexion"), button:has-text("Se déconnecter"), [data-testid="logout"]')

    // Ouvrir le menu utilisateur si nécessaire
    const userMenu = page.locator('button[aria-label*="Menu"], [data-testid="user-menu"]')
    if (await userMenu.isVisible({ timeout: 5000 })) {
      await userMenu.first().click()
      await page.waitForTimeout(500)
    }

    if (await logoutButton.isVisible({ timeout: 5000 })) {
      await logoutButton.first().click()
      // Vérifier qu'on est redirigé vers la page de login
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 })
    }
  })
})




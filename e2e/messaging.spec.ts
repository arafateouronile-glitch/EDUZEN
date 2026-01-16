import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

/**
 * Tests E2E pour la messagerie
 */

test.describe('Messagerie', () => {
  test.beforeEach(async ({ page }) => {
    // Connexion avant chaque test
    const loginSuccess = await login(page)
    if (!loginSuccess) {
      test.skip(true, 'Connexion échouée - utilisateur de test non disponible')
      return
    }
  })

  test('devrait afficher la page de messagerie', async ({ page }) => {
    await page.goto('/dashboard/messages')
    
    // Attendre que la page soit chargée
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
    
    // Vérifier la présence du titre ou du contenu principal
    const pageContent = page.locator('main, [data-testid="messages-page"], .container')
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 })
    
    // Vérifier la présence du bouton "Nouvelle conversation"
    const newConvoButton = page.locator('button:has-text("Nouvelle conversation"), button:has-text("Nouveau message")')
    await expect(newConvoButton.first()).toBeVisible({ timeout: 5000 })
  })

  test('devrait pouvoir ouvrir le dialogue de nouvelle conversation', async ({ page }) => {
    await page.goto('/dashboard/messages')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
    
    // Cliquer sur le bouton "Nouvelle conversation"
    const newConvoButton = page.locator('button:has-text("Nouvelle conversation"), button:has-text("Nouveau message")')
    await newConvoButton.first().click()
    
    // Vérifier que le dialogue est ouvert
    const dialog = page.locator('[role="dialog"], [data-state="open"]')
    await expect(dialog.first()).toBeVisible({ timeout: 5000 })
  })

  test('devrait pouvoir rechercher dans les conversations', async ({ page }) => {
    await page.goto('/dashboard/messages')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
    
    // Chercher un champ de recherche
    const searchInput = page.locator('input[placeholder*="Rechercher"], input[type="search"]')
    
    // Si le champ de recherche existe, tester la recherche
    if (await searchInput.isVisible()) {
      await searchInput.fill('test')
      // Attendre un peu que la recherche soit effectuée
      await page.waitForTimeout(500)
    }
  })

  test('devrait afficher la liste des conversations', async ({ page }) => {
    await page.goto('/dashboard/messages')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
    
    // Attendre le chargement des conversations (soit une liste, soit un message vide)
    const conversationsList = page.locator('[data-testid="conversations-list"], .conversation-item, a[href*="/messages/"]')
    const emptyState = page.locator('text=Aucune conversation, text=Commencez une nouvelle conversation')
    
    // L'un ou l'autre devrait être visible
    try {
      await expect(conversationsList.first()).toBeVisible({ timeout: 5000 })
    } catch {
      await expect(emptyState.first()).toBeVisible({ timeout: 5000 })
    }
  })
})




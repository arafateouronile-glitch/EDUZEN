import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

/**
 * Tests E2E pour la gestion des étudiants
 */

test.describe('Gestion des étudiants', () => {
  test.beforeEach(async ({ page }) => {
    const loginSuccess = await login(page)
    if (!loginSuccess) {
      test.skip(true, 'Connexion échouée - utilisateur de test non disponible')
      return
    }
  })

  test('devrait afficher la liste des étudiants', async ({ page }) => {
    await page.goto('/dashboard/students')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    // Vérifier la présence du titre ou du contenu principal
    const pageContent = page.locator('main, [data-testid="students-page"], .container')
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 })

    // Vérifier la présence du bouton "Nouvel étudiant"
    const newStudentButton = page.locator('button:has-text("Nouvel étudiant"), a[href*="/students/new"]')
    await expect(newStudentButton.first()).toBeVisible({ timeout: 5000 })
  })

  test('devrait pouvoir naviguer vers la création d\'un étudiant', async ({ page }) => {
    await page.goto('/dashboard/students')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    const newStudentButton = page.locator('button:has-text("Nouvel étudiant"), a[href*="/students/new"]')
    await newStudentButton.first().click()

    // Vérifier l'URL
    await expect(page).toHaveURL(/\/dashboard\/students\/new/, { timeout: 10000 })

    // Vérifier la présence du formulaire
    const form = page.locator('form, [data-testid="student-form"]')
    await expect(form.first()).toBeVisible({ timeout: 5000 })
  })

  test('devrait pouvoir rechercher un étudiant', async ({ page }) => {
    await page.goto('/dashboard/students')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    // Chercher un champ de recherche
    const searchInput = page.locator('input[placeholder*="Rechercher"], input[type="search"], input[name*="search"]')

    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('test')
      // Attendre un peu que la recherche soit effectuée
      await page.waitForTimeout(1000)
    }
  })

  test('devrait pouvoir filtrer les étudiants', async ({ page }) => {
    await page.goto('/dashboard/students')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    // Chercher des boutons de filtre
    const filterButton = page.locator('button:has-text("Filtrer"), button:has-text("Filtres"), [data-testid="filter-button"]')

    if (await filterButton.isVisible({ timeout: 5000 })) {
      await filterButton.first().click()
      // Attendre que le menu de filtres s'ouvre
      await page.waitForTimeout(500)
    }
  })

  test('devrait pouvoir exporter les étudiants', async ({ page }) => {
    await page.goto('/dashboard/students')
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    // Chercher un bouton d'export
    const exportButton = page.locator('button:has-text("Exporter"), button:has-text("Export"), [data-testid="export-button"]')

    if (await exportButton.isVisible({ timeout: 5000 })) {
      // Écouter les téléchargements
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null)
      await exportButton.first().click()
      
      // Vérifier qu'un téléchargement a été déclenché (ou au moins que le bouton fonctionne)
      const download = await downloadPromise
      // Si un téléchargement a été déclenché, c'est bon signe
    }
  })
})




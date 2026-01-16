/**
 * Script de test de la génération DOCX avec docxtemplater
 * 
 * Usage: npx tsx scripts/test-docx-generation.ts
 */

import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import * as fs from 'fs'
import * as path from 'path'

async function testDocxGeneration() {
  console.log('🧪 Test de génération DOCX avec docxtemplater\n')
  
  // Variables de test
  const testVariables = {
    // École
    ecole_nom: 'Centre de Formation Digital',
    ecole_adresse: '123 Avenue de la Formation',
    ecole_code_postal: '75001',
    ecole_ville: 'Paris',
    ecole_email: 'contact@formation-digital.fr',
    ecole_telephone: '01 23 45 67 89',
    ecole_siret: '123 456 789 00012',
    ecole_numero_declaration: '11 75 12345 67',
    ecole_region: 'Île-de-France',
    ecole_representant: 'Marie Martin',
    
    // Élève
    eleve_nom: 'Dupont',
    eleve_prenom: 'Jean',
    eleve_adresse: '456 Rue du Client',
    eleve_code_postal: '75008',
    eleve_ville: 'Paris',
    eleve_email: 'jean.dupont@email.com',
    eleve_telephone: '06 12 34 56 78',
    eleve_numero: 'E-2026-001',
    
    // Formation
    formation_nom: 'Développement Web Full-Stack',
    formation_description: 'Formation complète en développement web moderne',
    formation_duree: '400 heures',
    session_debut: '10/02/2026',
    session_fin: '10/06/2026',
    session_lieu: 'Paris - Présentiel',
    
    // Financier
    montant_ht: '5000',
    montant_ttc: '6000',
    tva: '1000',
    taux_tva: '20',
    montant_lettres: 'Six mille euros',
    mode_paiement: 'Virement bancaire',
    iban: 'FR76 1234 5678 9012 3456 7890 123',
    
    // Document
    numero_facture: 'FACT-2026-001',
    numero_devis: 'DEV-2026-001',
    date_emission: '16/01/2026',
    date_echeance: '16/02/2026',
    validite_devis: '16/02/2026',
    date_jour: '16 janvier 2026',
  }
  
  const templates = [
    { name: 'facture', file: 'template_facture.docx' },
    { name: 'devis', file: 'template_devis.docx' },
    { name: 'convention', file: 'template_convention.docx' },
  ]
  
  const outputDir = path.join(process.cwd(), 'test-output')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  for (const template of templates) {
    console.log(`📄 Test du template: ${template.name}...`)
    
    try {
      const templatePath = path.join(process.cwd(), 'public', 'docx-templates', template.file)
      
      if (!fs.existsSync(templatePath)) {
        console.log(`   ⚠️ Template non trouvé: ${templatePath}`)
        continue
      }
      
      // Lire le template
      const templateBuffer = fs.readFileSync(templatePath)
      
      // Décompresser le DOCX
      const zip = new PizZip(templateBuffer)
      
      // Créer l'instance docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{', end: '}' },
      })
      
      // Remplacer les variables
      doc.render(testVariables)
      
      // Générer le document final
      const outputBuffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      })
      
      // Sauvegarder
      const outputPath = path.join(outputDir, `test_${template.name}.docx`)
      fs.writeFileSync(outputPath, outputBuffer)
      
      console.log(`   ✅ Document généré: ${outputPath}`)
      console.log(`   📊 Taille: ${(outputBuffer.length / 1024).toFixed(2)} Ko`)
      
    } catch (error: any) {
      console.error(`   ❌ Erreur: ${error.message}`)
      
      // Afficher les erreurs docxtemplater si disponibles
      if (error.properties && error.properties.errors) {
        console.error('   📋 Erreurs détaillées:')
        error.properties.errors.forEach((e: any, i: number) => {
          console.error(`      ${i + 1}. ${e.message}`)
        })
      }
    }
  }
  
  console.log('\n✨ Tests terminés!')
  console.log(`📁 Les fichiers générés sont dans: ${outputDir}`)
  console.log('\n🔍 Ouvrez les fichiers .docx dans Word pour vérifier le rendu.')
}

testDocxGeneration().catch(console.error)

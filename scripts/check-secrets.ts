#!/usr/bin/env node

/**
 * Script de vérification des secrets et variables d'environnement
 * 
 * Usage: npm run check-secrets
 * ou: npx tsx scripts/check-secrets.ts
 */

import * as fs from 'fs'
import * as path from 'path'

interface SecretConfig {
  name: string
  required: boolean
  description: string
  envVar: string
  validate?: (value: string) => boolean
}

const REQUIRED_SECRETS: SecretConfig[] = [
  {
    name: 'Supabase URL',
    required: true,
    description: 'URL de votre projet Supabase',
    envVar: 'NEXT_PUBLIC_SUPABASE_URL',
    validate: (value) => value.startsWith('https://') && value.includes('.supabase.co'),
  },
  {
    name: 'Supabase Anon Key',
    required: true,
    description: 'Clé anonyme Supabase',
    envVar: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    validate: (value) => value.length > 20,
  },
  {
    name: 'Supabase Service Role Key',
    required: true,
    description: 'Clé service role Supabase (pour les opérations admin)',
    envVar: 'SUPABASE_SERVICE_ROLE_KEY',
    validate: (value) => value.length > 20,
  },
  {
    name: 'CRON Secret',
    required: false,
    description: 'Secret pour sécuriser les endpoints CRON',
    envVar: 'CRON_SECRET',
  },
  {
    name: 'Sentry DSN',
    required: false,
    description: 'DSN Sentry pour le monitoring (optionnel)',
    envVar: 'NEXT_PUBLIC_SENTRY_DSN',
  },
  {
    name: 'Mobile Money Webhook Secret',
    required: false,
    description: 'Secret pour valider les webhooks Mobile Money',
    envVar: 'MOBILE_MONEY_WEBHOOK_SECRET',
  },
  {
    name: 'E-signature Webhook Secret',
    required: false,
    description: 'Secret pour valider les webhooks e-signature',
    envVar: 'ESIGNATURE_WEBHOOK_SECRET',
  },
  {
    name: 'App URL',
    required: false,
    description: 'URL de base de l\'application',
    envVar: 'NEXT_PUBLIC_APP_URL',
  },
]

function checkSecrets(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Charger .env.local si disponible
  const envLocalPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, 'utf-8')
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim().replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    })
  }

  // Vérifier chaque secret
  for (const secret of REQUIRED_SECRETS) {
    const value = process.env[secret.envVar]

    if (!value) {
      if (secret.required) {
        errors.push(`❌ ${secret.name} (${secret.envVar}): MANQUANT - ${secret.description}`)
      } else {
        warnings.push(`⚠️  ${secret.name} (${secret.envVar}): Non configuré - ${secret.description}`)
      }
    } else {
      // Valider le format si une fonction de validation est fournie
      if (secret.validate && !secret.validate(value)) {
        errors.push(
          `❌ ${secret.name} (${secret.envVar}): Format invalide - ${secret.description}`
        )
      } else {
        // Masquer la valeur pour la sécurité
        const maskedValue = value.length > 10 
          ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
          : '***'
        console.log(`✅ ${secret.name} (${secret.envVar}): ${maskedValue}`)
      }
    }
  }

  // Vérifier les secrets sensibles qui ne devraient pas être commités
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /key/i,
    /token/i,
    /api[_-]?key/i,
  ]

  // Vérifier .env.local n'est pas dans git
  const gitignorePath = path.join(process.cwd(), '.gitignore')
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8')
    if (!gitignoreContent.includes('.env.local')) {
      warnings.push('⚠️  .env.local n\'est pas dans .gitignore - risque de commit accidentel')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// Exécuter la vérification
const result = checkSecrets()

console.log('\n📋 Vérification des secrets et variables d\'environnement\n')

if (result.errors.length > 0) {
  console.log('❌ ERREURS CRITIQUES:\n')
  result.errors.forEach((error) => console.log(error))
  console.log('')
}

if (result.warnings.length > 0) {
  console.log('⚠️  AVERTISSEMENTS:\n')
  result.warnings.forEach((warning) => console.log(warning))
  console.log('')
}

if (result.valid && result.warnings.length === 0) {
  console.log('✅ Tous les secrets requis sont configurés correctement!\n')
  process.exit(0)
} else if (result.valid) {
  console.log('✅ Tous les secrets requis sont configurés (mais certains secrets optionnels manquent)\n')
  process.exit(0)
} else {
  console.log('❌ Des secrets requis sont manquants ou invalides. Veuillez les configurer dans .env.local\n')
  process.exit(1)
}




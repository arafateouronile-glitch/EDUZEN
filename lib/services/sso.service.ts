/**
 * Service SSO (Single Sign-On)
 * 
 * Gère l'authentification via des fournisseurs d'identité externes
 * (Google, Microsoft, GitHub, SAML)
 */

import { createClient } from '@/lib/supabase/client'
import { logger, sanitizeError } from '@/lib/utils/logger'

export interface SSOProvider {
  id: string
  name: string
  type: 'oauth' | 'saml'
  enabled: boolean
  config: Record<string, unknown>
}

export interface SSOConfig {
  provider: string
  clientId?: string
  clientSecret?: string
  redirectUri?: string
  scopes?: string[]
  // SAML specific
  entryPoint?: string
  issuer?: string
  cert?: string
}

export class SSOService {
  private supabase = createClient()

  /**
   * Liste les fournisseurs SSO disponibles pour une organisation
   */
  async getProviders(organizationId: string): Promise<SSOProvider[]> {
    try {
      const { data, error } = await this.supabase
        .from('sso_configurations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)

      if (error) {
        logger.error('Failed to get SSO providers', error, {
          organizationId,
          error: sanitizeError(error),
        })
        return []
      }

      return (data || []).map(config => ({
        id: config.id,
        name: config.name,
        type: (config.saml_entity_id ? 'saml' : 'oauth') as 'oauth' | 'saml',
        enabled: config.is_active ?? false,
        config: {
          clientId: config.oauth_client_id,
          authorizationUrl: config.oauth_authorization_url,
          tokenUrl: config.oauth_token_url,
          scopes: config.oauth_scopes,
          samlEntityId: config.saml_entity_id,
          samlSsoUrl: config.saml_sso_url,
        },
      }))
    } catch (error) {
      logger.error('SSO getProviders error', error, {
        organizationId,
        error: sanitizeError(error),
      })
      return []
    }
  }

  /**
   * Configure un fournisseur SSO
   */
  async configureProvider(
    organizationId: string,
    config: SSOConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('sso_configurations')
        .upsert({
          organization_id: organizationId,
          name: config.provider,
          provider: config.provider,
          oauth_client_id: config.clientId,
          oauth_scopes: config.scopes,
          saml_entity_id: config.entryPoint ? config.issuer : null,
          saml_sso_url: config.entryPoint,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'organization_id,name',
        })

      if (error) {
        logger.error('Failed to configure SSO provider', error, {
          organizationId,
          provider: config.provider,
          error: sanitizeError(error),
        })
        return { success: false, error: error.message }
      }

      logger.info('SSO provider configured', {
        organizationId,
        provider: config.provider,
      })

      return { success: true }
    } catch (error) {
      logger.error('SSO configureProvider error', error, {
        organizationId,
        error: sanitizeError(error),
      })
      return { success: false, error: 'Configuration failed' }
    }
  }

  /**
   * Initie une connexion SSO
   */
  async initiateLogin(
    provider: string,
    redirectTo?: string
  ): Promise<{ url?: string; error?: string }> {
    try {
      // Utiliser Supabase Auth pour OAuth
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: provider as 'google' | 'github' | 'azure',
        options: {
          redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        logger.error('SSO login initiation failed', error, {
          provider,
          error: sanitizeError(error),
        })
        return { error: error.message }
      }

      return { url: data.url }
    } catch (error) {
      logger.error('SSO initiateLogin error', error, {
        provider,
        error: sanitizeError(error),
      })
      return { error: 'Login initiation failed' }
    }
  }

  /**
   * Gère le callback SSO
   */
  async handleCallback(code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.exchangeCodeForSession(code)

      if (error) {
        logger.error('SSO callback failed', error, {
          error: sanitizeError(error),
        })
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      logger.error('SSO handleCallback error', error, {
        error: sanitizeError(error),
      })
      return { success: false, error: 'Callback handling failed' }
    }
  }

  /**
   * Désactive un fournisseur SSO
   */
  async disableProvider(
    organizationId: string,
    providerId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('sso_configurations')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', providerId)
        .eq('organization_id', organizationId)

      if (error) {
        logger.error('Failed to disable SSO provider', error, {
          organizationId,
          providerId,
          error: sanitizeError(error),
        })
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      logger.error('SSO disableProvider error', error, {
        organizationId,
        providerId,
        error: sanitizeError(error),
      })
      return { success: false, error: 'Disable failed' }
    }
  }
}

// Export singleton instance
export const ssoService = new SSOService()

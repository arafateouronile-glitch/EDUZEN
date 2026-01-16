/**

 * Service pour l'édition collaborative en temps réel
 * Utilise Y.js pour la synchronisation et Supabase Realtime pour la communication
 */

import { createClient } from '@/lib/supabase/client'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export interface ActiveUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
  color: string
  cursor?: {
    position: number
    selection?: { from: number; to: number }
  }
}

export class RealtimeCollaborationService {
  private supabase = createClient()
  private providers: Map<string, WebsocketProvider> = new Map()
  private ydocs: Map<string, Y.Doc> = new Map()
  private activeUsers: Map<string, Map<string, ActiveUser>> = new Map() // templateId -> userId -> user

  /**
   * Initialise une session de collaboration pour un template
   */
  async initializeCollaboration(
    templateId: string,
    userId: string,
    userName: string,
    userEmail: string,
    userAvatarUrl?: string
  ): Promise<{ ydoc: Y.Doc; provider: WebsocketProvider }> {
    // Créer ou récupérer le Y.Doc pour ce template
    let ydoc = this.ydocs.get(templateId)
    if (!ydoc) {
      ydoc = new Y.Doc()
      this.ydocs.set(templateId, ydoc)
    }

    // Créer ou récupérer le provider WebSocket
    let provider = this.providers.get(templateId)
    if (!provider) {
      // Vérifier si un serveur WebSocket est configuré
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL
      
      // Si aucun serveur WebSocket n'est configuré, ne pas initialiser la collaboration
      if (!wsUrl) {
        throw new Error('Collaboration désactivée: aucun serveur WebSocket configuré (NEXT_PUBLIC_WS_URL)')
      }
      
      try {
        provider = new WebsocketProvider(wsUrl, `template-${templateId}`, ydoc, {
          params: {
            userId,
            templateId,
          },
          // Désactiver la reconnexion automatique pour éviter les erreurs répétées
          resyncInterval: -1,
        })

        // Gérer les événements de connexion
        let connectionAttempts = 0
        const maxAttempts = 3
        
        provider.on('status', (event: { status: string }) => {
          if (event.status === 'connected') {
            connectionAttempts = 0
            console.log('Collaboration status: connected')
          } else if (event.status === 'disconnected') {
            connectionAttempts++
            if (connectionAttempts <= maxAttempts) {
              console.warn(`WebSocket disconnected (tentative ${connectionAttempts}/${maxAttempts})`)
            } else {
              // Arrêter les tentatives après maxAttempts
              console.warn('WebSocket: trop de tentatives de connexion, collaboration désactivée')
              provider.destroy()
              this.providers.delete(templateId)
              throw new Error('Impossible de se connecter au serveur de collaboration après plusieurs tentatives')
            }
          }
        })

        // Gérer les erreurs de connexion
        provider.on('connection-error', (error: Error) => {
          console.warn('Erreur de connexion WebSocket:', error.message)
          // Ne pas lancer d'erreur, laisser le système gérer silencieusement
        })

        // Gérer les utilisateurs actifs via awareness
        provider.awareness.on('change', () => {
          this.updateActiveUsers(templateId, provider!)
        })

        this.providers.set(templateId, provider)
      } catch (error) {
        console.warn('Erreur lors de la création du provider WebSocket:', error)
        // Nettoyer en cas d'erreur
        if (provider) {
          try {
            provider.destroy()
          } catch (e) {
            // Ignorer les erreurs de nettoyage
          }
        }
        throw error
      }
    }

    // Ajouter l'utilisateur actuel à la liste des utilisateurs actifs
    const userColor = this.generateUserColor(userId)
    const activeUser: ActiveUser = {
      id: userId,
      name: userName,
      email: userEmail,
      avatarUrl: userAvatarUrl,
      color: userColor,
    }

    if (!this.activeUsers.has(templateId)) {
      this.activeUsers.set(templateId, new Map())
    }
    this.activeUsers.get(templateId)!.set(userId, activeUser)

    // Mettre à jour l'awareness avec les informations de l'utilisateur
    provider.awareness.setLocalStateField('user', activeUser)

    return { ydoc, provider }
  }

  /**
   * Met à jour la position du curseur de l'utilisateur
   */
  updateCursor(
    templateId: string,
    userId: string,
    position: number,
    selection?: { from: number; to: number }
  ) {
    const provider = this.providers.get(templateId)
    if (!provider) return

    const activeUsers = this.activeUsers.get(templateId)
    if (!activeUsers) return

    const user = activeUsers.get(userId)
    if (!user) return

    user.cursor = { position, selection }
    provider.awareness.setLocalStateField('user', user)
  }

  /**
   * Récupère les utilisateurs actifs pour un template
   */
  getActiveUsers(templateId: string): ActiveUser[] {
    const users = this.activeUsers.get(templateId)
    if (!users) return []

    return Array.from(users.values())
  }

  /**
   * Met à jour la liste des utilisateurs actifs depuis l'awareness
   */
  private updateActiveUsers(templateId: string, provider: WebsocketProvider) {
    const states = provider.awareness.getStates()
    const users = new Map<string, ActiveUser>()

    states.forEach((state: { user?: ActiveUser }, clientId: number) => {
      if (state.user) {
        const user = state.user as ActiveUser
        users.set(user.id, user)
      }
    })

    this.activeUsers.set(templateId, users)
  }

  /**
   * Génère une couleur unique pour un utilisateur
   */
  private generateUserColor(userId: string): string {
    const colors = [
      '#335ACF', // Bleu
      '#10B981', // Vert
      '#F59E0B', // Orange
      '#EF4444', // Rouge
      '#8B5CF6', // Violet
      '#EC4899', // Rose
      '#06B6D4', // Cyan
      '#84CC16', // Lime
    ]

    // Utiliser un hash simple pour obtenir une couleur cohérente
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  /**
   * Déconnecte un utilisateur d'une session de collaboration
   */
  disconnect(templateId: string, userId: string) {
    const provider = this.providers.get(templateId)
    if (provider) {
      provider.awareness.setLocalStateField('user', null)
    }

    const users = this.activeUsers.get(templateId)
    if (users) {
      users.delete(userId)
    }
  }

  /**
   * Nettoie toutes les sessions de collaboration
   */
  cleanup(templateId: string) {
    const provider = this.providers.get(templateId)
    if (provider) {
      provider.destroy()
      this.providers.delete(templateId)
    }

    const ydoc = this.ydocs.get(templateId)
    if (ydoc) {
      ydoc.destroy()
      this.ydocs.delete(templateId)
    }

    this.activeUsers.delete(templateId)
  }

  /**
   * Synchronise le contenu Y.js avec le template Supabase
   */
  async syncToSupabase(templateId: string, ydoc: Y.Doc, section: 'header' | 'body' | 'footer') {
    const yXmlFragment = ydoc.getXmlFragment(section)
    const content = yXmlFragment.toString()

    // Mettre à jour le template dans Supabase
    const updateData: Record<string, { html: string; elements: unknown[] }> = {}
    if (section === 'header') {
      updateData.header = { html: content, elements: [] }
    } else if (section === 'body') {
      updateData.content = { html: content, elements: [] }
    } else if (section === 'footer') {
      updateData.footer = { html: content, elements: [] }
    }

    const { error } = await this.supabase
      .from('document_templates')
      .update(updateData)
      .eq('id', templateId)

    if (error) {
      console.error('Erreur lors de la synchronisation:', error)
      throw error
    }
  }

  /**
   * Charge le contenu depuis Supabase vers Y.js
   */
  async loadFromSupabase(templateId: string, ydoc: Y.Doc, section: 'header' | 'body' | 'footer') {
    const { data, error } = await this.supabase
      .from('document_templates')
      .select('header, content, footer')
      .eq('id', templateId)
      .single()

    if (error) throw error

    let content = ''
    if (section === 'header') {
      content = (data.header as any)?.html || ''
    } else if (section === 'body') {
      content = (data.content as any)?.html || ''
    } else if (section === 'footer') {
      content = (data.footer as any)?.html || ''
    }

    // Convertir le HTML en XML pour Y.js
    const yXmlFragment = ydoc.getXmlFragment(section)
    yXmlFragment.insert(0, content)
  }
}

export const realtimeCollaborationService = new RealtimeCollaborationService()

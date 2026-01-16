'use client'

import React from 'react'
import { Avatar } from './avatar'
import { Card, CardContent, CardHeader, CardTitle } from './card'

/**
 * Composant de démonstration pour afficher toutes les couleurs d'avatars
 * Utile pour voir la palette complète
 */
export function AvatarColorDemo() {
  const sampleNames = [
    'Jean Dupont',
    'Marie Martin',
    'Pierre Durand',
    'Sophie Bernard',
    'Lucas Petit',
    'Emma Rousseau',
    'Thomas Moreau',
    'Léa Laurent',
    'Antoine Simon',
    'Julie Michel',
    'Nicolas Garcia',
    'Camille David',
    'Alexandre Leroy',
    'Manon Fournier',
    'Maxime Girard',
    'Clara Bonnet',
    'Hugo Lefebvre',
    'Élise Mercier',
  ]

  return (
    <Card variant="premium" className="p-6">
      <CardHeader>
        <CardTitle className="text-2xl font-display font-bold text-gradient-primary">
          Palette de Couleurs Avatars
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Les couleurs sont attribuées de manière déterministe basée sur le nom ou l'ID de l'utilisateur
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {sampleNames.map((name, index) => (
            <div key={index} className="flex flex-col items-center space-y-2">
              <Avatar
                fallback={name}
                userId={`user-${index}`}
                size="lg"
                variant="auto"
                className="shadow-lg"
              />
              <p className="text-xs font-medium text-center text-muted-foreground max-w-[80px] truncate">
                {name}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-sm font-medium text-foreground mb-2">
            💡 Comment ça fonctionne ?
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Chaque utilisateur obtient une couleur unique basée sur son ID ou nom</li>
            <li>La même personne aura toujours la même couleur (cohérence visuelle)</li>
            <li>18 couleurs premium réparties sur toute la palette</li>
            <li>Gradients sophistiqués avec shadows matching automatiques</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

























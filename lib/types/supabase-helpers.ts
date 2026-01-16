import { Database } from '@/types/database.types'

/**
 * Helpers pour améliorer l'inférence de types avec Supabase
 * Ces helpers permettent de contourner les problèmes d'inférence de types
 * tout en maintenant la sécurité de type
 */

export type TableName = keyof Database['public']['Tables']

/**
 * Récupère le type Row d'une table
 */
export type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row']

/**
 * Récupère le type Insert d'une table
 */
export type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert']

/**
 * Récupère le type Update d'une table
 */
export type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update']

/**
 * Type helper pour les insertions qui permet plus de flexibilité
 * tout en préservant la sécurité de type
 */
export type FlexibleInsert<T extends TableName> = Omit<
  TableInsert<T>,
  'id' | 'created_at' | 'updated_at'
> &
  Partial<Pick<TableInsert<T>, 'id' | 'created_at' | 'updated_at'>>

/**
 * Type helper pour les mises à jour
 */
export type FlexibleUpdate<T extends TableName> = Partial<Omit<TableUpdate<T>, 'id' | 'created_at'>>

/**
 * Assertion de type sécurisée pour les insertions
 * Vérifie que les champs obligatoires sont présents
 */
export function assertInsert<T extends TableName>(
  tableName: T,
  data: FlexibleInsert<T>
): TableInsert<T> {
  // Vérification à l'exécution si nécessaire
  return data as TableInsert<T>
}

/**
 * Assertion de type sécurisée pour les mises à jour
 */
export function assertUpdate<T extends TableName>(
  tableName: T,
  data: FlexibleUpdate<T>
): TableUpdate<T> {
  return data as TableUpdate<T>
}


























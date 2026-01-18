'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, GripVertical, Code, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DocumentVariables } from '@/lib/types/document-templates'
import { GlassCard } from '@/components/ui/glass-card'
import { motion, AnimatePresence } from '@/components/ui/motion'

interface VariableCategory {
  name: string
  icon?: React.ElementType
  variables: Array<{
    key: string
    label: string
    description?: string
  }>
}

const VARIABLE_CATEGORIES: VariableCategory[] = [
  {
    name: 'Établissement',
    variables: [
      { key: 'ecole_nom', label: 'Nom de l\'école' },
      { key: 'ecole_adresse', label: 'Adresse de l\'école' },
      { key: 'ecole_ville', label: 'Ville de l\'école' },
      { key: 'ecole_code_postal', label: 'Code postal' },
      { key: 'ecole_telephone', label: 'Téléphone de l\'école' },
      { key: 'ecole_email', label: 'Email de l\'école' },
      { key: 'ecole_site_web', label: 'Site web de l\'école' },
      { key: 'ecole_slogan', label: 'Slogan de l\'école' },
      { key: 'ecole_logo', label: 'Logo de l\'école' },
      { key: 'ecole_siret', label: 'SIRET' },
      { key: 'ecole_region', label: 'Région' },
      { key: 'ecole_numero_declaration', label: 'N° de déclaration d\'activité' },
      { key: 'ecole_representant', label: 'Représentant légal' },
    ],
  },
  {
    name: 'Élève',
    variables: [
      { key: 'eleve_nom', label: 'Nom de l\'élève' },
      { key: 'eleve_prenom', label: 'Prénom de l\'élève' },
      { key: 'eleve_numero', label: 'Numéro de l\'élève' },
      { key: 'eleve_date_naissance', label: 'Date de naissance' },
      { key: 'eleve_classe', label: 'Classe de l\'élève' },
      { key: 'eleve_photo', label: 'Photo de l\'élève' },
      { key: 'eleve_adresse', label: 'Adresse de l\'élève' },
      { key: 'eleve_telephone', label: 'Téléphone de l\'élève' },
      { key: 'eleve_email', label: 'Email de l\'élève' },
    ],
  },
  {
    name: 'Tuteur',
    variables: [
      { key: 'tuteur_nom', label: 'Nom du tuteur' },
      { key: 'tuteur_telephone', label: 'Téléphone du tuteur' },
      { key: 'tuteur_email', label: 'Email du tuteur' },
      { key: 'tuteur_adresse', label: 'Adresse du tuteur' },
    ],
  },
  {
    name: 'Formation',
    variables: [
      { key: 'formation_nom', label: 'Nom de la formation' },
      { key: 'formation_code', label: 'Code de la formation' },
      { key: 'formation_duree', label: 'Durée de la formation' },
      { key: 'formation_prix', label: 'Prix de la formation' },
      { key: 'formation_dates', label: 'Dates de la formation' },
      { key: 'formation_description', label: 'Description de la formation' },
    ],
  },
  {
    name: 'Session',
    variables: [
      { key: 'session_nom', label: 'Nom de la session' },
      { key: 'session_debut', label: 'Date de début' },
      { key: 'session_fin', label: 'Date de fin' },
      { key: 'session_lieu', label: 'Lieu de la session' },
      { key: 'session_horaires', label: 'Horaires de la session' },
    ],
  },
  {
    name: 'Finances',
    variables: [
      { key: 'montant', label: 'Montant' },
      { key: 'montant_lettres', label: 'Montant en lettres' },
      { key: 'montant_ttc', label: 'Montant TTC' },
      { key: 'montant_ht', label: 'Montant HT' },
      { key: 'tva', label: 'TVA' },
      { key: 'taux_tva', label: 'Taux de TVA (%)' },
      { key: 'date_paiement', label: 'Date de paiement' },
      { key: 'date_echeance', label: 'Date d\'échéance' },
      { key: 'mode_paiement', label: 'Mode de paiement' },
      { key: 'numero_facture', label: 'Numéro de facture' },
      { key: 'numero_devis', label: 'Numéro de devis' },
      { key: 'validite_devis', label: 'Validité du devis' },
    ],
  },
  {
    name: 'Dates',
    variables: [
      { key: 'date_jour', label: 'Date du jour' },
      { key: 'date_emission', label: 'Date d\'émission' },
      { key: 'annee_scolaire', label: 'Année scolaire' },
      { key: 'trimestre', label: 'Trimestre' },
      { key: 'semestre', label: 'Semestre' },
    ],
  },
  {
    name: 'Notes',
    variables: [
      { key: 'moyenne', label: 'Moyenne' },
      { key: 'moyenne_classe', label: 'Moyenne de la classe' },
      { key: 'classement', label: 'Classement' },
      { key: 'appreciations', label: 'Appréciations' },
      { key: 'mention', label: 'Mention' },
    ],
  },
  {
    name: 'Convocation',
    variables: [
      { key: 'convocation_objet', label: 'Objet de la convocation' },
      { key: 'convocation_date', label: 'Date de convocation' },
      { key: 'convocation_heure', label: 'Heure de convocation' },
      { key: 'convocation_lieu', label: 'Lieu de convocation' },
      { key: 'convocation_adresse', label: 'Adresse de convocation' },
      { key: 'convocation_duree', label: 'Durée prévue' },
      { key: 'convocation_contenu', label: 'Contenu/Ordre du jour' },
      { key: 'date_confirmation', label: 'Date limite de confirmation' },
    ],
  },
  {
    name: 'Notes & Évaluations',
    variables: [
      { key: 'matiere_1', label: 'Matière 1' },
      { key: 'matiere_2', label: 'Matière 2' },
      { key: 'matiere_3', label: 'Matière 3' },
      { key: 'coef_1', label: 'Coefficient 1' },
      { key: 'coef_2', label: 'Coefficient 2' },
      { key: 'coef_3', label: 'Coefficient 3' },
      { key: 'note_1', label: 'Note 1' },
      { key: 'note_2', label: 'Note 2' },
      { key: 'note_3', label: 'Note 3' },
      { key: 'appreciation_1', label: 'Appréciation 1' },
      { key: 'appreciation_2', label: 'Appréciation 2' },
      { key: 'appreciation_3', label: 'Appréciation 3' },
      { key: 'effectif_classe', label: 'Effectif de la classe' },
    ],
  },
  {
    name: 'Programme',
    variables: [
      { key: 'formation_objectifs', label: 'Objectifs de la formation' },
      { key: 'prerequis_1', label: 'Prérequis 1' },
      { key: 'prerequis_2', label: 'Prérequis 2' },
      { key: 'prerequis_3', label: 'Prérequis 3' },
      { key: 'module_1_titre', label: 'Module 1 - Titre' },
      { key: 'module_1_duree', label: 'Module 1 - Durée' },
      { key: 'module_1_contenu_1', label: 'Module 1 - Contenu 1' },
      { key: 'module_1_contenu_2', label: 'Module 1 - Contenu 2' },
      { key: 'module_1_contenu_3', label: 'Module 1 - Contenu 3' },
      { key: 'module_2_titre', label: 'Module 2 - Titre' },
      { key: 'module_2_duree', label: 'Module 2 - Durée' },
      { key: 'module_2_contenu_1', label: 'Module 2 - Contenu 1' },
      { key: 'module_2_contenu_2', label: 'Module 2 - Contenu 2' },
      { key: 'module_2_contenu_3', label: 'Module 2 - Contenu 3' },
      { key: 'module_3_titre', label: 'Module 3 - Titre' },
      { key: 'module_3_duree', label: 'Module 3 - Durée' },
      { key: 'module_3_contenu_1', label: 'Module 3 - Contenu 1' },
      { key: 'module_3_contenu_2', label: 'Module 3 - Contenu 2' },
      { key: 'module_3_contenu_3', label: 'Module 3 - Contenu 3' },
    ],
  },
  {
    name: 'Règlement & Horaires',
    variables: [
      { key: 'horaires_ouverture', label: 'Horaires d\'ouverture' },
      { key: 'horaires_cours', label: 'Horaires des cours' },
    ],
  },
  {
    name: 'Assiduité',
    variables: [
      { key: 'heures_suivies', label: 'Heures suivies' },
      { key: 'heures_totales', label: 'Heures totales' },
      { key: 'taux_assiduite', label: 'Taux d\'assiduité (%)' },
    ],
  },
  {
    name: 'Divers',
    variables: [
      { key: 'numero_document', label: 'Numéro du document' },
      { key: 'validite_document', label: 'Validité du document' },
      { key: 'code_verification', label: 'Code de vérification' },
      { key: 'date_generation', label: 'Date de génération' },
      { key: 'heure', label: 'Heure' },
      { key: 'annee_actuelle', label: 'Année actuelle' },
      { key: 'copyright', label: 'Copyright' },
      { key: 'numero_page', label: 'Numéro de page' },
      { key: 'total_pages', label: 'Total de pages' },
    ],
  },
]

interface VariablesSidebarProps {
  onVariableSelect: (variable: string) => void
  className?: string
}

export function VariablesSidebar({ onVariableSelect, className }: VariablesSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showConditionalsHelp, setShowConditionalsHelp] = useState(false)
  const [showLoopsHelp, setShowLoopsHelp] = useState(false)
  const [showCalculatedHelp, setShowCalculatedHelp] = useState(false)
  const [showDynamicTablesHelp, setShowDynamicTablesHelp] = useState(false)
  const [showVisibilityHelp, setShowVisibilityHelp] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(VARIABLE_CATEGORIES.map((cat) => cat.name))
  )

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName)
    } else {
      newExpanded.add(categoryName)
    }
    setExpandedCategories(newExpanded)
  }

  const filteredCategories = VARIABLE_CATEGORIES.map((category) => ({
    ...category,
    variables: category.variables.filter(
      (variable) =>
        variable.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        variable.key.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((category) => category.variables.length > 0)

  const handleVariableClick = (variableKey: string) => {
    onVariableSelect(variableKey)
  }

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Balises à glisser-déposer</CardTitle>
        <div className="mt-3">
          <Input
            placeholder="Rechercher une balise"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-text-tertiary" />}
            className="w-full"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-2">
          <AnimatePresence>
            {filteredCategories.map((category, index) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="space-y-1"
              >
                <button
                  onClick={() => toggleCategory(category.name)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-sm font-semibold text-text-primary hover:bg-bg-gray-100 rounded transition-all duration-200 hover:shadow-sm"
                >
                  <span>{category.name}</span>
                  <motion.span
                    animate={{ rotate: expandedCategories.has(category.name) ? 0 : 180 }}
                    transition={{ duration: 0.2 }}
                    className="text-text-tertiary"
                  >
                    {expandedCategories.has(category.name) ? '−' : '+'}
                  </motion.span>
                </button>
                <AnimatePresence>
                  {expandedCategories.has(category.name) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-1 pl-2 overflow-hidden"
                    >
                      {category.variables.map((variable, varIndex) => (
                        <motion.div
                          key={variable.key}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: varIndex * 0.03 }}
                        >
                          <button
                            onClick={() => handleVariableClick(variable.key)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-brand-blue-ghost hover:text-brand-blue rounded-lg transition-all duration-200 cursor-move group hover:shadow-sm hover:scale-[1.02]"
                            draggable
                            onDragStart={(e) => {
                              // Format pour le nouveau système de drag & drop avec TipTap VariableExtension
                              e.dataTransfer.setData('application/x-variable-id', variable.key)
                              e.dataTransfer.setData('application/x-variable-label', variable.label)
                              e.dataTransfer.setData('application/x-variable-value', `{${variable.key}}`)
                              // Formats de fallback
                              e.dataTransfer.setData('text/html', `{${variable.key}}`)
                              e.dataTransfer.setData('text/plain', variable.key)
                              e.dataTransfer.effectAllowed = 'copy'
                              e.dataTransfer.dropEffect = 'copy'
                              // Ajouter une classe pour le feedback visuel
                              const target = e.currentTarget
                              target.style.opacity = '0.5'
                            }}
                            onDragEnd={(e) => {
                              const target = e.currentTarget
                              target.style.opacity = '1'
                            }}
                          >
                            <GripVertical className="h-4 w-4 text-text-tertiary group-hover:text-brand-blue transition-all duration-200 group-hover:scale-110" />
                            <span className="flex-1 text-left">{variable.label}</span>
                            <code className="text-xs text-brand-blue bg-brand-blue-ghost px-1.5 py-0.5 rounded transition-all duration-200 group-hover:bg-brand-blue group-hover:text-white">
                              {`{${variable.key}}`}
                            </code>
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {filteredCategories.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-text-tertiary text-sm"
          >
            Aucune balise trouvée pour "{searchQuery}"
          </motion.div>
        )}
      </CardContent>
      
      {/* Section d'aide pour les conditions */}
      <div className="border-t p-4">
        <GlassCard variant="subtle" className="p-3">
          <button
            onClick={() => setShowConditionalsHelp(!showConditionalsHelp)}
            className="w-full flex items-center justify-between text-sm font-semibold text-text-primary"
          >
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-brand-blue" />
              <span>Conditions (IF/ELSE)</span>
            </div>
            {showConditionalsHelp ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          <AnimatePresence>
            {showConditionalsHelp && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 space-y-3 text-xs text-text-secondary overflow-hidden"
              >
              <div>
                <p className="font-semibold mb-1">Condition simple :</p>
                <code className="block bg-gray-100 p-2 rounded text-xs">
                  {`{IF variable}\n  Contenu affiché si variable existe\n{ENDIF}`}
                </code>
              </div>
              
              <div>
                <p className="font-semibold mb-1">Avec ELSE :</p>
                <code className="block bg-gray-100 p-2 rounded text-xs">
                  {`{IF variable}\n  Contenu si vrai\n{ELSE}\n  Contenu si faux\n{ENDIF}`}
                </code>
              </div>
              
              <div>
                <p className="font-semibold mb-1">Comparaisons :</p>
                <code className="block bg-gray-100 p-2 rounded text-xs">
                  {`{IF montant > 1000}\n  Montant élevé\n{ENDIF}\n\n{IF eleve_classe == "Terminale"}\n  Classe terminale\n{ENDIF}`}
                </code>
              </div>
              
              <div className="pt-2 border-t">
                <p className="text-xs text-text-tertiary">
                  Opérateurs supportés : <code>==</code>, <code>!=</code>, <code>&gt;</code>, <code>&lt;</code>, <code>&gt;=</code>, <code>&lt;=</code>
                </p>
              </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      {/* Section d'aide pour les boucles */}
      <div className="border-t p-4">
        <GlassCard variant="subtle" className="p-3">
          <button
            onClick={() => setShowLoopsHelp(!showLoopsHelp)}
            className="w-full flex items-center justify-between text-sm font-semibold text-text-primary"
          >
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-brand-blue" />
              <span>Boucles (FOR/WHILE)</span>
            </div>
            {showLoopsHelp ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          <AnimatePresence>
            {showLoopsHelp && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 space-y-3 text-xs text-text-secondary overflow-hidden"
              >
              <div>
                <p className="font-semibold mb-1">Boucle FOR sur tableau :</p>
                <code className="block bg-gray-100 p-2 rounded text-xs">
                  {`{FOR item IN items}\n  {item.nom} - {item.prix}\n{ENDFOR}`}
                </code>
              </div>
              
              <div>
                <p className="font-semibold mb-1">Boucle FOR sur plage :</p>
                <code className="block bg-gray-100 p-2 rounded text-xs">
                  {`{FOR i FROM 1 TO 10}\n  Ligne {i}\n{ENDFOR}`}
                </code>
              </div>
              
              <div>
                <p className="font-semibold mb-1">Variables de boucle :</p>
                <code className="block bg-gray-100 p-2 rounded text-xs">
                  {`{item_index} - Index (0-based)\n{item_number} - Numéro (1-based)\n{item_is_first} - Première itération\n{item_is_last} - Dernière itération`}
                </code>
              </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      {/* Section d'aide pour les tableaux dynamiques */}
      <div className="border-t p-4">
        <GlassCard variant="subtle" className="p-3">
          <button
            onClick={() => setShowDynamicTablesHelp(!showDynamicTablesHelp)}
            className="w-full flex items-center justify-between text-sm font-semibold text-text-primary"
          >
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-brand-blue" />
              <span>Tableaux dynamiques</span>
            </div>
            {showDynamicTablesHelp ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          <AnimatePresence>
            {showDynamicTablesHelp && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 space-y-3 text-xs text-text-secondary overflow-hidden"
              >
              <div>
                <p className="font-semibold mb-1">Tableau dynamique :</p>
                <code className="block bg-gray-100 p-2 rounded text-xs">
                  {`{TABLE items}\n  <table>\n    <thead>...</thead>\n    {ROW}\n      <tr><td>{item.nom}</td></tr>\n    {ENDROW}\n  </table>\n{ENDTABLE}`}
                </code>
              </div>
              
              <div>
                <p className="font-semibold mb-1">Ligne conditionnelle :</p>
                <code className="block bg-gray-100 p-2 rounded text-xs">
                  {`{IF_ROW item.prix > 100}\n  <tr class="highlight">...</tr>\n{ENDIF_ROW}`}
                </code>
              </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      {/* Section d'aide pour la visibilité conditionnelle */}
      <div className="border-t p-4">
        <GlassCard variant="subtle" className="p-3">
          <button
            onClick={() => setShowVisibilityHelp(!showVisibilityHelp)}
            className="w-full flex items-center justify-between text-sm font-semibold text-text-primary"
          >
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-brand-blue" />
              <span>Visibilité conditionnelle</span>
            </div>
            {showVisibilityHelp ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          <AnimatePresence>
            {showVisibilityHelp && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 space-y-3 text-xs text-text-secondary overflow-hidden"
              >
              <div>
                <p className="font-semibold mb-1">Afficher conditionnellement :</p>
                <code className="block bg-gray-100 p-2 rounded text-xs">
                  {`{SHOW_IF condition}\n  Contenu affiché si vrai\n{ELSE}\n  Contenu alternatif\n{END_SHOW}`}
                </code>
              </div>
              
              <div>
                <p className="font-semibold mb-1">Masquer conditionnellement :</p>
                <code className="block bg-gray-100 p-2 rounded text-xs">
                  {`{HIDE_IF condition}\n  Contenu masqué si vrai\n{END_HIDE}`}
                </code>
              </div>
              
              <div>
                <p className="font-semibold mb-1">Classes CSS conditionnelles :</p>
                <code className="block bg-gray-100 p-2 rounded text-xs">
                  {`<div class="{IF condition}visible{ELSE}hidden{ENDIF}">`}
                </code>
              </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      {/* Section d'aide pour les fonctions calculées */}
      <div className="border-t p-4">
        <GlassCard variant="subtle" className="p-3">
          <button
            onClick={() => setShowCalculatedHelp(!showCalculatedHelp)}
            className="w-full flex items-center justify-between text-sm font-semibold text-text-primary"
          >
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-brand-blue" />
              <span>Fonctions calculées</span>
            </div>
            {showCalculatedHelp ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          <AnimatePresence>
            {showCalculatedHelp && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 space-y-3 text-xs text-text-secondary overflow-hidden"
              >
              <div>
                <p className="font-semibold mb-1">Calculs :</p>
                <code className="block bg-gray-100 p-2 rounded text-xs">
                  {`{SUM notes} - Somme\n{AVERAGE notes} - Moyenne\n{COUNT items} - Nombre\n{MIN values} - Minimum\n{MAX values} - Maximum`}
                </code>
              </div>
              
              <div>
                <p className="font-semibold mb-1">Formatage :</p>
                <code className="block bg-gray-100 p-2 rounded text-xs">
                  {`{ROUND montant 2} - Arrondir\n{FORMAT_CURRENCY montant EUR} - Devise\n{FORMAT_DATE date DD/MM/YYYY} - Date`}
                </code>
              </div>
              
              <div>
                <p className="font-semibold mb-1">Texte :</p>
                <code className="block bg-gray-100 p-2 rounded text-xs">
                  {`{UPPERCASE texte} - Majuscules\n{LOWERCASE texte} - Minuscules\n{CAPITALIZE texte} - Première lettre majuscule`}
                </code>
              </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>
    </Card>
  )
}






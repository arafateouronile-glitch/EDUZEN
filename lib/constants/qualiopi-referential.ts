/**
 * Référentiel Qualiopi : 7 critères et 32 indicateurs, avec la méthodologie
 * de chaque indicateur. Partagé par le portail auditeur et le simulateur
 * d'auto-évaluation public (/outils).
 */

export interface QualiopiCriterion {
  number: number
  name: string
  description: string
  indicators: QualiopiIndicatorDefinition[]
}

export interface QualiopiIndicatorDefinition {
  number: number
  name: string
  description: string
  methodology?: string
}

// ============================================================================
// Référentiel Qualiopi - Les 7 critères et 32 indicateurs
// ============================================================================

export const QUALIOPI_REFERENTIAL: QualiopiCriterion[] = [
  {
    number: 1,
    name: 'Conditions d\'information du public',
    description: 'Les conditions d\'information du public sur les prestations proposées, les délais pour y accéder et les résultats obtenus.',
    indicators: [
      { number: 1, name: 'Information sur les prestations', description: 'Diffusion d\'une information accessible sur les prestations, résultats obtenus et tarifs.', methodology: 'Assurez-vous que vos tarifs et prérequis sont publiés sur votre site web et accessibles à tous. EDUZEN génère automatiquement cette preuve lors de la publication d\'un programme.' },
      { number: 2, name: 'Indicateurs de résultats', description: 'Diffusion d\'indicateurs de résultats adaptés à la nature des prestations.', methodology: 'Publiez vos taux de réussite, satisfaction et insertion. EDUZEN calcule automatiquement ces indicateurs à partir des questionnaires et certifications.' },
      { number: 3, name: 'Délais d\'accès', description: 'Information sur les délais d\'accès aux prestations.', methodology: 'Indiquez clairement les délais d\'inscription sur vos supports. Le délai moyen est automatiquement calculé par EDUZEN.' },
    ]
  },
  {
    number: 2,
    name: 'Identification précise des objectifs',
    description: 'L\'identification précise des objectifs des prestations proposées et l\'adaptation de ces prestations aux publics bénéficiaires.',
    indicators: [
      { number: 4, name: 'Analyse du besoin', description: 'Analyse du besoin du bénéficiaire en lien avec l\'entreprise et/ou le financeur.', methodology: 'Utilisez le formulaire d\'inscription EDUZEN qui inclut automatiquement l\'analyse des besoins et les attentes du stagiaire.' },
      { number: 5, name: 'Objectifs opérationnels', description: 'Définition des objectifs opérationnels et évaluables.', methodology: 'Vos programmes EDUZEN doivent contenir des objectifs SMART. Vérifiez que chaque module a des objectifs mesurables.' },
      { number: 6, name: 'Contenu et modalités', description: 'Établissement du contenu et des modalités de mise en œuvre.', methodology: 'Le programme de formation doit détailler le contenu, la durée et les modalités. EDUZEN génère automatiquement ces documents.' },
      { number: 7, name: 'Adéquation contenus/objectifs', description: 'Adéquation des contenus aux objectifs définis.', methodology: 'Assurez-vous que chaque séquence pédagogique correspond à un objectif. Utilisez la matrice de correspondance EDUZEN.' },
      { number: 8, name: 'Procédures de positionnement', description: 'Procédures de positionnement et d\'évaluation des acquis à l\'entrée.', methodology: 'Intégrez un test de positionnement initial. EDUZEN permet de créer des quiz d\'évaluation des prérequis.' },
    ]
  },
  {
    number: 3,
    name: 'Adaptation aux publics bénéficiaires',
    description: 'L\'adaptation aux publics bénéficiaires des prestations et des modalités d\'accueil, d\'accompagnement, de suivi et d\'évaluation.',
    indicators: [
      { number: 9, name: 'Conditions de déroulement', description: 'Information sur les conditions de déroulement.', methodology: 'La convocation et le règlement intérieur doivent être envoyés avant le début. EDUZEN automatise cet envoi.' },
      { number: 10, name: 'Adaptation de la prestation', description: 'Adaptation de la prestation, de l\'accompagnement et du suivi.', methodology: 'Documentez les adaptations individuelles. Utilisez les notes de suivi EDUZEN pour chaque stagiaire.' },
      { number: 11, name: 'Évaluation de l\'atteinte', description: 'Évaluation de l\'atteinte des objectifs par les bénéficiaires.', methodology: 'Les quiz et évaluations de fin de formation prouvent l\'atteinte des objectifs. EDUZEN trace automatiquement ces résultats.' },
      { number: 12, name: 'Engagement des bénéficiaires', description: 'Mesures favorisant l\'engagement des bénéficiaires.', methodology: 'Suivez l\'assiduité via les émargements QR Code EDUZEN. Un taux de présence élevé prouve l\'engagement.' },
      { number: 13, name: 'Coordination des intervenants', description: 'Coordination des intervenants internes et/ou externes.', methodology: 'Planifiez les interventions dans le calendrier EDUZEN. Les réunions de coordination doivent être tracées.' },
      { number: 14, name: 'Exercice de la citoyenneté', description: 'Exercice de la citoyenneté des bénéficiaires (CFA).', methodology: 'Indicateur spécifique CFA : documentez les actions citoyennes et le conseil de perfectionnement.' },
      { number: 15, name: 'Accompagnement socio-professionnel', description: 'Accompagnement socio-professionnel, éducatif et relatif à l\'exercice de la citoyenneté (CFA).', methodology: 'Indicateur spécifique CFA : tracez les entretiens individuels et l\'accompagnement vers l\'emploi.' },
      { number: 16, name: 'Accessibilité handicap', description: 'Conformité du règlement intérieur et conditions d\'accessibilité aux PSH.', methodology: 'Désignez un référent handicap et documentez les aménagements. Utilisez le module Accessibilité EDUZEN.' },
    ]
  },
  {
    number: 4,
    name: 'Adéquation des moyens pédagogiques',
    description: 'L\'adéquation des moyens pédagogiques, techniques et d\'encadrement aux prestations mises en œuvre.',
    indicators: [
      { number: 17, name: 'Moyens humains et techniques', description: 'Adéquation des moyens humains et techniques aux prestations.', methodology: 'Conservez les CV et diplômes des formateurs dans EDUZEN. Listez les équipements techniques utilisés.' },
      { number: 18, name: 'Coordination des apprentis', description: 'Coordination des acteurs de l\'alternance (CFA).', methodology: 'Indicateur spécifique CFA : documentez les échanges avec les maîtres d\'apprentissage et tuteurs.' },
      { number: 19, name: 'Ressources pédagogiques', description: 'Mise à disposition des ressources pédagogiques et accès aux ressources.', methodology: 'Les supports de cours doivent être accessibles aux stagiaires. Utilisez la médiathèque EDUZEN.' },
      { number: 20, name: 'Personnels dédiés handicap', description: 'Personnel dédié à l\'accompagnement des PSH.', methodology: 'Nommez un référent handicap formé. Documentez ses actions dans le module Accessibilité.' },
    ]
  },
  {
    number: 5,
    name: 'Qualification et développement des compétences',
    description: 'La qualification et le développement des connaissances et compétences des personnels.',
    indicators: [
      { number: 21, name: 'Compétences des intervenants', description: 'Détermination des compétences des intervenants internes et/ou externes.', methodology: 'Créez une fiche formateur avec CV, diplômes et expériences. EDUZEN stocke ces documents de manière sécurisée.' },
      { number: 22, name: 'Développement des compétences', description: 'Entretien et développement des compétences des salariés.', methodology: 'Établissez un plan de formation pour votre équipe. Tracez les formations suivies par vos formateurs.' },
    ]
  },
  {
    number: 6,
    name: 'Inscription dans l\'environnement professionnel',
    description: 'L\'inscription et l\'investissement du prestataire dans son environnement professionnel.',
    indicators: [
      { number: 23, name: 'Veille légale et réglementaire', description: 'Réalisation d\'une veille légale et réglementaire sur la formation professionnelle.', methodology: 'Abonnez-vous aux newsletters officielles (DGEFP, France Compétences). Documentez votre veille dans EDUZEN.' },
      { number: 24, name: 'Veille sur les évolutions', description: 'Veille sur les évolutions des compétences, métiers et emplois.', methodology: 'Participez aux salons professionnels et mettez à jour vos programmes en conséquence.' },
      { number: 25, name: 'Veille technologique', description: 'Veille sur les innovations pédagogiques et technologiques.', methodology: 'Testez de nouveaux outils pédagogiques. EDUZEN intègre les dernières innovations e-learning.' },
      { number: 26, name: 'Mobilisation des acteurs', description: 'Mobilisation des expertises et ressources pour accompagner les bénéficiaires handicapés.', methodology: 'Construisez un réseau de partenaires (Cap Emploi, AGEFIPH). Documentez ces partenariats.' },
      { number: 27, name: 'Réseau CFA', description: 'Conformité aux conditions de sous-traitance (CFA).', methodology: 'Indicateur spécifique CFA : formalisez les conventions avec vos partenaires et sous-traitants.' },
      { number: 28, name: 'Ingénierie de formation', description: 'Ingénierie de formation selon besoins de recrutement des entreprises (CFA).', methodology: 'Indicateur spécifique CFA : travaillez avec les entreprises pour adapter vos formations à leurs besoins.' },
    ]
  },
  {
    number: 7,
    name: 'Recueil et prise en compte des appréciations',
    description: 'Le recueil et la prise en compte des appréciations et des réclamations des parties prenantes.',
    indicators: [
      { number: 29, name: 'Modalités de recueil', description: 'Recueil des appréciations des parties prenantes.', methodology: 'Envoyez systématiquement les questionnaires de satisfaction. EDUZEN les envoie automatiquement en fin de formation.' },
      { number: 30, name: 'Traitement des réclamations', description: 'Traitement des difficultés rencontrées par les parties prenantes.', methodology: 'Mettez en place une procédure de réclamation. Tracez chaque réclamation et sa résolution dans EDUZEN.' },
      { number: 31, name: 'Mesures d\'amélioration', description: 'Mesures d\'amélioration à partir de l\'analyse des appréciations.', methodology: 'Analysez les retours et mettez en œuvre des actions correctives. Documentez l\'amélioration continue.' },
      { number: 32, name: 'Amélioration continue', description: 'Amélioration continue par l\'analyse des appréciations et réclamations.', methodology: 'Tenez un registre des améliorations réalisées suite aux retours. EDUZEN génère des rapports d\'analyse automatiques.' },
    ]
  },
]

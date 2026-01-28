-- Migration: Base de connaissances contextuelle
-- Date: 2026-01-23
-- Description: Tables pour la base de connaissances et FAQ contextuelle

-- Table des catégories
CREATE TABLE IF NOT EXISTS knowledge_base_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  icon text,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des articles
CREATE TABLE IF NOT EXISTS knowledge_base_articles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  content text NOT NULL,
  excerpt text,
  category_id uuid REFERENCES knowledge_base_categories(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}',
  related_pages text[] DEFAULT '{}', -- Routes de pages liées (ex: ['/dashboard/documents/generate'])
  is_published boolean DEFAULT true,
  view_count integer DEFAULT 0,
  helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON knowledge_base_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_published ON knowledge_base_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_kb_articles_related_pages ON knowledge_base_articles USING GIN(related_pages);
CREATE INDEX IF NOT EXISTS idx_kb_articles_tags ON knowledge_base_articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_kb_articles_search ON knowledge_base_articles USING GIN(to_tsvector('french', title || ' ' || content));

-- RLS
ALTER TABLE knowledge_base_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_articles ENABLE ROW LEVEL SECURITY;

-- Politique : Tout le monde peut lire les catégories et articles publiés
CREATE POLICY "Categories are viewable by everyone"
  ON knowledge_base_categories FOR SELECT
  USING (true);

CREATE POLICY "Published articles are viewable by everyone"
  ON knowledge_base_articles FOR SELECT
  USING (is_published = true);

-- Seuls les admins peuvent modifier
CREATE POLICY "Only admins can modify categories"
  ON knowledge_base_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Only admins can modify articles"
  ON knowledge_base_articles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Insérer les catégories par défaut
INSERT INTO knowledge_base_categories (name, description, icon, order_index) VALUES
('Documents', 'Génération et gestion de documents', 'FileText', 1),
('Qualiopi', 'Conformité et certification Qualiopi', 'Award', 2),
('Stagiaires', 'Gestion des apprenants', 'Users', 3),
('Facturation', 'Factures et paiements', 'CreditCard', 4),
('Sessions', 'Gestion des sessions de formation', 'Calendar', 5),
('E-learning', 'Plateforme d''apprentissage en ligne', 'GraduationCap', 6)
ON CONFLICT DO NOTHING;

-- Insérer quelques articles d'exemple
INSERT INTO knowledge_base_articles (title, content, excerpt, category_id, tags, related_pages, is_published) VALUES
(
  'Comment déclarer mes heures stagiaires dans le BPF ?',
  'Le Bilan Pédagogique et Financier (BPF) doit inclure toutes les heures de formation suivies par vos stagiaires. Pour déclarer ces heures :

1. Allez dans la section "Documents" > "Générer un document"
2. Sélectionnez le type "BPF"
3. Choisissez la période concernée
4. Les heures seront automatiquement calculées depuis les sessions de formation

Les heures sont calculées automatiquement à partir des sessions créées dans EDUZEN. Assurez-vous que toutes vos sessions sont correctement renseignées avec leurs durées.',
  'Découvrez comment déclarer automatiquement les heures de formation dans votre BPF.',
  (SELECT id FROM knowledge_base_categories WHERE name = 'Documents' LIMIT 1),
  ARRAY['BPF', 'heures', 'déclaration', 'documents'],
  ARRAY['/dashboard/documents/generate'],
  true
),
(
  'Quelles sont les informations obligatoires dans un BPF ?',
  'Un BPF conforme doit contenir :

- Les informations de l''organisme (nom, SIRET, adresse)
- Les données des stagiaires (nom, prénom, numéro)
- Les heures de formation par stagiaire
- Les dates de début et fin de formation
- Le montant des financements reçus

EDUZEN génère automatiquement tous ces éléments depuis vos données. Il vous suffit de vérifier et valider.',
  'Liste complète des informations obligatoires pour un BPF conforme.',
  (SELECT id FROM knowledge_base_categories WHERE name = 'Documents' LIMIT 1),
  ARRAY['BPF', 'conformité', 'obligatoire', 'documents'],
  ARRAY['/dashboard/documents/generate'],
  true
),
(
  'Comment améliorer mon score Qualiopi ?',
  'Pour améliorer votre score Qualiopi, suivez ces étapes :

1. Consultez votre dashboard Qualiopi pour voir les indicateurs non conformes
2. Complétez les preuves manquantes pour chaque indicateur
3. Mettez à jour régulièrement vos indicateurs
4. Utilisez les alertes pour identifier rapidement les problèmes

Un score de 100% vous garantit une certification Qualiopi sans problème.',
  'Conseils pratiques pour améliorer votre conformité Qualiopi.',
  (SELECT id FROM knowledge_base_categories WHERE name = 'Qualiopi' LIMIT 1),
  ARRAY['Qualiopi', 'conformité', 'amélioration', 'score'],
  ARRAY['/dashboard/qualiopi'],
  true
),
(
  'Comment importer mes stagiaires en masse ?',
  'Pour importer vos stagiaires en masse :

1. Allez dans "Stagiaires" > "Nouveau stagiaire"
2. Cliquez sur "Importer" en haut de la page
3. Téléchargez le modèle CSV ou utilisez votre propre fichier
4. Mappez les colonnes de votre fichier aux champs EDUZEN
5. Validez l''import

L''assistant d''importation détecte automatiquement les colonnes et vous permet de corriger les erreurs avant l''import final.',
  'Guide complet pour importer vos stagiaires depuis un fichier CSV ou Excel.',
  (SELECT id FROM knowledge_base_categories WHERE name = 'Stagiaires' LIMIT 1),
  ARRAY['import', 'stagiaires', 'CSV', 'Excel'],
  ARRAY['/dashboard/students/new', '/dashboard/students'],
  true
)
ON CONFLICT DO NOTHING;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_kb_categories_updated_at
  BEFORE UPDATE ON knowledge_base_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_articles_updated_at
  BEFORE UPDATE ON knowledge_base_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migration pour s'assurer que les articles de blog sont accessibles publiquement
-- Cette migration garantit que les utilisateurs non authentifiés peuvent lire les articles publiés

-- Vérifier et corriger la politique RLS pour blog_posts
DROP POLICY IF EXISTS "Anyone can read published blog posts" ON blog_posts;

-- Créer une politique qui permet à TOUS (authentifiés et non authentifiés) de lire les articles publiés
CREATE POLICY "Anyone can read published blog posts" 
ON blog_posts 
FOR SELECT 
TO public  -- TO public permet l'accès aux utilisateurs non authentifiés
USING (
  status = 'published' 
  AND (published_at IS NULL OR published_at <= NOW())
);

-- Vérifier et corriger la politique RLS pour blog_categories
DROP POLICY IF EXISTS "Anyone can read active blog categories" ON blog_categories;

CREATE POLICY "Anyone can read active blog categories" 
ON blog_categories 
FOR SELECT 
TO public
USING (is_active = true);

-- Vérifier et corriger la politique RLS pour blog_tags
DROP POLICY IF EXISTS "Anyone can read blog tags" ON blog_tags;

CREATE POLICY "Anyone can read blog tags" 
ON blog_tags 
FOR SELECT 
TO public
USING (true);

-- Vérifier et corriger la politique RLS pour blog_post_tags
DROP POLICY IF EXISTS "Anyone can read blog post tags" ON blog_post_tags;

CREATE POLICY "Anyone can read blog post tags" 
ON blog_post_tags 
FOR SELECT 
TO public
USING (true);

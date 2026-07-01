-- Add slug column to organizations for branded public URLs (/s/{slug}/{token})
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug TEXT;

-- Populate slugs for existing orgs from their name
UPDATE organizations
SET slug = lower(
  trim(both '-' from
    regexp_replace(
      regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  )
)
WHERE slug IS NULL;

-- Fallback for orgs whose name produced an empty slug
UPDATE organizations
SET slug = 'org-' || substring(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

-- Resolve duplicate slugs by appending a numeric suffix
WITH duplicates AS (
  SELECT id, slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at ASC) - 1 AS dup_num
  FROM organizations
)
UPDATE organizations o
SET slug = d.slug || '-' || d.dup_num::text
FROM duplicates d
WHERE o.id = d.id AND d.dup_num > 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_slug_unique'
  ) THEN
    ALTER TABLE organizations ADD CONSTRAINT organizations_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- Auto-generate slug on new org creation
CREATE OR REPLACE FUNCTION generate_org_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  suffix INT := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := lower(trim(both '-' from regexp_replace(
      regexp_replace(COALESCE(NEW.name, ''), '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )));
    IF base_slug = '' THEN
      base_slug := 'org-' || substring(gen_random_uuid()::text, 1, 8);
    END IF;
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = final_slug) LOOP
      final_slug := base_slug || '-' || suffix;
      suffix := suffix + 1;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_org_slug ON organizations;
CREATE TRIGGER set_org_slug
  BEFORE INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION generate_org_slug();

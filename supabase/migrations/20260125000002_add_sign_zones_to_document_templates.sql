-- Zones de signature PDF (coordonnées relatives %) pour le Template Picker.
-- Format: [ { "id": "sig_stagiaire", "page": 1, "x": 0.72, "y": 0.85, "w": 0.15, "h": 0.05 }, ... ]

ALTER TABLE public.document_templates
  ADD COLUMN IF NOT EXISTS sign_zones jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.document_templates.sign_zones IS 'Zones de signature (Template Picker) : id, page, x, y, w, h en % (0–1).';

-- Create media buckets for e-learning lesson images / files
-- Buckets: elearning-media, course-media

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('elearning-media', 'elearning-media', TRUE),
  ('course-media', 'course-media', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Public read access for those buckets
DROP POLICY IF EXISTS "Public read access for elearning media" ON storage.objects;
CREATE POLICY "Public read access for elearning media"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('elearning-media', 'course-media'));

-- Authenticated uploads
DROP POLICY IF EXISTS "Authenticated users can upload elearning media" ON storage.objects;
CREATE POLICY "Authenticated users can upload elearning media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('elearning-media', 'course-media') AND auth.role() = 'authenticated');

-- Authenticated users can update/delete their own uploads
DROP POLICY IF EXISTS "Authenticated users can update their own elearning media" ON storage.objects;
CREATE POLICY "Authenticated users can update their own elearning media"
  ON storage.objects FOR UPDATE
  USING (bucket_id IN ('elearning-media', 'course-media') AND auth.uid() = owner)
  WITH CHECK (bucket_id IN ('elearning-media', 'course-media') AND auth.uid() = owner);

DROP POLICY IF EXISTS "Authenticated users can delete their own elearning media" ON storage.objects;
CREATE POLICY "Authenticated users can delete their own elearning media"
  ON storage.objects FOR DELETE
  USING (bucket_id IN ('elearning-media', 'course-media') AND auth.uid() = owner);







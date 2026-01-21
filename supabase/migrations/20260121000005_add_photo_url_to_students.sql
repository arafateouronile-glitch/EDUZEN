-- Add photo_url column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create storage bucket for student photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for storage
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'student-photos' );

CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'student-photos' );

CREATE POLICY "Users can update their own uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'student-photos' );

CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'student-photos' );

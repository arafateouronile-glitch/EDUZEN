-- Crée le bucket Supabase Storage "course-thumbnails" et les policies nécessaires
-- Cause typique du 400 (Bad Request) sur upload: bucket inexistant.

-- 1) Bucket (public = true pour permettre l'affichage des miniatures via URL publique)
insert into storage.buckets (id, name, public)
values ('course-thumbnails', 'course-thumbnails', true)
on conflict (id) do update set public = excluded.public;

-- 2) Policies (lecture publique, écriture réservée aux utilisateurs authentifiés)
-- Note: storage.objects a généralement RLS activé par défaut.

drop policy if exists "Public can view course thumbnails" on storage.objects;
create policy "Public can view course thumbnails"
on storage.objects
for select
using (bucket_id = 'course-thumbnails');

drop policy if exists "Authenticated can upload course thumbnails" on storage.objects;
create policy "Authenticated can upload course thumbnails"
on storage.objects
for insert
with check (bucket_id = 'course-thumbnails' and auth.role() = 'authenticated');

drop policy if exists "Authenticated can update course thumbnails" on storage.objects;
create policy "Authenticated can update course thumbnails"
on storage.objects
for update
using (bucket_id = 'course-thumbnails' and auth.role() = 'authenticated')
with check (bucket_id = 'course-thumbnails' and auth.role() = 'authenticated');

drop policy if exists "Authenticated can delete course thumbnails" on storage.objects;
create policy "Authenticated can delete course thumbnails"
on storage.objects
for delete
using (bucket_id = 'course-thumbnails' and auth.role() = 'authenticated');







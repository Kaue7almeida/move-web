-- Public bucket for static tutorial/UI assets of the Scan module.
-- No PII here — only instructional images (clothing, space, posture, poses).
-- The private bucket for student scan photos will be created separately (scan Task 4).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'scan-assets',
  'scan-assets',
  true,
  5242880,            -- 5 MB per file (tutorial images are small)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Allow public (anon) read of all objects in this bucket.
create policy "scan_assets_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'scan-assets');

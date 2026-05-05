
ALTER TABLE public.hosts ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'UTC';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS online_url text;

-- Ensure handle_new_host trigger is attached
DROP TRIGGER IF EXISTS on_host_created ON public.hosts;
CREATE TRIGGER on_host_created
AFTER INSERT ON public.hosts
FOR EACH ROW EXECUTE FUNCTION public.handle_new_host();

-- Ensure handle_new_user trigger attached on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
DROP TRIGGER IF EXISTS set_hosts_updated_at ON public.hosts;
CREATE TRIGGER set_hosts_updated_at BEFORE UPDATE ON public.hosts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_events_updated_at ON public.events;
CREATE TRIGGER set_events_updated_at BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage policies for host logos (avatars bucket) and event covers
DO $$ BEGIN
  CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Auth upload avatars" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Auth update own avatars" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read event-covers" ON storage.objects FOR SELECT USING (bucket_id = 'event-covers');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Auth upload event-covers" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-covers' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Auth update event-covers" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'event-covers' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Auth delete own event-covers" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-covers' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read host-banners" ON storage.objects FOR SELECT USING (bucket_id = 'host-banners');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Auth upload host-banners" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'host-banners' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

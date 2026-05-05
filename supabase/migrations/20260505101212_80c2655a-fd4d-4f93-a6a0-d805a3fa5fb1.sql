
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('attendee', 'admin');
CREATE TYPE public.event_status AS ENUM ('draft', 'published', 'unpublished');
CREATE TYPE public.event_visibility AS ENUM ('public', 'unlisted');
CREATE TYPE public.rsvp_status AS ENUM ('confirmed', 'waitlisted', 'cancelled');
CREATE TYPE public.ticket_status AS ENUM ('valid', 'cancelled');
CREATE TYPE public.gallery_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.report_status AS ENUM ('open', 'resolved', 'dismissed');
CREATE TYPE public.report_target_type AS ENUM ('event', 'gallery_upload');
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'revoked');
CREATE TYPE public.host_member_role AS ENUM ('owner', 'manager', 'checker');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- HOSTS
CREATE TABLE public.hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER hosts_updated BEFORE UPDATE ON public.hosts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- HOST MEMBERS
CREATE TABLE public.host_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.host_member_role NOT NULL DEFAULT 'manager',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (host_id, user_id)
);
ALTER TABLE public.host_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_host_member(_user_id UUID, _host_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.host_members WHERE user_id = _user_id AND host_id = _host_id);
$$;

CREATE OR REPLACE FUNCTION public.is_host_manager(_user_id UUID, _host_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.host_members
    WHERE user_id = _user_id AND host_id = _host_id AND role IN ('owner','manager')
  );
$$;

-- EVENTS
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 50,
  status public.event_status NOT NULL DEFAULT 'draft',
  visibility public.event_visibility NOT NULL DEFAULT 'public',
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_events_host ON public.events(host_id);
CREATE INDEX idx_events_status_visibility ON public.events(status, visibility);
CREATE INDEX idx_events_starts_at ON public.events(starts_at);
CREATE TRIGGER events_updated BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_event_host_manager(_user_id UUID, _event_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.host_members hm ON hm.host_id = e.host_id
    WHERE e.id = _event_id AND hm.user_id = _user_id AND hm.role IN ('owner','manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_check_in_event(_user_id UUID, _event_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.host_members hm ON hm.host_id = e.host_id
    WHERE e.id = _event_id AND hm.user_id = _user_id
  );
$$;

-- HOST INVITES
CREATE TABLE public.host_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.host_member_role NOT NULL DEFAULT 'manager',
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  status public.invite_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.host_invites ENABLE ROW LEVEL SECURITY;

-- RSVPS
CREATE TABLE public.rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.rsvp_status NOT NULL DEFAULT 'confirmed',
  waitlist_position INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER rsvps_updated BEFORE UPDATE ON public.rsvps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TICKETS
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rsvp_id UUID UNIQUE NOT NULL REFERENCES public.rsvps(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL DEFAULT upper(encode(gen_random_bytes(6), 'hex')),
  status public.ticket_status NOT NULL DEFAULT 'valid',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- CHECK-INS
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID UNIQUE NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  checked_in_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  undone BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- GALLERY UPLOADS
CREATE TABLE public.gallery_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  status public.gallery_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gallery_uploads ENABLE ROW LEVEL SECURITY;

-- FEEDBACK
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- REPORTS
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type public.report_target_type NOT NULL,
  target_id UUID NOT NULL,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  status public.report_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- POLICIES
-- =========================================================

-- profiles
CREATE POLICY "Profiles publicly readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- user_roles
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- hosts
CREATE POLICY "Hosts publicly readable" ON public.hosts FOR SELECT USING (true);
CREATE POLICY "Authed users create hosts" ON public.hosts FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Host managers update host" ON public.hosts FOR UPDATE USING (public.is_host_manager(auth.uid(), id));
CREATE POLICY "Host owners delete host" ON public.hosts FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.host_members WHERE host_id = hosts.id AND user_id = auth.uid() AND role = 'owner')
);

-- host_members
CREATE POLICY "Members read team" ON public.host_members FOR SELECT USING (
  auth.uid() = user_id OR public.is_host_member(auth.uid(), host_id)
);
CREATE POLICY "Managers manage members" ON public.host_members FOR ALL
  USING (public.is_host_manager(auth.uid(), host_id))
  WITH CHECK (public.is_host_manager(auth.uid(), host_id));

-- host_invites
CREATE POLICY "Managers manage invites" ON public.host_invites FOR ALL
  USING (public.is_host_manager(auth.uid(), host_id))
  WITH CHECK (public.is_host_manager(auth.uid(), host_id));

-- events
CREATE POLICY "Published events readable; team sees all" ON public.events FOR SELECT USING (
  status = 'published' OR public.is_host_member(auth.uid(), host_id)
);
CREATE POLICY "Managers create events" ON public.events FOR INSERT WITH CHECK (
  public.is_host_manager(auth.uid(), host_id) AND auth.uid() = created_by
);
CREATE POLICY "Managers update events" ON public.events FOR UPDATE USING (public.is_host_manager(auth.uid(), host_id));
CREATE POLICY "Managers delete events" ON public.events FOR DELETE USING (public.is_host_manager(auth.uid(), host_id));

-- rsvps
CREATE POLICY "User or host read RSVPs" ON public.rsvps FOR SELECT USING (
  auth.uid() = user_id OR public.is_event_host_manager(auth.uid(), event_id)
);
CREATE POLICY "Users create own RSVP" ON public.rsvps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users or host update RSVP" ON public.rsvps FOR UPDATE USING (
  auth.uid() = user_id OR public.is_event_host_manager(auth.uid(), event_id)
);

-- tickets
CREATE POLICY "Owner or checker read tickets" ON public.tickets FOR SELECT USING (
  auth.uid() = user_id OR public.can_check_in_event(auth.uid(), event_id)
);

-- check_ins
CREATE POLICY "Checkers read check-ins" ON public.check_ins FOR SELECT USING (public.can_check_in_event(auth.uid(), event_id));
CREATE POLICY "Checkers create check-ins" ON public.check_ins FOR INSERT WITH CHECK (
  public.can_check_in_event(auth.uid(), event_id) AND auth.uid() = checked_in_by
);
CREATE POLICY "Checkers update check-ins" ON public.check_ins FOR UPDATE USING (public.can_check_in_event(auth.uid(), event_id));

-- gallery_uploads
CREATE POLICY "Approved gallery readable" ON public.gallery_uploads FOR SELECT USING (
  status = 'approved' OR auth.uid() = user_id OR public.is_event_host_manager(auth.uid(), event_id)
);
CREATE POLICY "Users upload gallery" ON public.gallery_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Hosts moderate gallery" ON public.gallery_uploads FOR UPDATE USING (public.is_event_host_manager(auth.uid(), event_id));
CREATE POLICY "User or host delete gallery" ON public.gallery_uploads FOR DELETE USING (
  auth.uid() = user_id OR public.is_event_host_manager(auth.uid(), event_id)
);

-- feedback
CREATE POLICY "Feedback publicly readable" ON public.feedback FOR SELECT USING (true);
CREATE POLICY "Attendees submit feedback after event" ON public.feedback FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.ends_at < now())
);
CREATE POLICY "Users update own feedback" ON public.feedback FOR UPDATE USING (auth.uid() = user_id);

-- reports
CREATE POLICY "Reporter reads own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Authed create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- =========================================================
-- TRIGGERS
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'attendee') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_host()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.host_members (host_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_host_created AFTER INSERT ON public.hosts
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_host();

-- =========================================================
-- STORAGE
-- =========================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('host-banners', 'host-banners', true),
  ('event-covers', 'event-covers', true),
  ('gallery', 'gallery', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Public read host-banners" ON storage.objects FOR SELECT USING (bucket_id = 'host-banners');
CREATE POLICY "Public read event-covers" ON storage.objects FOR SELECT USING (bucket_id = 'event-covers');

CREATE POLICY "Users upload avatar" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users update avatar" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Authed upload host banner" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'host-banners' AND auth.uid() IS NOT NULL
);
CREATE POLICY "Authed upload event cover" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'event-covers' AND auth.uid() IS NOT NULL
);
CREATE POLICY "Authed upload gallery" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'gallery' AND auth.uid() IS NOT NULL
);
CREATE POLICY "Owner reads gallery" ON storage.objects FOR SELECT USING (
  bucket_id = 'gallery' AND auth.uid()::text = (storage.foldername(name))[1]
);

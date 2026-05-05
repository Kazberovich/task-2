
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- Hosts can update feedback (hide it)
DROP POLICY IF EXISTS "Hosts hide feedback" ON public.feedback;
CREATE POLICY "Hosts hide feedback" ON public.feedback
FOR UPDATE USING (public.is_event_host_manager(auth.uid(), event_id));

CREATE OR REPLACE FUNCTION public.hide_reported_target(_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r public.reports;
  _eid uuid;
BEGIN
  SELECT * INTO _r FROM public.reports WHERE id = _report_id;
  IF _r IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;
  IF _r.target_type = 'event' THEN
    IF NOT public.is_event_host_manager(auth.uid(), _r.target_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
    UPDATE public.events SET status = 'unpublished' WHERE id = _r.target_id;
  ELSIF _r.target_type = 'gallery_upload' THEN
    SELECT event_id INTO _eid FROM public.gallery_uploads WHERE id = _r.target_id;
    IF _eid IS NULL OR NOT public.is_event_host_manager(auth.uid(), _eid) THEN RAISE EXCEPTION 'Not allowed'; END IF;
    UPDATE public.gallery_uploads SET status = 'rejected' WHERE id = _r.target_id;
  END IF;
  UPDATE public.reports SET status = 'resolved' WHERE id = _report_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.hide_reported_target(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.hide_reported_target(uuid) TO authenticated;

-- Allow report status updates by event hosts (for mark reviewed / dismiss)
DROP POLICY IF EXISTS "Hosts review reports" ON public.reports;
CREATE POLICY "Hosts review reports" ON public.reports
FOR UPDATE USING (
  (target_type = 'event' AND public.is_event_host_manager(auth.uid(), target_id))
  OR (target_type = 'gallery_upload' AND EXISTS (
    SELECT 1 FROM public.gallery_uploads g WHERE g.id = target_id AND public.is_event_host_manager(auth.uid(), g.event_id)
  ))
);

-- Hosts read reports targeting their events/gallery
DROP POLICY IF EXISTS "Hosts read reports" ON public.reports;
CREATE POLICY "Hosts read reports" ON public.reports
FOR SELECT USING (
  (auth.uid() = reporter_id)
  OR (target_type = 'event' AND public.is_event_host_manager(auth.uid(), target_id))
  OR (target_type = 'gallery_upload' AND EXISTS (
    SELECT 1 FROM public.gallery_uploads g WHERE g.id = target_id AND public.is_event_host_manager(auth.uid(), g.event_id)
  ))
);

-- Storage RLS for gallery bucket (private)
DROP POLICY IF EXISTS "Gallery upload by attendees" ON storage.objects;
CREATE POLICY "Gallery upload by attendees" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'gallery' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Gallery read by uploader or host" ON storage.objects;
CREATE POLICY "Gallery read by uploader or host" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'gallery' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.gallery_uploads g
      WHERE g.storage_path = name
        AND (g.status = 'approved' OR public.is_event_host_manager(auth.uid(), g.event_id))
    )
  )
);

DROP POLICY IF EXISTS "Gallery read approved public" ON storage.objects;
CREATE POLICY "Gallery read approved public" ON storage.objects
FOR SELECT TO anon
USING (
  bucket_id = 'gallery' AND EXISTS (
    SELECT 1 FROM public.gallery_uploads g WHERE g.storage_path = name AND g.status = 'approved'
  )
);

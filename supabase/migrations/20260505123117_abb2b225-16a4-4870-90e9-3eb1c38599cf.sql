
-- Helper: ensure a ticket exists for a confirmed rsvp
CREATE OR REPLACE FUNCTION public.ensure_ticket_for_rsvp(_rsvp_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r RECORD;
  _tid uuid;
BEGIN
  SELECT * INTO _r FROM public.rsvps WHERE id = _rsvp_id;
  IF _r IS NULL OR _r.status <> 'confirmed' THEN
    RETURN NULL;
  END IF;
  SELECT id INTO _tid FROM public.tickets WHERE rsvp_id = _rsvp_id;
  IF _tid IS NULL THEN
    INSERT INTO public.tickets (rsvp_id, event_id, user_id, status)
    VALUES (_rsvp_id, _r.event_id, _r.user_id, 'valid')
    RETURNING id INTO _tid;
  ELSE
    UPDATE public.tickets SET status = 'valid' WHERE id = _tid;
  END IF;
  RETURN _tid;
END;
$$;

-- RSVP function
CREATE OR REPLACE FUNCTION public.rsvp_to_event(_event_id uuid)
RETURNS public.rsvps
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _event RECORD;
  _existing public.rsvps;
  _going_count int;
  _new_status rsvp_status;
  _new public.rsvps;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _event FROM public.events WHERE id = _event_id;
  IF _event IS NULL THEN RAISE EXCEPTION 'Event not found'; END IF;
  IF _event.status <> 'published' THEN RAISE EXCEPTION 'Event not open for RSVP'; END IF;
  IF _event.ends_at < now() THEN RAISE EXCEPTION 'Event has ended'; END IF;

  SELECT * INTO _existing FROM public.rsvps WHERE event_id = _event_id AND user_id = _uid;
  IF _existing IS NOT NULL AND _existing.status IN ('confirmed','waitlisted') THEN
    RETURN _existing;
  END IF;

  SELECT count(*) INTO _going_count FROM public.rsvps WHERE event_id = _event_id AND status = 'confirmed';
  IF _going_count < _event.capacity THEN
    _new_status := 'confirmed';
  ELSE
    _new_status := 'waitlisted';
  END IF;

  IF _existing IS NULL THEN
    INSERT INTO public.rsvps (event_id, user_id, status)
    VALUES (_event_id, _uid, _new_status)
    RETURNING * INTO _new;
  ELSE
    UPDATE public.rsvps SET status = _new_status, updated_at = now()
    WHERE id = _existing.id RETURNING * INTO _new;
  END IF;

  IF _new.status = 'confirmed' THEN
    PERFORM public.ensure_ticket_for_rsvp(_new.id);
  END IF;
  RETURN _new;
END;
$$;

-- Promote next waitlisted user(s) up to capacity
CREATE OR REPLACE FUNCTION public.promote_waitlist(_event_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cap int;
  _going int;
  _promoted int := 0;
  _r public.rsvps;
BEGIN
  SELECT capacity INTO _cap FROM public.events WHERE id = _event_id;
  IF _cap IS NULL THEN RETURN 0; END IF;
  LOOP
    SELECT count(*) INTO _going FROM public.rsvps WHERE event_id = _event_id AND status='confirmed';
    EXIT WHEN _going >= _cap;
    SELECT * INTO _r FROM public.rsvps
      WHERE event_id = _event_id AND status='waitlisted'
      ORDER BY created_at ASC LIMIT 1;
    EXIT WHEN _r IS NULL;
    UPDATE public.rsvps SET status='confirmed', updated_at=now() WHERE id=_r.id;
    PERFORM public.ensure_ticket_for_rsvp(_r.id);
    _promoted := _promoted + 1;
  END LOOP;
  RETURN _promoted;
END;
$$;

-- Cancel RSVP
CREATE OR REPLACE FUNCTION public.cancel_rsvp(_rsvp_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r public.rsvps;
BEGIN
  SELECT * INTO _r FROM public.rsvps WHERE id = _rsvp_id;
  IF _r IS NULL THEN RAISE EXCEPTION 'RSVP not found'; END IF;
  IF _r.user_id <> auth.uid() AND NOT public.is_event_host_manager(auth.uid(), _r.event_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE public.rsvps SET status='cancelled', updated_at=now() WHERE id=_r.id;
  UPDATE public.tickets SET status='cancelled' WHERE rsvp_id=_r.id;
  IF _r.status = 'confirmed' THEN
    PERFORM public.promote_waitlist(_r.event_id);
  END IF;
END;
$$;

-- Trigger to promote when capacity changes
CREATE OR REPLACE FUNCTION public.on_event_capacity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.capacity > OLD.capacity THEN
    PERFORM public.promote_waitlist(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_capacity_change ON public.events;
CREATE TRIGGER trg_event_capacity_change
AFTER UPDATE OF capacity ON public.events
FOR EACH ROW
WHEN (NEW.capacity IS DISTINCT FROM OLD.capacity)
EXECUTE FUNCTION public.on_event_capacity_change();

-- Unique active RSVP per user/event (allow multiple cancelled rows is fine; we update existing instead)
CREATE UNIQUE INDEX IF NOT EXISTS rsvps_user_event_unique ON public.rsvps(user_id, event_id);

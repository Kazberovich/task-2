
CREATE OR REPLACE FUNCTION public.accept_host_invite(_token text)
RETURNS public.host_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _inv public.host_invites;
  _existing public.host_members;
  _new public.host_members;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _inv FROM public.host_invites WHERE token = _token;
  IF _inv IS NULL THEN RAISE EXCEPTION 'Invite not found'; END IF;
  IF _inv.status <> 'pending' THEN RAISE EXCEPTION 'Invite is no longer valid'; END IF;
  IF _inv.expires_at < now() THEN
    UPDATE public.host_invites SET status='expired' WHERE id=_inv.id;
    RAISE EXCEPTION 'Invite expired';
  END IF;

  SELECT * INTO _existing FROM public.host_members WHERE host_id=_inv.host_id AND user_id=_uid;
  IF _existing IS NOT NULL THEN
    UPDATE public.host_invites SET status='accepted' WHERE id=_inv.id;
    RETURN _existing;
  END IF;

  INSERT INTO public.host_members (host_id, user_id, role)
  VALUES (_inv.host_id, _uid, _inv.role)
  RETURNING * INTO _new;

  UPDATE public.host_invites SET status='accepted' WHERE id=_inv.id;
  RETURN _new;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_host_invite(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.accept_host_invite(text) TO authenticated;

-- Allow signed-in users to look up an invite by token (preview before accepting)
CREATE OR REPLACE FUNCTION public.get_invite_preview(_token text)
RETURNS TABLE(host_id uuid, host_name text, host_slug text, role host_member_role, status invite_status, expires_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT i.host_id, h.name, h.slug, i.role, i.status, i.expires_at
  FROM public.host_invites i
  JOIN public.hosts h ON h.id = i.host_id
  WHERE i.token = _token
$$;
REVOKE EXECUTE ON FUNCTION public.get_invite_preview(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_invite_preview(text) TO authenticated;

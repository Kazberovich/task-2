
REVOKE EXECUTE ON FUNCTION public.rsvp_to_event(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cancel_rsvp(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.promote_waitlist(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.ensure_ticket_for_rsvp(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.rsvp_to_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_rsvp(uuid) TO authenticated;

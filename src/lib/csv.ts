import { supabase } from "@/integrations/supabase/client";

export async function buildAttendeesCsv(eventId: string): Promise<string> {
  const [{ data: rsvps }, { data: tickets }, { data: cins }] = await Promise.all([
    supabase.from("rsvps").select("id, user_id, status, created_at").eq("event_id", eventId),
    supabase.from("tickets").select("id, rsvp_id, code, status").eq("event_id", eventId),
    supabase.from("check_ins").select("ticket_id, checked_in_at, undone").eq("event_id", eventId),
  ]);
  const userIds = Array.from(new Set((rsvps ?? []).map((r: any) => r.user_id)));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, display_name, email").in("id", userIds)
    : { data: [] as any[] };
  const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const ticketByRsvp = new Map((tickets ?? []).map((t: any) => [t.rsvp_id, t]));
  const checkByTicket = new Map<string, any>();
  (cins ?? []).forEach((c: any) => { if (!c.undone) checkByTicket.set(c.ticket_id, c); });

  const header = ["Name", "Email", "Status", "Ticket Code", "RSVP At", "Checked In At"];
  const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [header.join(",")];
  (rsvps ?? []).forEach((r: any) => {
    const p = profMap.get(r.user_id) as any;
    const t = ticketByRsvp.get(r.id);
    const c = t ? checkByTicket.get(t.id) : undefined;
    lines.push([
      p?.display_name, p?.email, r.status, t?.code, r.created_at, c?.checked_in_at,
    ].map(escape).join(","));
  });
  return lines.join("\n");
}
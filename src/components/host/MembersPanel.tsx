import { useEffect, useState } from "react";
import { Copy, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props { hostId: string }

type Role = "manager" | "checker";

export function MembersPanel({ hostId }: Props) {
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("manager");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [{ data: m }, { data: i }] = await Promise.all([
      supabase.from("host_members").select("id, role, user_id").eq("host_id", hostId),
      supabase.from("host_invites").select("id, email, role, token, status, expires_at, created_at").eq("host_id", hostId).order("created_at", { ascending: false }),
    ]);
    const ids = (m ?? []).map((x: any) => x.user_id);
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, display_name, email").in("id", ids)
      : { data: [] as any[] };
    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setMembers(((m as any[]) ?? []).map((x) => ({ ...x, profile: pmap.get(x.user_id) })));
    setInvites((i as any) ?? []);
  };

  useEffect(() => { if (hostId) load(); }, [hostId]);

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("host_invites").insert({
      host_id: hostId, email: email.trim().toLowerCase(), role, created_by: (await supabase.auth.getUser()).data.user?.id,
    } as any);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Invite created");
    setEmail("");
    load();
  };

  const inviteUrl = (token: string) => `${window.location.origin}/invite/${token}`;

  const copy = (token: string) => {
    navigator.clipboard.writeText(inviteUrl(token));
    toast.success("Invite link copied");
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("host_invites").update({ status: "revoked" } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Invite revoked");
    load();
  };

  const removeMember = async (id: string) => {
    const { error } = await supabase.from("host_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Member removed");
    load();
  };

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6">
      <div>
        <h3 className="text-lg font-semibold">Team members</h3>
        <p className="text-sm text-muted-foreground">Hosts can manage events. Checkers can only check attendees in.</p>
      </div>
      <ul className="space-y-2">
        {members.length === 0 && <li className="text-sm text-muted-foreground">No members yet.</li>}
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium">{m.profile?.display_name ?? m.profile?.email ?? m.user_id}</div>
              <div className="truncate text-xs text-muted-foreground">{m.profile?.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={m.role === "owner" ? "default" : m.role === "checker" ? "outline" : "secondary"}>
                {m.role === "manager" ? "Host" : m.role === "checker" ? "Checker" : "Owner"}
              </Badge>
              {m.role !== "owner" && (
                <Button size="icon" variant="ghost" onClick={() => removeMember(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={createInvite} className="space-y-3 rounded-lg border border-dashed border-border p-4">
        <h4 className="text-sm font-semibold">Create invite link</h4>
        <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@example.com" maxLength={255} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Host</SelectItem>
                <SelectItem value="checker">Checker</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="self-end">
            <Button type="submit" disabled={loading}><UserPlus className="mr-2 h-4 w-4" />Create</Button>
          </div>
        </div>
      </form>

      <div>
        <h4 className="mb-2 text-sm font-semibold">Pending invites</h4>
        <ul className="space-y-2">
          {invites.filter((i) => i.status === "pending").length === 0 && (
            <li className="text-sm text-muted-foreground">No pending invites.</li>
          )}
          {invites.filter((i) => i.status === "pending").map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{i.email}</div>
                <div className="truncate text-xs text-muted-foreground">{i.role === "manager" ? "Host" : "Checker"} · expires {new Date(i.expires_at).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copy(i.token)}><Copy className="mr-1 h-3 w-3" />Copy link</Button>
                <Button size="sm" variant="ghost" onClick={() => revoke(i.id)}>Revoke</Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
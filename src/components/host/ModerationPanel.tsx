import { useEffect, useState } from "react";
import { Check, EyeOff, Flag, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Props { hostId: string }

export function ModerationPanel({ hostId }: Props) {
  const [pending, setPending] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  const load = async () => {
    // Get events for this host
    const { data: events } = await supabase.from("events").select("id, title, slug").eq("host_id", hostId);
    const ids = (events ?? []).map((e: any) => e.id);
    const eMap = new Map((events ?? []).map((e: any) => [e.id, e]));
    if (ids.length === 0) { setPending([]); setReports([]); return; }

    const { data: g } = await supabase
      .from("gallery_uploads")
      .select("id, storage_path, status, event_id, user_id, created_at")
      .in("event_id", ids)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    const withUrls = await Promise.all(((g as any[]) ?? []).map(async (it) => {
      const { data: u } = await supabase.storage.from("gallery").createSignedUrl(it.storage_path, 60 * 60);
      return { ...it, url: u?.signedUrl, event: eMap.get(it.event_id) };
    }));
    setPending(withUrls);

    // Reports targeting these events or gallery
    const { data: galAll } = await supabase
      .from("gallery_uploads").select("id, event_id").in("event_id", ids);
    const galIds = (galAll ?? []).map((g: any) => g.id);
    const targets = [...ids, ...galIds];
    if (targets.length === 0) { setReports([]); return; }
    const { data: r } = await supabase
      .from("reports")
      .select("id, target_type, target_id, reason, status, created_at")
      .in("target_id", targets)
      .order("created_at", { ascending: false });
    setReports(((r as any[]) ?? []).map((rep) => ({
      ...rep,
      event: rep.target_type === "event" ? eMap.get(rep.target_id) : eMap.get((galAll ?? []).find((g: any) => g.id === rep.target_id)?.event_id),
    })));
  };

  useEffect(() => { if (hostId) load(); /* eslint-disable-next-line */ }, [hostId]);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("gallery_uploads").update({ status } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Approved" : "Hidden");
    load();
  };

  const reviewReport = async (id: string, action: "resolved" | "dismissed" | "hide") => {
    if (action === "hide") {
      const { error } = await supabase.rpc("hide_reported_target", { _report_id: id });
      if (error) return toast.error(error.message);
      toast.success("Hidden and report resolved");
    } else {
      const { error } = await supabase.from("reports").update({ status: action } as any).eq("id", id);
      if (error) return toast.error(error.message);
      toast.success(action === "resolved" ? "Marked reviewed" : "Dismissed");
    }
    load();
  };

  const openReports = reports.filter((r) => r.status === "open");

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <Tabs defaultValue="gallery">
        <TabsList>
          <TabsTrigger value="gallery">
            Gallery queue {pending.length > 0 && <Badge className="ml-2" variant="secondary">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="reports">
            Reports {openReports.length > 0 && <Badge className="ml-2" variant="secondary">{openReports.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gallery" className="mt-6">
          {pending.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4" /> No photos waiting for review.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {pending.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-lg border border-border">
                  {p.url && <img src={p.url} alt="Pending" className="aspect-square w-full object-cover" />}
                  <div className="p-2">
                    <div className="truncate text-xs text-muted-foreground">{p.event?.title}</div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => setStatus(p.id, "approved")}>
                        <Check className="mr-1 h-3 w-3" />Approve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setStatus(p.id, "rejected")}>
                        <EyeOff className="mr-1 h-3 w-3" />Hide
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          {reports.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Flag className="h-4 w-4" /> No reports yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {reports.map((r) => (
                <li key={r.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={r.target_type === "event" ? "default" : "outline"}>
                          {r.target_type === "event" ? "Event" : "Photo"}
                        </Badge>
                        <Badge variant={r.status === "open" ? "destructive" : "secondary"}>{r.status}</Badge>
                        {r.event && (
                          <Link to={`/events/${r.event.slug}`} className="truncate text-primary hover:underline">
                            {r.event.title}
                          </Link>
                        )}
                      </div>
                      <p className="mt-1 text-muted-foreground">{r.reason}</p>
                    </div>
                    {r.status === "open" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => reviewReport(r.id, "resolved")}>Mark reviewed</Button>
                        <Button size="sm" variant="ghost" onClick={() => reviewReport(r.id, "dismissed")}>Dismiss</Button>
                        <Button size="sm" variant="destructive" onClick={() => reviewReport(r.id, "hide")}>
                          <EyeOff className="mr-1 h-3 w-3" />Hide
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
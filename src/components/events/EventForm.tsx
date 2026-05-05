import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Info } from "lucide-react";
import { slugify, randomSuffix } from "@/lib/slug";

export interface EventFormValues {
  id?: string;
  host_id: string;
  title: string;
  description: string | null;
  starts_at: string; // ISO
  ends_at: string;
  time_zone: string;
  location: string | null;
  online_url: string | null;
  capacity: number;
  cover_url: string | null;
  visibility: "public" | "unlisted";
  status: "draft" | "published";
  is_paid: boolean;
  slug?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hostId: string;
  initial?: Partial<EventFormValues>;
  onSaved: () => void;
}

const schema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(120),
  description: z.string().trim().max(5000).optional(),
  starts_at: z.string().min(1, "Start time required"),
  ends_at: z.string().min(1, "End time required"),
  time_zone: z.string().min(1),
  capacity: z.number().int().min(1).max(100000),
  visibility: z.enum(["public", "unlisted"]),
});

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const COMMON_TZ = ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Europe/Paris", "Asia/Tokyo", "Asia/Singapore", "Asia/Kolkata", "Australia/Sydney"];

export function EventForm({ open, onOpenChange, hostId, initial, onSaved }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [timeZone, setTimeZone] = useState("UTC");
  const [venueMode, setVenueMode] = useState<"in_person" | "online">("in_person");
  const [location, setLocation] = useState("");
  const [onlineUrl, setOnlineUrl] = useState("");
  const [capacity, setCapacity] = useState(50);
  const [cover, setCover] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");
  const [publishNow, setPublishNow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setStartsAt(toLocalInput(initial?.starts_at));
    setEndsAt(toLocalInput(initial?.ends_at));
    setTimeZone(initial?.time_zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC");
    setLocation(initial?.location ?? "");
    setOnlineUrl(initial?.online_url ?? "");
    setVenueMode(initial?.online_url ? "online" : "in_person");
    setCapacity(initial?.capacity ?? 50);
    setCoverUrl(initial?.cover_url ?? null);
    setVisibility(initial?.visibility ?? "public");
    setPublishNow(initial?.status === "published");
    setCover(null);
  }, [open, initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({
      title, description, starts_at: startsAt, ends_at: endsAt, time_zone: timeZone, capacity, visibility,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (new Date(endsAt) <= new Date(startsAt)) { toast.error("End must be after start"); return; }
    if (venueMode === "in_person" && !location.trim()) { toast.error("Add a venue address"); return; }
    if (venueMode === "online" && !onlineUrl.trim()) { toast.error("Add an online link"); return; }

    setLoading(true);
    try {
      let finalCoverUrl = coverUrl;
      if (cover) {
        const ext = cover.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("event-covers").upload(path, cover, { upsert: true });
        if (upErr) throw upErr;
        finalCoverUrl = supabase.storage.from("event-covers").getPublicUrl(path).data.publicUrl;
      }

      const payload = {
        host_id: hostId,
        title: parsed.data.title,
        description: description || null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        time_zone: timeZone,
        location: venueMode === "in_person" ? location : null,
        online_url: venueMode === "online" ? onlineUrl : null,
        capacity,
        cover_url: finalCoverUrl,
        visibility,
        status: publishNow ? "published" as const : "draft" as const,
        is_paid: false,
      };

      if (initial?.id) {
        const { error } = await supabase.from("events").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const baseSlug = slugify(parsed.data.title) || `event-${randomSuffix()}`;
        let slug = `${baseSlug}-${randomSuffix()}`;
        const { error } = await supabase.from("events").insert({ ...payload, slug, created_by: user.id });
        if (error) throw error;
      }
      toast.success(initial?.id ? "Event updated" : "Event created");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit event" : "Create event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">Starts</Label>
              <Input id="start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Ends</Label>
              <Input id="end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Time zone</Label>
            <Select value={timeZone} onValueChange={setTimeZone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMON_TZ.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Tabs value={venueMode} onValueChange={(v) => setVenueMode(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="in_person">In person</TabsTrigger>
              <TabsTrigger value="online">Online</TabsTrigger>
            </TabsList>
            <TabsContent value="in_person" className="pt-3">
              <Label htmlFor="loc">Venue address</Label>
              <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="123 Main St, City" />
            </TabsContent>
            <TabsContent value="online" className="pt-3">
              <Label htmlFor="url">Online link</Label>
              <Input id="url" type="url" value={onlineUrl} onChange={(e) => setOnlineUrl(e.target.value)} placeholder="https://meet…" />
            </TabsContent>
          </Tabs>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cap">Capacity</Label>
              <Input id="cap" type="number" min={1} value={capacity} onChange={(e) => setCapacity(parseInt(e.target.value || "0", 10))} />
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover">Cover image</Label>
            <div className="flex items-center gap-3">
              {(cover || coverUrl) && (
                <div className="h-16 w-28 rounded bg-secondary bg-cover bg-center" style={{ backgroundImage: `url(${cover ? URL.createObjectURL(cover) : coverUrl})` }} />
              )}
              <Input id="cover" type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <div className="text-sm font-medium">Pricing</div>
              <div className="text-xs text-muted-foreground">Free events only for now</div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Paid</span>
                  <Switch disabled checked={false} />
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Coming soon</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <div className="text-sm font-medium">Publish now</div>
              <div className="text-xs text-muted-foreground">Off = save as draft</div>
            </div>
            <Switch checked={publishNow} onCheckedChange={setPublishNow} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving…" : initial?.id ? "Save changes" : publishNow ? "Publish event" : "Save draft"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
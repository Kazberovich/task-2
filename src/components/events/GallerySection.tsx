import { useEffect, useRef, useState } from "react";
import { Upload, Flag, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "./ReportDialog";
import { toast } from "sonner";

interface Props {
  eventId: string;
}

interface Item { id: string; storage_path: string; status: string; user_id: string; url?: string }

export function GallerySection({ eventId }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [pendingMine, setPendingMine] = useState<Item[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("gallery_uploads")
      .select("id, storage_path, status, user_id")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    const list = (data as Item[]) ?? [];
    const approved = list.filter((i) => i.status === "approved");
    const mine = list.filter((i) => i.status === "pending" && user && i.user_id === user.id);
    const withUrls = await Promise.all(approved.map(async (i) => {
      const { data: u } = await supabase.storage.from("gallery").createSignedUrl(i.storage_path, 60 * 60);
      return { ...i, url: u?.signedUrl };
    }));
    setItems(withUrls);
    setPendingMine(mine);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [eventId, user?.id]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setUploading(true);
    const ext = f.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${eventId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("gallery").upload(path, f, { contentType: f.type });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { error } = await supabase.from("gallery_uploads").insert({
      event_id: eventId, user_id: user.id, storage_path: path, status: "pending",
    } as any);
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Uploaded — awaiting host approval");
    if (fileRef.current) fileRef.current.value = "";
    load();
  };

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Gallery</h2>
        {user && (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="mr-1 h-3 w-3" /> {uploading ? "Uploading…" : "Upload photo"}
            </Button>
          </>
        )}
      </div>

      {pendingMine.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {pendingMine.length} of your photo{pendingMine.length !== 1 ? "s" : ""} awaiting approval.
        </p>
      )}

      {items.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          <ImageIcon className="h-5 w-5" /> No photos yet — be the first to share.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {items.map((i) => (
            <div key={i.id} className="group relative overflow-hidden rounded-lg border border-border bg-secondary">
              {i.url && <img src={i.url} alt="Event" className="aspect-square w-full object-cover" loading="lazy" />}
              <div className="absolute right-1 top-1 opacity-0 transition group-hover:opacity-100">
                <ReportDialog targetType="gallery_upload" targetId={i.id} trigger={
                  <Button size="icon" variant="secondary" className="h-7 w-7"><Flag className="h-3 w-3" /></Button>
                } />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
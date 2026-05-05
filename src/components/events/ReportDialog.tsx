import { useState } from "react";
import { Flag } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  targetType: "event" | "gallery_upload";
  targetId: string;
  trigger?: React.ReactNode;
}

const REASONS = ["Spam", "Inappropriate content", "Misleading", "Harassment", "Other"];

const schema = z.object({
  reason: z.string().min(1, "Please choose a reason"),
  comment: z.string().max(500).optional(),
});

export function ReportDialog({ targetType, targetId, trigger }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user) { navigate("/auth"); return; }
    const parsed = schema.safeParse({ reason, comment });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason: comment ? `${reason} — ${comment.trim()}` : reason,
    } as any);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Report submitted. Thank you.");
    setOpen(false);
    setReason(""); setComment("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm" variant="ghost"><Flag className="mr-1 h-3 w-3" />Report</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {targetType === "event" ? "event" : "photo"}</DialogTitle>
          <DialogDescription>Help us keep the community safe. Hosts will review this report.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Choose a reason" /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="report-comment">Additional details (optional)</Label>
            <Textarea id="report-comment" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "Submitting…" : "Submit report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function InviteAccept() {
  const { token } = useParams();
  const { user, loading, refreshMemberships } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<any | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(`/auth?redirect=/invite/${token}`, { replace: true });
      return;
    }
    if (!token) return;
    supabase.rpc("get_invite_preview", { _token: token }).then(({ data, error }) => {
      if (error) { setError(error.message); return; }
      const row = (data as any)?.[0];
      if (!row) setError("Invite not found");
      else setPreview(row);
    });
  }, [user, loading, token, navigate]);

  const accept = async () => {
    if (!token) return;
    setAccepting(true);
    const { error } = await supabase.rpc("accept_host_invite", { _token: token });
    setAccepting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Invite accepted");
    await refreshMemberships();
    navigate(preview?.role === "checker" ? "/my/events" : "/dashboard", { replace: true });
  };

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join a Host team</CardTitle>
          <CardDescription>Accept the invite to collaborate on events.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!preview && !error && <Skeleton className="h-16 w-full" />}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          {preview && (
            <div className="space-y-2 text-sm">
              <div>You've been invited to join</div>
              <div className="text-lg font-semibold">{preview.host_name}</div>
              <div className="text-muted-foreground">
                Role: <span className="font-medium text-foreground">{preview.role === "manager" ? "Host" : "Checker"}</span>
              </div>
              {preview.status !== "pending" && (
                <div className="rounded-md bg-secondary p-2 text-xs">This invite is {preview.status}.</div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={accept} disabled={!preview || preview.status !== "pending" || accepting} className="flex-1">
              {accepting ? "Accepting…" : "Accept invite"}
            </Button>
            <Button variant="outline" asChild><Link to="/">Cancel</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
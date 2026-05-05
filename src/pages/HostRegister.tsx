import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { slugify, randomSuffix } from "@/lib/slug";

const hostSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  bio: z.string().trim().max(500).optional(),
  contact_email: z.string().trim().email("Invalid email").max(255),
});

export default function HostRegister() {
  const navigate = useNavigate();
  const { user, refreshMemberships } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.email) setContactEmail((e) => e || user.email!);
  }, [user]);

  const onLogoChange = (f: File | null) => {
    setLogo(f);
    setLogoPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = hostSchema.safeParse({ name, bio, contact_email: contactEmail });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      let avatar_url: string | null = null;
      if (logo) {
        const ext = logo.name.split(".").pop() ?? "png";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, logo, { upsert: true });
        if (upErr) throw upErr;
        avatar_url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      }

      const baseSlug = slugify(name) || `host-${randomSuffix()}`;
      let slug = baseSlug;
      // Try to ensure uniqueness with up to 3 attempts
      for (let i = 0; i < 3; i++) {
        const { data: existing } = await supabase.from("hosts").select("id").eq("slug", slug).maybeSingle();
        if (!existing) break;
        slug = `${baseSlug}-${randomSuffix()}`;
      }

      const { data, error } = await supabase.from("hosts").insert({
        name: parsed.data.name,
        bio: parsed.data.bio || null,
        contact_email: parsed.data.contact_email,
        avatar_url,
        slug,
        created_by: user.id,
      }).select("slug").single();
      if (error) throw error;

      await refreshMemberships();
      toast.success("Host profile created");
      navigate(`/dashboard`);
      void data;
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create host");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-10">
      <PageHeader title="Become a Host" description="Create a Host profile to publish events and welcome attendees." />
      <Card className="mt-8">
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Host name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="Brooklyn Book Club" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Logo</Label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-secondary" />
                )}
                <Input id="logo" type="file" accept="image/*" onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Short bio</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={4} placeholder="What's your community about?" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Contact email</Label>
              <Input id="email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required maxLength={255} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => navigate("/")}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create Host"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

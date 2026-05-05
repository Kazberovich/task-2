import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type HostMembership = { host_id: string; role: "owner" | "manager" | "checker"; hosts: { slug: string; name: string } | null };

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  hostMemberships: HostMembership[];
  isHost: boolean;
  isChecker: boolean;
  signOut: () => Promise<void>;
  refreshMemberships: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hostMemberships, setHostMemberships] = useState<HostMembership[]>([]);

  const loadMemberships = async (uid: string | null) => {
    if (!uid) {
      setHostMemberships([]);
      return;
    }
    const { data } = await supabase
      .from("host_members")
      .select("host_id, role, hosts(slug, name)")
      .eq("user_id", uid);
    setHostMemberships((data as any) ?? []);
  };

  useEffect(() => {
    // Listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      // defer supabase calls
      setTimeout(() => loadMemberships(newSession?.user?.id ?? null), 0);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      loadMemberships(s?.user?.id ?? null).finally(() => setLoading(false));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshMemberships = async () => loadMemberships(user?.id ?? null);

  const isHost = hostMemberships.some((m) => m.role === "owner" || m.role === "manager");
  const isChecker = hostMemberships.length > 0;

  return (
    <AuthContext.Provider value={{ user, session, loading, hostMemberships, isHost, isChecker, signOut, refreshMemberships }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
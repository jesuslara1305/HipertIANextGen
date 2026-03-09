import type { Session } from "@supabase/supabase-js";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { supabase } from "../src/services/supabase";

type Profile = {
  id: string;
  onboarding_complete: boolean;
  avatar_url?: string | null;
};

type AuthCtx = {
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  loadingProfile: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<string | null>;
  refreshProfile: () => Promise<Profile | null>;
};

const Ctx = createContext<AuthCtx>({} as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    const user = (await supabase.auth.getUser()).data.user;

    if (!user) {
      setProfile(null);
      return null;
    }

    setLoadingProfile(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,onboarding_complete,avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setProfile(null);
        return null;
      }

      setProfile(data as Profile);
      return data as Profile;
    } catch (e: any) {
      console.log("refreshProfile error:", e?.message ?? e);
      setProfile(null);
      return null;
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
      if (data.session) refreshProfile();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) refreshProfile();
      else setProfile(null);
    });

    return () => sub.subscription.unsubscribe();
  }, [refreshProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return error.message;

      setSession(data.session ?? null);
      await refreshProfile();
      return null;
    } catch (e: any) {
      return e?.message ?? "Error desconocido al iniciar sesión";
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: "hipertia://auth-callback" },
      });

      if (error) return error.message;

      if (!data.user) {
        return "No se pudo crear la cuenta";
      }

      if (!data.session) return "CONFIRM_REQUIRED";

      setSession(data.session);
      await refreshProfile();
      return null;
    } catch (e: any) {
      return e?.message ?? "Error desconocido al registrar";
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return error.message;
      setSession(null);
      setProfile(null);
      return null;
    } catch (e: any) {
      return e?.message ?? "Error cerrando sesión";
    }
  };

  return (
    <Ctx.Provider
      value={{
        session,
        loading,
        profile,
        loadingProfile,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

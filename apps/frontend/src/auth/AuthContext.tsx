import {
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/api/client";
import type { Session } from "@/api/types";
import { auth, isDevAuthBypass, isFirebaseConfigured } from "./firebase";

type AdminAuthContextValue = {
  firebaseUser: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  configured: boolean;
  devBypass: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);
const DEV_SIGNED_OUT_KEY = "varjotapp.dev-auth-signed-out";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [devSignedOut, setDevSignedOut] = useState(
    () => isDevAuthBypass && sessionStorage.getItem(DEV_SIGNED_OUT_KEY) === "true",
  );

  useEffect(() => {
    if (isDevAuthBypass) {
      if (devSignedOut) {
        setFirebaseUser(null);
        setSession(null);
        setError(null);
        setLoading(false);
        return;
      }

      let active = true;
      setLoading(true);
      setError(null);
      api<Session>("/me")
        .then((value) => {
          if (active) setSession(value);
        })
        .catch((reason) => {
          if (!active) return;
          setError(
            reason instanceof Error
              ? reason.message
              : "Nao foi possivel usar o acesso de desenvolvimento.",
          );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }

    if (!auth) {
      setLoading(false);
      setError("A autenticação Firebase não está configurada.");
      return;
    }

    return onIdTokenChanged(auth, async (user) => {
      setFirebaseUser(user);
      setSession(null);
      setError(null);

      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        setSession(await api<Session>("/me"));
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível autorizar esta conta Google.",
        );
      } finally {
        setLoading(false);
      }
    });
  }, [devSignedOut]);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      firebaseUser,
      session,
      loading,
      error,
      configured: isFirebaseConfigured,
      devBypass: isDevAuthBypass,
      loginWithGoogle: async () => {
        if (isDevAuthBypass) {
          sessionStorage.removeItem(DEV_SIGNED_OUT_KEY);
          setDevSignedOut(false);
          return;
        }
        if (!auth) throw new Error("A autenticação Firebase não está configurada.");
        setError(null);
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await signInWithPopup(auth, provider);
      },
      logout: async () => {
        setError(null);
        if (isDevAuthBypass) {
          sessionStorage.setItem(DEV_SIGNED_OUT_KEY, "true");
          setSession(null);
          setFirebaseUser(null);
          setDevSignedOut(true);
          return;
        }
        if (auth) {
          await signOut(auth);
          setSession(null);
        }
      },
    }),
    [error, firebaseUser, loading, session],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error("useAdminAuth deve ser usado dentro de AdminAuthProvider.");
  return context;
}

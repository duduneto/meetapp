import { LogIn, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginPage() {
  const {
    configured,
    firebaseUser,
    session,
    loading,
    error: authorizationError,
    loginWithGoogle,
    devBypass,
  } = useAdminAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const destination =
    typeof location.state === "object" &&
    location.state &&
    "from" in location.state &&
    typeof location.state.from === "string"
      ? location.state.from
      : "/app/assignments";

  useEffect(() => {
    if ((firebaseUser || devBypass) && session) navigate(destination, { replace: true });
  }, [destination, devBypass, firebaseUser, navigate, session]);

  async function login() {
    setSubmitting(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível entrar com o Google.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-primary font-heading text-lg font-semibold text-primary-foreground">
            V
          </div>
          <h1 className="font-heading text-2xl font-semibold">Varjotapp</h1>
          <p className="text-sm text-muted-foreground">Designações congregacionais</p>
        </div>
        <Card>
          <CardHeader>
            <ShieldCheck className="mb-2 size-8 text-primary" />
            <CardTitle>Acesso administrativo</CardTitle>
            <CardDescription>
              Entre com a conta Google vinculada ao seu cadastro de administrador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              disabled={(!configured && !devBypass) || submitting || loading}
              onClick={() => void login()}
            >
              <LogIn />
              {submitting
                ? devBypass ? "Entrando..." : "Abrindo Google..."
                : devBypass ? "Entrar em desenvolvimento" : "Entrar com Google"}
            </Button>
            {!configured && !devBypass && (
              <p className="text-sm text-destructive">
                A configuração pública do Firebase não foi encontrada.
              </p>
            )}
            {(error || authorizationError) && (
              <p className="text-sm text-destructive">{error ?? authorizationError}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

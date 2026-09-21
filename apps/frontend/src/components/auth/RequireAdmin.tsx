import { LoaderCircle, ShieldAlert } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAdminAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { firebaseUser, session, loading, error, devBypass, logout } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="animate-spin" />
          Validando acesso administrativo...
        </p>
      </main>
    );
  }

  if (!firebaseUser && !devBypass) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!session || error) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <ShieldAlert className="mb-2 size-8 text-destructive" />
            <CardTitle>Acesso não autorizado</CardTitle>
            <CardDescription>
              {error ?? "Esta conta Google não está vinculada a um administrador ativo."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => void logout()}>
              Entrar com outra conta
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return children;
}

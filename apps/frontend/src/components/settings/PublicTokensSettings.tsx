import { CheckCircle2, KeyRound, Loader2, ShieldOff, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import type { PublicAccessToken } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function defaultExpiration() {
  const value = new Date();
  value.setDate(value.getDate() + 90);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

const statusContent = {
  ACTIVE: { label: "Ativo", variant: "success" as const },
  EXPIRED: { label: "Expirado", variant: "warning" as const },
  REVOKED: { label: "Revogado", variant: "destructive" as const },
};

export function PublicTokensSettings() {
  const [tokens, setTokens] = useState<PublicAccessToken[]>([]);
  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState(defaultExpiration);
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const minimumExpiration = useMemo(() => {
    const value = new Date();
    value.setMinutes(value.getMinutes() - value.getTimezoneOffset() + 1);
    return value.toISOString().slice(0, 16);
  }, []);

  async function loadTokens() {
    setLoading(true);
    setError(null);
    try {
      const response = await api<{ tokens: PublicAccessToken[] }>("/settings/public-tokens");
      setTokens(response.tokens);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar os tokens.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTokens();
  }, []);

  async function createToken() {
    if (!name.trim() || !expiresAt) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api("/settings/public-tokens", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          expiresAt: new Date(expiresAt).toISOString(),
          isDefault,
        }),
      });
      setName("");
      setExpiresAt(defaultExpiration());
      setMessage("Token público criado.");
      await loadTokens();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível criar o token.");
    } finally {
      setSaving(false);
    }
  }

  async function updateToken(tokenId: string, action: "default" | "revoke") {
    setPendingId(tokenId);
    setError(null);
    setMessage(null);
    try {
      await api(`/settings/public-tokens/${tokenId}/${action}`, { method: "POST" });
      setMessage(action === "default" ? "Token padrão atualizado." : "Token revogado.");
      await loadTokens();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar o token.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-5" />
          Links públicos
        </CardTitle>
        <CardDescription>
          Crie tokens com validade definida. O token padrão será usado ao compartilhar uma reunião.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.7fr)_auto] md:items-end">
          <label className="grid gap-1.5 text-sm font-medium">
            Nome do token
            <Input
              value={name}
              maxLength={80}
              placeholder="Ex.: Compartilhamento geral"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Expira em
            <Input
              type="datetime-local"
              min={minimumExpiration}
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </label>
          <Button onClick={createToken} disabled={saving || !name.trim() || !expiresAt}>
            {saving ? <Loader2 className="animate-spin" /> : <KeyRound />}
            Criar token
          </Button>
          <label className="flex items-center gap-2 text-sm md:col-span-3">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={isDefault}
              onChange={(event) => setIsDefault(event.target.checked)}
            />
            Usar como token padrão para compartilhar reuniões
          </label>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" />
            {message}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando tokens...
          </div>
        ) : tokens.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum token público foi criado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiração</TableHead>
                <TableHead>Criado por</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => {
                const status = statusContent[token.status];
                const pending = pendingId === token.id;
                return (
                  <TableRow key={token.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        {token.name}
                        {token.isDefault && <Badge variant="secondary">Padrão</Badge>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                    <TableCell>{formatDate(token.expiresAt)}</TableCell>
                    <TableCell>{token.createdByUser?.name ?? "Sistema"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {token.status === "ACTIVE" && !token.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() => updateToken(token.id, "default")}
                          >
                            <Star />
                            Tornar padrão
                          </Button>
                        )}
                        {token.status === "ACTIVE" && (
                          <RevokeTokenButton
                            tokenName={token.name}
                            pending={pending}
                            onConfirm={() => updateToken(token.id, "revoke")}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function RevokeTokenButton({
  tokenName,
  pending,
  onConfirm,
}: {
  tokenName: string;
  pending: boolean;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={pending}
        className={buttonVariants({ variant: "destructive", size: "sm" })}
      >
        {pending ? <Loader2 className="animate-spin" /> : <ShieldOff />}
        Revogar
      </PopoverTrigger>
      <PopoverContent align="end" className="space-y-4">
        <div className="space-y-1">
          <PopoverTitle>Revogar “{tokenName}”?</PopoverTitle>
          <PopoverDescription>
            Todos os links emitidos com este token deixarão de funcionar imediatamente.
          </PopoverDescription>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setOpen(false);
              void onConfirm();
            }}
          >
            Revogar token
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

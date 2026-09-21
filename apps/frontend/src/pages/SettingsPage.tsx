import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SettingsResponse = {
  congregation: {
    name: string;
    settings: { timezone: string; midweekDefaultWeekday: number; weekendDefaultWeekday: number };
  };
};

export function SettingsPage() {
  const [form, setForm] = useState({ name: "", timezone: "", midweekDefaultWeekday: 3, weekendDefaultWeekday: 6 });
  const [secret, setSecret] = useState<string | null>(null);

  useEffect(() => {
    api<SettingsResponse>("/settings").then(({ congregation }) =>
      setForm({
        name: congregation.name,
        timezone: congregation.settings.timezone,
        midweekDefaultWeekday: congregation.settings.midweekDefaultWeekday,
        weekendDefaultWeekday: congregation.settings.weekendDefaultWeekday
      })
    );
  }, []);

  return (
    <section>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Segredos aparecem somente ao regenerar.</p>
      </div>
      <Card>
        <CardContent className="form-grid grid gap-3">
          <Input placeholder="Nome da congregacao" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input placeholder="Timezone" value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} />
          <Input type="number" min={0} max={6} value={form.midweekDefaultWeekday} onChange={(event) => setForm({ ...form, midweekDefaultWeekday: Number(event.target.value) })} />
          <Input type="number" min={0} max={6} value={form.weekendDefaultWeekday} onChange={(event) => setForm({ ...form, weekendDefaultWeekday: Number(event.target.value) })} />
          <Button onClick={() => api<SettingsResponse>("/settings", { method: "PUT", body: JSON.stringify(form) })}>Salvar</Button>
        </CardContent>
      </Card>
      <div className="toolbar-actions">
        <Button variant="outline" onClick={async () => setSecret((await api<{ token: string }>("/settings/anonymous-token/regenerate", { method: "POST" })).token)}>Regenerar token anonimo</Button>
        <Button variant="outline" onClick={async () => setSecret((await api<{ apiKey: string }>("/settings/script-api-key/regenerate", { method: "POST" })).apiKey)}>Regenerar API key</Button>
      </div>
      {secret && <pre className="secret">{secret}</pre>}
    </section>
  );
}

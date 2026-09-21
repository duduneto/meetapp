import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type User = {
  id: string;
  firebaseUid: string | null;
  email: string;
  name: string;
  role: string;
  active: boolean;
};
const empty = { email: "", name: "", firebaseUid: "", role: "admin" as const, active: true };

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(empty);

  async function load() {
    setUsers((await api<{ users: User[] }>("/users")).users);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    await api("/users", { method: "POST", body: JSON.stringify(form) });
    setForm(empty);
    await load();
  }

  return (
    <section>
      <p className="mb-4 text-sm text-muted-foreground">Administradores criam editores e outros administradores.</p>
      <Card className="mb-4">
        <CardContent className="form-row border-0 bg-transparent p-0">
          <Input placeholder="Nome" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <Input placeholder="Firebase UID" value={form.firebaseUid} onChange={(event) => setForm({ ...form, firebaseUid: event.target.value })} />
          <Button onClick={create} disabled={!form.name || !form.email || !form.firebaseUid}>Criar admin</Button>
        </CardContent>
      </Card>
      <div className="data-list">
        {users.map((user) => (
          <div className="data-row" key={user.id}>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email} · {user.role} · {user.active ? "ativo" : "inativo"}</span>
              <span>Firebase UID: {user.firebaseUid ?? "não vinculado"}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

type User = { id: string; email: string; name: string; role: string; active: boolean };
const empty = { email: "", name: "", role: "editor", active: true };

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
      <div className="page-header">
        <h1>Usuarios</h1>
        <p>Administradores criam editores e outros administradores.</p>
      </div>
      <Card className="mb-4">
        <CardContent className="form-row border-0 bg-transparent p-0">
          <Input placeholder="Nome" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <NativeSelect className="w-full max-w-60" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <NativeSelectOption value="editor">Editor</NativeSelectOption>
            <NativeSelectOption value="admin">Admin</NativeSelectOption>
          </NativeSelect>
          <Button onClick={create} disabled={!form.name || !form.email}>Criar</Button>
        </CardContent>
      </Card>
      <div className="data-list">
        {users.map((user) => (
          <div className="data-row" key={user.id}>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email} · {user.role} · {user.active ? "ativo" : "inativo"}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

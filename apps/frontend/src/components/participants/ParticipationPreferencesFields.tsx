import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MIDWEEK_PREFERENCE_SECTIONS,
  ROLE_LABELS,
  WEEKEND_PREFERENCE_SECTIONS,
  type MeetingPreferenceFormState,
  type ParticipationRoleKey,
  type PreferenceSectionDefinition,
  type PreferencesFormState,
} from "@/lib/participationPreferences";
import { cn } from "@/lib/utils";

function CheckboxRow({
  checked,
  label,
  onChange,
  indent = false,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  indent?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 text-sm",
        indent && "pl-6",
      )}
    >
      <input
        type="checkbox"
        className="size-4 accent-primary"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function SectionPreferenceBlock({
  definition,
  value,
  onChange,
}: {
  definition: PreferenceSectionDefinition;
  value: { enabled: boolean; roles: ParticipationRoleKey[] };
  onChange: (next: { enabled: boolean; roles: ParticipationRoleKey[] }) => void;
}) {
  function toggleRole(role: ParticipationRoleKey, checked: boolean) {
    const roles = checked
      ? [...new Set([...value.roles, role])]
      : value.roles.filter((item) => item !== role);
    onChange({
      enabled: roles.length > 0 ? true : value.enabled,
      roles,
    });
  }

  function toggleSection(checked: boolean) {
    onChange({
      enabled: checked,
      roles: checked ? [...definition.roles] : [],
    });
  }

  return (
    <Collapsible defaultOpen={value.enabled} className="rounded-lg border px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <CheckboxRow
          checked={value.enabled}
          label={definition.title}
          onChange={toggleSection}
        />
        <CollapsibleTrigger className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <ChevronDown className="size-4" />
          <span className="sr-only">Detalhes de {definition.title}</span>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="mt-2 space-y-2 border-t pt-2">
        {definition.roles.map((role) => (
          <CheckboxRow
            key={role}
            indent
            checked={value.roles.includes(role)}
            label={ROLE_LABELS[role]}
            onChange={(checked) => {
              if (checked && !value.enabled) {
                onChange({ enabled: true, roles: [role] });
                return;
              }
              toggleRole(role, checked);
            }}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function MeetingPreferenceBlock({
  title,
  definitions,
  value,
  onChange,
}: {
  title: string;
  definitions: PreferenceSectionDefinition[];
  value: MeetingPreferenceFormState;
  onChange: (next: MeetingPreferenceFormState) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border p-3">
      <CheckboxRow
        checked={value.enabled}
        label={title}
        onChange={(enabled) => {
          if (!enabled) {
            onChange({
              enabled: false,
              sections: Object.fromEntries(
                definitions.map((section) => [
                  section.key,
                  { enabled: false, roles: [] as ParticipationRoleKey[] },
                ]),
              ),
            });
            return;
          }
          onChange({ ...value, enabled: true });
        }}
      />
      {value.enabled && (
        <div className="space-y-2 pl-1">
          <p className="text-xs text-muted-foreground">
            Marque as seções e, se quiser, os tipos de participação.
          </p>
          {definitions.map((definition) => (
            <SectionPreferenceBlock
              key={definition.key}
              definition={definition}
              value={value.sections[definition.key] ?? { enabled: false, roles: [] }}
              onChange={(section) =>
                onChange({
                  ...value,
                  sections: { ...value.sections, [definition.key]: section },
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ParticipationPreferencesFields({
  value,
  onChange,
}: {
  value: PreferencesFormState;
  onChange: (next: PreferencesFormState) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Preferências de participação</p>
        <p className="text-xs text-muted-foreground">
          Opcional. Sem restrição, o participante pode ser designado em qualquer parte.
        </p>
      </div>

      <CheckboxRow
        checked={value.configure}
        label="Definir preferências de reunião e funções"
        onChange={(configure) => {
          if (!configure) {
            onChange({
              configure: false,
              midweek: value.midweek,
              weekend: value.weekend,
            });
            return;
          }
          onChange({ ...value, configure: true });
        }}
      />

      {value.configure && (
        <div className="space-y-3">
          <MeetingPreferenceBlock
            title="Reunião de meio de semana"
            definitions={MIDWEEK_PREFERENCE_SECTIONS}
            value={value.midweek}
            onChange={(midweek) => onChange({ ...value, midweek })}
          />
          <MeetingPreferenceBlock
            title="Reunião de fim de semana"
            definitions={WEEKEND_PREFERENCE_SECTIONS}
            value={value.weekend}
            onChange={(weekend) => onChange({ ...value, weekend })}
          />
        </div>
      )}
    </div>
  );
}

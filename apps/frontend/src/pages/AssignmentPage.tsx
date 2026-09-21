import { Link, useParams } from "react-router-dom";
import { MeetingAssignmentView } from "../components/assignments/MeetingAssignmentView";
import { buttonVariants } from "@/components/ui/button";

export function AssignmentPage() {
  const { year, week, type } = useParams();

  if (!year || !week || (type !== "midweek" && type !== "weekend")) {
    return <EmptyState title="Reunião inválida" detail="Verifique o endereço informado." />;
  }

  return (
    <>
      <Link className={`${buttonVariants({ variant: "outline", size: "sm" })} no-print mb-4`} to="/app/assignments">Voltar</Link>
      <MeetingAssignmentView
        year={year}
        week={week}
        type={type}
      />
    </>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty-state">
      <h1>{title}</h1>
      <p>{detail}</p>
    </div>
  );
}

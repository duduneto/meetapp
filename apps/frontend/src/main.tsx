import React from "react";
import ReactDOM from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AdminAuthProvider } from "./auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { RequireAdmin } from "./components/auth/RequireAdmin";
import { TooltipProvider } from "./components/ui/tooltip";
import { AssignmentPage } from "./pages/AssignmentPage";
import { AssignmentsIndexPage } from "./pages/AssignmentsIndexPage";
import { BiPage } from "./pages/BiPage";
import { ParticipantsPage } from "./pages/ParticipantsPage";
import { ParticipationPage } from "./pages/ParticipationPage";
import { LoginPage } from "./pages/LoginPage";
import { PublicPage } from "./pages/PublicPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UsersPage } from "./pages/UsersPage";
import "./styles.css";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/app/assignments" replace /> },
  {
    path: "/app",
    element: (
      <RequireAdmin>
        <AppShell />
      </RequireAdmin>
    ),
    children: [
      { path: "assignments", element: <AssignmentsIndexPage /> },
      { path: "assignments/:year/:week/:type", element: <AssignmentPage /> },
      { path: "participants", element: <ParticipantsPage /> },
      { path: "bi", element: <BiPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "settings", element: <SettingsPage /> }
    ]
  },
  { path: "/login", element: <LoginPage /> },
  { path: "/participation", element: <ParticipationPage /> },
  { path: "/public", element: <PublicPage /> }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AdminAuthProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </AdminAuthProvider>
  </React.StrictMode>
);

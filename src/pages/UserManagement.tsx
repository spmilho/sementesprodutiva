import { useRole } from "@/hooks/useRole";
import { Navigate } from "react-router-dom";
import UsersTab from "@/components/settings/UsersTab";

export default function UserManagement() {
  const { isAdmin, loading } = useRole();

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Usuários & Roles</h1>
        <p className="text-sm text-muted-foreground">Cadastre usuários, atribua perfis e gerencie permissões</p>
      </div>
      <UsersTab />
    </div>
  );
}

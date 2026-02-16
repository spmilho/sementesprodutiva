import { Construction } from "lucide-react";

export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mx-auto mb-4">
          <Construction className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Este módulo está em desenvolvimento. Em breve você poderá acessar todas as funcionalidades.
        </p>
      </div>
    </div>
  );
}

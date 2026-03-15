import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileWarning, Loader2 } from "lucide-react";

const buildServeReportUrl = (path: string) =>
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/serve-report?path=${encodeURIComponent(path)}`;

const extractTitle = (html: string) => {
  const match = html.match(/<title>(.*?)<\/title>/i);
  return match?.[1]?.trim() || "Relatório compartilhado";
};

export default function SharedReportPage() {
  const [searchParams] = useSearchParams();
  const path = searchParams.get("path")?.trim() || "";
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(path ? null : "Link do relatório está incompleto.");

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();

    const loadReport = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(buildServeReportUrl(path), {
          method: "GET",
          signal: controller.signal,
        });

        const text = await response.text();

        if (!response.ok) {
          throw new Error(text || "Não foi possível carregar o relatório compartilhado.");
        }

        if (!active) return;

        setHtml(text);
        document.title = extractTitle(text);
      } catch (err) {
        if (!active || controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Não foi possível carregar o relatório compartilhado.";
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadReport();

    return () => {
      active = false;
      controller.abort();
    };
  }, [path]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">Abrindo relatório</h1>
            <p className="text-sm text-muted-foreground">Carregando a versão compartilhada...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !html) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="max-w-md space-y-4 rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileWarning className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-lg font-semibold">Não foi possível abrir o relatório</h1>
            <p className="text-sm text-muted-foreground">{error || "O conteúdo compartilhado não está disponível."}</p>
          </div>
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
            Voltar ao app
          </Link>
        </div>
      </div>
    );
  }

  return <iframe title="Relatório compartilhado" srcDoc={html} className="block h-screen w-full border-0 bg-background" />;
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Store preference before login
      localStorage.setItem("remember_me", rememberMe ? "true" : "false");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
      setForgotMode(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary mx-auto">
            <Leaf className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">Sementes Produtiva</CardTitle>
          <CardDescription>
            {forgotMode ? "Recuperar senha" : "Entre na sua conta"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {forgotMode ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </Button>
              <div className="text-center text-sm">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setForgotMode(false)}
                >
                  Voltar ao login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(v === true)}
                />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                  Permanecer logado
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Aguarde..." : "Entrar"}
              </Button>
              <div className="text-center text-sm">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setForgotMode(true)}
                >
                  Esqueci minha senha
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

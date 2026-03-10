import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface DestinoNotificacao {
  modulo: string;
  referenciaId: string;
  tipo?: string;
}

interface NotificacaoNavContextValue {
  destino: DestinoNotificacao | null;
  navegarPara: (d: DestinoNotificacao) => void;
  limparDestino: () => void;
}

const NotificacaoNavContext = createContext<NotificacaoNavContextValue>({
  destino: null,
  navegarPara: () => {},
  limparDestino: () => {},
});

export function NotificacaoNavProvider({ children }: { children: ReactNode }) {
  const [destino, setDestino] = useState<DestinoNotificacao | null>(null);

  const navegarPara = useCallback((d: DestinoNotificacao) => {
    setDestino(d);
  }, []);

  const limparDestino = useCallback(() => {
    setDestino(null);
  }, []);

  return (
    <NotificacaoNavContext.Provider value={{ destino, navegarPara, limparDestino }}>
      {children}
    </NotificacaoNavContext.Provider>
  );
}

export const useNotificacaoNav = () => useContext(NotificacaoNavContext);

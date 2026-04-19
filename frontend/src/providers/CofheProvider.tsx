import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { getCofheClient } from "../lib/cofhe-client";

interface CofheContextValue {
  isReady: boolean;
  error: string | null;
}

const CofheContext = createContext<CofheContextValue>({
  isReady: false,
  error: null,
});

export function useCofhe() {
  return useContext(CofheContext);
}

export function CofheProvider({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !publicClient || !walletClient) {
      setIsReady(false);
      return;
    }

    let cancelled = false;
    const client = getCofheClient();

    client
      .connect(publicClient, walletClient)
      .then(() => {
        if (!cancelled) {
          setIsReady(true);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to initialize CoFHE client");
          setIsReady(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isConnected, publicClient, walletClient]);

  return (
    <CofheContext.Provider value={{ isReady, error }}>
      {children}
    </CofheContext.Provider>
  );
}

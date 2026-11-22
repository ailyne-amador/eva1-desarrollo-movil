import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  UnauthorizedError,
  getCurrentUser,
  login as loginRequest,
  logoutFromServer,
  register as registerRequest,
  setUnauthorizedHandler,
} from "../services/api";
import {
  clearAuthToken,
  getAuthToken,
  saveAuthToken,
  saveRefreshToken,
} from "../services/authStorage";

type AuthStatus = "loading" | "signedOut" | "signedIn";

export type AuthUser = { id: number; email: string };

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const signOut = useCallback(async () => {
    try {
      await logoutFromServer();
      await clearAuthToken();
    } finally {
      setUser(null);
      queryClient.clear();
      setStatus("signedOut");
    }
  }, [queryClient]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { accessToken, refreshToken, user: signedInUser } =
        await loginRequest(email, password);
      await Promise.all([
        saveAuthToken(accessToken),
        saveRefreshToken(refreshToken),
      ]);
      setUser(signedInUser);
      queryClient.clear();
      setStatus("signedIn");
    },
    [queryClient],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const { accessToken, refreshToken, user: signedUpUser } =
        await registerRequest(email, password);
      await Promise.all([
        saveAuthToken(accessToken),
        saveRefreshToken(refreshToken),
      ]);
      setUser(signedUpUser);
      queryClient.clear();
      setStatus("signedIn");
    },
    [queryClient],
  );

  useEffect(() => {
    let active = true;
    setUnauthorizedHandler(signOut);

    async function restoreSession() {
      try {
        const token = await getAuthToken();
        if (!token) {
          if (active) setStatus("signedOut");
          return;
        }

        try {
          const currentUser = await getCurrentUser();
          if (active) {
            setUser(currentUser);
            setStatus("signedIn");
          }
        } catch (error) {
          if (error instanceof UnauthorizedError) {
            // El handler global de 401 ya limpió token y caché; solo sincronizamos el estado.
            if (active) {
              setUser(null);
              setStatus("signedOut");
            }
            return;
          }
          const savedToken = await getAuthToken();
          if (active) {
            setStatus(savedToken ? "signedIn" : "signedOut");
          }
        }
      } catch {
        if (active) setStatus("signedOut");
      }
    }

    void restoreSession();
    return () => {
      active = false;
      setUnauthorizedHandler(null);
    };
  }, [signOut]);

  return (
    <AuthContext.Provider value={{ status, signIn, signUp, signOut, user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return auth;
}

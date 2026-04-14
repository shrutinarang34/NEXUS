
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import { auth } from "./firebase";
import { useRouter, usePathname } from "next/navigation";
import { is2faEnabledForUser, updateUserSettings } from "./firestore";
import { Spinner } from "@/components/ui/spinner";


interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicRoutes = ['/login', '/signup', '/verify-email', '/verify-otp', '/setup-2fa'];
const is2faFeatureEnabled = process.env.NEXT_PUBLIC_2FA_ENABLED === '1';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // If user is not verified and not on a public route, redirect them
        if (!fbUser.emailVerified && !publicRoutes.includes(pathname)) {
          router.push('/verify-email');
          setUser(null); // Treat unverified user as not fully logged in
        } else {
             const hasSeen2faPrompt = localStorage.getItem(`2fa-prompt-${fbUser.uid}`);
             if (is2faFeatureEnabled && fbUser.emailVerified && !hasSeen2faPrompt && pathname !== '/setup-2fa') {
                 router.push('/setup-2fa');
                 setUser(null);
             } else {
                 setUser(fbUser);
             }
        }
      } else {
        setUser(null);
        if (!publicRoutes.includes(pathname)) {
            router.push("/login");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, router]);

  const logout = async () => {
    if (user) {
        await updateUserSettings(user.uid, { lastLogin: null });
    }
    await signOut(auth);
    sessionStorage.removeItem('2fa-verified');
    sessionStorage.removeItem('pending-2fa-uid');
    setUser(null);
    router.push("/login");
  };

  const value = { user, loading, logout };
  
  if (loading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Spinner size="large" />
        </div>
    );
  }

  // If on a public route, render children immediately without full auth check
  if (publicRoutes.includes(pathname)) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  // For protected routes, ensure user is loaded and valid before rendering
  if (!user) {
     return (
        <div className="flex h-screen w-full items-center justify-center">
            <Spinner size="large" />
        </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

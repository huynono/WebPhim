import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { getUser, isAuthenticated, User as UserType } from '../utils/auth';

interface AuthContextType {
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  user: UserType | null;
  setUser: (user: UserType | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        const userData = getUser();
        setUser(userData);
      } else {
        setUser(null);
      }
    };
    
    checkAuthStatus();
    
    // Listen for storage changes (when user logs in from another tab)
    const handleStorageChange = () => {
      checkAuthStatus();
    };
    
    // Listen for custom login event
    const handleUserLoggedIn = () => {
      checkAuthStatus();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLoggedIn', handleUserLoggedIn);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
    };
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      user,
      setUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

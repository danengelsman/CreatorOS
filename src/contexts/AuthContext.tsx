import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, completeGoogleRedirect, onAuthStateChanged } from '@/firebase';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  query,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { useWorkspaceStore } from '@/store/workspaceStore';

export interface AuthContextType {
  user: any;
  userData: any;
  isAuthLoading: boolean;
  showOnboarding: boolean;
  setShowOnboarding: (val: boolean) => void;
  setActiveTab: (tab: string) => void;
  activeTab: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  const { setProjects, setIsProjectsLoading, setIsProjectsLoadError, setBrand } =
    useWorkspaceStore();

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    const safetyTimeout = setTimeout(() => {
      if (isActive) setIsAuthLoading(false);
    }, 5000);

    const initAuth = async () => {
      try {
        await completeGoogleRedirect();
      } catch (err) {
        console.warn('Google redirect check completed:', err);
      }

      if (!isActive) return;

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          if (!isActive) return;
          if (firebaseUser) {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
              setShowOnboarding(true);
              await setDoc(userRef, {
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                accountProvider: firebaseUser.providerData[0]?.providerId || 'google',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                subscriptionTier: 'free',
                accountStatus: 'active',
              });
            } else {
              await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
            }
            if (isActive) setUser(firebaseUser);
          } else {
            if (isActive) {
              setUser(null);
              setUserData(null);
              setShowOnboarding(false);
              setActiveTab('home');
            }
          }
        } catch (error) {
          console.error('Error during auth state change:', error);
          if (isActive) setUser(firebaseUser);
        } finally {
          if (isActive) {
            clearTimeout(safetyTimeout);
            setIsAuthLoading(false);
          }
        }
      });
    };

    void initAuth();

    return () => {
      isActive = false;
      clearTimeout(safetyTimeout);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setIsProjectsLoading(true);
      setBrand(null);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) setUserData(snap.data());
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      },
    );

    const brandRef = doc(db, 'projects', `brand_${user.uid}`);
    const unsubscribeBrand = onSnapshot(
      brandRef,
      (snap) => {
        if (snap.exists()) {
          const projectData = snap.data();
          setBrand(projectData.status === 'draft' ? null : projectData.data || null);
        } else {
          setBrand(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `projects/brand_${user.uid}`);
      },
    );

    const projectsRef = collection(db, 'projects');
    const q = query(projectsRef, where('userId', '==', user.uid));
    const unsubscribeProjects = onSnapshot(
      q,
      (snap) => {
        const projectsData = snap.docs
          .filter((doc) => !doc.id.startsWith('brand_'))
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort(
            (a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
          );
        setProjects(projectsData);
        setIsProjectsLoadError(false);
        setIsProjectsLoading(false);
      },
      (error) => {
        setIsProjectsLoadError(true);
        setIsProjectsLoading(false);
        handleFirestoreError(error, OperationType.GET, 'projects');
      },
    );

    return () => {
      unsubscribeUser();
      unsubscribeBrand();
      unsubscribeProjects();
    };
  }, [user, setProjects, setIsProjectsLoading, setIsProjectsLoadError]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        isAuthLoading,
        showOnboarding,
        setShowOnboarding,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

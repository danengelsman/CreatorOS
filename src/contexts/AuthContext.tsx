import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { auth, completeGoogleRedirect, onAuthStateChanged } from '@/firebase';
import {
  doc,
  runTransaction,
  serverTimestamp,
  onSnapshot,
  collection,
  query,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { ONBOARDING_IN_PROGRESS } from '@/lib/onboardingState';
import {
  useWorkspaceStore,
  isWorkspaceTokenCurrent,
  type WorkspaceToken,
} from '@/store/workspaceStore';

export interface AuthContextType {
  user: any;
  workspaceToken: WorkspaceToken | null;
  userData: any;
  isAuthLoading: boolean;
  authError: boolean;
  showOnboarding: boolean;
  setShowOnboarding: (val: boolean) => void;
  setActiveTab: (tab: string) => void;
  activeTab: string;
  captureAccount: (uid: string) => () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [workspaceToken, setWorkspaceToken] = useState<WorkspaceToken | null>(null);
  const account = useRef<{
    uid: string | null;
    token: WorkspaceToken | null;
    initialized: boolean;
  }>({
    uid: null,
    token: null,
    initialized: false,
  });

  const captureAccount = useCallback((uid: string) => {
    const token = account.current.uid === uid ? account.current.token : null;
    return () => isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token);
  }, []);

  useEffect(() => {
    let isActive = true;
    let authEvent = 0;
    let safetyTimeout: ReturnType<typeof setTimeout> | undefined;
    const armTimeout = (event: number) => {
      clearTimeout(safetyTimeout);
      safetyTimeout = setTimeout(() => {
        if (!isActive || event !== authEvent) return;
        // Pending profile work must not grant access, but can still recover
        // if it finishes for this exact auth event and account generation.
        setUser(null);
        setAuthError(true);
        setIsAuthLoading(false);
      }, 15000);
    };
    armTimeout(authEvent);

    // The auth observer is authoritative. A redirect result is not a session:
    // it may finish after a sign-out or another sign-in.
    void completeGoogleRedirect().catch((err) => {
      if (isActive) console.warn('Google redirect check completed:', err);
    });
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isActive) return;
      const uid = currentUser?.uid || null;
      const event = ++authEvent;
      setAuthError(false);
      if (uid) setIsAuthLoading(true);
      if (!account.current.initialized || account.current.uid !== uid) {
        const token = useWorkspaceStore.getState().changeAccount(uid);
        account.current = { uid, token, initialized: true };
        setWorkspaceToken(null);
        setUserData(null);
        setUser(null);
        setShowOnboarding(false);
      }
      const token = account.current.token;
      const isCurrent = () =>
        isActive &&
        event === authEvent &&
        (token
          ? isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token)
          : account.current.initialized &&
            account.current.uid === null &&
            useWorkspaceStore.getState().uid === null);
      armTimeout(event);
      try {
        if (currentUser) {
          const userRef = doc(db, 'users', currentUser.uid);
          // A transaction prevents a delayed first-login create from replacing a
          // profile (or its completed onboarding) created by another session.
          const needsOnboarding = await runTransaction(db, async (transaction) => {
            const userSnap = await transaction.get(userRef);
            if (!isCurrent()) return false;
            if (!userSnap.exists()) {
              transaction.set(userRef, {
                email: currentUser.email,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
                accountProvider: currentUser.providerData?.[0]?.providerId || 'google',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                subscriptionTier: 'free',
                accountStatus: 'active',
                onboardingAnswers: { summary: ONBOARDING_IN_PROGRESS },
              });
              return true;
            }
            transaction.set(userRef, { lastLogin: serverTimestamp() }, { merge: true });
            const answers = userSnap.data()?.onboardingAnswers;
            return answers?.summary === ONBOARDING_IN_PROGRESS && Object.keys(answers).length === 1;
          });
          if (isCurrent()) {
            setShowOnboarding(needsOnboarding);
            setWorkspaceToken(token);
            setUser(currentUser);
            setAuthError(false);
          }
        } else {
          setActiveTab('home');
        }
      } catch (error) {
        if (isCurrent()) {
          console.error('Error during auth state change:', error);
          setUser(null);
          setAuthError(true);
        }
      } finally {
        if (isCurrent()) {
          clearTimeout(safetyTimeout);
          setIsAuthLoading(false);
        }
      }
    });

    return () => {
      isActive = false;
      useWorkspaceStore.getState().invalidateAccount(account.current.token);
      account.current = { uid: null, token: null, initialized: false };
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || !workspaceToken || workspaceToken.uid !== user.uid) return;

    const token = workspaceToken;
    let subscribed = true;
    const isCurrent = () =>
      subscribed && isWorkspaceTokenCurrent(useWorkspaceStore.getState(), token);

    const userRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(
      userRef,
      (snap) => {
        if (!isCurrent()) return;
        setUserData(snap.exists() ? snap.data() : null);
      },
      (error) => {
        if (!isCurrent()) return;
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      },
    );

    const brandRef = doc(db, 'projects', `brand_${user.uid}`);
    const unsubscribeBrand = onSnapshot(
      brandRef,
      (snap) => {
        if (!isCurrent()) return;
        if (snap.exists()) {
          const projectData = snap.data();
          useWorkspaceStore
            .getState()
            .setBrand(token, projectData.status === 'draft' ? null : projectData.data || null);
        } else {
          useWorkspaceStore.getState().setBrand(token, null);
        }
      },
      (error) => {
        if (!isCurrent()) return;
        handleFirestoreError(error, OperationType.GET, `projects/brand_${user.uid}`);
      },
    );

    const projectsRef = collection(db, 'projects');
    const q = query(projectsRef, where('userId', '==', user.uid));
    const unsubscribeProjects = onSnapshot(
      q,
      (snap) => {
        if (!isCurrent()) return;
        const projectsData = snap.docs
          .filter((doc) => !doc.id.startsWith('brand_'))
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort(
            (a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
          );
        useWorkspaceStore.getState().setProjects(token, projectsData);
        useWorkspaceStore.getState().setProjectsStatus(token, false, false);
      },
      (error) => {
        if (!isCurrent()) return;
        useWorkspaceStore.getState().setProjectsStatus(token, false, true);
        handleFirestoreError(error, OperationType.GET, 'projects');
      },
    );

    return () => {
      subscribed = false;
      unsubscribeUser();
      unsubscribeBrand();
      unsubscribeProjects();
    };
  }, [user, workspaceToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaceToken,
        userData,
        isAuthLoading,
        authError,
        showOnboarding,
        setShowOnboarding,
        activeTab,
        captureAccount,
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

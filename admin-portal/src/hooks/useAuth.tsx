'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: User | null;
  orgId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  orgId: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isCheckingAuth = useRef(false);
  const hasCompletedInitialCheck = useRef(false);
  const validatedUserId = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Skip if we're already checking auth to prevent race conditions
      if (isCheckingAuth.current) {
        return;
      }
      
      // Skip if this is the same validated user (prevents re-validation on re-renders)
      // Check BEFORE setting any state to prevent re-renders
      if (firebaseUser && validatedUserId.current === firebaseUser.uid && hasCompletedInitialCheck.current) {
        return;
      }
      
      // If user logged out
      if (!firebaseUser) {
        setUser(null);
        setUserData(null);
        setOrgId(null);
        hasCompletedInitialCheck.current = false;
        validatedUserId.current = null;
        setLoading(false);
        return;
      }
      
      // Only set user and check trainer if this is a new/different user
      setUser(firebaseUser);
      isCheckingAuth.current = true;
      
      try {
        // Check if user is a trainer (admin portal is only for trainers/admins)
        const trainerDoc = await getDoc(doc(db, 'trainers', firebaseUser.uid));
        
        if (trainerDoc.exists()) {
          const trainerData = trainerDoc.data();
          
          // Get role from orgMembers collection
          let role: 'owner' | 'admin' | 'trainer' = 'trainer';
          try {
            const orgMembersQuery = query(
              collection(db, 'orgMembers'),
              where('userId', '==', firebaseUser.uid),
              where('orgId', '==', trainerData.orgId)
            );
            const orgMembersSnap = await getDocs(orgMembersQuery);
            if (!orgMembersSnap.empty) {
              const memberData = orgMembersSnap.docs[0].data();
              role = memberData.role as 'owner' | 'admin' | 'trainer';
              console.log('Auth: User role from orgMembers:', role);
            }
          } catch (err) {
            console.warn('Auth: Could not fetch orgMembers role, defaulting to trainer:', err);
          }
          
          setUserData({ 
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: trainerData.name || `${trainerData.firstName || ''} ${trainerData.lastName || ''}`.trim() || '',
            role: role,
            orgId: trainerData.orgId,
          } as User);
          
          setOrgId(trainerData.orgId);
          hasCompletedInitialCheck.current = true;
          validatedUserId.current = firebaseUser.uid;
        } else {
          console.error('Auth: User is not a trainer. Admin portal access denied.');
          setUserData(null);
          setOrgId(null);
          
          // Only sign out if we haven't already tried
          if (!hasCompletedInitialCheck.current) {
            hasCompletedInitialCheck.current = true;
            await firebaseSignOut(auth);
          }
        }
      } catch (error) {
        console.error('Auth: Error fetching trainer data:', error);
        setUserData(null);
        setOrgId(null);
      } finally {
        isCheckingAuth.current = false;
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []); // Empty dependency array - only run once on mount

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userData, orgId, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

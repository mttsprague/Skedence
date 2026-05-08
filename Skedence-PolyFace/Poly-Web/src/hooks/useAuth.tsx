'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { auth, db, functions, ORG_ID } from '@/lib/firebase';
import { UserProfile } from '@/types';
import { generateUserDocId } from '@/lib/utils';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  /** Name-based Firestore document ID (e.g. "john_doe"). Use this for Firestore queries, NOT user.uid. */
  userDocId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phoneNumber: string,
    athleteFirstName: string,
    athleteLastName: string,
    athleteBirthday: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const validatedUid = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Anti-glitch: skip if already validated this user
      if (firebaseUser && validatedUid.current === firebaseUser.uid) {
        return;
      }

      if (firebaseUser) {
        validatedUid.current = firebaseUser.uid;
        setUser(firebaseUser);

        // Resolve name-based doc ID by querying users by authUserId field
        try {
          const usersSnap = await getDocs(
            query(
              collection(db, 'users'),
              where('authUserId', '==', firebaseUser.uid),
              limit(1)
            )
          );
          if (!usersSnap.empty) {
            const userDoc = usersSnap.docs[0];
            setUserDocId(userDoc.id);
            setProfile({ id: userDoc.id, ...userDoc.data() } as UserProfile);
          } else {
            // Fallback: orgMembers lookup (no isActive filter — some old records may not have it)
            const memberSnap = await getDocs(
              query(
                collection(db, 'orgMembers'),
                where('authUserId', '==', firebaseUser.uid),
                limit(1)
              )
            );
            if (!memberSnap.empty) {
              const memberData = memberSnap.docs[0].data();
              const memberId = memberData.userId as string;
              setUserDocId(memberId);
              // Also load the user doc so profile name is populated
              const userDocSnap = await getDoc(doc(db, 'users', memberId));
              if (userDocSnap.exists()) {
                setProfile({ id: memberId, ...userDocSnap.data() } as UserProfile);
              }
            }
          }
        } catch (err) {
          console.error('Failed to load user profile:', err);
        }
      } else {
        validatedUid.current = null;
        setUser(null);
        setProfile(null);
        setUserDocId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phoneNumber: string,
    athleteFirstName: string,
    athleteLastName: string,
    athleteBirthday: string
  ) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;
    // Send verification email via SendGrid Cloud Function (non-blocking — user can resend if this fails)
    try {
      const sendVerificationEmailFn = httpsCallable(functions, 'sendVerificationEmail');
      await sendVerificationEmailFn({ email });
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
      // Don't block signup — user can request resend on the verify-email page
    }

    // Generate name-based doc ID matching iOS convention: firstname_lastname
    const docId = generateUserDocId(firstName, lastName);

    // Write to users/{firstName_lastName} — mirrors iOS AuthManager.register()
    await setDoc(doc(db, 'users', docId), {
      authUserId: uid,
      emailAddress: email,        // iOS uses emailAddress, not email
      firstName,
      lastName,
      phoneNumber,
      athleteFirstName,
      athleteLastName,
      athleteBirthday,
      athletes: athleteFirstName ? [{
        firstName: athleteFirstName,
        lastName: athleteLastName,
        birthday: athleteBirthday,
      }] : [],
      role: 'client',
      orgId: ORG_ID,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Write to orgMembers/{authUid}_{orgId} — mirrors iOS pattern
    await setDoc(doc(db, 'orgMembers', `${uid}_${ORG_ID}`), {
      orgId: ORG_ID,
      userId: docId,
      authUserId: uid,
      role: 'client',
      createdAt: serverTimestamp(),
      isActive: true,
    });

    const profileData: UserProfile = {
      id: docId,
      firstName,
      lastName,
      email,
      authUserId: uid,
      phoneNumber,
      athleteFirstName,
      athleteLastName,
      athleteBirthday,
      role: 'client',
      orgId: ORG_ID,
      isActive: true,
      createdAt: new Date(),
    };
    setProfile(profileData);
    setUserDocId(docId);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email, {
      url: 'https://www.polyfacevolleyball.com/login',
      handleCodeInApp: false,
    });
  }

  return (
    <AuthContext.Provider value={{ user, profile, userDocId, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

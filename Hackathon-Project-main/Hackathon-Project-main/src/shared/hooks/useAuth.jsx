// src/shared/hooks/useAuth.js
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Dacă e logat, îi căutăm rolul în colecția 'users'
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setRole(docSnap.data().role);
            setDepartment(docSnap.data().department);
          }
        } catch (err) {
          console.error("Eroare la verificarea rolului:", err);
        }
      } else {
        // Dacă nu e logat, resetăm totul
        setUser(null);
        setRole(null);
        setDepartment(null);
      }
      setLoading(false); // Am terminat verificarea
    });

    return () => unsubscribe();
  }, []);

  return { user, role, department, loading };
};
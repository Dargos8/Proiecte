// shared/hooks/useTicket.js
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';

export const useTicket = (id) => {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    
    // Conectare reală la Firestore la documentul cu ID-ul respectiv
    const docRef = doc(db, 'issues', id);

    // onSnapshot ascultă documentul în timp real
    const unsubscribe = onSnapshot(docRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          setTicket({ id: docSnap.id, ...docSnap.data() });
          setError(null);
        } else {
          setError('Tichetul nu a fost găsit în baza de date.');
        }
        setLoading(false);
      }, 
      (err) => {
        console.error("Eroare Firebase pe ticket:", err);
        setError('Eroare la conectarea cu baza de date.');
        setLoading(false);
      }
    );

    // Cleanup la demontarea componentei
    return () => unsubscribe();
  }, [id]);

  return { ticket, loading, error };
};
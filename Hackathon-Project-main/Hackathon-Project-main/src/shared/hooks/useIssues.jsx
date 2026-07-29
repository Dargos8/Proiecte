// shared/hooks/useIssues.js
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';

export const useIssues = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tragem toate documentele, ordonate descrescător din start
    const q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issuesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setIssues(issuesData);
      setLoading(false);
    }, (error) => {
      console.error("Eroare la extragerea datelor:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { issues, loading };
};
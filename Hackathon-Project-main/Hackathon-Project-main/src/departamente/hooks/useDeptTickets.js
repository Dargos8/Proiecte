import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../../shared/utils/firebase";
import { useAuth } from "../../shared/hooks/useAuth";

export function useDeptTickets() {
  const { user, department, loading: authLoading } = useAuth();

  const [pendingTickets,  setPendingTickets]  = useState([]);
  const [resolvedTickets, setResolvedTickets] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);

  useEffect(() => {
    // Așteptăm auth să se rezolve și să avem department
    if (authLoading) return;
    if (!user || !department) {
      setError(!user ? "Neautentificat." : "Contul nu are un departament asignat.");
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "issues"),
      where("departmentAssigned", "==", department),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        
        // Ce au de făcut (Sunt pe teren)
        setPendingTickets(all.filter((t) => t.status === "IN_PROCESARE"));
        
        // Istoricul lor (Ce au trimis la dispecer + ce a fost deja validat)
        setResolvedTickets(all.filter((t) => t.status === "VERIFICARE" || t.status === "REZOLVAT"));
        
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, department, authLoading]);

  // Funcția care "pasează mingea" înapoi la Dispecer
  async function resolveTicket(ticket, message) {
    const updateMsg = message?.trim()
      ? message.trim()
      : `Echipa din departamentul ${department} a finalizat intervenția. Așteaptă validare dispecerat.`;

    await updateDoc(doc(db, "issues", ticket.id), {
      status: "VERIFICARE", // Nu mai e REZOLVAT direct!
      deptResponse: {
        message: updateMsg,
        date: new Date().toISOString(),
        department,
      },
      updates: arrayUnion({
        date: new Date().toISOString(),
        message: `✅ [${department}] ${updateMsg}`,
      }),
    });
  }

  // Acțiune Bulk pentru când bifează mai multe din listă
  async function bulkResolve(ticketsArray) {
    await Promise.all(ticketsArray.map(t => resolveTicket(t)));
  }

  async function sendProgressUpdate(ticket, message) {
    if (!message?.trim()) return;
    await updateDoc(doc(db, "issues", ticket.id), {
      updates: arrayUnion({
        date: new Date().toISOString(),
        message: `[${department}] ${message.trim()}`,
      }),
    });
  }

  return {
    pendingTickets,
    resolvedTickets,
    department,
    loading: authLoading || loading,
    error,
    resolveTicket,
    bulkResolve,
    sendProgressUpdate,
  };
}
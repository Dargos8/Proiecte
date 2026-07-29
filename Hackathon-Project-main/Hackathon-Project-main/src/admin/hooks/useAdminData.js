import { useEffect, useState } from "react";
import { db } from "../../shared/utils/firebase";
import { firebaseConfig } from "../../shared/utils/firebase"; 
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  setDoc,
  query,
  where,
  arrayUnion
} from "firebase/firestore";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import emailjs from "@emailjs/browser";

export const useAdminData = () => {
  const [issues, setIssues] = useState([]);
  const [users, setUsers] = useState([]);

  const fetchIssues = async () => {
    const snapshot = await getDocs(collection(db, "issues"));
    setIssues(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  // Aducem doar utilizatorii care au isActive: true
  const fetchUsers = async () => {
    const q = query(collection(db, "users"), where("isActive", "==", true));
    const snapshot = await getDocs(q);
    setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const updateIssueStatus = async (id, status) => {
    try {
      let updatePayload = { status };
      const currentIssue = issues.find((issue) => issue.id === id);

      // Dacă tichetul este marcat ca REZOLVAT, adăugăm update-ul și trimitem mailurile
      if (status === "REZOLVAT") {
        const updateMsg = "Sesizarea a fost rezolvată cu succes de către echipele de intervenție.";

        updatePayload.updates = arrayUnion({
          date: new Date().toISOString(),
          message: updateMsg,
        });

        // Notificăm toți abonații prin EmailJS
        if (currentIssue?.subscribers && currentIssue.subscribers.length > 0) {
          console.log(`⏳ Se trimit notificări de rezolvare către ${currentIssue.subscribers.length} abonați...`);

          const emailPromises = currentIssue.subscribers.map((subscriberEmail) => {
            const templateParams = {
              to_email: subscriberEmail,
              ticket_id: id.slice(0, 8),
              ticket_title: currentIssue.title || "Fără titlu",
              ticket_status: "REZOLVAT",
              update_message: updateMsg,
              update_date: new Date().toLocaleString("ro-RO"),
            };

            return emailjs.send(
              "service_bni1g5c",          // Service ID Abonați
              "template_59ycu2k",         // Template ID Abonați
              templateParams,
              "fetayNLH7xvyEf1M_"         // Public Key Abonați
            );
          });

          await Promise.all(emailPromises);
          console.log("✅ Mailurile de notificare pentru rezolvare au fost trimise cu succes!");
        }
      }

      await updateDoc(doc(db, "issues", id), updatePayload);
      fetchIssues();
    } catch (error) {
      console.error("Eroare la actualizarea statusului: ", error);
      alert("A apărut o eroare la actualizarea tichetului.");
    }
  };

  // Soft Delete
  const deleteUser = async (id) => {
    try {
      await updateDoc(doc(db, "users", id), { isActive: false });
      fetchUsers();
    } catch (error) {
      console.error("Eroare la ștergerea utilizatorului:", error);
      alert("A apărut o eroare la ștergere.");
    }
  };

  // Logica completă (Verificare -> Reactivare / Creare Nouă) PENTRU TOATE DEPARTAMENTELE
  const createUser = async (userData) => {
    try {
      // 1. Verificăm dacă emailul există deja în Firestore
      const q = query(collection(db, "users"), where("email", "==", userData.email));
      const snapshot = await getDocs(q);

      let existingUserId = null;
      let isReactivating = false;

      if (!snapshot.empty) {
        const existingDoc = snapshot.docs[0];
        const existingData = existingDoc.data();

        if (existingData.isActive) {
          alert("Acest email există deja și este activ!");
          throw new Error("Email already active"); // Oprim execuția
        } else {
          // Utilizatorul există, dar e inactiv. Ne pregătim să îl reactivăm.
          existingUserId = existingDoc.id;
          isReactivating = true;
        }
      }

      // 2. Gestionăm Auth-ul PENTRU TOATE CONTURILE (indiferent de departament)
      let finalUid = existingUserId; 

      // Verificăm dacă SecondaryApp a fost deja inițializată pentru a preveni erori la creări multiple fără refresh
      const secondaryApp = getApps().find(app => app.name === "SecondaryApp") 
        ? getApp("SecondaryApp") 
        : initializeApp(firebaseConfig, "SecondaryApp");
        
      const secondaryAuth = getAuth(secondaryApp);

      try {
        const tempPassword = Math.random().toString(36).slice(-10) + "A1@!";
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, tempPassword);
        finalUid = userCredential.user.uid; 
        await sendPasswordResetEmail(secondaryAuth, userData.email);
      } catch (authError) {
        // Dacă primim această eroare, înseamnă că are deja cont în Auth din trecut
        if (authError.code === "auth/email-already-in-use") {
          await sendPasswordResetEmail(secondaryAuth, userData.email);
        } else {
          throw authError; // Altă eroare gravă
        }
      } finally {
        await secondaryAuth.signOut();
      }

      // 3. Salvăm/Actualizăm în Firestore
      if (isReactivating) {
        // Dacă a fost șters, îl trecem pe active și îi actualizăm departamentul
        await updateDoc(doc(db, "users", existingUserId), {
          isActive: true,
          department: userData.department
        });
      } else {
        // Creare complet nouă folosind mereu ID-ul generat de Auth
        await setDoc(doc(db, "users", finalUid), userData);
      }

      fetchUsers();
      
      alert("Cont creat cu succes! Un email pentru setarea parolei a fost trimis utilizatorului.");

    } catch (error) {
      if (error.message !== "Email already active") {
        console.error("Eroare la crearea utilizatorului:", error);
        alert("A apărut o eroare: " + error.message);
      }
      throw error; // Aruncăm eroarea ca să oprim Loader-ul din formular
    }
  };

  useEffect(() => {
    fetchIssues();
    fetchUsers();
  }, []);

  return {
    issues,
    users,
    updateIssueStatus,
    deleteUser,
    createUser,
  };
};
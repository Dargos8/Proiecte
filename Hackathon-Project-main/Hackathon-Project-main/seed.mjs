import { collection, addDoc } from "firebase/firestore";
// ATENȚIE: Ajustează calea asta dacă seed.mjs e în alt folder
import { db } from "./src/shared/utils/firebase.js"; 

async function runSeed() {
  console.log("⏳ Mă conectez la baza de date folosind importul oficial...");
  
  try {
    const docRef = await addDoc(collection(db, "users"), {
      department: "Salubritate",
      email: "dragonsd179@gmail.com",
      name: "Echipa Intervenție Salubritate",
      role: "worker"
    });
    
    console.log(`✅ Succes maxim! Userul pentru Salubritate a fost adăugat cu ID-ul: ${docRef.id}`);
    process.exit(0); 
  } catch (error) {
    console.error("❌ Eroare:", error);
    process.exit(1); 
  }
}

runSeed();
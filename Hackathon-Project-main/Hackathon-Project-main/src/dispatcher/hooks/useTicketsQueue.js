import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "../../shared/utils/firebase";
import { CATEGORIES } from "../../shared/utils/helpers";
import emailjs from "@emailjs/browser";

export const DEPARTMENTS = CATEGORIES.filter((c) => c.dept).map((c) => c.dept);
export const PRIORITIES  = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function autoPriority(upvotes = 0) {
  if (upvotes >= 20) return "CRITICAL";
  if (upvotes >= 10) return "HIGH";
  if (upvotes >= 5)  return "MEDIUM";
  return "LOW";
}

export function useTicketsQueue() {
  const [newTickets,          setNewTickets]          = useState([]);
  const [processingTickets,   setProcessingTickets]   = useState([]);
  const [verificationTickets, setVerificationTickets] = useState([]); // Aici e modificarea!
  const [allTickets,          setAllTickets]          = useState([]);
  const [loading,             setLoading]             = useState(true);
  const [error,               setError]               = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, "issues"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            priority: data.priority || autoPriority(data.upvotes),
          };
        });

        setAllTickets(all);
        setNewTickets(all.filter((t) => t.status === "NOU"));
        setProcessingTickets(all.filter((t) => t.status === "IN_PROCESARE"));
        
        // Căutăm DOAR tichetele trimise spre verificare de departamente
        setVerificationTickets(all.filter((t) => t.status === "VERIFICARE"));
        
        setLoading(false);
      },
      (err) => {
        console.error("Firestore error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // ─── Notificări abonați ───────────────────────────────────────────────────
  async function notifySubscribers(ticket, newStatus, updateMessage) {
    if (!ticket.subscribers || ticket.subscribers.length === 0) return;
    console.log(`⏳ Se trimit notificări către ${ticket.subscribers.length} abonați...`);

    const emailPromises = ticket.subscribers.map((subscriberEmail) =>
      emailjs.send(
        "service_bni1g5c",
        "template_59ycu2k",
        {
          to_email:       subscriberEmail,
          ticket_id:      ticket.id.slice(0, 8),
          ticket_title:   ticket.title || "Fără titlu",
          ticket_status:  newStatus,
          update_message: updateMessage,
          update_date:    new Date().toLocaleString("ro-RO"),
        },
        "fetayNLH7xvyEf1M_"
      )
    );

    try {
      await Promise.all(emailPromises);
      console.log("✅ Notificările pentru abonați au fost trimise cu succes!");
    } catch (err) {
      console.error("Eroare la trimiterea notificărilor către abonați:", err);
    }
  }

  // ─── Asignare la departament ──────────────────────────────────────────────
  async function assignTicket(ticket, { department, category, priority }) {
    const updateMsg = `Trimis către ${department}. Prioritate: ${priority}.`;

    await updateDoc(doc(db, "issues", ticket.id), {
      status: "IN_PROCESARE",
      departmentAssigned: department,
      category,
      priority,
      updates: arrayUnion({ date: new Date().toISOString(), message: updateMsg }),
    });

    try {
      let toEmail = "dragonsd179@gmail.com";
      const snap = await getDocs(query(collection(db, "users"), where("department", "==", department)));
      if (!snap.empty) toEmail = snap.docs.map((d) => d.data().email).filter(Boolean).join(",");

      const mapsLink   = `https://maps.google.com/?q=${ticket.location?.lat},${ticket.location?.lng}`;
      const imagesArray = ticket.mediaUrls?.filter(Boolean) ?? (ticket.mediaUrl ? [ticket.mediaUrl] : []);

      let imageHtml = imagesArray.length > 0
        ? "<div>" + imagesArray.map((url, i) => `
            <div style="margin-bottom:25px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:#555;font-weight:bold;">📸 Fotografia ${i + 1} din ${imagesArray.length}</p>
              <img src="${url}" alt="Poza ${i + 1}" style="display:block;width:100%;max-width:600px;height:auto;border-radius:6px;border:1px solid #ccc;margin:0 auto;" />
            </div>`).join("") + "</div>"
        : `<p style="color:#888;font-style:italic;">Cetățeanul nu a atașat nicio fotografie.</p>`;

      await emailjs.send(
        "service_q4agz03",
        "template_2q04kju",
        {
          to_email:            toEmail,
          to_department:       department,
          ticket_id:           ticket.id.slice(0, 8),
          ticket_title:        ticket.title || "Fără titlu",
          ticket_category:     category,
          ticket_priority:     priority,
          ticket_upvotes:      ticket.upvotes || 0,
          ticket_description:  ticket.description || "Nicio descriere adăugată.",
          ticket_maps_link:    mapsLink,
          ticket_image_html:   imageHtml,
          ticket_date:         new Date().toLocaleString("ro-RO"),
          dispatcher_name:     "Dispecerat CivicTrack Galați",
          ticket_neighborhood: ticket.neighborhood || "Cartier nespecificat",
        },
        "HThoBqjbCawNWFFNL"
      );
      console.log(`✅ Email trimis cu succes către ${department} (${toEmail})!`);
    } catch (err) {
      console.error("Eroare la trimiterea email-ului:", err);
    }

    await notifySubscribers(ticket, "ÎN PROCESARE", updateMsg);
  }

  // ─── Marcare REZOLVAT (Final, de către Dispecer) ─────────────────────────
  async function resolveTicket(ticket, message = "Sesizarea a fost verificată și rezolvată definitiv de către dispecerat.") {
    await updateDoc(doc(db, "issues", ticket.id), {
      status: "REZOLVAT",
      updates: arrayUnion({ date: new Date().toISOString(), message }),
    });
    await notifySubscribers(ticket, "REZOLVAT", message);
  }

  // ─── Marcare RESPINS ──────────────────────────────────────────────────────
  async function rejectTicket(ticket, reason = "SPAM") {
    const updateMsg = `Tichet respins: ${reason}.`;
    await updateDoc(doc(db, "issues", ticket.id), {
      status: "RESPINS",
      updates: arrayUnion({ date: new Date().toISOString(), message: updateMsg }),
    });
    await notifySubscribers(ticket, "RESPINS (INVALID/SPAM)", updateMsg);
  }

  // ─── Corectare Locație GPS (Dispecer) ─────────────────────────────────────
  async function updateTicketLocation(ticketId, newLat, newLng) {
    await updateDoc(doc(db, "issues", ticketId), {
      location: { lat: newLat, lng: newLng },
      updates: arrayUnion({
        date: new Date().toISOString(),
        message: `📍 Locația a fost corectată manual de către dispecer la coordonatele: ${newLat.toFixed(6)}, ${newLng.toFixed(6)}.`,
      }),
    });
  }

  // ─── Acțiuni bulk ─────────────────────────────────────────────────────────
  async function bulkResolve(ticketsArray) {
    await Promise.all(ticketsArray.map((t) => resolveTicket(t, "Verificat și marcat ca rezolvat (acțiune de grup).")));
  }

  async function bulkReject(ticketsArray) {
    await Promise.all(ticketsArray.map((t) => rejectTicket(t, "Marcat ca SPAM / Invalid (acțiune de grup).")));
  }

  async function deleteTicket(ticketId) {
    await deleteDoc(doc(db, "issues", ticketId));
  }

  return {
    newTickets,
    processingTickets,
    verificationTickets, // Nume actualizat
    allTickets,
    loading,
    error,
    assignTicket,
    resolveTicket,
    rejectTicket,
    updateTicketLocation, // Funcția adăugată!
    deleteTicket,
    bulkResolve,
    bulkReject,
    DEPARTMENTS,
    PRIORITIES,
  };
}
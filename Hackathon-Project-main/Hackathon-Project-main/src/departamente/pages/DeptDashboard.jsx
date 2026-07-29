import { useState, useCallback, useEffect } from "react";
import { useDeptTickets } from "../hooks/useDeptTickets";
import TicketQueue from "../../dispatcher/components/TicketQueue";
import MapView from "../../dispatcher/components/MapView"; // 🗺️ Am adus Harta înapoi!
import InspectorPanel from "../../dispatcher/components/InspectorPanel";
import { useLogout } from "../../shared/hooks/useLogout";
import styles from "../../dispatcher/styles/Dashboard.module.css";

export default function DeptDashboard() {
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [mobilePanel, setMobilePanel] = useState("queue");

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const {
    pendingTickets,
    resolvedTickets,
    department,
    loading,
    error,
    resolveTicket,
    bulkResolve
  } = useDeptTickets();

  const handleLogout = useLogout("/login");

  const activeTickets = activeTab === "pending" ? pendingTickets : resolvedTickets;

  const handleSelect = useCallback((ticket) => {
    if (selectedTicket?.id === ticket.id) {
      setSelectedTicket(null);
      setMobilePanel("queue");
    } else {
      setSelectedTicket(ticket);
      setMobilePanel("inspector");
    }
  }, [selectedTicket]);

  // Funcție separată pentru hartă (pe mobil te mută automat la detalii)
  const handleMapMarkerClick = useCallback((ticket) => {
    setSelectedTicket(ticket);
    setMobilePanel("inspector");
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingScreen} aria-busy="true">
        <span className={styles.loadingDot} aria-hidden="true" />
        <span className={styles.loadingText}>Se încarcă datele echipei...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorScreen} role="alert">
        <span className={styles.errorText}>✕ Eroare: {error}</span>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {/* ── HEADER ── */}
      <header className={styles.titlebar} aria-label="Application titlebar">
        <span className={styles.titlebarText} style={{ flex: 1, fontSize: "13px", color: "#4ec9b0", fontWeight: "bold", textTransform: "uppercase" }}>
          [TEREN] {department || "Departament"}
        </span>
        {!isMobile && (
           <button
             onClick={handleLogout}
             style={{ background: "transparent", border: "1px solid #f44747", color: "#f44747", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", cursor: "pointer", transition: "0.2s" }}
           >
             Ieșire
           </button>
        )}
      </header>

      {/* ── BARA DE TABS (Vizibilă mereu, sus, și pe PC și pe Mobil) ── */}
      <nav className={styles.mobileViewTabs}>
        <button
          className={`${styles.mobileViewTab} ${activeTab === "pending" ? styles.mobileViewTabActive : ""}`}
          onClick={() => { setActiveTab("pending"); setSelectedTicket(null); setMobilePanel("queue"); }}
        >
          DE REZOLVAT
          {pendingTickets.length > 0 && (
            <span className={`${styles.tabBadge} ${activeTab === "pending" ? styles.tabBadgeActive : ""}`}>
              {pendingTickets.length}
            </span>
          )}
        </button>
        <button
          className={`${styles.mobileViewTab} ${activeTab === "resolved" ? styles.mobileViewTabActive : ""}`}
          onClick={() => { setActiveTab("resolved"); setSelectedTicket(null); setMobilePanel("queue"); }}
        >
          ISTORIC
        </button>
      </nav>

      {/* ── CORPUL APLICAȚIEI ── */}
      <div className={styles.body}>
        {!isMobile ? (
          // 🖥️ VIEW PENTRU DESKTOP (PC)
          <div className={styles.desktopPanels}>
            <TicketQueue
              tickets={activeTickets}
              selectedId={selectedTicket?.id}
              onSelect={handleSelect}
              mode={activeTab === "pending" ? "processing" : "all"}
              onBulkResolve={activeTab === "pending" ? bulkResolve : undefined}
            />
            
            {/* HARTA REZOLVĂ GOLUL DE PE PC ȘI E UTILĂ! */}
            <MapView
              tickets={activeTickets}
              selectedTicket={selectedTicket}
              onMarkerClick={handleMapMarkerClick}
            />

            <InspectorPanel
              ticket={selectedTicket}
              onResolve={activeTab === "pending" ? resolveTicket : undefined}
            />
          </div>
        ) : (
          // 📱 VIEW PENTRU MOBIL
          <div className={styles.mobilePanels}>
            <div className={styles.mobilePane} hidden={mobilePanel !== "queue"}>
              <TicketQueue
                tickets={activeTickets}
                selectedId={selectedTicket?.id}
                onSelect={handleSelect}
                mode={activeTab === "pending" ? "processing" : "all"}
                onBulkResolve={activeTab === "pending" ? bulkResolve : undefined}
              />
            </div>
            
            <div className={styles.mobilePane} hidden={mobilePanel !== "map"}>
              <MapView
                tickets={activeTickets}
                selectedTicket={selectedTicket}
                onMarkerClick={handleMapMarkerClick}
              />
            </div>

            <div className={styles.mobilePane} hidden={mobilePanel !== "inspector"}>
              {selectedTicket ? (
                <InspectorPanel
                  ticket={selectedTicket}
                  onResolve={activeTab === "pending" ? resolveTicket : undefined}
                />
              ) : (
                <div className={styles.inspectorEmpty}>
                  <span className={styles.inspectorEmptyIcon} aria-hidden="true">▤</span>
                  <p>Selectează un tichet din listă sau de pe hartă.</p>
                  <button className={styles.inspectorEmptyBtn} onClick={() => setMobilePanel("queue")}>
                    ← Mergi la listă
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM NAVIGATION MOBIL ── */}
      {isMobile && (
        <nav className={styles.mobileNav}>
          <button
            className={`${styles.mobileNavBtn} ${mobilePanel === "queue" ? styles.mobileNavActive : ""}`}
            onClick={() => setMobilePanel("queue")}
          >
            <span className={styles.mobileNavIcon}>☰</span>
            <span className={styles.mobileNavLabel}>Listă</span>
          </button>
          
          <button
            className={`${styles.mobileNavBtn} ${mobilePanel === "map" ? styles.mobileNavActive : ""}`}
            onClick={() => setMobilePanel("map")}
          >
            <span className={styles.mobileNavIcon}>◎</span>
            <span className={styles.mobileNavLabel}>Hartă</span>
          </button>

          <button
            className={`${styles.mobileNavBtn} ${mobilePanel === "inspector" ? styles.mobileNavActive : ""}`}
            onClick={() => setMobilePanel("inspector")}
          >
            <span className={styles.mobileNavIcon}>
              ▤ {selectedTicket && <span className={styles.mobileNavBadge}>●</span>}
            </span>
            <span className={styles.mobileNavLabel}>Detalii</span>
          </button>

          <button
            className={`${styles.mobileNavBtn} ${styles.mobileNavLogout}`}
            onClick={handleLogout}
          >
            <span className={styles.mobileNavIcon}>⏏</span>
            <span className={styles.mobileNavLabel}>Ieșire</span>
          </button>
        </nav>
      )}

      {/* ── STATUSBAR JOS ── */}
      <footer className={styles.statusbar} aria-label="Status bar">
        <span className={styles.statusItem}>⬡ {department}</span>
        <span className={styles.statusFill} aria-hidden="true" />
        <span className={styles.statusItem}>● {pendingTickets.length} ACTIVE</span>
        <span className={styles.statusItem}>✓ {resolvedTickets.length} ISTORIC</span>
      </footer>
    </div>
  );
}
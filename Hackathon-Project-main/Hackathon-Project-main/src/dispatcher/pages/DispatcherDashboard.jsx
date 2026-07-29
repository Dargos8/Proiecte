import { useState, useCallback, useEffect } from "react";
import { useLogout } from "../../shared/hooks/useLogout";
import { useTicketsQueue } from "../hooks/useTicketsQueue";
import Sidebar from "../components/Sidebar";
import TicketQueue from "../components/TicketQueue";
import MapView from "../components/MapView";
import InspectorPanel from "../components/InspectorPanel";
import styles from "../styles/Dashboard.module.css";

export default function DispatcherDashboard() {
  const [activeView,     setActiveView]     = useState("inbox");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [mobilePanel,    setMobilePanel]    = useState("queue");

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 1. Extragem corect denumirea din hook (verificationTickets)
  const {
    newTickets          = [],
    processingTickets   = [],
    verificationTickets = [], // Corectat aici
    allTickets          = [],
    loading,
    error,
    assignTicket,
    resolveTicket,
    rejectTicket,
    deleteTicket,
    bulkResolve,
    bulkReject,
  } = useTicketsQueue();

  // 2. Mapăm activeView pe listele corecte
  const activeTickets =
    activeView === "inbox"        ? newTickets :
    activeView === "processing"   ? processingTickets :
    activeView === "verification" ? verificationTickets : // Corectat aici
    allTickets;

  const handleSelect = useCallback((ticket) => {
    const isDeselect = selectedTicket?.id === ticket.id;
    if (isDeselect) {
      setSelectedTicket(null);
      setMobilePanel("queue");
    } else {
      setSelectedTicket(ticket);
      setMobilePanel("inspector");
    }
  }, [selectedTicket]);

  const handleMapMarkerClick = useCallback((ticket) => {
    setSelectedTicket(ticket);
    setMobilePanel("inspector");
  }, []);

  const handleAssign = useCallback(async (ticket, payload) => {
    await assignTicket(ticket, payload);
    setSelectedTicket(null);
    setMobilePanel("queue");
  }, [assignTicket]);

  const handleResolve = useCallback(async (ticket) => {
    await resolveTicket(ticket);
    setSelectedTicket(null);
    setMobilePanel("queue");
  }, [resolveTicket]);

  const handleReject = useCallback(async (ticket, reason) => {
    await rejectTicket(ticket, reason);
    setSelectedTicket(null);
    setMobilePanel("queue");
  }, [rejectTicket]);

  const handleDelete = useCallback(async (id) => {
    await deleteTicket(id);
    setSelectedTicket(null);
    setMobilePanel("queue");
  }, [deleteTicket]);

  const handleLogout = useLogout("/");

  const handleViewChange = (view) => {
    setActiveView(view);
    setSelectedTicket(null);
    setMobilePanel("queue");
  };

  useEffect(() => {
    if (!selectedTicket) return;
    const stillExists = activeTickets.some((t) => t.id === selectedTicket.id);
    if (!stillExists) {
      setSelectedTicket(null);
      setMobilePanel("queue");
    }
  }, [activeTickets, selectedTicket]);

  if (loading) {
    return (
      <div className={styles.loadingScreen} aria-busy="true">
        <span className={styles.loadingDot} aria-hidden="true" />
        <span className={styles.loadingText}>Se încarcă sistemul...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorScreen} role="alert">
        <span className={styles.errorText}>✕ Eroare Firebase: {error}</span>
      </div>
    );
  }

  // Bulk-ul e activ doar în tab-ul de Răspunsuri (Verificare)
  const showBulk = activeView === "verification";

  return (
    <div className={styles.layout}>
      <header className={styles.titlebar} aria-label="Application titlebar">
        <span className={styles.titlebarText}>Raportează-Galați — Dispatcher · Galați</span>
        <Clock />
      </header>

      {/* Tabs mobil */}
      {isMobile && (
        <nav className={styles.mobileViewTabs} aria-label="Filtrare tichete mobil">
          {[
            { id: "inbox",        label: "NOI",       count: newTickets.length },
            { id: "processing",   label: "ÎN LUCRU",  count: processingTickets.length },
            { id: "verification", label: "RĂSP.",     count: verificationTickets.length, green: true }, // Corectat
            { id: "all",          label: "ISTORIC",   count: 0 },
          ].map(({ id, label, count, green }) => (
            <button
              key={id}
              className={`${styles.mobileViewTab} ${activeView === id ? styles.mobileViewTabActive : ""}`}
              onClick={() => handleViewChange(id)}
            >
              {label}
              {count > 0 && (
                <span
                  className={`${styles.tabBadge} ${activeView === id ? styles.tabBadgeActive : ""}`}
                  style={green && activeView === id ? { background: "#4ec9b0", color: "#1e1e1e" } : undefined}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>
      )}

      <div className={styles.body}>
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          newCount={newTickets.length}
          processingCount={processingTickets.length}
          verificationCount={verificationTickets.length} // Corectat (Asta merge la Sidebar)
          onLogout={handleLogout}
        />

        {!isMobile ? (
          <div className={styles.desktopPanels} aria-label="Panouri desktop">
            <TicketQueue
              tickets={activeTickets}
              selectedId={selectedTicket?.id}
              onSelect={handleSelect}
              mode={activeView}
              onBulkResolve={showBulk ? bulkResolve : undefined}
              onBulkReject={showBulk ? bulkReject : undefined}
            />
            <MapView
              tickets={activeTickets}
              selectedTicket={selectedTicket}
              onMarkerClick={handleSelect}
            />
            <InspectorPanel
              ticket={selectedTicket}
              onAssign={handleAssign}
              onResolve={handleResolve}
              onReject={handleReject}
              onDelete={handleDelete}
            />
          </div>
        ) : (
          <div className={styles.mobilePanels} aria-label="Panouri mobile">
            <div className={styles.mobilePane} hidden={mobilePanel !== "queue"} aria-hidden={mobilePanel !== "queue"}>
              <TicketQueue
                tickets={activeTickets}
                selectedId={selectedTicket?.id}
                onSelect={handleSelect}
                mode={activeView}
                onBulkResolve={showBulk ? bulkResolve : undefined}
                onBulkReject={showBulk ? bulkReject : undefined}
              />
            </div>
            <div className={styles.mobilePane} hidden={mobilePanel !== "map"} aria-hidden={mobilePanel !== "map"}>
              <MapView
                tickets={activeTickets}
                selectedTicket={selectedTicket}
                onMarkerClick={handleMapMarkerClick}
              />
            </div>
            <div className={styles.mobilePane} hidden={mobilePanel !== "inspector"} aria-hidden={mobilePanel !== "inspector"}>
              {selectedTicket ? (
                <InspectorPanel
                  ticket={selectedTicket}
                  onAssign={handleAssign}
                  onResolve={handleResolve}
                  onReject={handleReject}
                  onDelete={handleDelete}
                />
              ) : (
                <div className={styles.inspectorEmpty}>
                  <span className={styles.inspectorEmptyIcon} aria-hidden="true">▤</span>
                  <p>Selectează un tichet din <strong>Listă</strong> pentru a vedea detaliile.</p>
                  <button className={styles.inspectorEmptyBtn} onClick={() => setMobilePanel("queue")}>
                    ← Mergi la listă
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <nav className={styles.mobileNav} aria-label="Navigare mobilă">
        {[
          { id: "queue",     label: "Listă",     icon: "☰" },
          { id: "map",       label: "Hartă",     icon: "◎" },
          { id: "inspector", label: "Inspector", icon: "▤", badge: selectedTicket ? "●" : null },
        ].map((p) => (
          <button
            key={p.id}
            className={`${styles.mobileNavBtn} ${mobilePanel === p.id ? styles.mobileNavActive : ""}`}
            onClick={() => setMobilePanel(p.id)}
            aria-pressed={mobilePanel === p.id}
            aria-label={p.label}
          >
            <span className={styles.mobileNavIcon} aria-hidden="true">
              {p.icon}
              {p.badge && <span className={styles.mobileNavBadge} aria-hidden="true">{p.badge}</span>}
            </span>
            <span className={styles.mobileNavLabel}>{p.label}</span>
          </button>
        ))}
        <button
          className={`${styles.mobileNavBtn} ${styles.mobileNavLogout}`}
          onClick={handleLogout}
          aria-label="Ieșire din cont"
        >
          <span className={styles.mobileNavIcon} aria-hidden="true">⏏</span>
          <span className={styles.mobileNavLabel}>Ieșire</span>
        </button>
      </nav>

      <footer className={styles.statusbar} aria-label="Status bar">
        <span className={styles.statusItem}>⬡ dispatcher</span>
        <span className={styles.statusItem}>● {newTickets.length} NOU</span>
        <span className={styles.statusItem}>◑ {processingTickets.length} PROCESARE</span>
        {verificationTickets.length > 0 && (
          <span className={styles.statusItem} style={{ color: "#4ec9b0" }}>
            ◈ {verificationTickets.length} RĂSPUNSURI
          </span>
        )}
        {selectedTicket && (
          <span className={styles.statusItem} aria-live="polite">▶ #{selectedTicket.id?.slice(0, 8)}</span>
        )}
        <span className={styles.statusFill} aria-hidden="true" />
        <span className={styles.statusItem}>Galați, RO</span>
      </footer>
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState(new Date().toLocaleTimeString("ro-RO"));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString("ro-RO")), 1000);
    return () => clearInterval(id);
  }, []);
  return <time className={styles.clock} dateTime={new Date().toISOString()}>{time}</time>;
}
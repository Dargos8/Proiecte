import styles from "../styles/Sidebar.module.css";

export default function Sidebar({ activeView, onViewChange, newCount, processingCount, verificationCount, onLogout }) {
  return (
    <aside className={styles.sidebar} aria-label="Navigare principală">
      <div className={styles.logo} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <nav className={styles.nav}>
        {/* 1. Inbox — NOU */}
        <button
          type="button"
          className={`${styles.navBtn} ${activeView === "inbox" ? styles.active : ""}`}
          onClick={() => onViewChange("inbox")}
          aria-label="Inbox tichete noi"
          title="Inbox (NOU)"
        >
          <InboxIcon />
          {newCount > 0 && (
            <span className={styles.badge} aria-label={`${newCount} tichete noi`}>
              {newCount > 99 ? "99+" : newCount}
            </span>
          )}
        </button>

        {/* 2. În procesare — IN_PROCESARE */}
        <button
          type="button"
          className={`${styles.navBtn} ${activeView === "processing" ? styles.active : ""}`}
          onClick={() => onViewChange("processing")}
          aria-label="Tichete în procesare"
          title="În procesare"
        >
          <ProcessingIcon />
          {processingCount > 0 && (
            <span className={`${styles.badge} ${styles.badgeYellow}`} aria-label={`${processingCount} în procesare`}>
              {processingCount > 99 ? "99+" : processingCount}
            </span>
          )}
        </button>

        {/* 3. Răspunsuri Departamente — VERIFICARE */}
        <button
          type="button"
          className={`${styles.navBtn} ${activeView === "verification" ? styles.active : ""}`}
          onClick={() => onViewChange("verification")}
          aria-label="Răspunsuri departamente"
          title="Răspunsuri Departamente"
        >
          <DeptResponseIcon />
          {verificationCount > 0 && (
            <span className={styles.badge} style={{ background: '#4ec9b0', color: '#000' }} aria-label={`${verificationCount} răspunsuri`}>
              {verificationCount > 99 ? "99+" : verificationCount}
            </span>
          )}
        </button>

        {/* 4. Istoric — toate */}
        <button
          type="button"
          className={`${styles.navBtn} ${activeView === "all" ? styles.active : ""}`}
          onClick={() => onViewChange("all")}
          aria-label="Istoric tichete"
          title="Istoric Tichete"
        >
          <HistoryIcon />
        </button>
      </nav>

      <div className={styles.bottom}>
        <button
          type="button"
          className={styles.logoutBtn}
          onClick={onLogout}
          aria-label="Deconectare"
          title="Logout"
        >
          <LogoutIcon />
        </button>
      </div>
    </aside>
  );
}

const InboxIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path d="M22 12h-6l-2 3H10l-2-3H2" />
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
  </svg>
);

const ProcessingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);

const DeptResponseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <line x1="9" y1="10" x2="15" y2="10" />
    <line x1="9" y1="14" x2="13" y2="14" />
  </svg>
);

const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
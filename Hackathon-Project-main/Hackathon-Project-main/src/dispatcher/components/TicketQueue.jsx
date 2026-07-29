import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import styles from "../styles/TicketQueue.module.css";
import { formatDate, priorityColor, priorityLabel } from "../../shared/utils/helpers.jsx";

const SORT_OPTIONS = [
  { key: "date",     label: "Dată" },
  { key: "upvotes",  label: "Upvotes" },
  { key: "priority", label: "Prioritate" },
];

const PRIORITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const PAGE_SIZE = 15;

export default function TicketQueue({ tickets, selectedId, onSelect, mode, onBulkResolve, onBulkReject }) {
  const [view,               setView]               = useState("list");
  const [sortBy,             setSortBy]             = useState("date");
  const [filter,             setFilter]             = useState("");
  const [page,               setPage]               = useState(1);
  const [checkedIds,         setCheckedIds]         = useState(new Set());
  const [isProcessingBulk,   setIsProcessingBulk]   = useState(false);

  // Reset la schimbare de tab / tickets / sort / filter
  useEffect(() => {
    setPage(1);
    setCheckedIds(new Set());
  }, [tickets, sortBy, filter, mode]);

  const toggleCheck = (id) => {
    const next = new Set(checkedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setCheckedIds(next);
  };

  const handleBulkAction = async (actionFn) => {
    if (!actionFn) {
      alert("Eroare: Funcția de procesare lipsește.");
      return;
    }
    
    setIsProcessingBulk(true);
    try {
      const selected = tickets.filter((t) => checkedIds.has(t.id));
      await actionFn(selected);
      setCheckedIds(new Set());
    } catch (err) {
      console.error("Eroare Bulk Action:", err);
      alert("A apărut o eroare la marcarea tichetelor.");
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const sorted = useMemo(() => {
    let result = tickets.filter(
      (t) =>
        !filter ||
        t.title?.toLowerCase().includes(filter.toLowerCase()) ||
        t.category?.toLowerCase().includes(filter.toLowerCase())
    );
    if (sortBy === "upvotes")  result = [...result].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    if (sortBy === "date")     result = [...result].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    if (sortBy === "priority") result = [...result].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4));
    return result;
  }, [tickets, sortBy, filter]);

  const visibleTickets = sorted.slice(0, page * PAGE_SIZE);
  const hasMore = visibleTickets.length < sorted.length;

  const observer = useRef();
  const sentinelRef = useCallback((node) => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore) setPage((p) => p + 1); },
      { rootMargin: "50px", threshold: 0 }
    );
    if (node) observer.current.observe(node);
  }, [hasMore]);

  const modeLabel =
    mode === "inbox"        ? "INBOX — NOU" :
    mode === "processing"   ? "ÎN PROCESARE / TEREN" :
    mode === "verification" ? "RĂSPUNSURI DEPARTAMENTE" :
    "ISTORIC TICHETE";

  // Verificăm dacă suntem într-un mod care necesită checkbox-uri
  const showCheckboxes = mode === "processing" || mode === "verification";

  return (
    <section className={styles.panel} aria-label="Coada de tichete">
      <div className={styles.header}>
        <span className={styles.title}>{modeLabel}</span>
        <div className={styles.viewToggle} role="group" aria-label="Mod vizualizare">
          <button type="button" className={`${styles.viewBtn} ${view === "list" ? styles.viewBtnActive : ""}`} onClick={() => setView("list")} aria-label="Listă" aria-pressed={view === "list"}>
            <ListIcon />
          </button>
          <button type="button" className={`${styles.viewBtn} ${view === "table" ? styles.viewBtnActive : ""}`} onClick={() => setView("table")} aria-label="Tabel" aria-pressed={view === "table"}>
            <GridIcon />
          </button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <input className={styles.filterInput} placeholder="Caută titlu, categorie..." value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrare tichete" />
      </div>

      <div className={styles.sortBar}>
        {SORT_OPTIONS.map((s) => (
          <button key={s.key} type="button" className={`${styles.sortBtn} ${sortBy === s.key ? styles.sortBtnActive : ""}`} onClick={() => setSortBy(s.key)}>
            {s.label}
          </button>
        ))}
        <span className={styles.count}>{sorted.length} total</span>
      </div>

      {/* Bulk bar — apare când avem tichete selectate și suntem în modul corect */}
      {checkedIds.size > 0 && showCheckboxes && (
        <div style={{ padding: "10px 14px", background: "rgba(78,201,176,0.12)", borderBottom: "1px solid rgba(78,201,176,0.3)", display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "#4ec9b0", flex: 1, fontWeight: "bold" }}>
            {checkedIds.size} selectate
          </span>
          {onBulkReject && (
            <button
              style={{ padding: "6px 12px", background: "transparent", color: "#f44747", border: "1px solid #f44747", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
              onClick={() => handleBulkAction(onBulkReject)} disabled={isProcessingBulk}
            >
              {isProcessingBulk ? "..." : "⚑ Marchează SPAM"}
            </button>
          )}
          {onBulkResolve && (
            <button
              style={{ padding: "6px 12px", background: "#4ec9b0", color: "#000", fontWeight: "bold", border: "none", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
              onClick={() => handleBulkAction(onBulkResolve)} disabled={isProcessingBulk}
            >
              {isProcessingBulk ? "Se procesează..." : (mode === "processing" ? "🚀 Trimite la Validare" : "✅ Confirmă Rezolvarea")}
            </button>
          )}
        </div>
      )}

      <div className={styles.content}>
        {sorted.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>✓</span>
            <span>Nicio problemă de afișat.</span>
          </div>
        ) : view === "list" ? (
          <ListView tickets={visibleTickets} selectedId={selectedId} onSelect={onSelect} showCheckboxes={showCheckboxes} checkedIds={checkedIds} onToggleCheck={toggleCheck} />
        ) : (
          <TableView tickets={visibleTickets} selectedId={selectedId} onSelect={onSelect} showCheckboxes={showCheckboxes} checkedIds={checkedIds} onToggleCheck={toggleCheck} />
        )}

        {hasMore && (
          <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true">
            <span className={styles.loadingMore}>Se încarcă...</span>
          </div>
        )}
      </div>
    </section>
  );
}

function ListView({ tickets, selectedId, onSelect, showCheckboxes, checkedIds, onToggleCheck }) {
  return (
    <ul className={styles.list} role="listbox">
      {tickets.map((t) => (
        <li
          key={t.id}
          role="option"
          aria-selected={t.id === selectedId}
          className={`${styles.listItem} ${t.id === selectedId ? styles.selected : ""} ${t.spamFlags >= 3 ? styles.spamFlagged : ""} ${styles.fadeIn}`}
          onClick={() => onSelect(t)}
        >
          <div className={styles.listItemTop}>
            {showCheckboxes && (
              <input
                type="checkbox"
                style={{ transform: "scale(1.2)", cursor: "pointer", margin: 0, flexShrink: 0, marginRight: "8px" }}
                checked={checkedIds.has(t.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggleCheck(t.id)}
              />
            )}
            <span className={styles.priorityDot} style={{ background: priorityColor(t.priority) }} title={priorityLabel(t.priority)} />
            <span className={styles.listTitle}>{t.title || "Fără titlu"}</span>
            <span className={styles.categoryTag}>{t.category || "—"}</span>
          </div>
          <div className={styles.listMeta}>
            <span className={styles.metaItem}>▲ {t.upvotes || 0}</span>
            <span className={styles.metaItem}>⏱ {formatDate(t.createdAt)}</span>
            {t.spamFlags >= 3 && <span className={styles.spamBadge}>⚑ ×{t.spamFlags}</span>}
          </div>
          {t.deptResponse && (
            <div className={styles.deptResponsePreview}>
              <span className={styles.deptResponseDept}>[{t.deptResponse.department}]</span>
              <span className={styles.deptResponseMsg}>
                {t.deptResponse.message?.slice(0, 60)}{t.deptResponse.message?.length > 60 ? "…" : ""}
              </span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function TableView({ tickets, selectedId, onSelect, showCheckboxes, checkedIds, onToggleCheck }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {showCheckboxes && <th style={{ width: "30px" }}></th>}
            <th>P</th>
            <th>Titlu</th>
            <th>Cat.</th>
            <th>+1</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr
              key={t.id}
              className={`${t.id === selectedId ? styles.selectedRow : ""} ${t.spamFlags >= 3 ? styles.spamFlagged : ""} ${styles.fadeIn}`}
              onClick={() => onSelect(t)}
            >
              {showCheckboxes && (
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" style={{ cursor: "pointer" }} checked={checkedIds.has(t.id)} onChange={() => onToggleCheck(t.id)} />
                </td>
              )}
              <td><span className={styles.priorityDot} style={{ background: priorityColor(t.priority) }} title={priorityLabel(t.priority)} /></td>
              <td className={styles.tableTitle}>{t.title || "—"}</td>
              <td className={styles.categoryTag}>{t.category || "—"}</td>
              <td className={styles.upvoteCell}>{t.upvotes || 0}</td>
              <td className={styles.dateCell}>{formatDate(t.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ListIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <rect x="0" y="1" width="14" height="2" rx="1" />
    <rect x="0" y="6" width="14" height="2" rx="1" />
    <rect x="0" y="11" width="14" height="2" rx="1" />
  </svg>
);

const GridIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <rect x="0" y="0" width="6" height="6" rx="1" />
    <rect x="8" y="0" width="6" height="6" rx="1" />
    <rect x="0" y="8" width="6" height="6" rx="1" />
    <rect x="8" y="8" width="6" height="6" rx="1" />
  </svg>
);
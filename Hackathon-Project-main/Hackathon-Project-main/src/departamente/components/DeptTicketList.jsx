import { useState, useCallback, useRef, useEffect } from "react";
import styles from "../styles/DeptTicketList.module.css";
import { formatDate, priorityColor, priorityLabel, getCategoryById } from "../../shared/utils/helpers.jsx";

const PAGE_SIZE = 15;

export default function DeptTicketList({ tickets, mode, onResolve, onProgress }) {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [checkedIds,     setCheckedIds]     = useState(new Set());
  const [message,        setMessage]        = useState("");
  const [sending,        setSending]        = useState(false);
  const [page,           setPage]           = useState(1);
  const [filter,         setFilter]         = useState("");

  // Reset la schimbare de tab
  useEffect(() => {
    setSelectedTicket(null);
    setCheckedIds(new Set());
    setMessage("");
    setPage(1);
  }, [mode, tickets]);

  // Infinite scroll sentinel
  const observer = useRef();
  const sentinelRef = useCallback((node) => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setPage((p) => p + 1);
    }, { rootMargin: "60px", threshold: 0 });
    if (node) observer.current.observe(node);
  }, []);

  const filtered = tickets.filter(
    (t) =>
      !filter ||
      t.title?.toLowerCase().includes(filter.toLowerCase()) ||
      t.category?.toLowerCase().includes(filter.toLowerCase())
  );
  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  const toggleCheck = (id) => {
    const next = new Set(checkedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setCheckedIds(next);
  };

  const toggleAll = () => {
    if (checkedIds.size === filtered.length) setCheckedIds(new Set());
    else setCheckedIds(new Set(filtered.map((t) => t.id)));
  };

  async function handleBulkResolve() {
    if (checkedIds.size === 0) return;
    setSending(true);
    const selected = tickets.filter((t) => checkedIds.has(t.id));
    await Promise.all(selected.map((t) => onResolve(t, message)));
    setCheckedIds(new Set());
    setMessage("");
    setSending(false);
  }

  async function handleSingleResolve(ticket) {
    setSending(true);
    await onResolve(ticket, message);
    if (selectedTicket?.id === ticket.id) setSelectedTicket(null);
    setMessage("");
    setSending(false);
  }

  async function handleProgress(ticket) {
    if (!message.trim()) return;
    setSending(true);
    await onProgress(ticket, message);
    setMessage("");
    setSending(false);
  }

  const modeLabel = mode === "pending" ? "TICHETE ACTIVE" : "REZOLVATE";
  const isPending = mode === "pending";

  return (
    <div className={styles.layout}>
      {/* ── Lista stânga ── */}
      <div className={styles.listPanel}>
        <div className={styles.listHeader}>
          <span className={styles.listTitle}>{modeLabel}</span>
          <span className={styles.listCount}>{filtered.length}</span>
        </div>

        <div className={styles.filterBar}>
          <input
            className={styles.filterInput}
            placeholder="Caută..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {/* Bulk bar */}
        {isPending && filtered.length > 0 && (
          <div className={styles.bulkBar}>
            <label className={styles.checkAll}>
              <input
                type="checkbox"
                checked={checkedIds.size === filtered.length && filtered.length > 0}
                onChange={toggleAll}
              />
              <span>{checkedIds.size > 0 ? `${checkedIds.size} selectate` : "Toate"}</span>
            </label>
            {checkedIds.size > 0 && (
              <button
                className={styles.bulkResolveBtn}
                onClick={handleBulkResolve}
                disabled={sending}
              >
                {sending ? "..." : `✓ Rezolvă ${checkedIds.size}`}
              </button>
            )}
          </div>
        )}

        <div className={styles.listContent}>
          {filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <span>✓</span>
              <p>{isPending ? "Nicio sesizare activă" : "Nicio sesizare rezolvată"}</p>
            </div>
          ) : (
            <ul className={styles.list}>
              {visible.map((t) => (
                <li
                  key={t.id}
                  className={`${styles.listItem} ${selectedTicket?.id === t.id ? styles.selected : ""} ${styles.fadeIn}`}
                  onClick={() => setSelectedTicket((prev) => prev?.id === t.id ? null : t)}
                >
                  <div className={styles.itemTop}>
                    {isPending && (
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={checkedIds.has(t.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleCheck(t.id)}
                      />
                    )}
                    <span
                      className={styles.priorityDot}
                      style={{ background: priorityColor(t.priority) }}
                      title={priorityLabel(t.priority)}
                    />
                    <span className={styles.itemTitle}>{t.title || "Fără titlu"}</span>
                    <span className={styles.categoryTag}>{t.category || "—"}</span>
                  </div>
                  <div className={styles.itemMeta}>
                    <span>▲ {t.upvotes || 0}</span>
                    <span>⏱ {formatDate(t.createdAt)}</span>
                    {t.neighborhood && <span>📍 {t.neighborhood}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {hasMore && (
            <div ref={sentinelRef} className={styles.sentinel}>
              <span>Se încarcă...</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Detalii dreapta ── */}
      <div className={`${styles.detailPanel} ${selectedTicket ? styles.mobileVisible : ""}`}>
        {!selectedTicket ? (
          <div className={styles.detailEmpty}>
            <span className={styles.detailEmptyIcon}>▤</span>
            <p>Selectează o sesizare pentru detalii</p>
          </div>
        ) : (
          <DetailView
            ticket={selectedTicket}
            isPending={isPending}
            message={message}
            onMessageChange={setMessage}
            onResolve={handleSingleResolve}
            onProgress={handleProgress}
            sending={sending}
            onClose={() => setSelectedTicket(null)}
          />
        )}
      </div>
    </div>
  );
}

function DetailView({ ticket, isPending, message, onMessageChange, onResolve, onProgress, sending, onClose }) {
  const images = Array.isArray(ticket.mediaUrls)
    ? ticket.mediaUrls
    : ticket.mediaUrl ? [ticket.mediaUrl] : [];

  const [imgIdx, setImgIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => { setImgIdx(0); }, [ticket.id]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === "Escape")     setLightbox(false);
      if (e.key === "ArrowRight") setImgIdx((i) => Math.min(i + 1, images.length - 1));
      if (e.key === "ArrowLeft")  setImgIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, images.length]);

  return (
    <>
      {lightbox && (
        <div className={styles.lightbox} onClick={() => setLightbox(false)}>
          <div className={styles.lightboxInner} onClick={(e) => e.stopPropagation()}>
            <button className={styles.lightboxClose} onClick={() => setLightbox(false)}>✕</button>
            <img src={images[imgIdx]} alt="" className={styles.lightboxImg} />
            {images.length > 1 && (
              <div className={styles.lightboxNav}>
                <button className={styles.lbNavBtn} onClick={() => setImgIdx((i) => Math.max(i-1,0))} disabled={imgIdx===0}>‹</button>
                <span className={styles.lbCounter}>{imgIdx+1}/{images.length}</span>
                <button className={styles.lbNavBtn} onClick={() => setImgIdx((i) => Math.min(i+1,images.length-1))} disabled={imgIdx===images.length-1}>›</button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles.detailScroll}>
        {/* Header */}
        <div className={styles.detailHeader}>
          <div className={styles.detailHeaderTop}><span className={styles.detailId}>#{ticket.id?.slice(0, 8)}</span><button className={styles.mobileBackBtn} onClick={onClose}>← Listă</button></div>
          <h2 className={styles.detailTitle}>{ticket.title || "Fără titlu"}</h2>
        </div>

        {/* Imagini */}
        {images.length > 0 && (
          <div className={styles.mediaBlock}>
            <div className={styles.mainImgWrap} onClick={() => setLightbox(true)}>
              <img src={images[imgIdx]} alt="" className={styles.mainImg} />
              <span className={styles.zoomHint}>🔍</span>
              {images.length > 1 && <span className={styles.imgBadge}>{imgIdx+1}/{images.length}</span>}
            </div>
            {images.length > 1 && (
              <div className={styles.thumbStrip}>
                {images.map((url, i) => (
                  <button key={i} className={`${styles.thumb} ${i===imgIdx ? styles.thumbActive:""}`} onClick={() => setImgIdx(i)}>
                    <img src={url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className={styles.infoBlock}>
          <Row label="Status"><StatusBadge status={ticket.status} /></Row>
          <Row label="Prioritate">
            <span style={{ color: priorityColor(ticket.priority), fontFamily:"var(--font-mono)", fontSize:11, fontWeight:600 }}>
              {priorityLabel(ticket.priority)}
            </span>
          </Row>
          <Row label="Categorie">{ticket.category || "—"}</Row>
          <Row label="Upvotes">{ticket.upvotes || 0}</Row>
          <Row label="Raportat">{formatDate(ticket.createdAt)}</Row>
          {ticket.neighborhood && <Row label="Cartier">{ticket.neighborhood}</Row>}
          {ticket.location?.lat && (
            <Row label="Locație">
              <a
                href={`https://maps.google.com/?q=${ticket.location.lat},${ticket.location.lng}`}
                target="_blank"
                rel="noreferrer"
                className={styles.mapsLink}
              >
                📍 Deschide Maps
              </a>
            </Row>
          )}
        </div>

        {/* Descriere */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Descriere</div>
          <p className={styles.description}>{ticket.description || "—"}</p>
        </div>

        {/* Răspuns departament — doar la tichete active */}
        {isPending && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Răspuns / Actualizare</div>
            <textarea
              className={styles.textarea}
              placeholder="Descrie progresul sau soluția aplicată..."
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              rows={3}
            />
            <div className={styles.actionRow}>
              <button
                className={styles.btnProgress}
                onClick={() => onProgress(ticket)}
                disabled={sending || !message.trim()}
              >
                📤 Trimite actualizare
              </button>
              <button
                className={styles.btnResolve}
                onClick={() => onResolve(ticket)}
                disabled={sending}
              >
                {sending ? "Se procesează..." : "✓ Marchează Rezolvat"}
              </button>
            </div>
          </div>
        )}

        {/* Răspuns trimis anterior */}
        {ticket.deptResponse && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Răspuns trimis</div>
            <div className={styles.deptResponse}>
              <span className={styles.deptResponseDate}>
                {new Date(ticket.deptResponse.date).toLocaleString("ro-RO")}
              </span>
              <p>{ticket.deptResponse.message}</p>
            </div>
          </div>
        )}

        {/* Log */}
        {ticket.updates?.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Log activitate</div>
            <ul className={styles.updateLog}>
              {[...ticket.updates].reverse().map((u, i) => (
                <li key={i} className={styles.updateEntry}>
                  <span className={styles.updateDate}>{u.date ? new Date(u.date).toLocaleString("ro-RO") : "—"}</span>
                  <span className={styles.updateMsg}>{u.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 0", fontSize:11, fontFamily:"var(--font-mono)", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ color:"var(--text-secondary)" }}>{label}</span>
      <span style={{ color:"var(--text-primary)" }}>{children}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    NOU:          { color:"#4ec9b0", label:"NOU" },
    IN_PROCESARE: { color:"#e8a84a", label:"IN PROCESARE" },
    REZOLVAT:     { color:"#858585", label:"REZOLVAT" },
    RESPINS:      { color:"#f44747", label:"RESPINS" },
  };
  const s = map[status] || { color:"#858585", label: status };
  return <span style={{ color:s.color, fontSize:10, fontWeight:600 }}>● {s.label}</span>;
}
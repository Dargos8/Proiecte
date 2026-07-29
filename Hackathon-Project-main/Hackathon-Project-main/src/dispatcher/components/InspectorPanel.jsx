import { useState, useEffect, useCallback } from "react";
import styles from "../styles/InspectorPanel.module.css";
import { formatDate, priorityColor, priorityLabel, CATEGORIES } from "../../shared/utils/helpers.jsx";

const DEPARTMENTS = Array.from(new Set(CATEGORIES.map(c => c.dept).filter(Boolean)));
const PRIORITIES  = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const STATUS_COLORS = {
  NOU:          [78,  201, 176],
  IN_PROCESARE: [232, 168,  74],
  VERIFICARE:   [187, 134, 252], // Culoarea mov pentru verificare
  REZOLVAT:     [133, 133, 133],
  RESPINS:      [244,  71,  71],
};

// ─── Fetch imagine ultra-rezilient ───
async function fetchImageAsBase64(url) {
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous"; 
      const cacheBuster = url.includes("?") ? `&cb=${Date.now()}` : `?cb=${Date.now()}`;
      img.src = url + cacheBuster;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        resolve({ dataUrl, format: "JPEG" });
      };
      img.onerror = () => reject(new Error("Eroare la redarea imaginii în Canvas"));
    });
  } catch (err) {
    console.warn("Metoda Canvas a eșuat, încercăm cu proxy-ul de rezervă...", err);
    try {
      const proxiedUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxiedUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result;
          let format = "JPEG";
          if (dataUrl.includes("image/png")) format = "PNG";
          else if (dataUrl.includes("image/webp")) format = "WEBP";
          resolve({ dataUrl, format });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (proxyErr) {
      console.error("Toate metodele au eșuat:", url);
      return null;
    }
  }
}

// ─── Incarca fontul Roboto ───
const ROBOTO_URLS = {
  normal: "https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Regular.ttf",
  bold:   "https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Bold.ttf",
};

let robotoCache = null;

async function loadRobotoFont(doc) {
  if (!robotoCache) {
    const [normalRes, boldRes] = await Promise.all([
      fetch(ROBOTO_URLS.normal),
      fetch(ROBOTO_URLS.bold),
    ]);
    const [normalBuf, boldBuf] = await Promise.all([
      normalRes.arrayBuffer(),
      boldRes.arrayBuffer(),
    ]);
    const toB64 = (buf) => {
      const bytes = new Uint8Array(buf);
      let binary  = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    };
    robotoCache = { normal: toB64(normalBuf), bold: toB64(boldBuf) };
  }
  doc.addFileToVFS("Roboto-normal.ttf", robotoCache.normal);
  doc.addFont("Roboto-normal.ttf", "Roboto", "normal");
  doc.addFileToVFS("Roboto-bold.ttf", robotoCache.bold);
  doc.addFont("Roboto-bold.ttf", "Roboto", "bold");
}

export default function InspectorPanel({ ticket, onAssign, onResolve, onReject, onDelete }) {
  const [department,    setDepartment]    = useState("");
  const [category,      setCategory]      = useState("");
  const [priority,      setPriority]      = useState("MEDIUM");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [activeImgIdx,  setActiveImgIdx]  = useState(0);
  const [lightboxOpen,  setLightboxOpen]  = useState(false);
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const [imgErrors,     setImgErrors]     = useState({});

  const images = ticket
    ? Array.isArray(ticket.mediaUrls)
      ? ticket.mediaUrls.filter(Boolean)
      : ticket.mediaUrl ? [ticket.mediaUrl] : []
    : [];

  useEffect(() => {
    if (!ticket) return;
    setDepartment(ticket.departmentAssigned || "");
    setCategory(ticket.category || "");
    setPriority(ticket.priority || "MEDIUM");
    setConfirmDelete(false);
    setActiveImgIdx(0);
    setLightboxOpen(false);
    setImgErrors({});
  }, [ticket?.id]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") setActiveImgIdx((i) => Math.min(i + 1, images.length - 1));
      if (e.key === "ArrowLeft")  setActiveImgIdx((i) => Math.max(i - 1, 0));
      if (e.key === "Escape")     setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, images.length]);

  useEffect(() => {
    document.body.style.overflow = lightboxOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightboxOpen]);

  const handleImgError = useCallback((idx) => {
    setImgErrors((prev) => ({ ...prev, [idx]: true }));
  }, []);

  const handleCategoryChange = (e) => {
    const selectedLabel = e.target.value;
    setCategory(selectedLabel);
    const matchedCategory = CATEGORIES.find(c => c.label === selectedLabel);
    if (matchedCategory && matchedCategory.dept) {
      setDepartment(matchedCategory.dept); 
    }
  };

  if (!ticket) {
    return (
      <aside className={styles.panel} aria-label="Inspector panel">
        <div className={styles.empty}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className={styles.emptyIcon}>
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <p>Selectează un tichet</p>
        </div>
      </aside>
    );
  }

  async function handleAssign() {
    if (!department) return;
    setLoading(true);
    try { await onAssign(ticket, { department, category, priority }); }
    finally { setLoading(false); }
  }

  async function handleReject() {
    setLoading(true);
    try { await onReject(ticket, "Marcat SPAM / invalid de dispatcher"); }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setLoading(true);
    try { await onReject(ticket, "Tichet anulat / șters manual de către dispecer."); }
    finally { setLoading(false); setConfirmDelete(false); }
  }

  async function handleExportPDF() {
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      await loadRobotoFont(doc);
      doc.setFont("Roboto", "normal");

      const W = 210, margin = 16, cW = W - margin * 2;
      let y = 0;

      function checkPage(needed = 10) { if (y + needed > 280) { doc.addPage(); y = 16; } }

      doc.setFillColor(220, 53, 34);
      doc.rect(0, 0, W, 18, "F");
      doc.setFont("Roboto", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
      doc.text("Raportează Galați — Raport Sesizare", margin, 11);
      doc.text(`#${ticket.id?.slice(0, 8).toUpperCase()}`, W - margin, 11, { align: "right" });
      y = 26;

      doc.setTextColor(15, 15, 15); doc.setFontSize(18); doc.setFont("Roboto", "bold");
      const titleLines = doc.splitTextToSize(ticket.title || "Fără titlu", cW);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 7 + 4;

      const stColor = STATUS_COLORS[ticket.status] || [133, 133, 133];
      doc.setFillColor(...stColor);
      doc.roundedRect(margin, y, 42, 7, 1.5, 1.5, "F");
      doc.setFontSize(7.5); doc.setFont("Roboto", "bold"); doc.setTextColor(255, 255, 255);
      doc.text((ticket.status || "—").replace("_", " "), margin + 21, y + 4.8, { align: "center" });

      const prColors = { LOW:[88,166,255], MEDIUM:[232,168,74], HIGH:[255,123,50], CRITICAL:[244,71,71] };
      const prColor  = prColors[ticket.priority] || [133,133,133];
      doc.setFillColor(...prColor);
      doc.roundedRect(margin + 46, y, 34, 7, 1.5, 1.5, "F");
      doc.text(ticket.priority || "—", margin + 46 + 17, y + 4.8, { align: "center" });
      y += 13;

      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3); doc.line(margin, y, W - margin, y); y += 6;

      const col1 = margin, col2 = margin + cW / 2 + 4;
      function metaRow(label, value, x, yPos) {
        doc.setFontSize(7.5); doc.setFont("Roboto", "bold"); doc.setTextColor(120, 120, 120);
        doc.text(label.toUpperCase(), x, yPos);
        doc.setFont("Roboto", "normal"); doc.setTextColor(30, 30, 30); doc.setFontSize(9);
        doc.text(String(value || "—"), x, yPos + 4.5);
      }

      metaRow("Categorie",   ticket.category || "—",               col1, y);
      metaRow("Raportat",    formatDate(ticket.createdAt),         col2, y); y += 12;
      metaRow("Departament", ticket.departmentAssigned || "Neasignat", col1, y);
      metaRow("Upvotes",     String(ticket.upvotes ?? 0),         col2, y); y += 12;
      if (ticket.neighborhood) { metaRow("Cartier", ticket.neighborhood, col1, y); y += 12; }
      y += 2; doc.line(margin, y, W - margin, y); y += 7;

      doc.setFontSize(8.5); doc.setFont("Roboto", "bold"); doc.setTextColor(60, 60, 60);
      doc.text("DESCRIERE", margin, y); y += 5;
      doc.setFont("Roboto", "normal"); doc.setTextColor(50, 50, 50); doc.setFontSize(10);
      const descLines = doc.splitTextToSize(ticket.description || "Nicio descriere furnizată.", cW);
      checkPage(descLines.length * 5 + 4);
      doc.text(descLines, margin, y);
      y += descLines.length * 5.2 + 6;

      const lat = ticket.location?.lat ?? ticket.location?.latitude;
      const lng = ticket.location?.lng ?? ticket.location?.longitude;
      if (lat && lng) {
        checkPage(22);
        doc.line(margin, y, W - margin, y); y += 7;
        doc.setFontSize(8.5); doc.setFont("Roboto", "bold"); doc.setTextColor(60, 60, 60);
        doc.text("LOCAȚIE GPS", margin, y); y += 5;
        doc.setFont("Roboto", "normal"); doc.setFontSize(9); doc.setTextColor(50, 50, 50);
        doc.text(`Latitudine: ${lat.toFixed(6)}   Longitudine: ${lng.toFixed(6)}`, margin, y); y += 5;
        doc.setTextColor(0, 100, 200);
        doc.text(`https://www.google.com/maps?q=${lat},${lng}`, margin, y); y += 8;
      }

      if (images.length > 0) {
        checkPage(14);
        doc.line(margin, y, W - margin, y); y += 7;
        doc.setFontSize(8.5); doc.setFont("Roboto", "bold"); doc.setTextColor(60, 60, 60);
        doc.text(`IMAGINI ATAȘATE (${images.length})`, margin, y); y += 6;

        const cols = 3, gap = 3, imgW = (cW - gap * (cols - 1)) / cols, imgH = imgW * 0.75, rows = Math.ceil(images.length / cols);
        for (let row = 0; row < rows; row++) {
          checkPage(imgH + 10);
          for (let col = 0; col < cols; col++) {
            const idx = row * cols + col; if (idx >= images.length) break;
            const x = margin + col * (imgW + gap);
            doc.setFillColor(235, 235, 235); doc.rect(x, y, imgW, imgH, "F");
            doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2); doc.rect(x, y, imgW, imgH);
            try {
              const imgObj = await fetchImageAsBase64(images[idx]);
              if (imgObj && imgObj.dataUrl) {
                doc.addImage(imgObj.dataUrl, imgObj.format, x, y, imgW, imgH);
                doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.2); doc.rect(x, y, imgW, imgH);
              }
            } catch {
              doc.setFontSize(7); doc.setFont("Roboto", "normal"); doc.setTextColor(160, 160, 160);
              doc.text("Imagine\nnedisponibilă", x + imgW / 2, y + imgH / 2 - 2, { align: "center" });
            }
            doc.setFontSize(6.5); doc.setFont("Roboto", "normal"); doc.setTextColor(140, 140, 140);
            doc.text(`Foto ${idx + 1} / ${images.length}`, x + imgW / 2, y + imgH + 3.5, { align: "center" });
          }
          y += imgH + 7;
        }
        y += 2;
      }

      if (ticket.updates?.length > 0) {
        checkPage(16);
        doc.line(margin, y, W - margin, y); y += 7;
        doc.setFontSize(8.5); doc.setFont("Roboto", "bold"); doc.setTextColor(60, 60, 60);
        doc.text("LOG ACTIVITATE", margin, y); y += 6;

        [...ticket.updates].reverse().forEach((u) => {
          const msgLines = doc.splitTextToSize(u.message || "", cW - 8); checkPage(msgLines.length * 4.5 + 8);
          doc.setFillColor(220, 53, 34); doc.circle(margin + 1.5, y - 0.5, 1.2, "F");
          doc.setFont("Roboto", "bold"); doc.setFontSize(7.5); doc.setTextColor(100, 100, 100);
          doc.text(u.date ? new Date(u.date).toLocaleString("ro-RO") : "—", margin + 5, y); y += 4.5;
          doc.setFont("Roboto", "normal"); doc.setFontSize(9.5); doc.setTextColor(40, 40, 40);
          doc.text(msgLines, margin + 5, y); y += msgLines.length * 4.8 + 4;
        });
      }

      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p); doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3); doc.line(margin, 285, W - margin, 285);
        doc.setFontSize(7); doc.setFont("Roboto", "normal"); doc.setTextColor(160, 160, 160);
        doc.text(`Raportează Galați · Generat: ${new Date().toLocaleString("ro-RO")}`, margin, 290);
        doc.text(`Pagina ${p} / ${totalPages}`, W - margin, 290, { align: "right" });
      }
      doc.save(`sesizare-${ticket.id?.slice(0, 8)}.pdf`);
    } catch (err) { console.error("Eroare export PDF:", err); } 
    finally { setPdfLoading(false); }
  }

  return (
    <>
      {lightboxOpen && (
        <div className={styles.lightbox} onClick={() => setLightboxOpen(false)} role="dialog" aria-modal="true" aria-label="Vizualizare imagine mărită">
          <div className={styles.lightboxInner} onClick={(e) => e.stopPropagation()}>
            <button className={styles.lightboxClose} onClick={() => setLightboxOpen(false)} aria-label="Închide">✕</button>
            <img src={images[activeImgIdx]} alt={`Imagine ${activeImgIdx + 1} din ${images.length}`} className={styles.lightboxImg} />
            {images.length > 1 && (
              <div className={styles.lightboxNav}>
                <button className={styles.lightboxNavBtn} onClick={() => setActiveImgIdx((i) => Math.max(i - 1, 0))} disabled={activeImgIdx === 0} aria-label="Anterioară">‹</button>
                <span className={styles.lightboxCounter}>{activeImgIdx + 1} / {images.length}</span>
                <button className={styles.lightboxNavBtn} onClick={() => setActiveImgIdx((i) => Math.min(i + 1, images.length - 1))} disabled={activeImgIdx === images.length - 1} aria-label="Următoarea">›</button>
              </div>
            )}
          </div>
        </div>
      )}

      <aside className={styles.panel} aria-label="Inspector panel">
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <span className={styles.ticketId}>#{ticket.id?.slice(0, 8)}</span>
            <button
              className={styles.btnPdf}
              onClick={handleExportPDF}
              disabled={pdfLoading}
              aria-label="Exportă sesizarea ca PDF"
              title="Export PDF"
            >
              {pdfLoading ? (
                <span className={styles.btnPdfLoading}>⏳ Se generează...</span>
              ) : (
                <>⬇ Export PDF</>
              )}
            </button>
          </div>
          <span className={styles.headerTitle} title={ticket.title}>{ticket.title || "Fără titlu"}</span>
        </div>

        <div className={styles.scrollable}>
          {images.length > 0 && (
            <div className={styles.mediaBlock}>
              <button className={styles.mainImgWrapper} onClick={() => setLightboxOpen(true)} aria-label={`Deschide imaginea ${activeImgIdx + 1}`} type="button">
                {imgErrors[activeImgIdx] ? (
                  <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-muted)", fontSize:11, fontFamily:"var(--font-mono)" }}>
                    [imagine indisponibilă]
                  </div>
                ) : (
                  <img src={images[activeImgIdx]} alt={`Fotografie ${activeImgIdx + 1}`} className={styles.mainImg} onError={() => handleImgError(activeImgIdx)} loading="lazy" />
                )}
                <span className={styles.imgZoomHint} aria-hidden="true">🔍</span>
                {images.length > 1 && <span className={styles.imgBadge} aria-hidden="true">{activeImgIdx + 1}/{images.length}</span>}
              </button>
              {images.length > 1 && (
                <div className={styles.thumbStrip} role="list" aria-label="Miniaturi">
                  {images.map((url, i) => (
                    <button key={i} className={`${styles.thumb} ${i === activeImgIdx ? styles.thumbActive : ""}`} onClick={() => setActiveImgIdx(i)} aria-label={`Imaginea ${i + 1}`} aria-pressed={i === activeImgIdx} type="button">
                      {imgErrors[i] ? <span style={{ fontSize:9, color:"var(--text-muted)" }}>err</span> : <img src={url} alt={`Thumb ${i + 1}`} onError={() => handleImgError(i)} loading="lazy" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={styles.infoBlock}>
            <InfoRow label="Status"><StatusBadge status={ticket.status} /></InfoRow>
            <InfoRow label="Upvotes">{ticket.upvotes || 0}</InfoRow>
            <InfoRow label="Raportat">{formatDate(ticket.createdAt)}</InfoRow>
            {ticket.neighborhood && <InfoRow label="Cartier">{ticket.neighborhood}</InfoRow>}
            {ticket.spamFlags > 0 && <InfoRow label="Spam flags"><span className={styles.spamCount}>⚑ {ticket.spamFlags}</span></InfoRow>}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Descriere</div>
            <p className={styles.description}>{ticket.description || "—"}</p>
          </div>

          <div className={styles.divider} />

          {/* ── ASCUNDEM ASTA DE LA ANGAJAȚII DE PE TEREN ── */}
          {onAssign && (
            <>
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Acțiuni Dispatcher</div>

                <label className={styles.label} htmlFor="insp-cat">Corectare categorie</label>
                <select id="insp-cat" className={styles.select} value={category} onChange={handleCategoryChange}>
                  <option value="">— selectează —</option>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.label}>{c.label}</option>)}
                </select>

                <label className={styles.label}>Prioritate</label>
                <div className={styles.priorityGrid} role="group" aria-label="Prioritate">
                  {PRIORITIES.map((p) => (
                    <button key={p} type="button"
                      className={`${styles.priorityBtn} ${priority === p ? styles.priorityBtnActive : ""}`}
                      style={priority === p ? { borderColor: priorityColor(p), color: priorityColor(p) } : {}}
                      onClick={() => setPriority(p)} aria-pressed={priority === p}>
                      {priorityLabel(p)}
                    </button>
                  ))}
                </div>

                <label className={styles.label} htmlFor="insp-dept">Asignare departament</label>
                <select id="insp-dept" className={styles.select} value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="">— selectează departament —</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>

                <button className={styles.btnPrimary} disabled={!department || loading} onClick={handleAssign} type="button">
                  {loading ? "Se procesează..." : "▶ Trimite la departament"}
                </button>
              </div>

              <div className={styles.divider} />
            </>
          )}

{/* ── ZONA DE FINALIZARE ── */}
          {/* CRITIC: Am adăugat condiția ca butonul să apară și dacă e ÎN PROCESARE, dar ȘI dacă e în VERIFICARE! */}
          {(ticket.status === "IN_PROCESARE" || ticket.status === "VERIFICARE") && onResolve && (
            <>
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Finalizare Intervenție</div>
                <button 
                  className={styles.btnPrimary} 
                  style={{ background: "#4ec9b0", color: "#000" }} 
                  onClick={() => { setLoading(true); onResolve(ticket).finally(() => setLoading(false)); }} 
                  disabled={loading} 
                  type="button"
                >
                  {loading ? "Se procesează..." : "✅ Marchează ca REZOLVAT (Finalizează)"}
                </button>
              </div>
              <div className={styles.divider} />
            </>
          )}

          {/* ── ASCUNDEM ASTA DE LA ANGAJAȚII DE PE TEREN ── */}
          {onReject && onDelete && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Zona de Rejecție</div>
              <button className={styles.btnReject} onClick={handleReject} disabled={loading} type="button">⚑ Marchează SPAM / Invalid</button>
              <button className={`${styles.btnDelete} ${confirmDelete ? styles.btnDeleteConfirm : ""}`} onClick={handleDelete} disabled={loading} type="button">
                {confirmDelete ? "⚠ Confirmă anularea (mutare în Respinse)" : "✕ Șterge / Anulează tichet"}
              </button>
              {confirmDelete && <button className={styles.btnCancel} onClick={() => setConfirmDelete(false)} type="button">Anulează</button>}
            </div>
          )}

          {ticket.updates?.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Log</div>
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
      </aside>
    </>
  );
}

function InfoRow({ label, children }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", fontSize:13, fontFamily:"var(--font-mono)", gap:8 }}>
      <span style={{ color:"var(--text-secondary)", flexShrink:0 }}>{label}</span>
      <span style={{ color:"var(--text-primary)", textAlign:"right", minWidth:0, wordBreak:"break-word" }}>{children}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    NOU:          { color:"#4ec9b0", label:"NOU" },
    IN_PROCESARE: { color:"#e8a84a", label:"IN PROCESARE" },
    VERIFICARE:   { color:"#bb86fc", label:"VERIFICARE" }, // Adăugat aici pentru estetică!
    REZOLVAT:     { color:"#858585", label:"REZOLVAT" },
    RESPINS:      { color:"#f44747", label:"RESPINS" },
  };
  const s = map[status] || { color:"#858585", label: status || "—" };
  return <span style={{ color:s.color, fontSize:11, fontFamily:"var(--font-mono)", fontWeight:"bold", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.05)" }}>● {s.label}</span>;
}
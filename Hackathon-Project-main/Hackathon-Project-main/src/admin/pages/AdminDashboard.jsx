import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminData } from "../hooks/useAdminData";
import IssueTable from "../components/IssueTable";
import UserTable from "../components/UserTable";
import CreateUserForm from "../components/CreateUserForm";
import Navbar from "../../citizen/components/Navbar"; 
import styles from "../styles/Dashboard.module.css";
// Importăm categoriile doar pentru a le CITI (nu modificăm nimic în helper)
import { CATEGORIES } from "../../shared/utils/helpers"; 

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable"; 
import * as XLSX from "xlsx";

// Păstrăm forma cu underscore pentru a menține compatibilitatea cu baza de date și colegii
const STATUS_ORDER = {
  "NOU": 1,
  "IN_PROCESARE": 2, 
  "REZOLVAT": 3,
  "RESPINS": 4
};

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
      let binary = "";
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

const AdminDashboard = () => {
  const navigate = useNavigate();
  const {
    issues,
    users,
    updateIssueStatus,
    deleteUser,
    createUser,
  } = useAdminData();

  const [currentPage, setCurrentPage] = useState(1);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const itemsPerPage = 10;

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);

  const uniqueCategories = [...new Set(issues.map(issue => issue.category || "Altele"))];
  const uniqueStatuses = Object.keys(STATUS_ORDER);

  // Extragem departamentele unice din helpers (doar le citim)
  const availableDepartments = [...new Set(CATEGORIES.map(cat => cat.dept).filter(Boolean))];

  // Funcție pentru a afișa "neatribuit"
  const getDisplayDepartment = (dept) => {
    if (!dept || dept.toLowerCase() === "neasignat") return "neatribuit";
    return dept;
  };

  // Funcție care elimină vizual underscore-ul din IN_PROCESARE
  const formatStatusDisplay = (status) => {
    if (status === "IN_PROCESARE") return "IN PROCESARE";
    return status;
  };

  const filteredIssues = issues.filter(issue => {
    const issueCategory = issue.category || "Altele";
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(issueCategory);
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(issue.status);
    return matchesCategory && matchesStatus;
  });

  const handleExportPDF = async () => {
    if (filteredIssues.length === 0) {
      alert("Nu există tichete de exportat.");
      return;
    }

    setPdfLoading(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      
      await loadRobotoFont(doc);
      doc.setFont("Roboto", "normal");

      const tableColumn = ["Titlu", "Categorie", "Status", "Data Creării"];
      const tableRows = filteredIssues.map(issue => [
        issue.title || "Fără titlu",
        issue.category || "Altele",
        formatStatusDisplay(issue.status), // Afișăm frumos în PDF
        issue.createdAt ? new Date(issue.createdAt.seconds * 1000).toLocaleDateString("ro-RO") : "N/A"
      ]);

      doc.setFillColor(0, 122, 204);
      doc.rect(0, 0, 210, 18, "F");
      doc.setFont("Roboto", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("Raport Tichete Administrative", 16, 11);
      
      doc.setFontSize(8);
      doc.text(`Generat la: ${new Date().toLocaleString("ro-RO")}`, 160, 11);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 25,
        theme: 'grid',
        styles: { font: "Roboto", fontSize: 9 },
        headStyles: { fillColor: [0, 122, 204] },
      });

      doc.save(`Raport_Tichete_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error("Eroare PDF:", error);
      alert("Generarea PDF a eșuat.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (filteredIssues.length === 0) {
      alert("Nu există tichete de exportat.");
      return;
    }

    const dataToExport = filteredIssues.map(issue => ({
      Titlu: issue.title || "Fără titlu",
      Categorie: issue.category || "Altele",
      Status: formatStatusDisplay(issue.status), // Afișăm frumos în Excel
      Data: issue.createdAt ? new Date(issue.createdAt.seconds * 1000).toLocaleDateString("ro-RO") : "N/A",
      Descriere: issue.description || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tichete");
    XLSX.writeFile(workbook, `Export_Tichete_${new Date().getTime()}.xlsx`);
  };

  const sortedIssues = [...filteredIssues].sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] || 99) - (STATUS_ORDER[b.status] || 99);
    if (statusDiff !== 0) return statusDiff;
    const timeA = a.createdAt?.seconds || 0;
    const timeB = b.createdAt?.seconds || 0;
    return timeB - timeA; 
  });

  const totalPages = Math.ceil(sortedIssues.length / itemsPerPage);
  const paginatedIssues = sortedIssues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleCategory = (category) => {
    setSelectedCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
    setCurrentPage(1);
  };

  const toggleStatus = (status) => {
    setSelectedStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
    setCurrentPage(1);
  };

  const handleStatClick = (status) => {
    if (status === "TOTAL") setSelectedStatuses([]);
    else setSelectedStatuses([status]);
    setCurrentPage(1);
  };

  const stats = {
    total: issues.length,
    noi: issues.filter(issue => issue.status === "NOU").length,
    inProcesare: issues.filter(issue => issue.status === "IN_PROCESARE").length, // Păstrăm logica cu underscore
    rezolvate: issues.filter(issue => issue.status === "REZOLVAT").length,
    respinse: issues.filter(issue => issue.status === "RESPINS").length,
  };

  return (
    <>
      <Navbar />
      
      <div className={styles.container}>
        <h1>Dashboard Admin</h1>

        <section>
          <h2>Contact departamente</h2>
          <CreateUserForm onCreate={createUser} departments={availableDepartments} />
          
          <div className={`${styles.tableResponsive} ${styles.desktopOnly}`}>
            <UserTable users={users} onDelete={deleteUser} />
          </div>

          <div className={styles.mobileOnly}>
            <div className={styles.mobileList}>
              {users.map(user => (
                <div key={user.id} className={styles.mobileListItem} onClick={() => setSelectedUser(user)}>
                  <span>{user.email}</span>
                  <span className={styles.listArrow}>→</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className={styles.collapsibleHeader} onClick={() => setIsStatsExpanded(!isStatsExpanded)}>
            <h2>Statistici tichete</h2>
            <span className={styles.toggleLabel}>{isStatsExpanded ? "Ascunde ▲" : "Afișează ▼"}</span>
          </div>

          {isStatsExpanded && (
            <div className={styles.statsContainer}>
              <div className={styles.statCard} onClick={() => handleStatClick("TOTAL")}>
                <h3>Total Tichete</h3><p>{stats.total}</p>
              </div>
              <div className={styles.statCard} onClick={() => handleStatClick("NOU")}>
                <h3>Noi</h3><p style={{ color: "var(--accent-blue, #007acc)" }}>{stats.noi}</p>
              </div>
              <div className={styles.statCard} onClick={() => handleStatClick("IN_PROCESARE")}>
                {/* Aici modificăm DOAR vizual */}
                <h3>În Procesare</h3><p style={{ color: "var(--warning, #ffc107)" }}>{stats.inProcesare}</p>
              </div>
              <div className={styles.statCard} onClick={() => handleStatClick("REZOLVAT")}>
                <h3>Rezolvate</h3><p style={{ color: "var(--success, #28a745)" }}>{stats.rezolvate}</p>
              </div>
              <div className={styles.statCard} onClick={() => handleStatClick("RESPINS")}>
                <h3>Respinse</h3><p style={{ color: "var(--danger, #dc3545)" }}>{stats.respinse}</p>
              </div>
            </div>
          )}
        </section>

        <section>
          <div className={styles.ticketsHeader}>
            <h2>Tichete</h2>
            <div className={styles.controlsWrapper}>
              <div className={styles.filtersWrapper}>
                <div className={styles.dropdownContainer}>
                  <button className={styles.filterBtn} onClick={() => { setIsCategoryOpen(!isCategoryOpen); setIsStatusOpen(false); }}>
                    Categorie {selectedCategories.length > 0 && `(${selectedCategories.length})`} <span className={styles.caret}>▼</span>
                  </button>
                  {isCategoryOpen && (
                    <div className={styles.dropdownMenu}>
                      {uniqueCategories.map(cat => (
                        <label key={cat} className={styles.checkboxLabel}>
                          <input type="checkbox" checked={selectedCategories.includes(cat)} onChange={() => toggleCategory(cat)} /> {cat}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className={styles.dropdownContainer}>
                  <button className={styles.filterBtn} onClick={() => { setIsStatusOpen(!isStatusOpen); setIsCategoryOpen(false); }}>
                    Status {selectedStatuses.length > 0 && `(${selectedStatuses.length})`} <span className={styles.caret}>▼</span>
                  </button>
                  {isStatusOpen && (
                    <div className={styles.dropdownMenu}>
                      {uniqueStatuses.map(status => (
                        <label key={status} className={styles.checkboxLabel}>
                          <input type="checkbox" checked={selectedStatuses.includes(status)} onChange={() => toggleStatus(status)} /> 
                          {/* Aici eliminăm underscore-ul din meniul dropdown */}
                          {formatStatusDisplay(status)}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.exportWrapper}>
                <button className={styles.exportBtn} onClick={handleExportExcel}>Excel ⬇</button>
                <button 
                  className={styles.exportBtn} 
                  onClick={handleExportPDF} 
                  disabled={pdfLoading}
                >
                  {pdfLoading ? "⏳ PDF" : "PDF ⬇"}
                </button>
              </div>
            </div>
          </div>

          <div className={`${styles.tableResponsive} ${styles.desktopOnly}`}>
            <IssueTable issues={paginatedIssues} onUpdateStatus={updateIssueStatus} />
          </div>

          <div className={styles.mobileOnly}>
            <div className={styles.mobileList}>
              {paginatedIssues.map(issue => (
                <div key={issue.id} className={styles.mobileListItem} onClick={() => setSelectedIssue(issue)}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontWeight: 600 }}>{issue.title || "Tichet fără titlu"}</span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {/* Aici ascundem underscore-ul pe listele de mobil */}
                      {formatStatusDisplay(issue.status)} • {issue.category}
                    </span>
                  </div>
                  <span className={styles.listArrow}>→</span>
                </div>
              ))}
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={currentPage === 1} onClick={() => { setCurrentPage(prev => prev - 1); window.scrollTo(0,0); }}>Anterior</button>
              <span>Pagina {currentPage} din {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => { setCurrentPage(prev => prev + 1); window.scrollTo(0,0); }}>Următor</button>
            </div>
          )}
        </section>
      </div>

      {selectedUser && (
        <div className={styles.modalOverlay} onClick={() => setSelectedUser(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeModalBtn} onClick={() => setSelectedUser(null)}>✕</button>
            <h3>Detalii Contact</h3>
            <div className={styles.modalDetails}>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p><strong>Departament:</strong> <span style={{ textTransform: "capitalize" }}>{getDisplayDepartment(selectedUser.department)}</span></p>
            </div>
            
            {/* AFISARE CONDIȚIONALĂ BUTON ȘTERGERE PENTRU MOBIL */}
            {selectedUser.department?.toLowerCase() !== "admin" ? (
              <button className={styles.deleteBtn} onClick={() => { if(window.confirm("Ștergi?")) { deleteUser(selectedUser.id); setSelectedUser(null); } }}>Șterge utilizator</button>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center", marginTop: "1rem" }}>
                Acest cont de administrator este protejat.
              </p>
            )}
          </div>
        </div>
      )}

      {selectedIssue && (
        <div className={styles.modalOverlay} onClick={() => setSelectedIssue(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeModalBtn} onClick={() => setSelectedIssue(null)}>✕</button>
            <h3>{selectedIssue.title || "Detalii Tichet"}</h3>
            <div className={styles.modalDetails}>
              <p><strong>Categorie:</strong> {selectedIssue.category}</p>
              <p><strong>Status curent:</strong> {formatStatusDisplay(selectedIssue.status)}</p>
            </div>
            <div className={styles.modalActionsVertical}>
              <button className={styles.primaryBtn} onClick={() => navigate(`/ticket/${selectedIssue.id}`)}>Afișează detalii</button>
              {selectedIssue.status !== "REZOLVAT" && selectedIssue.status !== "RESPINS" && (
                <button className={styles.successBtn} onClick={() => { updateIssueStatus(selectedIssue.id, "REZOLVAT"); setSelectedIssue(null); }}>Rezolvă</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
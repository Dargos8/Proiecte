import { useNavigate } from "react-router-dom";
import styles from "../styles/Dashboard.module.css";

const IssueTable = ({ issues, onUpdateStatus }) => {
  const navigate = useNavigate();

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Titlu</th>
          <th>Categorie</th>
          <th>Departament</th>
          <th>Status</th>
          <th>Acțiuni</th>
        </tr>
      </thead>
      <tbody>
        {issues.map((issue) => (
          <tr key={issue.id}>
            <td>{issue.title}</td>
            <td>{issue.category}</td>
            
            <td style={{ textTransform: "capitalize" }}>
              {(!issue.departmentAssigned || issue.departmentAssigned.toLowerCase() === "neasignat") 
                ? "neatribuit" 
                : issue.departmentAssigned}
            </td>
            
            <td>
              {/* Dacă statusul e IN_PROCESARE, îl afișăm vizual fără underscore */}
              <strong>{issue.status === "IN_PROCESARE" ? "IN PROCESARE" : issue.status}</strong>
            </td>
            <td style={{ display: "flex", gap: "8px" }}>
              <button 
                onClick={() => navigate(`/ticket/${issue.id}`)}
                style={{ background: "var(--bg-hover)", borderColor: "var(--border)" }}
              >
                Vezi detalii
              </button>
              
              {issue.status !== "REZOLVAT" && issue.status !== "RESPINS" && (
                <button onClick={() => onUpdateStatus(issue.id, "REZOLVAT")}>
                  Rezolvă
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default IssueTable;
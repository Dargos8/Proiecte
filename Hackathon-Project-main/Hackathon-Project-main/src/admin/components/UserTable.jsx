import styles from "../styles/Dashboard.module.css";

const UserTable = ({ users, onDelete }) => {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Email</th>
          <th>Departament</th>
          <th>Acțiuni</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.email}</td>
            <td style={{ textTransform: 'capitalize' }}>{user.department}</td>
            <td>
              {/* Ascundem butonul de ștergere dacă departamentul este admin */}
              {user.department?.toLowerCase() !== "admin" ? (
                <button onClick={() => onDelete(user.id)}>Șterge</button>
              ) : (
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                  Cont protejat
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default UserTable;
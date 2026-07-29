import { useState, useEffect } from "react";
import Loader from "../../citizen/components/Loader"; // Asigură-te că calea este corectă

const CreateUserForm = ({ onCreate, departments = [] }) => {
  // Adăugăm "dispatcher" manual la final
  const formDepartments = [...departments, "dispatcher"];

  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState(formDepartments[0] || "dispatcher");
  const [isLoading, setIsLoading] = useState(false);

  // Sincronizare la schimbarea departamentelor venite din prop
  useEffect(() => {
    if (formDepartments.length > 0 && !formDepartments.includes(department)) {
      setDepartment(formDepartments[0]);
    }
  }, [departments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onCreate({ email, role: "dept_secretary", department, isActive: true });
      
      setEmail("");
      setDepartment(formDepartments[0]);
    } catch (error) {
      console.error("Eroare la trimitere formular:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loader message="Se procesează datele utilizatorului..." />;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email departament"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <select value={department} onChange={(e) => setDepartment(e.target.value)}>
        {formDepartments.map((dept, index) => (
          <option key={`${dept}-${index}`} value={dept}>
            {dept === "dispatcher" ? "Dispatcher" : dept}
          </option>
        ))}
      </select>

      <button type="submit">Adaugă contact</button>
    </form>
  );
};

export default CreateUserForm;
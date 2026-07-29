import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../utils/firebase";

// hook reutilizabil pentru logout — folosit de dispatcher, dept secretary, admin
export function useLogout(redirectTo = "/") {
  const navigate = useNavigate();

  async function logout() {
    try {
      await signOut(auth);
      navigate(redirectTo);
    } catch (err) {
      console.error("Eroare la logout:", err);
    }
  }

  return logout;
}
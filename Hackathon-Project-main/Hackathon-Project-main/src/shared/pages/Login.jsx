import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import styles from '../styles/Login.module.css';
import bgHome from '../assets/bghome.jpg';

import { 
  FaEnvelope, 
  FaLock, 
  FaSignInAlt, 
  FaExclamationCircle, 
  FaArrowLeft 
} from 'react-icons/fa';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(''); 
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Te rugăm să completezi ambele câmpuri.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Autentificare prin Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Extragere date profil din Firestore (Colecția 'users')
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await signOut(auth);
        setError('Contul nu are permisiuni de acces configurate în sistem.');
        setIsLoading(false);
        return;
      }

      const userData = userDocSnap.data();
      const { role, department } = userData;

      // 3. Rutare pe bază de rol și departament (RBAC)
      if (role === 'admin') {
        // Administratorul sistemului
        navigate('/admin/dashboard');
      } 
      else if (role === 'dept_secretary') {
        // Utilizatori instituționali (Dispecerat sau Departamente Tehnice)
        if (department === 'dispatcher') {
          // Dashboard-ul de control central
          navigate('/dispatcher/dashboard');
        } else {
          // Dashboard-ul de teren (Salubritate, Parcuri, etc.)
          navigate('/departament/dashboard');
        }
      } 
      else {
        // Dacă are alt rol (ex: cetățean) care nu are ce căuta în portalul administrativ
        await signOut(auth);
        setError('Acest portal este rezervat exclusiv personalului autorizat.');
      }

    } catch (err) {
      console.error('Eroare la autentificare:', err);
      // Traducem erorile comune din Firebase
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Email sau parolă incorectă.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Cont blocat temporar (prea multe încercări). Reîncearcă mai târziu.');
      } else {
        setError('Eroare la conectare. Verifică conexiunea la internet.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Background imagine cu overlay */}
      <div 
        className={styles.bgImage} 
        style={{ backgroundImage: `url(${bgHome})` }} 
        aria-hidden="true" 
      />
      <div className={styles.bgOverlay} aria-hidden="true" />

      {/* Buton de întoarcere la pagina principală */}
      <Link to="/" className={styles.backLink} aria-label="Înapoi la pagina principală">
        <FaArrowLeft /> Înapoi la platformă
      </Link>

      <main className={styles.container}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h1 className={styles.title}>Acces Instituțional</h1>
            <p className={styles.subtitle}>
              Portal dedicat exclusiv angajaților și departamentelor tehnice ale Primăriei.
            </p>
          </div>

          {error && (
            <div className={styles.errorBox} role="alert" aria-live="assertive">
              <FaExclamationCircle className={styles.errorIcon} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className={styles.form} noValidate>
            
            {/* Input Email */}
            <div className={styles.inputWrapper}>
              <FaEnvelope className={styles.inputIcon} aria-hidden="true" />
              <input 
                type="email" 
                id="email" 
                name="email"
                className={styles.input} 
                placeholder=" " 
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={isLoading}
              />
              <label htmlFor="email" className={styles.label}>Adresa de email</label>
            </div>

            {/* Input Parolă */}
            <div className={styles.inputWrapper}>
              <FaLock className={styles.inputIcon} aria-hidden="true" />
              <input 
                type="password" 
                id="password" 
                name="password"
                className={styles.input} 
                placeholder=" "
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={isLoading}
              />
              <label htmlFor="password" className={styles.label}>Parolă</label>
            </div>

            <button 
              type="submit" 
              className={styles.submitBtn} 
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                'Se verifică datele...'
              ) : (
                <>
                  <FaSignInAlt aria-hidden="true" /> Autentificare
                </>
              )}
            </button>

          </form>

          <div className={styles.cardFooter}>
             Probleme de acces? Contactează Administratorul IT.
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
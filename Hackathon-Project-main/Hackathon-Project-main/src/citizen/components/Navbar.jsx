// citizen/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { signOut } from 'firebase/auth';
import { auth } from '../../shared/utils/firebase';
import styles from './Navbar.module.css';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  // Tragem starea utilizatorului din Firebase
  const { user, role, department } = useAuth(); 

  // --- NOU: LOGICA PENTRU REDIMENSIONARE ---
  useEffect(() => {
    const handleResize = () => {
      // Dacă fereastra e mai mare de 640px (desktop) și meniul e deschis, închide-l automat
      if (window.innerWidth > 640 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);
  // -----------------------------------------

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // Funcția de deconectare
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsMobileMenuOpen(false);
      navigate('/'); // Îl trimitem pe prima pagină după deconectare
    } catch (error) {
      console.error('Eroare la deconectare:', error);
    }
  };

  // Determinăm ruta corectă pentru panoul de control în funcție de rol
  let panelRoute = '/login'; // Fallback de siguranță
  if (role === 'admin') {
    panelRoute = '/admin/dashboard';
  } else if (role === 'dept_secretary' && department === 'dispatcher') {
    panelRoute = '/dispatcher/dashboard';
  }

  return (
    <>
      <nav className={styles.nav}>
        <div className={styles.navLeft}>
          <Link to="/" className={styles.logo}>Raportează-Galați</Link>
          <div className={`${styles.navLinks} ${styles.desktopOnly}`}>
            <Link to="/raporteaza" className={styles.navLink}>Raportează</Link>
            <Link to="/sesizari" className={styles.navLink}>Hartă</Link>
          </div>
        </div>
        
        {/* Butoane (Desktop) - Afișate DOAR dacă utilizatorul este logat */}
        {user && (
          <div className={`${styles.navRight} ${styles.desktopOnly}`}>
            <Link to={panelRoute} className={styles.btnNav}>Panel</Link>
            <button onClick={handleLogout} className={styles.btnLogout}>Deconectare</button>
          </div>
        )}

        {/* Buton Hamburger pentru Mobil */}
        <button 
          className={styles.mobileMenuBtn}
          onClick={toggleMenu}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMobileMenuOpen ? "Închide meniul principal" : "Deschide meniul principal"}
        >
          <span aria-hidden="true">{isMobileMenuOpen ? '✕' : '☰'}</span>
        </button>

        <div className={styles.navBorder} />
      </nav>

      {/* Meniul de mobil */}
      <div 
        id="mobile-menu" 
        className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.mobileMenuOpen : ''}`}
        aria-hidden={!isMobileMenuOpen}
      >
        <Link to="/raporteaza" className={styles.mobileNavLink} onClick={toggleMenu}>Raportează</Link>
        <Link to="/sesizari" className={styles.mobileNavLink} onClick={toggleMenu}>Hartă</Link>
        
        {/* Butoane (Mobil) - Adăugate la finalul listei DOAR dacă e logat */}
        {user && (
          <>
            <div className={styles.mobileMenuDivider}></div>
            <Link to={panelRoute} className={styles.btnNav} onClick={toggleMenu} style={{textAlign: 'center'}}>
              Panel
            </Link>
            <button onClick={handleLogout} className={styles.btnLogoutMobile}>
              Deconectare
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default Navbar;
// citizen/components/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import styles from '/src/citizen/components/Footer.module.css';

const Footer = () => (
  <footer className={styles.footer}>
    <div className={styles.footerLeft}>
      <span className={styles.footerLogo}>Raportează-Galați</span>
      <p className={styles.footerCopy}>
        © 2026 Inițiativă Civică — Primăria Municipiului Galați.<br /> Toate drepturile rezervate.
      </p>
    </div>
    <div className={styles.footerLinks}>
  <Link to="/despre" className={styles.footerLink}>Despre proiect</Link>
  <Link to="/confidentialitate" className={styles.footerLink}>Confidențialitate</Link>
  <Link to="/termeni" className={styles.footerLink}>Termeni de utilizare</Link>
  <Link to="/accesibilitate" className={styles.footerLink}>Declarație de accesibilitate</Link>
</div>
  </footer>
);

export default Footer;
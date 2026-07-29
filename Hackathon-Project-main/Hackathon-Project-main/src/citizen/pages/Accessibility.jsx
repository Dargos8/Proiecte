import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from '../styles/GenericPage.module.css';

const Accessibility = () => {
  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <h1 className={styles.title}>Declarație de Accesibilitate</h1>
        
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Angajamentul nostru</h2>
          <p className={styles.text}>
            Echipa „Raportează-Galați” se angajează să asigure accesibilitatea platformei sale web pentru persoanele cu dizabilități. Credem că implicarea civică trebuie să fie deschisă tuturor, indiferent de abilitățile fizice sau de tehnologia utilizată pentru navigare.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Standarde respectate</h2>
          <p className={styles.text}>
            Ne străduim să ne conformăm nivelului AA al Ghidului de accesibilitate a conținutului web (WCAG) 2.1. Am implementat următoarele funcționalități:
          </p>
          <ul className={styles.list}>
            <li>Contrast ridicat (High Contrast) adaptat automat pentru modurile Dark/Light, pentru a asigura lizibilitatea textelor.</li>
            <li>Navigare completă din tastatură, cu indicatori vizuali (focus rings) clar definiți pentru toate elementele interactive.</li>
            <li>Etichete ARIA (Accessible Rich Internet Applications) pentru utilizatorii de cititoare de ecran (Screen Readers).</li>
            <li>Suport pentru reducerea mișcării (prefers-reduced-motion) pentru dezactivarea animațiilor nedorite.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Feedback și contact</h2>
          <p className={styles.text}>
            Monitorizăm constant și testăm platforma pentru a îmbunătăți experiența de utilizare. Dacă întâmpinați dificultăți în utilizarea oricărei secțiuni a acestui site sau aveți sugestii de îmbunătățire, vă rugăm să ne contactați la adresa de email: <strong>accesibilitate@raporteaza-galati.ro</strong>.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Accessibility;
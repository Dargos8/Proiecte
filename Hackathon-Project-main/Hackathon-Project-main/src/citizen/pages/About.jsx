import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from '../styles/GenericPage.module.css';

const About = () => {
  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <h1 className={styles.title}>Despre Proiect</h1>
        
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Inițiativa Civică Digitală</h2>
          <p className={styles.text}>
            „Raportează-Galați” este o platformă digitală independentă, creată din dorința de a simplifica și eficientiza comunicarea dintre cetățeni și departamentele tehnice ale administrației locale.
          </p>
          <p className={styles.text}>
            Credem că un oraș inteligent începe cu cetățeni implicați. Prin intermediul acestei aplicații, locuitorii Municipiului Galați pot semnala rapid și precis problemele întâlnite pe domeniul public: gropi în carosabil, iluminat public defect, mașini abandonate, probleme de salubritate sau mobilier urban vandalizat.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Cum funcționează?</h2>
          <ul className={styles.list}>
            <li><strong>Semnalezi:</strong> Faci o fotografie, adaugi o scurtă descriere și fixezi locația pe hartă.</li>
            <li><strong>Validăm:</strong> Sesizarea ta este analizată pentru a ne asigura că este completă și respectă normele de conduită.</li>
            <li><strong>Direcționăm:</strong> Problema este trimisă automat către departamentul competent (Infrastructură, Salubritate, Spații Verzi etc.).</li>
            <li><strong>Rezolvăm:</strong> Ești notificat în timp real pe email de fiecare dată când statusul sesizării tale se modifică.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Transparență totală</h2>
          <p className={styles.text}>
            Toate sesizările aprobate devin publice pe harta interactivă. Astfel, reducem numărul de raportări duplicate și oferim o imagine clară asupra eforturilor depuse pentru remedierea problemelor.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
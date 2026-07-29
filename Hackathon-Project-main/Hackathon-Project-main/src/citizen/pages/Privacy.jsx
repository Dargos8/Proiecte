import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from '../styles/GenericPage.module.css';

const Privacy = () => {
  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <h1 className={styles.title}>Politica de Confidențialitate</h1>
        <span className={styles.lastUpdated}>Ultima actualizare: 26 Martie 2026</span>
        


        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Ce date colectăm și de ce?</h2>
          <p className={styles.text}>
            Când folosești platforma noastră, colectăm doar minimul necesar pentru ca lucrurile să funcționeze:
          </p>
          <ul className={styles.list}>
            <li><strong>Locația GPS:</strong> O folosim strict pentru a pune un „pin” pe hartă acolo unde ai semnalat problema. Așa știe echipa de intervenție unde să meargă.</li>
            <li><strong>Fotografiile și descrierea:</strong> Pentru a arăta clar natura problemei (ex. o groapă, un stâlp defect).</li>
            <li><strong>Adresa de e-mail și numele (dacă îți faci cont):</strong> Le folosim doar ca să te ținem la curent (ex: să primești un e-mail când problema a fost rezolvată).</li>
            <li><strong>Date tehnice (Log-uri):</strong> Ca orice aplicație modernă, colectăm date anonime despre erori sau tipul de dispozitiv folosit, pentru a repara eventualele „bug”-uri ale aplicației.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Ce este public și ce rămâne secret?</h2>
          <p className={styles.text}>
            Platforma noastră este una civică și deschisă, așadar există o diferență clară între ce văd toți utilizatorii și ce rămâne privat.
          </p>
          <ul className={styles.list}>
            <li><strong>Informații Publice:</strong> Descrierea problemei, categoria ei, locația pe hartă și fotografia pe care o încarci devin publice pe platformă pentru ca și alți cetățeni să le poată vedea și susține. Din acest motiv, te rugăm să <strong>nu fotografiezi fețele oamenilor, documente sau date personale</strong>!</li>
            <li><strong>Informații Private:</strong> Adresa ta de e-mail, parola contului și detaliile personale de contact NU vor fi afișate niciodată public și nu pot fi văzute de alți utilizatori.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Cu cine împărțim aceste date?</h2>
          <p className={styles.text}>
            <strong>Nu vindem și nu vom vinde niciodată datele tale personale către agenții de publicitate sau terțe părți.</strong> Datele tale sunt împărtășite doar cu cine trebuie:
          </p>
          <ul className={styles.list}>
            <li><strong>Autoritățile locale (Primăria Galați):</strong> Le trimitem detaliile raportării (locația, poza, problema) ca ei să o poată rezolva.</li>
            <li><strong>Furnizorii de infrastructură (ex. Google / Firebase):</strong> Folosim servere sigure de la companii mari pentru a găzdui aplicația și baza de date. Aceste companii acționează doar ca un seif, nu au voie să folosească datele pentru ei.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Drepturile tale (Conform GDPR)</h2>
          <p className={styles.text}>
            Ești stăpânul datelor tale. Asta înseamnă că ai dreptul să:
          </p>
          <ul className={styles.list}>
            <li>Ne ceri o copie a datelor pe care le avem despre tine.</li>
            <li>Corectezi orice informație greșită din contul tău.</li>
            <li><strong>Dreptul de a fi uitat:</strong> Ne poți cere oricând să îți ștergem contul. Dacă o faci, contul tău va dispărea, iar raportările tale anterioare vor fi anonimizate (vom păstra groapa pe hartă, dar va apărea ca fiind raportată de un „Utilizator Anonim”, fără legătură cu tine).</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Cum ne poți contacta?</h2>
          <p className={styles.text}>
            Dacă vrei să îți exerciți oricare dintre drepturile de mai sus, dacă vrei să îți ștergi contul sau dacă pur și simplu ai o nelămurire despre cum îți protejăm datele, dă-ne un mesaj la adresa de e-mail: <strong>privacy@raporteaza-galati.ro</strong>. Îți vom răspunde cât de repede putem.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from '../styles/GenericPage.module.css';

const Terms = () => {
  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <h1 className={styles.title}>Termeni și Condiții de Utilizare</h1>
        <span className={styles.lastUpdated}>Ultima actualizare: 26 Martie 2026</span>
        
        <section className={styles.section}>
          <p className={styles.text}>
            Salut! Ne bucurăm că ai ales să folosești „Raportează-Galați”. Scopul nostru este simplu: să facem orașul mai bun, lucrând împreună. 
            Acest document explică regulile jocului, ca să ne asigurăm că platforma rămâne un loc util, sigur și eficient pentru toată lumea. 
            Dacă folosești aplicația noastră, înseamnă că ești de acord cu rândurile de mai jos.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Pentru ce este (și nu este) această platformă</h2>
          <p className={styles.text}>
            Platforma este gândită pentru a semnala probleme administrative din spațiul public din Galați (de exemplu: gropi în asfalt, iluminat public defect, gunoi aruncat ilegal, parcuri neîngrijite).
          </p>
          <p className={styles.text}>
            <strong>Foarte important:</strong> Această platformă NU este pentru urgențe! Dacă viața, sănătatea cuiva sau proprietatea sunt în pericol imediat, te rugăm să apelezi numărul de urgență 112.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Reguli de bun simț (Conduita utilizatorului)</h2>
          <p className={styles.text}>
            Vrem ca lucrurile să se rezolve, iar pentru asta e nevoie de o comunicare civilizată. Te rugăm să ne ajuți respectând următoarele:
          </p>
          <ul className={styles.list}>
            <li><strong>Fii respectuos:</strong> Nu folosi un limbaj agresiv, injurios sau discriminatoriu. Am implementat filtre automate care vor bloca astfel de mesaje, dar apelăm în primul rând la bunul tău simț. Până la urmă, toți ne dorim același lucru.</li>
            <li><strong>Fără spam:</strong> Te rugăm să nu trimiți aceeași sesizare de zeci de ori. Asta nu o va face să se rezolve mai repede, ci doar va bloca sistemul și va întârzia rezolvarea altor probleme.</li>
            <li><strong>Fii precis:</strong> Oferă detalii clare și locații exacte. O descriere de genul „E o groapă pe strada Brăilei la numărul 15” ajută mult mai mult decât „Tot orașul e plin de gropi”.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Fotografii și intimitate</h2>
          <p className={styles.text}>
            O poză face cât o mie de cuvinte, dar te rugăm să fii atent la ce fotografiezi:
          </p>
          <ul className={styles.list}>
            <li>Concentrează-te pe problemă (groapa, banca ruptă etc.).</li>
            <li>Evită să surprinzi fețele oamenilor care trec pe stradă. Dacă apar persoane în cadru, asigură-te că nu pot fi identificate.</li>
            <li>Nu fotografia documente personale, curțile interioare ale oamenilor sau numere de înmatriculare (decât dacă raportarea este specific legată de o mașină abandonată pe domeniul public).</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Așteptări realiste (Limitarea răspunderii)</h2>
          <p className={styles.text}>
            Rolul nostru este de a fi o punte de legătură. Noi preluăm sesizarea ta, o organizăm și o trimitem mai departe către departamentul potrivit din administrația locală. 
          </p>
          <p className={styles.text}>
            Trebuie să știi că <strong>nu noi reparăm efectiv străzile sau schimbăm becurile</strong>. Prin urmare, nu putem garanta un termen de rezolvare. Acesta depinde exclusiv de bugetul, programul și resursele autorităților locale. Noi îți promitem doar că vocea ta va fi auzită și transmisă corect.
          </p>
        </section>
        
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Contact și modificări</h2>
          <p className={styles.text}>
            Putem actualiza acești termeni din când în când, pe măsură ce platforma crește. Dacă modificările sunt majore, te vom anunța în aplicație. Pentru orice întrebări, sugestii sau doar pentru a ne spune un „Salut!”, ne poți scrie la contact@raporteaza-galati.ro.
          </p>
        </section>

      </main>
      <Footer />
    </div>
  );
};

export default Terms;
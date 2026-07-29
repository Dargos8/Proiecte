// citizen/pages/Home.jsx
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useIssues } from '../../shared/hooks/useIssues';
import { useAuth } from '../../shared/hooks/useAuth'; // Importăm hook-ul de autentificare
import styles from '../styles/Home.module.css';
import bgHome from '../../shared/assets/bghome.jpg';

// Iconițe profesionale
import { FaMapMarkerAlt, FaThumbsUp, FaRegClock, FaArrowRight } from 'react-icons/fa';
import { MdOutlineFiberNew, MdPendingActions } from 'react-icons/md';

// Helpers pentru afișare
const formatStatus = (status) => {
  const map = { 'NOU': 'Nou', 'IN_PROCESARE': 'Preluat', 'REZOLVAT': 'Rezolvat', 'RESPINS': 'Respins' };
  return map[status] || status;
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'NOU': return <MdOutlineFiberNew aria-hidden="true" className={styles.statusIcon} />;
    case 'IN_PROCESARE': return <MdPendingActions aria-hidden="true" className={styles.statusIcon} />;
    default: return null;
  }
};

const formatDateRelative = (timestamp) => {
  if (!timestamp) return 'Dată necunoscută';
  const dateMs = timestamp.seconds ? timestamp.seconds * 1000 : new Date(timestamp).getTime();
  const diffDays = Math.floor((new Date().getTime() - dateMs) / (1000 * 3600 * 24));
  
  if (diffDays === 0) return 'Astăzi';
  if (diffDays === 1) return 'Ieri';
  return `Acum ${diffDays} zile`;
};

const Home = () => {
  const { issues, loading } = useIssues();
  const { user } = useAuth(); // Tragem informația despre utilizator

  // 1. Calcul Statistici Reale
  const stats = useMemo(() => {
    if (!issues || issues.length === 0) {
      return [
        { value: '< 48h', label: 'Timp mediu de răspuns' },
        { value: '0', label: 'Probleme rezolvate' },
        { value: '0', label: 'Interacțiuni civice' },
      ];
    }

    // Calculăm câte sunt rezolvate efectiv
    const resolvedCount = issues.filter(i => i.status === 'REZOLVAT').length;
    let formattedResolved = resolvedCount.toString();
    if (resolvedCount >= 100) {
      formattedResolved = `${Math.floor(resolvedCount / 100) * 100}+`;
    }

    // Calculăm totalul interacțiunilor (upvotes + numărul de sesizări raportate)
    const totalInteractions = issues.reduce((acc, curr) => acc + (curr.upvotes || 0), 0) + issues.length;
    let formattedInteractions = totalInteractions.toString();
    if (totalInteractions >= 100) {
      formattedInteractions = `${Math.floor(totalInteractions / 100) * 100}+`;
    }

    return [
      { value: '< 48h', label: 'Timp mediu de preluare' },
      { value: formattedResolved, label: 'Probleme rezolvate' },
      { value: formattedInteractions, label: 'Interacțiuni civice' },
    ];
  }, [issues]);

  // 2. Extragere Cele mai populare (Active) - Top 5
  const popularActiveIssues = useMemo(() => {
    return issues
      .filter(i => i.status === 'NOU' || i.status === 'IN_PROCESARE')
      .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))
      .slice(0, 5);
  }, [issues]);

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        {/* HERO */}
        <section className={styles.hero} aria-label="Introducere platformă">
          <div 
            className={styles.heroBg} 
            style={{ backgroundImage: `url(${bgHome})` }}
            aria-hidden="true" 
          />
          <div className={styles.heroContent}>
            <div className={styles.heroEyebrow}>
              <div className={styles.eyebrowLine} aria-hidden="true" />
              <span>Galați — Inițiativă Civică Digitală</span>
            </div>
            <h1 className={styles.heroTitle}>
              Implică-te în schimbarea<br />orașului tău.
            </h1>
            <p className={styles.heroSub}>
              Raportează-Galați este canalul direct de comunicare între tine și administrația locală.
              Semnalează gropi, iluminat defect sau probleme de salubritate, iar noi ne asigurăm că
              ajung direct pe masa departamentelor responsabile.
            </p>
            <div className={styles.heroActions}>
              <Link to="/raporteaza" className={styles.btnPrimary} aria-label="Mergi la formularul de raportare">
                Raportează o problemă
              </Link>
              <Link to="/sesizari" className={styles.btnSecondary} aria-label="Deschide harta interactivă">
                Explorează Harta
              </Link>
            </div>
          </div>
        </section>

        {/* STATS BAR */}
        <section className={styles.statsBar} aria-label="Statistici platformă">
          <div className={styles.statsGrid}>
            {stats.map((s, i) => (
              <div key={i} className={styles.statItem}>
                <p className={styles.statVal}>{loading ? '...' : s.value}</p>
                <p className={styles.statLbl}>{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* POPULAR REPORTS */}
        <section className={styles.reportsSection} aria-labelledby="raportari-populare">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="raportari-populare" className={styles.sectionTitle}>
                Cele mai susținute sesizări
              </h2>
              <p className={styles.sectionSub}>
                Problemele comunității care necesită atenție prioritară și sunt momentan în curs de rezolvare.
              </p>
            </div>
            <Link to="/sesizari" className={styles.seeAllLink}>
              Vezi toate sesizările
              <FaArrowRight aria-hidden="true" className={styles.arrowIcon} />
            </Link>
          </div>

          <div className={styles.cardsGrid}>
            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Se încarcă datele din sistem...</p>
            ) : popularActiveIssues.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Nu există sesizări active în acest moment. Orașul este curat!</p>
            ) : (
              popularActiveIssues.map(issue => (
                <article key={issue.id} className={`${styles.card} ${styles[`cardBorder${issue.status}`] || ''}`}>
                  <div className={styles.cardTop}>
                    <span className={`${styles.badge} ${styles[`badge${issue.status}`] || ''}`}>
                      {getStatusIcon(issue.status)}
                      {formatStatus(issue.status)}
                    </span>
                    <span className={styles.cardTime}>
                      <FaRegClock aria-hidden="true" /> {formatDateRelative(issue.createdAt)}
                    </span>
                  </div>
                  
                  <h3 className={styles.cardTitle}>{issue.title}</h3>
                  <p className={styles.cardDesc}>{issue.description}</p>
                  
                  <div className={styles.cardFooter}>
                    <span className={styles.cardZone}>
                      <FaMapMarkerAlt aria-hidden="true" className={styles.zoneIcon} /> 
                      {issue.neighborhood || 'Locație nespecificată'}
                    </span>
                    
                    <div className={styles.cardActions}>
                      <span className={styles.upvoteCount}>
                        <FaThumbsUp aria-hidden="true" className={styles.upvoteIcon} /> {issue.upvotes || 0}
                      </span>
                      <Link to={`/ticket/${issue.id}`} className={styles.cardCta} aria-label={`Vezi detalii despre ${issue.title}`}>
                        Detalii
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* CTA (Departament Tehnic) - Ascuns dacă utilizatorul este deja logat */}
        {!user && (
          <section className={styles.ctaSection} aria-labelledby="cta-title">
            <div className={styles.ctaBox}>
              <div className={styles.ctaText}>
                <h2 id="cta-title" className={styles.ctaTitle}>
                  Acces Funcționari Publici
                </h2>
                <p className={styles.ctaSub}>
                  Portalul de management dedicat departamentelor tehnice. 
                  Autentifică-te pentru a prelua sesizări, a schimba statusul lucrărilor și a comunica direct cu cetățenii.
                </p>
                <div className={styles.ctaActions}>
                  <Link to="/login" className={styles.btnCta}>
                    Autentificare Sistem
                  </Link>
                </div>
              </div>
              <div className={styles.ctaImgWrap} aria-hidden="true">
                <div className={styles.ctaImgOverlay} />
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Home;
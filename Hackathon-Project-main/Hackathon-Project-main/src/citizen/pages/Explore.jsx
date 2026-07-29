// citizen/pages/Explore.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../shared/utils/firebase';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { useIssues } from '../../shared/hooks/useIssues';
import styles from '../styles/Explore.module.css';
// Am adăugat FaSearch pentru bara de căutare
import { FaFireAlt, FaTag, FaThumbsUp, FaWrench, FaSearch, FaMapMarkerAlt } from 'react-icons/fa';
import Loader from '../components/Loader';

const formatStatus = (status) => {
  const map = { 'NOU': 'Nou', 'IN_PROCESARE': 'Preluat', 'REZOLVAT': 'Rezolvat', 'RESPINS': 'Respins' };
  return map[status] || status;
};

const formatDateShort = (timestamp) => {
  if (!timestamp) return 'Dată necunoscută';
  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  return date.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Explore = () => {
  const { issues, loading } = useIssues();
  
  const [filterCartier, setFilterCartier] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('POPULAR'); 
  // NOU: State pentru bara de căutare
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isSeeding, setIsSeeding] = useState(false);
  const [activeIssue, setActiveIssue] = useState(null);
  const [visibleCount, setVisibleCount] = useState(15);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const filteredIssues = useMemo(() => {
    const NOW_MS = new Date().getTime();
    const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

    let result = issues.filter(issue => {
      // 1. Filtre dropdown
      if (filterStatus !== 'ALL' && issue.status !== filterStatus) return false;
      if (filterCartier !== 'ALL' && issue.neighborhood !== filterCartier) return false;
      if (filterCategory !== 'ALL' && issue.category !== filterCategory) return false;

      // 2. NOU: Filtru de căutare text (pe titlu)
      if (searchQuery.trim() !== '') {
        const titleMatch = issue.title?.toLowerCase().includes(searchQuery.toLowerCase());
        if (!titleMatch) return false;
      }

      // 3. Regula de 4 zile pentru rezolvate/respinse
      if (issue.status === 'REZOLVAT' || issue.status === 'RESPINS') {
        const lastUpdateStr = issue.updates?.[issue.updates.length - 1]?.date;
        const issueDateMs = lastUpdateStr 
          ? new Date(lastUpdateStr).getTime() 
          : (issue.createdAt?.seconds ? issue.createdAt.seconds * 1000 : 0);
        
        if (NOW_MS - issueDateMs > FOUR_DAYS_MS) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'POPULAR') {
        const votesA = a.upvotes || 0;
        const votesB = b.upvotes || 0;
        if (votesA !== votesB) return votesB - votesA;
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      } else {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return sortBy === 'NEWEST' ? timeB - timeA : timeA - timeB;
      }
    });

    return result;
  }, [issues, filterStatus, filterCartier, filterCategory, sortBy, searchQuery]); // Am adăugat searchQuery în dependențe

  const availableCartiere = useMemo(() => [...new Set(filteredIssues.map(i => i.neighborhood).filter(Boolean))].sort(), [filteredIssues]);
  const availableStatusuri = useMemo(() => [...new Set(filteredIssues.map(i => i.status).filter(Boolean))].sort(), [filteredIssues]);
  const availableCategorii = useMemo(() => [...new Set(filteredIssues.map(i => i.category).filter(Boolean))].sort(), [filteredIssues]);

  useEffect(() => { setVisibleCount(15); }, [filteredIssues.length, filterCartier, filterStatus, filterCategory, sortBy, searchQuery]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (visibleCount < filteredIssues.length) setVisibleCount(prev => prev + 10);
    }
  };

  const visibleIssuesList = filteredIssues.slice(0, visibleCount);

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.container}>
        <aside className={styles.sidebar} onScroll={handleScroll}>
          <div className={styles.sidebarHeader}>
            <h1>Harta Sesizărilor</h1>
            <p>Se afișează {filteredIssues.length} rezultate (actuale).</p>
          </div>

          <div className={styles.filtersWrapper}>
            {/* BARA DE CĂUTARE NOUĂ */}
            <div className={styles.searchWrapper}>
              <FaSearch className={styles.searchIcon} aria-hidden="true" />
              <input 
                type="text" 
                placeholder="Caută după titlu..." 
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.filterRow}>
              <select className={styles.filterSelect} value={filterCartier} onChange={e => setFilterCartier(e.target.value)}>
                <option value="ALL">Toate Cartierele</option>
                {availableCartiere.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className={styles.filterSelect} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="ALL">Toate Statusurile</option>
                {availableStatusuri.map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}
              </select>
            </div>
            <div className={styles.filterRow}>
              <select className={styles.filterSelect} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="ALL">Toate Categoriile</option>
                {availableCategorii.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              
              <select className={styles.filterSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="POPULAR">Cele mai populare</option>
                <option value="NEWEST">Cele mai noi</option>
                <option value="OLDEST">Cele mai vechi</option>
              </select>
            </div>
          </div>

          {/* Loader corectat ca să nu strice UI-ul */}
          {loading ? (
            <div style={{ padding: '2rem 0', display: 'flex', justifyContent: 'center' }}>
              <Loader message="Se încarcă tichetele..." />
            </div>
          ) : filteredIssues.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--surface-mid)', borderRadius: '8px' }}>
              Niciun rezultat găsit pentru filtrele selectate.
            </div>
          ) : (
            <div className={styles.issueList} role="feed">
              {visibleIssuesList.map(issue => {
                const isPopular = (issue.upvotes || 0) >= 20;

                return (
                  <div 
                    key={issue.id} 
                    className={`${styles.card} ${styles[`card${issue.status}`] || ''} ${isPopular ? styles.cardPopular : ''}`}
                    onClick={() => {
                      setActiveIssue(issue);
                      setIsMapExpanded(true); 
                    }}
                    role="button" tabIndex={0}
                  >
                    <div className={styles.cardTop}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isPopular && <span className={styles.badgePopular}><FaFireAlt /> Popular</span>}
                        <span className={`${styles.statusBadge} ${styles[`badge${issue.status}`] || ''}`}>
                          {formatStatus(issue.status)}
                        </span>
                      </div>
                      <span className={styles.cardDate}>{formatDateShort(issue.createdAt)}</span>
                    </div>
                    
                    <h3 className={styles.cardTitle}>{issue.title}</h3>
                    
                    <div className={styles.cardBottom}>
  {/* Am grupat categoria și cartierul pentru a sta frumos în stânga */}
  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
    <span className={styles.cardCategory}>
      <FaTag /> {issue.category}
    </span>
    
    {/* Afișăm cartierul doar dacă există o valoare pentru el */}
    {issue.neighborhood && (
      <span className={styles.cardCategory}>
        <FaMapMarkerAlt /> {issue.neighborhood}
      </span>
    )}
  </div>

  <span className={`${styles.cardUpvotes} ${isPopular ? styles.upvotesPopular : ''}`}>
    <FaThumbsUp /> {issue.upvotes || 0}
  </span>
</div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        <section className={`${styles.mapArea} ${isMapExpanded ? styles.expanded : styles.collapsed}`}>
          <button 
            className={styles.mapToggleBtn} 
            onClick={() => setIsMapExpanded(!isMapExpanded)}
          >
            <div className={styles.mapHandle}></div>
            {isMapExpanded ? 'Ascunde Harta' : 'Afișează Harta'}
          </button>
          
          <div style={{ flex: 1, position: 'relative' }}>
            <MapView issues={filteredIssues} activeIssue={activeIssue} />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Explore;
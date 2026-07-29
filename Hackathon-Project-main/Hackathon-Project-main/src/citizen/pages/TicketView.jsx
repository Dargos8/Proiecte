// citizen/pages/TicketView.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { useTicket } from '../../shared/hooks/useTicket';
import { useReverseGeocode } from '../../shared/hooks/useReverseGeocode';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import styles from '../styles/TicketView.module.css';

import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore'; 
import { db } from '../../shared/utils/firebase';
import emailjs from '@emailjs/browser'; // Import EmailJS

import { FaMapMarkerAlt, FaCalendarAlt, FaChevronLeft, FaChevronRight, FaTag } from 'react-icons/fa';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const formatDate = (timestamp) => {
  if (!timestamp) return 'Dată necunoscută';
  const date = typeof timestamp === 'string' ? new Date(timestamp) : (timestamp.toDate ? timestamp.toDate() : new Date(timestamp));
  return new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
};

// Componentă sub-carusel
const ImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(null);

  const scrollToIndex = (index) => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * index;
    scrollRef.current.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    setCurrentIndex(index);
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth);
    setCurrentIndex(index);
  };

  if (!images || images.length === 0) return null;

  return (
    <div className={styles.carouselContainer}>
      {images.length > 1 && (
        <button 
          className={`${styles.navBtn} ${styles.prevBtn}`} 
          onClick={() => scrollToIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          aria-label="Imaginea anterioară"
        >
          <FaChevronLeft />
        </button>
      )}

      <div className={styles.carouselTrack} ref={scrollRef} onScroll={handleScroll}>
        {images.map((imgUrl, i) => (
          <img key={i} src={imgUrl} alt={`Dovada ${i+1}`} className={styles.carouselImage} loading="lazy" />
        ))}
      </div>

      {images.length > 1 && (
        <button 
          className={`${styles.navBtn} ${styles.nextBtn}`} 
          onClick={() => scrollToIndex(Math.min(images.length - 1, currentIndex + 1))}
          disabled={currentIndex === images.length - 1}
          aria-label="Imaginea următoare"
        >
          <FaChevronRight />
        </button>
      )}

      {images.length > 1 && (
        <div className={styles.dots}>
          {images.map((_, i) => (
            <div key={i} className={`${styles.dot} ${i === currentIndex ? styles.activeDot : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
};


const TicketView = () => {
  const { id } = useParams();
  const { ticket, loading, error } = useTicket(id);
  
  const [hasVoted, setHasVoted] = useState(false);
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const { address } = useReverseGeocode(ticket?.location);
  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState({ type: '', msg: '' });
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    const votedIssues = JSON.parse(localStorage.getItem('votedIssues') || '[]');
    if (votedIssues.includes(id)) setHasVoted(true);

    const subscribedIssues = JSON.parse(localStorage.getItem('subscribedIssues') || '[]');
    if (subscribedIssues.includes(id)) setHasSubscribed(true);
  }, [id]);

  const handleUpvote = async () => {
    if (hasVoted) return;
    try {
      const ticketRef = doc(db, 'issues', id);
      await updateDoc(ticketRef, { upvotes: increment(1) });
      const votedIssues = JSON.parse(localStorage.getItem('votedIssues') || '[]');
      votedIssues.push(id);
      localStorage.setItem('votedIssues', JSON.stringify(votedIssues));
      setHasVoted(true);
    } catch (err) { alert('Eroare la înregistrarea votului.'); }
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    const existingSubscribers = ticket.subscribers || [];
    if (existingSubscribers.some(sub => sub.toLowerCase() === email.toLowerCase())) {
      setSubStatus({ type: 'error', msg: 'Acest email este deja abonat la actualizările acestui tichet.' });
      return;
    }

    setIsSubscribing(true);
    setSubStatus({ type: '', msg: '' });

    try {
      // 1. Salvează în baza de date
      const ticketRef = doc(db, 'issues', id);
      await updateDoc(ticketRef, { subscribers: arrayUnion(email) });
      
      // 2. Extrage date pentru email
      const latestUpdateMsg = ticket.updates && ticket.updates.length > 0 
        ? ticket.updates[ticket.updates.length - 1].message 
        : "Tichetul a fost înregistrat.";

      const serviceID = 'service_q4agz03'; // ÎNLOCUIEȘTE
      const templateID = 'template_adb3hjk'; // ÎNLOCUIEȘTE
      const publicKey = 'HThoBqjbCawNWFFNL'; // ÎNLOCUIEȘTE

      const templateParams = {
        to_email: email,
        ticket_id: ticket.id ? ticket.id.slice(0, 6).toUpperCase() : "N/A",
        ticket_title: ticket.title,
        ticket_category: ticket.category,
        ticket_status: ticket.status.replace('_', ' '),
        ticket_priority: ticket.priority || 'Normală',
        latest_update: latestUpdateMsg,
        ticket_link: `${window.location.origin}/ticket/${id}`
      };

      // 3. Trimite emailul pe bune
      await emailjs.send(serviceID, templateID, templateParams, publicKey);

      // 4. Salvează pe dispozitiv ca abonat
      const subscribedIssues = JSON.parse(localStorage.getItem('subscribedIssues') || '[]');
      subscribedIssues.push(id);
      localStorage.setItem('subscribedIssues', JSON.stringify(subscribedIssues));
      setHasSubscribed(true);

      setSubStatus({ type: 'success', msg: 'Abonare reușită! Vei primi un email de confirmare.' });
      setEmail(''); 
    } catch (err) {
      console.error('Eroare la abonare/trimitere email:', err);
      setSubStatus({ type: 'error', msg: 'A apărut o eroare la procesarea abonării.' });
    } finally {
      setIsSubscribing(false);
    }
  };

  if (loading) return <div className={styles.page}><Navbar /><main className={styles.container}><Loader message="Se încarcă tichetul..." /></main></div>;
  if (error || !ticket) return <div className={styles.page}><Navbar /><main className={styles.container}><div style={{ textAlign: 'center', padding: '4rem', color: 'var(--error)' }}><h2>{error || 'Tichet negăsit.'}</h2></div></main></div>;

  const imagesToDisplay = ticket.mediaUrls && ticket.mediaUrls.length > 0 
    ? ticket.mediaUrls 
    : (ticket.mediaUrl ? [ticket.mediaUrl] : []);

  return (
    <div className={styles.page}>
      <Navbar />
      
      <main className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleBox}>
            <h1>{ticket.title}</h1>
            <div className={styles.meta}>
              <span>ID: #{ticket.id.slice(0, 6).toUpperCase()}</span>
              <span>•</span>
              <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><FaCalendarAlt /> {formatDate(ticket.createdAt)}</span>
              <span>•</span>
              <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><FaTag /> {ticket.category}</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
            <span className={`${styles.badge} ${styles[`badge${ticket.status}`] || ''}`}>
              Status: {ticket.status.replace('_', ' ')}
            </span>
            <button className={styles.upvoteBtn} onClick={handleUpvote} disabled={hasVoted}>
              <span>{hasVoted ? '✓ Susținut' : '👍 Susține'}</span>
              <span>({ticket.upvotes || 0})</span>
            </button>
          </div>
        </header>

        <div className={styles.grid}>
          <div>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Descriere Problemă</h2>
              <p className={styles.desc}>{ticket.description}</p>
              
              <ImageCarousel images={imagesToDisplay} />
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Istoric Rezolvare</h2>
              {ticket.updates && ticket.updates.length > 0 ? (
                <div className={styles.timeline}>
                  {ticket.updates.map((update, index) => (
                    <div key={index} className={styles.updateItem}>
                      <div className={styles.updateDot} aria-hidden="true" />
                      <p className={styles.updateDate}>{formatDate(update.date)}</p>
                      <p className={styles.updateMessage}>{update.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.desc}>Nu există actualizări momentan.</p>
              )}
            </section>
          </div>

          <aside>
            <section className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--surface-top)' }}>
                <h2 className={styles.cardTitle} style={{ margin: 0 }}>Locație</h2>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                <MapContainer center={[ticket.location.lat, ticket.location.lng]} zoom={16} style={{ height: '100%', width: '100%' }} zoomControl={false} dragging={false} scrollWheelZoom={false}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                  <Marker position={[ticket.location.lat, ticket.location.lng]} />
                </MapContainer>
              </div>
              
              <div style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: 'var(--text)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', backgroundColor: 'var(--surface-low)' }}>
                <FaMapMarkerAlt style={{ color: '#ef4444', marginTop: '2px', flexShrink: 0 }} aria-hidden="true" />
                <span style={{ fontWeight: '500', lineHeight: '1.4' }}>{address}</span>
              </div>
            </section>

            <section className={styles.subscribeCard}>
              <h3 className={styles.subscribeTitle}>Abonează-te la actualizări</h3>
              <p className={styles.subscribeDesc}>Fii notificat imediat ce departamentul adaugă noi detalii.</p>
              
              {hasSubscribed ? (
                <div className={styles.msgSuccess}>✓ Ești deja abonat la acest tichet.</div>
              ) : (
                <form className={styles.subscribeForm} onSubmit={handleSubscribe}>
                  <input type="email" required placeholder="adresa@email.com" className={styles.subscribeInput} value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubscribing} />
                  <button type="submit" className={styles.subscribeBtn} disabled={isSubscribing}>{isSubscribing ? 'Se procesează...' : 'Abonează-mă'}</button>
                </form>
              )}
              {!hasSubscribed && subStatus.msg && <div className={subStatus.type === 'success' ? styles.msgSuccess : styles.msgError}>{subStatus.msg}</div>}
            </section>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TicketView;
// citizen/pages/Report.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LocationPicker from '../components/LocationPicker';
import styles from '../styles/Report.module.css';
import { db, storage } from '../../shared/utils/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import emailjs from '@emailjs/browser';
import imageCompression from 'browser-image-compression';

import { FaExclamationCircle, FaCheckCircle, FaUpload, FaEnvelope, FaExclamationTriangle } from 'react-icons/fa';

const MAX_FILE_SIZE_MB = 5;
import { CATEGORIES } from '../../shared/utils/helpers';

import { containsBadWordRegex } from '/src/shared/utils/badWordsFilter.jsx';

// Formula Haversine pentru a calcula distanța în metri între două coordonate GPS
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
};

const Report = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ title: '', description: '', category: CATEGORIES[0].label });
  const [location, setLocation] = useState(null);
  
  const [files, setFiles] = useState([]);
  const [wantsSubscription, setWantsSubscription] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [nearbyIssue, setNearbyIssue] = useState(null);
  const [forceSubmit, setForceSubmit] = useState(false); 

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Nu permitem scrierea peste 500 de caractere la descriere direct din onChange
    if (name === 'description' && value.length > 500) return;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setError('');
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    if (selectedFiles.length > 3) {
      setError('Poți atașa maxim 3 fotografii per sesizare.');
      e.target.value = null;
      return;
    }

    const totalSize = selectedFiles.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`Dimensiunea totală a imaginilor depășește limita de ${MAX_FILE_SIZE_MB}MB.`);
      e.target.value = null;
      return;
    }

    setFiles(selectedFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNearbyIssue(null);

    // 1. VALIDĂRI DE BAZĂ (Câmpuri obligatorii stricte)
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Te rugăm să completezi toate câmpurile obligatorii (titlul și descrierea).');
      return;
    }
    if (formData.description.length > 500) {
      setError('Descrierea depășește limita de 500 de caractere.');
      return;
    }
    if (!location) {
      setError('Te rugăm să selectezi locația problemei pe hartă.');
      return;
    }
    if (wantsSubscription && (!email || !email.includes('@'))) {
      setError('Te rugăm să introduci o adresă de email validă pentru abonare.');
      return;
    }

    // 2. ANTI-SPAM (Rate Limiting)
    const lastReportTime = localStorage.getItem('lastReportTime');
    if (lastReportTime && Date.now() - parseInt(lastReportTime) < 120000) {
      setError('Ai trimis deja o sesizare recent. Te rugăm să aștepți 2 minute pentru a preveni spam-ul.');
      return;
    }

    // 3. FILTRU LIMBAJ 
    const textToCheck = formData.title + ' ' + formData.description;
    if (containsBadWordRegex(textToCheck)) {
      setError('Am detectat limbaj neadecvat. Te rugăm să reformulezi sesizarea într-un mod politicos.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 4. GEOFENCING STRICT (Doar Municipiul Galați, exclus sate/județ)
      let neighborhood = 'Locație nespecificată';
      let isGalati = false;

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`);
        const data = await res.json();
        
        if (data && data.address) {
          // Extragem denumirea exactă a localității principale
          const cityExact = data.address.city || data.address.municipality || data.address.town || '';
          
          // Verificăm dacă ESTE ORAȘUL Galați (nu doar conține cuvântul undeva în string-ul județului)
          if (cityExact === 'Galați') {
            isGalati = true;
            neighborhood = data.address.neighbourhood || data.address.suburb || data.address.residential || 'Galați';
          }
        }
      } catch (geoErr) {
        console.warn("Eroare API Nominatim, trecem pe fallback matematic:", geoErr);
        // Fallback: Raza redusă la 7km de la centrul Galațiului ca să acopere orașul dar să taie comunele vecine (ex: Șendreni, Vânători)
        const distToCenter = getDistanceInMeters(location.lat, location.lng, 45.4353, 28.0079);
        if (distToCenter <= 7000) {
          isGalati = true;
        }
      }

      if (!isGalati) {
        setError('Ne pare rău, dar platforma acceptă exclusiv sesizări din interiorul orașului Galați, nu și din județ sau localitățile învecinate.');
        setIsSubmitting(false);
        return; 
      }

      // 5. SMART PROXIMITY CHECK (Doar dacă nu a forțat trimiterea deja)
      if (!forceSubmit) {
        const q = query(collection(db, 'issues'), where('status', 'in', ['NOU', 'IN_PROCESARE']));
        const snapshot = await getDocs(q);
        
        let foundNearby = null;
        for (const docSnap of snapshot.docs) {
          const issue = docSnap.data();
          if (issue.location && issue.location.lat && issue.location.lng) {
            const distance = getDistanceInMeters(location.lat, location.lng, issue.location.lat, issue.location.lng);
            if (distance <= 50) { 
              foundNearby = { id: docSnap.id, distance, ...issue };
              break; 
            }
          }
        }

        if (foundNearby) {
          setNearbyIssue(foundNearby);
          setIsSubmitting(false);
          return; 
        }
      }

      // 6. UPLOAD IMAGINI (Acum cu compresie automată)
      let mediaUrls = [];
      if (files.length > 0) {
        const uploadPromises = files.map(async (fileObj) => {
          
          const options = {
            maxSizeMB: 1,           
            maxWidthOrHeight: 1280, 
            useWebWorker: true,     
            fileType: 'image/webp'  
          };
          
          let fileToUpload = fileObj; 
          
          try {
            fileToUpload = await imageCompression(fileObj, options);
          } catch (compError) {
            console.warn("Compresia a eșuat pentru o imagine, se folosește originalul:", compError);
          }

          const fileRef = ref(storage, `issues/${Date.now()}_${fileObj.name}`);
          const snapshot = await uploadBytes(fileRef, fileToUpload);
          return await getDownloadURL(snapshot.ref);
        });
        
        mediaUrls = await Promise.all(uploadPromises); 
      }

      // 7. SALVARE FINALĂ ÎN FIRESTORE
      const issueData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        location: { lat: location.lat, lng: location.lng },
        neighborhood: neighborhood, 
        mediaUrls: mediaUrls, 
        status: 'NOU',
        priority: 'NORMAL',
        departmentAssigned: null,
        upvotes: 0,
        subscribers: wantsSubscription && email ? [email] : [],
        createdAt: serverTimestamp(),
        updates: [{ date: new Date().toISOString(), message: 'Sesizarea a fost înregistrată în sistem.' }]
      };

      const docRef = await addDoc(collection(db, 'issues'), issueData);

      localStorage.setItem('lastReportTime', Date.now().toString());

      // 8. EMAIL CONFIRMARE ABONARE
      if (wantsSubscription && email) {
        const subscribedIssues = JSON.parse(localStorage.getItem('subscribedIssues') || '[]');
        subscribedIssues.push(docRef.id);
        localStorage.setItem('subscribedIssues', JSON.stringify(subscribedIssues));

        try {
          const serviceID = 'service_q4agz03'; 
          const templateID = 'template_adb3hjk';
          const publicKey = 'HThoBqjbCawNWFFNL';

          const templateParams = {
            to_email: email,
            ticket_id: docRef.id.slice(0, 6).toUpperCase(),
            ticket_title: formData.title,
            ticket_category: formData.category,
            ticket_status: 'Nou',
            ticket_priority: 'Normală',
            latest_update: 'Sesizarea a fost înregistrată în sistem.',
            ticket_link: `${window.location.origin}/ticket/${docRef.id}`
          };
          await emailjs.send(serviceID, templateID, templateParams, publicKey);
        } catch (e) {
          console.error("Eroare trimitere email:", e);
        }
      }

      navigate(`/ticket/${docRef.id}`);

    } catch (err) {
      console.error("Eroare la trimitere:", err);
      setError('A apărut o eroare de conexiune cu baza de date. Te rugăm să încerci din nou.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />
      
      <main className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Raportează o problemă</h1>
          <p className={styles.subtitle}>Ajută-ne să îmbunătățim orașul semnalând incidentele de pe domeniul public.</p>
        </div>

        {error && (
          <div className={styles.errorText} role="alert" aria-live="assertive">
            <FaExclamationCircle aria-hidden="true" /> {error}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.formSection}>
            <div className={styles.inputGroup}>
              <label htmlFor="title" className={styles.label}>Titlu pe scurt <span aria-hidden="true">*</span></label>
              <input 
                type="text" id="title" name="title" required
                className={styles.input} 
                placeholder="Ex: Groapă periculoasă pe trecerea de pietoni"
                value={formData.title} onChange={handleInputChange}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="category" className={styles.label}>Categorie <span aria-hidden="true">*</span></label>
              <select 
                id="category" name="category" required
                className={styles.select}
                value={formData.category} onChange={handleInputChange}
              >
                {CATEGORIES.map(cat => <option key={cat.id} value={cat.label}>{cat.label}</option>)}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="description" className={styles.label}>
                Descriere detaliată <span aria-hidden="true">*</span>
                {/* Contor vizual caractere */}
                <span style={{ 
                  marginLeft: 'auto', 
                  fontSize: '0.8rem', 
                  fontWeight: 'normal',
                  color: formData.description.length >= 500 ? 'var(--error)' : 'var(--text-muted)' 
                }}>
                  {formData.description.length}/500
                </span>
              </label>
              <textarea 
                id="description" name="description" required
                className={styles.textarea} 
                maxLength={500}
                placeholder="Oferă cât mai multe detalii despre problemă, puncte de reper, etc..."
                value={formData.description} onChange={handleInputChange}
              />
            </div>

            <div className={styles.subscriptionBox}>
              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  checked={wantsSubscription}
                  onChange={(e) => {
                    setWantsSubscription(e.target.checked);
                    if (!e.target.checked) setEmail('');
                  }}
                  className={styles.checkboxInput}
                />
                <span className={styles.checkboxCustom} aria-hidden="true">
                  {wantsSubscription && <FaCheckCircle />}
                </span>
                Vreau să fiu notificat pe email despre rezolvarea acestei sesizări
              </label>

              {wantsSubscription && (
                <div className={styles.emailSlideDown}>
                  <label htmlFor="subEmail" className="sr-only">Adresa de email</label>
                  <div className={styles.emailInputWrapper}>
                    <FaEnvelope className={styles.emailIcon} aria-hidden="true" />
                    <input 
                      type="email" 
                      id="subEmail" 
                      placeholder="adresa@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={styles.emailInput}
                      required={wantsSubscription}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Alege locația <span aria-hidden="true">*</span></label>
              <div className={styles.mapWrapper}>
                <LocationPicker location={location} setLocation={setLocation} />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Atașează fotografii (Maxim 3, Total max {MAX_FILE_SIZE_MB}MB)</label>
              <div className={styles.fileInputWrapper}>
                <input 
                  type="file" id="media" accept="image/png, image/jpeg, image/webp" 
                  multiple
                  className={styles.fileInput} onChange={handleFileChange}
                />
                <div className={styles.fileInputContent} style={{ color: files.length > 0 ? 'var(--gold)' : 'var(--text-muted)' }}>
                  {files.length > 0 ? (
                    <>
                      <FaCheckCircle size={24} /> 
                      <span>{files.length} {files.length === 1 ? 'imagine selectată' : 'imagini selectate'}</span>
                    </>
                  ) : (
                    <>
                      <FaUpload size={24} /> 
                      <span>Apasă aici sau trage până la 3 imagini</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.formFooter}>
            {nearbyIssue ? (
              <div className={styles.proximityWarning}>
                <div className={styles.proximityHeader}>
                  <FaExclamationTriangle size={24} className={styles.proximityIcon} />
                  <div>
                    <strong>Există deja o problemă semnalată la ~{nearbyIssue.distance}m de tine!</strong>
                    <p>"{nearbyIssue.title}"</p>
                  </div>
                </div>
                <div className={styles.proximityActions}>
                  <Link to={`/ticket/${nearbyIssue.id}`} className={styles.btnViewNearby}>
                    Mergi la sesizarea existentă
                  </Link>
                  <button 
                    type="button" 
                    className={styles.btnForceSubmit}
                    onClick={() => {
                      setForceSubmit(true);
                      setNearbyIssue(null);
                    }}
                  >
                    Este o problemă diferită, continuă
                  </button>
                </div>
              </div>
            ) : (
              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? 'Se trimite în sistem...' : 'Trimite Sesizarea'}
              </button>
            )}
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default Report;
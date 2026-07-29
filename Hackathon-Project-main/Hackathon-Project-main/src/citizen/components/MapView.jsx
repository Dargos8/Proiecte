// citizen/components/MapView.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import styles from './MapView.module.css';

import { FaCalendarAlt, FaThumbsUp, FaTag, FaInfoCircle, FaMapMarkerAlt } from 'react-icons/fa';
import { MdOutlineFiberNew, MdPendingActions, MdCheckCircleOutline, MdHighlightOff } from 'react-icons/md';

// IMPORTĂM HOOK-UL DE GEOLOCAȚIE
import { useReverseGeocode } from '../../shared/hooks/useReverseGeocode';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41], popupAnchor: [1, -34] });
L.Marker.prototype.options.icon = DefaultIcon;

const GALATI_CENTER = [45.4353, 28.0079];

const formatStatus = (status) => {
  const map = { 'NOU': 'Nou', 'IN_PROCESARE': 'Preluat', 'REZOLVAT': 'Rezolvat', 'RESPINS': 'Respins' };
  return map[status] || status;
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'NOU': return <MdOutlineFiberNew className={styles.statusIcon} />;
    case 'IN_PROCESARE': return <MdPendingActions className={styles.statusIcon} />;
    case 'REZOLVAT': return <MdCheckCircleOutline className={styles.statusIcon} />;
    case 'RESPINS': return <MdHighlightOff className={styles.statusIcon} />;
    default: return <FaInfoCircle className={styles.statusIcon} />;
  }
};

const formatDateShort = (timestamp) => {
  if (!timestamp) return 'Dată necunoscută';
  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  return date.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Componentă care apelează geolocația doar la randare
const SmartAddress = ({ location, fallback }) => {
  const { address } = useReverseGeocode(location);
  return (
    <div className={styles.popupAddress}>
      <FaMapMarkerAlt className={styles.addressIcon} />
      <span>{address !== 'Se identifică adresa...' ? address : (fallback || 'Locație nespecificată')}</span>
    </div>
  );
};

const MapController = ({ activeIssue }) => {
  const map = useMap();
  useEffect(() => {
    if (activeIssue && activeIssue.location) {
      map.flyTo([activeIssue.location.lat, activeIssue.location.lng], 18, { animate: true, duration: 1.5 });
    }
  }, [activeIssue, map]);
  return null;
};

const IssueMarker = ({ issue, isActive }) => {
  const markerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false); // Știm când popup-ul e deschis

  useEffect(() => {
    if (isActive && markerRef.current) {
      const timer = setTimeout(() => markerRef.current.openPopup(), 1600);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const isPopular = (issue.upvotes || 0) >= 20;

  return (
    <Marker 
      ref={markerRef} 
      position={[issue.location.lat, issue.location.lng]}
      eventHandlers={{
        popupopen: () => setIsOpen(true),
        popupclose: () => setIsOpen(false)
      }}
    >
      <Popup>
        <div className={styles.popupContent}>
          <p className={styles.popupTitle}>{issue.title}</p>
          
          {/* Adresa generată doar dacă popup-ul s-a deschis pe ecran */}
          {isOpen && <SmartAddress location={issue.location} fallback={issue.neighborhood} />}
          
          <div className={styles.popupGrid}>
            <div className={styles.gridItem}><FaCalendarAlt className={styles.metaIcon} /><span>{formatDateShort(issue.createdAt)}</span></div>
            <div className={`${styles.gridItem} ${isPopular ? styles.popVotes : ''}`}><FaThumbsUp className={styles.metaIcon} /><span>{issue.upvotes || 0} susțineri</span></div>
            <div className={styles.gridItem}><FaTag className={styles.metaIcon} /><span>{issue.category}</span></div>
            <div className={`${styles.gridItem} ${styles[`popupStatus${issue.status}`] || ''}`}>{getStatusIcon(issue.status)}<span>{formatStatus(issue.status)}</span></div>
          </div>
          
          <Link to={`/ticket/${issue.id}`} className={styles.popupLink}>
            Vezi detalii complete →
          </Link>
        </div>
      </Popup>
    </Marker>
  );
};

const MapView = ({ issues, activeIssue }) => {
  return (
    <div className={styles.mapWrapper}>
      <MapContainer center={GALATI_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap' />
        <MapController activeIssue={activeIssue} />
        <MarkerClusterGroup chunkedLoading maxClusterRadius={60}>
          {issues.map(issue => {
            if (!issue.location || !issue.location.lat || !issue.location.lng) return null;
            return <IssueMarker key={issue.id} issue={issue} isActive={activeIssue?.id === issue.id} />;
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
};

export default MapView;
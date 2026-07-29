// citizen/components/LocationPicker.jsx
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { FaMapMarkerAlt, FaCrosshairs } from 'react-icons/fa';
import styles from './LocationPicker.module.css';

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const GALATI_CENTER = [45.4353, 28.0079];

const MapEventHandler = ({ onMapClick }) => {
  useMapEvents({ click(e) { onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng }); } });
  return null;
};

const MapUpdater = ({ location }) => {
  const map = useMap();
  useEffect(() => {
    if (location) map.flyTo([location.lat, location.lng], 16, { animate: true, duration: 1 });
  }, [location, map]);
  return null;
};

const LocationPicker = ({ location, setLocation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
  const wrapperRef = useRef(null);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (skipNextSearch.current) { skipNextSearch.current = false; return; }
    if (searchQuery.trim().length < 3) { setResults([]); setShowDropdown(false); return; }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Galați')}&limit=5`);
        const data = await res.json();
        setResults(data); setShowDropdown(true);
      } catch (e) { console.error(e); } finally { setIsSearching(false); }
    }, 600);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const road = addr.road || addr.pedestrian || '';
        const houseNumber = addr.house_number ? `Nr. ${addr.house_number}` : '';
        const neighbourhood = addr.neighbourhood || addr.suburb || addr.residential || '';
        
        let formattedName = road;
        if (road && houseNumber) formattedName = `${road}, ${houseNumber}`;
        else if (road && neighbourhood) formattedName = `${road}, zona ${neighbourhood}`;
        else if (!road && neighbourhood) formattedName = `Zona ${neighbourhood}`;

        if (formattedName) {
          skipNextSearch.current = true; 
          setSearchQuery(formattedName);
        }
      }
    } catch (e) { console.error(e); }
  };

  const handleSelectResult = (item) => {
    const newLoc = { lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
    setLocation(newLoc);
    skipNextSearch.current = true; 
    setSearchQuery(item.display_name.split(',').slice(0, 2).join(',').trim());
    setShowDropdown(false);
  };

  const handleMapClick = async (newLoc) => {
    setLocation(newLoc);
    setShowDropdown(false); 
    await reverseGeocode(newLoc.lat, newLoc.lng);
  };

  // NOU: Funcția de localizare GPS
  const handleGetLocation = () => {
  if (!navigator.geolocation) {
    alert("Geolocația nu este suportată de browser-ul tău.");
    return;
  }
  
  setIsLocating(true);
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const newLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
      setLocation(newLoc);
      await reverseGeocode(newLoc.lat, newLoc.lng);
      setIsLocating(false);
    },
    (error) => {
      console.error("Eroare detaliată Geolocation:", error);
      setIsLocating(false);
      
      // Afișăm mesaje specifice în funcție de codul erorii
      switch(error.code) {
        case error.PERMISSION_DENIED:
          alert("Permisiune respinsă! Te rugăm să permiți accesul la locație din browser (și din setările telefonului/PC-ului).");
          break;
        case error.POSITION_UNAVAILABLE:
          alert("Informațiile despre locație nu sunt disponibile. (Ai GPS-ul pornit?)");
          break;
        case error.TIMEOUT:
          alert("Cererea pentru locație a expirat. Încearcă din nou afară sau lângă o fereastră.");
          break;
        default:
          alert(`A apărut o eroare necunoscută: ${error.message}`);
          break;
      }
    },
    { 
      enableHighAccuracy: true, 
      timeout: 10000, // Așteaptă maxim 10 secunde, altfel dă eroare
      maximumAge: 0   // Forțează preluarea unei locații noi, nu una din cache
    }
  );
};

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.searchBox}>
        <input 
          type="text"
          className={styles.searchInput}
          placeholder="Caută o stradă sau apasă pe țintă..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
        />
        
        {/* Butonul de geolocație */}
        <button 
          type="button" 
          onClick={handleGetLocation} 
          className={styles.locateBtn}
          title="Folosește locația mea curentă"
          aria-label="Folosește locația mea curentă"
          disabled={isLocating}
        >
          <FaCrosshairs className={isLocating ? styles.spin : ''} />
        </button>

        {isSearching && <span className={styles.loadingIndicator}>...</span>}

        {showDropdown && results.length > 0 && (
          <ul className={styles.dropdown} role="listbox">
            {results.map((item) => (
              <li key={item.place_id} className={styles.dropdownItem} onClick={() => handleSelectResult(item)}>
                {item.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.mapContainer}>
        <MapContainer center={location ? [location.lat, location.lng] : GALATI_CENTER} zoom={15} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <MapEventHandler onMapClick={handleMapClick} />
          <MapUpdater location={location} />
          {location && <Marker position={[location.lat, location.lng]} />}
        </MapContainer>
      </div>
    </div>
  );
};

export default LocationPicker;
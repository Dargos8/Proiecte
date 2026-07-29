import { useEffect, useRef, useState } from "react";
import L from "leaflet";
// 1. Importăm fișierele necesare pentru MarkerCluster
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import "leaflet/dist/leaflet.css";
import styles from "../styles/MapView.module.css";
import { priorityColor } from "../../shared/utils/helpers";

const GALATI_CENTER = [45.4353, 28.0502];
const DEFAULT_ZOOM = 13;

function makeMarkerIcon(color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 8 12 24 12 24S24 20 24 12C24 5.37 18.63 0 12 0z"
        fill="${color}" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>
      <circle cx="12" cy="12" r="5" fill="white" opacity="0.85"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "custom-map-pin", 
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

export default function MapView({ tickets, selectedTicket, onMarkerClick }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  // 2. Ref pentru grupul de clustere
  const clusterGroupRef = useRef(null); 
  const markersRef = useRef({});
  
  const [isMapVisible, setIsMapVisible] = useState(false);

  const onMarkerClickRef = useRef(onMarkerClick);
  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  // Inițializare Hartă și Cluster Group
  useEffect(() => {
    if (mapInstance.current) return;

    // Inițializare hartă
    mapInstance.current = L.map(mapRef.current, {
      center: GALATI_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(mapInstance.current);

    // 3. Inițializăm grupul de clustere
    clusterGroupRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50, // Cât de aproape trebuie să fie pinii ca să se unească
      showCoverageOnHover: false, // Oprește poligoanele albastre când ții mouse-ul pe grup
    });
    
    // Adăugăm grupul de clustere pe hartă
    mapInstance.current.addLayer(clusterGroupRef.current);

    // Funcție care verifică lățimea div-ului hărții
    const checkVisibility = () => {
      if (mapRef.current && mapRef.current.clientWidth > 0) {
        mapInstance.current.invalidateSize(); 
        setIsMapVisible(true); 
      } else {
        setIsMapVisible(false); 
      }
    };

    const resizeObserver = new ResizeObserver(() => checkVisibility());
    
    if (mapRef.current) {
      resizeObserver.observe(mapRef.current);
      checkVisibility(); 
    }

    return () => {
      resizeObserver.disconnect();
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Sincronizare Markeri în Cluster Group
  useEffect(() => {
    const map = mapInstance.current;
    const clusterGroup = clusterGroupRef.current;
    
    if (!map || !clusterGroup || !isMapVisible) return;

    const existingIds = new Set(Object.keys(markersRef.current));
    const currentIds = new Set(tickets.map((t) => t.id));

    // Curățăm pinii vechi (îi ștergem și din marker array și din cluster)
    existingIds.forEach((id) => {
      if (!currentIds.has(id)) {
        clusterGroup.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });

    // Adăugăm / Actualizăm pinii noi
    let noinoiMarkersArray = [];

    tickets.forEach((ticket) => {
      const lat = ticket.location?.lat ?? ticket.location?._lat;
      const lng = ticket.location?.lng ?? ticket.location?._long;
      if (!lat || !lng) return;

      const color = priorityColor(ticket.priority);
      const icon = makeMarkerIcon(color);

      if (markersRef.current[ticket.id]) {
        // Dacă markerul există deja, îi updatăm doar culoarea
        markersRef.current[ticket.id].setIcon(icon);
      } else {
        // Creăm marker nou
        const marker = L.marker([lat, lng], { icon })
          .bindPopup(
            `<b style="font-family:monospace;font-size:12px">${ticket.title || "—"}</b>
             <br/><span style="color:#858585;font-size:10px">${ticket.category || ""} · ${ticket.upvotes || 0} upvotes</span>`
          );
        
        marker.on("click", () => onMarkerClickRef.current(ticket));
        
        // Salvăm în referința noastră locală
        markersRef.current[ticket.id] = marker;
        // Adăugăm în array ca să-i punem pe toți odată în cluster (e mult mai rapid)
        noinoiMarkersArray.push(marker);
      }
    });
    
    // Adăugăm toți noii markeri în cluster group dintr-o singură lovitură
    if (noinoiMarkersArray.length > 0) {
      clusterGroup.addLayers(noinoiMarkersArray);
    }
    
  }, [tickets, isMapVisible]); 

  // Animația de Zoom (FlyTo)
  useEffect(() => {
    const map = mapInstance.current;
    
    if (!map || !selectedTicket || !isMapVisible) return;

    const lat = selectedTicket.location?.lat ?? selectedTicket.location?._lat;
    const lng = selectedTicket.location?.lng ?? selectedTicket.location?._long;
    if (!lat || !lng) return;

    // 4. Zoom la nivelul 18 pentru a "sparge" obligatoriu clusterul (ca la colegul tău)
    map.flyTo([lat, lng], 18, { animate: true, duration: 1.5 });

    const marker = markersRef.current[selectedTicket.id];
    
    if (marker) {
      // 5. Așteptăm ca flyTo să se termine (aprox 1.5s) înainte să deschidem popup-ul.
      // Dacă încercăm să deschidem popup-ul cât timp el este ascuns într-un cluster, va da eroare!
      setTimeout(() => {
        // Verificăm dacă markerul mai e valabil
        if (markersRef.current[selectedTicket.id]) {
          marker.openPopup(); 
        }
      }, 1600);
    }

  }, [selectedTicket, isMapVisible]);

  return (
    <section className={styles.mapPanel}>
      <div className={styles.mapHeader}>
        <span className={styles.mapTitle}>HARTĂ — GALAȚI</span>
        <span className={styles.mapSubtitle}>{tickets.length} probleme active</span>
      </div>
      <div ref={mapRef} className={styles.map} aria-label="Hartă interactivă Galați" />
    </section>
  );
}
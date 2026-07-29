// shared/hooks/useReverseGeocode.js
import { useState, useEffect } from 'react';

export const useReverseGeocode = (location) => {
  const [address, setAddress] = useState('Se identifică adresa...');

  useEffect(() => {
    // Dacă tichetul încă se încarcă și nu avem coordonate, ne oprim aici și așteptăm.
    if (!location || !location.lat || !location.lng) {
      return; 
    }

    const fetchAddress = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`
        );
        const data = await response.json();

        if (data && data.address) {
          const addr = data.address;
          const road = addr.road || addr.pedestrian || '';
          const houseNumber = addr.house_number ? `Nr. ${addr.house_number}` : '';
          const neighbourhood = addr.neighbourhood || addr.suburb || addr.residential || '';
          const city = addr.city || addr.town || 'Galați';

          let formattedName = road;
          
          if (road && houseNumber) {
            formattedName = `${road}, ${houseNumber}, ${city}`;
          } else if (road && neighbourhood) {
            formattedName = `${road}, zona ${neighbourhood}, ${city}`;
          } else if (!road && neighbourhood) {
            formattedName = `Zona ${neighbourhood}, ${city}`;
          } else {
             formattedName = data.display_name.split(',').slice(0, 3).join(',').trim();
          }

          setAddress(formattedName || 'Adresă generică');
        } else {
          setAddress('Adresă negăsită exact');
        }
      } catch (error) {
        console.error('Eroare la reverse geocoding:', error);
        setAddress('Eroare la încărcarea adresei');
      }
    };

    fetchAddress();
  }, [location?.lat, location?.lng]); // Hook-ul se re-execută INSTANT când s-au primit lat/lng

  return { address };
};
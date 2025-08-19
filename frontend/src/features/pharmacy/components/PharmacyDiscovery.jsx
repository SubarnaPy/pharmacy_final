import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLoadScript, GoogleMap, Marker } from '@react-google-maps/api';
import { fetchNearbyPharmacies } from '../pharmacySlice';

const mapContainerStyle = { width: '100%', height: '400px' };

function PharmacyDiscovery() {
  const dispatch = useDispatch();
  const { list: pharmacies, status, error } = useSelector(state => state.pharmacy);
  const [center, setCenter] = useState({ lat: 0, lng: 0 });

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCenter(coords);
        dispatch(fetchNearbyPharmacies(coords));
      }, () => {
        console.warn('Geolocation permission denied');
      });
    }
  }, [dispatch]);

  if (!isLoaded) return <div>Loading map...</div>;
  if (status === 'loading') return <div>Loading pharmacies...</div>;
  if (status === 'failed') return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Nearby Pharmacies</h2>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={12}
      >
        {pharmacies.map(pharm => (
          <Marker
            key={pharm._id}
            position={{ lat: pharm.location.coordinates[1], lng: pharm.location.coordinates[0] }}
            label={pharm.name}
          />
        ))}
      </GoogleMap>
      <ul className="mt-4 space-y-2">
        {pharmacies.map(pharm => (
          <li key={pharm._id} className="border p-4 rounded">
            <h3 className="font-semibold">{pharm.name}</h3>
            <p>{pharm.address.street}, {pharm.address.city}</p>
            <p>Rating: {pharm.rating}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PharmacyDiscovery;

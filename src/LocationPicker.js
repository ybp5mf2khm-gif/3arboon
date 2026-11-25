import React, { useEffect, useRef, useState } from 'react';

export default function LocationPicker({ initialLat, initialLng, onLocationSelect }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  // إحداثيات افتراضية (مراكش) في حال لم يحدد صاحب المشروع موقعه بعد
  const defaultLat = initialLat ? Number(initialLat) : 31.6295;
  const defaultLng = initialLng ? Number(initialLng) : -7.9811;

  const [locating, setLocating] = useState(false);

  useEffect(() => {
    // تحميل ملفات Leaflet (CSS و JS) تلقائياً
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com';
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!window.L || mapInstance.current || !mapRef.current) return;
      const L = window.L;

      mapInstance.current = L.map(mapRef.current).setView([defaultLat, defaultLng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(mapInstance.current);

      markerRef.current = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(mapInstance.current);

      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLatLng();
        onLocationSelect(pos.lat, pos.lng);
      });

      mapInstance.current.on('click', (e) => {
        markerRef.current.setLatLng(e.latlng);
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      });
    };

    if (window.L) {
      initMap();
    } else if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com';
      script.onload = initMap;
      document.body.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (window.L) {
          clearInterval(interval);
          initMap();
        }
      }, 200);
    }
  }, []);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      return alert('متصفحك لا يدعم تحديد الموقع التلقائي');
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        onLocationSelect(lat, lng);
        if (mapInstance.current && markerRef.current) {
          mapInstance.current.setView([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
        }
      },
      () => {
        setLocating(false);
        alert('تعذر تحديد موقعك. يرجى تفعيل GPS في الهاتف والسماح للمتصفح بالوصول للموقع.');
      }
    );
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 13, color: '#1e3a8a' }}>📍 موقع المحل على الخريطة:</strong>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={locating}
          style={{
            background: '#16a34a',
            color: '#fff',
            border: 'none',
            padding: '6px 10px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          {locating ? 'جاري التحديد...' : 'تحديد موقعي الحالي 🎯'}
        </button>
      </div>

      <div
        ref={mapRef}
        style={{
          height: 240,
          width: '100%',
          borderRadius: 12,
          border: '1px solid #cbd5e1',
          zIndex: 1,
          background: '#e2e8f0'
        }}
      />

      <p style={{ fontSize: 11, color: '#64748b', margin: '6px 0 0' }}>
        انقر في أي مكان على الخريطة أو اسحب الدبوس الأزرق لتحديد موقع مشروعك بدقة ثم اضغط "حفظ جميع الإعدادات".
      </p>
    </div>
  );
}

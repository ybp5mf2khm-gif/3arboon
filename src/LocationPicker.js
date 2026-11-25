import React, { useEffect, useRef, useState } from 'react';

export default function LocationPicker({ initialLat, initialLng, onLocationSelect }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  const defaultLat = initialLat ? Number(initialLat) : 31.6295;
  const defaultLng = initialLng ? Number(initialLng) : -7.9811;

  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState(
    initialLat && initialLng ? { lat: Number(initialLat), lng: Number(initialLng) } : null
  );

  useEffect(() => {
    let isMounted = true;

    const loadCss = () => {
      return new Promise((resolve) => {
        if (document.getElementById('leaflet-css')) return resolve();
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://cloudflare.com';
        link.onload = () => resolve();
        link.onerror = () => resolve();
        document.head.appendChild(link);
      });
    };

    const loadJs = () => {
      return new Promise((resolve) => {
        if (window.L) return resolve();
        if (document.getElementById('leaflet-js')) {
          const timer = setInterval(() => {
            if (window.L) {
              clearInterval(timer);
              resolve();
            }
          }, 150);
          return;
        }
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://cloudflare.com';
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
    };

    const setupMap = async () => {
      await loadCss();
      await loadJs();

      if (!isMounted || !window.L || mapInstance.current || !mapRef.current) return;
      const L = window.L;

      const map = L.map(mapRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 14,
        dragging: true,
        touchZoom: true
      });

      // استخدام خرائط Carto Voyager السريعة التي تعمل بدون حظر على Vercel
      L.tileLayer('https://{s}://{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      // أيقونة دبوس واضحة ومضمونة التحميل
      const customIcon = L.icon({
        iconUrl: 'https://cloudflare.com',
        iconRetinaUrl: 'https://cloudflare.com',
        shadowUrl: 'https://cloudflare.com',
        iconSize:,
        iconAnchor: [12, 41]
      });

      const marker = L.marker([defaultLat, defaultLng], {
        draggable: true,
        icon: customIcon
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setCoords({ lat: pos.lat, lng: pos.lng });
        onLocationSelect(pos.lat, pos.lng);
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      });

      mapInstance.current = map;
      markerRef.current = marker;

      setTimeout(() => {
        if (mapInstance.current) mapInstance.current.invalidateSize();
      }, 300);
      setTimeout(() => {
        if (mapInstance.current) mapInstance.current.invalidateSize();
      }, 1000);
    };

    setupMap();

    return () => {
      isMounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
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
        setCoords({ lat, lng });
        onLocationSelect(lat, lng);
        if (mapInstance.current && markerRef.current) {
          mapInstance.current.setView([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
          mapInstance.current.invalidateSize();
        }
      },
      () => {
        setLocating(false);
        alert('تعذر تحديد موقعك. يرجى تفعيل GPS في الهاتف والسماح للمتصفح بالوصول للموقع.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return React.createElement(
    'div',
    { style: { marginTop: 8 } },
    React.createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
      React.createElement('strong', { style: { fontSize: 13, color: '#1e3a8a' } }, '📍 موقع المحل على الخريطة:'),
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: handleGetCurrentLocation,
          disabled: locating,
          style: {
            background: '#16a34a',
            color: '#fff',
            border: 'none',
            padding: '6px 10px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'inherit'
          }
        },
        locating ? 'جاري التحديد...' : 'تحديد موقعي الحالي 🎯'
      )
    ),
    React.createElement('div', {
      ref: mapRef,
      style: {
        height: 250,
        width: '100%',
        borderRadius: 12,
        border: '1px solid #cbd5e1',
        zIndex: 1,
        background: '#e2e8f0',
        overflow: 'hidden',
        direction: 'ltr'
      }
    }),
    coords
      ? React.createElement(
          'div',
          { style: { fontSize: 12, color: '#16a34a', fontWeight: 700, marginTop: 6 } },
          '✅ تم تحديد الإحداثيات: ' + coords.lat.toFixed(5) + ', ' + coords.lng.toFixed(5)
        )
      : React.createElement(
          'p',
          { style: { fontSize: 11, color: '#64748b', margin: '6px 0 0' } },
          'انقر في أي مكان على الخريطة أو اسحب الدبوس الأزرق لتحديد موقع مشروعك بدقة ثم اضغط "حفظ جميع الإعدادات".'
        )
  );
}

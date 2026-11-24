import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import BookingPage from './BookingPage.jsx';
import DashboardPage from './DashboardPage.jsx';

export default function App() {
  const [view, setView] = useState('booking');
  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const slug = new URLSearchParams(window.location.search).get('p') || 'sara-beauty';

  const loadData = async () => {
    const { data: prov } = await supabase.from('providers').select('*').eq('slug', slug).single();
    if (prov && prov.is_active) {
      setProvider(prov);
      const { data: srvs } = await supabase.from('services').select('*').eq('provider_id', prov.id);
      setServices(srvs || []);
      const { data: bks } = await supabase.from('bookings').select('*').eq('provider_id', prov.id).order('created_at', { ascending: false });
      setBookings(bks || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', marginTop: 50 }}>جاري التحميل...</div>;
  if (!provider) return <div style={{ textAlign: 'center', marginTop: 50 }}>الصفحة غير متوفرة</div>;

  return (
    <div style={{ padding: 12 }}>
      <div style={{ maxWidth: 460, margin: '0 auto 12px', display: 'flex', gap: 8 }}>
        <button onClick={() => setView('booking')} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: view === 'booking' ? '#2563eb' : '#cbd5e1', color: view === 'booking' ? '#fff' : '#000' }}>
          الحجز
        </button>
        <button onClick={() => { setView('dashboard'); loadData(); }} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: view === 'dashboard' ? '#0f172a' : '#cbd5e1', color: view === 'dashboard' ? '#fff' : '#000' }}>
          لوحة التحكم ({bookings.length})
        </button>
      </div>

      {view === 'booking'
        ? <BookingPage provider={provider} services={services} onSuccess={loadData} />
        : <DashboardPage provider={provider} bookings={bookings} onRefresh={loadData} />
      }
    </div>
  );
}

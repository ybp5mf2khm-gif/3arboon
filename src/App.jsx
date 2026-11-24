import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import BookingPage from './BookingPage.jsx';
import DashboardPage from './DashboardPage.jsx';
import RegisterPage from './RegisterPage.jsx';
import AdminPage from './AdminPage.js';

export default function App() {
  const [view, setView] = useState('booking');
  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');

  const params = new URLSearchParams(window.location.search);
  const isAdminRoute = params.get('admin') === 'true';
  const slug = params.get('p') || 'sara-beauty';

  const loadData = async () => {
    if (isAdminRoute) {
      setLoading(false);
      return;
    }
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

  // فتح لوحة الإدارة الرئيسية عند الدخول عبر ?admin=true
  if (isAdminRoute) {
    return <AdminPage />;
  }

  const handleUnlock = (e) => {
    e.preventDefault();
    if (pinInput === provider.pin_code) {
      setIsUnlocked(true);
      setPinInput('');
    } else {
      alert('الرمز السري غير صحيح!');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: 50 }}>جاري التحميل...</div>;

  if (view === 'register') {
    return (
      <div style={{ padding: 12 }}>
        <RegisterPage onCancel={() => setView('booking')} />
      </div>
    );
  }

  if (!provider) return <div style={{ textAlign: 'center', marginTop: 50 }}>الصفحة غير متوفرة</div>;

  return (
    <div style={{ padding: 12 }}>
      {view === 'booking' ? (
        <>
          <BookingPage provider={provider} services={services} onSuccess={loadData} />
          <div style={{ textAlign: 'center', marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => setView('dashboard')}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}
            >
              دخول صاحب المشروع (لوحة التحكم)
            </button>
            <button
              onClick={() => setView('register')}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 14, fontWeight: 'bold', cursor: 'pointer' }}
            >
              + هل لديك صالون أو مشروع؟ أنشئ صفحة حجزك مجاناً
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ maxWidth: 460, margin: '0 auto 12px' }}>
            <button
              onClick={() => setView('booking')}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#cbd5e1', fontWeight: 'bold' }}
            >
              → العودة لصفحة الحجز
            </button>
          </div>

          {!isUnlocked ? (
            <div style={{ maxWidth: 360, margin: '30px auto', background: '#fff', padding: 24, borderRadius: 14, textAlign: 'center' }}>
              <h3 style={{ marginTop: 0 }}>لوحة تحكم محمية</h3>
              <p style={{ fontSize: 13, color: '#64748b' }}>أدخل الرمز السري الخاص بـ {provider.business_name}</p>
              <form onSubmit={handleUnlock}>
                <input
                  type="password"
                  placeholder="****"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  style={{ width: '100%', padding: 12, fontSize: 18, textAlign: 'center', letterSpacing: 6, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 12, boxSizing: 'border-box' }}
                  required
                />
                <button type="submit" style={{ width: '100%', background: '#0f172a', color: '#fff', border: 'none', padding: 12, borderRadius: 8, fontWeight: 'bold' }}>
                  دخول
                </button>
              </form>
            </div>
          ) : (
            <DashboardPage provider={provider} bookings={bookings} services={services} onRefresh={loadData} />
          )}
        </>
      )}
    </div>
  );
}

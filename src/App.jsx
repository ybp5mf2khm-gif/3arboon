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
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const isAdminRoute = params.get('admin') === 'true';
  const slug = params.get('p') || 'sara-beauty';

  const loadProviderDetails = async (prov) => {
    setProvider(prov);
    const { data: srvs } = await supabase.from('services').select('*').eq('provider_id', prov.id);
    setServices(srvs || []);
    const { data: bks } = await supabase.from('bookings').select('*').eq('provider_id', prov.id).order('created_at', { ascending: false });
    setBookings(bks || []);
  };

  const loadData = async () => {
    if (isAdminRoute) {
      setLoading(false);
      return;
    }
    const { data: prov } = await supabase.from('providers').select('*').eq('slug', slug).single();
    if (prov && prov.is_active) {
      await loadProviderDetails(prov);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isAdminRoute) {
    return <AdminPage />;
  }

  const handleProviderLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    const cleanInput = loginIdentifier.trim().toLowerCase();

    try {
      const { data: allProvs, error } = await supabase
        .from('providers')
        .select('*');

      if (error) throw error;

      const matched = (allProvs || []).find((p) => {
        const pEmail = String(p.email || '').trim().toLowerCase();
        const pPhone = String(p.phone || '').replace(/\s+/g, '');
        return (pEmail && pEmail === cleanInput) || (pPhone && pPhone === cleanInput);
      });

      if (!matched) {
        alert('لم يتم العثور على حساب بهذا البريد الإلكتروني أو رقم الهاتف!');
      } else if (String(matched.pin_code) !== String(pinInput).trim()) {
        alert('الرمز السري غير صحيح!');
      } else if (!matched.is_active) {
        alert('حسابك بانتظار التفعيل من طرف إدارة المنصة.');
      } else {
        await loadProviderDetails(matched);
        setIsUnlocked(true);
        setPinInput('');
      }
    } catch (err) {
      alert('حدث خطأ أثناء تسجيل الدخول: ' + err.message);
    } finally {
      setLoginLoading(false);
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

  return (
    <div style={{ padding: 12 }}>
      {view === 'booking' ? (
        <>
          {provider ? (
            <BookingPage provider={provider} services={services} onSuccess={() => loadProviderDetails(provider)} />
          ) : (
            <div style={{ textAlign: 'center', background: '#fff', padding: 24, borderRadius: 14, maxWidth: 420, margin: '40px auto' }}>
              <h3>مرحباً بك في منصة عربون</h3>
              <p style={{ color: '#64748b', fontSize: 14 }}>هذه الصفحة غير متوفرة أو بانتظار التفعيل.</p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => {
                setIsUnlocked(false);
                setView('dashboard');
              }}
              style={{ background: 'none', border: 'none', color: '#0f172a', fontSize: 14, fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer' }}
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
          <div style={{ maxWidth: 460, margin: '0 auto 12px', display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => {
                setIsUnlocked(false);
                setView('booking');
              }}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#cbd5e1', fontWeight: 'bold', cursor: 'pointer' }}
            >
              → العودة لصفحة الحجز
            </button>
            {isUnlocked && (
              <button
                onClick={() => {
                  setIsUnlocked(false);
                  setLoginIdentifier('');
                  setPinInput('');
                }}
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#dc2626', fontWeight: 'bold', cursor: 'pointer' }}
              >
                تسجيل الخروج
              </button>
            )}
          </div>

          {!isUnlocked ? (
            <div style={{ maxWidth: 360, margin: '30px auto', background: '#fff', padding: 24, borderRadius: 14, textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>دخول أصحاب المشاريع</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>أدخل البريد الإلكتروني أو رقم الهاتف والرمز السري</p>
              <form onSubmit={handleProviderLogin}>
                <input
                  type="text"
                  placeholder="البريد الإلكتروني أو رقم الهاتف"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  style={{ width: '100%', padding: 12, fontSize: 14, textAlign: 'center', borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 12, boxSizing: 'border-box' }}
                  required
                />
                <input
                  type="password"
                  placeholder="الرمز السري (PIN)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  style={{ width: '100%', padding: 12, fontSize: 18, textAlign: 'center', letterSpacing: 6, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 14, boxSizing: 'border-box' }}
                  required
                />
                <button
                  type="submit"
                  disabled={loginLoading}
                  style={{ width: '100%', background: '#0f172a', color: '#fff', border: 'none', padding: 12, borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {loginLoading ? 'جاري التحقق...' : 'دخول للوحة التحكم'}
                </button>
              </form>
            </div>
          ) : (
            <DashboardPage
              provider={provider}
              bookings={bookings}
              services={services}
              onRefresh={() => loadProviderDetails(provider)}
            />
          )}
        </>
      )}
    </div>
  );
}

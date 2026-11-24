import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import BookingPage from './BookingPage.jsx';
import DashboardPage from './DashboardPage.jsx';
import RegisterPage from './RegisterPage.jsx';
import ClientPage from './ClientPage.jsx';
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
  const slug = params.get('p');

  // تحميل خط Cairo العربي لجميع صفحات التطبيق
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://googleapis.com';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const loadProviderDetails = async (prov) => {
    setProvider(prov);
    const { data: srvs } = await supabase.from('services').select('*').eq('provider_id', prov.id);
    setServices(srvs || []);
    const { data: bks } = await supabase.from('bookings').select('*').eq('provider_id', prov.id).order('created_at', { ascending: false });
    setBookings(bks || []);
  };

  const loadData = async () => {
    if (isAdminRoute || !slug) {
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
  const appFont = { fontFamily: "'Cairo', sans-serif", direction: 'rtl' };

  if (loading) {
    return (
      <div style={{ ...appFont, textAlign: 'center', marginTop: 80, color: '#2563eb', fontWeight: 700, fontSize: 16 }}>
        جاري تحميل منصة عربون...
      </div>
    );
  }

  if (view === 'register') {
    return (
      <div style={{ ...appFont, padding: 12 }}>
        <RegisterPage onCancel={() => setView('booking')} />
      </div>
    );
  }

  if (view === 'client') {
    return (
      <div style={{ ...appFont, padding: 12 }}>
        <ClientPage onBack={() => setView('booking')} />
      </div>
    );
  }

  // الواجهة الرئيسية للمنصة عند الدخول بدون رابط صالون (?p=...)
  if (!slug && view === 'booking') {
    return (
      <div style={{ ...appFont, padding: 12, maxWidth: 480, margin: '12px auto' }}>
        <div style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.07)' }}>
          {/* الترويسة الرئيسية */}
          <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#fff', padding: '32px 22px', textAlign: 'center' }}>
            <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.18)', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
              منصة الحجز وتأكيد المواعيد بالمغرب 🇲🇦
            </span>
            <h1 style={{ margin: '0 0 10px', fontSize: 30, fontWeight: 800 }}>عربون • 3arboon</h1>
            <p style={{ color: '#dbeafe', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              وداعاً للمواعيد الوهمية! أنشئ صفحة حجز احترافية لصالونك أو مشروعك في دقيقة واحدة، واستقبل حجوزات زبائنك مع وصل العربون.
            </p>
          </div>

          <div style={{ padding: '24px 20px' }}>
            {/* أزرار الإجراءات الرئيسية */}
            <button
              onClick={() => setView('register')}
              style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: 15, borderRadius: 14, fontWeight: 800, fontSize: 16, cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}
            >
              + أنشئ صفحة حجز لمشروعك مجاناً
            </button>

            <button
              onClick={() => {
                setIsUnlocked(false);
                setView('dashboard');
              }}
              style={{ width: '100%', background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', padding: 14, borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 10, fontFamily: 'inherit' }}
            >
              🔐 دخول أصحاب المشاريع (لوحة التحكم)
            </button>

            <button
              onClick={() => setView('client')}
              style={{ width: '100%', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: 13, borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              👤 فضاء الزبائن (تتبع حجوزاتي)
            </button>

            {/* بطاقة خطوات العمل */}
            <div style={{ marginTop: 26, background: '#f8fafc', padding: 16, borderRadius: 16, border: '1px solid #e2e8f0', textAlign: 'right' }}>
              <h4 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: 15, fontWeight: 800 }}>كيف تعمل منصة عربون؟</h4>
              <div style={{ fontSize: 13, color: '#475569', display: 'flex', flexDirection: 'column', gap: 10, lineHeight: 1.6 }}>
                <div style={{ background: '#fff', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <strong>1. سجّل مشروعك:</strong> أضف خدماتك، أوقات عملك، وحساباتك البنكية.
                </div>
                <div style={{ background: '#fff', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <strong>2. شارك رابطك:</strong> ضع رابطك الخاص في إنستغرام أو واتساب.
                </div>
                <div style={{ background: '#fff', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <strong>3. استقبل العربون:</strong> الزبون يحجز ويرفع وصل التحويل لتأكيد موعده.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ ...appFont, padding: 12 }}>
      {view === 'booking' ? (
        <>
          {provider ? (
            <BookingPage provider={provider} services={services} onSuccess={() => loadProviderDetails(provider)} />
          ) : (
            <div style={{ textAlign: 'center', background: '#fff', padding: 28, borderRadius: 20, maxWidth: 420, margin: '40px auto', boxShadow: '0 10px 25px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
              <h3 style={{ margin: '0 0 8px', fontWeight: 800, color: '#0f172a' }}>هذه الصفحة غير متوفرة</h3>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>قد يكون الرابط غير صحيح أو أن الحساب بانتظار التفعيل.</p>
              <button
                onClick={() => { window.location.href = '/'; }}
                style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                الذهاب للصفحة الرئيسية
              </button>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => {
                setIsUnlocked(false);
                setView('dashboard');
              }}
              style={{ background: 'none', border: 'none', color: '#334155', fontSize: 13, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              دخول صاحب المشروع (لوحة التحكم)
            </button>
            <button
              onClick={() => setView('register')}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              + هل لديك صالون أو مشروع؟ أنشئ صفحة حجزك مجاناً
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ maxWidth: 460, margin: '0 auto 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => {
                setIsUnlocked(false);
                setView('booking');
              }}
              style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {slug ? '→ العودة لصفحة الحجز' : '→ العودة للرئيسية'}
            </button>
            {isUnlocked && (
              <button
                onClick={() => {
                  setIsUnlocked(false);
                  setLoginIdentifier('');
                  setPinInput('');
                }}
                style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                تسجيل الخروج
              </button>
            )}
          </div>

              {!isUnlocked ? (
            <div style={{ maxWidth: 400, margin: '20px auto', background: '#fff', borderRadius: 22, overflow: 'hidden', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.06)' }}>
              <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#fff', padding: '24px 20px' }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🔐</div>
                <h3 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 20 }}>دخول أصحاب المشاريع</h3>
                <p style={{ fontSize: 13, color: '#dbeafe', margin: 0 }}>أدخل البريد الإلكتروني أو الهاتف والرمز السري</p>
              </div>
              <form onSubmit={handleProviderLogin} style={{ padding: 22 }}>
                <input
                  type="text"
                  placeholder="البريد الإلكتروني أو رقم الهاتف"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  style={{ width: '100%', padding: 13, fontSize: 14, textAlign: 'center', borderRadius: 12, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', marginBottom: 12, boxSizing: 'border-box', fontFamily: 'inherit' }}
                  required
                />
                <input
                  type="password"
                  placeholder="الرمز السري (PIN)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  style={{ width: '100%', padding: 13, fontSize: 18, textAlign: 'center', letterSpacing: 6, borderRadius: 12, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', marginBottom: 16, boxSizing: 'border-box', fontFamily: 'inherit' }}
                  required
                />
                <button
                  type="submit"
                  disabled={loginLoading}
                  style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: 14, borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}
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

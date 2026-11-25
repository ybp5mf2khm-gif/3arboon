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
  const [reviews, setReviews] = useState([]);
  const [allProviders, setAllProviders] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const isAdminRoute = params.get('admin') === 'true';
  const slug = params.get('p');

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
    const { data: revs } = await supabase.from('reviews').select('*').eq('provider_id', prov.id).order('created_at', { ascending: false });
    setReviews(revs || []);
  };

  const loadDirectory = async () => {
    const { data: provs } = await supabase.from('providers').select('*').eq('is_active', true);
    setAllProviders(provs || []);
    const { data: srvs } = await supabase.from('services').select('*');
    setAllServices(srvs || []);
    const { data: revs } = await supabase.from('reviews').select('*');
    setAllReviews(revs || []);
  };

  const loadData = async () => {
    if (isAdminRoute) {
      setLoading(false);
      return;
    }
    if (!slug) {
      await loadDirectory();
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
      const { data: allProvs, error } = await supabase.from('providers').select('*');
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

  const getProviderRating = (provId) => {
    const provRevs = allReviews.filter((r) => r.provider_id === provId);
    if (provRevs.length === 0) return { avg: 'جديد', count: 0 };
    const sum = provRevs.reduce((acc, item) => acc + Number(item.rating || 5), 0);
    return { avg: (sum / provRevs.length).toFixed(1), count: provRevs.length };
  };

  const getMapsLink = (p) => {
 if (p.latitude && p.longitude) return ['https:', '', '://google.com', 'maps', 'search', '?api=1&query='].join('/') + p.latitude + ',' + p.longitude;

    if (p.latitude && p.longitude) return 'https://google.com' + p.latitude + ',' + p.longitude;
    return null;
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

  if (!slug && view === 'booking') {
    return (
      <div style={{ ...appFont, padding: 12, maxWidth: 480, margin: '12px auto' }}>
        <div style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.07)' }}>
          <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#fff', padding: '30px 20px', textAlign: 'center' }}>
            <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.18)', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
              منصة الحجز وتأكيد المواعيد بالمغرب 🇲🇦
            </span>
            <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800 }}>عربون • 3arboon</h1>
            <p style={{ color: '#dbeafe', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              احجز موعدك بسهولة مع الصالونات والمشاريع المعتمدة، أو أنشئ صفحة حجز احترافية لمشروعك في دقيقة واحدة.
            </p>
          </div>

          <div style={{ padding: '20px 18px' }}>
            <button
              onClick={() => setView('register')}
              style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: 14, borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer', marginBottom: 10, fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}
            >
              + أنشئ صفحة حجز لمشروعك مجاناً
            </button>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button
                onClick={() => {
                  setIsUnlocked(false);
                  setView('dashboard');
                }}
                style={{ flex: 1, background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', padding: 12, borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                🔐 لوحة التحكم
              </button>

              <button
                onClick={() => setView('client')}
                style={{ flex: 1, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: 12, borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                👤 تتبع حجوزاتي
              </button>
            </div>

            {allProviders.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  🏪 المشاريع والصالونات المتاحة ({allProviders.length}):
                </h3>

                {allProviders.map((p) => {
                  const pServices = allServices.filter((s) => s.provider_id === p.id);
                  const ratingObj = getProviderRating(p.id);
                  const mapsUrl = getMapsLink(p);
                  const firstLetter = String(p.business_name || 'ع').trim().charAt(0);

                  return (
                    <div key={p.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 18, padding: 15, marginBottom: 14 }}>
                      {/* 1. لوجو الشركة + الاسم + زر الحجز */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {p.logo_url ? (
                            <img
                              src={p.logo_url}
                              alt={p.business_name}
                              style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb', background: '#fff' }}
                            />
                          ) : (
                            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>
                              {firstLetter}
                            </div>
                          )}
                          <div>
                            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{p.business_name}</h4>
                            {/* 2. رابط مباشر لخرائط جوجل تحت الاسم/اللوجو */}
                            {mapsUrl ? (
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 12, fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '3px 9px', borderRadius: 8, textDecoration: 'none', border: '1px solid #fecaca' }}
                              >
                                📍 الموقع على خرائط جوجل ↗
                              </a>
                            ) : (
                              <span style={{ display: 'inline-block', marginTop: 3, fontSize: 11, color: '#64748b' }}>
                                📍 المغرب
                              </span>
                            )}
                          </div>
                        </div>

                        <a
                          href={'/?p=' + p.slug}
                          style={{ background: '#16a34a', color: '#fff', textDecoration: 'none', padding: '9px 14px', borderRadius: 11, fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                          احجز الآن ←
                        </a>
                      </div>

                      {/* 3. معلومات عن المشروع */}
                      {p.bio && (
                        <p style={{ margin: '10px 0 0', fontSize: 13, color: '#475569', background: '#fff', padding: '8px 11px', borderRadius: 10, border: '1px solid #e2e8f0', lineHeight: 1.6 }}>
                          ℹ️ {p.bio}
                        </p>
                      )}

                      {/* 4. التقييم بالنجوم */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px dashed #cbd5e1', fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, color: '#b45309' }}>
                          <span>⭐ {ratingObj.avg}</span>
                          <span style={{ color: '#64748b', fontWeight: 600 }}>
                            ({ratingObj.count > 0 ? ratingObj.count + ' تقييم' : 'لا توجد تقييمات بعد'})
                          </span>
                        </div>
                        <a href={'/?p=' + p.slug} style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
                          عرض الخدمات والتقييمات ↗
                        </a>
                      </div>

                      {/* قائمة مصغرة للخدمات */}
                      {pServices.length > 0 && (
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {pServices.slice(0, 2).map((s) => (
                            <div key={s.id} style={{ background: '#fff', padding: '7px 10px', borderRadius: 9, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>✨ {s.title}</span>
                              <span style={{ color: '#16a34a', fontWeight: 700 }}>{s.total_price} درهم (عربون: {s.deposit_amount})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 16, border: '1px solid #e2e8f0', textAlign: 'right' }}>
              <h4 style={{ margin: '0 0 10px', color: '#0f172a', fontSize: 15, fontWeight: 800 }}>كيف تعمل منصة عربون؟</h4>
              <div style={{ fontSize: 13, color: '#475569', display: 'flex', flexDirection: 'column', gap: 8, lineHeight: 1.6 }}>
                <div style={{ background: '#fff', padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <strong>1. سجّل مشروعك:</strong> أضف اللوجو، رابط الموقع، وخدماتك.
                </div>
                <div style={{ background: '#fff', padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <strong>2. شارك رابطك:</strong> ضع رابطك في إنستغرام أو واتساب.
                </div>
                <div style={{ background: '#fff', padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
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
            <BookingPage
              provider={provider}
              services={services}
              reviews={reviews}
              onSuccess={() => loadProviderDetails(provider)}
            />
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

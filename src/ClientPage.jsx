import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function ClientPage({ onBack }) {
  const [mode, setMode] = useState('login');
  const [activeTab, setActiveTab] = useState('offers');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [client, setClient] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [offerQuery, setOfferQuery] = useState('');
  const [aiOfferReply, setAiOfferReply] = useState('');
  const [searchingOffers, setSearchingOffers] = useState(false);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://googleapis.com';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const loadClientData = async (clientPhone) => {
    const cleanPhone = String(clientPhone || '').replace(/\s+/g, '');

    const { data: bks } = await supabase
      .from('bookings')
      .select('*, providers(business_name, slug, phone, logo_url), services(title, total_price, deposit_amount)')
      .eq('client_phone', cleanPhone)
      .order('created_at', { ascending: false });
    setMyBookings(bks || []);

    const { data: activeProvs } = await supabase
      .from('providers')
      .select('id, business_name, slug, bio, logo_url, google_maps_url, latitude, longitude, services(id, title, total_price, deposit_amount)')
      .eq('is_active', true);
    setOffers(activeProvs || []);
  };
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const cleanPhone = phone.trim().replace(/\s+/g, '');

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          full_name: fullName.trim(),
          phone: cleanPhone,
          pin_code: pinCode.trim()
        }])
        .select()
        .single();

      if (error) {
        throw new Error('رقم الهاتف مسجل مسبقاً! جرب تسجيل الدخول.');
      }

      setClient(data);
      await loadClientData(cleanPhone);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const cleanPhone = phone.trim().replace(/\s+/g, '');

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('phone', cleanPhone)
        .single();

      if (error || !data) {
        throw new Error('رقم الهاتف غير مسجل. أنشئ حساباً جديداً أولاً.');
      }

      if (String(data.pin_code) !== String(pinCode).trim()) {
        throw new Error('الرمز السري غير صحيح!');
      }

      setClient(data);
      await loadClientData(cleanPhone);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSmartOfferSearch = async (e) => {
    e.preventDefault();
    const q = offerQuery.trim();
    if (!q) {
      setAiOfferReply('');
      return;
    }
    setSearchingOffers(true);
    try {
      const offersText = offers.map((p) => {
        const srvs = (p.services || []).map((s) => s.title + ' (' + s.total_price + ' درهم، عربون ' + s.deposit_amount + ' درهم)').join('، ');
        return '- ' + p.business_name + ': ' + (srvs || 'خدمات متنوعة');
      }).join('\n');

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'match_service',
          businessName: 'عروض منصة عربون',
          clientNeed: q,
          servicesList: offersText || 'لا توجد عروض حالياً'
        }
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      if (data && data.result) {
        setAiOfferReply(data.result);
      }
    } catch (err) {
      setAiOfferReply('تصفح العروض المتاحة بالأسفل واختر الأنسب لك.');
    } finally {
      setSearchingOffers(false);
    }
  };

  const getWhatsAppProviderUrl = (b) => {
    const prov = b.providers;
    if (!prov || !prov.phone) return null;
    let ph = String(prov.phone).replace(/\D/g, '');
    if (ph.startsWith('0')) ph = '212' + ph.slice(1);
    else if (!ph.startsWith('212')) ph = '212' + ph;

    const srvTitle = b.services ? b.services.title : '';
    const msg = 'مرحبا ' + prov.business_name + '، أنا ' + (client ? client.full_name : '') + ' بخصوص حجزي (' + srvTitle + ') يوم ' + b.booking_date + ' الساعة ' + b.booking_time;
    return 'https://wa.me' + ph + '?text=' + encodeURIComponent(msg);
  };

  const getMapsLink = (p) => {
    const raw = String(p.google_maps_url || '').trim();
    const coords = raw.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (coords) return 'https://google.com' + coords.at(1) + ',' + coords.at(2);
    if (p.latitude && p.longitude) return 'https://google.com' + p.latitude + ',' + p.longitude;
    return null;
  };
  const pageFont = { fontFamily: "'Cairo', sans-serif", direction: 'rtl' };

  const inputStyle = {
    width: '100%',
    padding: '11px 12px',
    margin: '6px 0 14px',
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#0f172a',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    fontSize: 14
  };

  if (client) {
    const confirmedCount = myBookings.filter((b) => b.status === 'confirmed').length;

    return (
      <div style={{ ...pageFont, maxWidth: 460, margin: '12px auto', background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.06)' }}>
        <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#fff', padding: '22px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ background: 'rgba(255,255,255,0.18)', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                فضاء الزبائن • عربون
              </span>
              <h3 style={{ margin: '6px 0 2px', fontSize: 19, fontWeight: 800 }}>مرحباً، {client.full_name} 👋</h3>
              <small style={{ color: '#dbeafe', fontSize: 12 }}>رقم الهاتف: {client.phone}</small>
            </div>
            <button
              onClick={() => { setClient(null); setPinCode(''); }}
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', padding: '7px 14px', borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              خروج
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.14)', borderRadius: 12, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{myBookings.length}</div>
              <div style={{ fontSize: 11, color: '#dbeafe' }}>إجمالي الحجوزات</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.14)', borderRadius: 12, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{confirmedCount}</div>
              <div style={{ fontSize: 11, color: '#dbeafe' }}>مواعيد مؤكدة ✅</div>
            </div>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, background: '#f1f5f9', padding: 5, borderRadius: 14 }}>
            <button
              onClick={() => setActiveTab('offers')}
              style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 13, background: activeTab === 'offers' ? '#2563eb' : 'transparent', color: activeTab === 'offers' ? '#fff' : '#475569', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              🏪 العروض المتاحة ({offers.length})
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 13, background: activeTab === 'bookings' ? '#2563eb' : 'transparent', color: activeTab === 'bookings' ? '#fff' : '#475569', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              📅 حجوزاتي ({myBookings.length})
            </button>
          </div>
          {activeTab === 'offers' ? (
            <div>
              {offers.length > 0 && (
                <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 14, padding: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#5b21b6', marginBottom: 6 }}>
                    ✨ مستشار العروض الذكي (اكتب الخدمة التي تبحث عنها):
                  </div>
                  <form onSubmit={handleSmartOfferSearch} style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      placeholder="مثال: تنظيف بشرة، تسويق، مكياج..."
                      value={offerQuery}
                      onChange={(e) => setOfferQuery(e.target.value)}
                      style={{ ...inputStyle, margin: 0, flex: 2, padding: '8px 10px', fontSize: 12 }}
                    />
                    <button
                      type="submit"
                      disabled={searchingOffers}
                      style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, padding: '0 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                    >
                      {searchingOffers ? 'جاري...' : 'رشّح لي ✨'}
                    </button>
                  </form>
                  {aiOfferReply && (
                    <div style={{ marginTop: 8, background: '#fff', border: '1px solid #e9d5ff', borderRadius: 8, padding: 9, fontSize: 12, color: '#1e293b', lineHeight: 1.6 }}>
                      {aiOfferReply}
                    </div>
                  )}
                </div>
              )}

              {offers.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: 14, padding: 28, background: '#f8fafc', borderRadius: 14 }}>
                  لا توجد مشاريع أو عروض مفعّلة حالياً.
                </div>
              ) : (
                offers.map((prov) => {
                  const mapsUrl = getMapsLink(prov);
                  const firstLetter = String(prov.business_name || 'ع').trim().charAt(0);

                  return (
                    <div key={prov.id} style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 15, marginBottom: 14, background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {prov.logo_url ? (
                            <img
                              src={prov.logo_url}
                              alt={prov.business_name}
                              style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb', background: '#fff' }}
                            />
                          ) : (
                            <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                              {firstLetter}
                            </div>
                          )}
                          <div>
                            <strong style={{ display: 'block', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{prov.business_name}</strong>
                            {mapsUrl && (
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: 'inline-block', marginTop: 3, fontSize: 11, fontWeight: 700, color: '#1d4ed8', textDecoration: 'none' }}
                              >
                                📍 الموقع على الخريطة ↗
                              </a>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => { window.location.href = '/?p=' + prov.slug; }}
                          style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                        >
                          احجز الآن ←
                        </button>
                      </div>

                      {prov.services && prov.services.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                          {prov.services.map((srv) => (
                            <div key={srv.id} style={{ background: '#fff', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                              <span style={{ fontWeight: 700, color: '#1e293b' }}>✨ {srv.title}</span>
                              <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 12 }}>
                                {srv.total_price} درهم (عربون: {srv.deposit_amount} درهم)
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <small style={{ color: '#64748b' }}>لم تُضف خدمات بعد.</small>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div>
              {myBookings.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: 14, padding: 28, background: '#f8fafc', borderRadius: 14 }}>
                  لا توجد لديك حجوزات مسجلة بهذا الرقم بعد.
                </div>
              ) : (
                myBookings.map((b) => {
                  const waUrl = getWhatsAppProviderUrl(b);
                  const provSlug = b.providers ? b.providers.slug : null;

                  return (
                    <div key={b.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, marginBottom: 12, background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                          {b.providers ? b.providers.business_name : 'مشروع'}
                        </strong>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          background: b.status === 'confirmed' ? '#dcfce7' : b.status === 'rejected' ? '#fee2e2' : '#fef9c3',
                          color: b.status === 'confirmed' ? '#166534' : b.status === 'rejected' ? '#991b1b' : '#854d0e'
                        }}>
                          {b.status === 'confirmed' ? 'مؤكد ✅' : b.status === 'rejected' ? 'مرفوض ❌' : 'قيد المراجعة ⏳'}
                        </span>
                      </div>

                      <div style={{ fontSize: 13, color: '#475569', marginTop: 8 }}>
                        <strong>الخدمة:</strong> {b.services ? b.services.title : '-'} | <strong>العربون:</strong> {b.services ? b.services.deposit_amount : '-'} درهم
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 13 }}>
                        <span style={{ color: '#2563eb', fontWeight: 700 }}>
                          📅 {b.booking_date} • ⏰ {b.booking_time}
                        </span>
                        <span style={{ fontSize: 11, color: '#64748b', background: '#fff', padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                          مرجع #{String(b.id).slice(0, 6)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        {waUrl && (
                          <a
                            href={waUrl}
                            style={{ flex: 1, textAlign: 'center', textDecoration: 'none', background: '#25D366', color: '#fff', padding: '8px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12 }}
                          >
                            مراسلة المحل 💬
                          </a>
                        )}
                        {provSlug && (
                          <button
                            type="button"
                            onClick={() => { window.location.href = '/?p=' + provSlug; }}
                            style={{ flex: 1, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '8px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            إعادة الحجز 🔄
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <button
            onClick={onBack}
            style={{ width: '100%', marginTop: 14, background: '#f1f5f9', color: '#334155', border: 'none', padding: 13, borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            → العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ ...pageFont, maxWidth: 440, margin: '12px auto', background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.06)' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#fff', padding: '26px 20px', textAlign: 'center' }}>
        <span style={{ background: 'rgba(255,255,255,0.18)', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
          عربون • 3arboon
        </span>
        <h2 style={{ margin: '10px 0 4px', fontSize: 22, fontWeight: 800 }}>فضاء الزبائن 👤</h2>
        <p style={{ margin: 0, color: '#dbeafe', fontSize: 13 }}>سجّل دخولك لتصفح العروض وتتبع حجوزاتك</p>
      </div>

      <div style={{ padding: 22 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: '#f1f5f9', padding: 5, borderRadius: 14 }}>
          <button
            type="button"
            onClick={() => setMode('login')}
            style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 14, background: mode === 'login' ? '#2563eb' : 'transparent', color: mode === 'login' ? '#fff' : '#475569', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 14, background: mode === 'register' ? '#2563eb' : 'transparent', color: mode === 'register' ? '#fff' : '#475569', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            حساب جديد
          </button>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
          {mode === 'register' && (
            <div>
              <label style={{ fontWeight: 700, fontSize: 13 }}>الاسم الكامل *</label>
              <input type="text" placeholder="أدخل اسمك الكامل" style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}

          <label style={{ fontWeight: 700, fontSize: 13 }}>رقم الهاتف (واتساب) *</label>
          <input type="tel" placeholder="06XXXXXXXX" style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} required />

          <label style={{ fontWeight: 700, fontSize: 13 }}>الرمز السري (4 أرقام) *</label>
          <input type="password" maxLength="6" placeholder="****" style={{ ...inputStyle, textAlign: 'center', letterSpacing: 6, fontSize: 18 }} value={pinCode} onChange={(e) => setPinCode(e.target.value)} required />
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none', padding: 14, borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer', marginTop: 4, fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(22,163,74,0.25)' }}
          >
            {loading ? 'جاري التحقق...' : mode === 'login' ? 'دخول لحسابي ✓' : 'إنشاء حساب زبون ✓'}
          </button>

          <button
            type="button"
            onClick={onBack}
            style={{ width: '100%', background: '#f1f5f9', border: 'none', color: '#475569', padding: 12, borderRadius: 12, marginTop: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit' }}
          >
            → العودة للرئيسية
          </button>
        </form>
      </div>
    </div>
  );
}

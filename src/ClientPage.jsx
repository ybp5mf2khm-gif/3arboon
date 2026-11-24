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

  // تحميل خط Cairo العربي العصري
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://googleapis.com';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const loadClientData = async (clientPhone) => {
    const cleanPhone = String(clientPhone || '').replace(/\s+/g, '');

    // 1. جلب حجوزات الزبون
    const { data: bks } = await supabase
      .from('bookings')
      .select('*, providers(business_name, slug), services(title, deposit_amount)')
      .eq('client_phone', cleanPhone)
      .order('created_at', { ascending: false });
    setMyBookings(bks || []);

    // 2. جلب جميع المشاريع المفعّلة مع عروضها وخدماتها
    const { data: activeProvs } = await supabase
      .from('providers')
      .select('id, business_name, slug, services(id, title, total_price, deposit_amount)')
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
    return (
      <div style={{ ...pageFont, maxWidth: 460, margin: '12px auto', background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.06)' }}>
        {/* ترويسة حساب الزبون */}
        <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#fff', padding: '22px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ background: 'rgba(255,255,255,0.18)', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
              فضاء الزبائن
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

        <div style={{ padding: 20 }}>
          {/* أزرار التبديل بين العروض وسجل الحجوزات */}
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
              {offers.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: 14, padding: 28, background: '#f8fafc', borderRadius: 14 }}>
                  لا توجد مشاريع أو عروض مفعّلة حالياً.
                </div>
              ) : (
                offers.map((prov) => (
                  <div key={prov.id} style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 15, marginBottom: 14, background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <strong style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{prov.business_name}</strong>
                      <button
                        onClick={() => { window.location.href = '/?p=' + prov.slug; }}
                        style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
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
                ))
              )}
            </div>
          ) : (
            <div>
              {myBookings.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: 14, padding: 28, background: '#f8fafc', borderRadius: 14 }}>
                  لا توجد لديك حجوزات مسجلة بهذا الرقم بعد.
                </div>
              ) : (
                myBookings.map((b) => (
                  <div key={b.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, marginBottom: 12, background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{b.providers ? b.providers.business_name : 'مشروع'}</strong>
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
                    <div style={{ fontSize: 13, color: '#2563eb', fontWeight: 700, marginTop: 4 }}>
                      📅 {b.booking_date} • ⏰ {b.booking_time}
                    </div>
                  </div>
                ))
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
      {/* الترويسة الاحترافية */}
      <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#fff', padding: '26px 20px', textAlign: 'center' }}>
        <span style={{ background: 'rgba(255,255,255,0.18)', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
          عربون • 3arboon
        </span>
        <h2 style={{ margin: '10px 0 4px', fontSize: 22, fontWeight: 800 }}>فضاء الزبائن 👤</h2>
        <p style={{ margin: 0, color: '#dbeafe', fontSize: 13 }}>سجّل دخولك لتصفح العروض وتتبع حجوزاتك</p>
      </div>

      <div style={{ padding: 22 }}>
        {/* أزرار التبديل بين الدخول والتسجيل */}
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

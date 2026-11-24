import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function ClientPage({ onBack }) {
  const [mode, setMode] = useState('login');
  const [activeTab, setActiveTab] = useState('offers'); // 'offers' أو 'bookings'
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [client, setClient] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);

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
    const input = {
    width: '100%',
    padding: 12,
    margin: '6px 0 14px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    boxSizing: 'border-box',
    fontSize: 15
  };

  if (client) {
    return (
      <div style={{ maxWidth: 460, margin: '20px auto', background: '#fff', padding: 20, borderRadius: 14, fontFamily: 'sans-serif' }} dir="rtl">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0 }}>مرحباً، {client.full_name} 👋</h3>
            <small style={{ color: '#64748b' }}>رقم الهاتف: {client.phone}</small>
          </div>
          <button
            onClick={() => { setClient(null); setPinCode(''); }}
            style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}
          >
            خروج
          </button>
        </div>

        {/* أزرار التبديل بين العروض وسجل الحجوزات */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setActiveTab('offers')}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', fontWeight: 'bold', fontSize: 13, background: activeTab === 'offers' ? '#2563eb' : '#f1f5f9', color: activeTab === 'offers' ? '#fff' : '#334155', cursor: 'pointer' }}
          >
            🏪 العروض المتاحة ({offers.length})
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', fontWeight: 'bold', fontSize: 13, background: activeTab === 'bookings' ? '#2563eb' : '#f1f5f9', color: activeTab === 'bookings' ? '#fff' : '#334155', cursor: 'pointer' }}
          >
            📅 حجوزاتي ({myBookings.length})
          </button>
        </div>

        {activeTab === 'offers' ? (
          <div>
            {offers.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748b', fontSize: 14, padding: 20 }}>
                لا توجد مشاريع أو عروض مفعّلة حالياً.
              </p>
            ) : (
              offers.map((prov) => (
                <div key={prov.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 12, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong style={{ fontSize: 16, color: '#0f172a' }}>{prov.business_name}</strong>
                    <button
                      onClick={() => { window.location.href = '/?p=' + prov.slug; }}
                      style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 8, fontWeight: 'bold', fontSize: 13, cursor: 'pointer' }}
                    >
                      احجز الآن ←
                    </button>
                  </div>

                  {prov.services && prov.services.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                      {prov.services.map((srv) => (
                        <div key={srv.id} style={{ background: '#fff', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span>✨ {srv.title}</span>
                          <span style={{ color: '#16a34a', fontWeight: 'bold' }}>
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
              <p style={{ textAlign: 'center', color: '#64748b', fontSize: 14, padding: 20 }}>
                لا توجد لديك حجوزات مسجلة بهذا الرقم بعد.
              </p>
            ) : (
              myBookings.map((b) => (
                <div key={b.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 10, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{b.providers ? b.providers.business_name : 'مشروع'}</strong>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 'bold',
                      background: b.status === 'confirmed' ? '#dcfce7' : b.status === 'rejected' ? '#fee2e2' : '#fef9c3',
                      color: b.status === 'confirmed' ? '#166534' : b.status === 'rejected' ? '#991b1b' : '#854d0e'
                    }}>
                      {b.status === 'confirmed' ? 'مؤكد ✅' : b.status === 'rejected' ? 'مرفوض ❌' : 'قيد المراجعة ⏳'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>
                    الخدمة: {b.services ? b.services.title : '-'} | العربون: {b.services ? b.services.deposit_amount : '-'} درهم
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                    الموعد: {b.booking_date} الساعة {b.booking_time}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <button
          onClick={onBack}
          style={{ width: '100%', marginTop: 12, background: '#0f172a', color: '#fff', border: 'none', padding: 12, borderRadius: 10, fontWeight: 'bold', cursor: 'pointer' }}
        >
          العودة للصفحة الرئيسية
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: '20px auto', background: '#fff', padding: 24, borderRadius: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontFamily: 'sans-serif' }} dir="rtl">
      <h2 style={{ textAlign: 'center', marginTop: 0, marginBottom: 6 }}>فضاء الزبائن</h2>
      <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13, marginBottom: 18 }}>
        سجّل دخولك لتصفح العروض وحجز موعدك
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button
          type="button"
          onClick={() => setMode('login')}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', fontWeight: 'bold', background: mode === 'login' ? '#2563eb' : '#f1f5f9', color: mode === 'login' ? '#fff' : '#334155', cursor: 'pointer' }}
        >
          تسجيل الدخول
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', fontWeight: 'bold', background: mode === 'register' ? '#2563eb' : '#f1f5f9', color: mode === 'register' ? '#fff' : '#334155', cursor: 'pointer' }}
        >
          حساب جديد
        </button>
      </div>

      <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
        {mode === 'register' && (
          <div>
            <label style={{ fontWeight: 'bold', fontSize: 14 }}>الاسم الكامل *</label>
            <input type="text" placeholder="أدخل اسمك الكامل" style={input} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
        )}

        <label style={{ fontWeight: 'bold', fontSize: 14 }}>رقم الهاتف (واتساب) *</label>
        <input type="tel" placeholder="06XXXXXXXX" style={input} value={phone} onChange={(e) => setPhone(e.target.value)} required />

        <label style={{ fontWeight: 'bold', fontSize: 14 }}>الرمز السري (4 أرقام) *</label>
        <input type="password" maxLength="6" placeholder="****" style={{ ...input, textAlign: 'center', letterSpacing: 6 }} value={pinCode} onChange={(e) => setPinCode(e.target.value)} required />

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none', padding: 13, borderRadius: 10, fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}
        >
          {loading ? 'جاري التحقق...' : mode === 'login' ? 'دخول لحسابي' : 'إنشاء حساب زبون'}
        </button>

        <button
          type="button"
          onClick={onBack}
          style={{ width: '100%', background: 'none', border: 'none', color: '#64748b', marginTop: 14, cursor: 'pointer', fontSize: 14 }}
        >
          → العودة للرئيسية
        </button>
      </form>
    </div>
  );
}


import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function ClientPage({ onBack }) {
  const [mode, setMode] = useState('login'); // 'login' أو 'register'
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [client, setClient] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadClientBookings = async (clientPhone) => {
    const cleanPhone = String(clientPhone || '').replace(/\s+/g, '');
    const { data: bks } = await supabase
      .from('bookings')
      .select('*, providers(business_name, slug), services(title, deposit_amount)')
      .eq('client_phone', cleanPhone)
      .order('created_at', { ascending: false });

    setMyBookings(bks || []);
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
      await loadClientBookings(cleanPhone);
      alert('تم إنشاء حسابك بنجاح! مرحباً بك في منصة عربون.');
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
      await loadClientBookings(cleanPhone);
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

  // إذا سجل الزبون دخوله: عرض حجوزاته السابقة والحالية
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

        <h4 style={{ margin: '0 0 12px', borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>📅 سجل حجوزاتي ({myBookings.length})</h4>

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
        سجّل دخولك لمتابعة حالة حجوزاتك ومواعيدك
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
          <>
            <label style={{ fontWeight: 'bold', fontSize: 14 }}>الاسم الكامل *</label>
            <input type="text" placeholder="أدخل اسمك الكامل" style={input} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </>
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

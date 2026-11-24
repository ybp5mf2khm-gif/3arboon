import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function BookingPage({ provider, services, onSuccess }) {
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedSrv = services.find((s) => s.id === serviceId);

  // تجهيز رابط واتساب صاحب المشروع تلقائياً
  const rawPhone = String(provider.phone || '').replace(/\s+/g, '');
  let providerWaPhone = rawPhone;
  if (providerWaPhone.startsWith('0')) {
    providerWaPhone = '212' + providerWaPhone.slice(1);
  } else if (providerWaPhone && !providerWaPhone.startsWith('212')) {
    providerWaPhone = '212' + providerWaPhone;
  }

  const defaultWaText = encodeURIComponent(
    'مرحباً ' + provider.business_name + '، أود الاستفسار أو تأكيد حجزي عبر منصة عربون.'
  );
  const whatsappUrl = 'https://whatsapp.com' + providerWaPhone + '&text=' + defaultWaText;

  const copyRib = () => {
    navigator.clipboard.writeText(provider.rib);
    alert('تم نسخ رقم الحساب البنكي');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert('اختر صورة الوصل');
    setLoading(true);
    setMsg('جاري الإرسال...');

    try {
      const ext = file.name.split('.').pop();
      const fileName = Date.now() + '.' + ext;
      const { error: upErr } = await supabase.storage.from('receipts').upload(fileName, file);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);

      const { error: insErr } = await supabase.from('bookings').insert([{
        provider_id: provider.id,
        service_id: serviceId,
        client_name: name,
        client_phone: phone,
        booking_date: date,
        booking_time: time,
        receipt_url: urlData.publicUrl
      }]);
      if (insErr) throw insErr;

      setMsg('تم إرسال طلبك بنجاح!');
      setName('');
      setPhone('');
      setFile(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      setMsg('خطأ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const input = { width: '100%', padding: 10, margin: '6px 0 12px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: 460, margin: 'auto', background: '#fff', padding: 20, borderRadius: 14 }}>
      <h2 style={{ textAlign: 'center', margin: 0 }}>{provider.business_name}</h2>
      <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13 }}>احجز موعدك وأرسل وصل العربون</p>

      <form onSubmit={handleSubmit}>
        <label>الخدمة</label>
        <select style={input} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.title} ({s.deposit_amount} درهم عربون)</option>
          ))}
        </select>

        <label>التاريخ</label>
        <input type="date" style={input} value={date} onChange={(e) => setDate(e.target.value)} required />

        <label>الساعة</label>
        <select style={input} value={time} onChange={(e) => setTime(e.target.value)}>
          <option value="10:00">10:00</option>
          <option value="12:00">12:00</option>
          <option value="15:00">15:00</option>
          <option value="17:00">17:00</option>
        </select>

        {selectedSrv && (
          <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 10, marginBottom: 12, border: '1px dashed #16a34a' }}>
            <div>العربون المطلوب: <strong>{selectedSrv.deposit_amount} درهم</strong></div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{provider.bank_name}: {provider.rib}</div>
            <button type="button" onClick={copyRib} style={{ marginTop: 6, background: '#16a34a', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 6 }}>
              نسخ RIB
            </button>
          </div>
        )}

        <label>الاسم الكامل</label>
        <input type="text" style={input} value={name} onChange={(e) => setName(e.target.value)} required />

        <label>رقم الواتساب</label>
        <input type="tel" style={input} value={phone} onChange={(e) => setPhone(e.target.value)} required />

        <label>صورة الوصل</label>
        <input type="file" accept="image/*" style={input} onChange={(e) => setFile(e.target.files[0])} required />

        <button type="submit" disabled={loading} style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: 12, borderRadius: 10, fontWeight: 'bold' }}>
          {loading ? 'جاري الإرسال...' : 'تأكيد الحجز'}
        </button>

        {msg && <p style={{ textAlign: 'center', fontWeight: 'bold', marginTop: 10 }}>{msg}</p>}
      </form>

      {/* زر مراسلة صاحب المشروع عبر واتساب */}
      {providerWaPhone && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'block',
              width: '100%',
              background: '#25D366',
              color: '#fff',
              padding: 12,
              borderRadius: 10,
              fontWeight: 'bold',
              textDecoration: 'none',
              boxSizing: 'border-box'
            }}
          >
            تواصل مع صاحب المشروع عبر واتساب 💬
          </a>
        </div>
      )}
    </div>
  );
}

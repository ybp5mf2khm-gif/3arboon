import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://supabase.co',
  'sb_publishable_WhS2LkfbQLZRr8xNQtKuOg__4klxU_T'
);

export default function App() {
  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState({ text: '', color: '#2563eb' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const params = new URLSearchParams(window.location.search);
      const slug = params.get('p') || 'sara-beauty';

      const { data: prov } = await supabase
        .from('providers')
        .select('*')
        .eq('slug', slug)
        .single();

      if (prov && prov.is_active) {
        setProvider(prov);
        const { data: srvs } = await supabase
          .from('services')
          .select('*')
          .eq('provider_id', prov.id);
        setServices(srvs || []);
        if (srvs && srvs.length > 0) setSelectedService(srvs.id);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const currentSrv = services.find((s) => s.id === selectedService);

  const handleCopy = () => {
    navigator.clipboard.writeText(provider.rib);
    alert('تم نسخ رقم الحساب البنكي!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert('المرجو إرفاق صورة وصل التحويل');
    setSubmitting(true);
    setStatus({ text: 'جاري رفع الوصل وتسجيل الموعد...', color: '#2563eb' });

    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      const { error: insErr } = await supabase.from('bookings').insert([{
        provider_id: provider.id,
        service_id: selectedService,
        client_name: name,
        client_phone: phone,
        booking_date: date,
        booking_time: time,
        receipt_url: urlData.publicUrl
      }]);
      if (insErr) throw insErr;

      setStatus({ text: 'تم إرسال طلبك بنجاح! سنتواصل معك عبر واتساب.', color: '#16a34a' });
      setName('');
      setPhone('');
      setFile(null);
    } catch (err) {
      setStatus({ text: 'خطأ: ' + err.message, color: '#dc2626' });
    } finally {
      setSubmitting(false);
    }
  };

  const boxStyle = { maxWidth: 460, margin: '20px auto', background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' };
  const inputStyle = { width: '100%', padding: 12, marginTop: 6, marginBottom: 14, borderRadius: 10, border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: 15 };

  if (loading) return <div style={{ textAlign: 'center', marginTop: 50 }}>جاري التحميل...</div>;
  if (!provider) return <div style={{ textAlign: 'center', marginTop: 50 }}>الصفحة غير متوفرة حالياً</div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={boxStyle}>
        <h2 style={{ textAlign: 'center', margin: '0 0 6px' }}>{provider.business_name}</h2>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: 14, marginBottom: 20 }}>احجز موعدك وأكده بإرسال وصل العربون</p>

        <form onSubmit={handleSubmit}>
          <label style={{ fontWeight: 'bold', fontSize: 14 }}>اختر الخدمة</label>
          <select style={inputStyle} value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.total_price} درهم - العربون: {s.deposit_amount} درهم)
              </option>
            ))}
          </select>

          <label style={{ fontWeight: 'bold', fontSize: 14 }}>تاريخ الموعد</label>
          <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} required />

          <label style={{ fontWeight: 'bold', fontSize: 14 }}>الساعة المناسبة</label>
          <select style={inputStyle} value={time} onChange={(e) => setTime(e.target.value)}>
            <option value="10:00">10:00 صباحاً</option>
            <option value="11:30">11:30 صباحاً</option>
            <option value="14:00">14:00 زوالاً</option>
            <option value="16:00">16:00 مساءً</option>
            <option value="18:00">18:00 مساءً</option>
          </select>

          {currentSrv && (
            <div style={{ background: '#f0fdf4', border: '1px dashed #16a34a', padding: 14, borderRadius: 12, marginBottom: 16 }}>
              <div style={{ color: '#15803d', fontSize: 14 }}>
                المطلوب دفع عربون: <strong>{currentSrv.deposit_amount} درهم مغربي</strong>
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>البنك: {provider.bank_name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: 8, borderRadius: 8, marginTop: 8 }}>
                <code style={{ fontSize: 12 }}>{provider.rib}</code>
                <button type="button" onClick={handleCopy} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>نسخ RIB</button>
              </div>
            </div>
          )}

          <label style={{ fontWeight: 'bold', fontSize: 14 }}>الاسم الكامل</label>
          <input type="text" placeholder="مثال: سلمى العلمي" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />

          <label style={{ fontWeight: 'bold', fontSize: 14 }}>رقم الواتساب</label>
          <input type="tel" placeholder="06XXXXXXXX" style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} required />

          <label style={{ fontWeight: 'bold', fontSize: 14 }}>صورة وصل التحويل (العربون)</label>
          <input type="file" accept="image/*" style={inputStyle} onChange={(e) => setFile(e.target.files.item(0))} required />

          <button type="submit" disabled={submitting} style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: 14, borderRadius: 12, fontSize: 16, fontWeight: 'bold', cursor: 'pointer' }}>
            {submitting ? 'جاري الإرسال...' : 'تأكيد الحجز وإرسال الوصل'}
          </button>

          {status.text && <p style={{ textAlign: 'center', color: status.color, fontWeight: 'bold', marginTop: 14 }}>{status.text}</p>}
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function BookingPage({ provider, services, onSuccess }) {
  const defaultHours = (Array.isArray(provider.working_hours) && provider.working_hours.length > 0)
    ? provider.working_hours
    : ['10:00', '12:00', '15:00', '17:00'];

  const paymentList = (Array.isArray(provider.payment_methods) && provider.payment_methods.length > 0)
    ? provider.payment_methods
    : (provider.rib ? [{ bank: provider.bank_name || 'CIH Bank', account: provider.rib }] : []);

  const [serviceId, setServiceId] = useState(services && services.length > 0 ? services[0].id : '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState(defaultHours[0]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookedInfo, setBookedInfo] = useState(null);

  const selectedSrv = services.find((s) => String(s.id) === String(serviceId));

  const rawPhone = String(provider.phone || '').replace(/\D/g, '');
  let providerWaPhone = rawPhone;
  if (providerWaPhone.startsWith('0')) {
    providerWaPhone = '212' + providerWaPhone.slice(1);
  } else if (providerWaPhone && !providerWaPhone.startsWith('212')) {
    providerWaPhone = '212' + providerWaPhone;
  }

  const buildWhatsAppUrl = (text) => {
    return 'https://wa.me/' + providerWaPhone + '?text=' + encodeURIComponent(text);
  };

  const inquiryWaText =
    'مرحبا ' + provider.business_name + '، أود الاستفسار بخصوص حجز موعد' +
    (selectedSrv ? ' لخدمة: ' + selectedSrv.title : '') +
    (date ? ' يوم ' + date + ' الساعة ' + time : '');

  const copyAccount = (acc) => {
    navigator.clipboard.writeText(acc);
    alert('تم نسخ رقم الحساب: ' + acc);
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

      setBookedInfo({
        clientName: name,
        serviceTitle: selectedSrv ? selectedSrv.title : '',
        depositAmount: selectedSrv ? selectedSrv.deposit_amount : '',
        date: date,
        time: time
      });

      setMsg('تم إرسال طلبك بنجاح! ✅');
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
  const input = {
    width: '100%',
    padding: 10,
    margin: '6px 0 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    boxSizing: 'border-box'
  };

  if (bookedInfo) {
    const confirmWaText =
      'مرحبا ' + provider.business_name + '، قمت بحجز موعد عبر منصة عربون وأرسلت الوصل:\n' +
      'الاسم: ' + bookedInfo.clientName + '\n' +
      'الخدمة: ' + bookedInfo.serviceTitle + '\n' +
      'التاريخ: ' + bookedInfo.date + ' الساعة ' + bookedInfo.time + '\n' +
      'العربون: ' + bookedInfo.depositAmount + ' درهم';

    return (
      <div style={{ maxWidth: 460, margin: 'auto', background: '#fff', padding: 24, borderRadius: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 42, marginBottom: 8 }}>✅</div>
        <h2 style={{ margin: '0 0 8px', color: '#16a34a' }}>تم تسجيل طلب حجزك!</h2>
        <p style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>
          خطوة أخيرة: اضغط على الزر الأخضر لإرسال تفاصيل حجزك لصاحب المشروع عبر واتساب.
        </p>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, textAlign: 'right', fontSize: 13, marginBottom: 16 }}>
          <div><strong>الاسم:</strong> {bookedInfo.clientName}</div>
          <div><strong>الخدمة:</strong> {bookedInfo.serviceTitle}</div>
          <div><strong>الموعد:</strong> {bookedInfo.date} | {bookedInfo.time}</div>
          <div><strong>العربون:</strong> {bookedInfo.depositAmount} درهم</div>
        </div>

        {providerWaPhone && (
          <a
            href={buildWhatsAppUrl(confirmWaText)}
            style={{
              display: 'block',
              width: '100%',
              background: '#25D366',
              color: '#fff',
              padding: 14,
              borderRadius: 10,
              fontWeight: 'bold',
              fontSize: 15,
              textDecoration: 'none',
              boxSizing: 'border-box',
              marginBottom: 10
            }}
          >
            أرسل تفاصيل الحجز عبر واتساب 💬
          </a>
        )}

        <button
          type="button"
          onClick={() => setBookedInfo(null)}
          style={{ width: '100%', background: '#e2e8f0', color: '#334155', border: 'none', padding: 10, borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}
        >
          حجز موعد آخر
        </button>
      </div>
    );
  }

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
          {defaultHours.map((hr) => (
            <option key={hr} value={hr}>{hr}</option>
          ))}
        </select>

        {selectedSrv && (
          <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 10, marginBottom: 12, border: '1px dashed #16a34a' }}>
            <div style={{ marginBottom: 8 }}>
              العربون المطلوب: <strong>{selectedSrv.deposit_amount} درهم</strong>
            </div>
            <div style={{ fontSize: 12, color: '#166534', marginBottom: 6, fontWeight: 'bold' }}>
              اختر إحدى طرق الدفع المتاحة:
            </div>
            {paymentList.map((pm, idx) => (
              <div key={idx} style={{ background: '#fff', padding: '8px 10px', borderRadius: 8, border: '1px solid #bbf7d0', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 12, overflowX: 'auto' }}>
                  <strong>{pm.bank}:</strong> <span style={{ direction: 'ltr', display: 'inline-block' }}>{pm.account}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyAccount(pm.account)}
                  style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 6, fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer' }}
                >
                  نسخ
                </button>
              </div>
            ))}
          </div>
        )}

        <label>الاسم الكامل</label>
        <input type="text" style={input} value={name} onChange={(e) => setName(e.target.value)} required />

        <label>رقم الواتساب</label>
        <input type="tel" style={input} value={phone} onChange={(e) => setPhone(e.target.value)} required />

        <label>صورة الوصل</label>
        <input type="file" accept="image/*" style={input} onChange={(e) => setFile(e.target.files[0])} required />

        <button type="submit" disabled={loading} style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: 12, borderRadius: 10, fontWeight: 'bold', cursor: 'pointer' }}>
          {loading ? 'جاري الإرسال...' : 'تأكيد الحجز'}
        </button>

        {msg && <p style={{ textAlign: 'center', fontWeight: 'bold', marginTop: 10 }}>{msg}</p>}
      </form>

      {providerWaPhone && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
          <a
            href={buildWhatsAppUrl(inquiryWaText)}
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
            استفسر عبر واتساب قبل الحجز 💬
          </a>
        </div>
      )}
    </div>
  );
}

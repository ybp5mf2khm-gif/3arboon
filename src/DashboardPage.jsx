import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function DashboardPage({ provider, bookings, services, onRefresh }) {
  const [tab, setTab] = useState('bookings'); // 'bookings' أو 'services'
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // إنشاء رابط الحجز الخاص بالمشروع تلقائياً
  const bookingLink = `${window.location.origin}/?p=${provider.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const msg = encodeURIComponent(`مرحباً! يمكنك حجز موعدك في *${provider.business_name}* مباشرة عبر الرابط التالي:\n${bookingLink}`);
    window.open(`https://wa.me{msg}`, '_blank');
  };

  const updateStatus = async (b, newStatus) => {
    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', b.id);
    if (error) return alert('خطأ: ' + error.message);

    onRefresh();

    if (newStatus === 'confirmed') {
      let ph = String(b.client_phone || '').replace(/\s+/g, '');
      if (ph.startsWith('0')) ph = '212' + ph.slice(1);
      const txt = encodeURIComponent(`مرحباً ${b.client_name}، تم تأكيد موعدك في ${provider.business_name} يوم ${b.booking_date} الساعة ${b.booking_time}`);
      window.open(`https://wa.me{ph}?text=${txt}`, '_blank');
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('services').insert([{
      provider_id: provider.id,
      title: title,
      total_price: Number(price),
      deposit_amount: Number(deposit)
    }]);
    setSaving(false);

    if (error) return alert('خطأ في الإضافة: ' + error.message);
    setTitle('');
    setPrice('');
    setDeposit('');
    onRefresh();
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    const { error } = await supabase.from('services').delete().eq('id', serviceId);
    if (error) return alert('خطأ في الحذف: ' + error.message);
    onRefresh();
  };

  const input = { width: '100%', padding: 10, margin: '4px 0 10px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: 460, margin: 'auto', background: '#fff', padding: 20, borderRadius: 14 }}>
      <h3 style={{ textAlign: 'center', marginTop: 0, marginBottom: 12 }}>{provider.business_name}</h3>

      {/* صندوق رابط الحجز الخاص بالمشروع */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 'bold' }}>
          🔗 رابط الحجز الخاص بزبائنك:
        </div>
        <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px', fontSize: 13, color: '#0f172a', direction: 'ltr', textAlign: 'left', overflowX: 'auto', whiteSpace: 'nowrap', marginBottom: 10 }}>
          {bookingLink}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleCopyLink}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', background: copied ? '#16a34a' : '#0f172a', color: '#fff', fontWeight: 'bold', fontSize: 13, cursor: 'pointer' }}
          >
            {copied ? 'تم النسخ ✅' : 'نسخ الرابط 📋'}
          </button>
          <button
            onClick={handleShareWhatsApp}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', fontWeight: 'bold', fontSize: 13, cursor: 'pointer' }}
          >
            مشاركة واتساب 💬
          </button>
        </div>
      </div>

      {/* أزرار التبويب داخل لوحة التحكم */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setTab('bookings')}
          style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', fontWeight: 'bold', background: tab === 'bookings' ? '#0f172a' : '#e2e8f0', color: tab === 'bookings' ? '#fff' : '#334155' }}
        >
          الحجوزات ({bookings.length})
        </button>
        <button
          onClick={() => setTab('services')}
          style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', fontWeight: 'bold', background: tab === 'services' ? '#0f172a' : '#e2e8f0', color: tab === 'services' ? '#fff' : '#334155' }}
        >
          الخدمات ({services.length})
        </button>
      </div>

      {tab === 'bookings' ? (
        <>
          {bookings.length === 0 && <p style={{ textAlign: 'center', color: '#64748b' }}>لا توجد حجوزات بعد.</p>}
          {bookings.map((b) => (
            <div key={b.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{b.client_name}</strong>
                <span>{b.status === 'confirmed' ? 'مؤكد' : b.status === 'rejected' ? 'مرفوض' : 'معلق'}</span>
              </div>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                {b.booking_date} | {b.booking_time} | {b.client_phone}
              </div>
              {b.receipt_url && (
                <a href={b.receipt_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 6, fontSize: 13, color: '#2563eb' }}>
                  عرض الوصل ↗
                </a>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => updateStatus(b, 'confirmed')} style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none', padding: 8, borderRadius: 6 }}>
                  قبول وواتساب
                </button>
                <button onClick={() => updateStatus(b, 'rejected')} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: 8, borderRadius: 6 }}>
                  رفض
                </button>
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          {/* نموذج إضافة خدمة جديدة */}
          <form onSubmit={handleAddService} style={{ background: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 16, border: '1px solid #e2e8f0' }}>
            <strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>+ إضافة خدمة جديدة</strong>
            <input type="text" placeholder="اسم الخدمة (مثال: قص الشعر)" style={input} value={title} onChange={(e) => setTitle(e.target.value)} required />
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" placeholder="الثمن (درهم)" style={input} value={price} onChange={(e) => setPrice(e.target.value)} required />
              <input type="number" placeholder="العربون (درهم)" style={input} value={deposit} onChange={(e) => setDeposit(e.target.value)} required />
            </div>
            <button type="submit" disabled={saving} style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: 10, borderRadius: 8, fontWeight: 'bold' }}>
              {saving ? 'جاري الحفظ...' : 'حفظ الخدمة'}
            </button>
          </form>

          {/* قائمة الخدمات الحالية مع زر الحذف */}
          {services.map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0', padding: 10, borderRadius: 8, marginBottom: 8 }}>
              <div>
                <strong style={{ display: 'block', fontSize: 14 }}>{s.title}</strong>
                <small style={{ color: '#64748b' }}>الثمن: {s.total_price} درهم | العربون: {s.deposit_amount} درهم</small>
              </div>
              <button
                onClick={() => handleDeleteService(s.id)}
                style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 10px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}
              >
                حذف
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

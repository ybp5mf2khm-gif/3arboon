import React from 'react';
import { supabase } from './supabaseClient';

export default function DashboardPage({ provider, bookings, onRefresh }) {
  const updateStatus = async (b, newStatus) => {
    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', b.id);
    if (error) return alert('خطأ: ' + error.message);

    onRefresh();

    if (newStatus === 'confirmed') {
      let ph = b.client_phone.replace(/\s+/g, '');
      if (ph.startsWith('0')) ph = '212' + ph.slice(1);
      const txt = encodeURIComponent(`مرحباً ${b.client_name}، تم تأكيد موعدك في ${provider.business_name} يوم ${b.booking_date} الساعة ${b.booking_time}`);
      window.open(`https://wa.me{ph}?text=${txt}`, '_blank');
    }
  };

  return (
    <div style={{ maxWidth: 460, margin: 'auto', background: '#fff', padding: 20, borderRadius: 14 }}>
      <h3 style={{ textAlign: 'center', marginTop: 0 }}>حجوزات {provider.business_name}</h3>

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
    </div>
  );
}

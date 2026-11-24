import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function BookingPage({ provider, services, onSuccess }) {
  const defaultHours = (Array.isArray(provider.working_hours) && provider.working_hours.length > 0)
    ? provider.working_hours
    : ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];

  const paymentList = (Array.isArray(provider.payment_methods) && provider.payment_methods.length > 0)
    ? provider.payment_methods
    : (provider.rib ? [{ bank: provider.bank_name || 'CIH Bank', account: provider.rib }] : []);

  const [serviceId, setServiceId] = useState(services && services.length > 0 ? services[0].id : '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [bookedTimes, setBookedTimes] = useState([]);
  const [checkingSlots, setCheckingSlots] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookedInfo, setBookedInfo] = useState(null);

  const selectedSrv = services.find((s) => String(s.id) === String(serviceId));

  // تحديد الخطوة الحالية تلقائياً لشريط التقدم (1 -> 2 -> 3)
  const currentStep = (date && time) ? 3 : serviceId ? 2 : 1;

  // تحميل خط Cairo العربي العصري
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://googleapis.com';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (!date || !provider.id) {
      setBookedTimes([]);
      return;
    }
    const fetchBookedSlots = async () => {
      setCheckingSlots(true);
      const { data, error } = await supabase
        .from('bookings')
        .select('booking_time, status')
        .eq('provider_id', provider.id)
        .eq('booking_date', date)
        .neq('status', 'rejected');

      setCheckingSlots(false);
      if (!error && Array.isArray(data)) {
        const taken = data.map((item) => item.booking_time);
        setBookedTimes(taken);
        if (taken.includes(time)) setTime('');
      }
    };
    fetchBookedSlots();
  }, [date, provider.id]);

  const rawPhone = String(provider.phone || '').replace(/\D/g, '');
  let providerWaPhone = rawPhone;
  if (providerWaPhone.startsWith('0')) providerWaPhone = '212' + providerWaPhone.slice(1);
  else if (providerWaPhone && !providerWaPhone.startsWith('212')) providerWaPhone = '212' + providerWaPhone;

  const buildWhatsAppUrl = (text) => `https://wa.me{providerWaPhone}?text=${encodeURIComponent(text)}`;
  const inquiryWaText =
    `مرحبا ${provider.business_name}، أود الاستفسار بخصوص حجز موعد` +
    (selectedSrv ? ` لخدمة: ${selectedSrv.title}` : '') +
    (date ? ` يوم ${date}` : '') +
    (time ? ` الساعة ${time}` : '');

  const copyAccount = (acc) => {
    navigator.clipboard.writeText(acc);
    alert('تم نسخ رقم الحساب: ' + acc);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) return alert('اختر تاريخ الموعد');
    if (!time) return alert('اختر ساعة الموعد المتاحة');
    if (!file) return alert('اختر صورة الوصل');

    setLoading(true);
    setMsg('جاري التحقق من الموعد وإرسال الطلب...');

    try {
      const { data: existing } = await supabase
        .from('bookings')
        .select('id')
        .eq('provider_id', provider.id)
        .eq('booking_date', date)
        .eq('booking_time', time)
        .neq('status', 'rejected');

      if (existing && existing.length > 0) {
        setBookedTimes((prev) => [...prev, time]);
        setTime('');
        setLoading(false);
        setMsg('');
        return alert('عذراً، هذا التوقيت تم حجزه للتو! يرجى اختيار ساعة أخرى متاحة.');
      }

      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
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
        date,
        time
      });

      setBookedTimes((prev) => [...prev, time]);
      setMsg('');
      setName('');
      setPhone('');
      setTime('');
      setFile(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      setMsg('خطأ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const pageFont = { fontFamily: "'Cairo', sans-serif", direction: 'rtl' };

  if (bookedInfo) {
    const confirmWaText =
      `مرحبا ${provider.business_name}، قمت بحجز موعد عبر منصة عربون وأرسلت الوصل:\n` +
      `الاسم: ${bookedInfo.clientName}\n` +
      `الخدمة: ${bookedInfo.serviceTitle}\n` +
      `التاريخ: ${bookedInfo.date} الساعة ${bookedInfo.time}\n` +
      `العربون: ${bookedInfo.depositAmount} درهم`;

    return (
      <div style={{ ...pageFont, maxWidth: 460, margin: '20px auto', background: '#fff', padding: 24, borderRadius: 20, boxShadow: '0 10px 25px rgba(0,0,0,0.06)', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 12px' }}>✓</div>
        <h2 style={{ margin: '0 0 8px', color: '#15803d', fontWeight: 800 }}>تم تسجيل طلب حجزك!</h2>
        <p style={{ color: '#475569', fontSize: 14, marginBottom: 18 }}>
          خطوة أخيرة: اضغط على الزر الأخضر لإرسال تفاصيل حجزك لصاحب المشروع عبر واتساب.
        </p>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, textAlign: 'right', fontSize: 13, marginBottom: 18, lineHeight: 1.8 }}>
          <div><strong>الاسم:</strong> {bookedInfo.clientName}</div>
          <div><strong>الخدمة:</strong> {bookedInfo.serviceTitle}</div>
          <div><strong>الموعد:</strong> {bookedInfo.date} | {bookedInfo.time}</div>
          <div><strong>العربون:</strong> <span style={{ color: '#16a34a', fontWeight: 700 }}>{bookedInfo.depositAmount} درهم</span></div>
        </div>

        {providerWaPhone && (
          <a href={buildWhatsAppUrl(confirmWaText)} style={{ display: 'block', width: '100%', background: '#25D366', color: '#fff', padding: 14, borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none', boxSizing: 'border-box', marginBottom: 10 }}>
            أرسل تفاصيل الحجز عبر واتساب 💬
          </a>
        )}

        <button type="button" onClick={() => setBookedInfo(null)} style={{ width: '100%', background: '#f1f5f9', color: '#334155', border: 'none', padding: 12, borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          حجز موعد آخر
        </button>
      </div>
    );
  }
    const inputStyle = {
    width: '100%',
    padding: '11px 12px',
    margin: '6px 0 14px',
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    fontSize: 14
  };

  return (
    <div style={{ ...pageFont, maxWidth: 460, margin: '12px auto', background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.06)' }}>
      {/* الترويسة الاحترافية */}
      <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#fff', padding: '24px 20px', textAlign: 'center' }}>
        <span style={{ background: 'rgba(255,255,255,0.18)', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
          عربون • 3arboon
        </span>
        <h2 style={{ margin: '10px 0 4px', fontSize: 22, fontWeight: 800 }}>{provider.business_name}</h2>
        <p style={{ margin: 0, color: '#dbeafe', fontSize: 13 }}>احجز موعدك وأرسل وصل العربون في خطوات بسيطة</p>
      </div>

      <div style={{ padding: 20 }}>
        {/* شريط الخطوات المرقم (1 - 2 - 3) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, background: '#f8fafc', padding: '12px 10px', borderRadius: 14, border: '1px solid #e2e8f0' }}>
          {[
            { num: 1, label: 'الخدمة' },
            { num: 2, label: 'الموعد' },
            { num: 3, label: 'التأكيد' }
          ].map((st) => {
            const active = currentStep >= st.num;
            return (
              <div key={st.num} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: active ? '#2563eb' : '#cbd5e1',
                  color: '#fff', fontSize: 12, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {st.num}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#1e3a8a' : '#64748b' }}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit}>
          {/* بطاقات الخدمات */}
          <label style={{ display: 'block', fontWeight: 700, marginBottom: 8, fontSize: 14 }}>1. اختر الخدمة</label>
          <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
            {services.map((s) => {
              const isSelected = String(s.id) === String(serviceId);
              return (
                <div
                  key={s.id}
                  onClick={() => setServiceId(s.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: '0.2s'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{s.title}</div>
                    {s.price && <div style={{ fontSize: 12, color: '#64748b' }}>الثمن الإجمالي: {s.price} درهم</div>}
                  </div>
                  <div style={{ background: isSelected ? '#2563eb' : '#f1f5f9', color: isSelected ? '#fff' : '#334155', padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                    {s.deposit_amount} درهم عربون
                  </div>
                </div>
              );
            })}
          </div>

          <label style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>2. التاريخ</label>
          <input
            type="date"
            min={new Date().toISOString().split('T')[0]}
            style={inputStyle}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <label style={{ display: 'block', fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
            اختر الساعة المتاحة {checkingSlots && <small style={{ color: '#2563eb' }}>(جاري الفحص...)</small>}
          </label>

          {!date ? (
            <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 10, padding: 14, textAlign: 'center', fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              يرجى اختيار التاريخ أولاً لعرض الساعات المتاحة
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16, direction: 'ltr' }}>
              {defaultHours.map((hr) => {
                const isBooked = bookedTimes.includes(hr);
                const isSelected = time === hr;
                return (
                  <button
                    key={hr}
                    type="button"
                    disabled={isBooked}
                    onClick={() => setTime(hr)}
                    style={{
                      padding: '10px 4px',
                      borderRadius: 10,
                      border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: isBooked ? '#f1f5f9' : isSelected ? '#2563eb' : '#fff',
                      color: isBooked ? '#94a3b8' : isSelected ? '#fff' : '#0f172a',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: isBooked ? 'not-allowed' : 'pointer',
                      textDecoration: isBooked ? 'line-through' : 'none',
                      fontFamily: 'inherit'
                    }}
                  >
                    {hr} {isBooked ? '🔒' : ''}
                  </button>
                );
              })}
            </div>
          )}

          {selectedSrv && (
            <div style={{ background: '#f0fdf4', padding: 14, borderRadius: 12, marginBottom: 16, border: '1px dashed #16a34a' }}>
              <div style={{ marginBottom: 8, fontSize: 14 }}>
                العربون المطلوب: <strong style={{ color: '#15803d' }}>{selectedSrv.deposit_amount} درهم</strong>
              </div>
              <div style={{ fontSize: 12, color: '#166534', marginBottom: 8, fontWeight: 700 }}>
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
                    style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    نسخ
                  </button>
                </div>
              ))}
            </div>
          )}

          <label style={{ fontWeight: 700, fontSize: 14 }}>3. الاسم الكامل</label>
          <input type="text" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />

          <label style={{ fontWeight: 700, fontSize: 14 }}>رقم الواتساب</label>
          <input type="tel" style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} required />

          <label style={{ fontWeight: 700, fontSize: 14 }}>صورة وصل الدفع</label>
          <input type="file" accept="image/*" style={inputStyle} onChange={(e) => setFile(e.target.files[0])} required />

          <button type="submit" disabled={loading} style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: 14, borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
            {loading ? 'جاري الإرسال...' : 'تأكيد الحجز وإرسال الوصل'}
          </button>

          {msg && <p style={{ textAlign: 'center', fontWeight: 700, marginTop: 10, color: '#2563eb' }}>{msg}</p>}
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
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
                boxSizing: 'border-box'
              }}
            >
              استفسر عبر واتساب قبل الحجز 💬
            </a>
          </div>
        )}
      </div>
    </div>
  );
}


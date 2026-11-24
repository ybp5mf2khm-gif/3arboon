import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function DashboardPage({ provider, bookings, services, onRefresh }) {
  const [tab, setTab] = useState('bookings');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // حالات تعديل البيانات
  const [bizName, setBizName] = useState(provider.business_name || '');
  const [ownerName, setOwnerName] = useState(provider.owner_name || '');
  const [phone, setPhone] = useState(provider.phone || '');
  const [email, setEmail] = useState(provider.email || '');
  const [pinCode, setPinCode] = useState(provider.pin_code || '');

  // حالات البنوك وطرق الدفع المتعددة
  const initialPayments = (Array.isArray(provider.payment_methods) && provider.payment_methods.length > 0)
    ? provider.payment_methods
    : (provider.rib ? [{ bank: provider.bank_name || 'CIH Bank', account: provider.rib }] : []);
  const [paymentMethods, setPaymentMethods] = useState(initialPayments);
  const [newBank, setNewBank] = useState('CIH Bank');
  const [newAccount, setNewAccount] = useState('');

  // حالات ساعات العمل المتاحة
  const initialHours = (Array.isArray(provider.working_hours) && provider.working_hours.length > 0)
    ? provider.working_hours
    : ['10:00', '12:00', '15:00', '17:00'];
  const [workingHours, setWorkingHours] = useState(initialHours);
  const [newHour, setNewHour] = useState('09:00');
  const [savingSettings, setSavingSettings] = useState(false);

  const bookingLink = window.location.origin + '/?p=' + provider.slug;
  const shareText = encodeURIComponent('مرحباً! يمكنك حجز موعدك في *' + provider.business_name + '* مباشرة عبر الرابط التالي:\n' + bookingLink);
    const handleShareWhatsApp = async () => {
    const textMsg = 'مرحباً! يمكنك حجز موعدك في *' + provider.business_name + '* مباشرة عبر الرابط التالي:\n' + bookingLink;
    if (navigator.share) {
      try {
        await navigator.share({
          title: provider.business_name,
          text: textMsg,
          url: bookingLink
        });
        return;
      } catch (err) {}
    }
    window.location.href = 'whatsapp://send?text=' + encodeURIComponent(textMsg);
  };


  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const updateStatus = async (b, newStatus) => {
    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', b.id);
    if (error) return alert('خطأ: ' + error.message);

    onRefresh();

    if (newStatus === 'confirmed') {
      let ph = String(b.client_phone || '').replace(/\s+/g, '');
      if (ph.startsWith('0')) ph = '212' + ph.slice(1);
      const txt = encodeURIComponent('مرحباً ' + b.client_name + '، تم تأكيد موعدك في ' + provider.business_name + ' يوم ' + b.booking_date + ' الساعة ' + b.booking_time);
      window.location.href = 'https://whatsapp.com' + ph + '&text=' + txt;
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

  const addPaymentMethod = () => {
    if (!newAccount.trim()) return alert('أدخل رقم الحساب البنكي (RIB) أو رقم الهاتف');
    setPaymentMethods([...paymentMethods, { bank: newBank, account: newAccount.trim() }]);
    setNewAccount('');
  };

  const removePaymentMethod = (idx) => {
    setPaymentMethods(paymentMethods.filter((_, i) => i !== idx));
  };

  const addWorkingHour = () => {
    if (!newHour) return;
    if (workingHours.includes(newHour)) return alert('هذه الساعة مضافة مسبقاً');
    const updated = [...workingHours, newHour].sort();
    setWorkingHours(updated);
  };

  const removeWorkingHour = (hr) => {
    if (workingHours.length <= 1) return alert('يجب ترك ساعة عمل واحدة على الأقل');
    setWorkingHours(workingHours.filter((h) => h !== hr));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (paymentMethods.length === 0) return alert('يجب إضافة طريقة دفع واحدة على الأقل');
    setSavingSettings(true);

    const firstPay = paymentMethods[0];
    const { error } = await supabase
      .from('providers')
      .update({
        business_name: bizName.trim(),
        owner_name: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        pin_code: pinCode.trim(),
        bank_name: firstPay.bank,
        rib: firstPay.account,
        payment_methods: paymentMethods,
        working_hours: workingHours
      })
      .eq('id', provider.id);

    setSavingSettings(false);
    if (error) return alert('خطأ أثناء الحفظ: ' + error.message);
    alert('تم حفظ جميع التعديلات بنجاح ✅');
    onRefresh();
  };
  const input = {
    width: '100%',
    padding: 10,
    margin: '4px 0 10px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ maxWidth: 460, margin: 'auto', background: '#fff', padding: 20, borderRadius: 14 }}>
      <h3 style={{ textAlign: 'center', marginTop: 0, marginBottom: 12 }}>{provider.business_name}</h3>

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
          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noreferrer"
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: '#25D366', color: '#fff', fontWeight: 'bold', fontSize: 13, textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            مشاركة واتساب 💬
          </a>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button
          onClick={() => setTab('bookings')}
          style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', fontWeight: 'bold', fontSize: 13, background: tab === 'bookings' ? '#0f172a' : '#e2e8f0', color: tab === 'bookings' ? '#fff' : '#334155' }}
        >
          الحجوزات ({bookings.length})
        </button>
        <button
          onClick={() => setTab('services')}
          style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', fontWeight: 'bold', fontSize: 13, background: tab === 'services' ? '#0f172a' : '#e2e8f0', color: tab === 'services' ? '#fff' : '#334155' }}
        >
          الخدمات ({services.length})
        </button>
        <button
          onClick={() => setTab('settings')}
          style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', fontWeight: 'bold', fontSize: 13, background: tab === 'settings' ? '#0f172a' : '#e2e8f0', color: tab === 'settings' ? '#fff' : '#334155' }}
        >
          الإعدادات ⚙️
        </button>
      </div>

      {tab === 'bookings' && (
        <div>
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
      )}

      {tab === 'services' && (
        <div>
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
        </div>
      )}
      {tab === 'settings' && (
        <form onSubmit={handleSaveSettings}>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 14, border: '1px solid #e2e8f0' }}>
            <strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>🏦 البنوك وطرق الدفع المتاحة:</strong>
            {paymentMethods.map((pm, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 6 }}>
                <div style={{ fontSize: 13 }}>
                  <strong>{pm.bank}</strong>: <span style={{ direction: 'ltr', display: 'inline-block' }}>{pm.account}</span>
                </div>
                <button type="button" onClick={() => removePaymentMethod(idx)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 8px', fontWeight: 'bold' }}>
                  حذف
                </button>
              </div>
            ))}

            <select style={input} value={newBank} onChange={(e) => setNewBank(e.target.value)}>
              <option value="CIH Bank">CIH Bank</option>
              <option value="التجاري وفا بنك">التجاري وفا بنك</option>
              <option value="البنك الشعبي">البنك الشعبي</option>
              <option value="Bank of Africa (BMCE)">Bank of Africa (BMCE)</option>
              <option value="البريد بنك">البريد بنك</option>
              <option value="CashPlus / Wafacash">كاش بلوس / وفاكاش</option>
              <option value="Orange Money / inwi money">أورنج موني / إنوي موني</option>
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" placeholder="رقم RIB أو رقم الهاتف" style={{ ...input, margin: 0, flex: 2 }} value={newAccount} onChange={(e) => setNewAccount(e.target.value)} />
              <button type="button" onClick={addPaymentMethod} style={{ flex: 1, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', fontSize: 13 }}>
                + إضافة
              </button>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 14, border: '1px solid #e2e8f0' }}>
            <strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>⏰ ساعات العمل المتاحة للحجز:</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {workingHours.map((hr) => (
                <span key={hr} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {hr}
                  <button type="button" onClick={() => removeWorkingHour(hr)} style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="time" style={{ ...input, margin: 0, flex: 2 }} value={newHour} onChange={(e) => setNewHour(e.target.value)} />
              <button type="button" onClick={addWorkingHour} style={{ flex: 1, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', fontSize: 13 }}>
                + إضافة ساعة
              </button>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 14, border: '1px solid #e2e8f0' }}>
            <strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>👤 تعديل بيانات الحساب:</strong>
            <label style={{ fontSize: 13 }}>اسم المشروع / الصالون</label>
            <input type="text" style={input} value={bizName} onChange={(e) => setBizName(e.target.value)} required />

            <label style={{ fontSize: 13 }}>اسم صاحب المشروع</label>
            <input type="text" style={input} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />

            <label style={{ fontSize: 13 }}>رقم الهاتف (واتساب)</label>
            <input type="tel" style={input} value={phone} onChange={(e) => setPhone(e.target.value)} required />

            <label style={{ fontSize: 13 }}>البريد الإلكتروني</label>
            <input type="email" style={input} value={email} onChange={(e) => setEmail(e.target.value)} />

            <label style={{ fontSize: 13 }}>الرمز السري (PIN)</label>
            <input type="text" maxLength="6" style={input} value={pinCode} onChange={(e) => setPinCode(e.target.value)} required />
          </div>

          <button type="submit" disabled={savingSettings} style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none', padding: 13, borderRadius: 10, fontWeight: 'bold', fontSize: 15 }}>
            {savingSettings ? 'جاري الحفظ...' : 'حفظ جميع الإعدادات ✅'}
          </button>
        </form>
      )}
    </div>
  );
}

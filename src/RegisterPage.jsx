import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function RegisterPage({ onCancel }) {
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bizName, setBizName] = useState('');
  const [slug, setSlug] = useState('');
  const [bankName, setBankName] = useState('CIH Bank');
  const [rib, setRib] = useState('');
  const [pin, setPin] = useState('');
  const [srvTitle, setSrvTitle] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanSlug) {
      alert('المرجو كتابة رابط مختصر صحيح بالحروف الإنجليزية');
      setLoading(false);
      return;
    }

    try {
      const { data: prov, error: pErr } = await supabase
        .from('providers')
        .insert([{
          owner_name: ownerName.trim(),
          email: cleanEmail,
          phone: phone.trim(),
          business_name: bizName.trim(),
          slug: cleanSlug,
          bank_name: bankName,
          rib: rib.trim(),
          pin_code: pin.trim(),
          is_active: false
        }])
        .select()
        .single();

      if (pErr) {
        throw new Error('هذا الرابط المختصر أو البريد الإلكتروني مستعمل مسبقاً: ' + pErr.message);
      }

      const { error: sErr } = await supabase.from('services').insert([{
        provider_id: prov.id,
        title: srvTitle.trim(),
        total_price: Number(totalPrice),
        deposit_amount: Number(deposit)
      }]);

      if (sErr) throw sErr;

      alert('مرحباً ' + ownerName + '! تم استلام طلب تسجيل مشروعك بنجاح. سيتم تفعيل حسابك من طرف الإدارة قريباً.');
      if (onCancel) onCancel();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const input = {
    width: '100%',
    padding: 10,
    margin: '4px 0 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    boxSizing: 'border-box',
    fontSize: 15
  };

  return (
    <div style={{ maxWidth: 460, margin: 'auto', background: '#fff', padding: 20, borderRadius: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
      <h2 style={{ textAlign: 'center', marginTop: 0 }}>تسجيل صاحب مشروع جديد</h2>
      <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13, marginBottom: 16 }}>
        أنشئ رابط الحجز الخاص بمشروعك في دقيقة واحدة
      </p>

      <form onSubmit={handleRegister}>
        <label style={{ fontWeight: 'bold', fontSize: 14 }}>الاسم الكامل لصاحب المشروع *</label>
        <input type="text" placeholder="مثال: حسام الطلحاوي" style={input} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />

        <label style={{ fontWeight: 'bold', fontSize: 14 }}>البريد الإلكتروني (لتسجيل الدخول) *</label>
        <input type="email" placeholder="example@gmail.com" style={input} value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label style={{ fontWeight: 'bold', fontSize: 14 }}>رقم الهاتف (واتساب) *</label>
        <input type="tel" placeholder="06XXXXXXXX" style={input} value={phone} onChange={(e) => setPhone(e.target.value)} required />

        <label style={{ fontWeight: 'bold', fontSize: 14 }}>اسم الصالون أو المشروع *</label>
        <input type="text" placeholder="مثال: صالون أمينة" style={input} value={bizName} onChange={(e) => setBizName(e.target.value)} required />

        <label style={{ fontWeight: 'bold', fontSize: 14 }}>الرابط المختصر (بالحروف الإنجليزية بدون فراغات) *</label>
        <input type="text" placeholder="مثال: amina-salon" style={input} value={slug} onChange={(e) => setSlug(e.target.value)} required />

        <label style={{ fontWeight: 'bold', fontSize: 14 }}>اسم البنك</label>
        <select style={input} value={bankName} onChange={(e) => setBankName(e.target.value)}>
          <option value="CIH Bank">CIH Bank</option>
          <option value="Attijariwafa Bank">التجاري وفا بنك</option>
          <option value="Banque Populaire">البنك الشعبي</option>
          <option value="CashPlus / Wafacash">كاش بلوس / وفاكاش</option>
        </select>

        <label style={{ fontWeight: 'bold', fontSize: 14 }}>رقم الحساب البنكي (RIB) *</label>
        <input type="text" placeholder="24 رقماً" style={input} value={rib} onChange={(e) => setRib(e.target.value)} required />

        <label style={{ fontWeight: 'bold', fontSize: 14 }}>الرمز السري للوحة التحكم (4 أرقام) *</label>
        <input type="text" maxLength="6" placeholder="مثال: 2026" style={input} value={pin} onChange={(e) => setPin(e.target.value)} required />

        <hr style={{ margin: '16px 0', border: '0', borderTop: '1px solid #e2e8f0' }} />
        <strong style={{ display: 'block', marginBottom: 8, color: '#0f172a' }}>أضف خدمتك الأولى:</strong>

        <label style={{ fontWeight: 'bold', fontSize: 14 }}>اسم الخدمة *</label>
        <input type="text" placeholder="مثال: حلاقة وتصفيف" style={input} value={srvTitle} onChange={(e) => setSrvTitle(e.target.value)} required />

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 'bold', fontSize: 13 }}>الثمن الكامل (درهم) *</label>
            <input type="number" placeholder="200" style={input} value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 'bold', fontSize: 13 }}>مبلغ العربون (درهم) *</label>
            <input type="number" placeholder="50" style={input} value={deposit} onChange={(e) => setDeposit(e.target.value)} required />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none', padding: 13, borderRadius: 10, fontWeight: 'bold', fontSize: 16, marginTop: 8, cursor: 'pointer' }}
        >
          {loading ? 'جاري الإنشاء...' : 'إنشاء صفحتي الآن'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          style={{ width: '100%', background: 'none', border: 'none', color: '#64748b', marginTop: 12, cursor: 'pointer', fontSize: 14 }}
        >
          إلغاء والعودة
        </button>
      </form>
    </div>
  );
}

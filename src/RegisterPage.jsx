import React, { useState, useEffect } from 'react';
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

  // تحميل خط Cairo العربي العصري
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://googleapis.com';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const cleanSlugPreview = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const cleanSlug = cleanSlugPreview;
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
  const pageFont = { fontFamily: "'Cairo', sans-serif", direction: 'rtl' };

  const inputStyle = {
    width: '100%',
    padding: '11px 12px',
    margin: '5px 0 14px',
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#0f172a',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    fontSize: 14
  };

  const sectionCard = {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16
  };

  return (
    <div style={{ ...pageFont, maxWidth: 460, margin: '12px auto', background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.06)' }}>
      {/* الترويسة الاحترافية */}
      <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#fff', padding: '24px 20px', textAlign: 'center' }}>
        <span style={{ background: 'rgba(255,255,255,0.18)', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
          عربون • 3arboon
        </span>
        <h2 style={{ margin: '10px 0 4px', fontSize: 22, fontWeight: 800 }}>تسجيل صاحب مشروع جديد</h2>
        <p style={{ margin: 0, color: '#dbeafe', fontSize: 13 }}>أنشئ صفحة الحجز الخاصة بمشروعك في دقيقة واحدة</p>
      </div>

      <div style={{ padding: 20 }}>
        <form onSubmit={handleRegister}>
          {/* القسم 1: بيانات صاحب المشروع */}
          <div style={sectionCard}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#1e3a8a', marginBottom: 12 }}>
              1. بيانات صاحب المشروع
            </div>

            <label style={{ fontWeight: 700, fontSize: 13 }}>الاسم الكامل لصاحب المشروع *</label>
            <input type="text" placeholder="مثال: حسام الطلحاوي" style={inputStyle} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />

            <label style={{ fontWeight: 700, fontSize: 13 }}>البريد الإلكتروني (لتسجيل الدخول) *</label>
            <input type="email" placeholder="example@gmail.com" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} required />

            <label style={{ fontWeight: 700, fontSize: 13 }}>رقم الهاتف (واتساب) *</label>
            <input type="tel" placeholder="06XXXXXXXX" style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} required />

            <label style={{ fontWeight: 700, fontSize: 13 }}>اسم الصالون أو المشروع *</label>
            <input type="text" placeholder="مثال: صالون أمينة" style={inputStyle} value={bizName} onChange={(e) => setBizName(e.target.value)} required />

            <label style={{ fontWeight: 700, fontSize: 13 }}>الرابط المختصر (بالحروف الإنجليزية بدون فراغات) *</label>
            <input type="text" placeholder="مثال: amina-salon" style={{ ...inputStyle, direction: 'ltr', textAlign: 'left', marginBottom: 6 }} value={slug} onChange={(e) => setSlug(e.target.value)} required />
            {cleanSlugPreview && (
              <div style={{ fontSize: 11, color: '#2563eb', background: '#eff6ff', padding: '6px 10px', borderRadius: 8, direction: 'ltr', textAlign: 'left' }}>
                3arboon-rouge.vercel.app/?p=<strong>{cleanSlugPreview}</strong>
              </div>
            )}
          </div>
          {/* القسم 2: الحساب البنكي والرمز السري */}
          <div style={sectionCard}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#1e3a8a', marginBottom: 12 }}>
              2. الحساب البنكي والرمز السري
            </div>

            <label style={{ fontWeight: 700, fontSize: 13 }}>اسم البنك</label>
            <select style={inputStyle} value={bankName} onChange={(e) => setBankName(e.target.value)}>
              <option value="CIH Bank">CIH Bank</option>
              <option value="Attijariwafa Bank">التجاري وفا بنك</option>
              <option value="Banque Populaire">البنك الشعبي</option>
              <option value="CashPlus / Wafacash">كاش بلوس / وفاكاش</option>
            </select>

            <label style={{ fontWeight: 700, fontSize: 13 }}>رقم الحساب البنكي (RIB) *</label>
            <input type="text" placeholder="24 رقماً" style={{ ...inputStyle, direction: 'ltr', textAlign: 'left' }} value={rib} onChange={(e) => setRib(e.target.value)} required />

            <label style={{ fontWeight: 700, fontSize: 13 }}>الرمز السري للوحة التحكم (4 أرقام) *</label>
            <input type="text" maxLength="6" placeholder="مثال: 2026" style={{ ...inputStyle, textAlign: 'center', letterSpacing: 4, fontWeight: 700 }} value={pin} onChange={(e) => setPin(e.target.value)} required />
          </div>

          {/* القسم 3: الخدمة الأولى */}
          <div style={sectionCard}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#1e3a8a', marginBottom: 12 }}>
              3. أضف خدمتك الأولى
            </div>

            <label style={{ fontWeight: 700, fontSize: 13 }}>اسم الخدمة *</label>
            <input type="text" placeholder="مثال: حلاقة وتصفيف" style={inputStyle} value={srvTitle} onChange={(e) => setSrvTitle(e.target.value)} required />

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 700, fontSize: 12 }}>الثمن الكامل (درهم) *</label>
                <input type="number" placeholder="200" style={inputStyle} value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 700, fontSize: 12 }}>مبلغ العربون (درهم) *</label>
                <input type="number" placeholder="50" style={inputStyle} value={deposit} onChange={(e) => setDeposit(e.target.value)} required />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none', padding: 15, borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(22,163,74,0.25)' }}
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء صفحتي الآن ✓'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            style={{ width: '100%', background: '#f1f5f9', border: 'none', color: '#475569', padding: 12, borderRadius: 12, marginTop: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit' }}
          >
            إلغاء والعودة
          </button>
        </form>
      </div>
    </div>
  );
}

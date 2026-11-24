import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function RegisterPage({ onCancel }) {
  const [bizName, setBizName] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
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

    try {
      const { data: prov, error: pErr } = await supabase
        .from('providers')
        .insert([{
          business_name: bizName,
          slug: cleanSlug,
          phone: phone,
          bank_name: bankName,
          rib: rib,
          pin_code: pin,
          is_active: true
        }])
        .select()
        .single();

      if (pErr) throw new Error('الرابط المختصر مستعمل مسبقاً أو هناك خطأ في البيانات');

      const { error: sErr } = await supabase.from('services').insert([{
        provider_id: prov.id,
        title: srvTitle,
        total_price: Number(totalPrice),
        deposit_amount: Number(deposit)
      }]);

      if (sErr) throw sErr;

      alert('تم إنشاء صفحتك بنجاح! سيتم توجيهك إليها الآن.');
      window.location.href = `?p=${cleanSlug}`;
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const input = { width: '100%', padding: 10, margin: '4px 0 12px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: 460, margin: 'auto', background: '#fff', padding: 20, borderRadius: 14 }}>
      <h2 style={{ textAlign: 'center', marginTop: 0 }}>أنشئ صفحة الحجز لمشروعك</h2>
      <form onSubmit={handleRegister}>
        <label>اسم الصالون أو المشروع</label>
        <input type="text" placeholder="مثال: صالون أمينة" style={input} value={bizName} onChange={(e) => setBizName(e.target.value)} required />

        <label>الرابط المختصر (بالحروف الإنجليزية بدون فراغات)</label>
        <input type="text" placeholder="مثال: amina-salon" style={input} value={slug} onChange={(e) => setSlug(e.target.value)} required />

        <label>رقم الواتساب</label>
        <input type="tel" placeholder="06XXXXXXXX" style={input} value={phone} onChange={(e) => setPhone(e.target.value)} required />

        <label>اسم البنك</label>
        <select style={input} value={bankName} onChange={(e) => setBankName(e.target.value)}>
          <option value="CIH Bank">CIH Bank</option>
          <option value="Attijariwafa Bank">التجاري وفا بنك</option>
          <option value="Banque Populaire">البنك الشعبي</option>
          <option value="CashPlus / Wafacash">كاش بلوس / وفاكاش</option>
        </select>

        <label>رقم الحساب البنكي (RIB)</label>
        <input type="text" placeholder="24 رقماً" style={input} value={rib} onChange={(e) => setRib(e.target.value)} required />

        <label>الرمز السري للوحة التحكم (4 أرقام)</label>
        <input type="text" maxLength="6" placeholder="مثال: 2026" style={input} value={pin} onChange={(e) => setPin(e.target.value)} required />

        <hr style={{ margin: '16px 0', border: '0', borderTop: '1px solid #e2e8f0' }} />
        <strong style={{ display: 'block', marginBottom: 8 }}>أضف خدمتك الأولى:</strong>

        <label>اسم الخدمة</label>
        <input type="text" placeholder="مثال: حلاقة وتصفيف" style={input} value={srvTitle} onChange={(e) => setSrvTitle(e.target.value)} required />

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label>الثمن الكامل (درهم)</label>
            <input type="number" placeholder="200" style={input} value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label>مبلغ العربون (درهم)</label>
            <input type="number" placeholder="50" style={input} value={deposit} onChange={(e) => setDeposit(e.target.value)} required />
          </div>
        </div>

        <button type="submit" disabled={loading} style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none', padding: 12, borderRadius: 10, fontWeight: 'bold', marginTop: 8 }}>
          {loading ? 'جاري الإنشاء...' : 'إنشاء صفحتي الآن'}
        </button>

        <button type="button" onClick={onCancel} style={{ width: '100%', background: 'none', border: 'none', color: '#64748b', marginTop: 12, cursor: 'pointer' }}>
          إلغاء والعودة
        </button>
      </form>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import StatsTab from './StatsTab';
import HolidaysSection from './HolidaysSection';
import PremiumTab from './PremiumTab';
import AiToolsTab from './AiToolsTab';
import SubscriptionBanner from './SubscriptionBanner';
const ALL_HALF_HOURS = [];
for (let h = 8; h <= 23; h++) {
  const hh = String(h).padStart(2, '0');
  ALL_HALF_HOURS.push(hh + ':00');
  ALL_HALF_HOURS.push(hh + ':30');
}

export default function DashboardPage({ provider, bookings = [], services = [], onRefresh }) {
  const [tab, setTab] = useState('bookings');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [bizName, setBizName] = useState(provider.business_name || '');
  const [ownerName, setOwnerName] = useState(provider.owner_name || '');
  const [phone, setPhone] = useState(provider.phone || '');
  const [email, setEmail] = useState(provider.email || '');
  const [pinCode, setPinCode] = useState(provider.pin_code || '');
  const [logoUrl, setLogoUrl] = useState(provider.logo_url || '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [googleMapsUrl, setGoogleMapsUrl] = useState(
    provider.google_maps_url ||
    (provider.latitude && provider.longitude
      ? 'https://google.com' + provider.latitude + ',' + provider.longitude
      : '')
  );
  const [locating, setLocating] = useState(false);
  const [bio, setBio] = useState(provider.bio || '');

  const [improvingBio, setImprovingBio] = useState(false);
  const [checkingReceiptId, setCheckingReceiptId] = useState(null);
  const [receiptReports, setReceiptReports] = useState({});

  const [generatingAd, setGeneratingAd] = useState(false);
  const [generatedAdText, setGeneratedAdText] = useState('');

  const [analyzingStats, setAnalyzingStats] = useState(false);
  const [statsAdvice, setStatsAdvice] = useState('');

  const [summarizingReviews, setSummarizingReviews] = useState(false);
  const [reviewsSummary, setReviewsSummary] = useState('');

  const [bizCategory, setBizCategory] = useState(provider.category || 'صالون حلاقة وتجميل');
  const [suggestingServices, setSuggestingServices] = useState(false);
  const [suggestedServices, setSuggestedServices] = useState([]);
  const [retClientName, setRetClientName] = useState('');
  const [retClientPhone, setRetClientPhone] = useState('');
  const [retLastDate, setRetLastDate] = useState('');
  const [generatingRet, setGeneratingRet] = useState(false);
  const [retMessage, setRetMessage] = useState('');

  const [testQuestion, setTestQuestion] = useState('');
  const [askingAI, setAskingAI] = useState(false);
  const [aiReply, setAiReply] = useState('');

  const initialPayments = (Array.isArray(provider.payment_methods) && provider.payment_methods> 0)
    ? provider.payment_methods
    : (provider.rib ? [{ bank: provider.bank_name || 'CIH Bank', account: provider.rib }] : []);
  const [paymentMethods, setPaymentMethods] = useState(initialPayments);
  const [newBank, setNewBank] = useState('CIH Bank');
  const [newAccount, setNewAccount] = useState('');

  const initialHours = (Array.isArray(provider.working_hours) && provider.working_hours> 0)
    ? provider.working_hours
    : ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];
  const [workingHours, setWorkingHours] = useState(initialHours);
  const [savingSettings, setSavingSettings] = useState(false);

  const sectionCard = {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    fontSize: 13,
    marginBottom: 10,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    background: '#fff'
  };
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://googleapis.com';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const bookingLink = window.location.origin + '/?p=' + provider.slug;

  const formatMoroccanPhone = (rawPhone) => {
    let ph = String(rawPhone || '').replace(/\D/g, '');
    if (ph.startsWith('0')) {
      ph = '212' + ph.slice(1);
    } else if (ph && !ph.startsWith('212')) {
      ph = '212' + ph;
    }
    return ph;
  };

  const getWhatsAppUrl = (b, customMsg) => {
    const ph = formatMoroccanPhone(b.client_phone);
    const defaultMsg = 'مرحبا ' + b.client_name + '، تم تأكيد موعدك في ' + provider.business_name + ' يوم ' + b.booking_date + ' الساعة ' + b.booking_time;
    return 'https://wa.me' + ph + '?text=' + encodeURIComponent(customMsg || defaultMsg);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = async () => {
    const textMsg = 'مرحبا! يمكنك حجز موعدك في ' + provider.business_name + ' مباشرة عبر الرابط التالي:\n' + bookingLink;
    if (navigator.share) {
      try {
        await navigator.share({ title: provider.business_name, text: textMsg, url: bookingLink });
        return;
      } catch (err) {}
    }
    window.open('https://wa.me?text=' + encodeURIComponent(textMsg), '_blank');
  };

  // 1. تحسين الوصف (improve_bio)
  const handleImproveBioAI = async () => {
    setImprovingBio(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { action: 'improve_bio', businessName: bizName, bio: bio }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.result) setBio(data.result);
    } catch (err) {
      alert('تعذر تحسين الوصف: ' + err.message);
    } finally {
      setImprovingBio(false);
    }
  };

  // 2. فحص وصل العربون (verify_receipt)
  const handleVerifyReceiptAI = async (b) => {
    if (!b.receipt_url) return;
    setCheckingReceiptId(b.id);
    try {
      const srv = services.find((s) => String(s.id) === String(b.service_id));
      const expectedAmount = srv ? srv.deposit_amount : 'غير محدد';
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { action: 'verify_receipt', receiptUrl: b.receipt_url, expectedAmount }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.result) {
        setReceiptReports((prev) => ({ ...prev, [b.id]: data.result }));
      }
    } catch (err) {
      alert('تعذر فحص الوصل: ' + err.message);
    } finally {
      setCheckingReceiptId(null);
    }
  };
  // 3. صانع الإعلانات (generate_ad)
  const handleGenerateAdAI = async () => {
    setGeneratingAd(true);
    try {
      const servicesList = services((s) => `${s.title} (${s.total_price} درهم)`).join('، ');
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'generate_ad',
          businessName: bizName,
          bio,
          servicesList,
          bookingLink
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedAdText(data?.result || '');
    } catch (err) {
      alert('تعذر توليد الإعلان: ' + err.message);
    } finally {
      setGeneratingAd(false);
    }
  };

  // 4. تحليل الأرباح والإحصائيات (analyze_stats)
  const handleAnalyzeStatsAI = async () => {
    setAnalyzingStats(true);
    try {
          const confirmed = bookings((b) => b.status === 'confirmed').length;
      const cancelled = bookings((b) => b.status === 'cancelled').length;
      const summary = `إجمالي الحجوزات: ${bookings.length}، المؤكدة: ${confirmed}، الملغاة: ${cancelled}، عدد الخدمات: ${services.length}`;

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'analyze_stats',
          businessName: bizName,
          statsSummary: summary
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStatsAdvice(data?.result || '');
    } catch (err) {
      alert('تعذر تحليل الإحصائيات: ' + err.message);
    } finally {
      setAnalyzingStats(false);
    }
  };

  // 5. ملخص التقييمات (summarize_reviews)
  const handleSummarizeReviewsAI = async () => {
    setSummarizingReviews(true);
    try {
      const { data: revData } = await supabase
        .from('reviews')
        .select('rating, comment')
        .eq('provider_id', provider.id);

      const reviewsList = (revData && revData> 0)
        ? revData((r) => `(${r.rating}/5): ${r.comment}`).join('\n')
        : 'لا توجد تقييمات مسجلة حالياً.';

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'summarize_reviews',
          businessName: bizName,
          reviewsList
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setReviewsSummary(data?.result || '');
    } catch (err) {
      alert('تعذر تلخيص التقييمات: ' + err.message);
    } finally {
      setSummarizingReviews(false);
    }
  };
  // 6. اقتراح الخدمات والأسعار (suggest_services)
  const handleSuggestServicesAI = async () => {
    setSuggestingServices(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'suggest_services',
          businessCategory: bizCategory
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const clean = (data?.result || '[]').replace(/```json|```/g, '').trim();
      setSuggestedServices(JSON.parse(clean));
    } catch (err) {
      alert('تعذر اقتراح الخدمات: ' + err.message);
    } finally {
      setSuggestingServices(false);
    }
  };

  const handleQuickAddService = async (srv) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('services').insert([{
        provider_id: provider.id,
        title: srv.title,
        total_price: Number(srv.total_price),
        deposit_amount: Number(srv.deposit_amount)
      }]);
      if (error) throw error;
      setSuggestedServices((prev) => prev((item) => item.title !== srv.title));
      if (onRefresh) await onRefresh();
    } catch (err) {
      alert('خطأ أثناء إضافة الخدمة: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 7. رسالة استرجاع زبون (retention_message)
  const handleRetentionAI = async () => {
    if (!retClientName.trim()) return alert('اكتب اسم الزبون أولاً');
    setGeneratingRet(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'retention_message',
          businessName: bizName,
          clientName: retClientName,
          lastVisitDate: retLastDate || 'منذ مدة',
          bookingLink
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRetMessage(data?.result || '');
    } catch (err) {
      alert('تعذر توليد الرسالة: ' + err.message);
    } finally {
      setGeneratingRet(false);
    }
  };

  // 8. تجربة موظف الاستقبال الذكي (ask_receptionist)
  const handleAskReceptionistAI = async () => {
    if (!testQuestion.trim()) return;
    setAskingAI(true);
    try {
      const providerContext = `المحل: ${bizName}. الوصف: ${bio}. الخدمات: ${services((s) => `${s.title} بـ ${s.total_price} درهم`).join('، ')}. أوقات العمل: ${workingHours.join('، ')}`;
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'ask_receptionist',
          businessName: bizName,
          providerContext,
          question: testQuestion
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiReply(data?.result || '');
    } catch (err) {
      alert('تعذر الرد: ' + err.message);
    } finally {
      setAskingAI(false);
    }
  };
  const upcomingReminders = bookings((b) => {
    if (b.status !== 'confirmed' || b.reminder_sent) return false;
    if (!b.booking_date || !b.booking_time) return false;
    const apptTime = new Date(b.booking_date + 'T' + b.booking_time + ':00');
    if (isNaN(apptTime.getTime())) return false;
    const now = new Date();
    const diffHours = (apptTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours <= 2 && diffHours >= -1;
  });

  const handleSendReminder = async (b) => {
    setUpdatingId(b.id);
    const { data, error } = await supabase
      .from('')
      .update({ reminder_sent: true })
      .eq('id', b.id)
      .select();

    setUpdatingId(null);

    if (error) return alert('خطأ في قاعدة البيانات: ' + error.message);
    if (!data || data=== 0) {
      return alert('تعذر التحديث: تأكد من تفعيل صلاحية UPDATE في إعدادات RLS لجدول  في Supabase.');
    }

    if (onRefresh) await onRefresh();

    const msg = 'مرحبا ' + b.client_name + '، نذكرك بموعدك اليوم في ' + provider.business_name + ' على الساعة ' + b.booking_time + '. نتشرف بحضورك!';
    window.open(getWhatsAppUrl(b, msg), '_blank');
  };

  const updateStatus = async (b, newStatus) => {
    setUpdatingId(b.id);
    const { data, error } = await supabase
      .from('')
      .update({ status: newStatus })
      .eq('id', b.id)
      .select();

    setUpdatingId(null);

    if (error) return alert('خطأ في التحديث: ' + error.message);
    if (!data || data=== 0) {
      return alert('تعذر التحديث: تحقق من صلاحيات RLS لجدول .');
    }

    if (onRefresh) await onRefresh();

    if (newStatus === 'confirmed') {
      window.open(getWhatsAppUrl(b), '_blank');
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    if (!title.trim() || !price) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('services').insert([{
        provider_id: provider.id,
        title: title.trim(),
        total_price: Number(price),
        deposit_amount: Number(deposit || 0)
      }]);
      if (error) throw error;
      setTitle('');
      setPrice('');
      setDeposit('');
      if (onRefresh) await onRefresh();
    } catch (err) {
      alert('خطأ أثناء إضافة الخدمة: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    try {
      const { error } = await supabase.from('services').delete().eq('id', serviceId);
      if (error) throw error;
      if (onRefresh) await onRefresh();
    } catch (err) {
      alert('تعذر الحذف: ' + err.message);
    }
  };
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.item(0);
    if (!file) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = 'logos/' + provider.id + '_' + Date.now() + '.' + ext;
      const { error: upErr } = await supabase.storage.from('receipts').upload(fileName, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
      setLogoUrl(urlData.publicUrl);
      alert('تم رفع اللوجو بنجاح! اضغط "حفظ جميع الإعدادات" بالأسفل لتأكيده ✅');
    } catch (err) {
      alert('خطأ أثناء رفع اللوجو: ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleGenerateGpsLink = () => {
    if (!navigator.geolocation) {
      return alert('متصفحك لا يدعم تحديد الموقع التلقائي');
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const lat = Number(position.coords.latitude).toFixed(6);
        const lng = Number(position.coords.longitude).toFixed(6);
        const link = 'https://google.com' + lat + ',' + lng;
        setGoogleMapsUrl(link);
        alert('تم إنشاء رابط خرائط جوجل لموقعك الحالي بنجاح 📍');
      },
      () => {
        setLocating(false);
        alert('يرجى تفعيل GPS في الهاتف والسماح للمتصفح بالوصول للموقع.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const toggleWorkingHour = (hr) => {
    setWorkingHours((prev) =>
      prev.includes(hr) ? prev((h) => h !== hr) : [...prev, hr].sort()
    );
  };

  const addPaymentMethod = () => {
    if (!newAccount.trim()) return;
    setPaymentMethods((prev) => [...prev, { bank: newBank, account: newAccount.trim() }]);
    setNewAccount('');
  };

  const removePaymentMethod = (idx) => {
    setPaymentMethods((prev) => prev((_, i) => i !== idx));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('providers')
        .update({
          business_name: bizName,
          owner_name: ownerName,
          phone: phone,
          email: email,
          pin_code: pinCode,
          logo_url: logoUrl,
          google_maps_url: googleMapsUrl,
          bio: bio,
          payment_methods: paymentMethods,
          working_hours: workingHours
        })
        .eq('id', provider.id);

      if (error) throw error;
      alert('تم حفظ جميع الإعدادات بنجاح ✅');
      if (onRefresh) await onRefresh();
    } catch (err) {
      alert('خطأ أثناء حفظ الإعدادات: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };
  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '16px 12px 48px', fontFamily: "'Cairo', sans-serif", direction: 'rtl' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <SubscriptionBanner provider={provider} onUpgrade={() => setTab('premium')} />

        {/* بطاقة الهيدر ومشاركة الرابط */}
        <div style={{ background: '#fff', borderRadius: 18, padding: 16, border: '1px solid #e2e8f0', marginBottom: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb' }} />
              ) : (
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>
                  3
                </div>
              )}
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{bizName}</h2>
                <span style={{ fontSize: 12, color: '#64748b' }}>لوحة تحكم 3arboon</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleCopyLink}
              style={{ flex: 1, background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', padding: '9px 12px', borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {copied ? 'تم نسخ الرابط ✅' : 'نسخ رابط الحجز 🔗'}
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none', padding: '9px 12px', borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              مشاركة عبر واتساب 📲
            </button>
          </div>
        </div>

        {/* شريط التبويبات */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
          {[
            { id: 'bookings', label: `📅 الحجوزات (${bookings.length})` },
            { id: 'ai', label: '🤖 الذكاء الاصطناعي' },
            { id: 'services', label: `✂️ الخدمات (${services.length})` },
            { id: 'stats', label: '📊 الإحصائيات' },
            { id: 'settings', label: '⚙️ الإعدادات' },
            { id: 'premium', label: '👑 الاشتراك' }
          ]map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: '9px 14px',
                borderRadius: 12,
                border: 'none',
                background: tab === t.id ? (t.id === 'ai' ? '#7c3aed' : '#2563eb') : '#fff',
                color: tab === t.id ? '#fff' : '#475569',
                fontWeight: 800,
                fontSize: 12,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
              }}
            >
              {t.label}
            </button>
            <button
  type="button"
  onClick={() => setTab('ai')}
  style={{
    padding: '9px 14px',
    borderRadius: 12,
    border: 'none',
    background: tab === 'ai' ? '#7c3aed' : '#fff',
    color: tab === 'ai' ? '#fff' : '#475569',
    fontWeight: 800,
    fontSize: 12,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
  }}
>
  🤖 الذكاء الاصطناعي
</button>

          ))}
        </div>

        {/* تنبيهات التذكير بالواتساب */}
        {upcomingReminders> 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 14, padding: 12, marginBottom: 14 }}>
            <strong style={{ display: 'block', fontSize: 13, color: '#92400e', marginBottom: 8 }}>⏰ مواعيد تقترب خلال ساعتين:</strong>
            {upcomingReminders((b) => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 10px', borderRadius: 10, border: '1px solid #fde68a', marginBottom: 6 }}>
                <span style={{ fontSize: 12 }}><strong>{b.client_name}</strong> ({b.booking_time})</span>
                <button
                  type="button"
                  onClick={() => handleSendReminder(b)}
                  disabled={updatingId === b.id}
                  style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  تذكير واتساب 📲
                </button>
              </div>
            ))}
          </div>
        )}

        {/* تبويب الحجوزات */}
        {tab === 'bookings' && (
          <div>
            {bookings=== 0 ? (
              <div style={{ background: '#fff', borderRadius: 16, padding: 30, textAlign: 'center', border: '1px solid #e2e8f0', color: '#64748b', fontSize: 14 }}>
                لا توجد حجوزات مسجلة حالياً.
              </div>
            ) : (
              bookings((b) => {
                const srv = services.find((s) => String(s.id) === String(b.service_id));
                return (
                  <div key={b.id} style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #e2e8f0', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <strong style={{ fontSize: 15, color: '#0f172a' }}>{b.client_name}</strong>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: 20,
                        background: b.status === 'confirmed' ? '#dcfce7' : b.status === 'cancelled' ? '#fee2e2' : '#fef3c7',
                        color: b.status === 'confirmed' ? '#166534' : b.status === 'cancelled' ? '#991b1b' : '#92400e'
                      }}>
                        {b.status === 'confirmed' ? 'مؤكد ✓' : b.status === 'cancelled' ? 'ملغى ✕' : 'قيد المراجعة ⏳'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>
                      📅 {b.booking_date} • ⏰ {b.booking_time} • 📱 {b.client_phone}
                    </div>
                    {srv && (
                      <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, marginBottom: 10 }}>
                        الخدمة: {srv.title} ({srv.total_price} درهم • العربون: {srv.deposit_amount} درهم)
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 6, marginBottom: b.receipt_url ? 10 : 0 }}>
                      {b.status !== 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => updateStatus(b, 'confirmed')}
                          disabled={updatingId === b.id}
                          style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none', padding: '8px 10px', borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          تأكيد + واتساب ✅
                        </button>
                      )}
                      {b.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => updateStatus(b, 'cancelled')}
                          disabled={updatingId === b.id}
                          style={{ flex: 1, background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 10px', borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          إلغاء ✕
                        </button>
                      )}
                    </div>

                    {b.receipt_url && (
                      <div style={{ background: '#f8fafc', padding: 10, borderRadius: 12, border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <a href={b.receipt_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>
                            🧾 عرض وصل التحويل ↗
                          </a>
                          <button
                            type="button"
                            onClick={() => handleVerifyReceiptAI(b)}
                            disabled={checkingReceiptId === b.id}
                            style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            {checkingReceiptId === b.id ? 'جاري الفحص...' : 'فحص الوصل بالذكاء الاصطناعي 🤖'}
                          </button>
                        </div>
                        {receiptReports[b.id] && (
                          <div style={{ marginTop: 8, background: '#fff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#0f172a', whiteSpace: 'pre-wrap' }}>
                            {receiptReports[b.id]}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
        {/* تبويب مساعدي الذكاء الاصطناعي */}
        {tab === 'ai' && (
          <div>
            {/* 1. صانع الإعلانات */}
            <div style={sectionCard}>
              <strong style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#1e3a8a' }}>
                📣 صانع إعلانات واتساب وإنستغرام:
              </strong>
              <p style={{ fontSize: 12, color: '#475569', marginBottom: 10 }}>
                يولّد إعلاناً جذاباً بالدارجة المغربية يتضمن خدماتك ورابط حجزك المباشر.
              </p>
              <button
                type="button"
                onClick={handleGenerateAdAI}
                disabled={generatingAd}
                style={{ width: '100%', background: '#7c3aed', color: '#fff', border: 'none', padding: 11, borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {generatingAd ? 'جاري كتابة الإعلان...' : 'توليد إعلان ترويجي ✨'}
              </button>
              {generatedAd && (
                <div style={{ marginTop: 10, background: '#fff', padding: 12, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                  {generatedAd}
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(generatedAd); alert('تم نسخ الإعلان ✅'); }}
                    style={{ display: 'block', marginTop: 8, background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    نسخ النص 📋
                  </button>
                </div>
              )}
            </div>

            {/* 2. مستشار تحليل الأرباح */}
            <div style={sectionCard}>
              <strong style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#1e3a8a' }}>
                📊 مستشار تحليل الأرباح والمواعيد:
              </strong>
              <button
                type="button"
                onClick={handleAnalyzeStatsAI}
                disabled={analyzingStats}
                style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: 11, borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {analyzingStats ? 'جاري التحليل...' : 'تحليل إحصائياتي وتقديم 3 نصائح 💡'}
              </button>
              {statsAdvice && (
                <div style={{ marginTop: 10, background: '#fff', padding: 12, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                  {statsAdvice}
                </div>
              )}
            </div>

            {/* 3. ملخص تقييمات الزبناء */}
            <div style={sectionCard}>
              <strong style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#1e3a8a' }}>
                ⭐ ملخص تقييمات الزبناء:
              </strong>
              <button
                type="button"
                onClick={handleSummarizeReviewsAI}
                disabled={summarizingReviews}
                style={{ width: '100%', background: '#1e293b', color: '#fff', border: 'none', padding: 11, borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {summarizingReviews ? 'جاري التلخيص...' : 'تلخيص آراء الزبناء 📝'}
              </button>
              {reviewsSummary && (
                <div style={{ marginTop: 10, background: '#fff', padding: 12, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                  {reviewsSummary}
                </div>
              )}
            </div>
            {/* 4. مقترح الخدمات والأسعار */}
            <div style={sectionCard}>
              <strong style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#1e3a8a' }}>
                ✂️ اقتراح خدمات وأسعار تلقائياً:
              </strong>
              <input
                type="text"
                placeholder="نوع المشروع (مثال: صالون تجميل، عيادة أسنان...)"
                style={inputStyle}
                value={bizCategory}
                onChange={(e) => setBizCategory(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSuggestServicesAI}
                disabled={suggestingServices}
                style={{ width: '100%', background: '#7c3aed', color: '#fff', border: 'none', padding: 11, borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {suggestingServices ? 'جاري الاقتراح...' : 'اقترح 5 خدمات مع العربون ✨'}
              </button>
              {suggestedServices((srv, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: 10, borderRadius: 10, border: '1px solid #cbd5e1', marginTop: 8 }}>
                  <div style={{ fontSize: 12 }}>
                    <strong style={{ display: 'block' }}>{srv.title}</strong>
                    <span style={{ color: '#475569' }}>الثمن: {srv.total_price} درهم • العربون: {srv.deposit_amount} درهم</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickAddService(srv)}
                    disabled={saving}
                    style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    + إضافة
                  </button>
                </div>
              ))}
            </div>

            {/* 5. رسالة استرجاع الزبناء */}
            <div style={sectionCard}>
              <strong style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#1e3a8a' }}>
                💌 رسالة استرجاع زبون سابق:
              </strong>
              <input type="text" placeholder="اسم الزبون" style={inputStyle} value={retClientName} onChange={(e) => setRetClientName(e.target.value)} />
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="tel" placeholder="رقم واتساب" style={{ ...inputStyle, flex: 1 }} value={retClientPhone} onChange={(e) => setRetClientPhone(e.target.value)} />
                <input type="text" placeholder="آخر زيارة (منذ شهر)" style={{ ...inputStyle, flex: 1 }} value={retLastDate} onChange={(e) => setRetLastDate(e.target.value)} />
              </div>
              <button
                type="button"
                onClick={handleRetentionAI}
                disabled={generatingRet}
                style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none', padding: 11, borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {generatingRet ? 'جاري الصياغة...' : 'توليد رسالة واتساب 📲'}
              </button>
              {retMessage && (
                <div style={{ marginTop: 10, background: '#fff', padding: 12, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                  {retMessage}
                  {retClientPhone && (
                    <a
                      href={'https://wa.me' + formatMoroccanPhone(retClientPhone) + '?text=' + encodeURIComponent(retMessage)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'inline-block', marginTop: 8, background: '#16a34a', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                    >
                      إرسال الآن عبر واتساب ↗
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* 6. تجربة موظف الاستقبال الذكي */}
            <div style={sectionCard}>
              <strong style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#1e3a8a' }}>
                🤖 تجربة موظف الاستقبال الذكي:
              </strong>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  placeholder="اسأل سؤالاً تجريبياً من زبون..."
                  style={{ ...inputStyle, margin: 0, flex: 1 }}
                  value={testQuestion}
                  onChange={(e) => setTestQuestion(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleAskReceptionistAI}
                  disabled={askingAI}
                  style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '0 16px', borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {askingAI ? '...' : 'اسأل'}
                </button>
              </div>
              {aiReply && (
                <div style={{ marginTop: 10, background: '#f3e8ff', color: '#4c1d95', padding: 12, borderRadius: 10, border: '1px solid #d8b4fe', fontSize: 13 }}>
                  {aiReply}
                </div>
              )}
            </div>
          </div>
        )}

        {/* تبويب الخدمات */}
        {tab === 'services' && (
          <div>
            <form onSubmit={handleAddService} style={sectionCard}>
              <strong style={{ display: 'block', marginBottom: 10, fontSize: 14, color: '#1e3a8a' }}>➕ إضافة خدمة جديدة:</strong>
              <input type="text" placeholder="اسم الخدمة" style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} required />
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" placeholder="الثمن (درهم)" style={inputStyle} value={price} onChange={(e) => setPrice(e.target.value)} required />
                <input type="number" placeholder="العربون (درهم)" style={inputStyle} value={deposit} onChange={(e) => setDeposit(e.target.value)} required />
              </div>
              <button type="submit" disabled={saving} style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: 12, borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'جاري الحفظ...' : 'حفظ الخدمة ✓'}
              </button>
            </form>

            {services((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0', background: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 10 }}>
                <div>
                  <strong style={{ display: 'block', fontSize: 14, color: '#0f172a' }}>{s.title}</strong>
                  <small style={{ color: '#475569', fontSize: 12 }}>الثمن: {s.total_price} درهم • العربون: <strong style={{ color: '#16a34a' }}>{s.deposit_amount} درهم</strong></small>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteService(s.id)}
                  style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '7px 12px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'stats' && <StatsTab provider={provider} bookings={bookings} services={services} />}
        {tab === 'ai' && <AiToolsTab provider={provider} bookings={bookings} services={services} onRefresh={onRefresh} />}
      {tab === 'premium' && <PremiumTab provider={provider} onRefresh={onRefresh} />}
        {/* تبويب الإعدادات */}
        {tab === 'settings' && (
          <>
            <HolidaysSection provider={provider} onRefresh={onRefresh} />
            <form onSubmit={handleSaveSettings}>
              <div style={sectionCard}>
                <strong style={{ display: 'block', marginBottom: 10, fontSize: 14, color: '#1e3a8a' }}>
                  🖼️ هوية المشروع والموقع الجغرافي:
                </strong>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, background: '#fff', padding: 10, borderRadius: 12, border: '1px solid #cbd5e1' }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb' }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                      🏪
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                      {uploadingLogo ? 'جاري رفع اللوجو...' : 'اختر صورة لوجو المشروع:'}
                    </label>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} style={{ fontSize: 12, width: '100%' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>📍 رابط موقعك على خرائط جوجل:</label>
                  <button
                    type="button"
                    onClick={handleGenerateGpsLink}
                    disabled={locating}
                    style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {locating ? 'جاري التحديد...' : 'توليد عبر GPS 🎯'}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="https://google.com..."
                  style={{ ...inputStyle, direction: 'ltr', textAlign: 'left' }}
                  value={googleMapsUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    const match = val.match(/https?:\/\/[^\s]+/);
                    setGoogleMapsUrl(match ? match.at(0) : val);
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 13, fontWeight: 700 }}>ℹ️ معلومات عن المحل:</label>
                  <button
                    type="button"
                    onClick={handleImproveBioAI}
                    disabled={improvingBio}
                    style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {improvingBio ? 'جاري الصياغة...' : 'تحسين بالذكاء الاصطناعي ✨'}
                  </button>
                </div>
                <textarea
                  rows="3"
                  placeholder="مثال: صالون تجميل وحلاقة للنساء - حي جليز مراكش قرب مقهى..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <div style={sectionCard}>
                <strong style={{ display: 'block', marginBottom: 10, fontSize: 14, color: '#1e3a8a' }}>🏦 البنوك وطرق الدفع المتاحة:</strong>
                {paymentMethods((pm, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', marginBottom: 8 }}>
                    <div style={{ fontSize: 13 }}>
                      <strong>{pm.bank}</strong>: <span style={{ direction: 'ltr', display: 'inline-block' }}>{pm.account}</span>
                    </div>
                    <button type="button" onClick={() => removePaymentMethod(idx)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, padding: '5px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                      حذف
                    </button>
                  </div>
                ))}

                <select style={inputStyle} value={newBank} onChange={(e) => setNewBank(e.target.value)}>
                  <option value="CIH Bank">CIH Bank</option>
                  <option value="التجاري وفا بنك">التجاري وفا بنك</option>
                  <option value="البنك الشعبي">البنك الشعبي</option>
                  <option value="Bank of Africa (BMCE)">Bank of Africa (BMCE)</option>
                  <option value="البريد بنك">البريد بنك</option>
                  <option value="CashPlus / Wafacash">كاش بلوس / وفاكاش</option>
                  <option value="Orange Money / inwi money">أورنج موني / إنوي موني</option>
                </select>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="text" placeholder="رقم RIB أو رقم الهاتف" style={{ ...inputStyle, margin: 0, flex: 2 }} value={newAccount} onChange={(e) => setNewAccount(e.target.value)} />
                  <button type="button" onClick={addPaymentMethod} style={{ flex: 1, background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                    + إضافة
                  </button>
                </div>
              </div>

              <div style={sectionCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: 14, color: '#1e3a8a' }}>⏰ أوقات العمل (كل 30 دقيقة):</strong>
                  <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 800 }}>{workingHours.length} وقت متاح</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, direction: 'ltr' }}>
                  {ALL_HALF_HOURS((hr) => {
                    const isSelected = workingHours.includes(hr);
                    return (
                      <button
                        key={hr}
                        type="button"
                        onClick={() => toggleWorkingHour(hr)}
                        style={{
                          padding: '8px 4px',
                          borderRadius: 8,
                          border: isSelected ? '1px solid #16a34a' : '1px solid #cbd5e1',
                          background: isSelected ? '#16a34a' : '#fff',
                          color: isSelected ? '#fff' : '#64748b',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                          fontFamily: 'inherit'
                        }}
                      >
                        {hr}
                      </button>
                    );
                  })}
                     </div>
    </div>
  );
}


              <div style={sectionCard}>
                <strong style={{ display: 'block', marginBottom: 10, fontSize: 14, color: '#1e3a8a' }}>👤 تعديل بيانات الحساب:</strong>
                <label style={{ fontSize: 13, fontWeight: 700 }}>اسم المشروع / الصالون</label>
                <input type="text" style={inputStyle} value={bizName} onChange={(e) => setBizName(e.target.value)} required />

                <label style={{ fontSize: 13, fontWeight: 700 }}>اسم صاحب المشروع</label>
                <input type="text" style={inputStyle} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />

                <label style={{ fontSize: 13, fontWeight: 700 }}>رقم الهاتف (واتساب)</label>
                <input type="tel" style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} required />

                <label style={{ fontSize: 13, fontWeight: 700 }}>البريد الإلكتروني</label>
                <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />

                <label style={{ fontSize: 13, fontWeight: 700 }}>الرمز السري (PIN)</label>
                <input type="text" maxLength="6" style={{ ...inputStyle, textAlign: 'center', letterSpacing: 4, fontWeight: 700 }} value={pinCode} onChange={(e) => setPinCode(e.target.value)} required />
              </div>

              <button type="submit" disabled={savingSettings} style={{ width: '100%', background: '#16a34a', color: '#fff', border: 'none', padding: 14, borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(22,163,74,0.25)' }}>
                {savingSettings ? 'جاري الحفظ...' : 'حفظ جميع الإعدادات ✅'}
              </button>
            </form>
          </>
        )}
          </div>
    </div>
  );
}

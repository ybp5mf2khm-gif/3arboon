import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import StatsTab from './StatsTab';
import HolidaysSection from './HolidaysSection';
import PremiumTab from './PremiumTab';
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

  // بيانات الإعدادات
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
  // حالات الذكاء الاصطناعي (8 مساعدين)
  const [improvingBio, setImprovingBio] = useState(false);
  const [checkingReceiptId, setCheckingReceiptId] = useState(null);
  const [receiptReports, setReceiptReports] = useState({});

  const [generatingAd, setGeneratingAd] = useState(false);
  const [generatedAdText, setGeneratedAdText] = useState('');

  const [analyzingStats, setAnalyzingStats] = useState(false);
  const [statsAdvice, setStatsAdvice] = useState('');

  const [summarizingReviews, setSummarizingReviews] = useState(false);
  const [reviewsSummary, setReviewsSummary] = useState('');

  const [businessCategory, setBusinessCategory] = useState(provider.category || 'صالون حلاقة وتجميل');
  const [suggestingServices, setSuggestingServices] = useState(false);
  const [suggestedServicesList, setSuggestedServicesList] = useState([]);

  const [retentionClientName, setRetentionClientName] = useState('');
  const [retentionClientPhone, setRetentionClientPhone] = useState('');
  const [retentionLastDate, setRetentionLastDate] = useState('');
  const [generatingRetention, setGeneratingRetention] = useState(false);
  const [retentionMsg, setRetentionMsg] = useState('');

  const [testQuestion, setTestQuestion] = useState('');
  const [testingReceptionist, setTestingReceptionist] = useState(false);
  const [receptionistAnswer, setReceptionistAnswer] = useState('');

  // طرق الدفع وساعات العمل
  const initialPayments = (Array.isArray(provider.payment_methods) && provider.payment_methods.length > 0)
    ? provider.payment_methods
    : (provider.rib ? [{ bank: provider.bank_name || 'CIH Bank', account: provider.rib }] : []);
  const [paymentMethods, setPaymentMethods] = useState(initialPayments);
  const [newBank, setNewBank] = useState('CIH Bank');
  const [newAccount, setNewAccount] = useState('');

  const initialHours = (Array.isArray(provider.working_hours) && provider.working_hours.length > 0)
    ? provider.working_hours
    : ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];
  const [workingHours, setWorkingHours] = useState(initialHours);
  const [savingSettings, setSavingSettings] = useState(false);

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

  // ==================== دوال الذكاء الاصطناعي (ai-assistant) ====================

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
        body: {
          action: 'verify_receipt',
          receiptUrl: b.receipt_url,
          expectedAmount: expectedAmount
        }
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
      const servicesText = services.map((s) => `${s.title} (${s.total_price} درهم)`).join('، ');
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'generate_ad',
          businessName: bizName,
          bio: bio,
          servicesList: servicesText,
          bookingLink: bookingLink
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedAdText(data.result || '');
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
      const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
      const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length;
      const pendingCount = bookings.filter((b) => b.status === 'pending').length;
      const totalRevenue = bookings
        .filter((b) => b.status === 'confirmed')
        .reduce((acc, b) => {
          const srv = services.find((s) => String(s.id) === String(b.service_id));
          return acc + (srv ? Number(srv.total_price || 0) : 0);
        }, 0);

      const summary = `إجمالي الحجوزات: ${bookings.length} | المؤكدة: ${confirmedCount} | قيد الانتظار: ${pendingCount} | الملغاة: ${cancelledCount} | المداخيل التقديرية: ${totalRevenue} درهم | عدد الخدمات: ${services.length}`;

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'analyze_stats',
          businessName: bizName,
          statsSummary: summary
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStatsAdvice(data.result || '');
    } catch (err) {
      alert('تعذر تحليل البيانات: ' + err.message);
    } finally {
      setAnalyzingStats(false);
    }
  };
  // 5. ملخص التقييمات (summarize_reviews)
  const handleSummarizeReviewsAI = async () => {
    setSummarizingReviews(true);
    try {
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('rating, comment')
        .eq('provider_id', provider.id);

      const reviewsText = (reviewsData && reviewsData.length > 0)
        ? reviewsData.map((r) => `(${r.rating}/5): ${r.comment}`).join('\n')
        : 'لا توجد تقييمات مسجلة حالياً.';

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'summarize_reviews',
          businessName: bizName,
          reviewsList: reviewsText
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setReviewsSummary(data.result || '');
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
          businessCategory: businessCategory
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const cleanJson = (data.result || '[]').replace(/```json|```/g, '').trim();
      setSuggestedServicesList(JSON.parse(cleanJson));
    } catch (err) {
      alert('تعذر اقتراح الخدمات: ' + err.message);
    } finally {
      setSuggestingServices(false);
    }
  };

  const handleAddSuggestedService = async (item) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('services').insert([{
        provider_id: provider.id,
        title: item.title,
        total_price: Number(item.total_price),
        deposit_amount: Number(item.deposit_amount)
      }]);
      if (error) throw error;
      setSuggestedServicesList((prev) => prev.filter((s) => s.title !== item.title));
      if (onRefresh) await onRefresh();
    } catch (err) {
      alert('خطأ أثناء إضافة الخدمة: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 7. رسالة استرجاع الزبناء (retention_message)
  const handleRetentionMessageAI = async () => {
    if (!retentionClientName.trim()) return alert('أدخل اسم الزبون أولاً');
    setGeneratingRetention(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'retention_message',
          businessName: bizName,
          clientName: retentionClientName,
          lastVisitDate: retentionLastDate || 'منذ مدة',
          bookingLink: bookingLink
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRetentionMsg(data.result || '');
    } catch (err) {
      alert('تعذر كتابة الرسالة: ' + err.message);
    } finally {
      setGeneratingRetention(false);
    }
  };

  // 8. تجربة موظف الاستقبال الذكي (ask_receptionist)
  const handleTestReceptionistAI = async () => {
    if (!testQuestion.trim()) return;
    setTestingReceptionist(true);
    try {
      const context = `اسم المحل: ${bizName}. الوصف: ${bio}. الخدمات: ${services.map((s) => `${s.title} بـ ${s.total_price} درهم`).join('، ')}. أوقات العمل: ${workingHours.join('، ')}`;
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'ask_receptionist',
          businessName: bizName,
          providerContext: context,
          question: testQuestion
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setReceptionistAnswer(data.result || '');
    } catch (err) {
      alert('تعذر الرد: ' + err.message);
    } finally {
      setTestingReceptionist(false);
    }
  };

  // ==================== إدارة الحجوزات ====================

  const upcomingReminders = bookings.filter((b) => {
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
      .from('bookings')
      .update({ reminder_sent: true })
      .eq('id', b.id)
      .select();

    setUpdatingId(null);

    if (error) return alert('خطأ في قاعدة البيانات: ' + error.message);
    if (!data || data.length === 0) {
      return alert('تعذر التحديث: تأكد من تفعيل صلاحية UPDATE في إعدادات RLS لجدول bookings في Supabase.');
    }

    if (onRefresh) await onRefresh();

    const msg = 'مرحبا ' + b.client_name + '، نذكرك بموعدك اليوم في ' + provider.business_name + ' على الساعة ' + b.booking_time + '. نتشرف بحضورك!';
    window.open(getWhatsAppUrl(b, msg), '_blank');
  };

  const updateStatus = async (b, newStatus) => {
    setUpdatingId(b.id);
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', b.id)
      .select();

    setUpdatingId(null);

    if (error) return alert('خطأ في التحديث: ' + error.message);
    if (!data || data.length === 0) {
      return alert('تعذر التحديث: تحقق من صلاحيات RLS لجدول bookings.');
    }

    if (onRefresh) await onRefresh();

    if (newStatus === 'confirmed') {
      window.open(getWhatsAppUrl(b), '_blank');
    }
  };
  // ==================== إدارة الخدمات والإعدادات ====================

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

  const toggleHour = (hour) => {
    setWorkingHours((prev) =>
      prev.includes(hour) ? prev.filter((h) => h !== hour) : [...prev, hour].sort()
    );
  };

  const handleAddPaymentMethod = () => {
    if (!newAccount.trim()) return;
    setPaymentMethods((prev) => [...prev, { bank: newBank, account: newAccount.trim() }]);
    setNewAccount('');
  };

  const handleRemovePaymentMethod = (idx) => {
    setPaymentMethods((prev) => prev.filter((_, i) => i !== idx));
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
  // ==================== واجهة العرض (JSX) ====================
  return (
    <div className="min-h-screen bg-slate-50 pb-16" style={{ fontFamily: "'Cairo', sans-serif" }} dir="rtl">
      {/* شريط الاشتراك */}
      <SubscriptionBanner provider={provider} onUpgrade={() => setTab('premium')} />

      {/* الهيدر */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center text-lg">
                3
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-slate-900 text-base leading-tight">{bizName}</h1>
              <p className="text-xs text-slate-500">لوحة تحكم 3arboon</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl transition"
            >
              {copied ? '✅ تم النسخ' : '🔗 نسخ رابط الحجز'}
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition"
            >
              📲 مشاركة الرابط
            </button>
          </div>
        </div>

        {/* شريط التبويبات */}
        <div className="max-w-5xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto border-t border-slate-100">
          {[
            { id: 'bookings', label: `📅 الحجوزات (${bookings.length})` },
            { id: 'ai_tools', label: '🤖 مساعدو الذكاء الاصطناعي' },
            { id: 'services', label: `✂️ الخدمات (${services.length})` },
            { id: 'stats', label: '📊 الإحصائيات' },
            { id: 'holidays', label: '🏖️ العطل' },
            { id: 'settings', label: '⚙️ الإعدادات' },
            { id: 'premium', label: '👑 الاشتراك' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                tab === item.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* تنبيه التذكيرات القادمة */}
        {upcomingReminders.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-2">
            <p className="font-bold text-amber-900 text-sm">⏰ مواعيد تقترب خلال ساعتين (تحتاج تذكير):</p>
            {upcomingReminders.map((b) => (
              <div key={b.id} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-amber-200 text-xs">
                <span><strong>{b.client_name}</strong> - الساعة {b.booking_time}</span>
                <button
                  onClick={() => handleSendReminder(b)}
                  disabled={updatingId === b.id}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg"
                >
                  إرسال تذكير واتساب
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ==================== 1. تبويب الحجوزات ==================== */}
        {tab === 'bookings' && (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
                <p className="text-slate-500 font-bold">لا توجد حجوزات مسجلة حالياً.</p>
                <p className="text-xs text-slate-400 mt-1">شارك رابط صفحتك مع زبنائك للبدء في استقبال المواعيد.</p>
              </div>
            ) : (
              bookings.map((b) => {
                const srv = services.find((s) => String(s.id) === String(b.service_id));
                return (
                  <div key={b.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                    <div className="flex flex-wrap justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-base">{b.client_name}</h3>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                            b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {b.status === 'confirmed' ? 'مؤكد' : b.status === 'cancelled' ? 'ملغى' : 'قيد المراجعة'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          📅 {b.booking_date} | ⏰ {b.booking_time} | 📱 {b.client_phone}
                        </p>
                        {srv && (
                          <p className="text-xs text-emerald-700 font-bold mt-1">
                            الخدمة: {srv.title} (الثمن: {srv.total_price} درهم | العربون: {srv.deposit_amount} درهم)
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {b.status !== 'confirmed' && (
                          <button
                            onClick={() => updateStatus(b, 'confirmed')}
                            disabled={updatingId === b.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl"
                          >
                            ✅ تأكيد + واتساب
                          </button>
                        )}
                        {b.status !== 'cancelled' && (
                          <button
                            onClick={() => updateStatus(b, 'cancelled')}
                            disabled={updatingId === b.id}
                            className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-3 py-2 rounded-xl"
                          >
                            ❌ إلغاء
                          </button>
                        )}
                      </div>
                    </div>

                    {/* قسم وصل العربون وفحصه بالذكاء الاصطناعي */}
                    {b.receipt_url && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <a
                            href={b.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-blue-600 hover:underline"
                          >
                            🧾 عرض صورة وصل التحويل
                          </a>
                          <button
                            onClick={() => handleVerifyReceiptAI(b)}
                            disabled={checkingReceiptId === b.id}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            {checkingReceiptId === b.id ? 'جاري فحص الوصل...' : '🤖 فحص الوصل بالذكاء الاصطناعي'}
                          </button>
                        </div>
                        {receiptReports[b.id] && (
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap">
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
        {/* ==================== 3. تبويب الخدمات ==================== */}
        {tab === 'services' && (
          <div className="space-y-6">
            <form onSubmit={handleAddService} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900">إضافة خدمة جديدة</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="اسم الخدمة"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  required
                  placeholder="الثمن الإجمالي (درهم)"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="مبلغ العربون (درهم)"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm"
              >
                {saving ? 'جاري الحفظ...' : '+ إضافة الخدمة'}
              </button>
            </form>

            <div className="grid sm:grid-cols-2 gap-4">
              {services.map((srv) => (
                <div key={srv.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{srv.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      الثمن: <strong className="text-slate-800">{srv.total_price} درهم</strong> | العربون: <strong className="text-emerald-700">{srv.deposit_amount} درهم</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteService(srv.id)}
                    className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg"
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== 4. تبويب الإحصائيات ==================== */}
        {tab === 'stats' && (
          <StatsTab provider={provider} bookings={bookings} services={services} />
        )}

        {/* ==================== 5. تبويب العطل ==================== */}
        {tab === 'holidays' && (
          <HolidaysSection provider={provider} onRefresh={onRefresh} />
        )}
        {/* ==================== 6. تبويب الإعدادات ==================== */}
        {tab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-extrabold text-slate-900 text-lg">إعدادات المشروع والحساب</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">اسم المشروع</label>
                <input type="text" value={bizName} onChange={(e) => setBizName(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">اسم صاحب المشروع</label>
                <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">رقم الهاتف</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">رمز الدخول السريع (PIN)</label>
                <input type="text" value={pinCode} onChange={(e) => setPinCode(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm" />
              </div>
            </div>

            {/* اللوجو والموقع */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">شعار المشروع (Logo)</label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">رابط خرائط جوجل (Google Maps)</label>
                <div className="flex gap-2">
                  <input type="url" value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs" />
                  <button type="button" onClick={handleGenerateGpsLink} disabled={locating} className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl">
                    {locating ? '...' : '📍 GPS'}
                  </button>
                </div>
              </div>
            </div>

            {/* الوصف */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-600">وصف المشروع</label>
                <button type="button" onClick={handleImproveBioAI} disabled={improvingBio} className="text-xs font-bold text-emerald-700 hover:underline">
                  {improvingBio ? 'جاري التحسين...' : '✨ تحسين بالذكاء الاصطناعي'}
                </button>
              </div>
              <textarea rows="2" value={bio} onChange={(e) => setBio(e.target.value)} className="w-full border border-slate-300 rounded-xl p-2.5 text-sm" />
            </div>
            {/* حسابات استقبال العربون */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-600">حسابات استقبال العربون (RIB / البنوك)</label>
              <div className="flex gap-2">
                <select value={newBank} onChange={(e) => setNewBank(e.target.value)} className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white">
                  <option value="CIH Bank">CIH Bank</option>
                  <option value="Attijariwafa Bank">Attijariwafa Bank</option>
                  <option value="Banque Populaire">Banque Populaire</option>
                  <option value="BMCE / Bank of Africa">Bank of Africa</option>
                  <option value="Cash Plus / Wafacash">Cash Plus / Wafacash</option>
                </select>
                <input
                  type="text"
                  placeholder="رقم الحساب (RIB) أو رقم الهاتف"
                  value={newAccount}
                  onChange={(e) => setNewAccount(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
                <button type="button" onClick={handleAddPaymentMethod} className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl">
                  + إضافة
                </button>
              </div>
              <div className="space-y-2">
                {paymentMethods.map((pm, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
                    <span><strong>{pm.bank}:</strong> <span className="font-mono">{pm.account}</span></span>
                    <button type="button" onClick={() => handleRemovePaymentMethod(idx)} className="text-red-600 font-bold">حذف</button>
                  </div>
                ))}
              </div>
            </div>

            {/* أوقات العمل */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600">ساعات العمل المتاحة للحجز</label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {ALL_HALF_HOURS.map((hour) => (
                  <button
                    type="button"
                    key={hour}
                    onClick={() => toggleHour(hour)}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                      workingHours.includes(hour)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'
                    }`}
                  >
                    {hour}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-sm shadow"
            >
              {savingSettings ? 'جاري الحفظ...' : '💾 حفظ جميع الإعدادات'}
            </button>
          </form>
        )}

        {/* ==================== 7. تبويب الاشتراك ==================== */}
        {tab === 'premium' && (
          <PremiumTab provider={provider} onRefresh={onRefresh} />
        )}

      </main>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import StatsTab from './StatsTab';
import HolidaysSection from './HolidaysSection';
import jsQR from 'jsqr';
import PremiumTab from './PremiumTab';
import SubscriptionBanner from './SubscriptionBanner';

const ALL_HALF_HOURS = [];
for (let h = 8; h <= 23; h++) {
  const hh = String(h).padStart(2, '0');
  ALL_HALF_HOURS.push(hh + ':00');
  ALL_HALF_HOURS.push(hh + ':30');
}

export default function DashboardPage({ provider, bookings, services, onRefresh }) {
  const [tab, setTab] = useState('bookings');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedClientPhone, setSelectedClientPhone] = useState(null);
  const [copied, setCopied] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [showAdBox, setShowAdBox] = useState(false);

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
  const [generatedAd, setGeneratedAd] = useState('');
  const [copiedAd, setCopiedAd] = useState(false);

  const [serviceCategory, setServiceCategory] = useState('');
  const [suggestingServices, setSuggestingServices] = useState(false);
  const [suggestedServices, setSuggestedServices] = useState([]);
  const [addingSuggestedIdx, setAddingSuggestedIdx] = useState(null);

  const [analyzingStats, setAnalyzingStats] = useState(false);
  const [statsAdvice, setStatsAdvice] = useState('');
  const [generatingRetentionPhone, setGeneratingRetentionPhone] = useState(null);

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

  const [showScanner, setShowScanner] = useState(false);
  const [ticketQuery, setTicketQuery] = useState('');
  const [scannedBooking, setScannedBooking] = useState(null);
  const [scanError, setScanError] = useState('');
  const [scanningCamera, setScanningCamera] = useState(false);
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanningCamera(false);
  };

  const findBookingByText = (rawText) => {
    const clean = String(rawText || '').trim();
    if (!clean) return;
    setTicketQuery(clean);
    setScanError('');

    const upper = clean.toUpperCase();
    const codeMatch = upper.match(/3RB-([A-Z0-9]+)/);
    const shortCode = codeMatch ? codeMatch.at(1) : upper.replace(/^3RB-/, '');

    const found = bookings.find((b) => {
      const idUpper = String(b.id || '').toUpperCase();
      const clientPhone = String(b.client_phone || '');
      const clientName = String(b.client_name || '').toLowerCase();
      return (
        (shortCode.length >= 4 && idUpper.startsWith(shortCode)) ||
        (idUpper.length >= 8 && upper.includes(idUpper.slice(0, 8))) ||
        (clean.length >= 4 && clientPhone.includes(clean)) ||
        (clean.length >= 2 && clientName.includes(clean.toLowerCase()))
      );
    });

    if (found) {
      setScannedBooking(found);
      stopCamera();
    } else {
      setScannedBooking(null);
      setScanError('لم يتم العثور على حجز مطابق للبيانات المدخلة.');
    }
  };

  const startCameraScan = async () => {
    setScanError('');
    setScannedBooking(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScanError('المتصفح لا يدعم الوصول المباشر للكاميرا.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      streamRef.current = stream;
      setScanningCamera(true);

      setTimeout(async () => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const scanLoop = () => {
          if (!streamRef.current || !videoRef.current) return;
          const video = videoRef.current;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert'
            });
            if (code && code.data) {
              findBookingByText(code.data);
              return;
            }
          }
          requestAnimationFrame(scanLoop);
        };
        requestAnimationFrame(scanLoop);
      }, 200);
    } catch {
      setScanError('تعذر تشغيل الكاميرا. يرجى التحقق من أذونات المتصفح.');
      stopCamera();
    }
  };

  const handleQrImageUpload = (e) => {
    const file = e.target.files ? e.target.files.item(0) : null;
    if (!file) return;
    setScanError('');
    setScannedBooking(null);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth'
      });
      if (code && code.data) {
        findBookingByText(code.data);
      } else {
        setScanError('لم يتم العثور على رمز QR صالح في الصورة.');
      }
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      setScanError('تعذر قراءة ملف الصورة.');
    };
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

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
  const handleImproveBioAI = async () => {
    setImprovingBio(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { action: 'improve_bio', businessName: bizName, bio: bio }
      });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      if (data && data.result) setBio(data.result);
    } catch (err) {
      alert('تعذر تحسين الوصف: ' + err.message);
    } finally {
      setImprovingBio(false);
    }
  };

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
      if (data && data.error) throw new Error(data.error);
      if (data && data.result) {
        setReceiptReports((prev) => ({ ...prev, [b.id]: data.result }));
        const updates = { ai_note: data.result };
        if (data.auto_approve === true) updates.status = 'confirmed';
        await supabase.from('bookings').update(updates).eq('id', b.id);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      alert('تعذر فحص الوصل: ' + err.message);
    } finally {
      setCheckingReceiptId(null);
    }
  };

  const handleGenerateAdAI = async () => {
    setGeneratingAd(true);
    try {
      const servicesText = services.length > 0
        ? services.map((s) => s.title + ' (' + s.total_price + ' درهم)').join('، ')
        : 'خدمات متنوعة واحترافية';

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'generate_ad',
          businessName: provider.business_name,
          bio: provider.bio || '',
          servicesList: servicesText,
          bookingLink: bookingLink
        }
      });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      if (data && data.result) setGeneratedAd(data.result);
    } catch (err) {
      alert('تعذر توليد الإعلان: ' + err.message);
    } finally {
      setGeneratingAd(false);
    }
  };

  const handleCopyAd = () => {
    if (!generatedAd) return;
    navigator.clipboard.writeText(generatedAd);
    setCopiedAd(true);
    setTimeout(() => setCopiedAd(false), 2500);
  };

  const handleSuggestServicesAI = async () => {
    if (!serviceCategory.trim()) return alert('يرجى إدخال نوع النشاط أولاً.');
    setSuggestingServices(true);
    setSuggestedServices([]);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { action: 'suggest_services', businessCategory: serviceCategory.trim() }
      });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      if (data && data.result) {
        const cleanJson = data.result.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed)) setSuggestedServices(parsed);
      }
    } catch (err) {
      alert('تعذر اقتراح الخدمات: ' + err.message);
    } finally {
      setSuggestingServices(false);
    }
  };

  const handleAddSuggestedService = async (srv, idx) => {
    setAddingSuggestedIdx(idx);
    const { error } = await supabase.from('services').insert([{
      provider_id: provider.id,
      title: srv.title,
      total_price: Number(srv.total_price) || 100,
      deposit_amount: Number(srv.deposit_amount) || 30
    }]);
    setAddingSuggestedIdx(null);
    if (error) return alert('خطأ في الإضافة: ' + error.message);
    setSuggestedServices((prev) => prev.filter((_, i) => i !== idx));
    onRefresh();
  };

  const handleAnalyzeStatsAI = async () => {
    setAnalyzingStats(true);
    try {
      const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
      const rejectedBookings = bookings.filter((b) => b.status === 'rejected');
      const pendingBookings = bookings.filter((b) => b.status === 'pending');

      const totalRevenue = confirmedBookings.reduce((sum, b) => {
        const srv = services.find((s) => String(s.id) === String(b.service_id));
        return sum + (srv ? Number(srv.total_price || 0) : 0);
      }, 0);

      const summary =
        'إجمالي الحجوزات: ' + bookings.length +
        ' | المؤكدة: ' + confirmedBookings.length +
        ' | المعلقة: ' + pendingBookings.length +
        ' | المرفوضة: ' + rejectedBookings.length +
        ' | الأرباح المؤكدة: ' + totalRevenue + ' درهم' +
        ' | عدد الخدمات: ' + services.length;

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { action: 'analyze_stats', businessName: provider.business_name, statsSummary: summary }
      });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      if (data && data.result) setStatsAdvice(data.result);
    } catch (err) {
      alert('تعذر تحليل الإحصائيات: ' + err.message);
    } finally {
      setAnalyzingStats(false);
    }
  };

  const handleSendRetentionAI = async (client) => {
    setGeneratingRetentionPhone(client.phone);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'retention_message',
          businessName: provider.business_name,
          clientName: client.name,
          lastVisitDate: client.lastDate,
          bookingLink: bookingLink
        }
      });
      if (error) throw error;
      const finalMsg = (data && data.result)
        ? data.result
        : ('مرحبا ' + client.name + '، يسعدنا استقبالك مجدداً في ' + provider.business_name + '. احجز موعدك عبر: ' + bookingLink);

      const ph = formatMoroccanPhone(client.phone);
      window.location.assign('https://wa.me' + ph + '?text=' + encodeURIComponent(finalMsg));
    } catch (err) {
      alert('تعذر توليد الرسالة: ' + err.message);
    } finally {
      setGeneratingRetentionPhone(null);
    }
  };
  const handleLogoUpload = async (e) => {
    const file = e.target.files ? e.target.files.item(0) : null;
    if (!file) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = 'logos/' + provider.id + '_' + Date.now() + '.' + ext;
      const { error: upErr } = await supabase.storage.from('receipts').upload(fileName, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
      setLogoUrl(urlData.publicUrl);
      alert('تم رفع الشعار بنجاح. يرجى الضغط على "حفظ الإعدادات" بالأسفل لتأكيده.');
    } catch (err) {
      alert('خطأ أثناء رفع الشعار: ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleGenerateGpsLink = () => {
    if (!navigator.geolocation) {
      return alert('المتصفح لا يدعم تحديد الموقع التلقائي.');
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const lat = Number(position.coords.latitude).toFixed(6);
        const lng = Number(position.coords.longitude).toFixed(6);
        const link = 'https://google.com' + lat + ',' + lng;
        setGoogleMapsUrl(link);
        alert('تم إنشاء رابط خرائط جوجل لموقعك الحالي بنجاح.');
      },
      () => {
        setLocating(false);
        alert('يرجى تفعيل خدمة الموقع (GPS) والسماح للمتصفح بالوصول.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = async () => {
    const textMsg = 'يمكنك حجز موعدك في ' + provider.business_name + ' مباشرة عبر الرابط التالي:\n' + bookingLink;
    if (navigator.share) {
      try {
        await navigator.share({ title: provider.business_name, text: textMsg, url: bookingLink });
        return;
      } catch (err) {}
    }
    window.location.assign('https://wa.me' + encodeURIComponent(textMsg));
  };

  const upcomingReminders = bookings.filter((b) => {
    if (b.status !== 'confirmed' || b.reminder_sent) return false;
    if (!b.booking_date || !b.booking_time) return false;
    const apptTime = new Date(b.booking_date + 'T' + b.booking_time + ':00');
    if (isNaN(apptTime.getTime())) return false;
    const now = new Date();
    const diffHours = (apptTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours <= 2 && diffHours >= -1;
  });

  const inactiveClients = (() => {
    const map = {};
    const now = new Date();
    bookings.forEach((b) => {
      if (b.status !== 'confirmed' || !b.client_phone || !b.booking_date) return;
      const ph = formatMoroccanPhone(b.client_phone);
      if (!ph) return;
      if (!map[ph] || b.booking_date > map[ph].lastDate) {
        map[ph] = {
          name: b.client_name || 'زبوننا الكريم',
          phone: b.client_phone,
          lastDate: b.booking_date
        };
      }
    });
    return Object.values(map).filter((c) => {
      const last = new Date(c.lastDate + 'T00:00:00');
      if (isNaN(last.getTime())) return false;
      const daysDiff = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff >= 30;
    });
  })();

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
      return alert('تعذر التحديث: تأكد من تفعيل صلاحية UPDATE في إعدادات Supabase.');
    }

    if (onRefresh) await onRefresh();

    const msg = 'مرحبا ' + b.client_name + '، نذكرك بموعدك اليوم في ' + provider.business_name + ' على الساعة ' + b.booking_time + '.';
    window.location.assign(getWhatsAppUrl(b, msg));
  };

  const updateStatus = async (b, newStatus) => {
    setUpdatingId(b.id);
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', b.id)
      .select();

    setUpdatingId(null);

    if (error) return alert('خطأ: ' + error.message);
    if (!data || data.length === 0) {
      return alert('لم يتم حفظ التغيير. تأكد من صلاحيات التحديث.');
    }

    if (onRefresh) await onRefresh();

    if (newStatus === 'confirmed') {
      window.location.assign(getWhatsAppUrl(b));
    } else {
      alert('تم رفض الحجز.');
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
    if (!newAccount.trim()) return alert('أدخل رقم الحساب البنكي (RIB) أو رقم الهاتف.');
    setPaymentMethods([...paymentMethods, { bank: newBank, account: newAccount.trim() }]);
    setNewAccount('');
  };

  const removePaymentMethod = (idx) => {
    setPaymentMethods(paymentMethods.filter((_, i) => i !== idx));
  };

  const toggleWorkingHour = (hr) => {
    if (workingHours.includes(hr)) {
      if (workingHours.length <= 1) return alert('يجب ترك وقت عمل واحد على الأقل.');
      setWorkingHours(workingHours.filter((h) => h !== hr));
    } else {
      setWorkingHours([...workingHours, hr].sort());
    }
  };

  const selectPresetHours = (preset) => {
    if (preset === 'day') {
      setWorkingHours(ALL_HALF_HOURS.filter((h) => h >= '09:00' && h <= '19:30'));
    } else if (preset === 'evening') {
      setWorkingHours(ALL_HALF_HOURS.filter((h) => h >= '14:00' && h <= '23:00'));
    } else if (preset === 'all') {
      setWorkingHours([...ALL_HALF_HOURS]);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (paymentMethods.length === 0) return alert('يجب إضافة طريقة دفع واحدة على الأقل.');
    if (workingHours.length === 0) return alert('يجب اختيار وقت عمل واحد على الأقل.');
    setSavingSettings(true);

    const firstPay = paymentMethods.at(0);
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
        working_hours: workingHours,
        logo_url: logoUrl.trim() || null,
        google_maps_url: googleMapsUrl.trim() || null,
        bio: bio.trim() || null
      })
      .eq('id', provider.id);

    setSavingSettings(false);
    if (error) return alert('خطأ أثناء الحفظ: ' + error.message);
    alert('تم حفظ الإعدادات بنجاح.');
    onRefresh();
  };

  const pageFont = {
    fontFamily: "'Cairo', -apple-system, BlinkMacSystemFont, sans-serif",
    direction: 'rtl',
    color: '#0f172a'
  };

  const inputStyle = {
    width: '100%',
    padding: '11px 13px',
    margin: '6px 0 12px',
    borderRadius: 12,
    border: '1.5px solid #e2e8f0',
    background: '#f8fafc',
    color: '#0f172a',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    fontSize: 13
  };

  const sectionCard = {
    background: '#f8faff',
    border: '1px solid #e0e7ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14
  };

  const primaryBtn = {
    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 12,
    padding: '10px 15px',
    fontWeight: 800,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.28)',
    transition: 'transform 0.16s ease, box-shadow 0.16s ease'
  };

  const secondaryBtn = {
    background: '#ffffff',
    color: '#1e293b',
    border: '1.5px solid #e2e8f0',
    borderRadius: 12,
    padding: '8px 12px',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'transform 0.16s ease, border-color 0.16s ease'
  };

  if (selectedClientPhone) {
    const targetNorm = formatMoroccanPhone(selectedClientPhone);
    const clientBookings = bookings
      .filter((b) => formatMoroccanPhone(b.client_phone) === targetNorm || String(b.client_phone) === String(selectedClientPhone))
      .sort((a, b) => String(b.booking_date + b.booking_time).localeCompare(String(a.booking_date + a.booking_time)));

    const latestRecord = clientBookings.at(0) || {};
    const displayName = latestRecord.client_name || 'زبون';
    const displayPhone = latestRecord.client_phone || selectedClientPhone;

    const confirmedList = clientBookings.filter((b) => b.status === 'confirmed');
    const totalSpent = confirmedList.reduce((sum, b) => {
      const srv = services.find((s) => String(s.id) === String(b.service_id));
      return sum + (srv ? Number(srv.total_price || 0) : 0);
    }, 0);

    const commitmentRate = clientBookings.length > 0
      ? Math.round((confirmedList.length / clientBookings.length) * 100)
      : 0;

    const serviceCounts = {};
    clientBookings.forEach((b) => {
      const srv = services.find((s) => String(s.id) === String(b.service_id));
      const title = srv ? srv.title : 'خدمة عامة';
      serviceCounts[title] = (serviceCounts[title] || 0) + 1;
    });
    const favoriteService = Object.entries(serviceCounts).sort((a, b) => b.at(1) - a.at(1)).at(0)?.at(0) || '—';

    const timeCounts = {};
    clientBookings.forEach((b) => {
      if (b.booking_time) timeCounts[b.booking_time] = (timeCounts[b.booking_time] || 0) + 1;
    });
    const favoriteTime = Object.entries(timeCounts).sort((a, b) => b.at(1) - a.at(1)).at(0)?.at(0) || '—';

    const tier = confirmedList.length >= 5
      ? { label: 'فئة بلاتينية', badgeBg: '#e2e8f0', badgeColor: '#0f172a' }
      : confirmedList.length >= 3
      ? { label: 'فئة ذهبية', badgeBg: '#fef3c7', badgeColor: '#92400e' }
      : confirmedList.length >= 1
      ? { label: 'زبون منتظم', badgeBg: '#dbeafe', badgeColor: '#1e40af' }
      : { label: 'زبون جديد', badgeBg: '#f1f5f9', badgeColor: '#475569' };

      return (
    <div className="card-modern" style={{ ...pageFont, maxWidth: 470, margin: '0 auto', overflow: 'hidden', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none' }}>
      {/* ترويسة لوحة التحكم بتدرج النيلي الملكي */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 65%, #6366f1 100%)', color: '#ffffff', padding: '22px 20px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'absolute', top: -35, left: -35, width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.16)', padding: '2px 10px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, color: '#e0e7ff', marginBottom: 4 }}>
            لوحة إدارة الأعمال
          </span>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#ffffff' }}>
            {provider.business_name}
          </h3>
        </div>
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2.5px solid rgba(255,255,255,0.85)', position: 'relative', zIndex: 1 }} />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 900, position: 'relative', zIndex: 1 }}>
            {String(provider.business_name || 'ع').charAt(0)}
          </div>
        )}
      </div>

      <div style={{ padding: 18 }}>
        <SubscriptionBanner provider={provider} onUpgradeClick={() => setTab('premium')} />

        {/* تنبيهات المواعيد القادمة */}
        {upcomingReminders.length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e', marginBottom: 8 }}>
              مواعيد قريبة (خلال ساعتين)
            </div>
            {upcomingReminders.map((rem) => (
              <div key={rem.id} style={{ background: '#ffffff', border: '1px solid #fef3c7', borderRadius: 10, padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 13 }}>
                  <strong style={{ color: '#0f172a' }}>{rem.client_name}</strong>
                  <div style={{ color: '#64748b', fontSize: 12 }}>الساعة: {rem.booking_time}</div>
                </div>
                <button
                  type="button"
                  disabled={updatingId === rem.id}
                  onClick={() => handleSendReminder(rem)}
                  className="btn-modern-primary"
                  style={{ padding: '7px 12px', fontSize: 12 }}
                >
                  {updatingId === rem.id ? 'جاري الإرسال...' : 'إرسال تذكير'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* بطاقة رابط الحجز */}
        <div style={sectionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, color: '#312e81', fontWeight: 800 }}>رابط صفحة الحجز</span>
            <button
              type="button"
              onClick={() => setShowAdBox(!showAdBox)}
              style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
            >
              {showAdBox ? 'إخفاء أداة الإعلان' : 'إنشاء نص ترويجي'}
            </button>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#334155', direction: 'ltr', textAlign: 'left', overflowX: 'auto', whiteSpace: 'nowrap', marginBottom: 10, fontFamily: 'monospace' }}>
            {bookingLink}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleCopyLink}
              className={copied ? 'btn-modern-accent' : 'btn-modern-primary'}
              style={{ flex: 1, padding: '10px 12px', fontSize: 12.5 }}
            >
              {copied ? 'تم نسخ الرابط' : 'نسخ الرابط'}
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="btn-modern-secondary"
              style={{ flex: 1, padding: '10px 12px', fontSize: 12.5 }}
            >
              مشاركة الرابط
            </button>
          </div>

          {showAdBox && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e0e7ff' }}>
              <button
                type="button"
                disabled={generatingAd}
                onClick={handleGenerateAdAI}
                className="btn-modern-secondary"
                style={{ width: '100%' }}
              >
                {generatingAd ? 'جاري صياغة الإعلان...' : 'توليد نص إعلاني بالذكاء الاصطناعي'}
              </button>

              {generatedAd && (
                <div style={{ marginTop: 10, background: '#ffffff', border: '1px solid #c7d2fe', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 13, color: '#1e293b', whiteSpace: 'pre-line', lineHeight: 1.6, marginBottom: 10 }}>
                    {generatedAd}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleCopyAd}
                      className={copiedAd ? 'btn-modern-accent' : 'btn-modern-primary'}
                      style={{ flex: 1, padding: '8px 10px', fontSize: 12 }}
                    >
                      {copiedAd ? 'تم النسخ' : 'نسخ النص'}
                    </button>
                    <a
                      href={'https://wa.me' + encodeURIComponent(generatedAd)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-modern-secondary"
                      style={{ flex: 1, textAlign: 'center', textDecoration: 'none', padding: '8px 10px', fontSize: 12 }}
                    >
                      نشر عبر واتساب
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* شريط التبويبات الموحد */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: '#f1f5f9', padding: 5, borderRadius: 14, border: '1px solid #e2e8f0' }}>
          {[
            { id: 'bookings', label: `الحجوزات (${bookings.length})` },
            { id: 'services', label: `الخدمات (${services.length})` },
            { id: 'stats', label: 'التقارير' },
            { id: 'premium', label: 'الاشتراك' },
            { id: 'settings', label: 'الإعدادات' }
          ].map((item) => {
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                style={{
                  flex: 1,
                  padding: '9px 4px',
                  borderRadius: 10,
                  border: 'none',
                  fontWeight: 800,
                  fontSize: 11.5,
                  background: isActive ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'transparent',
                  color: isActive ? '#ffffff' : '#64748b',
                  boxShadow: isActive ? '0 4px 10px rgba(79,70,229,0.28)' : 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease'
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {tab === 'premium' && <PremiumTab provider={provider} bookings={bookings} services={services} />}

        {tab === 'stats' && (
          <div>
            <StatsTab bookings={bookings} services={services} />

            <div style={{ ...sectionCard, marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 13, color: '#0f172a' }}>تحليل الأداء والتوصيات</strong>
                <button
                  type="button"
                  disabled={analyzingStats}
                  onClick={handleAnalyzeStatsAI}
                  style={{ ...primaryBtn, padding: '6px 12px', fontSize: 11 }}
                >
                  {analyzingStats ? 'جاري التحليل...' : 'توليد تقرير ذكي'}
                </button>
              </div>
              {statsAdvice ? (
                <div style={{ background: '#ffffff', padding: 12, borderRadius: 10, fontSize: 13, color: '#1e293b', lineHeight: 1.7, whiteSpace: 'pre-line', border: '1px solid #cbd5e1' }}>
                  {statsAdvice}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                  اضغط للحصول على توصيات عملية لتحسين الإيرادات وتنظيم المواعيد بناءً على بياناتك.
                </p>
              )}
            </div>

            {inactiveClients.length > 0 && (
              <div style={sectionCard}>
                <strong style={{ display: 'block', fontSize: 13, color: '#0f172a', marginBottom: 4 }}>
                  الزبائن الغائبون (أكثر من 30 يوماً)
                </strong>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>
                  إرسال دعوة متابعة مخصصة عبر واتساب لتشجيعهم على الحجز مجدداً:
                </p>
                {inactiveClients.map((cl, idx) => (
                  <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 12 }}>
                      <strong style={{ color: '#0f172a', fontSize: 13 }}>{cl.name}</strong>
                      <div style={{ color: '#64748b' }}>آخر زيارة: {cl.lastDate}</div>
                    </div>
                    <button
                      type="button"
                      disabled={generatingRetentionPhone === cl.phone}
                      onClick={() => handleSendRetentionAI(cl)}
                      style={{ ...secondaryBtn, padding: '6px 10px', fontSize: 11, whiteSpace: 'nowrap' }}
                    >
                      {generatingRetentionPhone === cl.phone ? 'جاري الصياغة...' : 'إرسال دعوة'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'bookings' && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => {
                  const next = !showScanner;
                  setShowScanner(next);
                  if (!next) stopCamera();
                }}
                style={{
                  ...(showScanner ? secondaryBtn : primaryBtn),
                  width: '100%',
                  padding: '11px 14px',
                  fontSize: 13
                }}
              >
                {showScanner ? 'إغلاق التحقق من التذاكر' : 'التحقق من تذكرة (مسح QR أو بحث)'}
              </button>

              {showScanner && (
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 12, padding: 14, marginTop: 10 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <input
                      type="text"
                      placeholder="رقم التذكرة (3RB-...) أو اسم الزبون أو الهاتف"
                      value={ticketQuery}
                      onChange={(e) => setTicketQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && findBookingByText(ticketQuery)}
                      style={{ ...inputStyle, margin: 0, flex: 1, fontSize: 13 }}
                    />
                    <button
                      type="button"
                      onClick={() => findBookingByText(ticketQuery)}
                      style={{ ...primaryBtn, padding: '0 14px' }}
                    >
                      بحث
                    </button>
                  </div>

                  {!scanningCamera ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={startCameraScan}
                        style={{ ...secondaryBtn, flex: 1, padding: 9 }}
                      >
                        فتح الكاميرا
                      </button>
                      <label
                        style={{ ...secondaryBtn, flex: 1, padding: 9, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        رفع صورة التذكرة
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleQrImageUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <video ref={videoRef} style={{ width: '100%', maxHeight: 240, borderRadius: 10, background: '#000' }} playsInline muted />
                      <button
                        type="button"
                        onClick={stopCamera}
                        style={{ marginTop: 8, background: '#dc2626', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        إيقاف الكاميرا
                      </button>
                    </div>
                  )}

                  {scanError && (
                    <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 9, borderRadius: 8, fontSize: 12, fontWeight: 700, marginTop: 10, border: '1px solid #fecaca' }}>
                      {scanError}
                    </div>
                  )}

                  {scannedBooking && (
                    <div style={{ background: '#ffffff', border: '1px solid #0f172a', borderRadius: 12, padding: 12, marginTop: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <button
                          type="button"
                          onClick={() => setSelectedClientPhone(scannedBooking.client_phone)}
                          style={{ background: 'none', border: 'none', padding: 0, fontSize: 15, fontWeight: 800, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
                        >
                          {scannedBooking.client_name}
                        </button>
                        <span style={{
                          padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: scannedBooking.status === 'confirmed' ? '#dcfce7' : scannedBooking.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                          color: scannedBooking.status === 'confirmed' ? '#166534' : scannedBooking.status === 'rejected' ? '#991b1b' : '#92400e'
                        }}>
                          {scannedBooking.status === 'confirmed' ? 'مؤكد' : scannedBooking.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
                        التاريخ: {scannedBooking.booking_date} | الساعة: {scannedBooking.booking_time}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>
                        {scannedBooking.client_phone}
                      </div>
                      {scannedBooking.status !== 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => updateStatus(scannedBooking, 'confirmed')}
                          style={{ ...primaryBtn, width: '100%', marginTop: 10, padding: 9 }}
                        >
                          تأكيد الحجز
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            {bookings.length === 0 && (
              <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: 28, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                لا توجد حجوزات مسجلة حالياً. شارك رابط الحجز لاستقبال أول موعد.
              </div>
            )}

            {bookings.map((b) => (
              <div key={b.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, marginBottom: 12, background: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedClientPhone(b.client_phone)}
                    style={{ background: 'none', border: 'none', padding: 0, fontSize: 15, fontWeight: 800, color: '#0f172a', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
                  >
                    {b.client_name}
                  </button>

                  <span style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: b.status === 'confirmed' ? '#dcfce7' : b.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                    color: b.status === 'confirmed' ? '#166534' : b.status === 'rejected' ? '#991b1b' : '#92400e'
                  }}>
                    {b.status === 'confirmed' ? 'مؤكد' : b.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                  </span>
                </div>

                <div style={{ fontSize: 13, color: '#334155', fontWeight: 600, marginTop: 6 }}>
                  التاريخ: {b.booking_date} | الساعة: {b.booking_time}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>
                  {b.client_phone}
                </div>

                {(() => {
                  const plan = String(provider.plan_type || 'trial').toLowerCase();
                  const isExpired = provider.plan_expires_at ? new Date() > new Date(provider.plan_expires_at) : false;
                  const hasAiAccess = !isExpired && (plan === 'premium' || plan === 'trial');
                  const aiSummary = receiptReports[b.id] || b.ai_note;
                  const isAutoApproved = b.status === 'confirmed' && aiSummary && aiSummary.includes('✅');

                  return (
                    <>
                      {b.receipt_url && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                          <a
                            href={b.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ ...secondaryBtn, textDecoration: 'none', padding: '6px 10px', fontSize: 11 }}
                          >
                            عرض الوصل
                          </a>

                          {hasAiAccess && (
                            <button
                              type="button"
                              disabled={checkingReceiptId === b.id}
                              onClick={() => handleVerifyReceiptAI(b)}
                              style={{ ...secondaryBtn, padding: '6px 10px', fontSize: 11 }}
                            >
                              {checkingReceiptId === b.id ? 'جاري الفحص...' : 'إعادة فحص الوصل'}
                            </button>
                          )}
                        </div>
                      )}

                      {aiSummary && (
                        <div
                          style={{
                            marginTop: 10,
                            padding: '10px 12px',
                            borderRadius: 10,
                            fontSize: 12,
                            lineHeight: 1.6,
                            fontWeight: 600,
                            background: isAutoApproved ? '#f0fdf4' : '#fef2f2',
                            border: isAutoApproved ? '1px solid #bbf7d0' : '1px solid #fecaca',
                            color: isAutoApproved ? '#166534' : '#991b1b'
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 2 }}>
                            {isAutoApproved ? 'تم التحقق والتأكيد تلقائياً:' : 'ملاحظة التدقيق الآلي:'}
                          </div>
                          <div>{aiSummary}</div>
                        </div>
                      )}
                    </>
                  );
                })()}

                <div style={{ display: 'flex', gap: 6, marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                  {b.status !== 'confirmed' && (
                    <button
                      type="button"
                      disabled={updatingId === b.id}
                      onClick={() => updateStatus(b, 'confirmed')}
                      style={{ ...primaryBtn, flex: 1, padding: '8px 12px', fontSize: 12 }}
                    >
                      {updatingId === b.id ? 'جاري التنفيذ...' : 'قبول وتأكيد'}
                    </button>
                  )}

                  {b.status === 'confirmed' && (
                    <a
                      href={getWhatsAppUrl(b)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ ...secondaryBtn, flex: 1, textAlign: 'center', textDecoration: 'none', padding: '8px 10px', fontSize: 12 }}
                    >
                      مراسلة عبر واتساب
                    </a>
                  )}

                  {b.status === 'confirmed' && (
                    <button
                      type="button"
                      disabled={updatingId === b.id}
                      onClick={() => handleSendReminder(b)}
                      style={{ ...secondaryBtn, padding: '8px 10px', fontSize: 12, color: b.reminder_sent ? '#94a3b8' : '#0f172a' }}
                    >
                      {b.reminder_sent ? 'تم التذكير' : 'تذكير'}
                    </button>
                  )}

                  {b.status !== 'rejected' && (
                    <button
                      type="button"
                      disabled={updatingId === b.id}
                      onClick={() => updateStatus(b, 'rejected')}
                      style={{ ...secondaryBtn, padding: '8px 10px', fontSize: 12, color: '#b91c1c', borderColor: '#fecaca' }}
                    >
                      رفض
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'services' && (
          <div>
            <div style={sectionCard}>
              <strong style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#0f172a' }}>
                اقتراح خدمات بالذكاء الاصطناعي
              </strong>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>
                أدخل مجال نشاطك لاقتراح قائمة خدمات وأسعار مناسبة:
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  placeholder="مثال: صالون حلاقة، عناية بالبشرة..."
                  style={{ ...inputStyle, margin: 0, flex: 2 }}
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                />
                <button
                  type="button"
                  disabled={suggestingServices}
                  onClick={handleSuggestServicesAI}
                  style={{ ...primaryBtn, flex: 1, padding: '0 10px', fontSize: 12, whiteSpace: 'nowrap' }}
                >
                  {suggestingServices ? 'جاري...' : 'اقتراح'}
                </button>
              </div>

              {suggestedServices.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {suggestedServices.map((srv, idx) => (
                    <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 12 }}>
                        <strong style={{ display: 'block', color: '#0f172a', fontSize: 13 }}>{srv.title}</strong>
                        <span style={{ color: '#64748b' }}>
                          الثمن: {srv.total_price} درهم | العربون: <strong style={{ color: '#0f172a' }}>{srv.deposit_amount} درهم</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={addingSuggestedIdx === idx}
                        onClick={() => handleAddSuggestedService(srv, idx)}
                        style={{ ...primaryBtn, padding: '6px 10px', fontSize: 11, whiteSpace: 'nowrap' }}
                      >
                        {addingSuggestedIdx === idx ? 'جاري...' : 'إضافة'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleAddService} style={sectionCard}>
              <strong style={{ display: 'block', marginBottom: 10, fontSize: 13, color: '#0f172a' }}>إضافة خدمة جديدة</strong>
              <input type="text" placeholder="اسم الخدمة" style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} required />
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" placeholder="الثمن الإجمالي (درهم)" style={inputStyle} value={price} onChange={(e) => setPrice(e.target.value)} required />
                <input type="number" placeholder="مبلغ العربون (درهم)" style={inputStyle} value={deposit} onChange={(e) => setDeposit(e.target.value)} required />
              </div>
              <button type="submit" disabled={saving} style={{ ...primaryBtn, width: '100%', padding: 11 }}>
                {saving ? 'جاري الحفظ...' : 'حفظ الخدمة'}
              </button>
            </form>

            {services.map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0', background: '#ffffff', padding: 12, borderRadius: 12, marginBottom: 8 }}>
                <div>
                  <strong style={{ display: 'block', fontSize: 14, color: '#0f172a' }}>{s.title}</strong>
                  <small style={{ color: '#64748b', fontSize: 12 }}>الثمن: {s.total_price} درهم | العربون: <strong style={{ color: '#0f172a' }}>{s.deposit_amount} درهم</strong></small>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteService(s.id)}
                  style={{ ...secondaryBtn, padding: '6px 10px', fontSize: 11, color: '#b91c1c', borderColor: '#fecaca' }}
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        )}
        {tab === 'settings' && (
          <>
            <HolidaysSection provider={provider} onRefresh={onRefresh} />
            <form onSubmit={handleSaveSettings}>
              <div style={sectionCard}>
                <strong style={{ display: 'block', marginBottom: 10, fontSize: 13, color: '#0f172a' }}>
                  هوية المشروع والموقع الجغرافي
                </strong>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, background: '#ffffff', padding: 10, borderRadius: 10, border: '1px solid #cbd5e1' }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                  ) : (
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f1f5f9', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800 }}>
                      {String(bizName || 'ع').charAt(0)}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4, color: '#334155' }}>
                      {uploadingLogo ? 'جاري رفع الشعار...' : 'شعار المشروع'}
                    </label>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} style={{ fontSize: 12, width: '100%' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>رابط الموقع على خرائط جوجل</label>
                  <button
                    type="button"
                    onClick={handleGenerateGpsLink}
                    disabled={locating}
                    style={{ ...secondaryBtn, padding: '4px 10px', fontSize: 11 }}
                  >
                    {locating ? 'جاري التحديد...' : 'تحديد تلقائي (GPS)'}
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
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>نبذة تعريفية عن المحل</label>
                  <button
                    type="button"
                    onClick={handleImproveBioAI}
                    disabled={improvingBio}
                    style={{ ...secondaryBtn, padding: '4px 10px', fontSize: 11 }}
                  >
                    {improvingBio ? 'جاري الصياغة...' : 'تحسين الصياغة'}
                  </button>
                </div>
                <textarea
                  rows="3"
                  placeholder="مثال: صالون تجميل وحلاقة للنساء - حي جليز مراكش..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <div style={sectionCard}>
                <strong style={{ display: 'block', marginBottom: 10, fontSize: 13, color: '#0f172a' }}>الحسابات البنكية وطرق الدفع</strong>
                {paymentMethods.map((pm, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', marginBottom: 8 }}>
                    <div style={{ fontSize: 13 }}>
                      <strong>{pm.bank}</strong>: <span style={{ direction: 'ltr', display: 'inline-block', fontFamily: 'monospace' }}>{pm.account}</span>
                    </div>
                    <button type="button" onClick={() => removePaymentMethod(idx)} style={{ ...secondaryBtn, padding: '4px 10px', fontSize: 11, color: '#b91c1c', borderColor: '#fecaca' }}>
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
                  <button type="button" onClick={addPaymentMethod} style={{ ...primaryBtn, flex: 1 }}>
                    إضافة
                  </button>
                </div>
              </div>

              <div style={sectionCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: 13, color: '#0f172a' }}>أوقات العمل (كل 30 دقيقة)</strong>
                  <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 700 }}>{workingHours.length} فترة متاحة</span>
                </div>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>
                  اختر الفترات المتاحة لاستقبال المواعيد:
                </p>

                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  <button type="button" onClick={() => selectPresetHours('day')} style={{ ...secondaryBtn, flex: 1, padding: '7px 4px', fontSize: 11 }}>
                    نهاري (09-19:30)
                  </button>
                  <button type="button" onClick={() => selectPresetHours('evening')} style={{ ...secondaryBtn, flex: 1, padding: '7px 4px', fontSize: 11 }}>
                    مسائي (14-23:00)
                  </button>
                  <button type="button" onClick={() => selectPresetHours('all')} style={{ ...secondaryBtn, flex: 1, padding: '7px 4px', fontSize: 11 }}>
                    تحديد الكل
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, direction: 'ltr' }}>
                  {ALL_HALF_HOURS.map((hr) => {
                    const isSelected = workingHours.includes(hr);
                    return (
                      <button
                        key={hr}
                        type="button"
                        onClick={() => toggleWorkingHour(hr)}
                        style={{
                          padding: '8px 4px',
                          borderRadius: 8,
                          border: isSelected ? '1px solid #0f172a' : '1px solid #cbd5e1',
                          background: isSelected ? '#0f172a' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#64748b',
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

              <div style={sectionCard}>
                <strong style={{ display: 'block', marginBottom: 10, fontSize: 13, color: '#0f172a' }}>بيانات الحساب</strong>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>اسم المشروع</label>
                <input type="text" style={inputStyle} value={bizName} onChange={(e) => setBizName(e.target.value)} required />

                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>اسم المسؤول</label>
                <input type="text" style={inputStyle} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />

                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>رقم الهاتف</label>
                <input type="tel" style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} required />

                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>البريد الإلكتروني</label>
                <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />

                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>رمز الدخول السري (PIN)</label>
                <input type="text" maxLength="6" style={{ ...inputStyle, textAlign: 'center', letterSpacing: 4, fontWeight: 700 }} value={pinCode} onChange={(e) => setPinCode(e.target.value)} required />
              </div>

              <button type="submit" disabled={savingSettings} style={{ ...primaryBtn, width: '100%', padding: 13, fontSize: 14 }}>
                {savingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

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
      setScanError('لم يتم العثور على حجز مطابق لـ: ' + clean);
    }
  };


   const startCameraScan = async () => {
    setScanError('');
    setScannedBooking(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScanError('المتصفح لا يسمح بالوصول للكاميرا (تأكد من فتح الموقع عبر HTTPS).');
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
      setScanError('تعذر فتح الكاميرا. تأكد من السماح بإذن الكاميرا في المتصفح.');
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
        setScanError('لم يتم العثور على رمز QR واضح في هذه الصورة.');
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

  const handleImproveBioAI = async () => {
    setImprovingBio(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'improve_bio',
          businessName: bizName,
          bio: bio
        }
      });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      if (data && data.result) {
        setBio(data.result);
      }
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
        body: {
          action: 'verify_receipt',
          receiptUrl: b.receipt_url,
          expectedAmount: expectedAmount
        }
      });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      if (data && data.result) {
        setReceiptReports((prev) => ({ ...prev, [b.id]: data.result }));
                const updates = { ai_note: data.result };
        if (data.auto_approve === true) {
          updates.status = 'confirmed';
        }
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
      if (data && data.result) {
        setGeneratedAd(data.result);
      }
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
    if (!serviceCategory.trim()) {
      return alert('يرجى كتابة نوع نشاطك أولاً (مثال: حلاقة رجال، تجميل، أظافر...)');
    }
    setSuggestingServices(true);
    setSuggestedServices([]);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'suggest_services',
          businessCategory: serviceCategory.trim()
        }
      });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      if (data && data.result) {
        const cleanJson = data.result.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed)) {
          setSuggestedServices(parsed);
        } else {
          throw new Error('صيغة البيانات غير صالحة');
        }
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
        ' | الأرباح التقديرية المؤكدة: ' + totalRevenue + ' درهم مغربي' +
        ' | عدد الخدمات المتوفرة: ' + services.length;

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'analyze_stats',
          businessName: provider.business_name,
          statsSummary: summary
        }
      });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      if (data && data.result) {
        setStatsAdvice(data.result);
      }
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
      if (data && data.error) throw new Error(data.error);
      const finalMsg = (data && data.result)
        ? data.result
        : ('مرحبا ' + client.name + '، توحشناك في ' + provider.business_name + '! احجز موعدك الجديد عبر: ' + bookingLink);

      const ph = formatMoroccanPhone(client.phone);
      window.location.assign('https://wa.me' + ph + '?text=' + encodeURIComponent(finalMsg));
    } catch (err) {
      alert('تعذر توليد الرسالة: ' + err.message);
    } finally {
      setGeneratingRetentionPhone(null);
    }
  };
  const handleLogoUpload = async (e) => {
    const file = e.target.files.item(0);
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
    window.location.assign('https://wa.me?text=' + encodeURIComponent(textMsg));
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
      return alert('تعذر التحديث: تأكد من تفعيل صلاحية UPDATE في إعدادات RLS لجدول bookings في Supabase.');
    }

    if (onRefresh) await onRefresh();

    const msg = 'مرحبا ' + b.client_name + '، نذكرك بموعدك اليوم في ' + provider.business_name + ' على الساعة ' + b.booking_time + '. نتشرف بحضورك!';
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
      return alert('لم يتم حفظ التغيير! تأكد من تفعيل صلاحية UPDATE في Supabase.');
    }

    if (onRefresh) await onRefresh();

    if (newStatus === 'confirmed') {
      window.location.assign(getWhatsAppUrl(b));
    } else {
      alert('تم رفض الحجز بنجاح');
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

  const toggleWorkingHour = (hr) => {
    if (workingHours.includes(hr)) {
      if (workingHours.length <= 1) return alert('يجب ترك وقت عمل واحد على الأقل');
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
    if (paymentMethods.length === 0) return alert('يجب إضافة طريقة دفع واحدة على الأقل');
    if (workingHours.length === 0) return alert('يجب اختيار وقت عمل واحد على الأقل');
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
    alert('تم حفظ جميع التعديلات بنجاح ✅');
    onRefresh();
  };
  const pageFont = { fontFamily: "'Cairo', sans-serif", direction: 'rtl' };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    margin: '5px 0 12px',
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
    padding: 15,
    marginBottom: 16
  };

  return (
    <div style={{ ...pageFont, maxWidth: 460, margin: '8px auto', background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.06)' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#fff', padding: '22px 20px', textAlign: 'center' }}>
        <span style={{ background: 'rgba(255,255,255,0.18)', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
          لوحة التحكم • عربون
        </span>
        <h3 style={{ margin: '8px 0 2px', fontSize: 21, fontWeight: 800 }}>{provider.business_name}</h3>
        <p style={{ margin: 0, color: '#dbeafe', fontSize: 12 }}>إدارة الحجوزات، الخدمات، وأوقات العمل</p>
      </div>

      <div style={{ padding: 18 }}>
        <SubscriptionBanner provider={provider} />
        {upcomingReminders.length > 0 && (
          <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#c2410c', marginBottom: 8 }}>
              ⏰ مواعيد تقترب (متبقي ساعتان أو أقل):
            </div>
            {upcomingReminders.map((rem) => (
              <div key={rem.id} style={{ background: '#fff', border: '1px solid #fed7aa', borderRadius: 10, padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 13 }}>
                  <strong>{rem.client_name}</strong>
                  <div style={{ color: '#64748b', fontSize: 12 }}>الساعة: {rem.booking_time}</div>
                </div>
                <button
                  type="button"
                  disabled={updatingId === rem.id}
                  onClick={() => handleSendReminder(rem)}
                  style={{ background: '#ea580c', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                >
                  {updatingId === rem.id ? 'جاري...' : 'إرسال تذكير 💬'}
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={sectionCard}>
          <div style={{ fontSize: 12, color: '#1e3a8a', marginBottom: 6, fontWeight: 800 }}>
            🔗 رابط الحجز الخاص بزبائنك:
          </div>
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 12px', fontSize: 12, color: '#0f172a', direction: 'ltr', textAlign: 'left', overflowX: 'auto', whiteSpace: 'nowrap', marginBottom: 10 }}>
            {bookingLink}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              onClick={handleCopyLink}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none', background: copied ? '#16a34a' : '#1e293b', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {copied ? 'تم النسخ ✅' : 'نسخ الرابط 📋'}
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none', background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              مشاركة واتساب 💬
            </button>
          </div>

          <button
            type="button"
            disabled={generatingAd}
            onClick={handleGenerateAdAI}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {generatingAd ? 'جاري كتابة إعلان جذاب...' : 'كتابة إعلان ترويجي بالذكاء الاصطناعي 📣'}
          </button>

          {generatedAd && (
            <div style={{ marginTop: 10, background: '#fff', border: '1px solid #ddd6fe', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#5b21b6', marginBottom: 6 }}>
                ✨ إعلانك جاهز للنشر في ستوري واتساب وإنستغرام:
              </div>
              <div style={{ fontSize: 13, color: '#1e293b', whiteSpace: 'pre-line', lineHeight: 1.6, background: '#f5f3ff', padding: 10, borderRadius: 8, marginBottom: 8 }}>
                {generatedAd}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={handleCopyAd}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: copiedAd ? '#16a34a' : '#5b21b6', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {copiedAd ? 'تم نسخ الإعلان ✅' : 'نسخ الإعلان 📋'}
                </button>
                <a
                  href={'https://wa.me' + encodeURIComponent(generatedAd)}
                  style={{ flex: 1, textAlign: 'center', textDecoration: 'none', padding: '8px', borderRadius: 8, background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 12 }}
                >
                  نشر في واتساب 💬
                </a>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 18, background: '#f1f5f9', padding: 5, borderRadius: 14 }}>
          <button
            onClick={() => setTab('bookings')}
            style={{ flex: 1, padding: '10px 6px', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 12, background: tab === 'bookings' ? '#2563eb' : 'transparent', color: tab === 'bookings' ? '#fff' : '#475569', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            الحجوزات ({bookings.length})
          </button>
          <button
            onClick={() => setTab('services')}
            style={{ flex: 1, padding: '10px 6px', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 12, background: tab === 'services' ? '#2563eb' : 'transparent', color: tab === 'services' ? '#fff' : '#475569', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            الخدمات ({services.length})
          </button>
          <button
            onClick={() => setTab('stats')}
            style={{ flex: 1, padding: '10px 6px', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 12, background: tab === 'stats' ? '#16a34a' : 'transparent', color: tab === 'stats' ? '#fff' : '#475569', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            الأرباح 📊
          </button>
          <button
            onClick={() => setTab('premium')}
            style={{ flex: 1, padding: '10px 4px', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 11, background: tab === 'premium' ? '#d97706' : 'transparent', color: tab === 'premium' ? '#fff' : '#b45309', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            VIP 👑
          </button>
          <button
            onClick={() => setTab('settings')}
            style={{ flex: 1, padding: '10px 6px', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 12, background: tab === 'settings' ? '#2563eb' : 'transparent', color: tab === 'settings' ? '#fff' : '#475569', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ⚙️
          </button>
        </div>
        {tab === 'premium' && <PremiumTab provider={provider} bookings={bookings} services={services} />}

        {tab === 'stats' && (
          <div>
            <StatsTab bookings={bookings} services={services} />

            <div style={{ ...sectionCard, marginTop: 14, background: '#f5f3ff', borderColor: '#ddd6fe' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 13, color: '#5b21b6' }}>🧠 مستشار الأرباح الذكي:</strong>
                <button
                  type="button"
                  disabled={analyzingStats}
                  onClick={handleAnalyzeStatsAI}
                  style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {analyzingStats ? 'جاري التحليل...' : 'تحليل أرباحي ونصائح ✨'}
                </button>
              </div>
              {statsAdvice ? (
                <div style={{ background: '#fff', padding: 12, borderRadius: 10, fontSize: 13, color: '#1e293b', lineHeight: 1.7, whiteSpace: 'pre-line', border: '1px solid #e9d5ff' }}>
                  {statsAdvice}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                  اضغط على الزر للحصول على 3 نصائح عملية لزيادة أرباحك وتنظيم مواعيدك بناءً على بيانات مشروعك.
                </p>
              )}
            </div>

            {inactiveClients.length > 0 && (
              <div style={{ ...sectionCard, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <strong style={{ display: 'block', fontSize: 13, color: '#166534', marginBottom: 4 }}>
                  💌 استعادة الزبائن الغائبين (+30 يوم):
                </strong>
                <p style={{ fontSize: 12, color: '#475569', margin: '0 0 10px' }}>
                  أرسل لهم رسالة ترحيبية مخصصة بالدارجة عبر واتساب لتشجيعهم على العودة:
                </p>
                {inactiveClients.map((cl, idx) => (
                  <div key={idx} style={{ background: '#fff', border: '1px solid #dcfce7', borderRadius: 10, padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 12 }}>
                      <strong style={{ color: '#0f172a', fontSize: 13 }}>{cl.name}</strong>
                      <div style={{ color: '#64748b' }}>آخر زيارة: {cl.lastDate}</div>
                    </div>
                    <button
                      type="button"
                      disabled={generatingRetentionPhone === cl.phone}
                      onClick={() => handleSendRetentionAI(cl)}
                      style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '7px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                    >
                      {generatingRetentionPhone === cl.phone ? 'جاري الصياغة...' : 'رسالة ذكية 💬'}
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
                  width: '100%',
                  background: showScanner ? '#334155' : 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: 12,
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                {showScanner ? 'إغلاق ماسح التذاكر ✕' : '📷 مسح تذكرة QR أو البحث برقم التذكرة'}
              </button>

              {showScanner && (
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 14, padding: 14, marginTop: 10 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <input
                      type="text"
                      placeholder="اكتب رقم التذكرة (مثال: 3RB-1A83D376) أو الهاتف"
                      value={ticketQuery}
                      onChange={(e) => setTicketQuery(e.target.value)}
                      style={{ ...inputStyle, margin: 0, flex: 1, fontSize: 13 }}
                    />
                    <button
                      type="button"
                      onClick={() => findBookingByText(ticketQuery)}
                      style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      بحث
                    </button>
                  </div>

                  {!scanningCamera ? (
                                   <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={startCameraScan}
                    style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none', padding: 10, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    فتح الكاميرا 📷
                  </button>
                  <label
                    style={{ flex: 1, background: '#0f172a', color: '#fff', padding: 10, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    رفع صورة QR 🖼️
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
                    <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 9, borderRadius: 8, fontSize: 12, fontWeight: 700, marginTop: 10 }}>
                      {scanError}
                    </div>
                  )}

                  {scannedBooking && (
                    <div style={{ background: '#fff', border: '2px solid #2563eb', borderRadius: 12, padding: 12, marginTop: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <strong style={{ fontSize: 15, color: '#0f172a' }}>{scannedBooking.client_name}</strong>
                        <span style={{
                          padding: '3px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          background: scannedBooking.status === 'confirmed' ? '#dcfce7' : '#fef9c3',
                          color: scannedBooking.status === 'confirmed' ? '#166534' : '#854d0e'
                        }}>
                          {scannedBooking.status === 'confirmed' ? 'مؤكد ✅' : scannedBooking.status === 'rejected' ? 'مرفوض ❌' : 'معلق ⏳'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#2563eb', fontWeight: 700 }}>
                        📅 {scannedBooking.booking_date} • ⏰ {scannedBooking.booking_time}
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                        📞 {scannedBooking.client_phone}
                      </div>
                      {scannedBooking.status !== 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => updateStatus(scannedBooking, 'confirmed')}
                          style={{ width: '100%', marginTop: 10, background: '#16a34a', color: '#fff', border: 'none', padding: 9, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          تأكيد الحجز الآن ✓
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {bookings.length === 0 && (
              <div style={{ textAlign: 'center', color: '#64748b', fontSize: 14, padding: 28, background: '#f8fafc', borderRadius: 14 }}>
                لا توجد حجوزات بعد. شارك رابطك لاستقبال أول حجز!
              </div>
            )}
            {bookings.map((b) => (
              <div key={b.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, marginBottom: 12, background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{b.client_name}</strong>
                  <span style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: b.status === 'confirmed' ? '#dcfce7' : b.status === 'rejected' ? '#fee2e2' : '#fef9c3',
                    color: b.status === 'confirmed' ? '#166534' : b.status === 'rejected' ? '#991b1b' : '#854d0e'
                  }}>
                    {b.status === 'confirmed' ? 'مؤكد ✅' : b.status === 'rejected' ? 'مرفوض ❌' : 'معلق ⏳'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#2563eb', fontWeight: 700, marginTop: 6 }}>
                  📅 {b.booking_date} • ⏰ {b.booking_time}
                </div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                  📞 {b.client_phone}
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
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                              <a
                                href={b.receipt_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                              >
                                عرض وصل الدفع ↗
                              </a>

                              {hasAiAccess ? (
                                <button
                                  type="button"
                                  disabled={checkingReceiptId === b.id}
                                  onClick={() => handleVerifyReceiptAI(b)}
                                  style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                                >
                                  {checkingReceiptId === b.id ? 'جاري الفحص...' : 'إعادة فحص بالذكاء الاصطناعي 🤖'}
                                </button>
                              ) : (
                                <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', padding: '7px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                                  👑 الفحص الذكي التلقائي متاح في Premium
                                </span>
                              )}
                            </div>
                          )}

                          {aiSummary && (
                            <div
                              style={{
                                marginTop: 8,
                                padding: '10px 12px',
                                borderRadius: 10,
                                fontSize: 12,
                                lineHeight: 1.6,
                                fontWeight: 700,
                                background: isAutoApproved ? '#f0fdf4' : '#fef2f2',
                                border: isAutoApproved ? '1px solid #86efac' : '1px solid #fca5a5',
                                color: isAutoApproved ? '#166534' : '#991b1b'
                              }}
                            >
                              <div style={{ fontSize: 11, marginBottom: 3, opacity: 0.9 }}>
                                {isAutoApproved
                                  ? '🤖 تم الفحص والتأكيد تلقائياً بواسطة الذكاء الاصطناعي:'
                                  : '⚠️ نتيجة فحص الذكاء الاصطناعي (سبب عدم القبول التلقائي):'}
                              </div>
                              <div>{aiSummary}</div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                  {b.status !== 'confirmed' && (
                    <button
                      type="button"
                      disabled={updatingId === b.id}
                      onClick={() => updateStatus(b, 'confirmed')}
                      style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none', padding: 9, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {updatingId === b.id ? 'جاري التنفيذ...' : 'قبول وواتساب ✓'}
                    </button>
                  )}

                  {b.status === 'confirmed' && (
                    <a
                      href={getWhatsAppUrl(b)}
                      style={{ flex: 1, textAlign: 'center', textDecoration: 'none', background: '#25D366', color: '#fff', padding: 9, borderRadius: 8, fontWeight: 700, fontSize: 13 }}
                    >
                      مراسلة واتساب 💬
                    </a>
                  )}

                  {b.status !== 'rejected' && (
                    <button
                      type="button"
                      disabled={updatingId === b.id}
                      onClick={() => updateStatus(b, 'rejected')}
                      style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '9px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      رفض
                    </button>
                  )}

                  {b.status === 'confirmed' && (
                    <button
                      type="button"
                      disabled={updatingId === b.id}
                      onClick={() => handleSendReminder(b)}
                      style={{ background: b.reminder_sent ? '#e2e8f0' : '#f97316', color: b.reminder_sent ? '#475569' : '#fff', border: 'none', padding: '9px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {b.reminder_sent ? 'ذُكّر ✅' : 'تذكير ⏰'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'services' && (
          <div>
            <div style={{ ...sectionCard, background: '#f5f3ff', borderColor: '#ddd6fe' }}>
              <strong style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#5b21b6' }}>
                ✨ مقترح الخدمات والأسعار الذكي:
              </strong>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>
                اكتب نوع نشاطك وسيقترح الذكاء الاصطناعي 5 خدمات جاهزة بالدرهم المغربي:
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  placeholder="مثال: حلاقة رجال، تجميل، أظافر..."
                  style={{ ...inputStyle, margin: 0, flex: 2 }}
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                />
                <button
                  type="button"
                  disabled={suggestingServices}
                  onClick={handleSuggestServicesAI}
                  style={{ flex: 1, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', padding: '0 10px' }}
                >
                  {suggestingServices ? 'جاري...' : 'اقتراح ✨'}
                </button>
              </div>

              {suggestedServices.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {suggestedServices.map((srv, idx) => (
                    <div key={idx} style={{ background: '#fff', border: '1px solid #e9d5ff', borderRadius: 10, padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 12 }}>
                        <strong style={{ display: 'block', color: '#0f172a', fontSize: 13 }}>{srv.title}</strong>
                        <span style={{ color: '#475569' }}>
                          الثمن: {srv.total_price} درهم • العربون: <strong style={{ color: '#16a34a' }}>{srv.deposit_amount} درهم</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={addingSuggestedIdx === idx}
                        onClick={() => handleAddSuggestedService(srv, idx)}
                        style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '7px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                      >
                        {addingSuggestedIdx === idx ? 'جاري...' : '+ إضافة'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleAddService} style={sectionCard}>
              <strong style={{ display: 'block', marginBottom: 10, fontSize: 14, color: '#1e3a8a' }}>+ إضافة خدمة جديدة يدوياً</strong>
              <input type="text" placeholder="اسم الخدمة (مثال: قص الشعر)" style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} required />
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" placeholder="الثمن (درهم)" style={inputStyle} value={price} onChange={(e) => setPrice(e.target.value)} required />
                <input type="number" placeholder="العربون (درهم)" style={inputStyle} value={deposit} onChange={(e) => setDeposit(e.target.value)} required />
              </div>
              <button type="submit" disabled={saving} style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: 12, borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'جاري الحفظ...' : 'حفظ الخدمة ✓'}
              </button>
            </form>

            {services.map((s) => (
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
                {paymentMethods.map((pm, idx) => (
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
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>
                  اضغط على الساعة لتفعيلها (أخضر) أو إغلاقها (أبيض):
                </p>

                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  <button type="button" onClick={() => selectPresetHours('day')} style={{ flex: 1, padding: '7px 4px', fontSize: 11, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
                    نهاري (09-19:30)
                  </button>
                  <button type="button" onClick={() => selectPresetHours('evening')} style={{ flex: 1, padding: '7px 4px', fontSize: 11, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
                    مسائي (14-23:00)
                  </button>
                  <button type="button" onClick={() => selectPresetHours('all')} style={{ flex: 1, padding: '7px 4px', fontSize: 11, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
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

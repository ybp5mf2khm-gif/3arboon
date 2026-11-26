import React, { useState, useRef, useEffect } from 'react';
import { supabase } from './supabaseClient';

const RobotAvatar = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://w3.org">
    <line x1="32" y1="6" x2="32" y2="15" stroke="#93C5FD" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="32" cy="6" r="4" fill="#38BDF8" />
    <rect x="8" y="26" width="5" height="14" rx="2.5" fill="#1D4ED8" />
    <rect x="51" y="26" width="5" height="14" rx="2.5" fill="#1D4ED8" />
    <rect x="13" y="15" width="38" height="34" rx="12" fill="url(#robotHeadGrad)" stroke="#DBEAFE" strokeWidth="2" />
    <rect x="18" y="22" width="28" height="16" rx="7" fill="#0F172A" />
    <circle cx="26" cy="30" r="3.5" fill="#38BDF8" />
    <circle cx="38" cy="30" r="3.5" fill="#38BDF8" />
    <circle cx="27" cy="29" r="1.2" fill="#FFFFFF" />
    <circle cx="39" cy="29" r="1.2" fill="#FFFFFF" />
    <path d="M27 42.5C29.5 44.5 34.5 44.5 37 42.5" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
    <defs>
      <linearGradient id="robotHeadGrad" x1="13" y1="15" x2="51" y2="49" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3B82F6" />
        <stop offset="1" stopColor="#1E3A8A" />
      </linearGradient>
    </defs>
  </svg>
);
export default function ChatBotWidget({
  allProviders = [],
  allServices = [],
  currentProvider = null,
  currentServices = [],
  onBookingCreated
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);

  const [bookingDraft, setBookingDraft] = useState({
    step: 'idle',
    provider: null,
    service: null,
    date: '',
    time: '',
    clientName: '',
    clientPhone: ''
  });

  const [pos, setPos] = useState({
    x: 16,
    y: typeof window !== 'undefined' ? window.innerHeight - 86 : 550
  });
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const messagesEndRef = useRef(null);
  useEffect(() => {
    const welcomeText = currentProvider
      ? 'مرحباً بك في ' + currentProvider.business_name + ' 👋! أنا روبوت الاستقبال الذكي الخاص بالمحل. كيف أساعدك؟ يمكنك طرح أي سؤال بالدارجة أو العربية، أو حجز موعدك مباشرة من هنا 👇'
      : 'مرحباً بك في منصة 3arboon 🇲🇦! أنا الروبوت المساعد. اسألني عن أي محل أو خدمة، أو ابدأ حجز موعدك مباشرة 👇';

    setMessages([{ role: 'bot', text: welcomeText, choices: [], matchedProvs: [] }]);
    setBookingDraft({
      step: 'idle',
      provider: currentProvider || null,
      service: null,
      date: '',
      time: '',
      clientName: '',
      clientPhone: ''
    });
  }, [currentProvider && currentProvider.id]);

  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => ({
        x: Math.min(Math.max(10, prev.x), window.innerWidth - 78),
        y: Math.min(Math.max(10, prev.y), window.innerHeight - 78)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);
  const startDrag = (clientX, clientY) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragOffsetRef.current = { x: clientX - pos.x, y: clientY - pos.y };
  };

  const onDrag = (clientX, clientY) => {
    if (!isDraggingRef.current) return;
    const nextX = clientX - dragOffsetRef.current.x;
    const nextY = clientY - dragOffsetRef.current.y;
    if (Math.abs(nextX - pos.x) > 4 || Math.abs(nextY - pos.y) > 4) {
      hasMovedRef.current = true;
    }
    setPos({
      x: Math.min(Math.max(8, nextX), window.innerWidth - 76),
      y: Math.min(Math.max(8, nextY), window.innerHeight - 76)
    });
  };

  const endDrag = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    const handleMouseMove = (e) => onDrag(e.clientX, e.clientY);
    const handleTouchMove = (e) => {
      if (isDraggingRef.current && e.touches && e.touches.length > 0) {
        e.preventDefault();
        onDrag(e.touches.item(0).clientX, e.touches.item(0).clientY);
      }
    };
    const handleUp = () => endDrag();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  });
  const getProviderServices = (prov) => {
    if (!prov) return [];
    if (currentProvider && String(currentProvider.id) === String(prov.id) && currentServices.length > 0) {
      return currentServices;
    }
    return allServices.filter((s) => String(s.provider_id) === String(prov.id));
  };

  const buildPlatformContext = () => {
    if (currentProvider) {
      const srvs = getProviderServices(currentProvider);
      const srvText = srvs.length > 0
        ? srvs.map((s) => `• ${s.title}: الثمن ${s.total_price || s.price || 0} د.م (العربون: ${s.deposit_amount} د.م)`).join('\n')
        : 'لا توجد خدمات مضافة حالياً.';
      const hrs = Array.isArray(currentProvider.working_hours) && currentProvider.working_hours.length > 0
        ? currentProvider.working_hours.join(' - ')
        : 'من 09:00 إلى 17:30';
      return (
        `معرف المحل (ID): ${currentProvider.id}\n` +
        `اسم المحل: ${currentProvider.business_name}\n` +
        `الوصف: ${currentProvider.bio || 'غير متوفر'}\n` +
        `أوقات العمل: ${hrs}\n` +
        `الخدمات والأسعار:\n${srvText}`
      );
    }

    if (!allProviders || allProviders.length === 0) {
      return 'لا توجد محلات مفعلة حالياً في المنصة.';
    }

    return allProviders
      .map((p) => {
        const pSrvs = getProviderServices(p);
        const sList = pSrvs.length > 0
          ? pSrvs.map((s) => `${s.title} (${s.total_price || s.price || 0} د.م، عربون ${s.deposit_amount} د.م)`).join(' | ')
          : 'خدمات عامة';
        return `- [ID: ${p.id}] محل: ${p.business_name} | الوصف: ${p.bio || '-'} | الخدمات: ${sList}`;
      })
      .join('\n');
  };

  const getAvailableSlotsForDate = async (prov, dateStr) => {
    const defaultHours = (Array.isArray(prov.working_hours) && prov.working_hours.length > 0)
      ? prov.working_hours
      : ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];

    const weeklyOff = Array.isArray(prov.weekly_off) ? prov.weekly_off : [];
    const closedDates = Array.isArray(prov.closed_dates) ? prov.closed_dates : [];

    if (closedDates.includes(dateStr)) {
      return { closed: true, slots: [] };
    }
    const dObj = new Date(dateStr + 'T12:00:00');
    if (!isNaN(dObj.getTime()) && weeklyOff.includes(dObj.getDay())) {
      return { closed: true, slots: [] };
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('booking_time')
      .eq('provider_id', prov.id)
      .eq('booking_date', dateStr)
      .neq('status', 'rejected');

    const taken = (!error && Array.isArray(data)) ? data.map((b) => b.booking_time) : [];
    const free = defaultHours.filter((hr) => !taken.includes(hr));
    return { closed: false, slots: free };
  };
  const startInteractiveBooking = (provOverride = null, preselectedServiceName = null) => {
    const targetProv = provOverride || currentProvider;

    if (!targetProv) {
      if (allProviders.length === 0) {
        setMessages((prev) => [
          ...prev,
          { role: 'bot', text: 'لا توجد محلات مفعلة حالياً للحجز.', choices: [], matchedProvs: [] }
        ]);
        return;
      }
      setBookingDraft({
        step: 'select_provider',
        provider: null,
        service: null,
        date: '',
        time: '',
        clientName: '',
        clientPhone: ''
      });
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: 'بكل سرور! 🗓️ اختر المحل أو الصالون الذي تود الحجز فيه:',
          choices: allProviders.map((p) => ({
            type: 'provider',
            label: '🏪 ' + p.business_name,
            value: p
          })),
          matchedProvs: []
        }
      ]);
      return;
    }

    const srvs = getProviderServices(targetProv);
    if (srvs.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: 'عذراً، ' + targetProv.business_name + ' لم يضف خدماته بعد.',
          choices: [],
          matchedProvs: []
        }
      ]);
      return;
    }

    if (preselectedServiceName) {
      const matchedSrv = srvs.find((s) =>
        s.title && s.title.toLowerCase().includes(String(preselectedServiceName).toLowerCase())
      );
      if (matchedSrv) {
        const nextDays = [];
        for (let i = 0; i < 5; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          const iso = d.toISOString().split('T').at(0);
          const dayLabel = i === 0 ? 'اليوم (' + iso + ')' : i === 1 ? 'غداً (' + iso + ')' : iso;
          nextDays.push({ type: 'date', label: '📅 ' + dayLabel, value: iso });
        }

        setBookingDraft({
          step: 'select_date',
          provider: targetProv,
          service: matchedSrv,
          date: '',
          time: '',
          clientName: '',
          clientPhone: ''
        });

        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            text: `ممتاز! اخترت خدمة "${matchedSrv.title}" (${matchedSrv.total_price || matchedSrv.price || 0} د.م) في ${targetProv.business_name}.\nاختر تاريخ الموعد المناسب لك:`,
            choices: [...nextDays, { type: 'cancel_booking', label: '✕ إلغاء الحجز', value: null }],
            matchedProvs: []
          }
        ]);
        return;
      }
    }

    setBookingDraft({
      step: 'select_service',
      provider: targetProv,
      service: null,
      date: '',
      time: '',
      clientName: '',
      clientPhone: ''
    });

    setMessages((prev) => [
      ...prev,
      {
        role: 'bot',
        text: 'ممتاز! اختر الخدمة التي تريدها في ' + targetProv.business_name + ':',
        choices: srvs.map((s) => ({
          type: 'service',
          label: '✨ ' + s.title + ' (' + (s.total_price || s.price || 0) + ' د.م | عربون ' + s.deposit_amount + ' د.م)',
          value: s
        })),
        matchedProvs: []
      }
    ]);
  };
  const handleChoiceSelect = async (choice) => {
    if (sending) return;

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: choice.label, choices: [], matchedProvs: [] }
    ]);

    if (choice.type === 'cancel_booking') {
      setBookingDraft({
        step: 'idle',
        provider: currentProvider || null,
        service: null,
        date: '',
        time: '',
        clientName: '',
        clientPhone: ''
      });
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: 'تم إلغاء عملية الحجز. كيف يمكنني مساعدتك؟', choices: [], matchedProvs: [] }
      ]);
      return;
    }

    if (choice.type === 'provider') {
      startInteractiveBooking(choice.value, choice.serviceName || null);
      return;
    }

    if (choice.type === 'service') {
      const nextDays = [];
      for (let i = 0; i < 5; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const iso = d.toISOString().split('T').at(0);
        const dayLabel = i === 0 ? 'اليوم (' + iso + ')' : i === 1 ? 'غداً (' + iso + ')' : iso;
        nextDays.push({ type: 'date', label: '📅 ' + dayLabel, value: iso });
      }

      setBookingDraft((prev) => ({
        ...prev,
        step: 'select_date',
        service: choice.value
      }));

      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: 'اختر تاريخ الموعد المناسب لك (أو اكتب التاريخ بصيغة YYYY-MM-DD):',
          choices: [...nextDays, { type: 'cancel_booking', label: '✕ إلغاء الحجز', value: null }],
          matchedProvs: []
        }
      ]);
      return;
    }

    if (choice.type === 'date') {
      setSending(true);
      const { closed, slots } = await getAvailableSlotsForDate(bookingDraft.provider, choice.value);
      setSending(false);

      if (closed || slots.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            text: closed
              ? '🏖️ عذراً، المحل مغلق في يوم ' + choice.value + '. اختر يوماً آخر:'
              : '🔒 جميع الأوقات محجوزة يوم ' + choice.value + '. اختر يوماً آخر:',
            choices: [{ type: 'cancel_booking', label: '✕ إلغاء الحجز', value: null }],
            matchedProvs: []
          }
        ]);
        return;
      }

      setBookingDraft((prev) => ({
        ...prev,
        step: 'select_time',
        date: choice.value
      }));

      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: 'الساعات المتاحة يوم ' + choice.value + ' ⏰ اختر الساعة:',
          choices: [
            ...slots.map((hr) => ({ type: 'time', label: '🕒 ' + hr, value: hr })),
            { type: 'cancel_booking', label: '✕ إلغاء', value: null }
          ],
          matchedProvs: []
        }
      ]);
      return;
    }

    if (choice.type === 'time') {
      setBookingDraft((prev) => ({
        ...prev,
        step: 'enter_name',
        time: choice.value
      }));
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: 'رائع! الساعة ' + choice.value + ' محجوزة مبدئياً لك. ✍️ اكتب اسمك الكامل الآن:',
          choices: [{ type: 'cancel_booking', label: '✕ إلغاء', value: null }],
          matchedProvs: []
        }
      ]);
    }
  };
  const askForReceipt = (phoneText) => {
    const prov = bookingDraft.provider;
    const srv = bookingDraft.service;
    const cleanPhone = String(phoneText || '').trim();

    if (!prov || !srv || !bookingDraft.date || !bookingDraft.time || !bookingDraft.clientName) {
      return;
    }

    const paymentList = (Array.isArray(prov.payment_methods) && prov.payment_methods.length > 0)
      ? prov.payment_methods
      : (prov.rib ? [{ bank: prov.bank_name || 'CIH Bank', account: prov.rib }] : []);

    const ribText = paymentList.length > 0
      ? '\n💳 حسابات التحويل المتاحة:\n' +
        paymentList.map((pm) => '• ' + pm.bank + ': ' + pm.account).join('\n')
      : '';

    setBookingDraft((prev) => ({
      ...prev,
      step: 'upload_receipt',
      clientPhone: cleanPhone
    }));

    setMessages((prev) => [
      ...prev,
      {
        role: 'bot',
        text:
          '💰 خطوة أخيرة لتأكيد حجزك في ' + prov.business_name + ':\n' +
          'يرجى تحويل مبلغ العربون (' + srv.deposit_amount + ' درهم)' +
          ribText +
          '\n\nثم ارفع صورة وصل التحويل هنا ليتحقق منه النظام فوراً 👇',
        choices: [{ type: 'cancel_booking', label: '✕ إلغاء الحجز', value: null }],
        matchedProvs: [],
        requireReceiptUpload: true
      }
    ]);
  };

  const handleReceiptUploadAndSave = async (file) => {
    if (!file || sending) return;
    const prov = bookingDraft.provider;
    const srv = bookingDraft.service;

    if (!prov || !srv || !bookingDraft.date || !bookingDraft.time || !bookingDraft.clientName || !bookingDraft.clientPhone) {
      return;
    }

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: '📎 تم اختيار صورة الوصل: ' + file.name, choices: [], matchedProvs: [] }
    ]);

    setSending(true);
    try {
      const { data: existing } = await supabase
        .from('bookings')
        .select('id')
        .eq('provider_id', prov.id)
        .eq('booking_date', bookingDraft.date)
        .eq('booking_time', bookingDraft.time)
        .neq('status', 'rejected');

      if (existing && existing.length > 0) {
        setSending(false);
        setBookingDraft((prev) => ({ ...prev, step: 'select_date', time: '' }));
        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            text: '⚠️ عذراً، تم حجز هذه الساعة للتو! اكتب تاريخاً آخر أو اختر وقتاً جديداً.',
            choices: [],
            matchedProvs: []
          }
        ]);
        return;
      }

      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = Date.now() + '.' + ext;
      const { error: upErr } = await supabase.storage.from('receipts').upload(fileName, file);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);

      const { error: insErr } = await supabase.from('bookings').insert([{
        provider_id: prov.id,
        service_id: srv.id,
        client_name: bookingDraft.clientName,
        client_phone: bookingDraft.clientPhone,
        booking_date: bookingDraft.date,
        booking_time: bookingDraft.time,
        receipt_url: urlData.publicUrl
      }]);

      if (insErr) throw insErr;

      const rawWa = String(prov.phone || '').replace(/\D/g, '');
      let waPhone = rawWa;
      if (waPhone.startsWith('0')) waPhone = '212' + waPhone.slice(1);
      else if (waPhone && !waPhone.startsWith('212')) waPhone = '212' + waPhone;

      const waMsg =
        'مرحبا ' + prov.business_name + '، حجزت موعداً عبر روبوت 3arboon ورفعت وصل التحويل:\n' +
        'الاسم: ' + bookingDraft.clientName + '\n' +
        'الخدمة: ' + srv.title + '\n' +
        'الموعد: ' + bookingDraft.date + ' الساعة ' + bookingDraft.time + '\n' +
        'العربون: ' + srv.deposit_amount + ' درهم';

      const waUrl = waPhone ? ('https://wa.me' + waPhone + '?text=' + encodeURIComponent(waMsg)) : null;

      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text:
            '✅ تم رفع الوصل وتسجيل حجزك بنجاح!\n' +
            '🏪 المحل: ' + prov.business_name + '\n' +
            '✨ الخدمة: ' + srv.title + '\n' +
            '📅 الموعد: ' + bookingDraft.date + ' على الساعة ' + bookingDraft.time + '\n' +
            '🔍 تم إرسال الوصل للنظام للتحقق منه. يمكنك أيضاً إشعار المحل عبر واتساب 👇',
          choices: [],
          matchedProvs: [],
          waUrl
        }
      ]);

      setBookingDraft({
        step: 'idle',
        provider: currentProvider || null,
        service: null,
        date: '',
        time: '',
        clientName: '',
        clientPhone: ''
      });

      if (onBookingCreated) onBookingCreated();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: '⚠️ حدث خطأ أثناء رفع الوصل وحفظ الحجز: ' + err.message,
          choices: [],
          matchedProvs: [],
          requireReceiptUpload: true
        }
      ]);
    } finally {
      setSending(false);
    }
  };
  const sendMessage = async (textToSend) => {
    const q = String(textToSend || input).trim();
    if (!q || sending) return;

    setMessages((prev) => [...prev, { role: 'user', text: q, choices: [], matchedProvs: [] }]);
    setInput('');

    // 1. التعامل مع خطوات الحجز الجارية (إدخال التاريخ، الاسم، الهاتف، أو الوصل)
    if (bookingDraft.step === 'select_date') {
      const dateMatch = q.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        await handleChoiceSelect({ type: 'date', label: dateMatch.at(0), value: dateMatch.at(0) });
        return;
      }
    }

    if (bookingDraft.step === 'enter_name') {
      if (q.length < 2) {
        setMessages((prev) => [
          ...prev,
          { role: 'bot', text: 'يرجى كتابة اسمك الكامل بشكل صحيح:', choices: [], matchedProvs: [] }
        ]);
        return;
      }
      setBookingDraft((prev) => ({ ...prev, step: 'enter_phone', clientName: q }));
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: 'تشرفنا بك يا ' + q + '! 📱 اكتب الآن رقم هاتفك (واتساب) للمتابعة:',
          choices: [{ type: 'cancel_booking', label: '✕ إلغاء', value: null }],
          matchedProvs: []
        }
      ]);
      return;
    }

    if (bookingDraft.step === 'enter_phone') {
      const digits = q.replace(/\D/g, '');
      if (digits.length < 8) {
        setMessages((prev) => [
          ...prev,
          { role: 'bot', text: 'رقم الهاتف غير مكتمل، يرجى إدخال رقم واتساب صحيح (مثال: 0612345678):', choices: [], matchedProvs: [] }
        ]);
        return;
      }
      askForReceipt(q);
      return;
    }

    if (bookingDraft.step === 'upload_receipt') {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: '📎 يرجى الضغط على الزر الأزرق أعلاه لاختيار صورة وصل التحويل من جهازك لإتمام الحجز.',
          choices: [{ type: 'cancel_booking', label: '✕ إلغاء الحجز', value: null }],
          matchedProvs: []
        }
      ]);
      return;
    }

    // 2. إرسال السؤال مباشرة إلى الذكاء الاصطناعي (يفهم الدارجة ويكتشف نية الحجز تلقائياً)
    setSending(true);
    try {
      const chatHistory = messages.slice(-6).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.text
      }));

      const platformData = buildPlatformContext();

      const aiPromise = supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'platform_chat',
          businessName: currentProvider ? currentProvider.business_name : '3arboon',
          platformData,
          chatHistory,
          question: q
        }
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 9000)
      );

      const { data, error } = await Promise.race([aiPromise, timeoutPromise]);
      if (error) throw error;

      const replyText = (data && data.result)
        ? data.result
        : 'كيف يمكنني مساعدتك؟ يمكنك حجز موعدك مباشرة من هنا 👇';

      const hasIntent = Boolean(data && data.has_booking_intent);
      const details = (data && data.booking_details) || {};

      let smartChoices = [];
      let detectedProvider = currentProvider || null;

      if (!detectedProvider && details.provider_id) {
        detectedProvider = allProviders.find((p) => String(p.id) === String(details.provider_id)) || null;
      }
      if (!detectedProvider && details.provider_name) {
        detectedProvider = allProviders.find((p) =>
          p.business_name && p.business_name.toLowerCase().includes(String(details.provider_name).toLowerCase())
        ) || null;
      }

      if (hasIntent) {
        if (detectedProvider) {
          smartChoices.push({
            type: 'provider',
            label: `📅 إتمام الحجز في ${detectedProvider.business_name}${details.service_name ? ' (' + details.service_name + ')' : ''}`,
            value: detectedProvider,
            serviceName: details.service_name || null
          });
        } else {
          smartChoices.push({
            type: 'provider',
            label: '📅 اختر المحل وابدأ الحجز الآن',
            value: null
          });
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: replyText,
          choices: smartChoices,
          matchedProvs: []
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: currentProvider
            ? 'مرحباً بك! يمكنك حجز موعدك مباشرة في ' + currentProvider.business_name + ' بالضغط على الزر أدناه 👇'
            : 'مرحباً بك في 3arboon! يمكنك استعراض المحلات وحجز موعدك مباشرة من هنا 👇',
          choices: [
            {
              type: 'provider',
              label: '📅 ابدأ الحجز الآن',
              value: currentProvider || null
            }
          ],
          matchedProvs: []
        }
      ]);
    } finally {
      setSending(false);
    }
  };
  const openLeft = typeof window !== 'undefined' && pos.x > window.innerWidth / 2;
  const openDown = typeof window !== 'undefined' && pos.y < 360;

  const quickActions = currentProvider
    ? [
        { label: '📅 احجز موعداً الآن', action: () => startInteractiveBooking(currentProvider) },
        { label: '💰 الأسعار والخدمات', action: () => sendMessage('شنو هي الخدمات والأثمنة اللي عندكم؟') },
        { label: '⏰ أوقات العمل', action: () => sendMessage('فوقاش كتحلو؟') }
      ]
    : [
        { label: '📅 احجز موعداً الآن', action: () => startInteractiveBooking(null) },
        { label: '🏪 المحلات المتاحة', action: () => sendMessage('شنو هما المحلات اللي متوفرين فـ المنصة؟') },
        { label: '❓ كيف أحجز؟', action: () => sendMessage('كيفاش نقدر نحجز موعد؟') }
      ];

  return (
    <div
      style={{
        fontFamily: "'Cairo', sans-serif",
        direction: 'rtl',
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        touchAction: 'none'
      }}
    >
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            left: openLeft
              ? Math.max(12, pos.x - 250)
              : Math.min(pos.x, (typeof window !== 'undefined' ? window.innerWidth : 400) - 332),
            top: openDown
              ? Math.min(pos.y + 72, (typeof window !== 'undefined' ? window.innerHeight : 700) - 440)
              : Math.max(12, pos.y - 445),
            width: 324,
            maxWidth: 'calc(100vw - 24px)',
            height: 430,
            maxHeight: '75vh',
            background: '#fff',
            borderRadius: 22,
            boxShadow: '0 16px 40px rgba(15, 23, 42, 0.25)',
            border: '1px solid #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 10000
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)',
              color: '#fff',
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(147,197,253,0.4)'
                }}
              >
                <RobotAvatar size={30} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  {currentProvider ? currentProvider.business_name : '3arboon AI'}
                </div>
                <div style={{ fontSize: 11, color: '#38bdf8' }}>
                  ● {currentProvider ? 'موظف الحجوزات الذكي' : 'مساعد منصة عربون'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.18)',
                color: '#fff',
                border: 'none',
                width: 30,
                height: 30,
                borderRadius: '50%',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              ✕
            </button>
          </div>
          <div
            style={{
              flex: 1,
              padding: 12,
              overflowY: 'auto',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}
          >
            {messages.map((m, idx) => (
              <div key={idx} style={{ alignSelf: m.role === 'user' ? 'flex-start' : 'flex-end', maxWidth: '88%' }}>
                <div
                  style={{
                    background: m.role === 'user' ? '#2563eb' : '#fff',
                    color: m.role === 'user' ? '#fff' : '#0f172a',
                    padding: '9px 12px',
                    borderRadius: m.role === 'user' ? '14px 14px 14px 4px' : '14px 14px 4px 14px',
                    fontSize: 13,
                    lineHeight: 1.6,
                    border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                    whiteSpace: 'pre-line'
                  }}
                >
                  {m.text}
                </div>

                {m.requireReceiptUpload && bookingDraft.step === 'upload_receipt' && (
                  <label
                    style={{
                      display: 'block',
                      marginTop: 8,
                      background: '#2563eb',
                      color: '#fff',
                      textAlign: 'center',
                      padding: '10px 12px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 3px 10px rgba(37, 99, 235, 0.25)'
                    }}
                  >
                    📎 اضغط هنا لرفع صورة الوصل
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const chosenFile = e.target.files && e.target.files.item(0);
                        if (chosenFile) handleReceiptUploadAndSave(chosenFile);
                      }}
                    />
                  </label>
                )}

                {Array.isArray(m.choices) && m.choices.length > 0 && (
                  <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {m.choices.map((ch, cIdx) => (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => handleChoiceSelect(ch)}
                        style={{
                          background:
                            ch.type === 'cancel_booking'
                              ? '#fee2e2'
                              : ch.type === 'provider' && ch.label.startsWith('📅')
                              ? '#16a34a'
                              : '#eff6ff',
                          color:
                            ch.type === 'cancel_booking'
                              ? '#dc2626'
                              : ch.type === 'provider' && ch.label.startsWith('📅')
                              ? '#fff'
                              : '#1d4ed8',
                          border:
                            ch.type === 'cancel_booking'
                              ? '1px solid #fca5a5'
                              : ch.type === 'provider' && ch.label.startsWith('📅')
                              ? '1px solid #15803d'
                              : '1px solid #93c5fd',
                          padding: '7px 11px',
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'inherit'
                        }}
                      >
                        {ch.label}
                      </button>
                    ))}
                  </div>
                )}

                {m.waUrl && (
                  <a
                    href={m.waUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'block',
                      marginTop: 8,
                      background: '#25D366',
                      color: '#fff',
                      textAlign: 'center',
                      padding: '9px 12px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 800,
                      textDecoration: 'none'
                    }}
                  >
                    إرسال إشعار عبر واتساب 💬
                  </a>
                )}

                {Array.isArray(m.matchedProvs) && m.matchedProvs.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {m.matchedProvs.map((mp) => (
                      <button
                        key={mp.id}
                        type="button"
                        onClick={() => startInteractiveBooking(mp)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          padding: '8px 10px',
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'inherit'
                        }}
                      >
                        <span>🏪 {mp.business_name}</span>
                        <span>احجز هنا مباشرة ←</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div
                style={{
                  alignSelf: 'flex-end',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  padding: '8px 12px',
                  borderRadius: 14,
                  fontSize: 12,
                  color: '#64748b'
                }}
              >
                {bookingDraft.step === 'upload_receipt'
                  ? '3arboon يرفع الوصل ويؤكد الحجز... ⚡'
                  : '3arboon يكتب الرد... ✨'}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {bookingDraft.step === 'idle' && (
            <div
              style={{
                padding: '6px 10px',
                background: '#f1f5f9',
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                borderTop: '1px solid #e2e8f0'
              }}
            >
              {quickActions.map((qa, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={qa.action}
                  style={{
                    background: i === 0 ? '#16a34a' : '#fff',
                    border: i === 0 ? '1px solid #15803d' : '1px solid #cbd5e1',
                    color: i === 0 ? '#fff' : '#1e3a8a',
                    padding: '5px 10px',
                    borderRadius: 14,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    flexShrink: 0
                  }}
                >
                  {qa.label}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            style={{ display: 'flex', gap: 6, padding: 10, background: '#fff', borderTop: '1px solid #e2e8f0' }}
          >
            <input
              type="text"
              placeholder={
                bookingDraft.step === 'enter_name'
                  ? 'اكتب اسمك الكامل...'
                  : bookingDraft.step === 'enter_phone'
                  ? 'اكتب رقم واتساب (06...)...'
                  : bookingDraft.step === 'upload_receipt'
                  ? 'ارفع صورة الوصل من الزر أعلاه...'
                  : 'اكتب رسالتك لـ 3arboon...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 12,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontFamily: 'inherit',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              style={{
                background: '#1e40af',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '0 14px',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              إرسال
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          if (e.touches && e.touches.length > 0) {
            startDrag(e.touches.item(0).clientX, e.touches.item(0).clientY);
          }
        }}
        onClick={() => {
          if (!hasMovedRef.current) {
            setIsOpen((prev) => !prev);
          }
        }}
        title="اسحبني لأي مكان أو اضغط للمحادثة"
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #0f172a 0%, #1d4ed8 100%)',
          border: '2.5px solid #93c5fd',
          boxShadow: '0 8px 22px rgba(30, 64, 175, 0.45)',
          cursor: 'grab',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          position: 'relative',
          userSelect: 'none'
        }}
      >
        <RobotAvatar size={34} />
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            color: '#fff',
            background: '#2563eb',
            padding: '1px 6px',
            borderRadius: 8,
            marginTop: -3,
            letterSpacing: 0.3,
            border: '1px solid #93c5fd'
          }}
        >
          3arboon
        </span>
      </button>
    </div>
  );
}

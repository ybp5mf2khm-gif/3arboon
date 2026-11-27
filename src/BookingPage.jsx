import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function BookingPage({ provider = {}, services = [], reviews = [], onSuccess }) {
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

  const [revName, setRevName] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState('');
  const [sendingRev, setSendingRev] = useState(false);

  const [question, setQuestion] = useState('');
  const [askingReceptionist, setAskingReceptionist] = useState(false);
  const [receptionistReply, setReceptionistReply] = useState('');

  const [clientNeed, setClientNeed] = useState('');
  const [matchingService, setMatchingService] = useState(false);
  const [serviceMatchReply, setServiceMatchReply] = useState('');

  const [summarizingReviews, setSummarizingReviews] = useState(false);
  const [reviewsSummary, setReviewsSummary] = useState('');

  const selectedSrv = services.find((s) => String(s.id) === String(serviceId));
  const currentStep = (date && time) ? 3 : serviceId ? 2 : 1;

  const pageFont = {
    fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif",
    direction: 'rtl',
  };

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
        if (taken.includes(time)) {
          setTime('');
        }
      }
    };

    fetchBookedSlots();
  }, [date, provider.id]);

  const rawPhone = String(provider.phone || '').replace(/\D/g, '');
  let providerWaPhone = rawPhone;
  if (providerWaPhone.startsWith('0')) {
    providerWaPhone = '212' + providerWaPhone.slice(1);
  } else if (providerWaPhone && !providerWaPhone.startsWith('212')) {
    providerWaPhone = '212' + providerWaPhone;
  }

  const buildWhatsAppUrl = (text) => 'https://wa.me' + providerWaPhone + '?text=' + encodeURIComponent(text);

  const inquiryWaText =
    'مرحبا ' + (provider.business_name || '') + '، أود الاستفسار بخصوص حجز موعد' +
    (selectedSrv ? ' لخدمة: ' + selectedSrv.title : '') +
    (date ? ' يوم ' + date : '') +
    (time ? ' الساعة ' + time : '');

  const copyAccount = (acc) => {
    navigator.clipboard.writeText(acc);
    alert('تم نسخ رقم الحساب: ' + acc);
  };

  const mapsUrl = provider.google_maps_url
    ? provider.google_maps_url
    : (provider.latitude && provider.longitude
      ? 'https://google.com' + provider.latitude + ',' + provider.longitude
      : null);

  const servicesSummaryText = services.length > 0
    ? services.map((s) => '- ' + s.title + ': الثمن ' + (s.total_price || s.price || 0) + ' درهم، العربون ' + s.deposit_amount + ' درهم').join('\n')
    : 'لا توجد خدمات مسجلة حالياً';
  const handleAskReceptionistAI = async (e) => {
    e.preventDefault();
    if (!question.trim()) return alert('اكتب سؤالك أولاً');
    setAskingReceptionist(true);
    try {
      const contextInfo =
        'اسم المحل: ' + (provider.business_name || '') + '\n' +
        'معلومات المحل: ' + (provider.bio || 'غير متوفر') + '\n' +
        'ساعات العمل المتاحة: ' + defaultHours.join(', ') + '\n' +
        'طرق الدفع: ' + (paymentList.map((p) => p.bank).join('، ') || 'تحويل بنكي') + '\n' +
        'الخدمات والأسعار:\n' + servicesSummaryText;

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'ask_receptionist',
          businessName: provider.business_name,
          providerContext: contextInfo,
          question: question.trim()
        }
      });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      if (data && data.result) {
        setReceptionistReply(data.result);
      }
    } catch (err) {
      alert('تعذر الرد حالياً: ' + err.message);
    } finally {
      setAskingReceptionist(false);
    }
  };

  const handleMatchServiceAI = async (e) => {
    e.preventDefault();
    if (!clientNeed.trim()) return alert('اكتب ما تحتاجه ليقترح لك الذكاء الاصطناعي الخدمة الأنسب');
    setMatchingService(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'match_service',
          businessName: provider.business_name,
          clientNeed: clientNeed.trim(),
          servicesList: servicesSummaryText
        }
      });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      if (data && data.result) {
        setServiceMatchReply(data.result);
      }
    } catch (err) {
      alert('تعذر ترشيح الخدمة: ' + err.message);
    } finally {
      setMatchingService(false);
    }
  };

  const handleSummarizeReviewsAI = async () => {
    if (reviews.length === 0) return;
    setSummarizingReviews(true);
    try {
      const revText = reviews
        .map((r) => '(' + (r.rating || 5) + '/5) ' + (r.comment || 'تقييم بدون تعليق'))
        .join(' | ');

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'summarize_reviews',
          businessName: provider.business_name,
          reviewsList: revText
        }
      });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      if (data && data.result) {
        setReviewsSummary(data.result);
      }
    } catch (err) {
      alert('تعذر تلخيص التقييمات: ' + err.message);
    } finally {
      setSummarizingReviews(false);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / reviews.length).toFixed(1)
    : null;

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!revName.trim()) return alert('يرجى كتابة اسمك');
    setSendingRev(true);

    const { error } = await supabase.from('reviews').insert([{
      provider_id: provider.id,
      client_name: revName.trim(),
      rating: Number(revRating),
      comment: revComment.trim()
    }]);

    setSendingRev(false);
    if (error) return alert('تعذر إرسال التقييم: ' + error.message);

    alert('شكراً لك! تم إضافة تقييمك بنجاح ⭐');
    setRevName('');
    setRevComment('');
    setRevRating(5);
    if (onSuccess) onSuccess();
  };

  const weeklyOff = Array.isArray(provider.weekly_off) ? provider.weekly_off : [];
  const closedDates = Array.isArray(provider.closed_dates) ? provider.closed_dates : [];

  const isSelectedDateClosed = (() => {
    if (!date) return false;
    if (closedDates.includes(date)) return true;
    const dObj = new Date(date + 'T12:00:00');
    if (!isNaN(dObj.getTime()) && weeklyOff.includes(dObj.getDay())) return true;
    return false;
  })();

  const computeFileHash = async (targetFile) => {
    try {
      const buffer = await targetFile.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      return '';
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) return alert('اختر تاريخ الموعد');
    if (isSelectedDateClosed) return alert('المحل مغلق في هذا اليوم (عطلة). اختر تاريخاً آخر.');
    if (!time) return alert('اختر ساعة الموعد المتاحة');
    if (!file) return alert('اختر صورة الوصل');

    setLoading(true);
    setMsg('جاري التحقق من الموعد وصلاحية الوصل...');

    try {
      // 1. التحقق من عدم تكرار نفس صورة الوصل (بصمة الملف SHA-256)
      const fileHash = await computeFileHash(file);
      if (fileHash) {
        const { data: dupHash } = await supabase
          .from('bookings')
          .select('id')
          .eq('receipt_hash', fileHash)
          .neq('status', 'rejected')
          .limit(1);

        if (dupHash && dupHash.length > 0) {
          setLoading(false);
          setMsg('');
          return alert('⚠️ عذراً، صورة هذا الوصل استُخدمت مسبقاً في حجز آخر! يرجى إرفاق وصل تحويل جديد.');
        }
      }

      // 2. التحقق من توفر الساعة
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

      // 3. رفع صورة الوصل
      const ext = file.name.split('.').pop();
      const fileName = Date.now() + '.' + ext;
      const { error: upErr } = await supabase.storage.from('receipts').upload(fileName, file);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
      const receiptPublicUrl = urlData.publicUrl;

      // 4. الفحص التلقائي بالذكاء الاصطناعي + كشف تكرار رقم مرجع العملية
      const plan = String(provider.plan_type || 'trial').toLowerCase();
      const isExpired = provider.plan_expires_at ? new Date() > new Date(provider.plan_expires_at) : false;
      const canAutoVerify = !isExpired && (plan === 'premium' || plan === 'trial');

      let bookingStatus = 'pending';
      let aiReportText = '';
      let extractedRef = '';

      if (canAutoVerify) {
        setMsg('🤖 الذكاء الاصطناعي يفحص وصل الدفع ورقم المرجع...');
        try {
          const { data: aiRes, error: aiErr } = await supabase.functions.invoke('ai-assistant', {
            body: {
              action: 'verify_receipt',
              receiptUrl: receiptPublicUrl,
              expectedAmount: selectedSrv ? selectedSrv.deposit_amount : 0
            }
          });
          if (!aiErr && aiRes) {
            aiReportText = aiRes.result || '';
            extractedRef = String(aiRes.transaction_ref || '').trim();

            let isDuplicateRef = false;
            if (extractedRef && extractedRef.length >= 4) {
              const { data: dupRef } = await supabase
                .from('bookings')
                .select('id')
                .eq('transaction_ref', extractedRef)
                .neq('status', 'rejected')
                .limit(1);

              if (dupRef && dupRef.length > 0) {
                isDuplicateRef = true;
                aiReportText = `⚠️ تنبيه تكرار: رقم مرجع هذه العملية (${extractedRef}) استُخدم مسبقاً في حجز آخر! (${aiReportText})`;
              }
            }

            if (aiRes.auto_approve === true && !isDuplicateRef) {
              bookingStatus = 'confirmed';
            }
          }
        } catch (aiCheckErr) {
          console.warn('Auto AI verify fallback to pending:', aiCheckErr);
        }
      }

      const { data: insertedBooking, error: insErr } = await supabase
        .from('bookings')
        .insert([{
          provider_id: provider.id,
          service_id: serviceId,
          client_name: name,
          client_phone: phone,
          booking_date: date,
          booking_time: time,
          receipt_url: receiptPublicUrl,
          status: bookingStatus,
          ai_note: aiReportText || null,
          receipt_hash: fileHash || null,
          transaction_ref: extractedRef || null
        }])
        .select('id')
        .single();
      if (insErr) throw insErr;

      const shortCode = insertedBooking && insertedBooking.id
        ? String(insertedBooking.id).slice(0, 8).toUpperCase()
        : String(Date.now()).slice(-6);

      setBookedInfo({
        ticketCode: '3RB-' + shortCode,
        clientName: name,
        clientPhone: phone,
        serviceTitle: selectedSrv ? selectedSrv.title : '',
        depositAmount: selectedSrv ? selectedSrv.deposit_amount : '',
        date,
        time,
        autoConfirmed: bookingStatus === 'confirmed',
        aiReport: typeof aiReportText === 'string' ? aiReportText : '',
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

  const downloadTicketImage = (info) => {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');

    // خلفية البطاقة
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 720, 960);

    // بطاقة بيضاء داخلية
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(36, 36, 648, 888, 28);
    ctx.fill();

    // رأس البطاقة الأزرق
    ctx.fillStyle = '#1e40af';
    ctx.beginPath();
    ctx.roundRect(36, 36, 648, 190, [28, 28, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('منصة عربون • 3ARBOON', 360, 88);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(provider.business_name || 'بطاقة موعد رقمية', 360, 140);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('رقم التذكرة: ' + info.ticketCode, 360, 192);

    // شارة الحالة
    ctx.fillStyle = info.autoConfirmed ? '#dcfce7' : '#fef3c7';
    ctx.beginPath();
    ctx.roundRect(140, 250, 440, 52, 14);
    ctx.fill();

    ctx.fillStyle = info.autoConfirmed ? '#15803d' : '#b45309';
    ctx.font = 'bold 23px sans-serif';
    ctx.fillText(
      info.autoConfirmed ? '✓ موعد مؤكد ومدفوع العربون' : '⏳ في انتظار مراجعة المحل',
      360,
      284
    );

    // تفاصيل الحجز
    ctx.textAlign = 'right';
    const rows = [
      ['الزبون:', info.clientName],
      ['الخدمة:', info.serviceTitle],
      ['التاريخ:', info.date],
      ['الساعة:', info.time],
      ['العربون:', info.depositAmount + ' درهم مغربي']
    ];

    let yPos = 365;
    rows.forEach(([label, val]) => {
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(label, 630, yPos);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(String(val || ''), 480, yPos);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(80, yPos + 24);
      ctx.lineTo(640, yPos + 24);
      ctx.stroke();

      yPos += 76;
    });

    // تذييل البطاقة
    ctx.textAlign = 'center';
    ctx.fillStyle = '#475569';
    ctx.font = '20px sans-serif';
    ctx.fillText('أبرز هذه البطاقة عند وصولك للمحل', 360, 810);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px monospace';
    ctx.fillText(info.ticketCode + ' • 3arboon.ma', 360, 855);

    const link = document.createElement('a');
    link.download = `3arboon-ticket-${info.ticketCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  if (bookedInfo) {
    const safeTicket = String(bookedInfo.ticketCode || '3RB-0000');
    const safeClient = String(bookedInfo.clientName || '');
    const safeService = String(bookedInfo.serviceTitle || '');
    const safeDate = String(bookedInfo.date || '');
    const safeTime = String(bookedInfo.time || '');
    const safeDeposit = String(bookedInfo.depositAmount || '0');
    const safeReport = typeof bookedInfo.aiReport === 'string' ? bookedInfo.aiReport : '';

    const confirmWaText =
      'مرحبا ' + String(provider.business_name || '') + '، هذه بطاقة موعدي عبر منصة عربون:\n' +
      'رقم التذكرة: ' + safeTicket + '\n' +
      'الاسم: ' + safeClient + '\n' +
      'الخدمة: ' + safeService + '\n' +
      'التاريخ: ' + safeDate + ' الساعة ' + safeTime + '\n' +
      'العربون: ' + safeDeposit + ' درهم';

    const qrPayload = encodeURIComponent(
      '3ARBOON | ' + safeTicket + ' | ' + safeClient + ' | ' + safeDate + ' ' + safeTime
    );
    const qrImageUrl = `https://quickchart.io{qrPayload}`;


    return (
      <div style={{ ...pageFont, maxWidth: 440, margin: '20px auto', padding: '0 10px' }}>
        <div style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', boxShadow: '0 15px 35px rgba(15, 23, 42, 0.14)', border: '1px solid #cbd5e1' }}>
          {/* رأس التذكرة */}
          <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)', color: '#fff', padding: '20px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700, letterSpacing: 1 }}>
              منصة عربون • 3ARBOON
            </div>
            <h2 style={{ margin: '6px 0', fontSize: 20, fontWeight: 800 }}>
              {provider.business_name || 'بطاقة موعد رقمية'}
            </h2>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.12)', padding: '4px 12px', borderRadius: 999, fontSize: 13, color: '#fde047', fontFamily: 'monospace' }}>
              {safeTicket}
            </div>
          </div>

          {/* محتوى التذكرة */}
          <div style={{ padding: 20, textAlign: 'center' }}>
            <div style={{
              background: bookedInfo.autoConfirmed ? '#dcfce7' : '#fef3c7',
              color: bookedInfo.autoConfirmed ? '#15803d' : '#b45309',
              padding: '8px 14px',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 14,
              marginBottom: 16
            }}>
              {bookedInfo.autoConfirmed ? '✓ موعد مؤكد ومدفوع العربون' : '⏳ في انتظار مراجعة المحل'}
            </div>

            {safeReport && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#334155', marginBottom: 14, textAlign: 'right' }}>
                {safeReport}
              </div>
            )}

            <div style={{ textAlign: 'right', fontSize: 14, lineHeight: 2, borderTop: '1px dashed #cbd5e1', borderBottom: '1px dashed #cbd5e1', padding: '12px 0', marginBottom: 16 }}>
              <div><strong>الزبون:</strong> {safeClient}</div>
              <div><strong>الخدمة:</strong> {safeService}</div>
              <div><strong>التاريخ:</strong> {safeDate}</div>
              <div><strong>الساعة:</strong> {safeTime}</div>
              <div><strong>العربون:</strong> {safeDeposit} درهم</div>
            </div>

            <img
              src={qrImageUrl}
              alt="QR Code"
              style={{ width: 140, height: 140, margin: '0 auto 16px', display: 'block', borderRadius: 12, border: '1px solid #e2e8f0', padding: 6 }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={() => downloadTicketImage(bookedInfo)}
                style={{ background: '#1e40af', color: '#fff', border: 'none', borderRadius: 12, padding: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                📥 تحميل التذكرة كصورة
              </button>

              {providerWaPhone && (
                <a
                  href={buildWhatsAppUrl(confirmWaText)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ background: '#16a34a', color: '#fff', textDecoration: 'none', borderRadius: 12, padding: '12px', fontWeight: 700, display: 'block' }}
                >
                  💬 إرسال البطاقة عبر واتساب
                </a>
              )}

              <button
                type="button"
                onClick={() => setBookedInfo(null)}
                style={{ background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 12, padding: '10px', fontWeight: 600, cursor: 'pointer' }}
              >
                حجز موعد جديد
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ ...pageFont, maxWidth: 680, margin: '20px auto', padding: '0 14px 40px' }}>
      {/* بطاقة معلومات المحل */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', color: '#fff', borderRadius: 22, padding: 22, marginBottom: 18, boxShadow: '0 10px 25px rgba(15,23,42,0.12)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{provider.business_name || 'حجز موعد'}</h1>
            {provider.bio && <p style={{ margin: '6px 0 0', fontSize: 13, color: '#cbd5e1' }}>{provider.bio}</p>}
          </div>
          {avgRating && (
            <div style={{ background: 'rgba(255,255,255,0.12)', padding: '6px 12px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
              ⭐ {avgRating} ({reviews.length} تقييم)
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          {providerWaPhone && (
            <a
              href={buildWhatsAppUrl(inquiryWaText)}
              target="_blank"
              rel="noreferrer"
              style={{ background: '#16a34a', color: '#fff', textDecoration: 'none', padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700 }}
            >
              💬 استفسار واتساب
            </a>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', textDecoration: 'none', padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700 }}
            >
              📍 الموقع على الخريطة
            </a>
          )}
        </div>
      </div>

      {/* شريط الخطوات */}
      <div style={{ display: 'flex', justifyContent: 'space-between', background: '#fff', padding: '12px 16px', borderRadius: 14, marginBottom: 16, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 700 }}>
        <span style={{ color: currentStep >= 1 ? '#1e40af' : '#94a3b8' }}>1. الخدمة</span>
        <span style={{ color: currentStep >= 2 ? '#1e40af' : '#94a3b8' }}>2. التاريخ والوقت</span>
        <span style={{ color: currentStep >= 3 ? '#1e40af' : '#94a3b8' }}>3. البيانات والعربون</span>
      </div>

      {/* نموذج الحجز */}
      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 17, color: '#0f172a' }}>📅 تفاصيل الموعد</h3>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>اختر الخدمة:</label>
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          required
          style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid #cbd5e1', marginBottom: 14, fontFamily: 'inherit' }}
        >
          <option value="">-- اختر الخدمة --</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} — الثمن: {s.total_price || s.price || 0} درهم (العربون: {s.deposit_amount} درهم)
            </option>
          ))}
        </select>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>تاريخ الموعد:</label>
        <input
          type="date"
          value={date}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => setDate(e.target.value)}
          required
          style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid #cbd5e1', marginBottom: 14, boxSizing: 'border-box' }}
        />

        {isSelectedDateClosed && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
            ⚠️ المحل مغلق في هذا التاريخ (يوم عطلة). يرجى اختيار يوم آخر.
          </div>
        )}

        {date && !isSelectedDateClosed && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              اختر الساعة المتاحة: {checkingSlots && <span style={{ color: '#64748b', fontWeight: 400 }}>(جاري الفحص...)</span>}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(82px, 1fr))', gap: 8 }}>
              {defaultHours.map((slot) => {
                const isBooked = bookedTimes.includes(slot);
                const isSelected = time === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isBooked}
                    onClick={() => setTime(slot)}
                    style={{
                      padding: '9px 6px',
                      borderRadius: 10,
                      border: isSelected ? '2px solid #1e40af' : '1px solid #cbd5e1',
                      background: isBooked ? '#f1f5f9' : isSelected ? '#dbeafe' : '#fff',
                      color: isBooked ? '#94a3b8' : isSelected ? '#1e40af' : '#0f172a',
                      textDecoration: isBooked ? 'line-through' : 'none',
                      fontWeight: 700,
                      cursor: isBooked ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* معلومات الدفع */}
        {paymentList.length > 0 && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              💳 حسابات تحويل العربون {selectedSrv ? `(${selectedSrv.deposit_amount} درهم)` : ''}:
            </div>
            {paymentList.map((pm, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 6, fontSize: 13 }}>
                <div>
                  <strong>{pm.bank}:</strong> <span style={{ fontFamily: 'monospace' }}>{pm.account}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyAccount(pm.account)}
                  style={{ background: '#e0e7ff', color: '#1e40af', border: 'none', borderRadius: 8, padding: '4px 10px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
                >
                  نسخ
                </button>
              </div>
            ))}
          </div>
        )}

        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>الاسم الكامل:</label>
        <input
          type="text"
          placeholder="أدخل اسمك"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid #cbd5e1', marginBottom: 12, boxSizing: 'border-box', fontFamily: 'inherit' }}
        />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>رقم الهاتف (واتساب):</label>
        <input
          type="tel"
          placeholder="06XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid #cbd5e1', marginBottom: 12, boxSizing: 'border-box' }}
        />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>صورة وصل تحويل العربون:</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
          required
          style={{ width: '100%', padding: 9, borderRadius: 10, border: '1px dashed #94a3b8', marginBottom: 16, boxSizing: 'border-box' }}
        />

        {msg && (
          <div style={{ background: '#eff6ff', color: '#1e40af', padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
            {msg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || isSelectedDateClosed}
          style={{ width: '100%', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit' }}
        >
          {loading ? 'جاري تأكيد الحجز...' : '✅ تأكيد الحجز وإصدار التذكرة'}
        </button>
      </form>
      {/* مساعد الذكاء الاصطناعي */}
      <div style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #e2e8f0', marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#0f172a' }}>🤖 المساعد الذكي للمحل</h3>

        <form onSubmit={handleMatchServiceAI} style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>غير متأكد من الخدمة المناسبة؟ صف ما تحتاجه:</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="مثال: أريد قص شعر وعناية بالبشرة..."
              value={clientNeed}
              onChange={(e) => setClientNeed(e.target.value)}
              style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
            />
            <button type="submit" disabled={matchingService} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: '0 14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {matchingService ? '...' : 'رشّح لي'}
            </button>
          </div>
          {serviceMatchReply && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: 10, borderRadius: 10, fontSize: 13, marginTop: 8 }}>
              {serviceMatchReply}
            </div>
          )}
        </form>

        <form onSubmit={handleAskReceptionistAI}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>اسأل موظف الاستقبال الذكي:</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="اسأل عن الأسعار، الأوقات، طرق الدفع..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
            />
            <button type="submit" disabled={askingReceptionist} style={{ background: '#1e40af', color: '#fff', border: 'none', borderRadius: 10, padding: '0 14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {askingReceptionist ? '...' : 'اسأل'}
            </button>
          </div>
          {receptionistReply && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', padding: 10, borderRadius: 10, fontSize: 13, marginTop: 8 }}>
              {receptionistReply}
            </div>
          )}
        </form>
      </div>

      {/* قسم التقييمات */}
      <div style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>⭐ آراء الزبناء ({reviews.length})</h3>
          {reviews.length > 0 && (
            <button
              type="button"
              onClick={handleSummarizeReviewsAI}
              disabled={summarizingReviews}
              style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {summarizingReviews ? 'جاري التلخيص...' : '✨ تلخيص الآراء بالذكاء الاصطناعي'}
            </button>
          )}
        </div>

        {reviewsSummary && (
          <div style={{ background: '#fefce8', border: '1px solid #fef08a', color: '#854d0e', padding: 10, borderRadius: 10, fontSize: 13, marginBottom: 14 }}>
            {reviewsSummary}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {reviews.length === 0 ? (
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>لا توجد تقييمات بعد. كن أول من يقيّم هذا المحل!</p>
          ) : (
            reviews.map((rev, i) => (
              <div key={rev.id || i} style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  <span>{rev.client_name}</span>
                  <span>{'⭐'.repeat(Number(rev.rating || 5))}</span>
                </div>
                {rev.comment && <p style={{ margin: 0, fontSize: 13, color: '#334155' }}>{rev.comment}</p>}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAddReview} style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>أضف تقييمك:</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              placeholder="اسمك"
              value={revName}
              onChange={(e) => setRevName(e.target.value)}
              required
              style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
            />
            <select
              value={revRating}
              onChange={(e) => setRevRating(Number(e.target.value))}
              style={{ padding: 10, borderRadius: 10, border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
            >
              <option value={5}>5 ⭐</option>
              <option value={4}>4 ⭐</option>
              <option value={3}>3 ⭐</option>
              <option value={2}>2 ⭐</option>
              <option value={1}>1 ⭐</option>
            </select>
          </div>
          <textarea
            rows={2}
            placeholder="اكتب تعليقك (اختياري)..."
            value={revComment}
            onChange={(e) => setRevComment(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #cbd5e1', marginBottom: 10, boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
          <button
            type="submit"
            disabled={sendingRev}
            style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {sendingRev ? 'جاري الإرسال...' : 'إرسال التقييم'}
          </button>
        </form>
      </div>
    </div>
  );
}

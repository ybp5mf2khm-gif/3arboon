import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { generateQrDataUrl } from './qrGenerator';

export default function BookingPage({ provider = {}, services = [], reviews = [], onSuccess }) {
  const defaultHours = (Array.isArray(provider.working_hours) && provider.working_hours.length > 0)
    ? provider.working_hours
    : ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];

  const paymentList = (Array.isArray(provider.payment_methods) && provider.payment_methods.length > 0)
    ? provider.payment_methods
    : (provider.rib ? [{ bank: provider.bank_name || 'CIH Bank', account: provider.rib }] : []);

  const [serviceId, setServiceId] = useState(services && services.length > 0 ? services.at(0).id : '');
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
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [copiedAcc, setCopiedAcc] = useState('');

  const [showAssistant, setShowAssistant] = useState(false);
  const [question, setQuestion] = useState('');
  const [askingReceptionist, setAskingReceptionist] = useState(false);
  const [receptionistReply, setReceptionistReply] = useState('');

  const [clientNeed, setClientNeed] = useState('');
  const [matchingService, setMatchingService] = useState(false);
  const [serviceMatchReply, setServiceMatchReply] = useState('');

  const [revName, setRevName] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState('');
  const [sendingRev, setSendingRev] = useState(false);
  const [summarizingReviews, setSummarizingReviews] = useState(false);
  const [reviewsSummary, setReviewsSummary] = useState('');

  const selectedSrv = services.find((s) => String(s.id) === String(serviceId));
  const currentStep = (date && time) ? 3 : serviceId ? 2 : 1;

  const pageFont = {
    fontFamily: "'Cairo', -apple-system, BlinkMacSystemFont, sans-serif",
    direction: 'rtl',
    color: '#0f172a'
  };

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

  useEffect(() => {
    if (!bookedInfo) {
      setQrImageUrl('');
      return;
    }
    const payload = `3ARBOON | ${bookedInfo.ticketCode} | ${bookedInfo.clientName} | ${bookedInfo.date} ${bookedInfo.time}`;
    generateQrDataUrl(payload).then((url) => setQrImageUrl(url)).catch(() => {});
  }, [bookedInfo]);
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
    setCopiedAcc(acc);
    setTimeout(() => setCopiedAcc(''), 2500);
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
    if (!question.trim()) return alert('يرجى كتابة سؤالك أولاً.');
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
    if (!clientNeed.trim()) return alert('يرجى وصف الخدمة التي تبحث عنها.');
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
    if (!revName.trim()) return alert('يرجى إدخال الاسم.');
    setSendingRev(true);

    const { error } = await supabase.from('reviews').insert([{
      provider_id: provider.id,
      client_name: revName.trim(),
      rating: Number(revRating),
      comment: revComment.trim()
    }]);

    setSendingRev(false);
    if (error) return alert('تعذر إرسال التقييم: ' + error.message);

    alert('شكراً لك، تم تسجيل تقييمك بنجاح.');
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
    if (!date) return alert('يرجى اختيار تاريخ الموعد.');
    if (isSelectedDateClosed) return alert('المحل مغلق في هذا التاريخ. يرجى اختيار يوم آخر.');
    if (!time) return alert('يرجى اختيار ساعة الموعد المتاحة.');
    if (!file) return alert('يرجى إرفاق صورة وصل تحويل العربون.');

    setLoading(true);
    setMsg('جاري التحقق من الموعد وصلاحية الوصل...');

    try {
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
          return alert('تنبيه: صورة هذا الوصل استُخدمت مسبقاً في حجز آخر. يرجى إرفاق وصل تحويل جديد.');
        }
      }

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
        return alert('عذراً، هذا التوقيت تم حجزه للتو. يرجى اختيار ساعة أخرى متاحة.');
      }

      const ext = file.name.split('.').pop();
      const fileName = Date.now() + '.' + ext;
      const { error: upErr } = await supabase.storage.from('receipts').upload(fileName, file);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
      const receiptPublicUrl = urlData.publicUrl;

      const plan = String(provider.plan_type || 'trial').toLowerCase();
      const isExpired = provider.plan_expires_at ? new Date() > new Date(provider.plan_expires_at) : false;
      const canAutoVerify = !isExpired && (plan === 'premium' || plan === 'trial');

      let bookingStatus = 'pending';
      let aiReportText = '';
      let extractedRef = '';

      if (canAutoVerify) {
        setMsg('جاري التدقيق الآلي لوصل الدفع ورقم المرجع...');
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
                aiReportText = `تنبيه تكرار: رقم مرجع هذه العملية (${extractedRef}) استُخدم مسبقاً في حجز آخر.`;
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

  const downloadTicketImage = async (info) => {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1040;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#312e81';
    ctx.fillRect(0, 0, 720, 1040);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(32, 32, 656, 976, 28);
    ctx.fill();

    const grad = ctx.createLinearGradient(32, 32, 688, 217);
    grad.addColorStop(0, '#312e81');
    grad.addColorStop(1, '#4f46e5');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(32, 32, 656, 185, [28, 28, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#c7d2fe';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('منصة عربون • 3ARBOON', 360, 84);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(provider.business_name || 'بطاقة حجز رقمية', 360, 136);

    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('رقم التذكرة: ' + info.ticketCode, 360, 186);

    ctx.fillStyle = info.autoConfirmed ? '#dcfce7' : '#fef3c7';
    ctx.beginPath();
    ctx.roundRect(140, 245, 440, 50, 14);
    ctx.fill();

    ctx.fillStyle = info.autoConfirmed ? '#065f46' : '#92400e';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(
      info.autoConfirmed ? 'موعد مؤكد ومدفوع العربون' : 'في انتظار مراجعة المحل',
      360,
      278
    );

    ctx.textAlign = 'right';
    const rows = [
      ['الزبون:', info.clientName],
      ['الخدمة:', info.serviceTitle],
      ['التاريخ:', info.date],
      ['الساعة:', info.time],
      ['العربون:', info.depositAmount + ' درهم مغربي']
    ];

    let yPos = 360;
    rows.forEach(([label, val]) => {
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 23px sans-serif';
      ctx.fillText(label, 630, yPos);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 25px sans-serif';
      ctx.fillText(String(val || ''), 480, yPos);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(80, yPos + 24);
      ctx.lineTo(640, yPos + 24);
      ctx.stroke();

      yPos += 72;
    });

    try {
      const qrSrc = qrImageUrl || await generateQrDataUrl(
        `3ARBOON | ${info.ticketCode} | ${info.clientName} | ${info.date} ${info.time}`
      );
      if (qrSrc) {
        await new Promise((resolve) => {
          const qrImg = new Image();
          qrImg.onload = () => {
            ctx.strokeStyle = '#c7d2fe';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(265, 725, 190, 190, 16);
            ctx.stroke();
            ctx.drawImage(qrImg, 275, 735, 170, 170);
            resolve();
          };
          qrImg.onerror = resolve;
          qrImg.src = qrSrc;
        });
      }
    } catch {}

    ctx.textAlign = 'center';
    ctx.fillStyle = '#475569';
    ctx.font = '19px sans-serif';
    ctx.fillText('يرجى إبراز هذه البطاقة أو مسح الرمز عند الوصول', 360, 950);
    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 17px monospace';
    ctx.fillText(info.ticketCode + ' • 3arboon.ma', 360, 982);

    const link = document.createElement('a');
    link.download = `3arboon-ticket-${info.ticketCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  if (bookedInfo) {
    const safeTicket = String(bookedInfo.ticketCode || '3RB-0000');
    const safeClient = String(bookedInfo.clientName || '');
    const safeService = String(bookedInfo.serviceTitle || '');
    const safeDeposit = String(bookedInfo.depositAmount || '');
    const safeDate = String(bookedInfo.date || '');
    const safeTime = String(bookedInfo.time || '');

    return (
      <div className="card-modern" style={{ ...pageFont, maxWidth: 470, margin: '12px auto', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 100%)', color: '#ffffff', padding: '26px 20px', textAlign: 'center' }}>
          <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.16)', padding: '4px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
            تذكرة موعد رقمية
          </span>
          <h3 style={{ margin: '10px 0 6px', fontSize: 21, fontWeight: 800 }}>
            {bookedInfo.autoConfirmed ? 'تم تأكيد حجزك بنجاح' : 'تم إرسال طلب الحجز'}
          </h3>
          <div style={{ display: 'inline-block', background: 'rgba(16, 185, 129, 0.18)', border: '1px solid rgba(110, 231, 183, 0.45)', color: '#6ee7b7', padding: '5px 14px', borderRadius: 10, fontSize: 13.5, fontWeight: 800, fontFamily: 'monospace', marginTop: 4 }}>
            {safeTicket}
          </div>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{
            padding: '11px 14px',
            borderRadius: 12,
            fontSize: 12.5,
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: 16,
            background: bookedInfo.autoConfirmed ? '#ecfdf5' : '#fffbeb',
            border: bookedInfo.autoConfirmed ? '1px solid #a7f3d0' : '1px solid #fde68a',
            color: bookedInfo.autoConfirmed ? '#065f46' : '#92400e'
          }}>
            {bookedInfo.autoConfirmed
              ? 'تم التحقق من وصل العربون وتأكيد الموعد تلقائياً.'
              : 'طلبك قيد المراجعة وسيتم إشعارك فور تأكيد الوصل.'}
          </div>

          <div style={{ background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 16, padding: 14, marginBottom: 16, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #e0e7ff' }}>
              <span style={{ color: '#64748b' }}>الزبون:</span>
              <strong style={{ color: '#0f172a' }}>{safeClient}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #e0e7ff' }}>
              <span style={{ color: '#64748b' }}>الخدمة:</span>
              <strong style={{ color: '#0f172a' }}>{safeService}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #e0e7ff' }}>
              <span style={{ color: '#64748b' }}>التاريخ والوقت:</span>
              <strong style={{ color: '#0f172a' }}>{safeDate} | {safeTime}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0' }}>
              <span style={{ color: '#64748b' }}>مبلغ العربون:</span>
              <strong style={{ color: '#059669' }}>{safeDeposit} درهم</strong>
            </div>
          </div>

          {qrImageUrl && (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <img
                src={qrImageUrl}
                alt="QR Code"
                style={{ width: 150, height: 150, margin: '0 auto 8px', display: 'block', borderRadius: 16, border: '2px solid #e0e7ff', padding: 8, background: '#ffffff', boxShadow: '0 6px 16px rgba(79,70,229,0.08)' }}
              />
              <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>يُرجى إبراز هذا الرمز عند الوصول للمحل</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <button
              type="button"
              onClick={() => downloadTicketImage(bookedInfo)}
              className="btn-modern-primary"
              style={{ width: '100%' }}
            >
              تحميل التذكرة كصورة (PNG)
            </button>

            {providerWaPhone && (
              <a
                href={buildWhatsAppUrl(`مرحبا ${provider.business_name || ''}، قمت بحجز موعد (${safeTicket}) ليوم ${safeDate} الساعة ${safeTime}.`)}
                target="_blank"
                rel="noreferrer"
                className="btn-modern-secondary"
                style={{ textAlign: 'center', textDecoration: 'none' }}
              >
                إرسال التذكرة عبر واتساب
              </a>
            )}

            <button
              type="button"
              onClick={() => setBookedInfo(null)}
              style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: 8, fontFamily: 'inherit' }}
            >
              حجز موعد جديد
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="card-modern" style={{ ...pageFont, maxWidth: 470, margin: '12px auto', overflow: 'hidden' }}>
      {/* ترويسة هوية المحل بتدرج النيلي الملكي */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 60%, #6366f1 100%)', color: '#ffffff', padding: '26px 20px 22px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {provider.logo_url ? (
          <img
            src={provider.logo_url}
            alt={provider.business_name}
            style={{ width: 74, height: 74, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.85)', boxShadow: '0 8px 20px rgba(15,23,42,0.2)', marginBottom: 10 }}
          />
        ) : (
          <div style={{ width: 66, height: 66, borderRadius: 20, background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, margin: '0 auto 10px' }}>
            {String(provider.business_name || 'ع').charAt(0)}
          </div>
        )}

        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900 }}>
          {provider.business_name || 'صفحة الحجز'}
        </h2>

        {provider.bio && (
          <p style={{ margin: '6px auto 12px', fontSize: 12.5, color: '#e0e7ff', maxWidth: 360, lineHeight: 1.6 }}>
            {provider.bio}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {avgRating && (
            <span style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.28)', padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: '#ffffff' }}>
              التقييم: {avgRating} / 5 ({reviews.length})
            </span>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-modern-secondary"
              style={{ textDecoration: 'none', padding: '5px 12px', borderRadius: 999, fontSize: 12 }}
            >
              الموقع على الخريطة ↗
            </a>
          )}
          <button
            type="button"
            onClick={() => setShowAssistant(!showAssistant)}
            className="btn-modern-secondary"
            style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, color: '#4f46e5' }}
          >
            {showAssistant ? 'إغلاق المساعد' : 'استفسار أو ترشيح خدمة'}
          </button>
        </div>
      </div>

      <div style={{ padding: 18 }}>
        {/* المساعد الذكي القابل للطي */}
        {showAssistant && (
          <div style={{ background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 16, padding: 14, marginBottom: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <strong style={{ display: 'block', fontSize: 12.5, color: '#312e81', marginBottom: 6 }}>
                اسأل موظف الاستقبال الذكي
              </strong>
              <form onSubmit={handleAskReceptionistAI} style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  placeholder="مثال: ما هي أوقات العمل أو الأسعار؟"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="input-modern"
                  style={{ flex: 1, padding: '10px 12px', background: '#ffffff' }}
                />
                <button type="submit" disabled={askingReceptionist} className="btn-modern-primary" style={{ padding: '0 16px', fontSize: 12 }}>
                  {askingReceptionist ? '...' : 'اسأل'}
                </button>
              </form>
              {receptionistReply && (
                <div style={{ marginTop: 8, background: '#ffffff', border: '1px solid #e0e7ff', borderRadius: 12, padding: 10, fontSize: 12.5, color: '#1e293b', lineHeight: 1.6 }}>
                  {receptionistReply}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #e0e7ff', paddingTop: 12 }}>
              <strong style={{ display: 'block', fontSize: 12.5, color: '#312e81', marginBottom: 6 }}>
                ترشيح الخدمة الأنسب لك
              </strong>
              <form onSubmit={handleMatchServiceAI} style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  placeholder="صف ما تحتاجه وسنرشح لك الخدمة..."
                  value={clientNeed}
                  onChange={(e) => setClientNeed(e.target.value)}
                  className="input-modern"
                  style={{ flex: 1, padding: '10px 12px', background: '#ffffff' }}
                />
                <button type="submit" disabled={matchingService} className="btn-modern-primary" style={{ padding: '0 16px', fontSize: 12 }}>
                  {matchingService ? '...' : 'رشّح'}
                </button>
              </form>
              {serviceMatchReply && (
                <div style={{ marginTop: 8, background: '#ffffff', border: '1px solid #e0e7ff', borderRadius: 12, padding: 10, fontSize: 12.5, color: '#1e293b', lineHeight: 1.6 }}>
                  {serviceMatchReply}
                </div>
              )}
            </div>
          </div>
        )}

        {/* مؤشر الخطوات الثلاث */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, background: '#f8faff', padding: '10px 16px', borderRadius: 14, border: '1px solid #e0e7ff' }}>
          {[
            { num: 1, label: 'الخدمة' },
            { num: 2, label: 'الموعد' },
            { num: 3, label: 'التأكيد' }
          ].map((step) => {
            const active = currentStep >= step.num;
            return (
              <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: active ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : '#e2e8f0',
                  color: active ? '#ffffff' : '#64748b',
                  fontSize: 11.5,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: active ? '0 4px 10px rgba(79,70,229,0.3)' : 'none'
                }}>
                  {step.num}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: active ? 800 : 600, color: active ? '#312e81' : '#64748b' }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
        <form onSubmit={handleSubmit}>
          {/* الخطوة 1: اختيار الخدمة */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              1. اختر الخدمة المطلوبة
            </label>
            {services.length === 0 ? (
              <div style={{ padding: 14, background: '#f8fafc', borderRadius: 12, fontSize: 13, color: '#64748b', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                لا توجد خدمات متاحة حالياً.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {services.map((srv) => {
                  const isSelected = String(srv.id) === String(serviceId);
                  return (
                    <div
                      key={srv.id}
                      onClick={() => setServiceId(srv.id)}
                      className="card-modern-hover"
                      style={{
                        padding: '13px 15px',
                        borderRadius: 14,
                        border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                        background: isSelected ? '#f8faff' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{srv.title}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          الثمن الإجمالي: {srv.total_price || srv.price || 0} درهم
                        </div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <span style={{
                          display: 'inline-block',
                          background: isSelected ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : '#eef2ff',
                          color: isSelected ? '#ffffff' : '#4f46e5',
                          padding: '5px 11px',
                          borderRadius: 9,
                          fontSize: 12,
                          fontWeight: 800
                        }}>
                          العربون: {srv.deposit_amount} درهم
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* الخطوة 2: اختيار التاريخ والوقت */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              2. اختر التاريخ والساعة
            </label>
            <input
              type="date"
              min={new Date().toISOString().split('T').at(0)}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setTime('');
              }}
              className="input-modern"
              style={{ marginBottom: 12 }}
              required
            />

            {date && isSelectedDateClosed && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: 12, borderRadius: 12, fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>
                المحل مغلق في هذا اليوم (عطلة). يرجى اختيار تاريخ آخر.
              </div>
            )}

            {date && !isSelectedDateClosed && (
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 700 }}>
                  {checkingSlots ? 'جاري التحقق من الأوقات المتاحة...' : 'اختر الساعة المناسبة:'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7, direction: 'ltr' }}>
                  {defaultHours.map((hr) => {
                    const isBooked = bookedTimes.includes(hr);
                    const isPicked = time === hr;
                    return (
                      <button
                        key={hr}
                        type="button"
                        disabled={isBooked}
                        onClick={() => setTime(hr)}
                        className={isPicked ? 'btn-modern-primary' : 'btn-modern-secondary'}
                        style={{
                          padding: '9px 4px',
                          borderRadius: 10,
                          fontSize: 13,
                          opacity: isBooked ? 0.45 : 1,
                          textDecoration: isBooked ? 'line-through' : 'none',
                          cursor: isBooked ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {hr}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {/* الخطوة 3: بيانات الزبون وتحويل العربون */}
          <div style={{ background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 16, padding: 16, marginBottom: 18 }}>
            <strong style={{ display: 'block', fontSize: 13.5, color: '#312e81', marginBottom: 12 }}>
              3. البيانات الشخصية وتحويل العربون
            </strong>

            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>الاسم الكامل</label>
            <input
              type="text"
              placeholder="أدخل اسمك الكامل"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-modern"
              style={{ background: '#ffffff', marginBottom: 12 }}
              required
            />

            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>رقم الهاتف (واتساب)</label>
            <input
              type="tel"
              placeholder="06XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-modern"
              style={{ background: '#ffffff', marginBottom: 12 }}
              required
            />

            {paymentList.length > 0 && (
              <div style={{ marginTop: 6, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  حسابات تحويل العربون (<span style={{ color: '#059669' }}>{selectedSrv ? selectedSrv.deposit_amount : 0} درهم</span>):
                </div>
                {paymentList.map((pm, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 12,
                      padding: '10px 12px',
                      marginBottom: 6,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <div style={{ fontSize: 12 }}>
                      <strong style={{ display: 'block', color: '#0f172a' }}>{pm.bank}</strong>
                      <span style={{ color: '#475569', fontFamily: 'monospace', direction: 'ltr', display: 'inline-block' }}>
                        {pm.account}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyAccount(pm.account)}
                      className={copiedAcc === pm.account ? 'btn-modern-accent' : 'btn-modern-secondary'}
                      style={{ padding: '6px 12px', fontSize: 11.5, borderRadius: 9 }}
                    >
                      {copiedAcc === pm.account ? 'تم النسخ' : 'نسخ'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
              إرفاق صورة وصل التحويل
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files ? e.target.files.item(0) : null)}
              className="input-modern"
              style={{ padding: 9, background: '#ffffff', marginBottom: 14 }}
              required
            />

            {msg && (
              <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', color: '#3730a3', padding: 10, borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isSelectedDateClosed}
              className="btn-modern-accent"
              style={{ width: '100%', padding: 14, fontSize: 14.5 }}
            >
              {loading ? 'جاري إرسال الحجز...' : 'تأكيد الحجز وإرسال الوصل'}
            </button>

            {providerWaPhone && (
              <a
                href={buildWhatsAppUrl(inquiryWaText)}
                target="_blank"
                rel="noreferrer"
                className="btn-modern-secondary"
                style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 9, padding: 11 }}
              >
                تواصل مع المحل للاستفسار
              </a>
            )}
          </div>
        </form>

        {/* قسم تقييمات الزبائن */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong style={{ fontSize: 14.5, color: '#0f172a' }}>
              آراء وتقييمات الزبائن ({reviews.length})
            </strong>
            {reviews.length > 1 && (
              <button
                type="button"
                disabled={summarizingReviews}
                onClick={handleSummarizeReviewsAI}
                className="btn-modern-secondary"
                style={{ padding: '5px 11px', fontSize: 11.5 }}
              >
                {summarizingReviews ? 'جاري التلخيص...' : 'ملخص الآراء'}
              </button>
            )}
          </div>

          {reviewsSummary && (
            <div style={{ background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 12, padding: 12, fontSize: 12.5, color: '#1e293b', lineHeight: 1.6, marginBottom: 12 }}>
              {reviewsSummary}
            </div>
          )}

          {reviews.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {reviews.slice(0, 5).map((r) => (
                <div key={r.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong style={{ fontSize: 13, color: '#0f172a' }}>{r.client_name}</strong>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#4f46e5', background: '#eef2ff', border: '1px solid #c7d2fe', padding: '2px 8px', borderRadius: 7 }}>
                      {r.rating} / 5
                    </span>
                  </div>
                  {r.comment && (
                    <p style={{ margin: 0, fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddReview} style={{ background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 14, padding: 14 }}>
            <strong style={{ display: 'block', fontSize: 13, color: '#312e81', marginBottom: 10 }}>
              أضف تقييمك
            </strong>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="اسمك"
                value={revName}
                onChange={(e) => setRevName(e.target.value)}
                className="input-modern"
                style={{ flex: 2, background: '#ffffff' }}
                required
              />
              <select
                value={revRating}
                onChange={(e) => setRevRating(e.target.value)}
                className="input-modern"
                style={{ flex: 1, background: '#ffffff' }}
              >
                <option value="5">5 / 5</option>
                <option value="4">4 / 5</option>
                <option value="3">3 / 5</option>
                <option value="2">2 / 5</option>
                <option value="1">1 / 5</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="اكتب تعليقك باختصار (اختياري)"
              value={revComment}
              onChange={(e) => setRevComment(e.target.value)}
              className="input-modern"
              style={{ marginTop: 8, marginBottom: 10, background: '#ffffff' }}
            />
            <button type="submit" disabled={sendingRev} className="btn-modern-secondary" style={{ width: '100%', padding: 10 }}>
              {sendingRev ? 'جاري الإرسال...' : 'نشر التقييم'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function BookingPage({ provider, services, reviews = [], onSuccess }) {
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
    'مرحبا ' + provider.business_name + '، أود الاستفسار بخصوص حجز موعد' +
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

// 4. الفحص التلقائي بالذكاء الاصطناعي + كشف تكرار رقم مرجع العملية (Premium + Trial)
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
aiReport: typeof aiReportText ==='string' ? aiReportText : '',
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
const confirmWaText =
'مرحبا ' + provider.business_name + '، هذه بطاقة موعدي عبر منصة عربون:\n' +
'رقم التذكرة: ' + bookedInfo.ticketCode + '\n' +
'الاسم: ' + bookedInfo.clientName + '\n' +
'الخدمة: ' + bookedInfo.serviceTitle + '\n' +
'التاريخ: ' + bookedInfo.date + ' الساعة ' + bookedInfo.time + '\n' +
'العربون: ' + bookedInfo.depositAmount + ' درهم';

const qrPayload = encodeURIComponent(
`3ARBOON | ${bookedInfo.ticketCode} | ${bookedInfo.clientName} | ${bookedInfo.date} ${bookedInfo.time}`
);
const qrImageUrl = `https://qrserver.com{qrPayload}`;

return (
<div style={{ ...pageFont, maxWidth: 440, margin: '20px auto', padding: '0 10px' }}>
<div style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', boxShadow: '0 15px 35px rgba(15, 23, 42, 0.14)', border: '1px solid #cbd5e1' }}>
{/* رأس التذكرة */}
<div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)', color: '#fff', padding: '20px 18px', textAlign: 'center' }}>
<div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700, letterSpacing: 1 }}>
بطاقة موعد رقمية • 3ARBOON
</div>
<h2 style={{ margin: '6px 0 4px', fontSize: 20, fontWeight: 800 }}>
{provider.business_name}
</h2>
<div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', padding: '4px 14px', borderRadius: 12, fontSize: 14, fontWeight: 800, color: '#fde047', fontFamily: 'monospace', marginTop: 4 }}>
{bookedInfo.ticketCode}
</div>
</div>

{/* شارة الحالة */}
<div style={{ padding: '16px 20px 10px', textAlign: 'center' }}>
<div style={{
display: 'inline-block',
padding: '6px 16px',
borderRadius: 20,
fontSize: 13,
fontWeight: 800,
background: bookedInfo.autoConfirmed ? '#dcfce7' : '#fef3c7',
color: bookedInfo.autoConfirmed ? '#15803d' : '#b45309',
border: bookedInfo.autoConfirmed ? '1px solid #86efac' : '1px solid #fcd34d'
}}>
{bookedInfo.autoConfirmed ? '✅ تم تأكيد موعدك تلقائياً!' : '⏳ في انتظار مراجعة المحل'}
</div>

{bookedInfo.aiReport && (
<div style={{ marginTop: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 10px', fontSize: 12, color: '#334155', fontWeight: 600 }}>
{String(bookedInfo.aiReport)}
</div>
)}
</div>

{/* خط فاصل مثقوب مثل التذاكر */}
<div style={{ borderTop: '2px dashed #cbd5e1', margin: '8px 18px' }} />

{/* بيانات البطاقة + QR */}
<div style={{ padding: '10px 20px 20px' }}>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
<div style={{ flex: 1, fontSize: 13, lineHeight: 2, color: '#0f172a' }}>
<div><span style={{ color: '#64748b' }}>الزبون:</span> <strong>{bookedInfo.clientName}</strong></div>
<div><span style={{ color: '#64748b' }}>الخدمة:</span> <strong>{bookedInfo.serviceTitle}</strong></div>
<div><span style={{ color: '#64748b' }}>التاريخ:</span> <strong style={{ direction: 'ltr', display: 'inline-block' }}>{bookedInfo.date}</strong></div>
<div><span style={{ color: '#64748b' }}>الساعة:</span> <strong style={{ color: '#1d4ed8' }}>{bookedInfo.time}</strong></div>
<div><span style={{ color: '#64748b' }}>العربون:</span> <strong style={{ color: '#16a34a' }}>{bookedInfo.depositAmount} درهم</strong></div>
</div>

<div style={{ textAlign: 'center', background: '#f8fafc', padding: 8, borderRadius: 12, border: '1px solid #e2e8f0' }}>
<img
src={qrImageUrl}
alt="QR Code"
style={{ width: 104, height: 104, display: 'block', borderRadius: 6 }}
/>
<span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginTop: 4, display: 'block' }}>
امسح عند الوصول
</span>
</div>
</div>

<button
type="button"
onClick={() => downloadTicketImage(bookedInfo)}
style={{ width: '100%', background: '#1e40af', color: '#fff', border: 'none', padding: 13, borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8 }}
>
📥 حفظ بطاقة الموعد في الهاتف
</button>

{providerWaPhone && (
<a
href={buildWhatsAppUrl(confirmWaText)}
style={{ display: 'block', width: '100%', background: '#25D366', color: '#fff', padding: 13, borderRadius: 12, fontWeight: 800, fontSize: 14, textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box', marginBottom: 8 }}
>
💬 إرسال التذكرة عبر واتساب
</a>
)}

<button
type="button"
onClick={() => setBookedInfo(null)}
style={{ width: '100%', background: '#f1f5f9', color: '#334155', border: 'none', padding: 11, borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
>
حجز موعد آخر
</button>
</div>
</div>
</div>
);
}

  const pageFont = { fontFamily: "'Cairo', sans-serif", direction: 'rtl' };

  const inputStyle = {
    width: '100%',
    padding: '11px 12px',
    margin: '6px 0 14px',
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#0f172a',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    fontSize: 14
  };

  if (bookedInfo) {
    const confirmWaText =
      'مرحبا ' + provider.business_name + '، قمت بحجز موعد عبر منصة عربون وأرسلت الوصل:\n' +
      'الاسم: ' + bookedInfo.clientName + '\n' +
      'الخدمة: ' + bookedInfo.serviceTitle + '\n' +
      'التاريخ: ' + bookedInfo.date + ' الساعة ' + bookedInfo.time + '\n' +
      'العربون: ' + bookedInfo.depositAmount + ' درهم';

    return (
      <div style={{ ...pageFont, maxWidth: 460, margin: '20px auto', background: '#fff', padding: 24, borderRadius: 20, boxShadow: '0 10px 25px rgba(0,0,0,0.06)', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 12px' }}>✓</div>
                <h2 style={{ margin: '0 0 8px', color: '#15803d', fontWeight: 800 }}>
          {bookedInfo.autoConfirmed ? '🎉 تم تأكيد حجزك تلقائياً!' : 'تم تسجيل طلب حجزك!'}
        </h2>
        <p style={{ color: '#475569', fontSize: 14, marginBottom: 14 }}>
          {bookedInfo.autoConfirmed
            ? 'تحقق النظام الذكي من وصل الدفع وتم تثبيت موعدك بنجاح. يمكنك إرسال نسخه لصاحب المشروع عبر واتساب:'
            : 'وصل طلبك لصاحب المشروع للمراجعة. اضغط على الزر الأخضر لإرسال تفاصيل حجزك عبر واتساب:'}
        </p>
        {bookedInfo.aiReport && (
          <div style={{ background: bookedInfo.autoConfirmed ? '#f0fdf4' : '#fffbeb', border: bookedInfo.autoConfirmed ? '1px solid #86efac' : '1px solid #fde047', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#0f172a', marginBottom: 14, fontWeight: 700 }}>
            {bookedInfo.aiReport}
          </div>
        )} 
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, textAlign: 'right', fontSize: 13, marginBottom: 18, lineHeight: 1.8 }}>
          <div><strong>الاسم:</strong> {bookedInfo.clientName}</div>
          <div><strong>الخدمة:</strong> {bookedInfo.serviceTitle}</div>
          <div><strong>الموعد:</strong> {bookedInfo.date} | {bookedInfo.time}</div>
          <div><strong>العربون:</strong> <span style={{ color: '#16a34a', fontWeight: 700 }}>{bookedInfo.depositAmount} درهم</span></div>
        </div>

        {providerWaPhone && (
          <a href={buildWhatsAppUrl(confirmWaText)} style={{ display: 'block', width: '100%', background: '#25D366', color: '#fff', padding: 14, borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none', boxSizing: 'border-box', marginBottom: 10 }}>
            أرسل تفاصيل الحجز عبر واتساب 💬
          </a>
        )}

        <button type="button" onClick={() => setBookedInfo(null)} style={{ width: '100%', background: '#f1f5f9', color: '#334155', border: 'none', padding: 12, borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          حجز موعد آخر
        </button>
      </div>
    );
  }
  const firstLetter = String(provider.business_name || 'ع').trim().charAt(0);
  const isPremium = String(provider.plan_type || '').toLowerCase() === 'premium';

  return (
    <div style={{ ...pageFont, maxWidth: 460, margin: '12px auto', background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.06)' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#fff', padding: '24px 20px', textAlign: 'center' }}>
        <span style={{ background: 'rgba(255,255,255,0.18)', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
          عربون • 3arboon {isPremium ? '👑' : ''}
        </span>

        <div style={{ margin: '14px auto 8px', display: 'flex', justifyContent: 'center' }}>
          {provider.logo_url ? (
            <img
              src={provider.logo_url}
              alt={provider.business_name}
              style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            />
          ) : (
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800 }}>
              {firstLetter}
            </div>
          )}
        </div>

        <h2 style={{ margin: '4px 0 8px', fontSize: 22, fontWeight: 800 }}>
          {provider.business_name} {isPremium && <span title="حساب موثق">👑</span>}
        </h2>

        {mapsUrl && (
          <div style={{ marginBottom: 10 }}>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#dc2626', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800, textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
            >
              📍 موقع المحل على خرائط جوجل ↗
            </a>
          </div>
        )}

        {provider.bio && (
          <p style={{ margin: '8px auto 10px', maxWidth: 380, background: 'rgba(255,255,255,0.14)', padding: '8px 12px', borderRadius: 12, color: '#f8fafc', fontSize: 13, lineHeight: 1.6 }}>
            {provider.bio}
          </p>
        )}

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.2)', padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700, color: '#fde047' }}>
          <span>⭐ {avgRating ? avgRating : 'جديد'}</span>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
            ({reviews.length > 0 ? reviews.length + ' تقييم' : 'كن أول من يقيّم'})
          </span>
        </div>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, background: '#f8fafc', padding: '12px 10px', borderRadius: 14, border: '1px solid #e2e8f0' }}>
          {[
            { num: 1, label: 'الخدمة' },
            { num: 2, label: 'الموعد' },
            { num: 3, label: 'التأكيد' }
          ].map((st) => {
            const active = currentStep >= st.num;
            return (
              <div key={st.num} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: active ? '#2563eb' : '#cbd5e1',
                  color: '#fff', fontSize: 12, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {st.num}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#1e3a8a' : '#64748b' }}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 14, padding: 12, marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#5b21b6', marginBottom: 6 }}>
            🤖 موظف الاستقبال الذكي (اسأل عن المحل أو المواعيد):
          </div>
          <form onSubmit={handleAskReceptionistAI} style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              placeholder="مثال: واش كاينين فالعشية؟ شحال الثمن؟..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{ ...inputStyle, margin: 0, flex: 2, padding: '8px 10px', fontSize: 13 }}
            />
            <button
              type="submit"
              disabled={askingReceptionist}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, padding: '0 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >
              {askingReceptionist ? 'جاري...' : 'اسأل ✨'}
            </button>
          </form>
          {receptionistReply && (
            <div style={{ marginTop: 8, background: '#fff', border: '1px solid #e9d5ff', borderRadius: 10, padding: 10, fontSize: 13, color: '#1e293b', lineHeight: 1.6 }}>
              {receptionistReply}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: 8, fontSize: 14 }}>1. اختر الخدمة</label>

          {services.length > 1 && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', marginBottom: 6 }}>
                💡 محتار شنو تختار؟ اكتب طلبك ونرشّح لك الخدمة المناسبة:
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  placeholder="مثال: بغيت تنظيف عميق للبشرة..."
                  value={clientNeed}
                  onChange={(e) => setClientNeed(e.target.value)}
                  style={{ ...inputStyle, margin: 0, flex: 2, padding: '7px 10px', fontSize: 12 }}
                />
                <button
                  type="button"
                  disabled={matchingService}
                  onClick={handleMatchServiceAI}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '0 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                >
                  {matchingService ? 'جاري...' : 'رشّح لي ✨'}
                </button>
              </div>
              {serviceMatchReply && (
                <div style={{ marginTop: 8, background: '#fff', border: '1px solid #dbeafe', borderRadius: 8, padding: 8, fontSize: 12, color: '#0f172a', lineHeight: 1.6 }}>
                  {serviceMatchReply}
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
            {services.map((s) => {
              const isSelected = String(s.id) === String(serviceId);
              return (
                <div
                  key={s.id}
                  onClick={() => setServiceId(s.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: '0.2s'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{s.title}</div>
                    {(s.total_price || s.price) && <div style={{ fontSize: 12, color: '#64748b' }}>الثمن الإجمالي: {s.total_price || s.price} درهم</div>}
                  </div>
                  <div style={{ background: isSelected ? '#2563eb' : '#f1f5f9', color: isSelected ? '#fff' : '#334155', padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                    {s.deposit_amount} درهم عربون
                  </div>
                </div>
              );
            })}
          </div>

          <label style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>2. التاريخ</label>
          <input
            type="date"
            min={new Date().toISOString().split('T').at(0)}
            style={inputStyle}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setTime('');
            }}
            required
          />

          <label style={{ display: 'block', fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
            اختر الساعة المتاحة {checkingSlots && <small style={{ color: '#2563eb' }}>(جاري الفحص...)</small>}
          </label>

          {!date ? (
            <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 10, padding: 14, textAlign: 'center', fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              يرجى اختيار التاريخ أولاً لعرض الساعات المتاحة
            </div>
          ) : isSelectedDateClosed ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 14, textAlign: 'center', fontSize: 13, color: '#991b1b', fontWeight: 700, marginBottom: 16 }}>
              🏖️ عذراً، المحل مغلق في هذا اليوم (عطلة). يرجى اختيار تاريخ آخر!
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16, direction: 'ltr' }}>
              {defaultHours.map((hr) => {
                const isBooked = bookedTimes.includes(hr);
                const isSelected = time === hr;
                return (
                  <button
                    key={hr}
                    type="button"
                    disabled={isBooked}
                    onClick={() => setTime(hr)}
                    style={{
                      padding: '10px 4px',
                      borderRadius: 10,
                      border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: isBooked ? '#f1f5f9' : isSelected ? '#2563eb' : '#fff',
                      color: isBooked ? '#94a3b8' : isSelected ? '#fff' : '#0f172a',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: isBooked ? 'not-allowed' : 'pointer',
                      textDecoration: isBooked ? 'line-through' : 'none',
                      fontFamily: 'inherit'
                    }}
                  >
                    {hr} {isBooked ? '🔒' : ''}
                  </button>
                );
              })}
            </div>
          )}

          {selectedSrv && !isSelectedDateClosed && time && (
            <div style={{ background: '#f0fdf4', padding: 14, borderRadius: 12, marginBottom: 16, border: '1px dashed #16a34a' }}>
              <div style={{ marginBottom: 8, fontSize: 14 }}>
                العربون المطلوب: <strong style={{ color: '#15803d' }}>{selectedSrv.deposit_amount} درهم</strong>
              </div>
              <div style={{ fontSize: 12, color: '#166534', marginBottom: 8, fontWeight: 700 }}>
                اختر إحدى طرق الدفع المتاحة:
              </div>
              {paymentList.map((pm, idx) => (
                <div key={idx} style={{ background: '#fff', padding: '8px 10px', borderRadius: 8, border: '1px solid #bbf7d0', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 12, overflowX: 'auto' }}>
                    <strong>{pm.bank}:</strong> <span style={{ direction: 'ltr', display: 'inline-block' }}>{pm.account}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyAccount(pm.account)}
                    style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    نسخ
                  </button>
                </div>
              ))}
            </div>
          )}
          <label style={{ fontWeight: 700, fontSize: 14 }}>3. الاسم الكامل</label>
          <input type="text" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />

          <label style={{ fontWeight: 700, fontSize: 14 }}>رقم الواتساب</label>
          <input type="tel" style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} required />

          <label style={{ fontWeight: 700, fontSize: 14 }}>صورة وصل الدفع</label>
          <input type="file" accept="image/*" style={inputStyle} onChange={(e) => setFile(e.target.files.item(0))} required />

          <button type="submit" disabled={loading || isSelectedDateClosed} style={{ width: '100%', background: isSelectedDateClosed ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', padding: 14, borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: isSelectedDateClosed ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {loading ? 'جاري الإرسال...' : 'تأكيد الحجز وإرسال الوصل'}
          </button>

          {msg && <p style={{ textAlign: 'center', fontWeight: 700, marginTop: 10, color: '#2563eb' }}>{msg}</p>}
        </form>

        {providerWaPhone && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
            <a
              href={buildWhatsAppUrl(inquiryWaText)}
              style={{
                display: 'block',
                width: '100%',
                background: '#25D366',
                color: '#fff',
                padding: 12,
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
                boxSizing: 'border-box'
              }}
            >
              استفسر عبر واتساب قبل الحجز 💬
            </a>
          </div>
        )}
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '2px dashed #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
              ⭐ تقييمات الزبائن ({reviews.length})
            </h4>
            {reviews.length >= 2 && (
              <button
                type="button"
                disabled={summarizingReviews}
                onClick={handleSummarizeReviewsAI}
                style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {summarizingReviews ? 'جاري التلخيص...' : 'ملخص الآراء ✨'}
              </button>
            )}
          </div>

          {reviewsSummary && (
            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 12, color: '#1e293b', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              <strong style={{ color: '#5b21b6', display: 'block', marginBottom: 4 }}>✨ خلاصة تقييمات الزبائن:</strong>
              {reviewsSummary}
            </div>
          )}

          <form onSubmit={handleAddReview} style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a8a', marginBottom: 8 }}>أضف تقييمك للمحل:</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                type="text"
                placeholder="اسمك"
                value={revName}
                onChange={(e) => setRevName(e.target.value)}
                style={{ ...inputStyle, margin: 0, flex: 2, padding: '8px 10px', fontSize: 13 }}
                required
              />
              <select
                value={revRating}
                onChange={(e) => setRevRating(e.target.value)}
                style={{ ...inputStyle, margin: 0, flex: 1, padding: '8px 6px', fontSize: 13, fontWeight: 700 }}
              >
                <option value="5">5 ⭐ ممتاز</option>
                <option value="4">4 ⭐ جيد جداً</option>
                <option value="3">3 ⭐ جيد</option>
                <option value="2">2 ⭐ مقبول</option>
                <option value="1">1 ⭐ ضعيف</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="اكتب تعليقك (اختياري)..."
              value={revComment}
              onChange={(e) => setRevComment(e.target.value)}
              style={{ ...inputStyle, margin: '0 0 8px', padding: '8px 10px', fontSize: 13 }}
            />
            <button
              type="submit"
              disabled={sendingRev}
              style={{ width: '100%', background: '#0f172a', color: '#fff', border: 'none', padding: 9, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {sendingRev ? 'جاري النشر...' : 'إرسال التقييم ⭐'}
            </button>
          </form>

          {reviews.length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#64748b' }}>لا توجد تقييمات بعد. كن أول من يشارك رأيه!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reviews.map((r) => (
                <div key={r.id} style={{ background: '#f8fafc', padding: 10, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <strong style={{ color: '#0f172a' }}>{r.client_name}</strong>
                    <span style={{ color: '#d97706', fontWeight: 800 }}>{'⭐'.repeat(Number(r.rating || 5))}</span>
                  </div>
                  {r.comment && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

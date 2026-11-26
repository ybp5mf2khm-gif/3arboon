import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function AiToolsTab({ provider, bookings = [], services = [], onRefresh }) {
  // 1. صانع الإعلانات
  const [generatingAd, setGeneratingAd] = useState(false);
  const [generatedAd, setGeneratedAd] = useState('');

  // 2. مستشار الأرباح والإحصائيات
  const [analyzingStats, setAnalyzingStats] = useState(false);
  const [statsAdvice, setStatsAdvice] = useState('');

  // 3. ملخص التقييمات
  const [summarizingReviews, setSummarizingReviews] = useState(false);
  const [reviewsSummary, setReviewsSummary] = useState('');

  // 4. مقترح الخدمات والأسعار
  const [bizCategory, setBizCategory] = useState(provider.category || 'صالون حلاقة وتجميل');
  const [suggestingServices, setSuggestingServices] = useState(false);
  const [suggestedServices, setSuggestedServices] = useState([]);
  const [addingService, setAddingService] = useState(false);

  // 5. رسالة استرجاع الزبناء
  const [retClientName, setRetClientName] = useState('');
  const [retClientPhone, setRetClientPhone] = useState('');
  const [retLastDate, setRetLastDate] = useState('');
  const [generatingRet, setGeneratingRet] = useState(false);
  const [retMessage, setRetMessage] = useState('');

  // 6. تجربة موظف الاستقبال الذكي
  const [testQuestion, setTestQuestion] = useState('');
  const [askingAI, setAskingAI] = useState(false);
  const [aiReply, setAiReply] = useState('');

  const bookingLink = window.location.origin + '/?p=' + provider.slug;

  const formatMoroccanPhone = (rawPhone) => {
    let ph = String(rawPhone || '').replace(/\D/g, '');
    if (ph.startsWith('0')) ph = '212' + ph.slice(1);
    else if (ph && !ph.startsWith('212')) ph = '212' + ph;
    return ph;
  };

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

  // 1. صانع الإعلانات
  const handleGenerateAd = async () => {
    setGeneratingAd(true);
    try {
      const servicesList = services.map((s) => `${s.title} (${s.total_price} درهم)`).join('، ');
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'generate_ad',
          businessName: provider.business_name,
          bio: provider.bio || '',
          servicesList,
          bookingLink
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedAd(data?.result || '');
    } catch (err) {
      alert('تعذر توليد الإعلان: ' + err.message);
    } finally {
      setGeneratingAd(false);
    }
  };

  // 2. تحليل الأرباح
  const handleAnalyzeStats = async () => {
    setAnalyzingStats(true);
    try {
      const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
      const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
      const summary = `إجمالي الحجوزات: ${bookings.length}، المؤكدة: ${confirmed}، الملغاة: ${cancelled}، عدد الخدمات: ${services.length}`;
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'analyze_stats',
          businessName: provider.business_name,
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

  // 3. ملخص التقييمات
  const handleSummarizeReviews = async () => {
    setSummarizingReviews(true);
    try {
      const { data: revData } = await supabase
        .from('reviews')
        .select('rating, comment')
        .eq('provider_id', provider.id);

      const reviewsList = (revData && revData.length > 0)
        ? revData.map((r) => `(${r.rating}/5): ${r.comment}`).join('\n')
        : 'لا توجد تقييمات مسجلة حالياً.';

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'summarize_reviews',
          businessName: provider.business_name,
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
  // 4. اقتراح الخدمات
  const handleSuggestServices = async () => {
    setSuggestingServices(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { action: 'suggest_services', businessCategory: bizCategory }
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
    setAddingService(true);
    try {
      const { error } = await supabase.from('services').insert([{
        provider_id: provider.id,
        title: srv.title,
        total_price: Number(srv.total_price),
        deposit_amount: Number(srv.deposit_amount)
      }]);
      if (error) throw error;
      setSuggestedServices((prev) => prev.filter((item) => item.title !== srv.title));
      if (onRefresh) await onRefresh();
    } catch (err) {
      alert('خطأ أثناء إضافة الخدمة: ' + err.message);
    } finally {
      setAddingService(false);
    }
  };

  // 5. رسالة استرجاع زبون
  const handleRetention = async () => {
    if (!retClientName.trim()) return alert('اكتب اسم الزبون أولاً');
    setGeneratingRet(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'retention_message',
          businessName: provider.business_name,
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

  // 6. تجربة موظف الاستقبال
  const handleAskReceptionist = async () => {
    if (!testQuestion.trim()) return;
    setAskingAI(true);
    try {
      const hours = Array.isArray(provider.working_hours) ? provider.working_hours.join('، ') : '';
      const providerContext = `المحل: ${provider.business_name}. الوصف: ${provider.bio || ''}. الخدمات: ${services.map((s) => `${s.title} بـ ${s.total_price} درهم`).join('، ')}. أوقات العمل: ${hours}`;
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'ask_receptionist',
          businessName: provider.business_name,
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

  return (
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
          onClick={handleGenerateAd}
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
          onClick={handleAnalyzeStats}
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
          onClick={handleSummarizeReviews}
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
          onClick={handleSuggestServices}
          disabled={suggestingServices}
          style={{ width: '100%', background: '#7c3aed', color: '#fff', border: 'none', padding: 11, borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {suggestingServices ? 'جاري الاقتراح...' : 'اقترح 5 خدمات مع العربون ✨'}
        </button>
        {suggestedServices.map((srv, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: 10, borderRadius: 10, border: '1px solid #cbd5e1', marginTop: 8 }}>
            <div style={{ fontSize: 12 }}>
              <strong style={{ display: 'block' }}>{srv.title}</strong>
              <span style={{ color: '#475569' }}>الثمن: {srv.total_price} درهم • العربون: {srv.deposit_amount} درهم</span>
            </div>
            <button
              type="button"
              onClick={() => handleQuickAddService(srv)}
              disabled={addingService}
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
          onClick={handleRetention}
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
            onClick={handleAskReceptionist}
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
  );
}

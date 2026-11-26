import React, { useState, useRef, useEffect } from 'react';
import { supabase } from './supabaseClient';

const QUICK_QUESTIONS = [
  'كيف أحجز موعداً في عربون؟',
  'ما هي المحلات والصالونات المتوفرة؟',
  'كيف أؤكد الحجز بالعربون؟'
];

export default function ChatBotWidget({ allProviders = [], allServices = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'مرحباً بك في منصة عربون 🇲🇦! أنا مساعدك الذكي، كيف يمكنني مساعدتك اليوم في حجز موعدك أو البحث عن خدمة؟',
      matchedProvs: []
    }
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);
  const sendMessage = async (textToSend) => {
    const q = String(textToSend || input).trim();
    if (!q || sending) return;

    const userMsg = { role: 'user', text: q, matchedProvs: [] };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const directoryContext = allProviders.length > 0
        ? allProviders.map((p) => {
            const pSrvs = allServices.filter((s) => s.provider_id === p.id);
            const srvsList = pSrvs.length > 0
              ? pSrvs.map((s) => s.title + ' (' + s.total_price + ' درهم، عربون ' + s.deposit_amount + ' درهم)').join('، ')
              : 'خدمات متنوعة';
            return '- المحل: ' + p.business_name + ' | الوصف: ' + (p.bio || 'خدمات احترافية') + ' | الخدمات: ' + srvsList;
          }).join('\n')
        : 'لا توجد محلات مسجلة حالياً.';

      const platformGuide =
        'طريقة الحجز في منصة عربون: 1. اختر المحل والخدمة. 2. حدد التاريخ والساعة المتاحة. 3. حوّل مبلغ العربون البسيط لحساب المحل البنكي وارفع صورة الوصل لتأكيد الموعد فوراً عبر واتساب.\n' +
        'قائمة المحلات والخدمات المتاحة حالياً:\n' + directoryContext;

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'ask_receptionist',
          businessName: 'منصة عربون',
          providerContext: platformGuide,
          question: q
        }
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      const replyText = (data && data.result) ? data.result : 'مرحباً بك! يمكنك تصفح المحلات المتاحة واختيار موعدك بسهولة.';

      const mentioned = allProviders.filter((p) => {
        const bName = String(p.business_name || '').trim().toLowerCase();
        return bName && (replyText.toLowerCase().includes(bName) || q.toLowerCase().includes(bName));
      });

      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: replyText, matchedProvs: mentioned }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: 'عذراً، حدث ضغط مؤقت. يمكنك اختيار المحل مباشرة من القائمة الرئيسية وحجز موعدك في ثوانٍ!',
          matchedProvs: []
        }
      ]);
    } finally {
      setSending(false);
    }
  };
  return (
    <div style={{ fontFamily: "'Cairo', sans-serif", direction: 'rtl', position: 'fixed', bottom: 18, left: 18, zIndex: 9999 }}>
      {isOpen && (
        <div style={{
          width: 330,
          maxWidth: 'calc(100vw - 36px)',
          height: 440,
          maxHeight: '75vh',
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 14px 35px rgba(15, 23, 42, 0.22)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          marginBottom: 12
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
            color: '#fff',
            padding: '13px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                🤖
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>مساعد عربون الذكي</div>
                <div style={{ fontSize: 11, color: '#bbf7d0' }}>● متصل الآن للرد الفوري</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', width: 28, height: 28, borderRadius: '50%', fontWeight: 800, cursor: 'pointer', fontSize: 14 }}
            >
              ✕
            </button>
          </div>

          <div style={{ flex: 1, padding: 12, overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{ alignSelf: m.role === 'user' ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                <div style={{
                  background: m.role === 'user' ? '#2563eb' : '#fff',
                  color: m.role === 'user' ? '#fff' : '#0f172a',
                  padding: '9px 12px',
                  borderRadius: m.role === 'user' ? '14px 14px 14px 4px' : '14px 14px 4px 14px',
                  fontSize: 13,
                  lineHeight: 1.6,
                  border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                  whiteSpace: 'pre-line'
                }}>
                  {m.text}
                </div>
                {Array.isArray(m.matchedProvs) && m.matchedProvs.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {m.matchedProvs.map((mp) => (
                      <a
                        key={mp.id}
                        href={'/?p=' + mp.slug}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: '#16a34a',
                          color: '#fff',
                          padding: '7px 10px',
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 700,
                          textDecoration: 'none'
                        }}
                      >
                        <span>🏪 {mp.business_name}</span>
                        <span>احجز الآن ←</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div style={{ alignSelf: 'flex-end', background: '#fff', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: 14, fontSize: 12, color: '#64748b' }}>
                يكتب الآن... ✍️
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 2 && (
            <div style={{ padding: '6px 10px', background: '#f1f5f9', display: 'flex', gap: 6, overflowX: 'auto', whiteSpace: 'nowrap', borderTop: '1px solid #e2e8f0' }}>
              {QUICK_QUESTIONS.map((qq, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => sendMessage(qq)}
                  style={{
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    color: '#1e3a8a',
                    padding: '5px 10px',
                    borderRadius: 14,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    flexShrink: 0
                  }}
                >
                  {qq}
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
              placeholder="اكتب سؤالك هنا..."
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
                background: '#2563eb',
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
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: 50,
          padding: '12px 18px',
          fontWeight: 800,
          fontSize: 14,
          cursor: 'pointer',
          boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'inherit'
        }}
      >
        <span style={{ fontSize: 18 }}>{isOpen ? '✕' : '💬'}</span>
        <span>{isOpen ? 'إغلاق' : 'مساعد عربون'}</span>
      </button>
    </div>
  );
}

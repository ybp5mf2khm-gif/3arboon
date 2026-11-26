import React, { useState, useRef, useEffect } from 'react';
import { supabase } from './supabaseClient';

const QUICK_QUESTIONS = [
  'كيف أحجز موعداً في عربون؟',
  'ما هي المحلات والصالونات المتوفرة؟',
  'كيف أؤكد الحجز بالعربون؟'
];

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

export default function ChatBotWidget({ allProviders = [], allServices = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'مرحباً بك في منصة 3arboon 🇲🇦! أنا الروبوت المساعد، كيف يمكنني خدمتك اليوم؟ (يمكنك سحبي وتحريكي لأي مكان في الشاشة)',
      matchedProvs: []
    }
  ]);

  const [pos, setPos] = useState({ x: 16, y: typeof window !== 'undefined' ? window.innerHeight - 86 : 550 });
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const messagesEndRef = useRef(null);

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
    dragOffsetRef.current = {
      x: clientX - pos.x,
      y: clientY - pos.y
    };
  };

  const onDrag = (clientX, clientY) => {
    if (!isDraggingRef.current) return;
    const nextX = clientX - dragOffsetRef.current.x;
    const nextY = clientY - dragOffsetRef.current.y;
    if (Math.abs(nextX - pos.x) > 4 || Math.abs(nextY - pos.y) > 4) {
      hasMovedRef.current = true;
    }
    const maxX = window.innerWidth - 76;
    const maxY = window.innerHeight - 76;
    setPos({
      x: Math.min(Math.max(8, nextX), maxX),
      y: Math.min(Math.max(8, nextY), maxY)
    });
  };

  const endDrag = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    const handleMouseMove = (e) => onDrag(e.clientX, e.clientY);
    const handleTouchMove = (e) => {
      if (isDraggingRef.current && e.touches[0]) {
        e.preventDefault();
        onDrag(e.touches[0].clientX, e.touches[0].clientY);
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
        'طريقة الحجز في منصة عربون (3arboon): 1. اختر المحل والخدمة. 2. حدد التاريخ والساعة المتاحة. 3. حوّل مبلغ العربون البسيط لحساب المحل البنكي وارفع صورة الوصل لتأكيد الموعد فوراً عبر واتساب.\n' +
        'قائمة المحلات والخدمات المتاحة حالياً:\n' + directoryContext;

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'ask_receptionist',
          businessName: 'روبوت 3arboon',
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
  const openLeft = typeof window !== 'undefined' && pos.x > window.innerWidth / 2;
  const openDown = typeof window !== 'undefined' && pos.y < 360;

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
            left: openLeft ? Math.max(12, pos.x - 250) : Math.min(pos.x, (typeof window !== 'undefined' ? window.innerWidth : 400) - 332),
            top: openDown ? Math.min(pos.y + 72, (typeof window !== 'undefined' ? window.innerHeight : 700) - 430) : Math.max(12, pos.y - 435),
            width: 320,
            maxWidth: 'calc(100vw - 24px)',
            height: 420,
            maxHeight: '72vh',
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
                <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.3 }}>3arboon AI</div>
                <div style={{ fontSize: 11, color: '#38bdf8' }}>● روبوت المساعدة الذكي</div>
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
              <div key={idx} style={{ alignSelf: m.role === 'user' ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
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
                روبوت 3arboon يفكر... ⚡
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 2 && (
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
              placeholder="اسأل 3arboon..."
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

      {/* أيقونة الروبوت المدمجة القابلة للسحب */}
      <button
        type="button"
        onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          if (e.touches && e.touches[0]) {
            startDrag(e.touches[0].clientX, e.touches[0].clientY);
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

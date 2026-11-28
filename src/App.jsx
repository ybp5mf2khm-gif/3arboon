import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import ChatBotWidget from './ChatBotWidget.jsx';
import BookingPage from './BookingPage.jsx';
import DashboardPage from './DashboardPage.jsx';
import RegisterPage from './RegisterPage.jsx';
import ClientPage from './ClientPage.jsx';
import AdminPage from './AdminPage.js';

export default function App() {
  const [view, setView] = useState('booking');
  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [allProviders, setAllProviders] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearching, setAiSearching] = useState(false);
  const [aiSearchResult, setAiSearchResult] = useState('');
  const [matchedProviders, setMatchedProviders] = useState([]);

  const params = new URLSearchParams(window.location.search);
  const isAdminRoute = params.get('admin') === 'true';
  const slug = params.get('p');

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://googleapis.com';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const loadProviderDetails = async (prov) => {
    setProvider(prov);
    const { data: srvs } = await supabase.from('services').select('*').eq('provider_id', prov.id);
    setServices(srvs || []);
    const { data: bks } = await supabase.from('bookings').select('*').eq('provider_id', prov.id).order('created_at', { ascending: false });
    setBookings(bks || []);
    const { data: revs } = await supabase.from('reviews').select('*').eq('provider_id', prov.id).order('created_at', { ascending: false });
    setReviews(revs || []);
  };

  const loadDirectory = async () => {
    const { data: provs } = await supabase.from('providers').select('*').eq('is_active', true);
    setAllProviders(provs || []);
    const { data: srvs } = await supabase.from('services').select('*');
    setAllServices(srvs || []);
    const { data: revs } = await supabase.from('reviews').select('*');
    setAllReviews(revs || []);
  };

  const loadData = async () => {
    if (isAdminRoute) {
      setLoading(false);
      return;
    }
    await loadDirectory();
    if (slug) {
      const { data: prov } = await supabase.from('providers').select('*').eq('slug', slug).single();
      if (prov && prov.is_active) {
        await loadProviderDetails(prov);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAiDirectorySearch = async (e) => {
    e.preventDefault();
    const q = aiSearchQuery.trim();
    if (!q) {
      setAiSearchResult('');
      setMatchedProviders([]);
      return;
    }

    const stopWords = ['ابحث', 'عن', 'البحث', 'بغيت', 'فين', 'محل', 'بائع', 'صالون', 'خدمة', 'اريد', 'أريد'];
    const keywords = q
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !stopWords.includes(w));
    const searchTerms = keywords.length > 0 ? keywords : [q.toLowerCase()];

    const directMatches = allProviders.filter((p) => {
      const pName = String(p.business_name || '').toLowerCase();
      const pBio = String(p.bio || '').toLowerCase();
      const pOwner = String(p.owner_name || '').toLowerCase();
      const pSrvs = allServices.filter((s) => s.provider_id === p.id);
      const srvsText = pSrvs.map((s) => String(s.title || '').toLowerCase()).join(' ');
      const fullText = pName + ' ' + pBio + ' ' + pOwner + ' ' + srvsText;
      return searchTerms.some((term) => fullText.includes(term));
    });
    setMatchedProviders(directMatches);

    setAiSearching(true);
    try {
      const directorySummary = allProviders.length > 0
        ? allProviders.map((p) => {
            const pSrvs = allServices.filter((s) => s.provider_id === p.id);
            const srvsStr = pSrvs.length > 0
              ? pSrvs.map((s) => s.title + ' (' + s.total_price + ' درهم)').join('، ')
              : 'خدمات متنوعة';
            return '- اسم المحل: ' + p.business_name + ' | الوصف: ' + (p.bio || 'غير محدد') + ' | الخدمات: ' + srvsStr;
          }).join('\n')
        : 'لا توجد محلات مسجلة حالياً';

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: 'ask_receptionist',
          businessName: 'منصة عربون - دليل المشاريع',
          providerContext: 'قائمة جميع المشاريع المسجلة في منصة عربون:\n' + directorySummary,
          question: q
        }
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      if (data && data.result) {
        const replyText = data.result;
        setAiSearchResult(replyText);

        const aiMentioned = allProviders.filter((p) => {
          const bName = String(p.business_name || '').trim().toLowerCase();
          return bName && replyText.toLowerCase().includes(bName);
        });

        const combined = [...directMatches];
        aiMentioned.forEach((ap) => {
          if (!combined.some((c) => c.id === ap.id)) {
            combined.push(ap);
          }
        });
        setMatchedProviders(combined);
      }
    } catch {
      if (directMatches.length > 0) {
        setAiSearchResult('تم العثور على ' + directMatches.length + ' نتيجة مطابقة لبحثك:');
      } else {
        setAiSearchResult('لم يتم العثور على نتائج مطابقة لـ "' + q + '".');
      }
    } finally {
      setAiSearching(false);
    }
  };
  if (isAdminRoute) {
    return (
      <>
        <AdminPage />
        <ChatBotWidget allProviders={allProviders} allServices={allServices} />
      </>
    );
  }

  const handleProviderLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    const cleanInput = loginIdentifier.trim().toLowerCase();

    try {
      const { data: allProvs, error } = await supabase.from('providers').select('*');
      if (error) throw error;

      const matched = (allProvs || []).find((p) => {
        const pEmail = String(p.email || '').trim().toLowerCase();
        const pPhone = String(p.phone || '').replace(/\s+/g, '');
        return (pEmail && pEmail === cleanInput) || (pPhone && pPhone === cleanInput);
      });

      if (!matched) {
        alert('لم يتم العثور على حساب بهذا البريد الإلكتروني أو رقم الهاتف.');
      } else if (String(matched.pin_code) !== String(pinInput).trim()) {
        alert('الرمز السري غير صحيح.');
      } else if (!matched.is_active) {
        alert('حسابك بانتظار التفعيل من طرف إدارة المنصة.');
      } else {
        await loadProviderDetails(matched);
        setIsUnlocked(true);
        setPinInput('');
      }
    } catch (err) {
      alert('حدث خطأ أثناء تسجيل الدخول: ' + err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const getProviderRating = (provId) => {
    const provRevs = allReviews.filter((r) => r.provider_id === provId);
    if (provRevs.length === 0) return { avg: 'جديد', count: 0 };
    const sum = provRevs.reduce((acc, item) => acc + Number(item.rating || 5), 0);
    return { avg: (sum / provRevs.length).toFixed(1), count: provRevs.length };
  };

  const getMapsLink = (p) => {
    const raw = String(p.google_maps_url || '').trim();
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    const coords = raw.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (coords) {
      return 'https://google.com' + coords.at(1) + ',' + coords.at(2);
    }
    if (p.latitude && p.longitude) {
      return 'https://google.com' + p.latitude + ',' + p.longitude;
    }
    return null;
  };

  const appFont = {
    fontFamily: "'Cairo', -apple-system, BlinkMacSystemFont, sans-serif",
    direction: 'rtl',
    color: '#0f172a'
  };

  const primaryBtn = {
    background: '#0f172a',
    color: '#ffffff',
    border: 'none',
    borderRadius: 12,
    padding: '13px 16px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: 'inherit'
  };

  const secondaryBtn = {
    background: '#ffffff',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: 12,
    padding: '11px 14px',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit'
  };

  if (loading) {
    return (
      <div style={{ ...appFont, textAlign: 'center', marginTop: 90, color: '#0f172a', fontWeight: 700, fontSize: 15 }}>
        جاري تحميل منصة عربون...
      </div>
    );
  }

  return (
    <div style={appFont}>
      {view === 'register' && (
        <div style={{ padding: 12 }}>
          <RegisterPage onCancel={() => setView('booking')} />
        </div>
      )}

      {view === 'client' && (
        <div style={{ padding: 12 }}>
          <ClientPage onBack={() => setView('booking')} />
        </div>
      )}

      {!slug && view === 'booking' && (() => {
        const displayedProviders = (aiSearchQuery.trim() && matchedProviders.length > 0)
          ? matchedProviders
          : allProviders;

        return (
          <div style={{ padding: 12, maxWidth: 480, margin: '12px auto' }}>
            <div style={{ background: '#ffffff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)', border: '1px solid #e2e8f0' }}>
              {/* ترويسة المنصة الرسمية */}
              <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '28px 20px 22px', textAlign: 'center' }}>
                <span style={{ display: 'inline-block', background: '#f1f5f9', color: '#334155', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.4, marginBottom: 10 }}>
                  منصة الحجز وتأكيد المواعيد بالمغرب
                </span>
                <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: '#0f172a' }}>
                  عربون • 3arboon
                </h1>
                <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.7, margin: '0 auto', maxWidth: 360 }}>
                  احجز موعدك بسهولة مع الصالونات والمشاريع المعتمدة، أو أنشئ صفحة حجز احترافية لمشروعك في دقيقة واحدة.
                </p>
              </div>

              <div style={{ padding: 18 }}>
                <button
                  onClick={() => setView('register')}
                  style={{ ...primaryBtn, width: '100%', marginBottom: 10 }}
                >
                  إنشاء صفحة حجز لمشروعك مجاناً
                </button>

                <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                  <button
                    onClick={() => {
                      setIsUnlocked(false);
                      setView('dashboard');
                    }}
                    style={{ ...secondaryBtn, flex: 1 }}
                  >
                    لوحة التحكم
                  </button>

                  <button
                    onClick={() => setView('client')}
                    style={{ ...secondaryBtn, flex: 1, background: '#f8fafc' }}
                  >
                    تتبع حجوزاتي
                  </button>
                </div>
                {allProviders.length > 0 && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, marginBottom: 18 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                      البحث عن مشروع أو خدمة
                    </div>
                    <form onSubmit={handleAiDirectorySearch} style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        placeholder="اكتب اسم المحل أو الخدمة المطلوبة..."
                        value={aiSearchQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAiSearchQuery(val);
                          if (!val.trim()) {
                            setAiSearchResult('');
                            setMatchedProviders([]);
                          }
                        }}
                        style={{ flex: 2, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: 13, fontFamily: 'inherit' }}
                      />
                      <button
                        type="submit"
                        disabled={aiSearching}
                        style={{ ...primaryBtn, padding: '0 16px', borderRadius: 10, fontSize: 13, whiteSpace: 'nowrap' }}
                      >
                        {aiSearching ? 'جاري...' : 'بحث'}
                      </button>
                    </form>

                    {aiSearchResult && (
                      <div style={{ marginTop: 10, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 10, padding: 10, fontSize: 12.5, color: '#1e293b', lineHeight: 1.6 }}>
                        {aiSearchResult}
                        {matchedProviders.length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {matchedProviders.map((mp) => (
                              <a
                                key={mp.id}
                                href={'/?p=' + mp.slug}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
                              >
                                <span>{mp.business_name}</span>
                                <span style={{ color: '#2563eb', fontSize: 12 }}>انتقال للحجز ←</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {displayedProviders.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                        المشاريع والصالونات المتاحة ({displayedProviders.length})
                      </h3>
                      {aiSearchQuery.trim() && matchedProviders.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setAiSearchQuery('');
                            setAiSearchResult('');
                            setMatchedProviders([]);
                          }}
                          style={{ ...secondaryBtn, padding: '4px 10px', fontSize: 11, borderRadius: 8 }}
                        >
                          عرض الكل
                        </button>
                      )}
                    </div>

                    {displayedProviders.map((p) => {
                      const pServices = allServices.filter((s) => s.provider_id === p.id);
                      const ratingObj = getProviderRating(p.id);
                      const mapsUrl = getMapsLink(p);
                      const firstLetter = String(p.business_name || 'ع').trim().charAt(0);

                      return (
                        <div key={p.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 15, marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {p.logo_url ? (
                                <img
                                  src={p.logo_url}
                                  alt={p.business_name}
                                  style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1', background: '#ffffff' }}
                                />
                              ) : (
                                <div style={{ width: 50, height: 50, borderRadius: 14, background: '#0f172a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 19, flexShrink: 0 }}>
                                  {firstLetter}
                                </div>
                              )}
                              <div>
                                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{p.business_name}</h4>
                                {mapsUrl ? (
                                  <a
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      display: 'inline-block',
                                      marginTop: 4,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: '#2563eb',
                                      textDecoration: 'none'
                                    }}
                                  >
                                    الموقع على الخريطة ↗
                                  </a>
                                ) : (
                                  <span style={{ display: 'inline-block', marginTop: 3, fontSize: 11, color: '#64748b' }}>
                                    المغرب
                                  </span>
                                )}
                              </div>
                            </div>

                            <a
                              href={'/?p=' + p.slug}
                              style={{ ...primaryBtn, textDecoration: 'none', padding: '9px 14px', borderRadius: 10, fontSize: 12.5, whiteSpace: 'nowrap', flexShrink: 0 }}
                            >
                              احجز الآن
                            </a>
                          </div>

                          {p.bio && (
                            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#475569', background: '#f8fafc', padding: '8px 11px', borderRadius: 10, border: '1px solid #e2e8f0', lineHeight: 1.6 }}>
                              {p.bio}
                            </p>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9', fontSize: 12 }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              التقييم: {ratingObj.avg}{' '}
                              <span style={{ color: '#64748b', fontWeight: 600 }}>
                                ({ratingObj.count > 0 ? ratingObj.count + ' تقييم' : 'جديد'})
                              </span>
                            </div>
                            <a href={'/?p=' + p.slug} style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
                              عرض الخدمات ↗
                            </a>
                          </div>

                          {pServices.length > 0 && (
                            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {pServices.slice(0, 2).map((s) => (
                                <div key={s.id} style={{ background: '#f8fafc', padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{s.title}</span>
                                  <span style={{ color: '#475569', fontWeight: 700 }}>{s.total_price} درهم (عربون: {s.deposit_amount})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 14, border: '1px solid #e2e8f0', textAlign: 'right' }}>
                  <h4 style={{ margin: '0 0 10px', color: '#0f172a', fontSize: 14, fontWeight: 800 }}>
                    آلية العمل على منصة عربون
                  </h4>
                  <div style={{ fontSize: 12.5, color: '#475569', display: 'flex', flexDirection: 'column', gap: 8, lineHeight: 1.6 }}>
                    <div style={{ background: '#ffffff', padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <strong style={{ color: '#0f172a' }}>1. تسجيل المشروع:</strong> إضافة شعار المحل، رابط الموقع، وقائمة الخدمات.
                    </div>
                    <div style={{ background: '#ffffff', padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <strong style={{ color: '#0f172a' }}>2. مشاركة الرابط:</strong> نشر رابط الحجز الخاص في منصات التواصل الاجتماعي.
                    </div>
                    <div style={{ background: '#ffffff', padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <strong style={{ color: '#0f172a' }}>3. تأكيد المواعيد:</strong> استقبال حجوزات الزبائن والتحقق من وصولات العربون.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {view !== 'register' && view !== 'client' && !(!slug && view === 'booking') && (
        <div style={{ padding: 12 }}>
          {view === 'booking' ? (
            <>
              {provider ? (
                <BookingPage
                  provider={provider}
                  services={services}
                  reviews={reviews}
                  onSuccess={() => loadProviderDetails(provider)}
                />
              ) : (
                <div style={{ textAlign: 'center', background: '#ffffff', padding: 28, borderRadius: 18, maxWidth: 420, margin: '40px auto', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 8px', fontWeight: 800, color: '#0f172a', fontSize: 18 }}>هذه الصفحة غير متوفرة</h3>
                  <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>قد يكون الرابط غير صحيح أو أن الحساب بانتظار التفعيل.</p>
                  <button
                    onClick={() => { window.location.href = '/'; }}
                    style={{ ...primaryBtn, padding: '11px 20px' }}
                  >
                    الانتقال للصفحة الرئيسية
                  </button>
                </div>
              )}

              <div style={{ textAlign: 'center', marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => {
                    setIsUnlocked(false);
                    setView('dashboard');
                  }}
                  style={{ background: 'none', border: 'none', color: '#334155', fontSize: 12.5, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  دخول صاحب المشروع (لوحة التحكم)
                </button>
                <button
                  onClick={() => setView('register')}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  إنشاء صفحة حجز لمشروعك مجاناً
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ maxWidth: 480, margin: '0 auto 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    setIsUnlocked(false);
                    setView('booking');
                  }}
                  style={{ ...secondaryBtn, padding: '8px 14px', fontSize: 12.5 }}
                >
                  {slug ? 'العودة لصفحة الحجز' : 'العودة للرئيسية'}
                </button>
                {isUnlocked && (
                  <button
                    onClick={() => {
                      setIsUnlocked(false);
                      setLoginIdentifier('');
                      setPinInput('');
                    }}
                    style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    تسجيل الخروج
                  </button>
                )}
              </div>

              {!isUnlocked ? (
                <div style={{ maxWidth: 400, margin: '20px auto', background: '#ffffff', borderRadius: 20, overflow: 'hidden', textAlign: 'center', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)', border: '1px solid #e2e8f0' }}>
                  <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '24px 20px 18px' }}>
                    <span style={{ display: 'inline-block', background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                      بوابة أصحاب المشاريع
                    </span>
                    <h3 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 19, color: '#0f172a' }}>تسجيل الدخول</h3>
                    <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>أدخل البريد الإلكتروني أو الهاتف والرمز السري</p>
                  </div>
                  <form onSubmit={handleProviderLogin} style={{ padding: 20 }}>
                    <input
                      type="text"
                      placeholder="البريد الإلكتروني أو رقم الهاتف"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      style={{ width: '100%', padding: 12, fontSize: 13.5, textAlign: 'center', borderRadius: 10, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', marginBottom: 12, boxSizing: 'border-box', fontFamily: 'inherit' }}
                      required
                    />
                    <input
                      type="password"
                      placeholder="الرمز السري (PIN)"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      style={{ width: '100%', padding: 12, fontSize: 17, textAlign: 'center', letterSpacing: 6, borderRadius: 10, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', marginBottom: 16, boxSizing: 'border-box', fontFamily: 'inherit' }}
                      required
                    />
                    <button
                      type="submit"
                      disabled={loginLoading}
                      style={{ ...primaryBtn, width: '100%', padding: 13 }}
                    >
                      {loginLoading ? 'جاري التحقق...' : 'دخول إلى لوحة التحكم'}
                    </button>
                  </form>
                </div>
              ) : (
                <DashboardPage
                  provider={provider}
                  bookings={bookings}
                  services={services}
                  onRefresh={() => loadProviderDetails(provider)}
                />
              )}
            </>
          )}
        </div>
      )}

      <ChatBotWidget
        allProviders={allProviders}
        allServices={allServices}
        currentProvider={slug ? provider : null}
        currentServices={slug ? services : []}
        onBookingCreated={() => {
          if (provider) loadProviderDetails(provider);
        }}
      />
    </div>
  );
}

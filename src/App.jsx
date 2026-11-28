import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './theme.css';
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

  const appFont = { direction: 'rtl' };

  if (loading) {
    return (
      <div style={{ ...appFont, textAlign: 'center', marginTop: 100 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#ffffff', padding: '12px 22px', borderRadius: 999, boxShadow: '0 8px 24px rgba(79,70,229,0.12)', border: '1px solid #e0e7ff' }}>
          <span className="live-dot-wrap">
            <span className="live-dot-ring" />
            <span className="live-dot-core" />
          </span>
          <span style={{ color: '#4f46e5', fontWeight: 800, fontSize: 14 }}>جاري تحميل منصة عربون...</span>
        </div>
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
          <div style={{ padding: 14, maxWidth: 490, margin: '12px auto' }}>
            <div className="card-modern" style={{ overflow: 'hidden' }}>
              {/* ترويسة عصرية بتدرج النيلي الملكي */}
              <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 55%, #6366f1 100%)', color: '#ffffff', padding: '32px 22px 28px', textAlign: 'center' }}>
                <div style={{ position: 'absolute', top: -50, left: -50, width: 170, height: 170, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.16) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: -60, right: -40, width: 190, height: 190, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.22) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255, 255, 255, 0.14)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.25)', padding: '5px 14px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, marginBottom: 12 }}>
                  <span className="live-dot-wrap">
                    <span className="live-dot-ring" />
                    <span className="live-dot-core" />
                  </span>
                  <span>منصة الحجز الفوري وتأكيد المواعيد بالمغرب</span>
                </div>

                <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 900, letterSpacing: -0.3 }}>
                  عربون • 3arboon
                </h1>
                <p style={{ color: '#e0e7ff', fontSize: 13, lineHeight: 1.7, margin: '0 auto', maxWidth: 360 }}>
                  احجز موعدك بسهولة مع الصالونات والمشاريع المعتمدة، أو أنشئ صفحة حجز احترافية لمشروعك في دقيقة واحدة.
                </p>
              </div>

              <div style={{ padding: 20 }}>
                <button
                  type="button"
                  onClick={() => setView('register')}
                  className="btn-modern-primary"
                  style={{ width: '100%', marginBottom: 10, fontSize: 14.5 }}
                >
                  إنشاء صفحة حجز لمشروعك مجاناً
                </button>

                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUnlocked(false);
                      setView('dashboard');
                    }}
                    className="btn-modern-secondary"
                    style={{ flex: 1 }}
                  >
                    لوحة التحكم
                  </button>

                  <button
                    type="button"
                    onClick={() => setView('client')}
                    className="btn-modern-secondary"
                    style={{ flex: 1, color: '#4f46e5', borderColor: '#e0e7ff', background: '#f8faff' }}
                  >
                    تتبع حجوزاتي
                  </button>
                </div>
                {allProviders.length > 0 && (
                  <div style={{ background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 16, padding: 14, marginBottom: 20 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#312e81', marginBottom: 8 }}>
                      البحث عن مشروع أو خدمة
                    </div>
                    <form onSubmit={handleAiDirectorySearch} style={{ display: 'flex', gap: 8 }}>
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
                        className="input-modern"
                        style={{ flex: 2, padding: '10px 12px', background: '#ffffff' }}
                      />
                      <button
                        type="submit"
                        disabled={aiSearching}
                        className="btn-modern-primary"
                        style={{ padding: '0 18px', borderRadius: 12, fontSize: 13, whiteSpace: 'nowrap' }}
                      >
                        {aiSearching ? 'جاري...' : 'بحث'}
                      </button>
                    </form>

                    {aiSearchResult && (
                      <div style={{ marginTop: 10, background: '#ffffff', border: '1px solid #e0e7ff', borderRadius: 12, padding: 12, fontSize: 12.5, color: '#1e293b', lineHeight: 1.6 }}>
                        {aiSearchResult}
                        {matchedProviders.length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {matchedProviders.map((mp) => (
                              <a
                                key={mp.id}
                                href={'/?p=' + mp.slug}
                                className="btn-modern-secondary"
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', textDecoration: 'none', color: '#0f172a' }}
                              >
                                <span style={{ fontWeight: 800 }}>{mp.business_name}</span>
                                <span style={{ color: '#4f46e5', fontSize: 12, fontWeight: 800 }}>دخول للحجز ←</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {displayedProviders.length > 0 && (
                  <div style={{ marginBottom: 22 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: '#0f172a' }}>
                        المشاريع والصالونات المعتمدة ({displayedProviders.length})
                      </h3>
                      {aiSearchQuery.trim() && matchedProviders.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setAiSearchQuery('');
                            setAiSearchResult('');
                            setMatchedProviders([]);
                          }}
                          className="btn-modern-secondary"
                          style={{ padding: '5px 10px', fontSize: 11, borderRadius: 8 }}
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
                        <div key={p.id} className="card-modern card-modern-hover" style={{ padding: 16, marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {p.logo_url ? (
                                <img
                                  src={p.logo_url}
                                  alt={p.business_name}
                                  style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e0e7ff', background: '#ffffff' }}
                                />
                              ) : (
                                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>
                                  {firstLetter}
                                </div>
                              )}
                              <div>
                                <h4 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: '#0f172a' }}>{p.business_name}</h4>
                                {mapsUrl ? (
                                  <a
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      display: 'inline-block',
                                      marginTop: 4,
                                      fontSize: 11.5,
                                      fontWeight: 700,
                                      color: '#4f46e5',
                                      textDecoration: 'none'
                                    }}
                                  >
                                    الموقع على الخريطة ↗
                                  </a>
                                ) : (
                                  <span style={{ display: 'inline-block', marginTop: 3, fontSize: 11.5, color: '#64748b' }}>
                                    المغرب
                                  </span>
                                )}
                              </div>
                            </div>

                            <a
                              href={'/?p=' + p.slug}
                              className="btn-modern-accent"
                              style={{ textDecoration: 'none', padding: '10px 15px', fontSize: 12.5, whiteSpace: 'nowrap', flexShrink: 0 }}
                            >
                              احجز الآن
                            </a>
                          </div>

                          {p.bio && (
                            <p style={{ margin: '12px 0 0', fontSize: 12.5, color: '#475569', background: '#f8fafc', padding: '9px 12px', borderRadius: 11, border: '1px solid #f1f5f9', lineHeight: 1.6 }}>
                              {p.bio}
                            </p>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9', fontSize: 12 }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              التقييم: <span style={{ color: '#4f46e5' }}>{ratingObj.avg}</span>{' '}
                              <span style={{ color: '#64748b', fontWeight: 600 }}>
                                ({ratingObj.count > 0 ? ratingObj.count + ' تقييم' : 'جديد'})
                              </span>
                            </div>
                            <a href={'/?p=' + p.slug} style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>
                              عرض جميع الخدمات ↗
                            </a>
                          </div>

                          {pServices.length > 0 && (
                            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {pServices.slice(0, 2).map((s) => (
                                <div key={s.id} style={{ background: '#f8faff', padding: '8px 11px', borderRadius: 10, border: '1px solid #eef2ff', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{s.title}</span>
                                  <span style={{ color: '#059669', fontWeight: 700 }}>{s.total_price} درهم (عربون: {s.deposit_amount})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ background: '#f8faff', padding: 16, borderRadius: 16, border: '1px solid #e0e7ff', textAlign: 'right' }}>
                  <h4 style={{ margin: '0 0 10px', color: '#312e81', fontSize: 14.5, fontWeight: 800 }}>
                    آلية العمل على منصة عربون
                  </h4>
                  <div style={{ fontSize: 12.5, color: '#475569', display: 'flex', flexDirection: 'column', gap: 8, lineHeight: 1.6 }}>
                    <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 11, border: '1px solid #eef2ff' }}>
                      <strong style={{ color: '#4f46e5' }}>1. تسجيل المشروع:</strong> إضافة شعار المحل، رابط الموقع، وقائمة الخدمات.
                    </div>
                    <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 11, border: '1px solid #eef2ff' }}>
                      <strong style={{ color: '#4f46e5' }}>2. مشاركة الرابط:</strong> نشر رابط الحجز الخاص في منصات التواصل الاجتماعي.
                    </div>
                    <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 11, border: '1px solid #eef2ff' }}>
                      <strong style={{ color: '#4f46e5' }}>3. تأكيد المواعيد:</strong> استقبال حجوزات الزبائن والتحقق الفوري من وصولات العربون.
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
                <div className="card-modern" style={{ textAlign: 'center', padding: 28, maxWidth: 420, margin: '40px auto' }}>
                  <h3 style={{ margin: '0 0 8px', fontWeight: 800, color: '#0f172a', fontSize: 18 }}>هذه الصفحة غير متوفرة</h3>
                  <p style={{ color: '#64748b', fontSize: 13, marginBottom: 18 }}>قد يكون الرابط غير صحيح أو أن الحساب بانتظار التفعيل.</p>
                  <button
                    type="button"
                    onClick={() => { window.location.href = '/'; }}
                    className="btn-modern-primary"
                    style={{ padding: '11px 22px' }}
                  >
                    الانتقال للصفحة الرئيسية
                  </button>
                </div>
              )}

              <div style={{ textAlign: 'center', marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsUnlocked(false);
                    setView('dashboard');
                  }}
                  style={{ background: 'none', border: 'none', color: '#334155', fontSize: 12.5, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  دخول صاحب المشروع (لوحة التحكم)
                </button>
                <button
                  type="button"
                  onClick={() => setView('register')}
                  style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  إنشاء صفحة حجز لمشروعك مجاناً
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ maxWidth: 490, margin: '0 auto 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsUnlocked(false);
                    setView('booking');
                  }}
                  className="btn-modern-secondary"
                  style={{ padding: '8px 14px', fontSize: 12.5 }}
                >
                  {slug ? 'العودة لصفحة الحجز' : 'العودة للرئيسية'}
                </button>
                {isUnlocked && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUnlocked(false);
                      setLoginIdentifier('');
                      setPinInput('');
                    }}
                    className="btn-modern-secondary"
                    style={{ padding: '8px 14px', fontSize: 12.5, borderColor: '#fecaca', background: '#fef2f2', color: '#b91c1c' }}
                  >
                    تسجيل الخروج
                  </button>
                )}
              </div>

              {!isUnlocked ? (
                <div className="card-modern" style={{ maxWidth: 410, margin: '20px auto', overflow: 'hidden', textAlign: 'center' }}>
                  <div style={{ background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 100%)', color: '#ffffff', padding: '26px 20px 22px' }}>
                    <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.16)', color: '#e0e7ff', padding: '3px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                      بوابة أصحاب المشاريع
                    </span>
                    <h3 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 20 }}>تسجيل الدخول</h3>
                    <p style={{ fontSize: 12.5, color: '#e0e7ff', margin: 0 }}>أدخل البريد الإلكتروني أو الهاتف والرمز السري</p>
                  </div>
                  <form onSubmit={handleProviderLogin} style={{ padding: 22 }}>
                    <input
                      type="text"
                      placeholder="البريد الإلكتروني أو رقم الهاتف"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="input-modern"
                      style={{ textAlign: 'center', marginBottom: 12 }}
                      required
                    />
                    <input
                      type="password"
                      placeholder="الرمز السري (PIN)"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      className="input-modern"
                      style={{ fontSize: 18, textAlign: 'center', letterSpacing: 6, marginBottom: 16 }}
                      required
                    />
                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="btn-modern-primary"
                      style={{ width: '100%', padding: 13 }}
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

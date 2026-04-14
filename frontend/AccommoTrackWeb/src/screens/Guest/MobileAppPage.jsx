import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, Smartphone, Bell, MapPin, ShieldCheck,
  ArrowLeft, Settings, CheckCircle2, CreditCard, Wrench, BarChart, Moon,
  Search, LayoutGrid, CalendarDays, MessageCircle, Home, Building2
} from 'lucide-react';
import api from '../../utils/api';

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Counter({ target, suffix = '', duration = 1200 }) {
  const [val, setVal] = useState(0);
  const [ref, visible] = useInView();
  useEffect(() => {
    if (!visible) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, target, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

const FEATURES = [
  { icon: MapPin, title: 'Zamboanga Dorm Finder', desc: 'Discover boarding houses and apartments near WMSU, ADZU, and every major campus landmark — filtered by price, distance, and availability.' },
  { icon: MessageCircle, title: 'Real-Time Messaging', desc: 'Chat directly with landlords or caretakers. Ask questions about bookings or discuss circumstances instantly without leaving the app.' },
  { icon: Wrench, title: 'Direct Maintenance', desc: 'Submit repair requests and monitor progress in real-time. No more chasing your landlord through text.' },
  { icon: Bell, title: 'Real-time Alerts', desc: 'Push notifications the moment your landlord replies, an invoice drops, or a maintenance update posts.' },
  { icon: BarChart, title: 'Dual Experience', desc: 'Switch roles in one tap. Manage your stay as a Tenant or run your listings as a Landlord — same app, zero friction.' },
  { icon: Moon, title: 'Full Dark Mode', desc: 'A sleek OLED-optimized interface that looks stunning night or day. Adaptive, gorgeous, and battery-friendly.' },
];

const STEPS = [
  { n: 1, title: 'Download the APK file', body: 'Tap the button above and wait for the AccommoTrack.apk file to save to your device.' },
  { n: 2, title: 'Allow Unknown Sources', body: 'Go to Settings > Security and enable Install from unknown sources, or grant your browser permission when prompted.' },
  { n: 3, title: 'Install & log in', body: 'Open your downloads folder, tap the file, and hit Install. Once done, launch the app and sign in with your existing account.' },
];

const ROLE_OPTIONS = [
  { id: 'tenant', label: 'Tenant' },
  { id: 'landlord', label: 'Landlord' },
];

const PHONE_PREVIEW_CONTENT = {
  tenant: {
    cards: [
      { icon: MapPin, tag: 'Near WMSU', price: 'P3,500/mo', beds: '1 bed · Wi-Fi included' },
      { icon: MapPin, tag: 'Near ADZU', price: 'P4,200/mo', beds: '2 bed · With parking' },
    ],
    statLabel: 'Active tenants',
    statValue: '2,400+',
    activityTitle: 'Payment sent',
    activityMeta: 'P3,500 via GCash · just now',
    gradient: 'from-green-600 to-green-800',
    fabColor: 'bg-green-500',
  },
  landlord: {
    cards: [
      { icon: Building2, tag: 'Occupancy', price: '32 / 36 beds full', beds: '89% utilization this month' },
      { icon: CalendarDays, tag: 'Bookings', price: '7 pending requests', beds: '2 need document review' },
    ],
    statLabel: 'Collections (month)',
    statValue: 'P128k',
    activityTitle: 'New booking',
    activityMeta: 'Room 204 · 5 mins ago',
    gradient: 'from-emerald-500 to-green-900',
    fabColor: 'bg-emerald-500',
  },
};

const PHONE_PREVIEW_NAV = {
  tenant: {
    centerTab: { label: 'Explore', icon: Search },
    sideTabs: [
      { label: 'Dashboard', icon: LayoutGrid },
      { label: 'Bookings', icon: CalendarDays },
      { label: 'Messages', icon: MessageCircle, badge: '3' },
      { label: 'Settings', icon: Settings },
    ],
  },
  landlord: {
    centerTab: { label: 'Bookings', icon: CalendarDays },
    sideTabs: [
      { label: 'Home', icon: Home },
      { label: 'Properties', icon: Building2 },
      { label: 'Messages', icon: MessageCircle, badge: '2' },
      { label: 'Settings', icon: Settings },
    ],
  },
};

const MobileAppPage = () => {
  const navigate = useNavigate();
  const [downloadUrl, setDownloadUrl] = useState('https://accommotrack.me/downloads/AccommoTrack.apk');
  const [version, setVersion] = useState('1.0.0');
  const [loading, setLoading] = useState(true);
  const [heroReady, setHeroReady] = useState(false);
  const [previewRole, setPreviewRole] = useState('tenant');

  const [featRef, featVisible] = useInView();
  const [statsRef, statsVisible] = useInView();
  const [stepsRef, stepsVisible] = useInView();

  const preview = PHONE_PREVIEW_CONTENT[previewRole];
  const phoneNav = PHONE_PREVIEW_NAV[previewRole];
  const leftTabs = phoneNav.sideTabs.slice(0, 2);
  const rightTabs = phoneNav.sideTabs.slice(2);
  const CenterIcon = phoneNav.centerTab.icon;

  useEffect(() => {
    window.scrollTo(0, 0);
    const t = setTimeout(() => setHeroReady(true), 80);
    const fetchSettings = async () => {
      try {
        const response = await api.get('/system/toggles');
        if (response.data?.success) {
          setDownloadUrl(response.data.data.mobile_download_url);
          setVersion(response.data.data.mobile_latest_version);
        }
      } catch (err) {
        console.error('Failed to fetch mobile app version', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8faf8] dark:bg-[#0b0f0b] font-sans selection:bg-green-200 selection:text-green-900 overflow-x-hidden">

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,400&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Fraunces', Georgia, serif; }

        @keyframes fadeUp  { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes floatY  { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-12px) } }
        @keyframes shimmer { from { background-position:-200% center } to { background-position:200% center } }
        @keyframes ping    { 0% { transform:scale(1); opacity:.85 } 70%,100% { transform:scale(1.9); opacity:0 } }
        @keyframes gradMove { 0%,100% { background-position:0% 50% } 50% { background-position:100% 50% } }

        .anim-fade-up { animation: fadeUp  .65s cubic-bezier(.22,1,.36,1) both; }
        .anim-fade-in { animation: fadeIn  .5s ease both; }
        .anim-float   { animation: floatY  5s ease-in-out infinite; }
        .anim-ping    { animation: ping    2s cubic-bezier(0,0,.2,1) infinite; }
        .anim-grad    { background-size:200% 200%; animation: gradMove 5s ease infinite; }

        .glass {
          background: rgba(255,255,255,.72);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .dark .glass { background: rgba(15,22,15,.65); }

        .btn-download {
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, #16a34a, #15803d);
          transition: transform .2s, box-shadow .2s;
        }
        .btn-download::after {
          content:''; position:absolute; inset:0;
          background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,.18) 50%, transparent 70%);
          background-size:200% 100%;
          animation: shimmer 2.6s ease infinite;
        }
        .btn-download:hover { transform:translateY(-2px); box-shadow:0 12px 28px rgba(22,163,74,.35); }
        .btn-download:active { transform:translateY(0); }

        .feat-card { transition: transform .25s, box-shadow .25s, border-color .25s; }
        .feat-card:hover { transform:translateY(-6px); box-shadow:0 16px 32px rgba(0,0,0,.08); border-color:rgba(22,163,74,.35) !important; }
        .dark .feat-card:hover { box-shadow:0 16px 32px rgba(0,0,0,.35); }
      `}</style>

      {/* Full Screen Fold: Hero Only */}
      <section className="min-h-screen flex flex-col w-full relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 right-0 h-full overflow-hidden pointer-events-none -z-0">
          <div className="absolute top-[-10%] origin-center -left-40 w-[600px] h-[600px] rounded-full opacity-30 dark:opacity-20 anim-grad"
            style={{ background: 'radial-gradient(ellipse, #bbf7d0, #4ade80, transparent 70%)' }} />
          <div className="absolute top-[10%] right-0 w-[400px] h-[400px] rounded-full opacity-20 dark:opacity-10 anim-grad"
            style={{ background: 'radial-gradient(ellipse, #86efac, #16a34a, transparent 70%)', animationDelay: '-2s' }} />
        </div>

        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center py-4 pb-6 relative z-10 w-[80%] mx-auto">
          <div className="w-full flex-none mb-6 anim-fade-in" style={{ animationDelay: heroReady ? '40ms' : '9999s' }}>
            <button onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors px-3 py-2 rounded-xl border border-gray-200/70 dark:border-gray-700/80 bg-white/70 dark:bg-gray-900/50 backdrop-blur">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 w-full flex-1 items-center min-h-0">

            {/* Left copy: Column 1 */}
            <div className="w-full flex flex-col justify-center text-center lg:text-left">
              <div className="inline-flex self-center lg:self-start items-center gap-2 px-3 py-1.5 rounded-full border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-semibold mb-4 anim-fade-up"
                style={{ animationDelay: heroReady ? '0ms' : '9999s' }}>
                <span className="relative flex h-2 w-2">
                  <span className="anim-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Available for Android · {loading ? 'Checking build...' : `v${version}`}
              </div>

              <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-bold text-gray-900 dark:text-white leading-[1.08] mb-4 anim-fade-up"
                style={{ animationDelay: '80ms' }}>
                Find your next<br />
                <span className="italic font-display text-green-600">dorm</span>{' '}
                <span className="italic font-normal font-display text-gray-400 dark:text-gray-500">from</span><br className="hidden lg:block" />
                {' '}your pocket.
              </h1>

              <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto lg:mx-0 leading-relaxed anim-fade-up"
                style={{ animationDelay: '160ms' }}>
                Browse properties near WMSU, ADZU, and other Zamboanga City campuses on the go.
                Integrated payments, direct chat, and real-time tracking — all in one place.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start anim-fade-up"
                style={{ animationDelay: '240ms' }}>
                <button onClick={() => { window.location.href = downloadUrl; }}
                  className="btn-download w-full sm:w-auto flex items-center justify-center gap-3 text-white px-8 py-4 rounded-2xl font-semibold text-base">
                  <Download className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Download APK · 90+ MB</span>
                </button>
                <div className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-green-500" /> Scanned &amp; safe
                </div>
              </div>

              <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mt-4 anim-fade-up" style={{ animationDelay: '300ms' }}>
                Interactive preview: switch between Tenant and Landlord inside the phone mockup.
              </p>
            </div>

            {/* Right: Column 2 (phone with badges) */}
            <div className="w-full flex justify-center lg:justify-end items-center anim-fade-up min-h-0" style={{ animationDelay: '300ms' }}>
              <div className="anim-float relative scale-[0.65] sm:scale-75 md:scale-90 lg:scale-[0.85] xl:scale-100 origin-center lg:origin-right" style={{ padding: '56px 144px 16px 160px', marginTop: '-56px', marginBottom: '-56px' }}>

                {/* glow behind phone */}
                <div className="absolute inset-0 rounded-[44px] blur-2xl opacity-25 dark:opacity-15 pointer-events-none"
                  style={{ background: 'radial-gradient(circle, #4ade80, #16a34a)' }} />

                {/* phone shell */}
                <div className="relative w-[270px] h-[560px] bg-gray-950 rounded-[44px] border-[7px] border-gray-800 shadow-[0_40px_80px_rgba(0,0,0,.35)] overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-gray-950 rounded-b-2xl z-20" />

                  <div className="w-full h-full bg-gray-900 flex flex-col">
                    {/* status bar */}
                    <div className="h-6 flex items-center justify-between px-6 text-[9px] text-gray-400 mt-5">
                      <span>9:41</span><span>● ● ●</span>
                    </div>

                    {/* role switcher */}
                    <div className="mx-4 mt-2 grid grid-cols-2 gap-1 rounded-xl border border-gray-700 bg-gray-800/90 p-1">
                      {ROLE_OPTIONS.map((role) => (
                        <button key={role.id} type="button" onClick={() => setPreviewRole(role.id)}
                          className={`rounded-lg px-2 py-1.5 text-[9px] font-semibold transition-all ${previewRole === role.id
                            ? 'bg-green-500 text-white shadow-[0_8px_18px_rgba(34,197,94,.35)]'
                            : 'text-gray-400 hover:text-gray-200'
                            }`}>
                          {role.label}
                        </button>
                      ))}
                    </div>

                    {/* app header */}
                    <div className={`mx-4 mt-2 rounded-2xl overflow-hidden bg-gradient-to-br p-4 ${preview.gradient}`}>
                      <div className="h-2.5 w-24 rounded-full bg-white/35" />
                      <div className="mt-2 h-2 w-36 rounded-full bg-white/20" />
                      <div className="mt-3 h-7 bg-white/20 rounded-xl" />
                    </div>

                    {/* listing cards */}
                    {preview.cards.map((c, i) => {
                      const CardIcon = c.icon;
                      return (
                        <div key={i} className="mx-4 mt-3 rounded-xl bg-gray-800 border border-gray-700 p-3 flex gap-3">
                          <div className="w-14 h-14 rounded-lg bg-green-900/50 flex-shrink-0 flex items-center justify-center">
                            <CardIcon className="w-5 h-5 text-green-400" />
                          </div>
                          <div>
                            <p className="text-[10px] text-green-400 font-medium">{c.tag}</p>
                            <p className="text-white text-xs font-semibold mt-0.5">{c.price}</p>
                            <p className="text-[9px] text-gray-400 mt-0.5">{c.beds}</p>
                          </div>
                        </div>
                      );
                    })}

                    {/* bottom nav */}
                    <div className="relative mt-auto mx-4 mb-4 pt-4">
                      <div className="h-12 bg-gray-800 border border-gray-700 rounded-2xl grid grid-cols-5 px-1">
                        {leftTabs.map((tab) => {
                          const TabIcon = tab.icon;
                          return (
                            <div key={tab.label} className="relative flex items-center justify-center">
                              <TabIcon className="w-3.5 h-3.5 text-gray-500" />
                              {tab.badge && (
                                <span className="absolute top-0.5 right-2 rounded-full bg-red-500 px-1 py-[1px] text-[7px] font-bold leading-none text-white">
                                  {tab.badge}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        <div />
                        {rightTabs.map((tab) => {
                          const TabIcon = tab.icon;
                          return (
                            <div key={tab.label} className="relative flex items-center justify-center">
                              <TabIcon className="w-3.5 h-3.5 text-gray-500" />
                              {tab.badge && (
                                <span className="absolute top-0.5 right-2 rounded-full bg-red-500 px-1 py-[1px] text-[7px] font-bold leading-none text-white">
                                  {tab.badge}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {/* FAB */}
                      <div className="absolute left-1/2 top-0 -translate-x-1/2 flex flex-col items-center">
                        <div className={`w-12 h-12 rounded-full border-4 border-gray-900 shadow-xl flex items-center justify-center ${preview.fabColor}`}>
                          <CenterIcon className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* end phone shell */}

                {/*
                BADGE POSITIONING
                Both badges sit in the padding lanes outside the phone frame.

                Stat badge   → top-right lane  (top: 0, right: 0)
                Activity badge → left lane, vertically centred
              */}

                {/* Stat badge — lowered to align around the skeleton header level */}
                <div className="absolute right-0 glass border border-white/25 dark:border-white/10 rounded-2xl px-3 py-2 shadow-lg whitespace-nowrap"
                  style={{ top: 156 }}>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{preview.statLabel}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{preview.statValue}</p>
                </div>

                {/* Activity badge — lowered to align near the bottom navigation level */}
                <div className="absolute left-0 glass border border-white/25 dark:border-white/10 rounded-2xl px-3 py-2 shadow-lg whitespace-nowrap"
                  style={{ top: 486 }}>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <p className="text-[10px] font-medium text-gray-800 dark:text-gray-200">{preview.activityTitle}</p>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-0.5">{preview.activityMeta}</p>
                </div>

              </div>
            </div>

          </div>
        </section>

      </section>

      {/* Stats strip - Moved below the initial fold */}
      <div ref={statsRef} className="py-14 border-y border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { n: 2400, suffix: '+', label: 'Active tenants' },
            { n: 380, suffix: '+', label: 'Listed properties' },
            { n: 98, suffix: '%', label: 'Satisfaction rate' },
            { n: 4, suffix: ' campuses', label: 'Covered in Zamboanga' },
          ].map((s, i) => (
            <div key={i} className={`transition-all duration-700 ${statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 100}ms` }}>
              <p className="text-3xl md:text-4xl font-bold text-green-600">
                {statsVisible ? <Counter target={s.n} suffix={s.suffix} duration={1200} /> : `0${s.suffix}`}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section ref={featRef} className="py-24 px-6 max-w-7xl mx-auto">
        <div className={`text-center mb-16 transition-all duration-700 ${featVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything in <span className="text-green-600 italic">one app</span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
            AccommoTrack is a dual-mode platform for students finding homes and landlords managing properties across Zamboanga City.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div key={i} className="feat-card p-7 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
              style={{
                opacity: featVisible ? 1 : 0,
                transform: featVisible ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity .7s ease ${i * 80}ms, transform .7s cubic-bezier(.22,1,.36,1) ${i * 80}ms`,
              }}>
              <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-5 text-green-600">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-base">{f.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Install guide */}
      <section ref={stepsRef} className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className={`text-center mb-14 transition-all duration-700 ${stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">Installing the APK</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Three easy steps and you're in.</p>
          </div>
          <div className="space-y-5">
            {STEPS.map((s, i) => (
              <div key={i} className="relative flex gap-5 p-7 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
                style={{
                  opacity: stepsVisible ? 1 : 0,
                  transform: stepsVisible ? 'translateX(0)' : 'translateX(-24px)',
                  transition: `opacity .7s ease ${i * 120}ms, transform .7s cubic-bezier(.22,1,.36,1) ${i * 120}ms`,
                }}>
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-2xl bg-green-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-green-600/25">
                    {s.n}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-px h-8 bg-gradient-to-b from-green-400 to-transparent" />
                  )}
                </div>
                <div className="pt-1.5">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1.5 text-base">{s.title}</h4>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 flex gap-4"
            style={{
              opacity: stepsVisible ? 1 : 0,
              transform: stepsVisible ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity .7s ease 360ms, transform .7s cubic-bezier(.22,1,.36,1) 360ms',
            }}>
            <div className="text-amber-500 font-bold text-lg leading-none pt-0.5">!</div>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Since this app is distributed as an APK outside the Google Play Store, your device may show a "Play Protect" warning.
              This is normal for student-led projects — tap <strong className="font-semibold">"Google Scan Protect and then Install"</strong> to proceed safely.
            </p>
          </div>
        </div>
      </section>

      {/* CTA footer */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-xs font-semibold mb-6">
            <Smartphone className="w-3.5 h-3.5" /> Android · Free forever
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Ready to find your perfect dorm?
          </h2>
          <button onClick={() => { window.location.href = downloadUrl; }}
            className="btn-download inline-flex items-center gap-3 text-white px-10 py-4 rounded-2xl font-semibold text-base">
            <Download className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Download AccommoTrack · v{version}</span>
          </button>
        </div>
      </section>

    </div>
  );
};

export default MobileAppPage;
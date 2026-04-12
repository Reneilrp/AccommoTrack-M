import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, Smartphone, Bell, MapPin, ShieldCheck,
  ArrowLeft, Settings, CheckCircle2, CreditCard, Wrench, BarChart, Moon
} from 'lucide-react';
import api from '../../utils/api';

/* ─── tiny hook: fires once when element enters viewport ─── */
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

/* ─── animated counter ─── */
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
  { icon: MapPin,    title: 'Zamboanga Dorm Finder',  desc: 'Discover boarding houses and apartments near WMSU, ADZU, and every major campus landmark — filtered by price, distance, and availability.' },
  { icon: CreditCard, title: 'Pay via GCash & Maya',  desc: 'Settle monthly rent securely through our PayMongo integration. Every transaction is timestamped, tracked, and receipt-ready.' },
  { icon: Wrench,    title: 'Direct Maintenance',      desc: 'Submit repair requests and monitor progress in real-time. No more chasing your landlord through text.' },
  { icon: Bell,      title: 'Real-time Alerts',        desc: 'Push notifications the moment your landlord replies, an invoice drops, or a maintenance update posts.' },
  { icon: BarChart,  title: 'Dual Experience',         desc: 'Switch roles in one tap. Manage your stay as a Tenant or run your listings as a Landlord — same app, zero friction.' },
  { icon: Moon,      title: 'Full Dark Mode',          desc: 'A sleek OLED-optimized interface that looks stunning night or day. Adaptive, gorgeous, and battery-friendly.' },
];

const STEPS = [
  { n: 1, title: 'Download the APK file',    body: <>Tap the button above and wait for the <code className="font-mono bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded text-xs">AccommoTrack.apk</code> to save to your device.</> },
  { n: 2, title: 'Allow Unknown Sources',     body: <>Go to <span className="font-semibold text-gray-800 dark:text-gray-200">Settings › Security</span> and enable "Install from unknown sources," or grant your browser permission when prompted.</> },
  { n: 3, title: 'Install & log in',          body: 'Open your downloads folder, tap the file, and hit Install. Once done, launch the app and sign in with your existing account.' },
];

/* ────────────────────────────────────────────────────────── */

const MobileAppPage = () => {
  const navigate = useNavigate();
  const [downloadUrl, setDownloadUrl] = useState('https://accommotrack.me/downloads/AccommoTrack.apk');
  const [version, setVersion]         = useState('1.0.0');
  const [loading, setLoading]         = useState(true);
  const [heroReady, setHeroReady]     = useState(false);

  const [featRef, featVisible]   = useInView();
  const [statsRef, statsVisible] = useInView();
  const [stepsRef, stepsVisible] = useInView();

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

      {/* ── Global keyframes injected once ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,400&display=swap');

        * { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Fraunces', Georgia, serif; }

        @keyframes fadeUp   { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn   { from { opacity:0 }                             to { opacity:1 } }
        @keyframes floatY   { 0%,100% { transform:translateY(0) }  50% { transform:translateY(-12px) } }
        @keyframes spin3d   { from { transform: rotateY(0deg) }    to   { transform: rotateY(360deg) } }
        @keyframes shimmer  { from { background-position: -200% center } to { background-position: 200% center } }
        @keyframes ping     { 0%   { transform:scale(1);   opacity:.85 }
                              70%  { transform:scale(1.9); opacity:0   }
                              100% { transform:scale(1.9); opacity:0   } }
        @keyframes gradMove { 0%,100% { background-position:0% 50% }  50% { background-position:100% 50% } }

        .anim-fade-up   { animation: fadeUp  .65s cubic-bezier(.22,1,.36,1) both; }
        .anim-fade-in   { animation: fadeIn  .5s ease both; }
        .anim-float     { animation: floatY  5s ease-in-out infinite; }
        .anim-ping      { animation: ping    2s cubic-bezier(0,0,.2,1) infinite; }
        .anim-grad      { background-size:200% 200%; animation: gradMove 5s ease infinite; }

        .glass {
          background: rgba(255,255,255,.65);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .dark .glass {
          background: rgba(15,22,15,.6);
        }

        .btn-download {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #16a34a, #15803d);
        }
        .btn-download::after {
          content:'';
          position:absolute;
          inset:0;
          background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,.18) 50%, transparent 70%);
          background-size:200% 100%;
          animation: shimmer 2.6s ease infinite;
        }
        .btn-download:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(22,163,74,.35); }
        .btn-download:active { transform: translateY(0); }
        .btn-download { transition: transform .2s, box-shadow .2s; }

        .feat-card { transition: transform .25s, box-shadow .25s, border-color .25s; }
        .feat-card:hover { transform: translateY(-6px); box-shadow: 0 16px 32px rgba(0,0,0,.08); border-color: rgba(22,163,74,.35) !important; }
        .dark .feat-card:hover { box-shadow: 0 16px 32px rgba(0,0,0,.35); }

        .step-line::after {
          content:'';
          position:absolute;
          left:50%; top:100%;
          transform:translateX(-50%);
          width:2px; height:48px;
          background: linear-gradient(to bottom, #16a34a, transparent);
        }
      `}</style>

      {/* ── Nav ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/30 dark:border-white/10"
        style={{ animation: heroReady ? 'fadeIn .4s ease both' : 'none' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-24 px-6">
        {/* mesh blob background */}
        <div className="absolute top-0 left-0 right-0 h-[700px] overflow-hidden pointer-events-none -z-0">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-30 dark:opacity-20 anim-grad"
            style={{ background:'radial-gradient(ellipse, #bbf7d0, #4ade80, transparent 70%)' }} />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] rounded-full opacity-20 dark:opacity-10 anim-grad"
            style={{ background:'radial-gradient(ellipse, #86efac, #16a34a, transparent 70%)', animationDelay:'-2s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

          {/* Left copy */}
          <div className="flex-1 text-center lg:text-left">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-semibold mb-6 anim-fade-up"
              style={{ animationDelay: heroReady ? '0ms' : '9999s' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="anim-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Available for Android · v{version}
            </div>

            <h1
              className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-[1.08] mb-6 anim-fade-up"
              style={{ animationDelay: '80ms' }}
            >
              Find your next<br />
              <span className="italic font-display text-green-600">dorm</span>{' '}
              <span className="italic font-normal font-display text-gray-400 dark:text-gray-500">from</span><br />
              your pocket.
            </h1>

            <p
              className="text-base text-gray-500 dark:text-gray-400 mb-10 max-w-md mx-auto lg:mx-0 leading-relaxed anim-fade-up"
              style={{ animationDelay: '160ms' }}
            >
              Browse properties near WMSU, ADZU, and other Zamboanga City campuses on the go.
              Integrated payments, direct chat, and real-time maintenance tracking — all in one place.
            </p>

            <div
              className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start anim-fade-up"
              style={{ animationDelay: '240ms' }}
            >
              <button
                onClick={() => { window.location.href = downloadUrl; }}
                className="btn-download w-full sm:w-auto flex items-center justify-center gap-3 text-white px-8 py-4 rounded-2xl font-semibold text-base"
              >
                <Download className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Download APK · 94 MB</span>
              </button>
              <div className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-green-500" /> Scanned & safe
              </div>
            </div>
          </div>

          {/* Right phone mockup */}
          <div className="flex-1 flex justify-center anim-fade-up" style={{ animationDelay: '300ms' }}>
            <div className="anim-float relative">
              {/* glow ring */}
              <div className="absolute inset-0 rounded-[44px] blur-2xl opacity-30 dark:opacity-20"
                style={{ background:'radial-gradient(circle, #4ade80, #16a34a)' }} />

              {/* phone shell */}
              <div className="relative w-[270px] h-[560px] bg-gray-950 rounded-[44px] border-[7px] border-gray-800 shadow-[0_40px_80px_rgba(0,0,0,.35)] overflow-hidden">
                {/* notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-gray-950 rounded-b-2xl z-20" />

                {/* screen */}
                <div className="w-full h-full bg-gray-900 flex flex-col">
                  {/* status bar */}
                  <div className="h-6 flex items-center justify-between px-6 text-[9px] text-gray-400 mt-5">
                    <span>9:41</span><span>●●●</span>
                  </div>

                  {/* app header */}
                  <div className="mx-4 mt-2 rounded-2xl overflow-hidden bg-gradient-to-br from-green-600 to-green-800 p-4">
                    <p className="text-[9px] text-green-200 mb-1">Good morning 👋</p>
                    <p className="text-white text-sm font-semibold">Find your dorm</p>
                    <div className="mt-3 h-7 bg-white/20 rounded-xl" />
                  </div>

                  {/* cards */}
                  {[
                    { tag: 'Near WMSU', price: '₱3,500/mo', beds: '1 bed · Wi-Fi included' },
                    { tag: 'Near ADZU', price: '₱4,200/mo', beds: '2 bed · With parking' },
                  ].map((c, i) => (
                    <div key={i} className="mx-4 mt-3 rounded-xl bg-gray-800 border border-gray-700 p-3 flex gap-3">
                      <div className="w-14 h-14 rounded-lg bg-green-900/50 flex-shrink-0 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-green-400 font-medium">{c.tag}</p>
                        <p className="text-white text-xs font-semibold mt-0.5">{c.price}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">{c.beds}</p>
                      </div>
                    </div>
                  ))}

                  {/* bottom nav */}
                  <div className="mt-auto mx-4 mb-4 h-10 bg-gray-800 rounded-2xl flex items-center justify-around px-4">
                    {[MapPin, Bell, CreditCard, Settings].map((Icon, i) => (
                      <Icon key={i} className={`w-4 h-4 ${i === 0 ? 'text-green-400' : 'text-gray-500'}`} />
                    ))}
                  </div>
                </div>
              </div>

              {/* floating badges */}
              <div className="absolute -right-8 top-16 glass border border-white/20 dark:border-white/10 rounded-2xl px-3 py-2 shadow-lg">
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Active tenants</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">2,400+</p>
              </div>
              <div className="absolute -left-10 bottom-28 glass border border-white/20 dark:border-white/10 rounded-2xl px-3 py-2 shadow-lg">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <p className="text-[10px] font-medium text-gray-800 dark:text-gray-200">Payment sent</p>
                </div>
                <p className="text-[9px] text-gray-400 mt-0.5">₱3,500 via GCash · just now</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div
        ref={statsRef}
        className="py-14 border-y border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
      >
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { n: 2400, suffix: '+', label: 'Active tenants' },
            { n: 380,  suffix: '+', label: 'Listed properties' },
            { n: 98,   suffix: '%', label: 'Satisfaction rate' },
            { n: 4,    suffix: ' campuses', label: 'Covered in Zamboanga' },
          ].map((s, i) => (
            <div key={i} className={`transition-all duration-700 ${statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 100}ms` }}>
              <p className="text-3xl md:text-4xl font-bold text-green-600">
                {statsVisible ? <Counter target={s.n} suffix={s.suffix} /> : `0${s.suffix}`}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
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
            <div
              key={i}
              className={`feat-card p-7 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 transition-all duration-700`}
              style={{ transitionDelay: `${i * 80}ms`, opacity: featVisible ? 1 : 0, transform: featVisible ? 'translateY(0)' : 'translateY(24px)' }}
            >
              <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-5 text-green-600">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-base">{f.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Install guide ── */}
      <section ref={stepsRef} className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className={`text-center mb-14 transition-all duration-700 ${stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Installing the APK
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Three easy steps and you're in.</p>
          </div>

          <div className="space-y-5">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={`relative flex gap-5 p-7 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 transition-all duration-700`}
                style={{ transitionDelay: `${i * 120}ms`, opacity: stepsVisible ? 1 : 0, transform: stepsVisible ? 'translateX(0)' : 'translateX(-24px)' }}
              >
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

          {/* Warning card */}
          <div className={`mt-8 p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 flex gap-4 transition-all duration-700`}
            style={{ transitionDelay: '360ms', opacity: stepsVisible ? 1 : 0, transform: stepsVisible ? 'translateY(0)' : 'translateY(12px)' }}>
            <div className="text-amber-500 font-bold text-lg leading-none pt-0.5">!</div>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Since this app is distributed as an APK outside the Google Play Store, your device may show a "Play Protect" warning.
              This is normal for student-led projects — tap <strong className="font-semibold">"Install anyway"</strong> to proceed safely.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA footer band ── */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-xs font-semibold mb-6">
            <Smartphone className="w-3.5 h-3.5" /> Android · Free forever
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Ready to find your perfect dorm?
          </h2>
          <button
            onClick={() => { window.location.href = downloadUrl; }}
            className="btn-download inline-flex items-center gap-3 text-white px-10 py-4 rounded-2xl font-semibold text-base"
          >
            <Download className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Download AccommoTrack · v{version}</span>
          </button>
        </div>
      </section>

    </div>
  );
};

export default MobileAppPage;
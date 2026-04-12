import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Smartphone, Bell, MapPin, ShieldCheck, ArrowLeft, Settings, CheckCircle2 } from 'lucide-react';

const MobileAppPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleDownload = () => {
    const backendUrl = "https://accommotrack.me/downloads/AccommoTrack.apk";
    window.location.href = backendUrl;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans theme-transition selection:bg-green-200 selection:text-green-900">
      
      {/* Simple Nav Header */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 absolute top-0 left-0 right-0 z-10">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 font-semibold transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Home
        </button>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
        <div className="flex-1 text-center lg:text-left z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-bold mb-6">
            <Smartphone className="w-4 h-4" /> Available for Android
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
            Find your next dorm <br className="hidden lg:block"/>
            <span className="text-green-600">right from your pocket.</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto lg:mx-0">
            Browse properties near WMSU, ADZU, and other campuses on the go. Chat with landlords, save your favorite spots, and get real-time notifications with the AccommoTrack mobile app.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <button 
              onClick={handleDownload}
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:bg-green-700 hover:-translate-y-1 transition-all duration-300"
            >
              <Download className="w-5 h-5" />
              Download APK Version
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Version 1.0.0 • 24 MB
            </p>
          </div>
        </div>

        {/* Mockup / Visual */}
        <div className="flex-1 relative w-full max-w-sm lg:max-w-md flex justify-center">
          {/* Decorative Blobs */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-green-400/20 dark:bg-green-500/10 rounded-full blur-3xl z-0"></div>
          
          {/* Phone Frame Mockup */}
          <div className="relative z-10 w-[280px] h-[580px] bg-gray-900 dark:bg-black rounded-[40px] border-[8px] border-gray-800 dark:border-gray-700 shadow-2xl overflow-hidden">
            {/* Top Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 dark:bg-gray-700 rounded-b-3xl z-20"></div>
            
            {/* App Screen Placeholder - Replace src with an actual screenshot of your app later */}
            <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex flex-col relative">
                <div className="bg-green-600 w-full h-48 absolute top-0 rounded-b-3xl"></div>
                <div className="relative z-10 px-4 pt-16 h-full flex flex-col gap-4">
                  <div className="w-full h-10 bg-white/20 backdrop-blur-md rounded-full mb-4"></div>
                  <div className="w-full h-40 bg-white dark:bg-gray-700 rounded-2xl shadow-sm"></div>
                  <div className="w-full h-40 bg-white dark:bg-gray-700 rounded-2xl shadow-sm"></div>
                  <div className="w-full h-40 bg-white dark:bg-gray-700 rounded-2xl shadow-sm"></div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Everything you need, in one app</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: MapPin, title: "Location Based", desc: "Easily find boarding houses and dorms closest to your specific campus building." },
              { icon: Bell, title: "Instant Alerts", desc: "Get push notifications the moment a landlord replies to your inquiry." },
              { icon: ShieldCheck, title: "Verified Listings", desc: "Browse with peace of mind knowing all properties are vetted for student safety." }
            ].map((feat, i) => (
              <div key={i} className="p-8 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center flex flex-col items-center">
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-6 text-green-600">
                  <feat.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{feat.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Installation Guide (Crucial for APKs) */}
      <section className="py-24 px-6 max-w-4xl mx-auto">
        <div className="bg-gray-100 dark:bg-gray-800/50 rounded-[32px] p-8 md:p-12 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            How to install the AccommoTrack APK
          </h2>
          
          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold flex-shrink-0 mt-1">1</div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Download the file</h4>
                <p className="text-gray-600 dark:text-gray-400">Tap the download button above and wait for the <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">.apk</code> file to save to your device.</p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold flex-shrink-0 mt-1">2</div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Allow Unknown Apps</h4>
                <p className="text-gray-600 dark:text-gray-400">Go to your Android <span className="font-semibold text-gray-800 dark:text-gray-200"><Settings className="inline w-4 h-4 mr-1"/>Settings &gt; Security</span> and enable "Install from unknown sources" or grant your browser permission to install apps.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold flex-shrink-0 mt-1">3</div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Install and Launch</h4>
                <p className="text-gray-600 dark:text-gray-400">Open your downloads folder, tap the AccommoTrack file, and hit Install. You're ready to go!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default MobileAppPage;
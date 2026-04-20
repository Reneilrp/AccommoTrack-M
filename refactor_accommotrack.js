const fs = require('fs');

const homePageFile = 'frontend/AccommoTrackWeb/src/screens/Guest/HomePage.jsx';
const mobileAppFile = 'frontend/AccommoTrackWeb/src/screens/Guest/MobileAppPage.jsx';

let home = fs.readFileSync(homePageFile, 'utf8');

home = home.replace('student-friendly dorms', 'reliable dorms');

const logos = `        {/* University Logos */}
        <div className="w-full pb-10 md:pb-12 flex-none">
          <p className="text-center text-[10px] md:text-xs font-bold uppercase mb-6 text-gray-500 dark:text-gray-500">Built for students from</p>
          <div className="flex justify-center gap-6 md:gap-16 flex-wrap">
            <span className="text-lg md:text-xl font-bold text-[#DC143C] dark:text-red-400">WMSU</span>
            <span className="text-lg md:text-xl font-bold text-sky-500 dark:text-sky-400">ADZU</span>
            <span className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400">UZ</span>
            <span className="text-lg md:text-xl font-bold text-[#800000] dark:text-red-500">ZPPSU</span>
          </div>
        </div>`;

home = home.replace(logos, '');
home = home.replace('place to stay while you focus on your studies.', 'place to stay.');
home = home.replace('Near Campus', 'Prime Locations');
home = home.replace('Filter properties by distance to WMSU, Ateneo, and other major universities', 'Filter properties by distance to key landmarks and offices');

fs.writeFileSync(homePageFile, home);

let mobile = fs.readFileSync(mobileAppFile, 'utf8');

mobile = mobile.replace("title: 'Zamboanga Dorm Finder'", "title: 'Zamboanga Property Finder'");
mobile = mobile.replace(
  "desc: 'Discover boarding houses and apartments near WMSU, ADZU, and every major campus landmark — filtered by price, distance, and availability.'",
  "desc: 'Discover boarding houses and apartments near major city landmarks — filtered by price, distance, and availability.'"
);
mobile = mobile.replace(
  "Browse properties near WMSU, ADZU, and other Zamboanga City campuses on the go.",
  "Browse properties across Zamboanga City on the go."
);

const oldStats = `          {[
            { n: 2400, suffix: '+', label: 'Active tenants' },
            { n: 380, suffix: '+', label: 'Listed properties' },
            { n: 98, suffix: '%', label: 'Satisfaction rate' },
            { n: 4, suffix: ' campuses', label: 'Covered in Zamboanga' },
          ]`;
const newStats = `          {[
            { n: "Growing", label: 'Community of Tenants' },
            { n: "Exclusive", label: 'Verified Properties' },
            { n: "100%", label: 'Focus on Security' },
            { n: "Prime", label: 'Locations in Zamboanga' },
          ]`;

mobile = mobile.replace(oldStats, newStats);

const oldCounter = '{statsVisible ? <Counter target={s.n} suffix={s.suffix} duration={1200} /> : `0${s.suffix}`}';
const newCounter = '{s.n}';

mobile = mobile.replace(oldCounter, newCounter);

mobile = mobile.replace(
  "AccommoTrack is a dual-mode platform for students finding homes",
  "AccommoTrack is a dual-mode platform for tenants finding homes"
);
mobile = mobile.replace(
  "This is normal for student-led projects",
  "This is normal for beta apps"
);

fs.writeFileSync(mobileAppFile, mobile);


/* @refresh reset */
function FoodDiningIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="bowl-top" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFF3E0" />
          <stop offset="100%" stopColor="#E65100" />
        </radialGradient>
        <radialGradient id="bowl-inner" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFF8E1" />
          <stop offset="100%" stopColor="#FF8F00" />
        </radialGradient>
        <filter id="shadow-food">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#E65100" floodOpacity="0.25" />
        </filter>
      </defs>
      <ellipse cx="32" cy="44" rx="22" ry="7" fill="#FFCC02" opacity="0.18" />
      <path d="M10 36 Q10 52 32 52 Q54 52 54 36 Z" fill="url(#bowl-top)" filter="url(#shadow-food)" />
      <path d="M12 36 Q12 50 32 50 Q52 50 52 36 Z" fill="url(#bowl-inner)" />
      <ellipse cx="32" cy="36" rx="22" ry="6" fill="#FFD54F" />
      <ellipse cx="32" cy="36" rx="18" ry="4.5" fill="#FFECB3" />
      <path d="M22 27 Q24 20 22 14" stroke="#FF7043" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 25 Q34 18 32 12" stroke="#FF7043" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M42 27 Q44 20 42 14" stroke="#FF7043" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function BeautyWellnessIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="flower-center" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF9C4" />
          <stop offset="100%" stopColor="#F9A825" />
        </radialGradient>
        <radialGradient id="petal-grad" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FCE4EC" />
          <stop offset="100%" stopColor="#E91E63" />
        </radialGradient>
        <filter id="shadow-beauty">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#E91E63" floodOpacity="0.22" />
        </filter>
      </defs>
      <g filter="url(#shadow-beauty)">
        <ellipse cx="32" cy="14" rx="7" ry="11" fill="url(#petal-grad)" />
        <ellipse cx="32" cy="50" rx="7" ry="11" fill="url(#petal-grad)" />
        <ellipse cx="14" cy="32" rx="11" ry="7" fill="url(#petal-grad)" />
        <ellipse cx="50" cy="32" rx="11" ry="7" fill="url(#petal-grad)" />
        <ellipse cx="18.3" cy="18.3" rx="7" ry="11" fill="url(#petal-grad)" transform="rotate(-45 18.3 18.3)" />
        <ellipse cx="45.7" cy="18.3" rx="7" ry="11" fill="url(#petal-grad)" transform="rotate(45 45.7 18.3)" />
        <ellipse cx="18.3" cy="45.7" rx="7" ry="11" fill="url(#petal-grad)" transform="rotate(45 18.3 45.7)" />
        <ellipse cx="45.7" cy="45.7" rx="7" ry="11" fill="url(#petal-grad)" transform="rotate(-45 45.7 45.7)" />
      </g>
      <circle cx="32" cy="32" r="12" fill="url(#flower-center)" />
      <circle cx="29" cy="30" r="3.5" fill="white" opacity="0.5" />
    </svg>
  );
}

function ElectronicsIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="phone-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B3E5FC" />
          <stop offset="100%" stopColor="#0277BD" />
        </linearGradient>
        <linearGradient id="phone-screen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E3F2FD" />
          <stop offset="100%" stopColor="#42A5F5" />
        </linearGradient>
        <filter id="shadow-elec">
          <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#0277BD" floodOpacity="0.3" />
        </filter>
      </defs>
      <rect x="18" y="7" width="28" height="50" rx="5" fill="url(#phone-body)" filter="url(#shadow-elec)" />
      <rect x="21" y="12" width="22" height="34" rx="3" fill="url(#phone-screen)" />
      <rect x="21" y="12" width="22" height="34" rx="3" fill="url(#phone-screen)" />
      <path d="M21 12 L30 21" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <circle cx="32" cy="52" r="2.5" fill="#B3E5FC" />
      <rect x="28" y="9" width="8" height="1.5" rx="0.75" fill="#B3E5FC" opacity="0.7" />
      <rect x="26" y="20" width="12" height="2" rx="1" fill="white" opacity="0.7" />
      <rect x="26" y="25" width="10" height="2" rx="1" fill="white" opacity="0.5" />
      <rect x="26" y="30" width="8" height="2" rx="1" fill="white" opacity="0.5" />
    </svg>
  );
}

function FashionIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="bag-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EDE7F6" />
          <stop offset="100%" stopColor="#7B1FA2" />
        </linearGradient>
        <linearGradient id="bag-flap" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F3E5F5" />
          <stop offset="100%" stopColor="#9C27B0" />
        </linearGradient>
        <filter id="shadow-fashion">
          <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#7B1FA2" floodOpacity="0.28" />
        </filter>
      </defs>
      <rect x="12" y="22" width="40" height="34" rx="6" fill="url(#bag-body)" filter="url(#shadow-fashion)" />
      <path d="M14 30 Q14 22 32 22 Q50 22 50 30" stroke="#CE93D8" strokeWidth="2" fill="none" />
      <path d="M22 22 Q22 12 32 12 Q42 12 42 22" stroke="#CE93D8" strokeWidth="3" strokeLinecap="round" fill="none" />
      <rect x="12" y="30" width="40" height="8" rx="0" fill="#9C27B0" opacity="0.3" />
      <circle cx="32" cy="34" r="4" fill="#FFD54F" />
      <circle cx="32" cy="34" r="2.5" fill="#F9A825" />
      <path d="M16 26 L14 24" stroke="#CE93D8" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function GroceriesIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="basket-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8F5E9" />
          <stop offset="100%" stopColor="#2E7D32" />
        </linearGradient>
        <radialGradient id="apple-grad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#FFCDD2" />
          <stop offset="100%" stopColor="#E53935" />
        </radialGradient>
        <filter id="shadow-grocery">
          <feDropShadow dx="1" dy="3" stdDeviation="3.5" floodColor="#2E7D32" floodOpacity="0.25" />
        </filter>
      </defs>
      <path d="M14 30 L10 54 H54 L50 30 Z" fill="url(#basket-body)" filter="url(#shadow-grocery)" />
      <path d="M14 30 L10 54 H54 L50 30 Z" fill="none" stroke="#43A047" strokeWidth="1.5" />
      <line x1="20" y1="30" x2="18" y2="54" stroke="#66BB6A" strokeWidth="2" opacity="0.6" />
      <line x1="32" y1="30" x2="32" y2="54" stroke="#66BB6A" strokeWidth="2" opacity="0.6" />
      <line x1="44" y1="30" x2="46" y2="54" stroke="#66BB6A" strokeWidth="2" opacity="0.6" />
      <path d="M18 30 Q25 16 32 18 Q39 16 46 30" stroke="#5D4037" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="28" cy="26" r="7" fill="url(#apple-grad)" />
      <path d="M28 20 Q30 17 32 18" stroke="#2E7D32" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="37" cy="28" rx="6" ry="7" fill="#F9A825" />
    </svg>
  );
}

function SportsIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="dumbbell-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFCCBC" />
          <stop offset="100%" stopColor="#BF360C" />
        </linearGradient>
        <linearGradient id="weight-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EFEBE9" />
          <stop offset="100%" stopColor="#4E342E" />
        </linearGradient>
        <filter id="shadow-sports">
          <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#BF360C" floodOpacity="0.28" />
        </filter>
      </defs>
      <g filter="url(#shadow-sports)">
        <rect x="8" y="26" width="11" height="12" rx="4" fill="url(#weight-grad)" />
        <rect x="6" y="28" width="6" height="8" rx="3" fill="url(#weight-grad)" />
        <rect x="45" y="26" width="11" height="12" rx="4" fill="url(#weight-grad)" />
        <rect x="52" y="28" width="6" height="8" rx="3" fill="url(#weight-grad)" />
        <rect x="19" y="29" width="26" height="6" rx="3" fill="url(#dumbbell-grad)" />
      </g>
      <rect x="20" y="30" width="24" height="4" rx="2" fill="#FF7043" opacity="0.6" />
    </svg>
  );
}

function EducationIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="book-back" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#BBDEFB" />
          <stop offset="100%" stopColor="#1565C0" />
        </linearGradient>
        <linearGradient id="book-front" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E3F2FD" />
          <stop offset="100%" stopColor="#1976D2" />
        </linearGradient>
        <filter id="shadow-edu">
          <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#1565C0" floodOpacity="0.28" />
        </filter>
      </defs>
      <g filter="url(#shadow-edu)">
        <rect x="10" y="12" width="36" height="44" rx="4" fill="url(#book-back)" transform="rotate(-5 10 12)" />
        <rect x="14" y="12" width="36" height="44" rx="4" fill="url(#book-front)" />
      </g>
      <rect x="20" y="20" width="22" height="2.5" rx="1.25" fill="#90CAF9" opacity="0.9" />
      <rect x="20" y="26" width="18" height="2" rx="1" fill="#90CAF9" opacity="0.7" />
      <rect x="20" y="31" width="20" height="2" rx="1" fill="#90CAF9" opacity="0.7" />
      <rect x="20" y="36" width="15" height="2" rx="1" fill="#90CAF9" opacity="0.7" />
      <rect x="14" y="12" width="5" height="44" rx="2" fill="#1565C0" opacity="0.5" />
      <circle cx="40" cy="44" r="8" fill="#FFD740" />
      <path d="M36 44 L39 47 L44 41" stroke="#E65100" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EntertainmentIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="star-grad" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFF9C4" />
          <stop offset="100%" stopColor="#F57F17" />
        </radialGradient>
        <radialGradient id="film-grad" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#EDE7F6" />
          <stop offset="100%" stopColor="#4527A0" />
        </radialGradient>
        <filter id="shadow-ent">
          <feDropShadow dx="1" dy="3" stdDeviation="4" floodColor="#F57F17" floodOpacity="0.3" />
        </filter>
      </defs>
      <rect x="10" y="18" width="44" height="30" rx="5" fill="url(#film-grad)" filter="url(#shadow-ent)" />
      <rect x="10" y="18" width="8" height="5" rx="1" fill="#7C4DFF" opacity="0.8" />
      <rect x="10" y="27" width="8" height="5" rx="1" fill="#7C4DFF" opacity="0.8" />
      <rect x="10" y="36" width="8" height="5" rx="1" fill="#7C4DFF" opacity="0.8" />
      <rect x="46" y="18" width="8" height="5" rx="1" fill="#7C4DFF" opacity="0.8" />
      <rect x="46" y="27" width="8" height="5" rx="1" fill="#7C4DFF" opacity="0.8" />
      <rect x="46" y="36" width="8" height="5" rx="1" fill="#7C4DFF" opacity="0.8" />
      <polygon points="32,21 34.5,28 42,28 36,32.5 38.5,40 32,35.5 25.5,40 28,32.5 22,28 29.5,28" fill="url(#star-grad)" />
    </svg>
  );
}

function TravelIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="plane-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E1F5FE" />
          <stop offset="100%" stopColor="#0288D1" />
        </linearGradient>
        <filter id="shadow-travel">
          <feDropShadow dx="2" dy="3" stdDeviation="4" floodColor="#0277BD" floodOpacity="0.3" />
        </filter>
      </defs>
      <circle cx="32" cy="32" r="22" fill="#E1F5FE" opacity="0.5" />
      <path d="M10 38 Q12 36 14 38 L18 36 L22 40 L18 42 Z" fill="#B3E5FC" opacity="0.6" />
      <g filter="url(#shadow-travel)" transform="rotate(-35 32 32)">
        <path d="M12 32 Q20 20 52 32 Q20 44 12 32 Z" fill="url(#plane-body)" />
        <path d="M12 32 Q22 28 36 32 Q22 36 12 32 Z" fill="white" opacity="0.4" />
        <path d="M34 20 Q44 22 52 32 L38 32 Z" fill="#0288D1" opacity="0.4" />
        <path d="M34 44 Q44 42 52 32 L38 32 Z" fill="#0288D1" opacity="0.4" />
        <rect x="46" y="30" width="8" height="4" rx="2" fill="#0288D1" opacity="0.5" />
      </g>
    </svg>
  );
}

function HomeLivingIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="house-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E0F2F1" />
          <stop offset="100%" stopColor="#00695C" />
        </linearGradient>
        <linearGradient id="roof-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#80CBC4" />
          <stop offset="100%" stopColor="#004D40" />
        </linearGradient>
        <filter id="shadow-home">
          <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#00695C" floodOpacity="0.28" />
        </filter>
      </defs>
      <g filter="url(#shadow-home)">
        <rect x="16" y="32" width="32" height="24" rx="3" fill="url(#house-body)" />
        <polygon points="8,34 32,10 56,34" fill="url(#roof-grad)" />
      </g>
      <polygon points="10,34 32,12 54,34" fill="#26A69A" opacity="0.4" />
      <rect x="26" y="42" width="12" height="14" rx="2" fill="#004D40" opacity="0.5" />
      <rect x="20" y="38" width="8" height="8" rx="1.5" fill="#B2DFDB" opacity="0.8" />
      <rect x="36" y="38" width="8" height="8" rx="1.5" fill="#B2DFDB" opacity="0.8" />
      <rect x="28" y="16" width="5" height="10" rx="1" fill="#FFCA28" opacity="0.7" />
    </svg>
  );
}

function PharmacyHealthIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="health-cross" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FCE4EC" />
          <stop offset="100%" stopColor="#C62828" />
        </radialGradient>
        <filter id="shadow-health">
          <feDropShadow dx="1" dy="3" stdDeviation="3" floodColor="#C62828" floodOpacity="0.3" />
        </filter>
      </defs>
      <circle cx="32" cy="32" r="22" fill="#FFEBEE" filter="url(#shadow-health)" />
      <circle cx="32" cy="32" r="22" fill="#FFCDD2" opacity="0.4" />
      <rect x="26" y="14" width="12" height="36" rx="4" fill="url(#health-cross)" />
      <rect x="14" y="26" width="36" height="12" rx="4" fill="url(#health-cross)" />
      <rect x="27" y="15" width="5" height="10" rx="2" fill="white" opacity="0.3" />
    </svg>
  );
}

function JewelleryIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="gem-grad" cx="35%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#E8EAF6" />
          <stop offset="100%" stopColor="#283593" />
        </radialGradient>
        <filter id="shadow-jewel">
          <feDropShadow dx="1" dy="3" stdDeviation="4" floodColor="#283593" floodOpacity="0.35" />
        </filter>
      </defs>
      <g filter="url(#shadow-jewel)">
        <polygon points="32,10 52,26 44,52 20,52 12,26" fill="url(#gem-grad)" />
      </g>
      <polygon points="32,10 52,26 44,52 20,52 12,26 32,10" fill="none" stroke="#7986CB" strokeWidth="1" />
      <polygon points="32,10 52,26 32,22" fill="white" opacity="0.35" />
      <polygon points="32,10 12,26 32,22" fill="white" opacity="0.15" />
      <polygon points="32,22 52,26 44,52 20,52 12,26" fill="#3949AB" opacity="0.2" />
      <circle cx="32" cy="30" r="5" fill="white" opacity="0.35" />
    </svg>
  );
}

const CATEGORY_SVG_MAP: Record<string, React.FC> = {
  "food & dining": FoodDiningIcon,
  "food": FoodDiningIcon,
  "restaurants": FoodDiningIcon,
  "beauty & wellness": BeautyWellnessIcon,
  "beauty": BeautyWellnessIcon,
  "wellness": BeautyWellnessIcon,
  "electronics": ElectronicsIcon,
  "fashion": FashionIcon,
  "clothing": FashionIcon,
  "groceries": GroceriesIcon,
  "grocery": GroceriesIcon,
  "supermarket": GroceriesIcon,
  "sports & fitness": SportsIcon,
  "sports": SportsIcon,
  "fitness": SportsIcon,
  "education": EducationIcon,
  "books": EducationIcon,
  "entertainment": EntertainmentIcon,
  "cinema": EntertainmentIcon,
  "travel": TravelIcon,
  "home & living": HomeLivingIcon,
  "home": HomeLivingIcon,
  "furniture": HomeLivingIcon,
  "pharmacy & health": PharmacyHealthIcon,
  "pharmacy": PharmacyHealthIcon,
  "health": PharmacyHealthIcon,
  "jewellery": JewelleryIcon,
  "jewelry": JewelleryIcon,
};

const CATEGORY_BG_MAP: Record<string, string> = {
  "food & dining": "bg-orange-50 border-orange-100 dark:bg-orange-950/30 dark:border-orange-900/40",
  "food": "bg-orange-50 border-orange-100 dark:bg-orange-950/30 dark:border-orange-900/40",
  "restaurants": "bg-orange-50 border-orange-100 dark:bg-orange-950/30 dark:border-orange-900/40",
  "beauty & wellness": "bg-pink-50 border-pink-100 dark:bg-pink-950/30 dark:border-pink-900/40",
  "beauty": "bg-pink-50 border-pink-100 dark:bg-pink-950/30 dark:border-pink-900/40",
  "wellness": "bg-pink-50 border-pink-100 dark:bg-pink-950/30 dark:border-pink-900/40",
  "electronics": "bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/40",
  "fashion": "bg-purple-50 border-purple-100 dark:bg-purple-950/30 dark:border-purple-900/40",
  "clothing": "bg-purple-50 border-purple-100 dark:bg-purple-950/30 dark:border-purple-900/40",
  "groceries": "bg-green-50 border-green-100 dark:bg-green-950/30 dark:border-green-900/40",
  "grocery": "bg-green-50 border-green-100 dark:bg-green-950/30 dark:border-green-900/40",
  "supermarket": "bg-green-50 border-green-100 dark:bg-green-950/30 dark:border-green-900/40",
  "sports & fitness": "bg-red-50 border-red-100 dark:bg-red-950/30 dark:border-red-900/40",
  "sports": "bg-red-50 border-red-100 dark:bg-red-950/30 dark:border-red-900/40",
  "fitness": "bg-red-50 border-red-100 dark:bg-red-950/30 dark:border-red-900/40",
  "education": "bg-sky-50 border-sky-100 dark:bg-sky-950/30 dark:border-sky-900/40",
  "books": "bg-sky-50 border-sky-100 dark:bg-sky-950/30 dark:border-sky-900/40",
  "entertainment": "bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/40",
  "cinema": "bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/40",
  "travel": "bg-cyan-50 border-cyan-100 dark:bg-cyan-950/30 dark:border-cyan-900/40",
  "home & living": "bg-teal-50 border-teal-100 dark:bg-teal-950/30 dark:border-teal-900/40",
  "home": "bg-teal-50 border-teal-100 dark:bg-teal-950/30 dark:border-teal-900/40",
  "furniture": "bg-teal-50 border-teal-100 dark:bg-teal-950/30 dark:border-teal-900/40",
  "pharmacy & health": "bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/40",
  "pharmacy": "bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/40",
  "health": "bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/40",
  "jewellery": "bg-indigo-50 border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900/40",
  "jewelry": "bg-indigo-50 border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900/40",
};

export function getCategoryIconComponent(name: string): React.FC | null {
  const key = name.toLowerCase();
  if (CATEGORY_SVG_MAP[key]) return CATEGORY_SVG_MAP[key];
  for (const [k, v] of Object.entries(CATEGORY_SVG_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

export function getCategoryBg(name: string): string {
  const key = name.toLowerCase();
  if (CATEGORY_BG_MAP[key]) return CATEGORY_BG_MAP[key];
  for (const [k, v] of Object.entries(CATEGORY_BG_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return "bg-gray-50 border-gray-100";
}

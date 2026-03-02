import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { X, Navigation, MapPin, Tag, ChevronLeft, Compass, Camera, Eye, Building2, TreePine } from "lucide-react";

interface ShopCoupon {
  id: string;
  code: string;
  type: string;
  value: string;
  description?: string;
  banner_image?: string;
  shop?: {
    id: string;
    name: string;
    logo?: string;
    banner_image?: string;
    latitude?: string;
    longitude?: string;
    address?: string;
    whatsapp_number?: string;
    category_id?: string;
  };
}

interface ARBuilding {
  id: string;
  shopName: string;
  coupon?: ShopCoupon;
  bearing: number;
  distance: number;
  category: string;
  categoryColor: string;
  categoryGrad: string;
  height: number;
  width: number;
  logo?: string;
  address?: string;
}

interface FillerBuilding {
  id: string;
  bearing: number;
  distance: number;
  color: string;
  height: number;
  width: number;
  windows: number;
}

const CATEGORY_COLORS: Record<string, { bg: string; grad: string }> = {
  "Food & Dining": { bg: "#ef4444", grad: "linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)" },
  "Fashion": { bg: "#ec4899", grad: "linear-gradient(180deg, #ec4899 0%, #be185d 100%)" },
  "Electronics": { bg: "#3b82f6", grad: "linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)" },
  "Beauty & Wellness": { bg: "#f59e0b", grad: "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)" },
  "Travel": { bg: "#10b981", grad: "linear-gradient(180deg, #10b981 0%, #059669 100%)" },
  "Groceries": { bg: "#22c55e", grad: "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)" },
  "Sports & Fitness": { bg: "#84cc16", grad: "linear-gradient(180deg, #84cc16 0%, #65a30d 100%)" },
  "Entertainment": { bg: "#8b5cf6", grad: "linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%)" },
  "Home & Living": { bg: "#f97316", grad: "linear-gradient(180deg, #f97316 0%, #ea580c 100%)" },
  "Education": { bg: "#6366f1", grad: "linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)" },
};

const FILLER_COLORS = ["#64748b", "#78716c", "#71717a", "#6b7280", "#57534e", "#525252", "#737373"];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const la1 = (lat1 * Math.PI) / 180;
  const la2 = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateFillerBuildings(): FillerBuilding[] {
  const buildings: FillerBuilding[] = [];
  const rng = seededRandom(42);
  for (let i = 0; i < 40; i++) {
    const bearing = i * 9 + rng() * 5;
    const distance = 0.05 + rng() * 0.4;
    const side = i % 2 === 0 ? 1 : -1;
    buildings.push({
      id: `filler-${i}`,
      bearing: (bearing + (side > 0 ? 3 : -3) + 360) % 360,
      distance,
      color: FILLER_COLORS[Math.floor(rng() * FILLER_COLORS.length)],
      height: 80 + rng() * 160,
      width: 60 + rng() * 80,
      windows: 2 + Math.floor(rng() * 4),
    });
  }
  return buildings;
}

export default function ARCamera() {
  const [, navigate] = useLocation();
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState(0);
  const [selectedCoupon, setSelectedCoupon] = useState<ShopCoupon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<"requesting" | "granted" | "denied">("requesting");
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [headingOffset, setHeadingOffset] = useState(0);
  const [hasCompass, setHasCompass] = useState(false);
  const [screenSize, setScreenSize] = useState({ w: typeof window !== "undefined" ? window.innerWidth : 1280, h: typeof window !== "undefined" ? window.innerHeight : 720 });

  const { data: coupons = [] } = useQuery<ShopCoupon[]>({ queryKey: ["/api/coupons"] });
  const { data: categories = [] } = useQuery<{ id: string; name: string }[]>({ queryKey: ["/api/categories"] });

  const categoryMap = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach((c) => { m[c.id] = c.name; });
    return m;
  }, [categories]);

  const fillerBuildings = useMemo(() => generateFillerBuildings(), []);

  const arBuildings: ARBuilding[] = useMemo(() => {
    if (!userPos) return [];
    return coupons
      .filter((c) => c.shop?.latitude && c.shop?.longitude)
      .map((c) => {
        const dist = haversineKm(userPos.lat, userPos.lng, parseFloat(c.shop!.latitude!), parseFloat(c.shop!.longitude!));
        const bear = bearingDeg(userPos.lat, userPos.lng, parseFloat(c.shop!.latitude!), parseFloat(c.shop!.longitude!));
        const catName = c.shop?.category_id ? (categoryMap[c.shop.category_id] || "Other") : "Other";
        const catStyle = CATEGORY_COLORS[catName] || { bg: "#6366f1", grad: "linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)" };
        return {
          id: c.shop!.id + "-" + c.id,
          shopName: c.shop!.name || "Shop",
          coupon: c,
          bearing: bear,
          distance: dist,
          category: catName,
          categoryColor: catStyle.bg,
          categoryGrad: catStyle.grad,
          height: 140 + (dist * 137.5 % 1) * 80,
          width: 100 + (bear * 73.1 % 1) * 40,
          logo: c.shop?.logo,
          address: c.shop?.address,
        };
      })
      .filter((b) => b.distance < 50)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 15);
  }, [userPos, coupons, categoryMap]);

  useEffect(() => {
    let mounted = true;
    const fallback = () => {
      if (mounted) {
        setUserPos({ lat: 16.7051, lng: 81.0952 });
        setPermissionState("granted");
      }
    };
    if (!navigator.geolocation) {
      fallback();
      return;
    }
    const timeoutId = setTimeout(fallback, 3000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeoutId);
        if (mounted) {
          setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setPermissionState("granted");
        }
      },
      () => {
        clearTimeout(timeoutId);
        fallback();
      },
      { enableHighAccuracy: true, timeout: 3000 }
    );
    return () => { mounted = false; clearTimeout(timeoutId); };
  }, []);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) {
        setHeading(e.alpha);
        setHasCompass(true);
      }
    };
    const requestOrientation = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
        try {
          const perm = await (DeviceOrientationEvent as any).requestPermission();
          if (perm === "granted") window.addEventListener("deviceorientation", handleOrientation, true);
        } catch { /* ignore */ }
      } else {
        window.addEventListener("deviceorientation", handleOrientation, true);
      }
    };
    requestOrientation();
    return () => window.removeEventListener("deviceorientation", handleOrientation, true);
  }, []);

  useEffect(() => {
    const onResize = () => setScreenSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const effectiveHeading = (heading + headingOffset + 360) % 360;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setTouchStart(e.clientX);
  }, []);

  const rafRef = useRef<number | null>(null);
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (touchStart === null) return;
    const dx = e.clientX - touchStart;
    setTouchStart(e.clientX);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setHeadingOffset((prev) => prev - dx * 0.3);
    });
  }, [touchStart]);

  const handlePointerUp = useCallback(() => {
    setTouchStart(null);
  }, []);

  const goBack = () => navigate("/");

  const couponLabel = (c: ShopCoupon) => {
    if (c.type === "percentage") return `${c.value}% OFF`;
    if (c.type === "flat") return `₹${c.value} OFF`;
    if (c.type === "free_item") return "FREE ITEM";
    if (c.type === "bogo") return "BOGO";
    if (c.type === "category_offer") return "Category Offer";
    return "OFFER";
  };

  const projectToScreen = (bearing: number, distance: number, screenW: number, screenH: number) => {
    const fov = 90;
    let angleDiff = ((bearing - effectiveHeading + 540) % 360) - 180;
    const xPercent = 50 + (angleDiff / fov) * 100;
    const inView = xPercent > -20 && xPercent < 120;
    const maxDist = 2;
    const clampedDist = Math.max(0.02, Math.min(maxDist, distance));
    const depthFactor = 1 - clampedDist / maxDist;
    const horizon = screenH * 0.38;
    const groundBottom = screenH;
    const y = horizon + (groundBottom - horizon) * (1 - depthFactor) * 0.3;
    const scale = 0.3 + depthFactor * 0.7;
    return { x: (xPercent / 100) * screenW, y, scale, inView, depthFactor };
  };

  if (permissionState === "requesting") {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 p-8" style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)" }}>
        <div className="w-16 h-16 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-white text-lg font-semibold">Loading AR Street View...</p>
        <p className="text-white/50 text-sm">Getting your location</p>
      </div>
    );
  }

  const screenW = screenSize.w;
  const screenH = screenSize.h;

  return (
    <div
      
      className="fixed inset-0 z-[9999] overflow-hidden select-none"
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      data-testid="ar-street-view"
    >
      {/* Sky */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(180deg, #1a237e 0%, #283593 15%, #42a5f5 40%, #81d4fa 55%, #b3e5fc 65%, #e1f5fe 72%, #e8eaf6 80%)",
      }} />

      {/* Sun */}
      <div className="absolute" style={{
        top: "8%",
        left: `${((180 - effectiveHeading + 540) % 360) / 360 * 100}%`,
        width: 70, height: 70,
        borderRadius: "50%",
        background: "radial-gradient(circle, #fff9c4 0%, #ffee58 40%, #ffa726 100%)",
        boxShadow: "0 0 80px 30px rgba(255,183,77,0.4), 0 0 200px 60px rgba(255,167,38,0.15)",
        transform: "translateX(-50%)",
      }} />

      {/* Clouds */}
      {[15, 35, 60, 80].map((left, i) => (
        <div key={`cloud-${i}`} className="absolute" style={{
          top: `${10 + i * 4}%`,
          left: `${((left * 3.6 - effectiveHeading + 540) % 360) / 360 * 100}%`,
          width: 120 + i * 20, height: 30 + i * 5,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.6)",
          filter: "blur(8px)",
          transform: "translateX(-50%)",
        }} />
      ))}

      {/* Ground plane */}
      <div className="absolute left-0 right-0 bottom-0" style={{ top: "38%", overflow: "hidden" }}>
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, #90a4ae 0%, #78909c 20%, #607d8b 50%, #546e7a 100%)",
        }} />

        {/* Road surface */}
        <div className="absolute" style={{
          left: "30%", right: "30%", top: 0, bottom: 0,
          background: "linear-gradient(180deg, #37474f 0%, #455a64 40%, #546e7a 100%)",
        }}>
          {/* Center line dashes */}
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={`dash-${i}`} className="absolute" style={{
              left: "48%", width: "4%",
              top: `${i * 5 + 2}%`, height: `${2 + i * 0.3}%`,
              background: "#fff176",
              borderRadius: 2,
              opacity: 0.7 + i * 0.015,
            }} />
          ))}
          {/* Left lane line */}
          <div className="absolute" style={{
            left: "5%", width: "2%", top: 0, bottom: 0,
            background: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.6) 100%)",
          }} />
          {/* Right lane line */}
          <div className="absolute" style={{
            right: "5%", width: "2%", top: 0, bottom: 0,
            background: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.6) 100%)",
          }} />
        </div>

        {/* Left sidewalk */}
        <div className="absolute" style={{
          left: "22%", width: "8%", top: 0, bottom: 0,
          background: "linear-gradient(180deg, #bcaaa4 0%, #a1887f 100%)",
          borderRight: "2px solid rgba(0,0,0,0.2)",
        }} />
        {/* Right sidewalk */}
        <div className="absolute" style={{
          right: "22%", width: "8%", top: 0, bottom: 0,
          background: "linear-gradient(180deg, #bcaaa4 0%, #a1887f 100%)",
          borderLeft: "2px solid rgba(0,0,0,0.2)",
        }} />

        {/* Perspective grid lines on road */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={`grid-${i}`} className="absolute" style={{
            left: "30%", right: "30%",
            top: `${i * 8}%`, height: 1,
            background: `rgba(255,255,255,${0.05 + i * 0.02})`,
          }} />
        ))}
      </div>

      {/* Filler buildings (scenery) */}
      {fillerBuildings.map((fb) => {
        const proj = projectToScreen(fb.bearing, fb.distance, screenW, screenH);
        if (!proj.inView) return null;
        const bH = fb.height * proj.scale;
        const bW = fb.width * proj.scale;
        const isLeft = proj.x < screenW / 2;
        return (
          <div key={fb.id} className="absolute" style={{
            left: proj.x - bW / 2,
            top: proj.y - bH,
            width: bW,
            height: bH,
            zIndex: Math.round(proj.depthFactor * 50),
            transition: "left 0.3s ease, top 0.2s ease",
          }}>
            {/* Front face */}
            <div className="absolute inset-0 rounded-t-sm" style={{
              background: `linear-gradient(180deg, ${fb.color}dd 0%, ${fb.color}aa 100%)`,
              borderLeft: `${bW * 0.15}px solid ${fb.color}88`,
              borderRight: `${bW * 0.1}px solid ${fb.color}66`,
            }}>
              {/* Windows */}
              <div className="absolute inset-2 grid gap-1" style={{
                gridTemplateColumns: `repeat(${fb.windows}, 1fr)`,
                gridTemplateRows: `repeat(${Math.ceil(bH / 30)}, 1fr)`,
              }}>
                {Array.from({ length: fb.windows * Math.ceil(bH / 30) }).map((_, wi) => (
                  <div key={wi} className="rounded-sm" style={{
                    background: (wi * 7 + parseInt(fb.id.split("-")[1]) * 3) % 5 > 1 ? "rgba(255,235,59,0.3)" : "rgba(30,30,50,0.5)",
                    border: "1px solid rgba(0,0,0,0.15)",
                    minHeight: 4,
                  }} />
                ))}
              </div>
            </div>
            {/* Roof edge */}
            <div className="absolute top-0 left-0 right-0" style={{
              height: 3 * proj.scale,
              background: `${fb.color}cc`,
              borderRadius: "2px 2px 0 0",
            }} />
          </div>
        );
      })}

      {/* Shop buildings with coupons */}
      {arBuildings.map((building, index) => {
        const proj = projectToScreen(building.bearing, building.distance, screenW, screenH);
        if (!proj.inView) return null;
        const bH = building.height * proj.scale * 1.3;
        const bW = building.width * proj.scale * 1.2;
        const sideW = bW * 0.2;

        return (
          <div key={building.id} className="absolute" style={{
            left: proj.x - bW / 2,
            top: proj.y - bH,
            width: bW + sideW,
            height: bH,
            zIndex: Math.round(proj.depthFactor * 100) + 50,
            transition: "left 0.4s ease, top 0.2s ease",
            cursor: "pointer",
          }}
          onClick={() => building.coupon && setSelectedCoupon(building.coupon)}
          data-testid={`ar-building-${building.id}`}
          >
            {/* 3D side face */}
            <div className="absolute" style={{
              right: 0,
              top: -sideW * 0.3,
              width: sideW,
              height: bH + sideW * 0.3,
              background: `linear-gradient(180deg, ${building.categoryColor}88 0%, ${building.categoryColor}55 100%)`,
              transform: "skewY(-10deg)",
              transformOrigin: "bottom right",
              borderRight: `1px solid ${building.categoryColor}44`,
            }} />

            {/* Main front face */}
            <div className="absolute" style={{
              left: 0, top: 0, width: bW, height: bH,
              background: building.categoryGrad,
              borderRadius: "4px 4px 0 0",
              border: `2px solid ${building.categoryColor}cc`,
              boxShadow: `0 0 30px ${building.categoryColor}33, inset 0 2px 0 rgba(255,255,255,0.2)`,
              overflow: "hidden",
            }}>
              {/* Roof stripe */}
              <div className="absolute top-0 left-0 right-0" style={{
                height: 8 * proj.scale,
                background: "rgba(255,255,255,0.25)",
              }} />

              {/* Shop logo circle */}
              <div className="absolute flex items-center justify-center" style={{
                top: 10 * proj.scale,
                left: "50%",
                transform: "translateX(-50%)",
                width: bW * 0.35,
                height: bW * 0.35,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.4)",
                overflow: "hidden",
                background: "rgba(0,0,0,0.3)",
              }}>
                {building.logo ? (
                  <img src={building.logo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="text-white/80" style={{ width: bW * 0.15, height: bW * 0.15 }} />
                )}
              </div>

              {/* Shop name */}
              <div className="absolute left-1 right-1 text-center" style={{
                top: 10 * proj.scale + bW * 0.38,
                fontSize: Math.max(7, 10 * proj.scale),
                color: "white",
                fontWeight: 800,
                textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {building.shopName}
              </div>

              {/* Windows grid */}
              <div className="absolute left-2 right-2 bottom-2 grid gap-1" style={{
                gridTemplateColumns: "repeat(3, 1fr)",
                gridTemplateRows: `repeat(${Math.max(2, Math.floor((bH - bW * 0.5) / 25))}, 1fr)`,
                top: 15 * proj.scale + bW * 0.48,
              }}>
                {Array.from({ length: 3 * Math.max(2, Math.floor((bH - bW * 0.5) / 25)) }).map((_, wi) => (
                  <div key={wi} className="rounded-sm" style={{
                    background: wi % 3 === 1 ? "rgba(255,235,59,0.4)" : "rgba(200,230,255,0.25)",
                    border: "1px solid rgba(0,0,0,0.2)",
                    minHeight: 6 * proj.scale,
                  }} />
                ))}
              </div>

              {/* Door */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{
                width: bW * 0.25,
                height: bH * 0.18,
                background: "linear-gradient(180deg, #5d4037 0%, #3e2723 100%)",
                borderRadius: `${4 * proj.scale}px ${4 * proj.scale}px 0 0`,
                border: "1px solid rgba(0,0,0,0.3)",
              }}>
                <div className="absolute top-1/2 right-1 w-1 h-1 rounded-full bg-yellow-300" />
              </div>
            </div>

            {/* Coupon banner floating above building */}
            {building.coupon && (
              <div className="absolute ar-float-banner" style={{
                top: -45 * proj.scale,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 200,
                animationDelay: `${index * 0.2}s`,
              }}>
                <div className="relative px-3 py-2 rounded-xl" style={{
                  background: "linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(20,10,40,0.92) 100%)",
                  border: "1px solid rgba(139,92,246,0.5)",
                  boxShadow: `0 0 20px ${building.categoryColor}44, 0 4px 15px rgba(0,0,0,0.5)`,
                  minWidth: Math.max(90, bW * 0.9),
                  whiteSpace: "nowrap",
                }}>
                  <div className="ar-glow-pulse absolute -inset-1 rounded-xl" style={{
                    background: `radial-gradient(ellipse, ${building.categoryColor}22, transparent 70%)`,
                  }} />
                  <div className="flex items-center gap-2 relative">
                    <Tag className="text-amber-300 shrink-0" style={{ width: 12 * proj.scale, height: 12 * proj.scale }} />
                    <div>
                      <div className="font-black text-white" style={{ fontSize: Math.max(8, 11 * proj.scale) }}>
                        {couponLabel(building.coupon)}
                      </div>
                      <div className="font-mono text-amber-300/80" style={{ fontSize: Math.max(6, 8 * proj.scale) }}>
                        {building.coupon.code}
                      </div>
                    </div>
                  </div>
                  {/* Arrow pointing down to building */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0" style={{
                    borderLeft: "6px solid transparent",
                    borderRight: "6px solid transparent",
                    borderTop: "8px solid rgba(20,10,40,0.92)",
                  }} />
                </div>
              </div>
            )}

            {/* Distance badge */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full" style={{
              background: "rgba(0,0,0,0.7)",
              border: "1px solid rgba(255,255,255,0.2)",
              fontSize: Math.max(7, 9 * proj.scale),
              color: "#81d4fa",
              fontWeight: 700,
              whiteSpace: "nowrap",
              zIndex: 200,
            }}>
              {building.distance < 1 ? `${Math.round(building.distance * 1000)}m` : `${building.distance.toFixed(1)}km`}
            </div>
          </div>
        );
      })}

      {/* Decorative trees */}
      {[20, 70, 130, 200, 290, 340].map((bear, i) => {
        const proj = projectToScreen(bear, 0.15 + i * 0.05, screenW, screenH);
        if (!proj.inView) return null;
        const treeH = 50 * proj.scale;
        return (
          <div key={`tree-${i}`} className="absolute" style={{
            left: proj.x - 10,
            top: proj.y - treeH,
            zIndex: Math.round(proj.depthFactor * 30),
            transition: "left 0.3s ease",
          }}>
            {/* Trunk */}
            <div style={{
              width: 6 * proj.scale, height: treeH * 0.4,
              background: "#5d4037",
              margin: "0 auto",
              borderRadius: 2,
            }} />
            {/* Canopy */}
            <div style={{
              width: 30 * proj.scale, height: treeH * 0.7,
              borderRadius: "50% 50% 40% 40%",
              background: "radial-gradient(ellipse at 40% 40%, #66bb6a, #2e7d32)",
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
            }} />
          </div>
        );
      })}

      {/* Lamp posts */}
      {[50, 140, 230, 320].map((bear, i) => {
        const proj = projectToScreen(bear, 0.1 + i * 0.06, screenW, screenH);
        if (!proj.inView) return null;
        return (
          <div key={`lamp-${i}`} className="absolute" style={{
            left: proj.x,
            top: proj.y - 40 * proj.scale,
            zIndex: Math.round(proj.depthFactor * 25),
            transition: "left 0.3s ease",
          }}>
            <div style={{ width: 3, height: 35 * proj.scale, background: "#90a4ae", margin: "0 auto" }} />
            <div style={{
              width: 14 * proj.scale, height: 8 * proj.scale,
              borderRadius: "50%",
              background: "radial-gradient(circle, #fff9c4, #ffa726)",
              boxShadow: "0 0 15px rgba(255,183,77,0.5)",
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
            }} />
          </div>
        );
      })}

      {/* HUD overlay */}
      <div className="absolute top-0 left-0 right-0 z-[200] p-3 flex items-center justify-between pointer-events-none" style={{
        background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)",
      }}>
        <button onClick={goBack} className="pointer-events-auto flex items-center gap-2 text-white/90 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl hover:bg-black/60 transition-all" data-testid="button-ar-close">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-semibold">Back</span>
        </button>
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl">
          <Eye className="w-4 h-4 text-cyan-300" />
          <span className="text-white/90 text-xs font-bold tracking-wider">AR STREET VIEW</span>
        </div>
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-2 rounded-2xl">
          <Compass className="w-4 h-4 text-cyan-300" style={{ transform: `rotate(${-effectiveHeading}deg)`, transition: "transform 0.3s ease" }} />
          <span className="text-white/70 text-[10px] font-mono">{Math.round(effectiveHeading)}°</span>
        </div>
      </div>

      {/* Mini compass rose */}
      <div className="absolute z-[200] pointer-events-none" style={{ bottom: 80, right: 16 }}>
        <div className="relative w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center">
          <div className="absolute w-full h-full" style={{ transform: `rotate(${-effectiveHeading}deg)`, transition: "transform 0.3s ease" }}>
            <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-red-400">N</div>
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white/50">S</div>
            <div className="absolute top-1/2 right-1 -translate-y-1/2 text-[8px] font-bold text-white/50">E</div>
            <div className="absolute top-1/2 left-1 -translate-y-1/2 text-[8px] font-bold text-white/50">W</div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 z-[200] p-4 pb-5 pointer-events-none" style={{
        background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)",
      }}>
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-300" />
            <span className="text-white/90 text-xs font-semibold">{arBuildings.length} shops nearby</span>
          </div>
          <div className="text-white/50 text-[10px]">
            {hasCompass ? "Rotate device to explore" : "Swipe to look around"}
          </div>
          {userPos && (
            <div className="text-white/40 text-[9px] font-mono">
              {userPos.lat.toFixed(4)}, {userPos.lng.toFixed(4)}
            </div>
          )}
        </div>
      </div>

      {/* Coupon detail overlay */}
      {selectedCoupon && (
        <div className="absolute inset-0 z-[300] flex items-center justify-center p-6" onClick={() => setSelectedCoupon(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm rounded-3xl overflow-hidden ar-detail-pop"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(145deg, rgba(20,10,50,0.95) 0%, rgba(10,5,30,0.98) 100%)",
              border: "1px solid rgba(139,92,246,0.4)",
              boxShadow: "0 0 60px rgba(139,92,246,0.2), 0 24px 48px rgba(0,0,0,0.6)",
            }}
            data-testid="ar-coupon-detail"
          >
            {(selectedCoupon.banner_image || selectedCoupon.shop?.banner_image) && (
              <div className="w-full h-40 overflow-hidden relative">
                <img src={selectedCoupon.banner_image || selectedCoupon.shop?.banner_image || ""} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-20" style={{ background: "linear-gradient(180deg, transparent, rgba(20,10,50,0.95))" }} />
              </div>
            )}
            <div className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/20 shrink-0">
                  {selectedCoupon.shop?.logo ? (
                    <img src={selectedCoupon.shop.logo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center">
                      <Tag className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">{selectedCoupon.shop?.name}</h3>
                  {selectedCoupon.shop?.address && (
                    <p className="text-white/50 text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {selectedCoupon.shop.address}
                    </p>
                  )}
                </div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <code className="text-lg font-black text-amber-300 tracking-wider">{selectedCoupon.code}</code>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-violet-500 to-blue-500 text-white">
                    {couponLabel(selectedCoupon)}
                  </span>
                </div>
                {selectedCoupon.description && (
                  <p className="text-white/60 text-sm mt-2">{selectedCoupon.description}</p>
                )}
              </div>
              {userPos && selectedCoupon.shop?.latitude && (
                <div className="flex items-center gap-2 text-violet-300 text-sm">
                  <Navigation className="w-4 h-4" />
                  <span className="font-semibold">
                    {haversineKm(userPos.lat, userPos.lng, parseFloat(selectedCoupon.shop.latitude), parseFloat(selectedCoupon.shop.longitude!)) < 1
                      ? `${Math.round(haversineKm(userPos.lat, userPos.lng, parseFloat(selectedCoupon.shop.latitude), parseFloat(selectedCoupon.shop.longitude!)) * 1000)}m away`
                      : `${haversineKm(userPos.lat, userPos.lng, parseFloat(selectedCoupon.shop.latitude), parseFloat(selectedCoupon.shop.longitude!)).toFixed(1)}km away`}
                  </span>
                </div>
              )}
              <button onClick={() => setSelectedCoupon(null)} className="w-full py-3 bg-white/10 text-white rounded-2xl font-semibold hover:bg-white/20 transition-all flex items-center justify-center gap-2" data-testid="button-ar-detail-close">
                <X className="w-4 h-4" />
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

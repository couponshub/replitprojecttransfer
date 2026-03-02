import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { X, Navigation, MapPin, Tag, ChevronLeft, Compass, Camera } from "lucide-react";

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
  };
}

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

export default function ARCamera() {
  const [, navigate] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState(0);
  const [selectedCoupon, setSelectedCoupon] = useState<ShopCoupon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<"requesting" | "granted" | "denied">("requesting");

  const { data: coupons = [] } = useQuery<ShopCoupon[]>({ queryKey: ["/api/coupons"] });

  const nearbyCoupons = userPos
    ? coupons
        .filter((c) => c.shop?.latitude && c.shop?.longitude)
        .map((c) => ({
          ...c,
          distance: haversineKm(userPos.lat, userPos.lng, parseFloat(c.shop!.latitude!), parseFloat(c.shop!.longitude!)),
          bearing: bearingDeg(userPos.lat, userPos.lng, parseFloat(c.shop!.latitude!), parseFloat(c.shop!.longitude!)),
        }))
        .filter((c) => c.distance < 50)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 15)
    : [];

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch {
      setError("Camera access denied. Please allow camera permission.");
      setPermissionState("denied");
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
        );
        if (mounted) {
          setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setPermissionState("granted");
          await startCamera();
        }
      } catch {
        if (mounted) {
          setError("Location access denied. AR Camera needs your location.");
          setPermissionState("denied");
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera]);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) setHeading(e.alpha);
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

  const goBack = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    navigate("/");
  };

  const couponLabel = (c: ShopCoupon) => {
    if (c.type === "percentage") return `${c.value}% OFF`;
    if (c.type === "flat") return `₹${c.value} OFF`;
    if (c.type === "free_item") return "FREE ITEM";
    if (c.type === "bogo") return "BOGO";
    if (c.type === "category_offer") return "Category Offer";
    return "OFFER";
  };

  if (error || permissionState === "denied") {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center gap-6 p-8">
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
          <Camera className="w-10 h-10 text-red-400" />
        </div>
        <p className="text-white text-center text-lg font-semibold">{error || "Permission denied"}</p>
        <p className="text-white/50 text-center text-sm">AR Camera needs camera and location access to show nearby offers in real-time.</p>
        <button onClick={goBack} className="px-6 py-3 bg-white/10 text-white rounded-2xl font-semibold hover:bg-white/20 transition-all" data-testid="button-ar-back">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden">
      {/* Camera feed */}
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(1)" }} />

      {/* Scan overlay */}
      {cameraReady && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.4) 100%)" }} />
          <div className="absolute inset-0 ar-scan-line" />
          <div className="absolute top-6 left-6 w-12 h-12 border-l-2 border-t-2 border-cyan-400/60 rounded-tl-xl" />
          <div className="absolute top-6 right-6 w-12 h-12 border-r-2 border-t-2 border-cyan-400/60 rounded-tr-xl" />
          <div className="absolute bottom-24 left-6 w-12 h-12 border-l-2 border-b-2 border-cyan-400/60 rounded-bl-xl" />
          <div className="absolute bottom-24 right-6 w-12 h-12 border-r-2 border-b-2 border-cyan-400/60 rounded-br-xl" />
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex items-center justify-between" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)" }}>
        <button onClick={goBack} className="flex items-center gap-2 text-white/90 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl hover:bg-white/20 transition-all" data-testid="button-ar-close">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-semibold">Back</span>
        </button>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white/90 text-xs font-semibold">AR LIVE</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-2 rounded-2xl">
          <Compass className="w-4 h-4 text-cyan-300" style={{ transform: `rotate(${-heading}deg)`, transition: "transform 0.3s ease" }} />
          <span className="text-white/70 text-[10px] font-mono">{Math.round(heading)}°</span>
        </div>
      </div>

      {/* Floating AR coupon banners */}
      {cameraReady && userPos && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          {nearbyCoupons.map((coupon, index) => {
            const angleDiff = ((coupon.bearing - heading + 540) % 360) - 180;
            const fov = 90;
            const xPercent = 50 + (angleDiff / fov) * 100;
            const inView = xPercent > 0 && xPercent < 100;
            if (!inView) return null;
            const maxDist = 30;
            const distFactor = Math.max(0.3, 1 - coupon.distance / maxDist);
            const yBase = 20 + (1 - distFactor) * 45 + (index % 3) * 5;
            const scale = 0.5 + distFactor * 0.5;
            const opacity = Math.min(1, distFactor + 0.3);

            return (
              <div
                key={coupon.id}
                className="absolute pointer-events-auto ar-float-banner"
                style={{
                  left: `${xPercent}%`,
                  top: `${Math.max(15, Math.min(75, yBase))}%`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  opacity,
                  transition: "left 0.5s ease, top 0.3s ease, opacity 0.4s ease, transform 0.3s ease",
                  animationDelay: `${index * 0.15}s`,
                  zIndex: Math.round(distFactor * 100),
                }}
                onClick={() => setSelectedCoupon(coupon)}
                data-testid={`ar-coupon-${coupon.id}`}
              >
                <div
                  className="relative flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer hover:scale-110 transition-transform"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(20,10,40,0.85) 100%)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(139,92,246,0.4)",
                    boxShadow: "0 0 24px rgba(139,92,246,0.25), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
                    minWidth: 200,
                  }}
                >
                  {/* Glow pulse */}
                  <div className="absolute -inset-1 rounded-2xl ar-glow-pulse" style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.15), transparent 70%)" }} />
                  {/* Shop logo */}
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/20">
                    {coupon.shop?.logo ? (
                      <img src={coupon.shop.logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center">
                        <Tag className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-white font-bold text-xs truncate">{coupon.shop?.name || "Shop"}</span>
                    <span className="text-cyan-300 font-black text-sm">{couponLabel(coupon)}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Navigation className="w-3 h-3 text-violet-300" />
                      <span className="text-violet-200/80 text-[10px] font-semibold">{coupon.distance < 1 ? `${Math.round(coupon.distance * 1000)}m` : `${coupon.distance.toFixed(1)}km`}</span>
                      <span className="text-white/30 text-[10px]">•</span>
                      <code className="text-amber-300 text-[10px] font-bold">{coupon.code}</code>
                    </div>
                  </div>
                  {/* Direction indicator */}
                  <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-0 h-0" style={{ borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: "8px solid rgba(139,92,246,0.5)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 z-50 p-4 pb-6" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)" }}>
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-300" />
            <span className="text-white/80 text-xs font-medium">
              {nearbyCoupons.length} offers nearby
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-white/50 text-[10px]">
            <span>Point camera around to discover offers</span>
          </div>
        </div>
        {!cameraReady && permissionState === "granted" && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-cyan-300 text-sm font-semibold">Starting AR Camera...</span>
          </div>
        )}
      </div>

      {/* Coupon detail overlay */}
      {selectedCoupon && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-6" onClick={() => setSelectedCoupon(null)}>
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
            {/* Banner image */}
            {(selectedCoupon.banner_image || selectedCoupon.shop?.banner_image) && (
              <div className="w-full h-40 overflow-hidden">
                <img
                  src={selectedCoupon.banner_image || selectedCoupon.shop?.banner_image || ""}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 top-0 h-40" style={{ background: "linear-gradient(180deg, transparent 50%, rgba(20,10,50,0.95) 100%)" }} />
              </div>
            )}
            <div className="p-5 flex flex-col gap-3">
              {/* Shop info */}
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

              {/* Coupon info */}
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

              {/* Distance */}
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

              {/* Close */}
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

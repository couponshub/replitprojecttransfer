import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Crown, MapPin, Phone, ShoppingCart, Tag, Copy, Check, Plus, Minus } from "lucide-react";
import type { Category, Shop, Product, Coupon } from "@shared/schema";

export default function ShopPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { addItem, items, updateQuantity } = useCart();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: shop, isLoading: shopLoading } = useQuery<Shop & { category?: Category }>({
    queryKey: [`/api/shops/${id}`],
  });

  const { data: shopProducts = [], isLoading: prodLoading } = useQuery<Product[]>({
    queryKey: [`/api/products?shopId=${id}`],
  });

  const { data: shopCoupons = [], isLoading: couponLoading } = useQuery<Coupon[]>({
    queryKey: [`/api/coupons?shopId=${id}`],
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: `Coupon code "${code}" copied!` });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getItemQuantity = (productId: string) => {
    return items.find(i => i.id === productId)?.quantity || 0;
  };

  const handleAddToCart = (product: Product) => {
    if (!isAuthenticated) {
      toast({ title: "Please sign in to add items to cart", variant: "destructive" });
      navigate("/login");
      return;
    }
    addItem({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price as string),
      image: product.image || undefined,
      shop_id: shop?.id || "",
      shopName: shop?.name || "",
    });
    toast({ title: `${product.name} added to cart` });
  };

  if (shopLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <Skeleton className="h-64 w-full rounded-3xl mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!shop) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1 as any)} className="mb-4 -ml-2" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <div className="relative h-56 sm:h-72 rounded-3xl overflow-hidden mb-6 bg-gradient-to-br from-blue-600 to-violet-700">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-8xl">{shop.name[0]}</span>
          </div>
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold">{shop.name}</h1>
              {shop.is_premium && (
                <Badge className="bg-amber-400 text-amber-900 gap-1 border-0">
                  <Crown className="w-3.5 h-3.5" /> Premium
                </Badge>
              )}
              {shop.featured && (
                <Badge className="bg-blue-500 text-white border-0">Featured</Badge>
              )}
            </div>
            {shop.category && (
              <Badge className="mt-2 bg-white/20 text-white border-0 backdrop-blur">{shop.category.name}</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-6">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-2">About</h2>
                <p className="text-gray-600 dark:text-gray-400">{shop.description || "No description available."}</p>
                {shop.address && (
                  <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>{shop.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {shop.whatsapp_number && (
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-6 flex flex-col gap-3">
                <h2 className="font-semibold text-gray-900 dark:text-white">Contact Shop</h2>
                <Button
                  className="bg-green-500 border-0 rounded-xl gap-2 text-white w-full"
                  onClick={() => window.open(`https://wa.me/${shop.whatsapp_number?.replace(/\D/g, "")}`, "_blank")}
                  data-testid="button-whatsapp"
                >
                  <Phone className="w-4 h-4" /> WhatsApp Us
                </Button>
                <p className="text-xs text-muted-foreground text-center">{shop.whatsapp_number}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {shopCoupons.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Active Coupons</h2>
              <Badge className="bg-primary/10 text-primary border-0">{shopCoupons.length}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {shopCoupons.map(coupon => (
                <div key={coupon.id} className="relative rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 p-0.5 shadow-lg" data-testid={`card-coupon-${coupon.id}`}>
                  <div className="rounded-[calc(1rem-2px)] bg-white dark:bg-gray-900 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-lg text-gray-900 dark:text-white">
                        {coupon.type === "percentage" ? `${coupon.value}% OFF`
                          : coupon.type === "flat" ? `₹${coupon.value} OFF`
                          : "FREE ITEM"}
                      </span>
                      <Badge className={`border-0 text-xs capitalize ${
                        coupon.type === "flash" ? "bg-orange-100 text-orange-700" :
                        coupon.type === "percentage" ? "bg-blue-100 text-blue-700" :
                        "bg-emerald-100 text-emerald-700"
                      }`}>
                        {coupon.type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2">
                      <code className="font-bold text-sm tracking-wider text-gray-900 dark:text-white">{coupon.code}</code>
                      <button onClick={() => copyCode(coupon.code)} className="text-primary" data-testid={`button-copy-coupon-${coupon.id}`}>
                        {copiedCode === coupon.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    {coupon.expiry_date && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Valid until {new Date(coupon.expiry_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Products</h2>
            <Badge className="bg-primary/10 text-primary border-0">{shopProducts.length}</Badge>
          </div>
          {prodLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
            </div>
          ) : shopProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">📦</div>
              <p className="text-muted-foreground">No products yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {shopProducts.map(product => {
                const qty = getItemQuantity(product.id);
                return (
                  <Card key={product.id} className="rounded-2xl border-0 shadow-md overflow-visible" data-testid={`card-product-${product.id}`}>
                    <div className="h-36 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-t-2xl flex items-center justify-center overflow-hidden">
                      <span className="text-5xl">{product.name[0]}</span>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">{product.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{product.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-base font-bold text-gray-900 dark:text-white">₹{parseFloat(product.price as string).toLocaleString()}</span>
                        {qty > 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(product.id, qty - 1)}
                              className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center"
                              data-testid={`button-decrease-${product.id}`}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-medium w-4 text-center">{qty}</span>
                            <button
                              onClick={() => handleAddToCart(product)}
                              className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center"
                              data-testid={`button-increase-${product.id}`}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAddToCart(product)}
                            className="rounded-xl h-8 px-3 text-xs bg-primary"
                            data-testid={`button-add-cart-${product.id}`}
                          >
                            Add
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

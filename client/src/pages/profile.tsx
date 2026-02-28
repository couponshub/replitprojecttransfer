import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Package, Mail, LogOut, ChevronRight, Clock, CheckCircle, Phone, MapPin, User, Edit2, Check, X } from "lucide-react";
import type { Order } from "@shared/schema";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: CheckCircle },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle },
};

export default function ProfilePage() {
  const [, navigate] = useLocation();
  const { user, logout, isAuthenticated, updateProfile } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "" });

  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders/my"],
    enabled: isAuthenticated,
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    toast({ title: "Logged out successfully" });
  };

  const handleEditStart = () => {
    setEditForm({ name: user?.name || "", phone: user?.phone || "", address: user?.address || "" });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editForm.name.trim()) { toast({ title: "Name cannot be empty", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await updateProfile({ name: editForm.name.trim(), phone: editForm.phone.trim() || undefined, address: editForm.address.trim() || undefined });
      toast({ title: "Profile updated!" });
      setEditing(false);
    } catch (e: any) {
      toast({ title: e.message || "Update failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    total: orders.length,
    completed: orders.filter(o => o.status === "completed").length,
    pending: orders.filter(o => o.status === "pending").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Hero card */}
        <div className="bg-gradient-to-br from-blue-600 to-violet-700 rounded-3xl p-8 mb-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl font-bold shrink-0">
              {user?.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{user?.name}</h1>
              <div className="flex items-center gap-1 mt-1 text-white/80">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="text-sm truncate">{user?.email}</span>
              </div>
              {user?.phone && (
                <div className="flex items-center gap-1 mt-1 text-white/80">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{user.phone}</span>
                </div>
              )}
              <Badge className="mt-2 bg-white/20 text-white border-0 capitalize">{user?.role}</Badge>
            </div>
            <button onClick={handleEditStart} className="shrink-0 p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors" data-testid="button-edit-profile">
              <Edit2 className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="relative grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/20">
            {[
              { label: "Total Orders", value: stats.total },
              { label: "Completed", value: stats.completed },
              { label: "Pending", value: stats.pending },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-white/60 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Profile Panel */}
        {editing && (
          <Card className="rounded-2xl border-0 shadow-md mb-6">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><User className="w-4 h-4 text-blue-500" /> Edit Profile</h3>
                <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" data-testid="button-cancel-edit">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name *</Label>
                  <Input
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="mt-1.5 rounded-xl"
                    placeholder="Your name"
                    data-testid="input-profile-name"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mobile Number</Label>
                  <div className="flex mt-1.5">
                    <span className="flex items-center px-3 bg-gray-100 dark:bg-gray-800 border border-r-0 border-gray-200 dark:border-gray-700 rounded-l-xl text-sm text-muted-foreground">+91</span>
                    <Input
                      value={editForm.phone}
                      onChange={e => setEditForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                      className="rounded-l-none rounded-r-xl border-l-0"
                      placeholder="9876543210"
                      type="tel"
                      data-testid="input-profile-phone"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Used for orders & WhatsApp delivery</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivery Address <span className="font-normal normal-case">(optional)</span></Label>
                  <Input
                    value={editForm.address}
                    onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                    className="mt-1.5 rounded-xl"
                    placeholder="e.g. Flat 3B, Ramachandra Rao Peta, Eluru"
                    data-testid="input-profile-address"
                  />
                </div>
                <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 border-0" data-testid="button-save-profile">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile details (read-only) */}
        {!editing && (user?.phone || user?.address) && (
          <Card className="rounded-2xl border-0 shadow-md mb-6">
            <CardContent className="p-5">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm uppercase tracking-wider text-muted-foreground">Contact Info</h3>
              <div className="flex flex-col gap-3">
                {user?.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mobile</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">+91 {user.phone}</p>
                    </div>
                  </div>
                )}
                {user?.address && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Address</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {!editing && !user?.phone && (
          <Card className="rounded-2xl border-0 shadow-md mb-6 border-dashed border-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Add your phone number</p>
                <p className="text-xs text-amber-700/70 dark:text-amber-400/70">Required for WhatsApp orders & delivery</p>
              </div>
              <Button onClick={handleEditStart} size="sm" className="rounded-xl bg-amber-500 hover:bg-amber-600 border-0 text-white" data-testid="button-add-phone">
                Add Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* My Orders */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Orders</h2>
          </div>
          {user?.role === "admin" && (
            <Button size="sm" onClick={() => navigate("/admin-dashboard")} variant="outline" className="rounded-xl" data-testid="button-admin-dashboard">
              Admin Dashboard
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-6">Start shopping to see your orders here</p>
            <Button onClick={() => navigate("/home")} className="rounded-xl" data-testid="button-start-shopping">
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map(order => {
              const status = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              const StatusIcon = status.icon;
              return (
                <Card key={order.id} className="rounded-2xl border-0 shadow-md" data-testid={`card-order-${order.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">
                            Order #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge className={`${status.color} border-0 gap-1 text-xs`}>
                          <StatusIcon className="w-3 h-3" /> {status.label}
                        </Badge>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 dark:text-white">₹{parseFloat(order.final_amount as string).toLocaleString()}</p>
                          {parseFloat(order.discount_amount as string) > 0 && (
                            <p className="text-xs text-emerald-600">Saved ₹{parseFloat(order.discount_amount as string).toFixed(0)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-8">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full h-12 rounded-2xl border-destructive/30 text-destructive gap-2"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}

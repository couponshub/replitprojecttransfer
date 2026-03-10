import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Zap, Eye, EyeOff, ArrowRight, Sparkles, Phone, Mail, Shield, Store } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CouponsHubLogo from "@assets/Screenshot_2026-03-10_232807_1773165569077.png";

export default function Login() {
  const [location, navigate] = useLocation();
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState<"login" | "register" | "admin" | "vendor">(
    location === "/vendor-login" ? "vendor" : location === "/admin-login" ? "admin" : "login"
  );
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error === "google_not_configured") {
      toast({ title: "Google login not enabled", description: "Admin has not configured Google OAuth credentials yet.", variant: "destructive" });
    } else if (error === "google_token_failed" || error === "google_failed") {
      toast({ title: "Google login failed", description: "Something went wrong. Please try email/phone login.", variant: "destructive" });
    } else if (error === "google_denied") {
      toast({ title: "Google login cancelled", description: "You declined the Google permission request." });
    }
    if (error) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const [loginForm, setLoginForm] = useState({ email: "", phone: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [adminForm, setAdminForm] = useState({ email: "", password: "" });
  const [vendorForm, setVendorForm] = useState({ email: "", password: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const credentials = loginMethod === "phone"
        ? { phone: loginForm.phone, password: loginForm.password }
        : { email: loginForm.email, password: loginForm.password };
      const user = await login(credentials);
      toast({ title: `Welcome back, ${user.name}!` });
      if (user.role === "admin") navigate("/admin-dashboard");
      else navigate("/home");
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerForm.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const user = await register({
        name: registerForm.name,
        email: registerForm.email,
        phone: registerForm.phone || undefined,
        password: registerForm.password,
      });
      toast({ title: `Welcome to CouponsHub X, ${user.name}!` });
      navigate("/home");
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVendorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/vendor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: vendorForm.email, password: vendorForm.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      localStorage.setItem("vendor_token", data.token);
      toast({ title: `Welcome, ${data.vendor.name}!` });
      navigate("/vendor-dashboard");
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login({ email: adminForm.email, password: adminForm.password });
      if (user.role !== "admin") {
        toast({ title: "This account does not have admin access", variant: "destructive" });
        return;
      }
      toast({ title: `Welcome back, Admin!` });
      navigate("/admin-dashboard");
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const PasswordToggle = () => (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
    >
      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
    </button>
  );

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-violet-600 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-400/10 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-12">
            <img src={CouponsHubLogo} alt="CouponsHub X" className="w-12 h-12 rounded-2xl object-contain" />
            <span className="text-2xl font-bold tracking-tight">CouponsHub X</span>
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Save more,<br />shop smarter.
          </h1>
          <p className="text-xl text-white/80 mb-10 leading-relaxed">
            Discover exclusive coupons, deals, and offers from thousands of top brands.
          </p>
          <div className="flex flex-col gap-4">
            {["Up to 40% off on Fashion", "Flash deals every hour", "Premium shop coupons"].map((feat, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-yellow-300" />
                </div>
                <span className="text-white/90">{feat}</span>
              </div>
            ))}
          </div>
          <div className="mt-16 grid grid-cols-3 gap-6">
            {[["10K+", "Shops"], ["50K+", "Coupons"], ["2M+", "Users"]].map(([n, l], i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-white">{n}</div>
                <div className="text-white/60 text-sm mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <img src={CouponsHubLogo} alt="CouponsHub X" className="w-10 h-10 rounded-xl object-contain" />
            <span className="font-bold text-xl text-gray-900 dark:text-white">CouponsHub X</span>
          </div>

          <Tabs value={tab} onValueChange={v => setTab(v as any)}>
            <TabsList className="w-full mb-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-1 grid grid-cols-4">
              <TabsTrigger value="login" className="rounded-xl text-xs sm:text-sm" data-testid="tab-login">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="rounded-xl text-xs sm:text-sm" data-testid="tab-register">Register</TabsTrigger>
              <TabsTrigger value="vendor" className="rounded-xl text-xs sm:text-sm" data-testid="tab-vendor">
                <Store className="w-3 h-3 mr-1" /> Vendor
              </TabsTrigger>
              <TabsTrigger value="admin" className="rounded-xl text-xs sm:text-sm" data-testid="tab-admin">
                <Shield className="w-3 h-3 mr-1" /> Admin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="border-0 shadow-xl rounded-3xl bg-white dark:bg-gray-900">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome back</h2>
                  <p className="text-muted-foreground mb-6">Sign in to access your account</p>

                  <div className="flex gap-2 mb-6">
                    <button
                      type="button"
                      onClick={() => setLoginMethod("email")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        loginMethod === "email"
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-gray-100 dark:bg-gray-800 text-muted-foreground"
                      }`}
                      data-testid="button-login-email"
                    >
                      <Mail className="w-4 h-4" /> Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginMethod("phone")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        loginMethod === "phone"
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-gray-100 dark:bg-gray-800 text-muted-foreground"
                      }`}
                      data-testid="button-login-phone"
                    >
                      <Phone className="w-4 h-4" /> Mobile
                    </button>
                  </div>

                  <form onSubmit={handleLogin} className="flex flex-col gap-5">
                    {loginMethod === "email" ? (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@example.com"
                          value={loginForm.email}
                          onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                          className="h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                          required
                          data-testid="input-login-email"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="login-phone">Mobile Number</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+91</span>
                          <Input
                            id="login-phone"
                            type="tel"
                            placeholder="9876543210"
                            value={loginForm.phone}
                            onChange={e => setLoginForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                            className="h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 pl-12"
                            required
                            data-testid="input-login-phone"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={loginForm.password}
                          onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                          className="h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 pr-12"
                          required
                          data-testid="input-login-password"
                        />
                        <PasswordToggle />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-blue-500 to-violet-600 border-0 mt-2"
                      data-testid="button-submit-login"
                    >
                      {loading ? "Signing in..." : (
                        <><span>Sign In</span><ArrowRight className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>
                  </form>
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs text-muted-foreground">or continue with</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <a
                    href="/api/auth/google"
                    className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    data-testid="button-google-login"
                  >
                    <SiGoogle className="w-4 h-4 text-[#4285F4]" />
                    Sign in with Google
                  </a>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card className="border-0 shadow-xl rounded-3xl bg-white dark:bg-gray-900">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create account</h2>
                  <p className="text-muted-foreground mb-6">Start saving with CouponsHub X</p>
                  <form onSubmit={handleRegister} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="reg-name">Full Name</Label>
                      <Input
                        id="reg-name"
                        placeholder="Your name"
                        value={registerForm.name}
                        onChange={e => setRegisterForm(f => ({ ...f, name: e.target.value }))}
                        className="h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        required
                        data-testid="input-register-name"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="reg-email">Email</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="you@example.com"
                        value={registerForm.email}
                        onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                        className="h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        required
                        data-testid="input-register-email"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="reg-phone">Mobile Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+91</span>
                        <Input
                          id="reg-phone"
                          type="tel"
                          placeholder="9876543210"
                          value={registerForm.phone}
                          onChange={e => setRegisterForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                          className="h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 pl-12"
                          data-testid="input-register-phone"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="reg-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="reg-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Min 6 characters"
                          value={registerForm.password}
                          onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
                          className="h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 pr-12"
                          required
                          data-testid="input-register-password"
                        />
                        <PasswordToggle />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-blue-500 to-violet-600 border-0 mt-2"
                      data-testid="button-submit-register"
                    >
                      {loading ? "Creating account..." : (
                        <><span>Create Account</span><ArrowRight className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>
                  </form>
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs text-muted-foreground">or sign up with</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <a
                    href="/api/auth/google"
                    className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    data-testid="button-google-register"
                  >
                    <SiGoogle className="w-4 h-4 text-[#4285F4]" />
                    Continue with Google
                  </a>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vendor">
              <Card className="border-0 shadow-xl rounded-3xl bg-white dark:bg-gray-900">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <Store className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor Login</h2>
                  </div>
                  <p className="text-muted-foreground mb-6">Access your shop dashboard</p>
                  <form onSubmit={handleVendorLogin} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="vendor-email">Vendor Email</Label>
                      <Input
                        id="vendor-email"
                        type="email"
                        placeholder="shopname@vendor.com"
                        value={vendorForm.email}
                        onChange={e => setVendorForm(f => ({ ...f, email: e.target.value }))}
                        className="h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        required
                        data-testid="input-vendor-email"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="vendor-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="vendor-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter vendor password"
                          value={vendorForm.password}
                          onChange={e => setVendorForm(f => ({ ...f, password: e.target.value }))}
                          className="h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 pr-12"
                          required
                          data-testid="input-vendor-password"
                        />
                        <PasswordToggle />
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Default password: Vendor@123</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">Email format: shopname@vendor.com</p>
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 border-0 mt-2"
                      data-testid="button-submit-vendor"
                    >
                      {loading ? "Signing in..." : (
                        <><span>Open Vendor Panel</span><ArrowRight className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admin">
              <Card className="border-0 shadow-xl rounded-3xl bg-white dark:bg-gray-900">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Login</h2>
                  </div>
                  <p className="text-muted-foreground mb-6">Access the admin dashboard</p>
                  <form onSubmit={handleAdminLogin} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="admin-email">Admin Email</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        placeholder="admin@marketplace.com"
                        value={adminForm.email}
                        onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))}
                        className="h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        required
                        data-testid="input-admin-email"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="admin-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="admin-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter admin password"
                          value={adminForm.password}
                          onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))}
                          className="h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 pr-12"
                          required
                          data-testid="input-admin-password"
                        />
                        <PasswordToggle />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-amber-500 to-orange-600 border-0 mt-2"
                      data-testid="button-submit-admin"
                    >
                      {loading ? "Signing in..." : (
                        <><span>Open Admin Panel</span><ArrowRight className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

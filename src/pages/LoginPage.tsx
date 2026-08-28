import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import logo from "@/assets/logo.png";
import bgImage from "@/assets/digital.jpg";
import { Loader2, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/supabase";
import { isStrongPassword, strongPasswordMessage } from "@/lib/password";
import ITHelpDeskWidget from "@/components/ITHelpDeskWidget";
import MobileAppPromo from "@/components/MobileAppPromo";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isUpdatePasswordMode, setIsUpdatePasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isBackgroundLoaded, setIsBackgroundLoaded] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Where to land after signing in: the `next` param from a deep link (e.g. a
  // dashboard link in a notification email), or the home page. Only same-site
  // absolute paths are honoured, never an external URL.
  const postLoginPath = (() => {
    const next = searchParams.get("next");
    return next && next.startsWith("/") && !next.startsWith("//") ? next : "/home";
  })();

  useEffect(() => {
    const image = new Image();
    image.src = bgImage;

    const markAsLoaded = () => setIsBackgroundLoaded(true);
    if (image.complete) {
      markAsLoaded();
    } else {
      image.addEventListener("load", markAsLoaded);
    }

    return () => image.removeEventListener("load", markAsLoaded);
  }, []);

  // Load saved email on startup if they selected "Remember Me" previously
  useEffect(() => {
    const wasDark = document.documentElement.classList.contains("dark");
    document.documentElement.classList.remove("dark");
    
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
    return () => { if (wasDark) document.documentElement.classList.add("dark"); };
  }, []);

  // Detect password recovery token in URL
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsUpdatePasswordMode(true);
        toast.info("Please set your new password.");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields!");
      return;
    }

    // Save or clear the email from local storage based on the checkbox
    if (rememberMe) {
      localStorage.setItem("rememberedEmail", email);
    } else {
      localStorage.removeItem("rememberedEmail");
    }

    const result = await login(email, password, rememberMe);
    if (result.success) {
      navigate(postLoginPath, { replace: true });
    } else {
      setError(result.error || "Unable to sign in. Please try again.");
    }
  };

  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!resetEmail) {
      setError("Please enter your email address to reset your password.");
      return;
    }
    
    setIsResetting(true);
    setError("");
    
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (resetError) throw resetError;
      toast.success("Password reset email sent! Please check your inbox.");
      setIsResetMode(false); // Go back to login view
    } catch (err: any) {
      console.error("Reset password error:", err);
      setError(err.message || "Failed to send reset email.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isStrongPassword(newPassword)) {
      setError(strongPasswordMessage);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsResetting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      toast.success("Password updated successfully! You can now continue.");
      setIsUpdatePasswordMode(false);
      navigate("/home", { replace: true });
    } catch (err: any) {
      console.error("Update password error:", err);
      setError(err.message || "Failed to update password.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto flex items-center justify-center p-4 py-8 relative bg-slate-900">
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ${isBackgroundLoaded ? "opacity-100" : "opacity-0"}`}
        style={{ backgroundImage: `url(${bgImage})` }}
        aria-hidden="true"
      />
      {/* Modern Centered Loading Overlay */}
      {isLoading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/45 p-4 backdrop-blur-md transition-all"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Signing in"
        >
          <div className="flex min-w-[260px] flex-col items-center gap-4 rounded-3xl border border-border/50 bg-background/70 px-7 py-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-base font-semibold text-foreground">
                Signing in…
              </p>
              <p className="text-sm text-muted-foreground">
                Verifying your account securely.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subtle dark overlay without blur to keep the background crisp */}
      <div className="absolute inset-0 bg-black/35 z-0"></div>

      <div className="w-full max-w-6xl relative z-10 flex flex-col-reverse items-center justify-center gap-8 lg:flex-row lg:items-center lg:gap-16">
        <MobileAppPromo />
        <div className="w-full max-w-md shrink-0">
        <div className="text-center mb-6">
          <img src={logo} alt="HICOM Diecasting" className="h-24 w-auto object-contain mx-auto mb-4 brightness-200" />
          <h1 className="text-4xl font-bold text-primary-foreground mb-1">Welcome to HDSB</h1>
          <h1 className="text-2xl font-bold text-primary-foreground">Management System</h1>
          <p className="text-nav-dark-foreground mt-1 text-sm">
            {isUpdatePasswordMode ? "Set your new password" : isResetMode ? "Reset your password" : "Sign in to your account"}
          </p>
        </div>

        <div className="bg-background/60 backdrop-blur-xl border border-border/50 shadow-2xl px-8 py-6 rounded-[2rem]">
          {isUpdatePasswordMode ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-10 pr-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    {showNewPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmNewPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Confirm new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="h-10 pr-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              
              <button 
                type="submit" 
                disabled={isResetting} 
                className="btn-gold w-full text-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 py-3 rounded-full shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
              >
                {isResetting ? "Updating..." : "Update Password"}
              </button>
            </form>
          ) : isResetMode ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail">Email Address for Password Reset</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email to receive a reset link"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow"
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              
              <button 
                type="submit" 
                disabled={isResetting} 
                className="btn-gold w-full text-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 py-3 rounded-full shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300">
                {isResetting ? "Sending..." : "Send Reset Link"}
              </button>
              <div className="text-center mt-4 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsResetMode(false); setError(""); }}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-describedby={error ? "login-error" : undefined}
                      className="h-10 pl-10 transition-shadow focus-visible:border-blue-500 focus-visible:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-describedby={error ? "login-error" : undefined}
                      className="h-10 pl-10 pr-10 transition-shadow focus-visible:border-blue-500 focus-visible:ring-blue-500"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex min-h-10 items-center justify-between gap-3 mt-1">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe} 
                      onCheckedChange={(checked) => setRememberMe(checked === true)} 
                      className="h-5 w-5 rounded-[3px] border-2 border-muted-foreground/60 data-[state=checked]:rounded-[3px] data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                    />
                    <Label htmlFor="remember" className="cursor-pointer select-none py-2 text-sm font-normal text-muted-foreground">
                      Remember me
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsResetMode(true); setResetEmail(email); setError(""); }}
                    disabled={isResetting}
                    className="shrink-0 text-sm font-semibold text-blue-500 hover:underline disabled:opacity-60"
                  >
                    Forgot Password?
                  </button>
                </div>
                {error && (
                  <p id="login-error" role="alert" aria-live="polite" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                
                <button 
                  type="submit" 
                  disabled={isLoading || isResetting} 
                  className="btn-gold w-full text-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 py-3 rounded-full shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
                >
                  Sign In
                </button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-5">
                Don't have an account?{" "}
                <Link to="/register" className="text-blue-500 font-bold hover:underline">
                  Register here
                </Link>
              </p>
            </>
          )}
          <div className="mt-6 text-xs text-muted-foreground text-center">
            <p>© 2026 HICOM Diecastings Sdn Bhd. All rights reserved.</p>

          </div>
        </div>
        </div>
      </div>
      <ITHelpDeskWidget />
    </div>
  );
};

export default LoginPage;

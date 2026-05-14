import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import logo from "@/assets/logo.png";
import bgImage from "@/assets/digital.jpg"; // <-- CHANGE THIS TO MATCH YOUR ACTUAL FILE
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/supabase";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isUpdatePasswordMode, setIsUpdatePasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  // Load saved email on startup if they selected "Remember Me" previously
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Detect password recovery token in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    if (searchParams.get("type") === "recovery" || (hash && hash.includes("type=recovery"))) {
      setIsUpdatePasswordMode(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsUpdatePasswordMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    // Save or clear the email from local storage based on the checkbox
    if (rememberMe) {
      localStorage.setItem("rememberedEmail", email);
    } else {
      localStorage.removeItem("rememberedEmail");
    }

    const success = await login(email, password, rememberMe);
    if (success) {
      // Check the stored user to determine their initial landing page
      const storedUser = localStorage.getItem("hr_user") || sessionStorage.getItem("hr_user");
      let userData = null;
      try {
        userData = storedUser && storedUser !== "undefined" ? JSON.parse(storedUser) : null;
      } catch (err) {
        console.error("Error parsing user data:", err);
        userData = null;
      }
      
      if (userData?.role === "hr_admin") {
        window.location.href = "/admin/hr";
      } else if (userData?.role === "finance_admin") {
        window.location.href = "/admin/finance";
      } else if (userData?.role === "security_guard") {
        window.location.href = "/admin/security";
      } else if (userData?.role === "hod" || userData?.role === "hos") {
        window.location.href = "/admin/approvals";
      } else if (userData?.role === "super_admin") {
        window.location.href = "/admin/users";
      } else {
        window.location.href = "/home";
      }
    } else {
      setError("Invalid credentials");
      setShowForgotPassword(true);
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
        redirectTo: `${window.location.origin}/login?type=recovery`, // Explicitly add recovery param
      });
      if (resetError) throw resetError;
      toast.success("Password reset email sent! Please check your inbox.");
      setShowForgotPassword(false); // Hide the button after success
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
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
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
      window.location.href = "/home";
    } catch (err: any) {
      console.error("Update password error:", err);
      setError(err.message || "Failed to update password.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div 
      className="h-screen overflow-hidden flex items-center justify-center p-4 relative"
      style={{ 
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      {/* Modern Centered Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-md transition-all">
          <div className="flex flex-col items-center gap-5 bg-background/60 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-border/50 animate-in fade-in zoom-in duration-300">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="space-y-1 text-center">
              <p className="text-lg font-semibold text-foreground animate-pulse">
                Signing In
              </p>
              <p className="text-sm text-muted-foreground">
                Please wait a moment...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subtle dark overlay without blur to keep the background crisp */}
      <div className="absolute inset-0 bg-black/35 z-0"></div>

      <div className="w-full max-w-md relative z-10">
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
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow"
                  required
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              
              <button 
                type="submit" 
                disabled={isResetting} 
                className="btn-gold w-full text-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
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
                className="btn-gold w-full text-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
              >
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
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow"
                  />
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <Checkbox 
                    id="remember" 
                    checked={rememberMe} 
                    onCheckedChange={(checked) => setRememberMe(checked === true)} 
                  />
                  <Label htmlFor="remember" className="text-sm font-normal cursor-pointer text-muted-foreground">
                    Remember me on this device
                  </Label>
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                
                {showForgotPassword && (
                  <div className="text-center mt-1">
                    <button
                      type="button"
                      onClick={() => { setIsResetMode(true); setResetEmail(email); setError(""); }}
                      disabled={isResetting}
                      className="text-sm text-blue-500 font-semibold hover:underline"
                    >
                      Forgot your password? Click here to reset
                    </button>
                  </div>
                )}
                
                <button 
                  type="submit" 
                  disabled={isLoading || isResetting} 
                  className="btn-gold w-full text-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            <p className="font-medium text-foreground/80 mb-1">Management System v2.4</p>
            <p>© 2026 HICOM Diecastings Sdn Bhd. All rights reserved.</p>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

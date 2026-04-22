import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";
import { Loader2 } from "lucide-react";
import bgImage from "@/assets/digital.jpg"; // <-- CHANGE THIS TO MATCH YOUR ACTUAL FILE
import { toast } from "sonner";
import { supabase } from "@/supabase";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const RegisterPage = () => {
  const [form, setForm] = useState({ name: "", email: "", employeeId: "", phone: "", department: "", position: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [step, setStep] = useState<"register" | "verify">("register");
  const [isVerifying, setIsVerifying] = useState(false);
  const { register, login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.employeeId || !form.phone || !form.password) {
      setError("Please fill in all required fields");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Domain Validation: Currently OPEN to all domains (including personal emails).
    // To restrict to specific official domains later, uncomment the block below:
    /*
    const allowedDomains = ["hidsb.com", "drb-hicom.com"];
    const emailDomain = form.email.split("@")[1];
    
    if (!emailDomain || !allowedDomains.includes(emailDomain.toLowerCase())) {
      setError("Please use an official registered email address (e.g., john@hidsb.com).");
      return;
    }
    */

    const success = await register(form);
    if (success) {
      toast.success("Verification code sent! Please check your email.");
      setStep("verify");
    } else {
      setError("Failed to create account. Please try again.");
    }
  };

  const handleVerifyOTP = async (code: string) => {
    // Wait until they type exactly 8 digits
    if (code.length !== 8) return;
    
    setIsVerifying(true);
    setError("");

    // Verify the OTP against Supabase
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: form.email,
      token: code,
      type: "signup",
    });

    if (verifyError) {
      setError(verifyError.message);
      setIsVerifying(false);
      return;
    }

    // Save all user details to the public 'users' table so it appears in the Table Editor
    if (data?.user) {
      const { error: dbError } = await supabase.from("users").insert([
        {
          id: data.user.id,
          name: form.name,
          email: form.email,
          employeeId: form.employeeId,
          phone: form.phone,
          department: form.department,
          position: form.position,
          role: "employee", // Default role for new signups
          createdAt: new Date().toISOString(),
        },
      ]);

      if (dbError) {
        console.error("Error saving user to database:", dbError);
      }
    }

    // Establish the session in AuthContext & safely save the profile
    await login(form.email, form.password, true);

    // Success! Supabase automatically establishes the session.
    toast.success("Account verified successfully!");
    navigate("/home");
  };

  return (
    <div 
      className="min-h-screen overflow-y-auto flex items-center justify-center p-4 py-12 relative"
      style={{ 
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      {/* Modern Centered Loading Overlay for Verification */}
      {isVerifying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-md transition-all">
          <div className="flex flex-col items-center gap-5 bg-background/60 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-border/50 animate-in fade-in zoom-in duration-300">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="space-y-1 text-center">
              <p className="text-lg font-semibold text-foreground animate-pulse">
                Verifying Code
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
          <h1 className="text-3xl font-bold text-primary-foreground mb-1">Create Account</h1>
          <p className="text-nav-dark-foreground mt-1 text-sm">Join the HDSB Management System</p>
        </div>

        <div className="bg-background/60 backdrop-blur-xl border border-border/50 shadow-2xl px-8 py-6 rounded-[2rem]">
          {step === "register" ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                  <Input id="name" value={form.name} onChange={e => handleChange("name", e.target.value)} placeholder="Enter your full name" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email Address <span className="text-destructive">*</span></Label>
                  <Input id="reg-email" type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} placeholder="john@hidsb.com" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Staff ID <span className="text-destructive">*</span></Label>
                    <Input id="employeeId" value={form.employeeId} onChange={e => handleChange("employeeId", e.target.value)} placeholder="e.g. EMP-123" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone No. <span className="text-destructive">*</span></Label>
                    <Input id="phone" value={form.phone} onChange={e => handleChange("phone", e.target.value)} placeholder="01x-xxxxxxx" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" value={form.department} onChange={e => handleChange("department", e.target.value)} placeholder="e.g. Engineering" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input id="position" value={form.position} onChange={e => handleChange("position", e.target.value)} placeholder="e.g. Executive" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password <span className="text-destructive">*</span></Label>
                    <Input id="reg-password" type="password" value={form.password} onChange={e => handleChange("password", e.target.value)} placeholder="Password" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password <span className="text-destructive">*</span></Label>
                    <Input id="confirm-password" type="password" value={form.confirmPassword} onChange={e => handleChange("confirmPassword", e.target.value)} placeholder="Confirm" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                  </div>
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="btn-gold w-full text-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating Account...</>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>
            <p className="text-center text-sm text-muted-foreground mt-5">
                Already have an account?{" "}
                <Link to="/login" className="text-blue-500 font-bold hover:underline">Sign in</Link>
              </p>
            <div className="mt-6 text-xs text-muted-foreground text-center">
                <p className="font-medium text-foreground/80 mb-1">Management System v2.4</p>
                <p>© 2026 HICOM Diecastings Sdn Bhd. All rights reserved.</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-6 text-center py-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Check your email</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  We've sent an 8-digit verification code to<br/>
                  <span className="font-bold text-foreground">{form.email}</span>
                </p>
              </div>

              <InputOTP 
                maxLength={8} 
                disabled={isVerifying}
                onChange={(val) => {
                  if(val.length === 8) handleVerifyOTP(val);
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                  <InputOTPSlot index={6} />
                  <InputOTPSlot index={7} />
                </InputOTPGroup>
              </InputOTP>

              {error && <p className="text-destructive text-sm">{error}</p>}
              
              <button 
                onClick={() => { setStep("register"); setError(""); }} 
                className="text-sm text-blue-500 font-bold hover:underline mt-4"
                disabled={isVerifying}
              >
                Entered the wrong email? Go back
              </button>
              <div className="mt-8 text-xs text-muted-foreground text-center w-full pt-4 border-t border-border/50">
                <p className="font-medium text-foreground/80 mb-1">Management System v2.4</p>
                <p>© 2026 HICOM Diecastings Sdn Bhd. All rights reserved.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

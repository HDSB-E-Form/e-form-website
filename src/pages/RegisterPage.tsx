import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";
import bgImage from "@/assets/digital.jpg";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RegisterPage = () => {
  const [form, setForm] = useState({ name: "", email: "", employeeId: "", phone: "", department: "", position: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const passwordChecks = {
    length: form.password.length >= 8,
    lowercase: /[a-z]/.test(form.password),
    uppercase: /[A-Z]/.test(form.password),
    number: /\d/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
  };
  const passwordScore = Object.values(passwordChecks).filter(Boolean).length;
  const passwordStrength = form.password.length === 0
    ? null
    : passwordScore <= 2
      ? { label: "Weak", color: "bg-destructive", text: "text-destructive", bars: 1 }
      : passwordScore <= 4
        ? { label: "Moderate", color: "bg-amber-500", text: "text-amber-600", bars: 2 }
        : { label: "Strong", color: "bg-emerald-500", text: "text-emerald-600", bars: 3 };

  useEffect(() => {
    const wasDark = document.documentElement.classList.contains("dark");
    document.documentElement.classList.remove("dark");

    const fetchDepartments = async () => {
      const { data, error } = await supabase.from("departments").select("name").order("name");
      if (data) {
        setDepartmentsList(data.map((d: any) => d.name));
      }
      if (error) setError("Unable to load departments. Please refresh and try again.");
      setIsLoadingDepartments(false);
    };
    fetchDepartments();
    return () => { if (wasDark) document.documentElement.classList.add("dark"); };
  }, []);

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.employeeId || !form.department || !form.password) {
      setError("Please fill in all required fields!");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

      setIsRegistering(true);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: {
            name: form.name,
            employeeId: form.employeeId,
            department: form.department,
            phone: form.phone,
            position: form.position,
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsRegistering(false);
      return;
    }

      const pendingProfile = {
        email: form.email.trim().toLowerCase(), name: form.name.trim(), employeeId: form.employeeId.trim(),
        department: form.department, phone: form.phone.trim(), position: form.position.trim(),
      };
      sessionStorage.setItem("hdsb_pending_registration", JSON.stringify(pendingProfile));
      toast.success("Registration successful! Please check your email for a verification code.");
      navigate("/verify-otp", { state: pendingProfile });
      setIsRegistering(false);
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
      {/* Subtle dark overlay without blur to keep the background crisp */}
      <div className="absolute inset-0 bg-black/35 z-0"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <img src={logo} alt="HICOM Diecasting" className="h-24 w-auto object-contain mx-auto mb-4 brightness-200" />
          <h1 className="text-3xl font-bold text-primary-foreground mb-1">Create Account</h1>
          <p className="text-nav-dark-foreground mt-1 text-sm">Join the HDSB Management System</p>
        </div>

        <div className="bg-background/60 backdrop-blur-xl border border-border/50 shadow-2xl px-8 py-6 rounded-[2rem]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                  <Input id="name" autoComplete="name" value={form.name} onChange={e => handleChange("name", e.target.value)} placeholder="Enter your full name" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email Address <span className="text-destructive">*</span></Label>
                  <Input id="reg-email" type="email" autoComplete="email" value={form.email} onChange={e => handleChange("email", e.target.value)} placeholder="name@company.com" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Staff ID <span className="text-destructive">*</span></Label>
                    <Input id="employeeId" autoComplete="off" value={form.employeeId} onChange={e => handleChange("employeeId", e.target.value)} placeholder="Enter staff ID" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="phone">Phone No. <span className="text-muted-foreground text-[10px] font-normal ml-1">(Optional)</span></Label>
                    <Input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={e => handleChange("phone", e.target.value)} placeholder="01x-xxxxxxx" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department <span className="text-destructive">*</span></Label>
                    <Select value={departmentsList.includes(form.department) ? form.department : undefined} onValueChange={val => handleChange("department", val)}>
                      <SelectTrigger disabled={isLoadingDepartments || departmentsList.length === 0} className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow">
                        <SelectValue placeholder={isLoadingDepartments ? "Loading departments…" : "Select Department"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {departmentsList.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="position">Position <span className="text-muted-foreground text-[10px] font-normal ml-1">(Optional)</span></Label>
                    <Input id="position" value={form.position} onChange={e => handleChange("position", e.target.value)} placeholder="e.g. Executive" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password <span className="text-destructive">*</span></Label>
                    <div className="relative"><Input id="reg-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={e => handleChange("password", e.target.value)} placeholder="At least 6 characters" className="h-10 pr-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button></div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password <span className="text-destructive">*</span></Label>
                    <div className="relative"><Input id="confirm-password" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={form.confirmPassword} onChange={e => handleChange("confirmPassword", e.target.value)} placeholder="Confirm password" className="h-10 pr-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" /><button type="button" aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"} onClick={() => setShowConfirmPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button></div>
                  </div>
                </div>
                {passwordStrength && (
                  <div className="rounded-xl border border-border bg-muted/20 p-3" aria-live="polite">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-foreground">Password strength</p>
                      <p className={`text-xs font-bold ${passwordStrength.text}`}>{passwordStrength.label}</p>
                    </div>
                    <div className="mb-2.5 grid grid-cols-3 gap-1.5">
                      {[1, 2, 3].map(bar => <span key={bar} className={`h-1.5 rounded-full ${bar <= passwordStrength.bars ? passwordStrength.color : "bg-muted"}`} />)}
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Use at least 8 characters with uppercase and lowercase letters, a number, and a special character such as @, #, or $.
                    </p>
                  </div>
                )}
                {error && <p className="text-destructive text-sm">{error}</p>}
                <button 
                  type="submit" 
                  disabled={isRegistering || isLoadingDepartments || departmentsList.length === 0}
              className="btn-gold w-full text-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 py-3 rounded-full shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
                >
                  {isRegistering ? (
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
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

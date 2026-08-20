import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";
import bgImage from "@/assets/digital.jpg";
import { BellRing, CheckCircle2, Eye, EyeOff, FileCheck2, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ITHelpDeskWidget from "@/components/ITHelpDeskWidget";

const RegisterPage = () => {
  const [form, setForm] = useState({ name: "", email: "", employeeId: "", phone: "", department: "", position: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const passwordMeetsMinimum = form.password.length >= 8;
  const confirmationEntered = form.confirmPassword.length > 0;
  const passwordsMatch = confirmationEntered && form.password === form.confirmPassword;
  const passwordStrengthScore = form.password
    ? [
        passwordMeetsMinimum,
        form.password.length >= 12,
        /[A-Z]/.test(form.password) && /[a-z]/.test(form.password),
        /\d/.test(form.password) || /[^A-Za-z0-9]/.test(form.password),
      ].filter(Boolean).length
    : 0;
  const passwordStrength =
    passwordStrengthScore <= 1
      ? { label: "Weak", color: "bg-destructive", textColor: "text-destructive" }
      : passwordStrengthScore <= 2
        ? { label: "Fair", color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400" }
        : passwordStrengthScore === 3
          ? { label: "Good", color: "bg-cyan-500", textColor: "text-cyan-600 dark:text-cyan-400" }
          : { label: "Strong", color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400" };

  useEffect(() => {
    const wasDark = document.documentElement.classList.contains("dark");
    document.documentElement.classList.remove("dark");

    const fetchDepartments = async () => {
      const { data, error } = await supabase.from("departments").select("name").order("name");
      if (data) {
        setDepartmentsList(data.map(d => d.name));
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
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
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

      // Supabase returns a 200 with no identities (and sends no email) when the
      // address already belongs to a confirmed account, to avoid leaking which
      // emails are registered. Without this check the form would tell the user
      // to check their inbox for a code that will never arrive.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setError("This email is already registered. Please log in instead, or use \"Forgot password\" on the sign-in page.");
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
    <div className="relative min-h-screen overflow-y-auto bg-gradient-to-br from-[#40358f] via-[#5146a4] to-[#7768c4] p-3 sm:p-5 lg:flex lg:items-center lg:justify-center">
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-7xl overflow-hidden rounded-3xl bg-background shadow-2xl shadow-indigo-950/30 sm:min-h-[calc(100vh-2.5rem)] lg:h-[min(920px,calc(100vh-2.5rem))] lg:min-h-0 lg:grid-cols-[42%_58%]">
        <aside className="relative flex overflow-hidden lg:flex-col lg:justify-start">
          <img src={bgImage} alt="" className="absolute inset-0 h-full w-full object-cover" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#282063]/95 via-[#40358f]/92 to-[#5b4daf]/88" />
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-white/10" />

          <div className="relative z-10 w-full p-6 sm:p-8 lg:p-10 lg:pt-8 xl:p-12 xl:pt-9">
            <img src={logo} alt="HICOM Diecasting" className="mx-auto h-16 w-auto object-contain brightness-200 sm:h-20 lg:h-24" />
            <div className="mx-auto mt-6 max-w-md text-white lg:mx-0 lg:mt-7">
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">Welcome to HDSB Management System</h1>
              <p className="mt-3 text-sm leading-6 text-white/80 lg:mt-4 lg:leading-7">Create your staff account to submit company forms, follow approval progress, and access your records securely from one place.</p>
              <div className="mt-5 space-y-3 text-sm font-medium text-white/90 lg:mt-6 lg:space-y-4">
                <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-white/75" /><span>Submit departmental forms digitally</span></div>
                <div className="flex items-center gap-3"><FileCheck2 className="h-5 w-5 shrink-0 text-white/75" /><span>Track requests and approval progress</span></div>
                <div className="flex items-center gap-3"><BellRing className="h-5 w-5 shrink-0 text-white/75" /><span>Receive timely status updates</span></div>
                <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-white/75" /><span>Access company records securely</span></div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-h-0 min-w-0 overflow-y-auto bg-background px-5 py-7 sm:px-8 sm:py-9 lg:px-10 xl:px-14">
          <div className="mx-auto max-w-2xl">
            <div className="mb-7 text-center lg:text-left">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Create Your Account</h2>
            </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                  <Input id="name" autoComplete="name" value={form.name} onChange={e => handleChange("name", e.target.value)} placeholder="Enter your full name" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email Address <span className="text-destructive">*</span></Label>
                  <div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id="reg-email" type="email" autoComplete="email" value={form.email} onChange={e => handleChange("email", e.target.value)} placeholder="name@company.com" className="h-10 pl-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Staff ID <span className="text-destructive">*</span></Label>
                    <Input id="employeeId" autoComplete="off" value={form.employeeId} onChange={e => handleChange("employeeId", e.target.value)} placeholder="Enter staff ID" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="phone">Phone No.</Label>
                    <Input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={e => handleChange("phone", e.target.value)} placeholder="Enter phone number" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
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
                  <Label htmlFor="position">Position</Label>
                    <Input id="position" value={form.position} onChange={e => handleChange("position", e.target.value)} placeholder="e.g. Executive" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password <span className="text-destructive">*</span></Label>
                    <div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id="reg-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={e => handleChange("password", e.target.value)} placeholder="At least 8 characters" className="h-10 pl-10 pr-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button></div>
                    {form.password && (
                      <div className="space-y-1.5 pt-1" aria-live="polite">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Password strength</span>
                          <span className={`font-semibold ${passwordStrength.textColor}`}>{passwordStrength.label}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                          {[1, 2, 3, 4].map(level => (
                            <span
                              key={level}
                              className={`h-1.5 rounded-full transition-colors ${
                                level <= passwordStrengthScore ? passwordStrength.color : "bg-muted"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <p className={`flex items-center gap-1.5 text-xs ${passwordMeetsMinimum ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${passwordMeetsMinimum ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
                      At least 8 characters
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password <span className="text-destructive">*</span></Label>
                    <div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id="confirm-password" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={form.confirmPassword} onChange={e => handleChange("confirmPassword", e.target.value)} placeholder="Confirm password" className="h-10 pl-10 pr-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" /><button type="button" aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"} onClick={() => setShowConfirmPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button></div>
                    {confirmationEntered && (
                      <p
                        className={`flex items-center gap-1.5 text-xs font-medium ${
                          passwordsMatch
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        }`}
                        aria-live="polite"
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${passwordsMatch ? "bg-emerald-500" : "bg-destructive"}`} />
                        {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                      </p>
                    )}
                  </div>
                </div>
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
                <p>© 2026 HICOM Diecastings Sdn Bhd. All rights reserved.</p>
              </div>
          </div>
        </main>
      </div>
      <ITHelpDeskWidget />
    </div>
  );
};

export default RegisterPage;

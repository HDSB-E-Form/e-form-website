import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";
import bgImage from "@/assets/digital.jpg";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RegisterPage = () => {
  const [form, setForm] = useState({ name: "", email: "", employeeId: "", phone: "", department: "", position: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Force light mode for auth pages to maintain a clean, standard look against the background image
    document.documentElement.classList.remove("dark");

    const fetchDepartments = async () => {
      const { data } = await supabase.from("departments").select("name").order("name");
      if (data) {
        setDepartmentsList(data.map((d: any) => d.name));
      }
    };
    fetchDepartments();
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

      setIsRegistering(true);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
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

      toast.success("Account created successfully! Please log in.");
      navigate("/login");
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
                  <Input id="name" value={form.name} onChange={e => handleChange("name", e.target.value)} placeholder="Enter your full name" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email Address <span className="text-destructive">*</span></Label>
                  <Input id="reg-email" type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} placeholder="sara@hidsb.com" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Staff ID <span className="text-destructive">*</span></Label>
                    <Input id="employeeId" value={form.employeeId} onChange={e => handleChange("employeeId", e.target.value)} placeholder="e.g. 100202" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="phone">Phone No. <span className="text-muted-foreground text-[10px] font-normal ml-1">(Optional)</span></Label>
                    <Input id="phone" value={form.phone} onChange={e => handleChange("phone", e.target.value)} placeholder="01x-xxxxxxx" className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department <span className="text-destructive">*</span></Label>
                    <Select value={departmentsList.includes(form.department) ? form.department : undefined} onValueChange={val => handleChange("department", val)}>
                      <SelectTrigger className="h-10 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow">
                        <SelectValue placeholder="Select Department" />
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
                  disabled={isRegistering}
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

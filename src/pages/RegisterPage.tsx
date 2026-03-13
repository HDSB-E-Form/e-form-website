import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";

const RegisterPage = () => {
  const [form, setForm] = useState({ name: "", email: "", department: "", position: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password) {
      setError("Please fill in all required fields");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    const success = await register(form);
    if (success) navigate("/home");
  };

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logo} alt="DRB-HICOM" className="h-16 mx-auto mb-4 brightness-200" />
          <h1 className="text-2xl font-bold text-primary-foreground">Create Account</h1>
          <p className="text-nav-dark-foreground mt-1 text-sm">Join the HR Management System</p>
        </div>

        <div className="card-elevated p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" value={form.name} onChange={e => handleChange("name", e.target.value)} placeholder="Enter your full name" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email Address *</Label>
              <Input id="reg-email" type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} placeholder="your.email@drb-hicom.com" className="h-11" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" value={form.department} onChange={e => handleChange("department", e.target.value)} placeholder="e.g. Engineering" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input id="position" value={form.position} onChange={e => handleChange("position", e.target.value)} placeholder="e.g. Engineer" className="h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Password *</Label>
              <Input id="reg-password" type="password" value={form.password} onChange={e => handleChange("password", e.target.value)} placeholder="Create a password" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password *</Label>
              <Input id="confirm-password" type="password" value={form.confirmPassword} onChange={e => handleChange("confirmPassword", e.target.value)} placeholder="Confirm password" className="h-11" />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <button type="submit" className="btn-gold w-full text-sm">Create Account</button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-accent font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

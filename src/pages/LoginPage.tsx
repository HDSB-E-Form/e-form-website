import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    const success = await login(email, password);
    if (success) {
      navigate("/home");
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logo} alt="DRB-HICOM" className="h-16 mx-auto mb-4 brightness-200" />
          <h1 className="text-2xl font-bold text-primary-foreground">HR Management System</h1>
          <p className="text-nav-dark-foreground mt-1 text-sm">Sign in to your account</p>
        </div>

        <div className="card-elevated p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@drb-hicom.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
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
                className="h-11"
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <button type="submit" className="btn-gold w-full text-sm">
              Sign In
            </button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-accent font-medium hover:underline">
              Register here
            </Link>
          </p>
          <div className="mt-4 p-3 rounded-lg bg-muted text-xs text-muted-foreground">
            <p className="font-medium mb-1">Demo accounts:</p>
            <p>employee@drb.com · hod@drb.com · hr@drb.com · finance@drb.com</p>
            <p className="mt-1">Password: any value</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

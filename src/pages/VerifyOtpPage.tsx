import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/supabase";
import { OTPInput, SlotProps } from "input-otp";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import bgImage from "@/assets/digital.jpg";
import { Loader2 } from "lucide-react";

function Slot(props: SlotProps) {
  return (
    <div
      className={cn(
        'relative w-10 h-14 text-[2rem]',
        'flex items-center justify-center',
        'transition-all duration-300',
        'border-border border-y border-r first:border-l first:rounded-l-md last:rounded-r-md',
        'group-hover:border-accent-foreground/20 group-focus-within:border-accent-foreground/20',
        'outline outline-0 outline-accent-foreground/20',
        { 'outline-4 outline-accent-foreground': props.isActive },
      )}
    >
      <div className="group-has-[input[data-input-otp-placeholder-shown]]:opacity-20">
        {props.char ?? <div className="w-3 h-1 rounded-full bg-border" />}
      </div>
      {props.hasFakeCaret && <div className="absolute pointer-events-none inset-0 flex items-center justify-center animate-caret-blink"><div className="w-px h-8 bg-foreground" /></div>}
    </div>
  );
}

// Inspired by Stripe's MFA input.
function FakeDash() {
  return (
    <div className="flex w-10 justify-center items-center">
      <div className="w-3 h-1 rounded-full bg-border" />
    </div>
  );
}

const VerifyOtpPage = () => {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const storedRegistration = (() => {
    try { return JSON.parse(sessionStorage.getItem("hdsb_pending_registration") || "null"); } catch { return null; }
  })();
  const registrationData = location.state || storedRegistration;
  const email = registrationData?.email;
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const wasDark = document.documentElement.classList.contains("dark");
    document.documentElement.classList.remove("dark");
    if (!email) {
      toast.error("No email address provided. Redirecting to register.");
      navigate("/register");
    }
    return () => { if (wasDark) document.documentElement.classList.add("dark"); };
  }, [email, navigate]);

  // Timer effect for resend cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }
    setIsVerifying(true);

    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email: email,
      token: otp,
      type: 'signup',
    });

    if (verifyError) {
      setError(verifyError.message);
      toast.error(verifyError.message);
      setIsVerifying(false);
    } else {
      // OTP is correct, now create the user profile in the public.users table
      if (verifyData.user) {
        const metadata = verifyData.user.user_metadata || {};
        const profileData = registrationData || {
          email: verifyData.user.email,
          name: metadata.name,
          employeeId: metadata.employeeId,
          department: metadata.department,
          phone: metadata.phone,
          position: metadata.position,
        };
        if (!profileData?.name || !profileData?.employeeId || !profileData?.department) {
          setError("Email verification succeeded, but required profile information is missing. Please contact an administrator.");
          setIsVerifying(false);
          return;
        }

        const { data: existingProfile } = await supabase.from('users').select('id').eq('id', verifyData.user.id).maybeSingle();
        const { error: profileError } = existingProfile ? { error: null } : await supabase.from('users').insert({
          id: verifyData.user.id,
          email: profileData.email || verifyData.user.email,
          name: profileData.name,
          employeeId: profileData.employeeId,
          department: profileData.department,
          phone: profileData.phone || "",
          position: profileData.position || "",
          role: 'employee', // Default role
        });

        if (profileError) {
          setError(`Verification successful, but failed to create profile: ${profileError.message}`);
          toast.error(`Verification successful, but failed to create profile: ${profileError.message}`);
        } else {
          sessionStorage.removeItem("hdsb_pending_registration");
          toast.success("Email confirmed successfully! You can now log in.");
          navigate("/login");
        }
      } else {
        setError("Could not verify the user account. Please try again.");
        toast.error("Could not verify the user account. Please try again.");
      }
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (isResending || cooldown > 0 || !email) return;
    setIsResending(true);
    setError("");

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (resendError) {
      toast.error(resendError.message);
      setError(resendError.message);
    } else {
      toast.success("A new verification code has been sent to your email.");
      setCooldown(60); // Start 60-second cooldown
    }
    setIsResending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0 bg-black/35 z-0"></div>
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <img src={logo} alt="HICOM Diecasting" className="h-24 w-auto object-contain mx-auto mb-4 brightness-200" />
          <h1 className="text-3xl font-bold text-primary-foreground mb-1">Verify Your Email</h1>
          <p className="text-nav-dark-foreground mt-1 text-sm">Enter the 6-digit code sent to <strong>{email}</strong></p>
        </div>

        <div className="bg-background/60 backdrop-blur-xl border border-border/50 shadow-2xl px-8 py-10 rounded-[2rem]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center">
              <OTPInput
                maxLength={6}
                value={otp}
                onChange={setOtp}
                containerClassName="group flex items-center has-[:disabled]:opacity-30"
                render={({ slots }) => (
                  <>
                    <div className="flex">
                      {slots.slice(0, 3).map((slot, idx) => <Slot key={idx} {...slot} />)}
                    </div>
                    <FakeDash />
                    <div className="flex">
                      {slots.slice(3).map((slot, idx) => <Slot key={idx} {...slot} />)}
                    </div>
                  </>
                )}
              />
            </div>
            {error && <p className="text-destructive text-sm text-center">{error}</p>}
            <button type="submit" disabled={isVerifying} className="btn-gold w-full text-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 py-3 rounded-full shadow-md hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300">
              {isVerifying ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : "Verify Account"}
            </button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-5">
            Didn't get a code?{" "}
            <button onClick={handleResendOtp} disabled={isResending || cooldown > 0} className="text-blue-500 font-bold hover:underline disabled:text-muted-foreground disabled:cursor-not-allowed disabled:no-underline">
              {isResending ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtpPage;

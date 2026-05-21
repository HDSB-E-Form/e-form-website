import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Scale, Droplet, Layers, XCircle } from "lucide-react";
import safetyPoster from "@/assets/safety_poster.png";

const SafetyFormsPage = () => {
  const navigate = useNavigate();
  const [posterConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("hdsb_safety_poster_config") || "null") || { enabled: true, url: null };
    } catch {
      return { enabled: true, url: null };
    }
  });
  const [showPoster, setShowPoster] = useState(posterConfig.enabled);

  return (
    <>
      {/* Safety Awareness Popup Poster */}
      {showPoster && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowPoster(false)}>
          <div className="relative max-w-2xl w-full animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowPoster(false)} 
              className="absolute -top-3 -right-3 sm:-top-5 sm:-right-5 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-1 transition-colors z-10 shadow-lg"
              title="Close Poster"
            >
              <XCircle className="h-8 w-8" />
            </button>
            <img src={posterConfig.url || safetyPoster} alt="Safety Awareness Poster" className="w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20" />
          </div>
        </div>
      )}

      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <button onClick={() => navigate("/home")} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Home
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Safety Department</h1>
        <p className="text-muted-foreground mt-1">Select a form to submit</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div
          onClick={() => navigate("/safety/mixing")}
          className="dept-card group"
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-5">
            <Layers className="h-7 w-7 text-white" strokeWidth={3} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Mixing & Chemical Stages</h2>
          <p className="text-muted-foreground text-sm">Submit mixing & chemical stages records</p>
          <div className="mt-5 text-accent font-medium text-sm group-hover:translate-x-1 transition-transform">
            Open Form →
          </div>
        </div>

        <div
          onClick={() => navigate("/safety/discharge")}
          className="dept-card group"
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-5">
            <Droplet className="h-7 w-7 text-white" strokeWidth={3} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Final Discharge</h2>
          <p className="text-muted-foreground text-sm">Submit final discharge records</p>
          <div className="mt-5 text-accent font-medium text-sm group-hover:translate-x-1 transition-transform">
            Open Form →
          </div>
        </div>

        <div
          onClick={() => navigate("/safety/waste-inventory")}
          className="dept-card group"
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-5">
            <Scale className="h-7 w-7 text-white" strokeWidth={3} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Waste Inventory Smart Calculator</h2>
          <p className="text-muted-foreground text-sm">Calculate and record scheduled waste inventory</p>
          <div className="mt-5 text-accent font-medium text-sm group-hover:translate-x-1 transition-transform">
            Open Form →
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default SafetyFormsPage;
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";
import { useStoreDepartmentAccess } from "@/hooks/useStoreDepartmentAccess";

const StoreFormsPage = () => {
  const navigate = useNavigate();
  const { hasAccess, isLoaded } = useStoreDepartmentAccess();

  useEffect(() => {
    if (isLoaded && !hasAccess) navigate("/home", { replace: true });
  }, [isLoaded, hasAccess, navigate]);

  if (!isLoaded || !hasAccess) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <button type="button" onClick={() => navigate("/home")} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Home
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Store Department</h1>
        <p className="text-muted-foreground mt-1">Select a form to submit</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div onClick={() => navigate("/store/material-requisition-slip")} className="dept-card group">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-5">
            <Package className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Material Requisition Slip</h2>
          <p className="text-muted-foreground text-sm">Request items and materials from the store.</p>
          <div className="mt-5 text-accent font-medium text-sm group-hover:translate-x-1 transition-transform">
            Open Form →
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreFormsPage;

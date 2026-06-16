import { useNavigate } from "react-router-dom";
import { DollarSign, ArrowLeft } from "lucide-react";

const FinanceFormsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <button onClick={() => navigate("/home")} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Home
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Finance</h1>
        <p className="text-muted-foreground mt-1">Select a form to submit</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div
          onClick={() => navigate("/finance/claim")}
          className="dept-card group"
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center mb-5">
            <DollarSign 
              className="h-7 w-7 text-accent-foreground" 
              strokeWidth={4} 
              strokeLinecap="square" 
              strokeLinejoin="miter"
            />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Petty Cash Claim</h2>
          <p className="text-muted-foreground text-sm">Submit petty cash claims for reimbursement</p>
          <div className="mt-5 text-accent font-medium text-sm group-hover:translate-x-1 transition-transform">
            Open Form →
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceFormsPage;

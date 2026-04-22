import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { Users, CircleDollarSign, FileText, CheckCircle, XCircle } from "lucide-react";

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { submissions } = useSubmissions();

  // Calculate user's personal submission stats
  const mySubmissions = submissions.filter(s => s.submittedBy === user?.id);
  const stats = {
    total: mySubmissions.length,
    accepted: mySubmissions.filter(s => s.status === "approved").length,
    rejected: mySubmissions.filter(s => s.status === "rejected").length,
  };

  const departments = [
    {
      id: "hr",
      title: "Human Resource Department",
      description: "Car rental requests, pass exit forms, and more",
      icon: Users,
      color: "from-primary to-primary/80",
      iconColor: "text-primary-foreground",
      path: "/hr",
    },
    {
      id: "finance",
      title: "Finance Department",
      description: "Submit expense claims and reimbursements",
      icon: CircleDollarSign,
      color: "from-accent to-accent/80",
      iconColor: "text-accent-foreground",
      path: "/finance",
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.name ? user.name.split(" ")[0] : "User"}!</h1>
        <p className="text-muted-foreground mt-1">Select a department to submit a form</p>
      </div>

      {/* Submissions Overview Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div onClick={() => navigate("/submissions")} className="card-elevated p-5 flex items-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Submissions</p>
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
          </div>
        </div>
        <div onClick={() => navigate("/submissions")} className="card-elevated p-5 flex items-center gap-4 cursor-pointer hover:bg-emerald-50/50 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Accepted / Diterima</p>
            <p className="text-3xl font-bold text-foreground">{stats.accepted}</p>
          </div>
        </div>
        <div onClick={() => navigate("/submissions")} className="card-elevated p-5 flex items-center gap-4 cursor-pointer hover:bg-red-50/50 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <XCircle className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rejected / Ditolak</p>
            <p className="text-3xl font-bold text-foreground">{stats.rejected}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {departments.map((dept) => (
          <div
            key={dept.id}
            onClick={() => navigate(dept.path)}
            className="dept-card group"
          >
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${dept.color} flex items-center justify-center mb-5`}>
              <dept.icon className={`h-7 w-7 ${dept.iconColor}`} strokeWidth={dept.id === "finance" ? 3 : 2} />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">{dept.title}</h2>
            <p className="text-muted-foreground text-sm">{dept.description}</p>
            <div className="mt-5 text-accent font-medium text-sm group-hover:translate-x-1 transition-transform">
              View Forms →
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;

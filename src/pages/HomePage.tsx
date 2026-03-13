import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Users, DollarSign } from "lucide-react";

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const departments = [
    {
      id: "hr",
      title: "Human Resources",
      description: "Car rental requests, leave applications, and more",
      icon: Users,
      color: "from-primary to-primary/80",
      path: "/hr",
    },
    {
      id: "finance",
      title: "Finance",
      description: "Submit expense claims and reimbursements",
      icon: DollarSign,
      color: "from-accent to-accent/80",
      path: "/finance",
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.name?.split(" ")[0]}!</h1>
        <p className="text-muted-foreground mt-1">Select a department to submit a form</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {departments.map((dept) => (
          <div
            key={dept.id}
            onClick={() => navigate(dept.path)}
            className="dept-card group"
          >
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${dept.color} flex items-center justify-center mb-5`}>
              <dept.icon className="h-7 w-7 text-primary-foreground" />
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

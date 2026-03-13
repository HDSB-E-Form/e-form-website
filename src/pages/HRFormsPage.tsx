import { useNavigate } from "react-router-dom";
import { Car, CalendarDays, ArrowLeft } from "lucide-react";

const HRFormsPage = () => {
  const navigate = useNavigate();

  const forms = [
    {
      id: "car_rental",
      title: "Company Car Request",
      description: "Request a company vehicle for business travel",
      icon: Car,
      path: "/hr/car-rental",
    },
    {
      id: "leave",
      title: "Leave Application",
      description: "Apply for annual, sick, or other types of leave",
      icon: CalendarDays,
      path: "/hr/leave",
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <button onClick={() => navigate("/home")} className="flex items-center text-muted-foreground hover:text-foreground mb-6 text-sm">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Human Resources</h1>
        <p className="text-muted-foreground mt-1">Select a form to submit</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {forms.map((form) => (
          <div
            key={form.id}
            onClick={() => navigate(form.path)}
            className="dept-card group"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-5">
              <form.icon className="h-7 w-7 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">{form.title}</h2>
            <p className="text-muted-foreground text-sm">{form.description}</p>
            <div className="mt-5 text-accent font-medium text-sm group-hover:translate-x-1 transition-transform">
              Open Form →
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HRFormsPage;

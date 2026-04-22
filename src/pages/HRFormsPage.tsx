import { useNavigate } from "react-router-dom";
import { CalendarDays, ArrowLeft } from "lucide-react";

// Custom Sedan Icon to replace the default Lucide Car (which looks like a hatchback/SUV)
const CustomSedanIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 17H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h3l2.5-4.5A2 2 0 0 1 10 7h4a2 2 0 0 1 1.5 1.5L17 11.5h4a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1h-2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </svg>
);

const HRFormsPage = () => {
  const navigate = useNavigate();

  const forms = [
    {
      id: "car_rental",
      title: "Company Car Request",
      description: "Request a company vehicle for business travel",
      icon: CustomSedanIcon,
      path: "/hr/car-rental",
    },
    {
      id: "leave",
      title: "Gate Pass",
      description: "Apply for a pass to exit the company premises",
      icon: CalendarDays,
      path: "/hr/leave",
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <button onClick={() => navigate("/home")} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 hover:shadow-sm border border-primary/10 rounded-lg transition-all mb-6 group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Home
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

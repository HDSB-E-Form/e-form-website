import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/supabase";

interface StoreDepartmentAccessSetting {
  allowedDepartments?: string[];
}

export function useStoreDepartmentAccess() {
  const { user } = useAuth();
  const [allowedDepartments, setAllowedDepartments] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void supabase
      .from("safety_dashboard_settings")
      .select("value")
      .eq("key", "store_department_access")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.error("Could not load Store Department access settings:", error);
        } else {
          const config = (data?.value || {}) as StoreDepartmentAccessSetting;
          setAllowedDepartments(config.allowedDepartments || []);
        }
        setIsLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const hasAccess = user?.role === "super_admin" || (!!user?.department && allowedDepartments.includes(user.department));

  return { hasAccess, isLoaded, allowedDepartments };
}

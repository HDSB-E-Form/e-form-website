import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/supabase";

export interface ITAdminFacility {
  id: string;
  name: string;
  requires_details: boolean;
  sort_order: number;
}

export const fallbackITAdminFacilities: ITAdminFacility[] = [
  { id: "laptop-desktop", name: "Laptop / Desktop", requires_details: false, sort_order: 10 },
  { id: "email", name: "Email", requires_details: false, sort_order: 20 },
  { id: "internet-access", name: "Internet Access", requires_details: false, sort_order: 30 },
  { id: "printer", name: "Printer", requires_details: false, sort_order: 40 },
  { id: "sharepoint", name: "SharePoint", requires_details: true, sort_order: 50 },
];

export function useITAdminFacilities(useFallback = true) {
  const [facilities, setFacilities] = useState<ITAdminFacility[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("it_admin_facilities")
      .select("id,name,requires_details,sort_order")
      .order("sort_order")
      .order("name");

    if (error) {
      console.error("Could not load IT Admin facilities:", error);
      if (useFallback) setFacilities(fallbackITAdminFacilities);
    } else {
      setFacilities((data || []) as ITAdminFacility[]);
    }
    setIsLoading(false);
  }, [useFallback]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { facilities, isLoading, refresh };
}


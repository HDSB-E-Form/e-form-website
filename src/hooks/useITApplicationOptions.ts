import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/supabase";

export interface ITApplicationOption {
  id: string;
  name: string;
  sort_order: number;
}

const fallbackOptions: ITApplicationOption[] = [
  "Accounting", "Customer Order Transfer", "Field Permissions", "General Functions",
  "General Registers", "Manufacturing", "Mobile Client", "Part Synchronization",
  "Purchase", "Sales", "Stock", "Time Recording",
].map((name, index) => ({ id: name, name, sort_order: (index + 1) * 10 }));

export function useITApplicationOptions(useFallback = true) {
  const [options, setOptions] = useState<ITApplicationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("it_application_options")
      .select("id,name,sort_order")
      .order("sort_order")
      .order("name");
    if (error) {
      console.error("Could not load IT Application options:", error);
      if (useFallback) setOptions(fallbackOptions);
    } else {
      setOptions((data || []) as ITApplicationOption[]);
    }
    setIsLoading(false);
  }, [useFallback]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { options, isLoading, refresh };
}


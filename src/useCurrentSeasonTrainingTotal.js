import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { CURRENT_SEASON_START_DATE } from "./utils/attendancePriority";

export const useCurrentSeasonTrainingTotal = () => {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchTotal = async () => {
      const { count, error } = await supabase
        .from("trainings")
        .select("id", { count: "exact", head: true })
        .gte("date", CURRENT_SEASON_START_DATE)
        .not("completed_at", "is", null);

      if (!error) setTotal(count || 0);
    };

    fetchTotal();
  }, []);

  return total;
};

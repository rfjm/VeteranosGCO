import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { buildMonthlyPlayerStats, getMonthRange } from "./utils/monthlyStats";

export const useCurrentMonthStats = () => {
  const [monthRange] = useState(() => getMonthRange(new Date()));
  const [statsByPlayer, setStatsByPlayer] = useState({});
  const [totalPractices, setTotalPractices] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const { data: trainings, error: trainingsError } = await supabase
        .from("trainings")
        .select("id, date, completed_at")
        .gte("date", monthRange.start)
        .lt("date", monthRange.end)
        .not("completed_at", "is", null)
        .order("date");

      if (trainingsError) {
        setError(trainingsError.message);
        setLoading(false);
        return;
      }

      const trainingIds = (trainings || []).map((training) => training.id);
      if (!trainingIds.length) {
        setStatsByPlayer({});
        setTotalPractices(0);
        setLoading(false);
        return;
      }

      const [attendanceResult, gamesResult] = await Promise.all([
        supabase
          .from("training_attendance")
          .select("training_id, player_id")
          .in("training_id", trainingIds),
        supabase
          .from("games")
          .select("id, training_id, team1, team2, team1_score, team2_score, winner, created_at")
          .in("training_id", trainingIds)
          .order("created_at"),
      ]);

      const fetchError = attendanceResult.error || gamesResult.error;
      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setStatsByPlayer(
        buildMonthlyPlayerStats(
          trainings || [],
          attendanceResult.data || [],
          gamesResult.data || [],
        ),
      );
      setTotalPractices((trainings || []).length);
      setLoading(false);
    };

    fetchStats();
  }, [monthRange]);

  return { statsByPlayer, totalPractices, loading, error, monthRange };
};

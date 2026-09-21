import { useEffect, useMemo, useState } from "react";
import { dateFromKey, dateKey, getMonthGrid } from "../utils/calendar";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const trainingDateKey = (training) => String(training.date).slice(0, 10);

export default function TrainingCalendar({ trainings, selectedTraining, onSelect }) {
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  useEffect(() => {
    if (!selectedTraining) return;
    const selectedDate = dateFromKey(trainingDateKey(selectedTraining));
    setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedTraining]);

  const trainingsByDate = useMemo(() => {
    const result = new Map();
    for (const training of trainings) {
      const key = trainingDateKey(training);
      if (!result.has(key)) result.set(key, training);
    }
    return result;
  }, [trainings]);

  const days = getMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth());
  const today = dateKey(new Date());

  const changeMonth = (offset) => {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  return (
    <section className="mb-6 rounded-xl border border-gray-600 bg-gray-900 p-3 sm:p-4">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label="Mês anterior"
          className="rounded bg-gray-700 px-3 py-2 hover:bg-gray-600"
        >
          ←
        </button>
        <h2 className="text-lg font-bold capitalize">
          {visibleMonth.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
        </h2>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="Mês seguinte"
          className="rounded bg-gray-700 px-3 py-2 hover:bg-gray-600"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs sm:text-sm">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="py-1 font-semibold text-gray-400">
            {weekday}
          </div>
        ))}

        {days.map((day) => {
          const training = trainingsByDate.get(day.key);
          const isSelected = training?.id === selectedTraining?.id;
          const isToday = day.key === today;

          return (
            <button
              type="button"
              key={day.key}
              disabled={!training}
              onClick={() => training && onSelect(training)}
              aria-label={training ? `Abrir treino de ${day.key}` : day.key}
              className={`relative min-h-11 rounded p-1 transition sm:min-h-14 ${
                day.isCurrentMonth ? "text-white" : "text-gray-600"
              } ${
                training
                  ? "cursor-pointer bg-blue-700 font-bold hover:bg-blue-600"
                  : "cursor-default bg-gray-800"
              } ${isSelected ? "ring-2 ring-green-400" : ""} ${
                isToday ? "border border-yellow-400" : "border border-transparent"
              }`}
            >
              <span>{day.day}</span>
              {training && (
                <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-green-300" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

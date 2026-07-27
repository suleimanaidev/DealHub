import React, { useState } from "react";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: "meeting" | "task" | "call" | "deadline";
  color: string;
}

interface CalendarWidgetProps {
  events?: CalendarEvent[];
}

const EVENT_COLORS: Record<string, { bg: string; text: string }> = {
  meeting: { bg: "bg-blue-100", text: "text-blue-800" },
  task: { bg: "bg-yellow-100", text: "text-yellow-800" },
  call: { bg: "bg-green-100", text: "text-green-800" },
  deadline: { bg: "bg-red-100", text: "text-red-800" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const defaultEvents: CalendarEvent[] = [
  { id: "1", title: "Team Standup", date: new Date().toISOString().split("T")[0], time: "09:00", type: "meeting", color: "bg-blue-500" },
  { id: "2", title: "Client Call - Acme Corp", date: new Date().toISOString().split("T")[0], time: "14:00", type: "call", color: "bg-green-500" },
  { id: "3", title: "Q4 Report Due", date: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0], time: "17:00", type: "deadline", color: "bg-red-500" },
  { id: "4", title: "Follow up with leads", date: new Date(Date.now() + 1 * 86400000).toISOString().split("T")[0], time: "10:00", type: "task", color: "bg-yellow-500" },
  { id: "5", title: "Sales review", date: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0], time: "11:00", type: "meeting", color: "bg-blue-500" },
  { id: "6", title: "Product demo", date: new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0], time: "15:00", type: "meeting", color: "bg-blue-500" },
];

export function CalendarWidget({ events = defaultEvents }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function getEventsForDay(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.date === dateStr);
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function isToday(day: number) {
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {MONTHS[month]} {year}
        </h3>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100">
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100">
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {DAYS.map((day) => (
          <div key={day} className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-500">
            {day}
          </div>
        ))}

        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="bg-white min-h-[60px]" />;
          }

          const dayEvents = getEventsForDay(day);
          const todayClass = isToday(day)
            ? "bg-blue-50"
            : "bg-white";

          return (
            <div key={day} className={`${todayClass} min-h-[60px] p-1`}>
              <div className={`text-xs font-medium mb-1 ${isToday(day) ? "text-blue-600" : "text-gray-700"}`}>
                {day}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map((event) => {
                  const colors = EVENT_COLORS[event.type] || { bg: "bg-gray-100", text: "text-gray-800" };
                  return (
                    <div
                      key={event.id}
                      className={`${colors.bg} ${colors.text} text-[9px] px-1 py-0.5 rounded truncate leading-tight`}
                      title={event.title}
                    >
                      {event.time && `${event.time} `}{event.title}
                    </div>
                  );
                })}
                {dayEvents.length > 2 && (
                  <div className="text-[9px] text-gray-500 px-1">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {Object.entries(EVENT_COLORS).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${colors.bg.replace("100", "500")}`} />
            <span className="text-xs text-gray-500 capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

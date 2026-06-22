import { useState, useMemo } from 'react';
import { Task, Project } from '../types';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';

interface TaskCalendarProps {
  tasks: Task[];
  projects: Project[];
  activeProject: string;
  onOpenTaskDetails: (task: Task) => void;
  onAddTaskClick: (defaultDate?: string) => void;
}

export default function TaskCalendar({
  tasks,
  projects,
  activeProject,
  onOpenTaskDetails,
  onAddTaskClick
}: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (activeProject === 'all') return tasks;
    return tasks.filter(t => t.projectId === activeProject);
  }, [tasks, activeProject]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper arrays
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const arr = [];
    
    // Padding for previous month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      arr.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        dateString: `${month === 0 ? year - 1 : year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(prevMonthDays - i).padStart(2, '0')}`
      });
    }

    // Days in current month
    for (let i = 1; i <= daysInMonth; i++) {
      arr.push({
        day: i,
        isCurrentMonth: true,
        dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      });
    }

    // Padding for next month to fill grid (must be divisible by 7, e.g. 35 or 42)
    const totalSlots = arr.length <= 35 ? 35 : 42;
    const nextMonthPadding = totalSlots - arr.length;
    for (let i = 1; i <= nextMonthPadding; i++) {
      arr.push({
        day: i,
        isCurrentMonth: false,
        dateString: `${month === 11 ? year + 1 : year}-${String(month === 11 ? 1 : month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      });
    }

    return arr;
  }, [year, month, daysInMonth, firstDayIndex]);

  // Match tasks to their calendar dates
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    filteredTasks.forEach(task => {
      if (task.dueDate) {
        if (!map[task.dueDate]) {
          map[task.dueDate] = [];
        }
        map[task.dueDate].push(task);
      }
    });
    return map;
  }, [filteredTasks]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const isToday = (dateString: string) => {
    const today = new Date();
    const compare = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return compare === dateString;
  };

  return (
    <div id="calendar_view_wrapper" className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[calc(100vh-250px)] max-h-[750px] min-h-[550px] overflow-hidden">
      {/* Month Switcher Header */}
      <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <CalendarIcon size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 leading-tight">
              {monthNames[month]} {year}
            </h2>
            <p className="text-[10px] text-slate-400">Task deadline schedules calendar tracker</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 hover:bg-slate-200 border border-slate-250 bg-white rounded-xl text-slate-600 hover:text-slate-800 transition-all duration-150"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2.5 py-1 text-xs border border-slate-250 bg-white hover:bg-slate-100 rounded-xl text-slate-600 font-bold tracking-tight"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 hover:bg-slate-200 border border-slate-250 bg-white rounded-xl text-slate-600 hover:text-slate-800 transition-all duration-150"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 bg-slate-50/50 text-center border-b border-slate-150">
        {daysOfWeek.map(day => (
          <div key={day} className="py-2.5 text-[10px] font-extrabold uppercase text-slate-400 tracking-widest border-r border-slate-100 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid Numbers */}
      <div className="flex-1 grid grid-cols-7 grid-rows-5 sm:grid-rows-6">
        {calendarDays.map((cell, idx) => {
          const matchedTasks = tasksByDate[cell.dateString] || [];
          const currentDayToday = isToday(cell.dateString);

          return (
            <div
              key={`${cell.dateString}-${idx}`}
              className={`p-1 border-r border-b border-slate-100 last:border-r-0 flex flex-col justify-between group relative min-h-[70px] ${
                cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/40 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full ${
                  currentDayToday 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : cell.isCurrentMonth ? 'text-slate-700' : 'text-slate-400'
                }`}>
                  {cell.day}
                </span>

                {/* Hover Add Task Button */}
                <button
                  onClick={() => onAddTaskClick(cell.dateString)}
                  className="p-0.5 border border-slate-200 bg-white rounded-md text-slate-400 hover:text-indigo-600 hover:border-indigo-400 md:opacity-0 group-hover:opacity-100 duration-150 transition-all shadow-xs"
                  title={`Add a task for ${cell.dateString}`}
                >
                  <Plus size={10} />
                </button>
              </div>

              {/* Tasks List inside cell */}
              <div className="flex-1 overflow-y-auto mt-1 space-y-1 scrollbar-none pr-0.5">
                {matchedTasks.slice(0, 3).map(task => {
                  const project = projects.find(p => p.id === task.projectId);
                  return (
                    <div
                      key={task.id}
                      onClick={() => onOpenTaskDetails(task)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold leading-tight cursor-pointer truncate max-w-full border shadow-xs hover:-translate-y-px duration-150 transition-transform ${
                        task.status === 'done'
                          ? 'bg-indigo-50 text-indigo-700/60 line-through border-indigo-100'
                          : task.priority === 'high'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                      title={task.title}
                    >
                      <div className="flex items-center gap-1">
                        {project && (
                          <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${project.color} shrink-0`} />
                        )}
                        <span className="truncate">{task.title}</span>
                      </div>
                    </div>
                  );
                })}
                {matchedTasks.length > 3 && (
                  <div className="text-[8px] font-extrabold text-slate-400 pl-1">
                    +{matchedTasks.length - 3} more tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

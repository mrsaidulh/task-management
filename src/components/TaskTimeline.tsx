import { useMemo } from 'react';
import { Task, Project } from '../types';
import { TEAM_MEMBERS } from '../data';
import { GanttChart, Calendar, ChevronRight } from 'lucide-react';

interface TaskTimelineProps {
  tasks: Task[];
  projects: Project[];
  activeProject: string;
  onOpenTaskDetails: (task: Task) => void;
}

export default function TaskTimeline({
  tasks,
  projects,
  activeProject,
  onOpenTaskDetails
}: TaskTimelineProps) {
  // Filter tasks that have at least a due date
  const timelineTasks = useMemo(() => {
    let pool = activeProject === 'all' ? tasks : tasks.filter(t => t.projectId === activeProject);
    return pool.filter(t => t.dueDate).sort((a,b) => {
      const dateA = a.startDate || a.dueDate;
      const dateB = b.startDate || b.dueDate;
      return dateA.localeCompare(dateB);
    });
  }, [tasks, activeProject]);

  // Generate a rolling 14 days timeline of dates starting from 2 days ago
  const timelineDays = useMemo(() => {
    const arr = [];
    const today = new Date();
    // Offset by -2 days
    const startOffsetDate = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < 14; i++) {
      const d = new Date(startOffsetDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateString = d.toISOString().split('T')[0];
      const isTodayStr = d.toISOString().split('T')[0] === today.toISOString().split('T')[0];
      arr.push({
        dateString,
        monthDay: d.getDate(),
        weekday: d.toLocaleDateString([], { weekday: 'short' }),
        isToday: isTodayStr
      });
    }
    return arr;
  }, []);

  // Helper helper to check overlap and calculate grid column span
  const getTaskGridPlacement = (task: Task) => {
    const sDate = task.startDate || task.dueDate;
    const eDate = task.dueDate;

    let startCol = -1;
    let endCol = -1;

    timelineDays.forEach((day, index) => {
      if (day.dateString === sDate) startCol = index;
      if (day.dateString === eDate) endCol = index;
    });

    // Handle out of bounds cases nicely
    if (startCol === -1) {
      if (sDate < timelineDays[0].dateString) {
        startCol = 0;
      } else {
        return null; // completely in the future
      }
    }

    if (endCol === -1) {
      if (eDate > timelineDays[13].dateString) {
        endCol = 13;
      } else {
        return null; // completely in the past
      }
    }

    if (startCol > endCol) {
      startCol = endCol;
    }

    return {
      start: startCol + 1, // 1-indexed for CSS grids
      span: (endCol - startCol) + 1
    };
  };

  return (
    <div id="timeline_parent_panel" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-250px)] max-h-[750px] min-h-[500px]">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <GanttChart size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 leading-tight">Interactive Gantt Timeline</h2>
            <p className="text-[10px] text-slate-400">Map start-to-due dependencies and critical paths</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
          <span>● Current Sprint Plan</span>
        </div>
      </div>

      {/* Grid Canvas Wrapper */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[950px] flex flex-col h-full">
          
          {/* Calendar Day Columns Headers */}
          <div className="grid grid-cols-12 border-b border-slate-200 h-14 bg-slate-100/50 shrink-0">
            {/* Left Header label */}
            <div className="col-span-4 border-r border-slate-200 p-4 font-extrabold uppercase tracking-widest text-[9px] text-slate-400 flex items-center">
              Active Project Backlog
            </div>

            {/* Timelines Days cells */}
            <div className="col-span-8 grid grid-cols-14 h-full relative">
              {timelineDays.map((day) => (
                <div 
                  key={day.dateString}
                  className={`flex flex-col items-center justify-center border-r border-slate-100 h-full relative ${
                    day.isToday ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  <span className="text-[9px] leading-tight text-slate-400 font-extrabold uppercase">{day.weekday}</span>
                  <span className={`text-[11px] font-bold mt-0.5 flex items-center justify-center w-5 h-5 rounded-full ${
                    day.isToday ? 'bg-indigo-600 text-white font-mono' : 'text-slate-700'
                  }`}>
                    {day.monthDay}
                  </span>
                  {day.isToday && (
                    <div className="absolute top-0 bottom-0 left-1/2 -ml-[1px] w-0.5 bg-indigo-400 pointer-events-none z-10 opacity-60" style={{ height: '500px' }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Rows list of Tasks */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1 select-none">
            {timelineTasks.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 font-medium">
                No active task schedules found to plot for this timeline range.
              </div>
            ) : (
              timelineTasks.map((task) => {
                const assignee = TEAM_MEMBERS.find(m => m.id === task.assigneeId);
                const project = projects.find(p => p.id === task.projectId);
                const placement = getTaskGridPlacement(task);

                return (
                  <div key={task.id} className="grid grid-cols-12 h-16 items-center hover:bg-slate-50/50 transition-colors">
                    
                    {/* Left label cell */}
                    <div 
                      onClick={() => onOpenTaskDetails(task)}
                      className="col-span-4 border-r border-slate-200 px-4 h-full flex flex-col justify-center min-w-0 cursor-pointer hover:bg-slate-100/30 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {project && (
                          <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${project.color} shrink-0`} />
                        )}
                        <span className={`text-xs font-semibold truncate ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {task.title}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400">
                        <span className="font-semibold underline uppercase text-[8px]">{task.status.replace('_', ' ')}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <div className={`w-3.5 h-3.5 leading-none rounded-full flex items-center justify-center font-bold text-[8px] ${assignee?.avatarColor || 'bg-slate-200'}`}>
                            {assignee?.avatarText || '?'}
                          </div>
                          <span>{assignee ? assignee.name : 'Unassigned'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right schedule plot grid */}
                    <div className="col-span-8 h-full relative grid grid-cols-14 items-center">
                      {/* Plot block */}
                      {placement ? (
                        <div
                          style={{
                            gridColumnStart: placement.start,
                            gridColumnEnd: `span ${placement.span}`
                          }}
                          onClick={() => onOpenTaskDetails(task)}
                          className={`z-20 h-7 rounded-xl border px-3 cursor-pointer duration-150 transition-all flex items-center justify-between text-[10px] font-bold shadow-xs select-none hover:-translate-y-0.5 ${
                            task.status === 'done'
                              ? 'bg-slate-100 text-slate-400 line-through border-slate-200 decoration-slate-350'
                              : task.priority === 'high'
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100/60 border-rose-200'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100/60 border-indigo-200'
                          }`}
                        >
                          <span className="truncate pr-1">{task.title}</span>
                          <span className="font-mono scale-95 shrink-0 text-[8px] bg-white bg-opacity-70 px-1 py-0.5 rounded border border-inherit">
                            {task.startDate ? `${task.startDate} ➔ ` : ''}{task.dueDate}
                          </span>
                        </div>
                      ) : (
                        <div className="opacity-0 h-4" />
                      )}

                      {/* Backdrop vertical day guideline markers */}
                      {timelineDays.map((day) => (
                        <div 
                          key={`backdrop-${day.dateString}`}
                          className={`absolute top-0 bottom-0 border-r border-slate-100/40 pointer-events-none ${
                            day.isToday ? 'bg-indigo-50/10' : ''
                          }`}
                          style={{
                            gridColumnStart: timelineDays.indexOf(day) + 1,
                            gridColumnEnd: timelineDays.indexOf(day) + 2,
                            width: '100%'
                          }}
                        />
                      ))}
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

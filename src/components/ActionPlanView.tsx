import React, { useState } from 'react';
import {
  CheckSquare,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  Clock,
  Sparkles,
  ChevronRight,
  X,
  CheckCircle2,
  Circle,
  PlayCircle,
  HelpCircle,
} from 'lucide-react';
import { ActionTask, PriorityLevel, TaskStatus, Business, ActiveTab } from '../types';

interface ActionPlanViewProps {
  business: Business;
  tasks: ActionTask[];
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAssistantWithPrompt: (prompt: string) => void;
}

export const ActionPlanView: React.FC<ActionPlanViewProps> = ({
  business,
  tasks,
  onUpdateStatus,
  setActiveTab,
  onOpenAssistantWithPrompt,
}) => {
  const [selectedTask, setSelectedTask] = useState<ActionTask | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<'all' | PriorityLevel>('all');

  const filteredTasks = tasks.filter((t) => {
    if (priorityFilter === 'all') return true;
    return t.priority === priorityFilter;
  });

  const urgentTasks = tasks.filter((t) => t.priority === 'URGENTE');
  const importantTasks = tasks.filter((t) => t.priority === 'IMPORTANTE');
  const recommendedTasks = tasks.filter((t) => t.priority === 'RECOMENDADO');

  const completedCount = tasks.filter((t) => t.status === 'completada').length;
  const isRealPlan = tasks.length > 0 && tasks.every((task) => task.id.includes(`task-${business.id}-`));

  return (
    <div className="space-y-6 pb-14">
      {/* Header */}
      <div className="vai-panel rounded-[1.5rem] p-6 sm:p-8 lg:p-9 ring-1 ring-slate-200/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isRealPlan ? 'PLAN BASADO EN HALLAZGOS REALES' : 'HOJA DE RUTA ESTRATÉGICA'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              Plan de Acción Priorizado
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              {isRealPlan
                ? 'Tareas generadas automáticamente desde la última auditoría SEO técnica verificada.'
                : 'Tareas DEMO organizadas por prioridad para validar la experiencia. Las prioridades reales dependerán de hallazgos verificados.'}
            </p>
          </div>

          {/* Progress counter */}
          <div className="bg-slate-900 text-white rounded-xl p-4 shrink-0 flex items-center gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Progreso de implementación
              </span>
              <span className="text-xl font-bold font-heading">
                {completedCount} de {tasks.length} resueltas
              </span>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-emerald-400 flex items-center justify-center font-bold text-xs text-emerald-400">
              {tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%
            </div>
          </div>
        </div>

        {/* Priority Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6 pt-6 border-t border-slate-100">
          <button
            onClick={() => setPriorityFilter('all')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              priorityFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50/70'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80 block">Todas las tareas</span>
            <span className="text-lg font-bold font-heading">{tasks.length} tareas</span>
          </button>

          <button
            onClick={() => setPriorityFilter('URGENTE')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              priorityFilter === 'URGENTE'
                ? 'bg-rose-50 text-rose-950 border-rose-400 ring-2 ring-rose-200'
                : 'bg-white text-rose-900 border-slate-200 hover:bg-rose-50/50'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>URGENTE</span>
            </div>
            <span className="text-lg font-bold font-heading mt-0.5 block">{urgentTasks.length} tareas</span>
          </button>

          <button
            onClick={() => setPriorityFilter('IMPORTANTE')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              priorityFilter === 'IMPORTANTE'
                ? 'bg-amber-50 text-amber-950 border-amber-400 ring-2 ring-amber-200'
                : 'bg-white text-amber-900 border-slate-200 hover:bg-amber-50/50'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>IMPORTANTE</span>
            </div>
            <span className="text-lg font-bold font-heading mt-0.5 block">{importantTasks.length} tareas</span>
          </button>

          <button
            onClick={() => setPriorityFilter('RECOMENDADO')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              priorityFilter === 'RECOMENDADO'
                ? 'bg-emerald-50 text-emerald-950 border-emerald-400 ring-2 ring-emerald-200'
                : 'bg-white text-emerald-900 border-slate-200 hover:bg-emerald-50/50'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>RECOMENDADO</span>
            </div>
            <span className="text-lg font-bold font-heading mt-0.5 block">{recommendedTasks.length} tareas</span>
          </button>
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No hay tareas para este filtro.
          </div>
        )}
        {filteredTasks.map((task) => {
          const isUrgent = task.priority === 'URGENTE';
          const isImportant = task.priority === 'IMPORTANTE';
          const isDone = task.status === 'completada';
          const isInProgress = task.status === 'en_progreso';

          return (
            <div
              key={task.id}
              className={`bg-white rounded-2xl p-5 sm:p-6 border transition-all shadow-xs ${
                isDone
                  ? 'border-emerald-200 bg-emerald-50/20 opacity-80'
                  : isUrgent
                  ? 'border-rose-200 hover:border-rose-300'
                  : isImportant
                  ? 'border-amber-200 hover:border-amber-300'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  {/* Status Toggle Button */}
                  <button
                    onClick={() => {
                      const nextStatus: TaskStatus =
                        task.status === 'pendiente'
                          ? 'en_progreso'
                          : task.status === 'en_progreso'
                          ? 'completada'
                          : 'pendiente';
                      onUpdateStatus(task.id, nextStatus);
                    }}
                    className="mt-0.5 shrink-0 text-slate-400 hover:text-indigo-600 cursor-pointer"
                    title="Hacé clic para cambiar estado (Pendiente / En Progreso / Completada)"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    ) : isInProgress ? (
                      <PlayCircle className="w-6 h-6 text-amber-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-300" />
                    )}
                  </button>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isUrgent
                            ? 'bg-rose-100 text-rose-800'
                            : isImportant
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {task.priority}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">
                        Impacto: <strong className="text-slate-700">{task.estimatedImpact}</strong>
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">
                        Dificultad: <strong className="text-slate-700">{task.difficulty}</strong>
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {task.estimatedTimeToFix}
                      </span>
                    </div>

                    <h3
                      className={`text-base font-bold font-heading leading-snug ${
                        isDone ? 'line-through text-slate-500' : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                      {task.simpleExplanation}
                    </p>
                  </div>
                </div>

                {/* Right button */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                      isDone
                        ? 'bg-emerald-100 text-emerald-800'
                        : isInProgress
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isDone ? 'Completada' : isInProgress ? 'En curso' : 'Pendiente'}
                  </span>

                  <button
                    onClick={() => setSelectedTask(task)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-xs"
                  >
                    <span>Ver solución</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Solution Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded ${
                    selectedTask.priority === 'URGENTE'
                      ? 'bg-rose-100 text-rose-800'
                      : selectedTask.priority === 'IMPORTANTE'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedTask.priority}
                </span>
                <h3 className="text-xl font-bold text-slate-900 font-heading mt-2">
                  {selectedTask.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <strong className="text-slate-900 block mb-0.5">¿Por qué es importante?</strong>
              {selectedTask.simpleExplanation}
            </div>

            {/* Step by Step Solution */}
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 font-heading">
                Pasos recomendados para solucionarlo:
              </h4>

              <div className="space-y-3">
                {selectedTask.stepByStepSolution.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick AI Help */}
            {selectedTask.quickActionPrompt && (
              <div className="mt-6 p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-indigo-950 block">
                    ¿Necesitás que la IA te redacte o te guíe?
                  </span>
                  <span className="text-[11px] text-indigo-700">
                    "{selectedTask.quickActionPrompt}"
                  </span>
                </div>
                <button
                  onClick={() => {
                    const prompt = selectedTask.quickActionPrompt!;
                    setSelectedTask(null);
                    onOpenAssistantWithPrompt(prompt);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Preguntar</span>
                </button>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const nextStatus: TaskStatus =
                    selectedTask.status === 'completada' ? 'pendiente' : 'completada';
                  onUpdateStatus(selectedTask.id, nextStatus);
                  setSelectedTask(null);
                }}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                {selectedTask.status === 'completada'
                  ? 'Marcar como pendiente'
                  : 'Marcar como completada'}
              </button>

              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

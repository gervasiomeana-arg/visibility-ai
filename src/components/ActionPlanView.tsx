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
  Globe,
} from 'lucide-react';
import {
  ActionTask,
  PriorityLevel,
  TaskStatus,
  TaskCompletionType,
  Business,
  ActiveTab,
} from '../types';
import { sortTasksByPriority } from '../services/storageService';

interface ActionPlanViewProps {
  business: Business;
  tasks: ActionTask[];
  onUpdateStatus: (
    taskId: string,
    status: TaskStatus,
    completionType?: TaskCompletionType | null,
    userEvidence?: string | null
  ) => void;
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

  const formatTaskCount = (count: number) =>
    `${count} ${count === 1 ? 'tarea' : 'tareas'}`;

  const sortedTasks = sortTasksByPriority(tasks);

  const filteredTasks = sortedTasks.filter((t) => {
    if (priorityFilter === 'all') return true;
    return t.priority === priorityFilter;
  });

  const urgentTasks = sortedTasks.filter((t) => t.priority === 'URGENTE');
  const importantTasks = sortedTasks.filter((t) => t.priority === 'IMPORTANTE');
  const recommendedTasks = sortedTasks.filter((t) => t.priority === 'RECOMENDADO');

  const completedCount = sortedTasks.filter(
    (t) =>
      t.status === 'completada' ||
      t.status === 'completada_manual' ||
      t.status === 'verificada_auditoria'
  ).length;

  const realTaskCount = sortedTasks.filter((task) => task.source === 'seo-audit').length;
  const planSource =
    sortedTasks.length > 0 && realTaskCount === sortedTasks.length
      ? 'real'
      : realTaskCount > 0
      ? 'partial'
      : 'demo';

  return (
    <div className="space-y-6 pb-14">
      {/* Header */}
      <div className="vai-panel rounded-[1.5rem] p-6 sm:p-8 lg:p-9 ring-1 ring-slate-200/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {planSource === 'real'
                  ? 'PLAN BASADO EN HALLAZGOS REALES'
                  : planSource === 'partial'
                  ? 'PLAN PARCIAL'
                  : 'HOJA DE RUTA DEMO'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              Plan de Acción Priorizado
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              {planSource === 'real'
                ? 'Tareas generadas automáticamente desde la última auditoría SEO técnica verificada.'
                : planSource === 'partial'
                ? `${realTaskCount} ${realTaskCount === 1 ? 'tarea proviene' : 'tareas provienen'} de hallazgos verificados; las demás mantienen su fuente identificada.`
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
                {completedCount} de {tasks.length} {tasks.length === 1 ? 'tarea resuelta' : 'tareas resueltas'}
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
            <span className="text-lg font-bold font-heading">{formatTaskCount(tasks.length)}</span>
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
            <span className="text-lg font-bold font-heading mt-0.5 block">{formatTaskCount(urgentTasks.length)}</span>
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
            <span className="text-lg font-bold font-heading mt-0.5 block">{formatTaskCount(importantTasks.length)}</span>
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
            <span className="text-lg font-bold font-heading mt-0.5 block">{formatTaskCount(recommendedTasks.length)}</span>
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
          const isDone =
            task.status === 'completada' ||
            task.status === 'completada_manual' ||
            task.status === 'verificada_auditoria';
          const isAuditVerified =
            task.status === 'verificada_auditoria' ||
            (isDone && task.completionType === 'auditoria');
          const isManualCompleted =
            task.status === 'completada_manual' ||
            (isDone && task.completionType === 'manual');
          const isInProgress = task.status === 'en_progreso';

          return (
            <div
              key={task.id}
              className={`bg-white rounded-2xl p-5 sm:p-6 border transition-all shadow-xs ${
                isDone
                  ? isAuditVerified
                    ? 'border-emerald-200 bg-emerald-50/25'
                    : 'border-sky-200 bg-sky-50/20'
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
                      if (isDone) {
                        onUpdateStatus(task.id, 'pendiente', null);
                      } else if (task.status === 'pendiente') {
                        onUpdateStatus(task.id, 'en_progreso', null);
                      } else {
                        onUpdateStatus(task.id, 'completada_manual', 'manual');
                      }
                    }}
                    className="mt-0.5 shrink-0 text-slate-400 hover:text-indigo-600 cursor-pointer"
                    title={
                      isDone
                        ? 'Completada (clic para volver a pendiente)'
                        : isInProgress
                        ? 'En curso (clic para marcar como completada manualmente)'
                        : 'Pendiente (clic para iniciar)'
                    }
                  >
                    {isDone ? (
                      <CheckCircle2
                        className={`w-6 h-6 ${
                          isAuditVerified ? 'text-emerald-600' : 'text-sky-600'
                        }`}
                      />
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
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          task.source === 'seo-audit'
                            ? 'bg-emerald-50 text-emerald-700'
                            : task.source === 'manual'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {task.source === 'seo-audit' ? 'REAL · SEO' : task.source === 'manual' ? 'MANUAL' : 'DEMO'}
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
                        isDone ? 'line-through text-slate-600' : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </h3>

                    {task.url && (
                      <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-mono max-w-full">
                        <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{task.url}</span>
                      </div>
                    )}

                    <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                      {task.simpleExplanation}
                    </p>

                    {task.userEvidence && (
                      <div className="mt-2.5 text-xs bg-sky-50/80 border border-sky-200/90 text-sky-950 rounded-xl p-2.5 flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-[10px] uppercase tracking-wider text-sky-800 block mb-0.5">
                            Evidencia aportada por el usuario (no medición automática del servidor)
                          </span>
                          <p className="leading-relaxed text-[11px] text-sky-900">{task.userEvidence}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right status badge and action button */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {isAuditVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      <span>Verificada por auditoría</span>
                    </span>
                  ) : isManualCompleted ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                      <CheckCircle2 className="w-3 h-3 text-sky-700" />
                      <span>Completada manualmente</span>
                    </span>
                  ) : isDone ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      <span>Completada</span>
                    </span>
                  ) : isInProgress ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-100 text-amber-800">
                      <PlayCircle className="w-3 h-3 text-amber-700" />
                      <span>En curso</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                      <Circle className="w-3 h-3 text-slate-400" />
                      <span>Pendiente</span>
                    </span>
                  )}

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

            <div className="mt-4 space-y-3">
              {selectedTask.url && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                    URL de la página analizada
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-slate-800 break-all">
                    <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{selectedTask.url}</span>
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                  1. ¿Por qué importa el hallazgo?
                </span>
                <p className="leading-relaxed">
                  {selectedTask.whyItMatters || selectedTask.simpleExplanation}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950">
                <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider block mb-1">
                  2. ¿Qué se detectó? (Dato medido)
                </span>
                <p className="font-semibold leading-relaxed">
                  {selectedTask.detectedData || selectedTask.simpleExplanation}
                </p>
              </div>

              {selectedTask.userEvidence && (
                <div className="p-3.5 rounded-xl bg-sky-50/80 border border-sky-200 text-xs text-sky-950">
                  <div className="flex items-center gap-1.5 mb-1">
                    <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
                    <span className="text-[10px] uppercase font-bold text-sky-700 tracking-wider">
                      Evidencia aportada por el usuario
                    </span>
                  </div>
                  <p className="leading-relaxed font-semibold">
                    {selectedTask.userEvidence}
                  </p>
                  <span className="text-[10px] text-sky-600 block mt-1 italic">
                    Tratada como comprobación manual del usuario, no como una medición automática del servidor.
                  </span>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-950">
                <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block mb-1">
                  3. Cambio propuesto
                </span>
                <p className="leading-relaxed font-medium">
                  {selectedTask.proposedChange || selectedTask.stepByStepSolution[0] || 'Aplicar el cambio recomendado en la plantilla o servidor.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                  4. Cómo comprobarlo
                </span>
                <p className="leading-relaxed">
                  {selectedTask.howToVerify || 'Inspeccionar el código fuente inicial (Ctrl+U) o usar cURL sin ejecutar JavaScript para validar la respuesta del servidor.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                <span className="font-bold shrink-0">Plataforma:</span>
                <span>
                  {selectedTask.platformNote || 'Adaptar las instrucciones a la plataforma confirmada del proyecto. No suponer WordPress o Wix.'}
                </span>
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

            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => {
                    onUpdateStatus(selectedTask.id, 'completada_manual', 'manual');
                    setSelectedTask(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                    selectedTask.status === 'completada_manual'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  ✓ Completada manualmente
                </button>
                <button
                  onClick={() => {
                    onUpdateStatus(selectedTask.id, 'verificada_auditoria', 'auditoria');
                    setSelectedTask(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                    selectedTask.status === 'verificada_auditoria'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  ✓ Verificada por auditoría
                </button>
                <button
                  onClick={() => {
                    onUpdateStatus(selectedTask.id, 'en_progreso', null);
                    setSelectedTask(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                    selectedTask.status === 'en_progreso'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  En curso
                </button>
                <button
                  onClick={() => {
                    onUpdateStatus(selectedTask.id, 'pendiente', null);
                    setSelectedTask(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                    selectedTask.status === 'pendiente'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Pendiente
                </button>
              </div>

              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 cursor-pointer text-center"
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

import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  TrendingUp,
  Globe,
  Building2,
  Calendar,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { Business, MonthlyEvolution, ExecutiveIssue } from '../types';

interface MonthlyReportViewProps {
  business: Business;
  evolution: MonthlyEvolution;
  issues: ExecutiveIssue[];
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  business,
  evolution,
  issues,
}) => {
  const [reportGenerated, setReportGenerated] = useState(true);
  const { monthComparison } = evolution;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Action Header (hidden during print) */}
      <div className="no-print bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-2">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>REPORTING MENSUAL EJECUTIVO</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
            Informe Mensual de Visibilidad
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Vista DEMO del informe que podrá imprimirse cuando existan datos verificados para <strong>{business.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto sm:shrink-0">
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Guardar PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Sheet */}
      <div className="bg-white rounded-3xl p-5 sm:p-12 border border-slate-200 shadow-lg max-w-4xl mx-auto space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b-2 border-slate-900">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                V
              </div>
              <span className="text-base font-extrabold text-slate-900 tracking-tight font-heading">
                VISIBILITY <span className="text-indigo-600">AI</span>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
              Informe de Crecimiento Digital · DEMO
            </h2>
            <p className="text-sm font-semibold text-slate-600 mt-0.5">
              {business.name} · {business.category} · {business.city}
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-500">
            <span className="text-slate-400 block uppercase font-bold text-[10px]">Período auditado</span>
            <span className="font-bold text-slate-900 text-sm block">Octubre 2026</span>
            <span>Datos de ejemplo · no verificados</span>
          </div>
        </div>

        {/* Section 13: Exact Prompt Metric Block */}
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 block mb-3 font-heading">
            Resumen del Mes: Métricas de Impacto
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            {/* Visibilidad: +12% */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-center">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                Visibilidad
              </span>
              <span className="text-2xl font-black text-indigo-900 font-heading mt-1 block">
                +{monthComparison.visibilityChangePercent}%
              </span>
              <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">↑ Mejora neta</span>
            </div>

            {/* Posiciones mejoradas: 17 */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-center">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                Posiciones mejoradas
              </span>
              <span className="text-2xl font-black text-emerald-950 font-heading mt-1 block">
                {monthComparison.improvedPositionsCount}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">en Google</span>
            </div>

            {/* Problemas solucionados: 8 */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 text-center">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                Problemas resueltos
              </span>
              <span className="text-2xl font-black text-amber-950 font-heading mt-1 block">
                {monthComparison.solvedProblemsCount}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">técnicos y web</span>
            </div>

            {/* Nuevas oportunidades: 11 */}
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 text-center">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                Nuevas oportunidades
              </span>
              <span className="text-2xl font-black text-purple-950 font-heading mt-1 block">
                {monthComparison.newOpportunitiesCount}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">para captar</span>
            </div>

            {/* Consultas: 34 */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-center col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                Consultas
              </span>
              <span className="text-2xl font-black text-blue-950 font-heading mt-1 block">
                {monthComparison.consultationsTotal}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">por WhatsApp</span>
            </div>
          </div>
        </div>

        {/* Narrative Evaluation */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p className="font-bold text-slate-900 mb-1">
            Conclusión del período para {business.name}:
          </p>
          <p>
            Este texto es un ejemplo de cómo Visibility AI resumirá un período cuando existan mediciones reales. En la versión actual no se atribuyen mejoras, posiciones ni consultas a acciones que todavía no fueron verificadas con una fuente conectada.
          </p>
        </div>

        {/* Priorities for Next Month */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 font-heading">
            Objetivos y Acciones para el Próximo Mes
          </h3>

          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl border border-slate-200 flex items-start gap-3 text-xs sm:text-sm">
              <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block">
                  Publicar la página dedicada "Hotel familiar en Mar del Plata"
                </strong>
                <span className="text-slate-500 text-xs">
                  Objetivo de ejemplo: validar la demanda real antes de publicar esta página.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 flex items-start gap-3 text-xs sm:text-sm">
              <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block">
                  Optimizar compresión de fotos de habitaciones a formato WebP
                </strong>
                <span className="text-slate-500 text-xs">
                  Objetivo de ejemplo: definir una meta después de medir PageSpeed y Core Web Vitals.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 flex items-start gap-3 text-xs sm:text-sm">
              <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block">
                  Agregar módulo de Preguntas Frecuentes (FAQ)
                </strong>
                <span className="text-slate-500 text-xs">
                  Objetivo de ejemplo: mejorar claridad y cobertura de preguntas frecuentes; el impacto en IA deberá medirse por separado.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Report Footer */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <span>VISIBILITY AI · Plataforma de Visibilidad Digital para Empresas</span>
          <span>Próxima revisión: pendiente de datos reales</span>
        </div>
      </div>
    </div>
  );
};

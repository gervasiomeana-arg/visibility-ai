import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sortTasksByPriority,
  deduplicateAndReconcileTasks,
  extractFindingType,
} from '../../src/services/storageService';
import { ActionTask, Business } from '../../src/types';

test('sortTasksByPriority orders pending tasks Urgente -> Importante -> Recomendado', () => {
  const tasks: ActionTask[] = [
    {
      id: 'task-1',
      businessId: 'biz-1',
      title: 'Tarea recomendada',
      priority: 'RECOMENDADO',
      status: 'pendiente',
      estimatedImpact: 'Bajo',
      difficulty: 'Fácil',
      simpleExplanation: '',
      stepByStepSolution: [],
      estimatedTimeToFix: '10m',
    },
    {
      id: 'task-2',
      businessId: 'biz-1',
      title: 'Tarea urgente',
      priority: 'URGENTE',
      status: 'pendiente',
      estimatedImpact: 'Alto',
      difficulty: 'Fácil',
      simpleExplanation: '',
      stepByStepSolution: [],
      estimatedTimeToFix: '10m',
    },
    {
      id: 'task-3',
      businessId: 'biz-1',
      title: 'Tarea importante',
      priority: 'IMPORTANTE',
      status: 'pendiente',
      estimatedImpact: 'Medio',
      difficulty: 'Fácil',
      simpleExplanation: '',
      stepByStepSolution: [],
      estimatedTimeToFix: '10m',
    },
    {
      id: 'task-4',
      businessId: 'biz-1',
      title: 'Tarea completada urgente',
      priority: 'URGENTE',
      status: 'completada_manual',
      completionType: 'manual',
      estimatedImpact: 'Alto',
      difficulty: 'Fácil',
      simpleExplanation: '',
      stepByStepSolution: [],
      estimatedTimeToFix: '10m',
    },
  ];

  const sorted = sortTasksByPriority(tasks);
  // Pending tasks must come first, in order: URGENTE -> IMPORTANTE -> RECOMENDADO
  assert.equal(sorted[0].priority, 'URGENTE');
  assert.equal(sorted[0].id, 'task-2');
  assert.equal(sorted[1].priority, 'IMPORTANTE');
  assert.equal(sorted[1].id, 'task-3');
  assert.equal(sorted[2].priority, 'RECOMENDADO');
  assert.equal(sorted[2].id, 'task-1');
  // Completed tasks must come last
  assert.equal(sorted[3].id, 'task-4');
  assert.equal(sorted[3].status, 'completada_manual');
});

test('deduplicateAndReconcileTasks reconciles duplicate finding types and preserves user status and evidence', () => {
  const openVoleyBiz: Business = {
    id: 'biz-voley-1',
    name: 'app voley - Open Voley',
    url: 'https://openvoley.com',
    category: 'Deportes',
    city: 'Buenos Aires',
    country: 'Argentina',
    createdAt: '2026-01-01',
    scores: { overall: 70, google: 70, seo: 70, web: 70, aiVisibility: 70 },
    totalOpportunities: 0,
    problemsCount: { high: 0, medium: 0, ok: 0 },
  };

  const tasks: ActionTask[] = [
    // Duplicate 1: Demo index task (previously marked in progress)
    {
      id: 'task-1',
      businessId: 'biz-voley-1',
      title: 'Corregir páginas que Google no puede indexar (etiquetas noindex)',
      priority: 'URGENTE',
      status: 'en_progreso',
      estimatedImpact: 'Alto',
      difficulty: 'Fácil',
      simpleExplanation: 'Demo explanation',
      stepByStepSolution: [],
      estimatedTimeToFix: '15m',
    },
    // Duplicate 2: Real audit index directive task
    {
      id: 'task-biz-voley-1-robots-meta',
      businessId: 'biz-voley-1',
      findingType: 'robots-meta',
      source: 'seo-audit',
      title: 'Directiva de indexación',
      priority: 'RECOMENDADO',
      status: 'pendiente',
      estimatedImpact: 'Bajo',
      difficulty: 'Fácil',
      simpleExplanation: 'Explicación técnica',
      stepByStepSolution: [],
      estimatedTimeToFix: '15m',
    },
    // Irrelevant hotel task that leaked from mock demo
    {
      id: 'task-3',
      businessId: 'biz-voley-1',
      title: 'Crear página sobre "Hotel familiar en Mar del Plata"',
      priority: 'IMPORTANTE',
      status: 'pendiente',
      estimatedImpact: 'Alto',
      difficulty: 'Media',
      simpleExplanation: 'Hotel mock',
      stepByStepSolution: [],
      estimatedTimeToFix: '1h',
    },
    // Distinct legitimate recommendation (must be conserved!)
    {
      id: 'task-5',
      businessId: 'biz-voley-1',
      title: 'Agregar módulo de Preguntas Frecuentes (FAQ) para visitantes y ChatGPT',
      priority: 'RECOMENDADO',
      status: 'pendiente',
      estimatedImpact: 'Medio',
      difficulty: 'Fácil',
      simpleExplanation: 'FAQ task',
      stepByStepSolution: [],
      estimatedTimeToFix: '30m',
    },
    // H1 task for Open Voley
    {
      id: 'task-biz-voley-1-h1',
      businessId: 'biz-voley-1',
      findingType: 'h1',
      source: 'seo-audit',
      title: 'Encabezado H1',
      priority: 'URGENTE',
      status: 'pendiente',
      estimatedImpact: 'Alto',
      difficulty: 'Fácil',
      simpleExplanation: '0 H1',
      stepByStepSolution: [],
      estimatedTimeToFix: '20m',
    },
  ];

  const reconciled = deduplicateAndReconcileTasks(openVoleyBiz.id, tasks, openVoleyBiz);

  // 1. Hotel task should be excluded for Open Voley
  const hotelTask = reconciled.find((t) => t.id === 'task-3');
  assert.equal(hotelTask, undefined, 'Hotel mock task must not leak into Open Voley');

  // 2. Distinct FAQ task must be conserved!
  const faqTask = reconciled.find((t) => t.id === 'task-5');
  assert.ok(faqTask, 'Distinct tasks like FAQ must be conserved');

  // 3. Merged indexing tasks: should inherit en_progreso status from user!
  const indexingTasks = reconciled.filter((t) => extractFindingType(t) === 'robots-meta');
  assert.equal(indexingTasks.length, 1, 'Duplicate indexing tasks must be merged');
  assert.equal(indexingTasks[0].status, 'en_progreso', 'User status must be preserved when merging');

  // 4. H1 task: Must not be critical error (priority IMPORTANTE), must have userEvidence, and completed manually
  const h1Task = reconciled.find((t) => extractFindingType(t) === 'h1');
  assert.ok(h1Task, 'H1 task must exist');
  assert.equal(h1Task.priority, 'IMPORTANTE', 'H1 must be IMPORTANTE, not URGENTE');
  assert.ok(
    h1Task.simpleExplanation.includes('H1 no detectado en HTML inicial; pendiente de comprobar en la página renderizada'),
    'Must explain initial HTML vs client rendering'
  );
  assert.equal(h1Task.status, 'completada_manual');
  assert.equal(h1Task.completionType, 'manual');
  assert.ok(
    h1Task.userEvidence?.includes('DOM renderizado'),
    'Must record manual DOM verification as user evidence'
  );
});

test('consolidates two identical H1 cards with old text "No encontramos un H1 principal" into one with updated text and IMPORTANTE priority', () => {
  const openVoleyBiz: Business = {
    id: 'biz-voley-open',
    name: 'Open Voley',
    url: 'https://openvoley.com',
    category: 'Deportes',
    city: 'Buenos Aires',
    country: 'Argentina',
    createdAt: '2026-01-01',
    scores: { overall: 70, google: 70, seo: 70, web: 70, aiVisibility: 70 },
    totalOpportunities: 0,
    problemsCount: { high: 0, medium: 0, ok: 0 },
  };

  // Two old saved H1 tasks that both had URGENTE and "No encontramos un H1 principal"
  const tasks: ActionTask[] = [
    {
      id: 'task-biz-voley-open-h1',
      businessId: 'biz-voley-open',
      url: 'https://openvoley.com',
      title: 'Encabezado H1',
      priority: 'URGENTE',
      status: 'pendiente',
      estimatedImpact: 'Alto',
      difficulty: 'Fácil',
      simpleExplanation: 'No encontramos un H1 principal en el HTML inicial recibido.',
      stepByStepSolution: [],
      estimatedTimeToFix: '20m',
    },
    {
      id: 'task-openvoley-h1',
      businessId: 'biz-voley-open',
      url: 'https://openvoley.com/',
      title: 'Encabezado H1',
      priority: 'URGENTE',
      status: 'completada_manual',
      completionType: 'manual',
      userEvidence: 'Comprobación manual del usuario: Se detectó un encabezado H1 en el DOM renderizado (evidencia aportada por el usuario, no medición automática del servidor).',
      estimatedImpact: 'Alto',
      difficulty: 'Fácil',
      simpleExplanation: 'No encontramos un H1 principal en el HTML inicial recibido.',
      stepByStepSolution: [],
      estimatedTimeToFix: '20m',
    },
  ];

  const reconciled = deduplicateAndReconcileTasks(openVoleyBiz.id, tasks, openVoleyBiz);

  // Must be consolidated into EXACTLY 1 task
  const h1Tasks = reconciled.filter((t) => extractFindingType(t) === 'h1');
  assert.equal(h1Tasks.length, 1, 'Two duplicate H1 tasks must be consolidated into exactly one');

  const h1 = h1Tasks[0];
  // Must NOT be URGENTE
  assert.equal(h1.priority, 'IMPORTANTE', 'H1 must NOT be classified as URGENTE');
  // Must NOT have old text
  assert.ok(!h1.simpleExplanation.includes('No encontramos un H1 principal'), 'Must not contain old text "No encontramos un H1 principal"');
  assert.ok(
    h1.simpleExplanation.includes('H1 no detectado en HTML inicial; pendiente de comprobar en la página renderizada'),
    'Must use exact requested explanation'
  );
  // Must preserve user manual evidence
  assert.equal(h1.status, 'completada_manual', 'Must preserve completada_manual status');
  assert.equal(h1.completionType, 'manual', 'Must preserve manual completion type');
  assert.ok(h1.userEvidence?.includes('DOM renderizado'), 'Must preserve user evidence');
});

test('repeating an audit does not generate a duplicate task for the same finding', () => {
  const biz: Business = {
    id: 'biz-test-repeat',
    name: 'Mi Negocio',
    url: 'https://example.com',
    category: 'Comercio',
    city: 'Santiago',
    country: 'Chile',
    createdAt: '2026-01-01',
    scores: { overall: 70, google: 70, seo: 70, web: 70, aiVisibility: 70 },
    totalOpportunities: 0,
    problemsCount: { high: 0, medium: 0, ok: 0 },
  };

  const existingTask: ActionTask = {
    id: 'task-biz-test-repeat-canonical',
    businessId: 'biz-test-repeat',
    url: 'https://example.com',
    findingType: 'canonical',
    title: 'URL canónica',
    priority: 'IMPORTANTE',
    status: 'en_progreso',
    estimatedImpact: 'Medio',
    difficulty: 'Fácil',
    simpleExplanation: 'Explicación existente',
    stepByStepSolution: [],
    estimatedTimeToFix: '15m',
  };

  // Repeated audit generates a task for canonical on the same URL
  const repeatAuditTask: ActionTask = {
    id: 'task-biz-test-repeat-canonical',
    businessId: 'biz-test-repeat',
    url: 'https://example.com',
    findingType: 'canonical',
    source: 'seo-audit',
    title: 'URL canónica',
    priority: 'IMPORTANTE',
    status: 'pendiente',
    estimatedImpact: 'Medio',
    difficulty: 'Fácil',
    simpleExplanation: 'Explicación fresca del nuevo análisis',
    stepByStepSolution: [],
    estimatedTimeToFix: '15m',
  };

  const reconciled = deduplicateAndReconcileTasks(biz.id, [existingTask, repeatAuditTask], biz);
  const canonicalTasks = reconciled.filter((t) => extractFindingType(t) === 'canonical');

  assert.equal(canonicalTasks.length, 1, 'Repeating audit must NOT create a duplicate task');
  assert.equal(canonicalTasks[0].status, 'en_progreso', 'User progress status must be preserved');
});

test('tasks with distinct URLs are preserved and distinguished', () => {
  const biz: Business = {
    id: 'biz-multi-url',
    name: 'Multi Page Site',
    url: 'https://example.com',
    category: 'Servicios',
    city: 'Madrid',
    country: 'España',
    createdAt: '2026-01-01',
    scores: { overall: 70, google: 70, seo: 70, web: 70, aiVisibility: 70 },
    totalOpportunities: 0,
    problemsCount: { high: 0, medium: 0, ok: 0 },
  };

  const taskHome: ActionTask = {
    id: 'task-home-h1',
    businessId: 'biz-multi-url',
    url: 'https://example.com/',
    findingType: 'h1',
    title: 'Encabezado H1',
    priority: 'IMPORTANTE',
    status: 'pendiente',
    estimatedImpact: 'Medio',
    difficulty: 'Fácil',
    simpleExplanation: 'Home H1',
    stepByStepSolution: [],
    estimatedTimeToFix: '15m',
  };

  const taskBlog: ActionTask = {
    id: 'task-blog-h1',
    businessId: 'biz-multi-url',
    url: 'https://example.com/blog/articulo-1',
    findingType: 'h1',
    title: 'Encabezado H1',
    priority: 'IMPORTANTE',
    status: 'pendiente',
    estimatedImpact: 'Medio',
    difficulty: 'Fácil',
    simpleExplanation: 'Blog H1',
    stepByStepSolution: [],
    estimatedTimeToFix: '15m',
  };

  const reconciled = deduplicateAndReconcileTasks(biz.id, [taskHome, taskBlog], biz);
  const h1Tasks = reconciled.filter((t) => extractFindingType(t) === 'h1');

  assert.equal(h1Tasks.length, 2, 'Tasks from distinctly different URLs must be preserved');
  assert.ok(h1Tasks.some((t) => t.url?.includes('/blog/articulo-1')), 'Blog URL must be preserved');
});


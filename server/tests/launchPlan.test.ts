import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {launchControls,launchProgress,recordLaunchCheck,validateLaunchChecks,type LaunchPlan} from '../../shared/launchPlan';
import {LaunchChecklist} from '../../src/components/LaunchChecklist';
import type {Workspace} from '../../src/types';

test('launch controls stay pending until evidence is recorded and can be reopened',()=>{
  const initial:LaunchPlan={workspaceId:'own',checks:{}};
  assert.deepEqual(launchProgress(initial),{completed:0,total:7});
  assert.throws(()=>recordLaunchCheck(initial,'pdf',true,'OK','2026-10-14T19:00:00Z'),/Describí/);
  const done=recordLaunchCheck(initial,'pdf',true,'PDF real de Neomed revisado, datos y páginas comprobados.','2026-10-14T19:00:00Z');
  assert.equal(launchProgress(done).completed,1);assert.equal(launchProgress(initial).completed,0);
  assert.equal(launchProgress(recordLaunchCheck(done,'pdf',false,'Nueva revisión pendiente.','2026-10-14T19:01:00Z')).completed,0);
  validateLaunchChecks(done.checks);
  assert.throws(()=>validateLaunchChecks({pdf:{done:true,evidence:'OK',recordedAt:'invalid'}}));
});

test('persistent launch panel shows all three planned jornadas without declaring live checks completed',()=>{
  const html=renderToStaticMarkup(React.createElement(LaunchChecklist,{workspace:{id:'own',role:'owner',timezone:'America/Argentina/Buenos_Aires'} as Workspace,onNavigate:()=>{}}));
  for(const control of launchControls)assert.ok(html.includes(control.title));
  for(const day of [1,2,3])assert.ok(html.includes(`Jornada ${day}`));
  assert.ok(html.includes('no-print'));assert.ok(html.includes('0/7'));assert.ok(!html.includes('line-through'));
});

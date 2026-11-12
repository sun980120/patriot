const { test } = require('node:test');
const assert = require('node:assert/strict');
const { interpolateObjects, isTacticProject, normalizeTacticProject } = require('./load-typescript.cjs')('lib/tactics.ts');

test('shared scene animation interpolates positions without modifying the snapshot', () => {
  const from = [{ id:'player', kind:'player', team:'home', x:100, y:100 }];
  const to = [{ ...from[0], x:300, y:200 }];
  const middle = interpolateObjects(from,to,.5);
  assert.equal(middle[0].x,200);
  assert.equal(middle[0].y,150);
  assert.equal(from[0].x,100);
  assert.equal(to[0].x,300);
  assert.equal(interpolateObjects(from,to,1)[0].x,300);
});
test('shared projects retain both board formats and reject empty scenes', () => {
  const project = { version:1, id:'shared', title:'전술', scenes:[{ id:'scene', objects:[], paths:[], durationMs:1000 }] };
  assert.equal(isTacticProject(project),true);
  assert.equal(normalizeTacticProject(project).boardType,'board-1');
  assert.equal(normalizeTacticProject({ ...project, boardType:'board-2' }).boardType,'board-2');
  assert.equal(isTacticProject({ ...project, scenes:[] }),false);
});

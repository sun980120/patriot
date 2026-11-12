const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const cache = new Map();

module.exports = function loadTypescript(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  if (cache.has(filename)) return cache.get(filename);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  cache.set(filename, module.exports);
  vm.runInNewContext(output, {
    module, exports: module.exports, Intl, Date,
    require: (name) => {
      if (name.startsWith('@/lib/')) return loadTypescript(name.slice(2) + '.ts');
      throw new Error(`Unexpected dependency: ${name}`);
    },
  }, { filename });
  return module.exports;
};

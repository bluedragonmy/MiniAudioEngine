// Same cases as cpp/tests/test_aliasing.cpp, so the C++ and JS
// versions are held to identical behaviour.
// Run: node site/js/dsp/aliasing.test.mjs

import { aliasFrequency, SampleRateReducer } from './aliasing.js';

let failures = 0;
function check(name, ok) {
  if (!ok) failures++;
  console.log(`${name} ${ok ? 'OK' : 'WRONG'}`);
}

// 1: aliasFrequency, fs = 8000
const cases = [[1000, 1000], [3000, 3000], [4000, 4000], [5000, 3000],
               [7000, 1000], [8000, 0], [9000, 1000], [-5000, 3000]];
for (const [f, want] of cases) {
  const got = aliasFrequency(f, 8000);
  check(`${f} -> ${got}`, got === want);
}

// 2: 6x reduction, every 6 outputs identical
{
  const r = new SampleRateReducer(48000);
  r.setTargetRate(8000);
  const want = [1, 1, 1, 1, 1, 1, 7, 7, 7, 7, 7, 7];
  check('6x', want.every((w, i) => r.process(i + 1) === w));
}

// 3: target == host, output equals input
{
  const r = new SampleRateReducer(48000);
  r.setTargetRate(48000);
  check('same', [1, 2, 3, 4, 5, 6].every(v => r.process(v) === v));
}

// 4: non-integer ratio (48000 -> 7000), exactly 7000 updates per second
{
  const r = new SampleRateReducer(48000);
  r.setTargetRate(7000);
  let last = -1, updates = 0;
  for (let i = 1; i <= 48000; i++) {
    const v = r.process(i);
    if (v !== last) { updates++; last = v; }
  }
  check(`48000->7000 updates/s = ${updates}`, updates === 7000);
}

console.log(failures === 0 ? 'ALL PASSED' : 'FAILED');
process.exitCode = failures === 0 ? 0 : 1;

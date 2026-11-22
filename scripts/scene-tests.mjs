import assert from 'node:assert/strict';
import { closeCurriculum, finish, openCurriculum, openQaPage, runOnly, switchMode } from './qa-helpers.mjs';
const qa = await openQaPage(); const { page } = qa; await switchMode(page, 'sandbox'); await openCurriculum(page);
for (const [id, code] of [['dragon', 'class Robot:\n    def __init__(self, name):\n        self.name = name\nprint(Robot("Nova").name)'], ['train', 'loot = ["core"]\nloot.append("star")\nprint(loot)'], ['loops', 'for n in range(1, 4):\n    print(n)'], ['recursion', 'def f(n):\n    return "LIFTOFF" if n <= 0 else f(n - 1)\nprint(f(3))']]) {
  await page.getByTestId(`sandbox-example-${id}`).click(); await closeCurriculum(page); await runOnly(page, code); assert.ok((await page.getByTestId('tests-panel-body').innerText()).length > 0);
  if (id !== 'recursion') await openCurriculum(page);
}
console.log('SCENE PASS'); await finish(qa);

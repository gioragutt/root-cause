import childProcess from 'child_process';
import path from 'path';
import { getCleanAllPathsPrettyFormatPlugin } from '@testim/internal-self-tests-helpers';

describe('jest integration test', () => {
  expect.addSnapshotSerializer(getCleanAllPathsPrettyFormatPlugin(process.cwd()));

  test('Validate jest run output and root cause ls', async () => {
    const jestRunResult = await execResults('yarn jest -c for-integration-test/jest.config.js', {
      cwd: path.resolve(__dirname, '../../jest-tester-and-example'),
      env: {
        ...process.env,
        PUPPETEER_WS_ENDPOINT: '',
        TESTIM_PERSIST_RESULTS_TO_CLOUD: '',
        FORCE_COLOR: '0',
      },
    });

    jestRunResult.stderr = jestRunResult.stderr.replace(/Time: .+$/gm, 'Time: NOISE REMOVED');

    jestRunResult.stderr = jestRunResult.stderr.replace(/ ?\([0-9\.]+ m?s\)$/gm, '');

    expect(jestRunResult.stderr).toMatchInlineSnapshot(`
      "FAIL browser: chromium for-integration-test/example1.test.ts
        ● Some test suite › This that should fail

          To open in Root Cause viewer, run: npx root-cause show f1d40d3cf143b37409f8b8d500980b67
           Error: 'Make violation... no so much' is not included in 'Make violation' of '#forviolation'.

            107 | 
            108 |       try {
          > 109 |         const returnValue = theMatcherFunction(...args);
                |                             ^
            110 | 
            111 |         if (!isPromise(returnValue)) {
            112 |           matcherEndHandler.sync({ success: true });

            at Proxy.wrappedFunction_root_toHaveText (../../root-cause-jest/lib/hookExpect.ts:109:29)
            at Object.<anonymous> (example1.test.ts:23:24)'

      Test Suites: 1 failed, 1 total
      Tests:       1 failed, 1 passed, 2 total
      Snapshots:   0 total
      Time: NOISE REMOVED
      Ran all test suites.
      error Command failed with exit code 1.
      "
    `);

    const rootCauseLs = await execResults(
      'node -r ts-node/register ../root-cause-core/lib/cli.ts ls',
      {
        cwd: path.resolve(__dirname, '../../jest-tester-and-example'),
      }
    );

    rootCauseLs.stdout = rootCauseLs.stdout.replace(/Run id: [^\n]+/, 'Run id: noise removed');
    rootCauseLs.stdout = rootCauseLs.stdout.replace(/Run time: [^\n]+/, 'Run time: noise removed');

    expect(rootCauseLs).toMatchInlineSnapshot(`
      Object {
        "error": null,
        "stderr": "",
        "stdout": "Run id: noise removed
      Run time: noise removed
      ┌─────────┬────────────────────────────────────┬─────────────────────────┬─────────┐
      │ (index) │                 id                 │          name           │ success │
      ├─────────┼────────────────────────────────────┼─────────────────────────┼─────────┤
      │    0    │ '849716b92ae3ae73996469498df59e6f' │ 'This test should pass' │  true   │
      │    1    │ 'f1d40d3cf143b37409f8b8d500980b67' │ 'This that should fail' │  false  │
      └─────────┴────────────────────────────────────┴─────────────────────────┴─────────┘
      ",
      }
    `);
  }, 120_000);
});

async function execResults(command: string, options?: childProcess.ProcessEnvOptions) {
  return new Promise<{
    error: childProcess.ExecException | null;
    stderr: string;
    stdout: string;
  }>((res) => {
    childProcess.exec(command, options, (error, stdout, stderr) => {
      res({
        error,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
      });
    });
  });
}

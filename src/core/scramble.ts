// This configures cubing.js's random-scramble worker only. LBL solutions
// always come from our teaching rules, never the library's search solvers.
export async function generateScramble(): Promise<string> {
  const [{ setSearchDebug }, { randomScrambleForEvent }] = await Promise.all([
    import('cubing/search'),
    import('cubing/scramble'),
  ]);
  // Prefer the bundler-resolved hashed URL instead of probing an absent
  // search-worker-entry.js file (a worker parse error in WebKit).
  setSearchDebug({ prioritizeEsbuildWorkaroundForWorkerInstantiation: true, logPerf: false });
  return (await randomScrambleForEvent('333')).toString();
}

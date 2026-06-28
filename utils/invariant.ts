// Phase 19 — Architecture Lockdown.
// Invariant pipeline: komponen presentasi WAJIB menerima output engine via props.
// `undefined` = bug wiring orchestrator (engine TIDAK boleh dijalankan di komponen) →
// lempar error. Di development tampil sebagai error overlay; di production ditangkap
// ErrorBoundary yang membungkus tiap panel. `null` TETAP valid (pipeline jalan tapi
// data belum/ tidak cukup) dan ditangani oleh empty/loading state masing-masing komponen.
export function requirePipelineProp<T>(value: T | undefined, propName: string, component: string): T {
  if (value === undefined) {
    throw new Error(
      `[Pipeline Invariant] <${component}> menerima prop "${propName}" = undefined. ` +
      `Orchestrator (page.jsx) wajib men-supply output engine. ` +
      `Komponen presentasi tidak menjalankan engine apa pun.`
    );
  }
  return value;
}

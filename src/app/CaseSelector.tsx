import type { CaseExample } from '../content/course-types';
export function CaseSelector({ examples, value, onChange }: { examples: readonly CaseExample[]; value: string; onChange: (id: string) => void }) {
  return <div className="case-selector"><label htmlFor="practice-case">Practice case</label><select id="practice-case" value={value} onChange={e => onChange(e.target.value)}><option value="guided">Full guided example</option>{examples.map(example => <option key={example.id} value={example.id}>{example.title}</option>)}</select><p>Case jumps change the on-screen cube instantly. On a physical cube, follow the scramble and all earlier moves first.</p></div>;
}

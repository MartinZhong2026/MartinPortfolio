import { projectBySlug } from '../../data/projects';
import { CasePage, Mock, ProjectSheet, Tag } from '../../components/case';

const p = projectBySlug('abtrace');

export function AbTrace() {
  return (
    <CasePage project={p} end={false}>
      <ProjectSheet
        project={p}
        oneLiner="Make complicated scientific work easier to coordinate, without oversimplifying the science."
        what="An interactive workflow prototype for antibody R&D teams: a shared project timeline, role-based workspaces, review steps (draft → review → return / revise → approve) and traceable version history."
        users="Lab scientists, reviewers and project managers working across stages such as antigen preparation, screening, sequencing, expression and laboratory evaluation."
        problems={[
          'Different people need different answers: “What is blocked?”, “What should I do next?”, “What changed, and who approved it?” One crowded dashboard answers none of them.',
          'Revisions and approvals get lost between documents and people.',
          'Scientific rules are easy to hard-code wrongly — the prototype keeps them provisional and reviewable by domain experts.',
        ]}
        role="Discovery conversations · requirements translation · UI and workflow design · prototype development and testing (enterprise client prototype, anonymised)"
        layout="logo-visual"
        images={[{ src: '/assets/abtrace/logo.webp', width: 900, height: 900, frame: 'logo', alt: 'AbTrace app logo: a stylised letter A joined by connected nodes.' }]}
        visual={
          <>
            <div className="sheet__steps" aria-label="Review states">
              {['Draft', 'Review', 'Return / revise', 'Approve'].map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
            <Mock title="Record · version history" caption="Recreated with invented placeholder data. No client names, sequences, documents or thresholds.">
            <div className="mock__body">
              <div className="row">
                <span className="k">Record</span>
                <span className="v">Sample record A-01</span>
                <span className="src">v3 · current</span>
              </div>
              <div className="row">
                <span className="k">Stage</span>
                <span className="v">Screening</span>
                <span className="ok">Approved</span>
              </div>
              <div className="row">
                <span className="k">Changed</span>
                <span>Field “notes” edited by Role: Scientist</span>
                <span className="src">v2 → v3</span>
              </div>
              <div className="row">
                <span className="k">Review</span>
                <span>Returned once with comments, then approved by Role: Reviewer</span>
                <span className="warn">1 return</span>
              </div>
            </div>
          </Mock>
            <p className="stats-note">
              <Tag kind="concept">Anonymised</Tag> No client screenshots, names, sequences or thresholds are shown.
            </p>
          </>
        }
        limits="A discovery and testing prototype — not a production LIMS, a validated assay workflow or a client-accepted final system. Scientific SOPs, thresholds and permissions still need formal client confirmation."
      />
    </CasePage>
  );
}

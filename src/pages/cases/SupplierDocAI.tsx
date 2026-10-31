import { projectBySlug } from '../../data/projects';
import { CasePage, Mock, ProjectSheet } from '../../components/case';

const p = projectBySlug('supplier-document-intelligence');

export function SupplierDocAI() {
  return (
    <CasePage project={p} end={false}>
      <ProjectSheet
        project={p}
        oneLiner="The important question isn't only what the AI extracted. It's whether someone can verify it."
        what="A procurement-review prototype that reads supplier quotations and specifications, checks them against each other, flags conflicts, and prepares an approved ERP draft — with the source evidence beside every value."
        users="Procurement and supplier-pricing analysts who prepare the data, and procurement managers who approve it."
        problems={[
          'Quotations and specifications arrive in inconsistent formats; one wrong quantity break or outdated revision causes downstream errors.',
          'A generic AI extraction shows a neat result, but not where each value came from or whether two documents disagree.',
          'Re-typing data into ERP is slow — yet automating it must not hide who checked and approved the change.',
        ]}
        role="Requirements analysis · product flow · AI-assisted prototyping · evidence design · testing (enterprise client prototype, anonymised)"
        layout="logo-visual"
        images={[{ src: '/assets/icons/document-ai.png', width: 512, height: 512, frame: 'logo', alt: 'Document AI app icon: document lines with an AI badge.' }]}
        visual={
          <>
            <div className="sheet__steps" aria-label="Review flow">
              {['Extract', 'Show evidence', 'Check conflicts', 'Analyst review', 'Manager approval', 'ERP draft'].map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
            <Mock title="Review · DEMO-QUOTE-001 vs DEMO-SPEC-001" caption="Synthetic demo documents and invented values only — no client, supplier or real price data.">
          <div className="mock-split">
            <div>
              <div className="row">
                <span className="k">Supplier</span>
                <span className="v">Demo Components Ltd.</span>
                <span className="src">Quote p.1</span>
              </div>
              <div className="row">
                <span className="k">Part</span>
                <span className="v">DEMO-PN-100</span>
                <span className="src">Quote p.1</span>
              </div>
              <div className="row">
                <span className="k">Revision</span>
                <span className="v">Rev B</span>
                <span className="warn">Spec says Rev C</span>
              </div>
              <div className="row">
                <span className="k">Qty tier 1k+</span>
                <span className="v">0.00 USD / pc</span>
                <span className="src">Quote table</span>
              </div>
              <div className="row">
                <span className="k">Validity</span>
                <span className="v">14 days</span>
                <span className="warn">Below threshold</span>
              </div>
              <div className="row">
                <span className="k">Incoterm</span>
                <span className="v">FOB</span>
                <span className="ok">Checked</span>
              </div>
            </div>
            <div>
              <p className="k" style={{ margin: '0 0 10px' }}>
                Source evidence
              </p>
              <div className="doc-snippet">
                DEMO QUOTATION — sample only{'\n'}
                Part: DEMO-PN-100 <mark>Rev B</mark>
                {'\n'}
                Qty 1,000+ … unit price …{'\n'}
                Valid for <mark>14 days</mark> from issue
              </div>
              <p className="k" style={{ margin: '14px 0 8px' }}>
                Status
              </p>
              <p style={{ margin: 0 }}>
                2 exceptions need analyst review before this record can be sent for approval.
              </p>
            </div>
          </div>
        </Mock>
          </>
        }
        limits="A synthetic-document prototype: no measured extraction accuracy, certified pipeline or production ERP connection is claimed, and nothing is posted, ordered or paid automatically."
      />
    </CasePage>
  );
}

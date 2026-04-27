// src/pages/LandingPage.jsx
// Public landing page — no nav links, no footer links, padding added for focus.
// "Generate your card" CTA links to the generate page.

export default function LandingPage() {
  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, Arial, sans-serif; background: #faf8f4; }
        .nav { background: #2c3038; padding: 12px 100px; display: flex; align-items: center; justify-content: space-between; border-bottom: 0.5px solid #404850; }
        .logo { font-size: 13px; font-weight: 700; letter-spacing: .12em; color: #904060; }
        .cta { font-size: 11px; font-weight: 700; color: #faf8f4; background: #904060; padding: 5px 14px; border-radius: 3px; text-decoration: none; cursor: pointer; border: none; }
        .cta:hover { background: #7a3452; }
        .hero { padding: 48px 100px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; background: #faf8f4; border-bottom: 0.5px solid #d8d0c4; }
        .eyebrow { font-size: 9px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #904060; margin-bottom: 12px; }
        .hero h1 { font-size: 28px; font-weight: 700; color: #1a1410; line-height: 1.3; margin-bottom: 14px; }
        .hero p { font-size: 12px; color: #706050; line-height: 1.8; margin-bottom: 22px; }
        .btn-primary { display: inline-block; background: #904060; color: #fff; font-size: 11px; font-weight: 700; padding: 10px 22px; border-radius: 3px; text-decoration: none; border: none; cursor: pointer; }
        .btn-primary:hover { background: #7a3452; }
        .sub { font-size: 10px; color: #a09080; margin-top: 10px; }
        .card-mini { background: white; border-radius: 8px; border: 1px solid #281020; overflow: hidden; }
        .chdr { background: #2c3038; padding: 14px 16px; }
        .caccent { height: 2px; background: #904060; }
        .clogo { font-size: 7px; font-weight: 700; letter-spacing: .16em; color: #904060; margin-bottom: 6px; }
        .csummary { font-size: 9px; color: #909aa8; line-height: 1.5; }
        .cbody { padding: 12px 16px; }
        .csec { font-size: 7px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #706050; margin: 8px 0 5px; border-bottom: 0.5px solid #d8d0c8; padding-bottom: 2px; }
        .csec:first-child { margin-top: 0; }
        .cpill { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 8px; font-weight: 700; margin-right: 3px; margin-bottom: 3px; }
        .pfn { background: #2c3038; color: #c87090; }
        .pka { background: #904060; color: #1a0810; }
        .pind { background: #edeae6; color: #403830; border: 0.5px solid #c8c0b8; }
        .cfoot { padding: 7px 16px; border-top: 0.5px solid #d8d0c8; display: flex; justify-content: space-between; }
        .cfoot span { font-size: 7.5px; color: #b0a898; }
        .cfoot .brand { font-weight: 700; color: #682848; letter-spacing: .08em; }
        .how { padding: 56px 100px; background: #faf8f4; border-bottom: 0.5px solid #d8d0c4; }
        .section-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #904060; margin-bottom: 8px; }
        .section-title { font-size: 22px; font-weight: 700; color: #1a1410; margin-bottom: 36px; }
        .steps { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; }
        .step-num { font-size: 32px; font-weight: 700; color: #e8d8cc; margin-bottom: 10px; line-height: 1; }
        .step-divider { width: 24px; height: 2px; background: #904060; margin-bottom: 12px; }
        .step-title { font-size: 14px; font-weight: 700; color: #1a1410; margin-bottom: 8px; }
        .step-body { font-size: 11.5px; color: #706050; line-height: 1.75; }
        .taxonomy { padding: 56px 100px; background: #2c3038; border-bottom: 0.5px solid #404850; }
        .taxonomy .section-eyebrow { color: #904060; }
        .taxonomy .section-title { color: #faf8f4; margin-bottom: 12px; }
        .taxonomy .section-intro { font-size: 12px; color: #909aa8; line-height: 1.8; margin-bottom: 36px; max-width: 560px; }
        .dims { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .dim { background: #363c44; border-radius: 6px; padding: 18px 20px; border: 0.5px solid #404850; }
        .dim-label { font-size: 7.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #904060; margin-bottom: 6px; }
        .dim-title { font-size: 14px; font-weight: 700; color: #faf8f4; margin-bottom: 8px; }
        .dim-body { font-size: 11px; color: #808898; line-height: 1.7; }
        .recruiter { padding: 56px 100px; background: #f0ece4; border-bottom: 0.5px solid #d8d0c4; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
        .recruiter .section-eyebrow { color: #904060; }
        .recruiter h2 { font-size: 22px; font-weight: 700; color: #1a1410; margin-bottom: 14px; line-height: 1.35; }
        .recruiter p { font-size: 12px; color: #706050; line-height: 1.8; margin-bottom: 24px; }
        .recruiter-features { display: flex; flex-direction: column; gap: 14px; }
        .rf { display: flex; align-items: flex-start; gap: 12px; }
        .rf-dot { width: 6px; height: 6px; border-radius: 50%; background: #904060; margin-top: 5px; flex-shrink: 0; }
        .rf-title { font-size: 12px; font-weight: 700; color: #1a1410; margin-bottom: 3px; }
        .rf-body { font-size: 11px; color: #706050; line-height: 1.6; }
        .data { padding: 48px 100px; background: #faf8f4; border-bottom: 0.5px solid #d8d0c4; text-align: center; }
        .data-title { font-size: 18px; font-weight: 700; color: #1a1410; margin-bottom: 6px; }
        .data-sub { font-size: 12px; color: #706050; margin-bottom: 32px; }
        .data-points { display: flex; justify-content: center; gap: 40px; flex-wrap: wrap; }
        .dp { text-align: left; max-width: 170px; }
        .dp-accent { width: 16px; height: 2px; background: #904060; margin-bottom: 8px; }
        .dp-title { font-size: 12px; font-weight: 700; color: #1a1410; margin-bottom: 5px; }
        .dp-body { font-size: 11px; color: #a09080; line-height: 1.65; }
        .footer { background: #2c3038; padding: 24px 100px; display: flex; align-items: center; justify-content: space-between; }
        .footer-logo { font-size: 12px; font-weight: 700; letter-spacing: .12em; color: #904060; }
        .footer-copy { font-size: 10px; color: #404850; }
        @media (max-width: 700px) {
          .nav { padding: 12px 20px; }
          .hero { padding: 32px 20px; grid-template-columns: 1fr; }
          .how { padding: 40px 20px; }
          .steps { grid-template-columns: 1fr; gap: 24px; }
          .taxonomy { padding: 40px 20px; }
          .dims { grid-template-columns: 1fr; }
          .recruiter { padding: 40px 20px; grid-template-columns: 1fr; }
          .data { padding: 40px 20px; }
          .footer { padding: 20px; }
        }
      `}</style>

      {/* Nav — logo + CTA only, no links */}
      <div className="nav">
        <span className="logo">RENSUME</span>
        <a href="/generate" className="cta">Generate your card</a>
      </div>

      {/* Hero */}
      <div className="hero">
        <div>
          <div className="eyebrow">Taxonomy-driven candidate profiles</div>
          <h1>What you've done, not where you've been.</h1>
          <p>Rensume builds a structured profile that translates your experience into a language recruiters understand — whatever path you took to get here.</p>
          <a href="/generate" className="btn-primary">Generate your card</a>
          <p className="sub">Free to generate · no account required</p>
        </div>
        <div className="card-mini">
          <div className="chdr">
            <div className="clogo">RENSUME · TAXONOMY PROFILE</div>
            <div className="csummary">Customer operations specialist with 8 years building operational infrastructure and analyzing customer pain points in emerging tech.</div>
          </div>
          <div className="caccent"></div>
          <div className="cbody">
            <div className="csec">Function</div>
            <span className="cpill pfn">Experienced Process Manager</span><span className="cpill pfn">Experienced Process Specialist</span>
            <div className="csec">Knowledge area</div>
            <span className="cpill pka">Business Operations Specialists</span><span className="cpill pka">Financial Specialists</span>
            <div className="csec">Industry</div>
            <span className="cpill pind">Information</span><span className="cpill pind">Finance & Insurance</span>
          </div>
          <div className="cfoot"><span>Candidate-owned · read-only for recruiters</span><span className="brand">RENSUME</span></div>
        </div>
      </div>

      {/* How it works */}
      <div className="how">
        <div className="section-eyebrow">How it works</div>
        <div className="section-title">Three steps to a profile that works harder.</div>
        <div className="steps">
          <div>
            <div className="step-num">01</div>
            <div className="step-divider"></div>
            <div className="step-title">Paste your resume</div>
            <div className="step-body">Copy the text from your existing resume and paste it in. Plain text works best — no need to preserve formatting.</div>
          </div>
          <div>
            <div className="step-num">02</div>
            <div className="step-divider"></div>
            <div className="step-title">Review your card</div>
            <div className="step-body">Rensume classifies your experience across three dimensions — function, knowledge area, and industry. Review it, pick your theme, and make any corrections.</div>
          </div>
          <div>
            <div className="step-num">03</div>
            <div className="step-divider"></div>
            <div className="step-title">Download and share</div>
            <div className="step-body">Download your card as a PDF and attach it to job applications. Every card includes a QR code so recruiters can verify it came from Rensume.</div>
          </div>
        </div>
      </div>

      {/* Taxonomy */}
      <div className="taxonomy">
        <div className="section-eyebrow">The taxonomy</div>
        <div className="section-title">Three dimensions. One clear picture.</div>
        <div className="section-intro">Traditional resumes describe where you've worked. Rensume describes what you actually did there — across three structured dimensions that give recruiters a consistent, comparable view of every candidate.</div>
        <div className="dims">
          <div className="dim">
            <div className="dim-label">Dimension 01</div>
            <div className="dim-title">Function</div>
            <div className="dim-body">How you operated — whether you executed processes, designed them, led people, or set direction. Independent of title or industry.</div>
          </div>
          <div className="dim">
            <div className="dim-label">Dimension 02</div>
            <div className="dim-title">Knowledge area</div>
            <div className="dim-body">What domains of knowledge your work drew on — the fields you operated in, regardless of what your employer called your role.</div>
          </div>
          <div className="dim">
            <div className="dim-label">Dimension 03</div>
            <div className="dim-title">Industry</div>
            <div className="dim-body">The sectors you've worked in, classified by a standard industry framework so recruiters can filter meaningfully across candidates.</div>
          </div>
        </div>
      </div>

      {/* For recruiters */}
      <div className="recruiter">
        <div>
          <div className="section-eyebrow">For recruiters</div>
          <h2>Find candidates by what they've done, not what they're called.</h2>
          <p>Search our candidate database using the same taxonomy framework — filter by function level, knowledge area, industry, and seniority. Every profile includes evidence citations so you can verify fit before you reach out.</p>
        </div>
        <div className="recruiter-features">
          <div className="rf"><div className="rf-dot"></div><div><div className="rf-title">Taxonomy-based search</div><div className="rf-body">Filter by function level, knowledge area, industry, and years of experience — not just keywords.</div></div></div>
          <div className="rf"><div className="rf-dot"></div><div><div className="rf-title">Evidence-backed profiles</div><div className="rf-body">Every classification includes resume citations. You can see exactly what supports each tag.</div></div></div>
          <div className="rf"><div className="rf-dot"></div><div><div className="rf-title">Save candidates and searches</div><div className="rf-body">Bookmark candidates and save your search filters for future hiring cycles.</div></div></div>
        </div>
      </div>

      {/* Data policy */}
      <div className="data">
        <div className="data-title">Your data, your choice.</div>
        <div className="data-sub">Decide what we save, and what recruiters see.</div>
        <div className="data-points">
          <div className="dp"><div className="dp-accent"></div><div className="dp-title">No surprise storage</div><div className="dp-body">Your resume is deleted after we build your card unless you tell us otherwise.</div></div>
          <div className="dp"><div className="dp-accent"></div><div className="dp-title">You control visibility</div><div className="dp-body">Recruiters only see what you choose to share. Turn discoverability on or off anytime.</div></div>
          <div className="dp"><div className="dp-accent"></div><div className="dp-title">Minimum necessary</div><div className="dp-body">We only ask for information we actually need. Nothing more.</div></div>
          <div className="dp"><div className="dp-accent"></div><div className="dp-title">Delete anytime</div><div className="dp-body">Your account, your card, your data. Remove everything whenever you want.</div></div>
        </div>
      </div>

      {/* Footer — logo + copyright only, no links */}
      <div className="footer">
        <span className="footer-logo">RENSUME</span>
        <span className="footer-copy">© 2025 Rensume</span>
      </div>
    </>
  )
}

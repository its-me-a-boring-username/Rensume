export default function RecruiterLandingPage() {
  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, Arial, sans-serif; background: #1a1e24; }

        .inner { max-width: 1280px; margin: 0 auto; }

        .nav { background: #1a1e24; border-bottom: 0.5px solid #2c3038; }
        .nav .inner { padding: 12px 48px; display: flex; align-items: center; justify-content: space-between; }
        .logo { font-size: 13px; font-weight: 700; letter-spacing: .12em; color: #904060; }
        .cta { font-size: 11px; font-weight: 700; color: #faf8f4; background: #904060; padding: 5px 14px; border-radius: 3px; text-decoration: none; }
        .cta:hover { background: #7a3452; }

        .hero { background: #1a1e24; border-bottom: 0.5px solid #2c3038; }
        .hero .inner { padding: 64px 48px; display: grid; grid-template-columns: 1.2fr 1fr; gap: 64px; align-items: center; }
        .eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #904060; margin-bottom: 12px; }
        .hero h1 { font-size: 34px; font-weight: 700; color: #faf8f4; line-height: 1.25; margin-bottom: 16px; }
        .hero h1 em { color: #904060; font-style: normal; }
        .hero p { font-size: 14px; color: #808898; line-height: 1.85; margin-bottom: 28px; }
        .btn-primary { display: inline-block; background: #904060; color: #fff; font-size: 12px; font-weight: 700; padding: 11px 24px; border-radius: 3px; text-decoration: none; }
        .btn-primary:hover { background: #7a3452; }
        .sub { font-size: 11px; color: #505860; margin-top: 10px; }

        .card-mini { background: #2c3038; border-radius: 8px; border: 2px solid #904060; overflow: hidden; }
        .chdr { background: #2c3038; padding: 22px 22px; }
        .caccent { height: 2.5px; background: #904060; }
        .clogo { font-size: 9px; font-weight: 700; letter-spacing: .16em; color: #904060; margin-bottom: 8px; }
        .csummary { font-size: 11px; color: #909aa8; line-height: 1.6; }
        .cbody { padding: 18px 22px; background: #faf8f4; }
        .csec { font-size: 8px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #706050; border-bottom: 0.5px solid #d8d0c8; padding-bottom: 4px; margin-bottom: 8px; margin-top: 14px; }
        .csec:first-child { margin-top: 0; }
        .crow { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 0.5px solid #f0ece8; }
        .crow:last-of-type { border-bottom: none; }
        .cpill { display: inline-block; padding: 3px 10px; border-radius: 3px; font-size: 9px; font-weight: 700; }
        .pfn { background: #2c3038; color: #c87090; }
        .pka { background: #904060; color: #1a0810; }
        .pind { background: #edeae6; color: #403830; border: 0.5px solid #c8c0b8; }
        .cyrs { font-size: 9px; color: #a09080; }
        .cev { font-size: 8.5px; color: #904060; }
        .crow-meta { display: flex; gap: 12px; align-items: center; }
        .cfoot { padding: 10px 22px; border-top: 0.5px solid #d8d0c8; display: flex; justify-content: space-between; }
        .cfoot span { font-size: 8.5px; color: #b0a898; }
        .cfoot strong { font-size: 8.5px; font-weight: 700; color: #682848; letter-spacing: .08em; }

        .how { background: #f5f1eb; border-bottom: 0.5px solid #d8d0c4; }
        .how .inner { padding: 64px 48px; }
        .section-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #904060; margin-bottom: 8px; }
        .section-title { font-size: 26px; font-weight: 700; color: #1a1410; margin-bottom: 40px; }
        .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 28px; }
        .step-num { font-size: 32px; font-weight: 700; color: #e8d8cc; margin-bottom: 10px; line-height: 1; }
        .step-divider { width: 24px; height: 2px; background: #904060; margin-bottom: 12px; }
        .step-title { font-size: 15px; font-weight: 700; color: #1a1410; margin-bottom: 8px; text-transform: uppercase; }
        .step-body { font-size: 13px; color: #706050; line-height: 1.75; }

        .taxonomy { background: #1a1e24; border-bottom: 0.5px solid #2c3038; }
        .taxonomy .inner { padding: 64px 48px; }
        .taxonomy .section-eyebrow { color: #904060; }
        .taxonomy .section-title { color: #faf8f4; margin-bottom: 12px; }
        .taxonomy .section-intro { font-size: 14px; color: #808898; line-height: 1.85; margin-bottom: 40px; max-width: 600px; }
        .dims { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .dim { background: #242830; border-radius: 6px; padding: 20px 22px; border: 0.5px solid #2c3038; }
        .dim-label { font-size: 8px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #904060; margin-bottom: 6px; }
        .dim-title { font-size: 15px; font-weight: 700; color: #faf8f4; margin-bottom: 8px; }
        .dim-body { font-size: 13px; color: #606878; line-height: 1.7; }

        .candidates { background: #f5f1eb; border-bottom: 0.5px solid #d8d0c4; }
        .candidates .inner { padding: 64px 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
        .candidates .section-eyebrow { color: #904060; }
        .candidates h2 { font-size: 26px; font-weight: 700; color: #1a1410; margin-bottom: 14px; line-height: 1.3; }
        .candidates p { font-size: 14px; color: #706050; line-height: 1.8; margin-bottom: 24px; }
        .candidate-features { display: flex; flex-direction: column; gap: 16px; }
        .cf { display: flex; align-items: flex-start; gap: 12px; }
        .cf-dot { width: 6px; height: 6px; border-radius: 50%; background: #904060; margin-top: 5px; flex-shrink: 0; }
        .cf-title { font-size: 13px; font-weight: 700; color: #1a1410; margin-bottom: 3px; }
        .cf-body { font-size: 12px; color: #706050; line-height: 1.6; }

        .data { background: #1a1e24; border-bottom: 0.5px solid #2c3038; text-align: center; }
        .data .inner { padding: 64px 48px; }
        .data-title { font-size: 22px; font-weight: 700; color: #faf8f4; margin-bottom: 6px; }
        .data-sub { font-size: 14px; color: #808898; margin-bottom: 40px; }
        .data-points { display: flex; justify-content: center; gap: 48px; flex-wrap: wrap; }
        .dp { text-align: left; max-width: 180px; }
        .dp-accent { width: 16px; height: 2px; background: #904060; margin-bottom: 8px; }
        .dp-title { font-size: 13px; font-weight: 700; color: #faf8f4; margin-bottom: 5px; }
        .dp-body { font-size: 12px; color: #606878; line-height: 1.65; }

        .footer { background: #1a1e24; }
        .footer .inner { padding: 24px 48px; display: flex; align-items: center; justify-content: space-between; }
        .footer-logo { font-size: 12px; font-weight: 700; letter-spacing: .12em; color: #904060; }
        .footer-copy { font-size: 10px; color: #404850; }

        @media (max-width: 700px) {
          .nav .inner { padding: 12px 20px; }
          .hero .inner { padding: 40px 20px; grid-template-columns: 1fr; gap: 40px; }
          .how .inner { padding: 40px 20px; }
          .steps { grid-template-columns: 1fr; gap: 28px; }
          .taxonomy .inner { padding: 40px 20px; }
          .dims { grid-template-columns: 1fr; }
          .candidates .inner { padding: 40px 20px; grid-template-columns: 1fr; }
          .data .inner { padding: 40px 20px; }
          .footer .inner { padding: 20px; }
        }
      `}</style>

      {/* Nav */}
      <div className="nav">
        <div className="inner">
          <span className="logo">RENSUME</span>
          <a href="https://rensume.com/generate" className="cta">Generate a card</a>
        </div>
      </div>

      {/* Hero */}
      <div className="hero">
        <div className="inner">
          <div>
            <div className="eyebrow">For recruiters</div>
            <h1>Candidate profiles that speak <em>your</em> language.</h1>
            <p>Rensume translates experience into a shared taxonomy that surfaces demonstrated capability, not how well someone tailored their resume. Every classification comes with evidence citations so you can verify fit before you reach out.</p>
            <a href="https://rensume.com/generate" className="btn-primary">Generate a card</a>
            <p className="sub">Free to try · no account required</p>
          </div>
          <div className="card-mini">
            <div className="chdr">
              <div className="clogo">RENSUME · TAXONOMY PROFILE</div>
              <div className="csummary">Customer operations specialist with 8 years building operational infrastructure and analyzing customer pain points in emerging tech.</div>
            </div>
            <div className="caccent"></div>
            <div className="cbody">
              <div className="csec">Function</div>
              <div className="crow"><span className="cpill pfn">Experienced Process Manager</span><div className="crow-meta"><span className="cyrs">4y</span><span className="cev">Evidence →</span></div></div>
              <div className="crow"><span className="cpill pfn">Experienced Process Specialist</span><div className="crow-meta"><span className="cyrs">3y</span><span className="cev">Evidence →</span></div></div>
              <div className="csec">Knowledge area</div>
              <div className="crow"><span className="cpill pka">Business Operations Specialists</span><div className="crow-meta"><span className="cyrs">4y</span><span className="cev">Evidence →</span></div></div>
              <div className="crow"><span className="cpill pka">Financial Specialists</span><div className="crow-meta"><span className="cyrs">2y</span><span className="cev">Evidence →</span></div></div>
              <div className="csec">Industry</div>
              <div className="crow"><span className="cpill pind">Information</span><div className="crow-meta"><span className="cyrs">6y</span><span className="cev">Evidence →</span></div></div>
              <div className="crow"><span className="cpill pind">Finance &amp; Insurance</span><div className="crow-meta"><span className="cyrs">2y</span><span className="cev">Evidence →</span></div></div>
            </div>
            <div className="cfoot"><span>Recruiter-owned</span><strong>RENSUME</strong></div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="how">
        <div className="inner">
          <div className="section-eyebrow">How it works</div>
          <div className="section-title">From upload to match in four steps.</div>
          <div className="steps">
            <div>
              <div className="step-num">01</div>
              <div className="step-divider"></div>
              <div className="step-title">Bring your candidate pool</div>
              <div className="step-body">Upload your candidates' resumes as PDFs. Rensume parses and classifies each one automatically.</div>
            </div>
            <div>
              <div className="step-num">02</div>
              <div className="step-divider"></div>
              <div className="step-title">Define your requirements</div>
              <div className="step-body">Paste your job description. We'll classify it against the same taxonomy your candidates are measured on.</div>
            </div>
            <div>
              <div className="step-num">03</div>
              <div className="step-divider"></div>
              <div className="step-title">Classify Your Candidates</div>
              <div className="step-body">Rensume maps your candidates and your JD across function level, knowledge area, and industry. Same framework. Both sides.</div>
            </div>
            <div>
              <div className="step-num">04</div>
              <div className="step-divider"></div>
              <div className="step-title">See who fits and why</div>
              <div className="step-body">Because both sides are measured on the same scale, the comparison speaks for itself. See which candidates align with your requirements and verify the evidence behind every result.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Taxonomy */}
      <div className="taxonomy">
        <div className="inner">
          <div className="section-eyebrow">The taxonomy</div>
          <div className="section-title">Three dimensions. One clear picture.</div>
          <div className="section-intro">Traditional resumes describe where a candidate worked. Rensume describes what they actually did there, across three structured dimensions that give you a consistent, comparable view of every candidate.</div>
          <div className="dims">
            <div className="dim">
              <div className="dim-label">Dimension 01</div>
              <div className="dim-title">Function level</div>
              <div className="dim-body">How they operated: whether they executed processes, designed them, led people, or set direction. Independent of title or industry.</div>
            </div>
            <div className="dim">
              <div className="dim-label">Dimension 02</div>
              <div className="dim-title">Knowledge area</div>
              <div className="dim-body">What domains of knowledge their work drew on. The fields they operated in, regardless of what their employer called the role.</div>
            </div>
            <div className="dim">
              <div className="dim-label">Dimension 03</div>
              <div className="dim-title">Industry</div>
              <div className="dim-body">The sectors they've worked in, classified by a standard industry framework so every candidate's background is described in consistent, comparable terms.</div>
            </div>
          </div>
        </div>
      </div>

      {/* For candidates */}
      <div className="candidates">
        <div className="inner">
          <div>
            <div className="section-eyebrow">For candidates</div>
            <h2>What you've done, not where you've been.</h2>
            <p>Rensume builds a structured profile that translates a candidate's experience into a language you already use.</p>
          </div>
          <div className="candidate-features">
            <div className="cf"><div className="cf-dot"></div><div><div className="cf-title">Free to generate</div><div className="cf-body">Candidates create their profile at no cost. No account required to get started.</div></div></div>
            <div className="cf"><div className="cf-dot"></div><div><div className="cf-title">Evidence-backed classifications</div><div className="cf-body">Every tag is supported by a resume citation. You can see exactly what the classification is based on.</div></div></div>
            <div className="cf"><div className="cf-dot"></div><div><div className="cf-title">Their card, their call</div><div className="cf-body">Candidates who generate their own card own it. They can download, share, and attach it to applications on their own terms.</div></div></div>
          </div>
        </div>
      </div>

      {/* Built on trust */}
      <div className="data">
        <div className="inner">
          <div className="data-title">Built On Trust.</div>
          <div className="data-sub">Transparent by design. Accurate by intent.</div>
          <div className="data-points">
            <div className="dp"><div className="dp-accent"></div><div className="dp-title">Bias mitigation</div><div className="dp-body">The model evaluates experience without seeing job titles or personal information. Classifications are based on what someone did, not who they appear to be.</div></div>
            <div className="dp"><div className="dp-accent"></div><div className="dp-title">No black boxes</div><div className="dp-body">Every classification links back to the specific resume text it came from. You can see exactly what the model used to make each decision.</div></div>
            <div className="dp"><div className="dp-accent"></div><div className="dp-title">No data harvesting</div><div className="dp-body">Rensume processes your data to generate classifications, but what you upload belongs to you. We don't train on it, sell it, or retain it beyond what you ask us to.</div></div>
            <div className="dp"><div className="dp-accent"></div><div className="dp-title">Optimized for accuracy</div><div className="dp-body">The taxonomy is applied consistently across every resume and job description, no matter how it was written. That's what makes the comparison meaningful.</div></div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <div className="inner">
          <span className="footer-logo">RENSUME</span>
          <span className="footer-copy">© 2025 Rensume</span>
        </div>
      </div>
    </>
  )
}

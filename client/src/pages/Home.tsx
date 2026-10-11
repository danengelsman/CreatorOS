import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleCheck,
  DollarSign,
  Flame,
  Layers3,
  Lightbulb,
  Menu,
  Palette,
  PenLine,
  Play,
  Repeat2,
  Route,
  Sparkles,
  Target,
  Users,
  Video,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { getHeadlineExperiment, trackEvent, trackExperimentExposure, trackPageView, type ExperimentAssignment } from "@/lib/analytics";

const navItems = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "For creators", href: "#audience" },
  { label: "Pricing", href: "#pricing" },
];

const featureCards = [
  {
    eyebrow: "01 / FIND YOUR SIGNAL",
    title: "Stop guessing what to make next.",
    body: "Turn your niche, audience, and goals into a steady stream of ideas with enough context to actually act on them.",
    icon: Lightbulb,
    accent: "amber",
    visual: "ideas",
  },
  {
    eyebrow: "02 / MAKE IT MEMORABLE",
    title: "Create with a point of view.",
    body: "Build a recognizable brand system, then use it everywhere—from your opening hook to your final frame.",
    icon: Palette,
    accent: "violet",
    visual: "brand",
  },
  {
    eyebrow: "03 / EARN ATTENTION",
    title: "Keep people watching.",
    body: "Pressure-test the first five seconds, plan every beat, and give your audience a reason to stay for the payoff.",
    icon: Flame,
    accent: "coral",
    visual: "retention",
  },
];

const workflow = [
  { number: "01", title: "Shape your signal", body: "Define the niche, audience, and brand voice that make your work unmistakably yours.", icon: Target },
  { number: "02", title: "Build the next thing", body: "Move from a blank page to a sharp hook, structured script, and visual plan in one focused flow.", icon: PenLine },
  { number: "03", title: "Ship, learn, repeat", body: "Repurpose what works, watch the patterns, and compound every publish into a smarter next move.", icon: Repeat2 },
];

const faqs = [
  {
    q: "Is CreatorOS for beginners or established creators?",
    a: "Both. CreatorOS is designed to give new creators a clear path from idea to first dollar, while giving experienced creators a faster, more consistent operating system for the work they already do.",
  },
  {
    q: "Do I need to be on YouTube?",
    a: "No. The workflow is built for modern cross-platform creators. Plan once, then adapt your work for YouTube, TikTok, Instagram, LinkedIn, X, and the formats your audience already uses.",
  },
  {
    q: "What does the free plan include?",
    a: "You can explore the core workflow, shape your brand, generate ideas, and build your first content projects at no cost. Upgrade when you want more creative volume and deeper growth tools.",
  },
  {
    q: "Can I cancel whenever I want?",
    a: "Yes. There are no contracts or hidden fees. Upgrade, downgrade, or cancel directly from your profile settings.",
  },
];

const headlineCopy: Record<ExperimentAssignment["variant"], { heading: string; lede: string }> = {
  control: {
    heading: "Make your next right thing.",
    lede: "CreatorOS turns scattered ideas into a recognizable brand, a repeatable content engine, and a clear path to your first dollar.",
  },
  momentum: {
    heading: "Turn your next idea into momentum.",
    lede: "CreatorOS gives modern creators a calmer way to shape their signal, ship their work, and grow toward their first dollar.",
  },
};

function LogoMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`logo-mark ${small ? "logo-mark-small" : ""}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <div className="section-label"><span className="section-label-line" />{children}</div>;
}

function HeroProductPreview() {
  return (
    <div className="hero-preview-shell" aria-label="CreatorOS product preview">
      <div className="hero-preview-glow" />
      <div className="preview-window">
        <div className="preview-window-top">
          <div className="window-controls"><i /><i /><i /></div>
          <span className="preview-url">creatoros / workspace</span>
          <span className="preview-live"><span /> LIVE</span>
        </div>
        <div className="preview-layout">
          <aside className="preview-sidebar">
            <div className="preview-brand"><LogoMark small /><span>CreatorOS</span></div>
            <div className="preview-nav-label">WORKSPACE</div>
            {[{ icon: BarChart3, label: "Overview", active: false }, { icon: PenLine, label: "Create", active: true }, { icon: Flame, label: "Retention Lab", active: false }, { icon: Palette, label: "Brand", active: false }].map(({ icon: Icon, label, active }) => (
              <div className={`preview-nav-item ${active ? "active" : ""}`} key={label}><Icon size={13} /><span>{label}</span></div>
            ))}
            <div className="preview-sidebar-spacer" />
            <div className="preview-user"><span className="avatar">JM</span><span>Jordan Miller</span><span className="dot-menu">•••</span></div>
          </aside>
          <div className="preview-main">
            <div className="preview-heading-row"><div><span className="mini-overline">TUESDAY / CONTENT STUDIO</span><h3>The 5 minute idea sprint</h3></div><button className="preview-create-btn"><Sparkles size={12} /> New project</button></div>
            <div className="preview-stats">
              <div className="preview-stat"><span>RETENTION SCORE</span><strong>86<span>/100</span></strong><em className="positive">+12.4%</em></div>
              <div className="preview-stat"><span>IDEAS IN PIPELINE</span><strong>24</strong><em>8 ready to ship</em></div>
              <div className="preview-stat"><span>BRAND CONSISTENCY</span><strong>92<span>%</span></strong><em className="positive">On track</em></div>
            </div>
            <div className="preview-grid">
              <div className="preview-panel hook-panel"><div className="panel-heading"><span>HOOK ANALYSIS</span><span className="panel-tag">HIGH POTENTIAL</span></div><div className="hook-score"><div className="score-ring"><strong>86</strong><span>/100</span></div><div><strong>Your first line earns the next second.</strong><p>Clear tension + specific payoff</p></div></div><div className="waveform"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div><div className="wave-labels"><span>0:00</span><span>0:05</span><span>0:10</span><span>0:15</span></div></div>
              <div className="preview-panel idea-panel"><div className="panel-heading"><span>NEXT UP</span><span className="panel-arrow"><ArrowRight size={12} /></span></div><div className="idea-title">3 small habits quietly changing my creative output</div><div className="idea-meta"><span className="idea-chip">TikTok</span><span>7 min ago</span></div><div className="idea-cta">Open idea <ArrowRight size={12} /></div></div>
            </div>
            <div className="preview-bottom-row"><div className="preview-progress"><div className="panel-heading"><span>YOUR GROWTH PATH</span><span>STEP 03 / 05</span></div><div className="path-bar"><span /></div><div className="path-labels"><span>Start with a signal</span><span>Earn your first dollar</span></div></div><div className="preview-quote"><span className="quote-mark">“</span><span>Make the next right thing.<br /><em>Then do it again.</em></span></div></div>
          </div>
        </div>
      </div>
      <div className="preview-float-card float-card-one"><span className="float-icon amber-bg"><Zap size={14} /></span><div><strong>Hook improved</strong><span>+24% predicted retention</span></div><CircleCheck size={15} className="float-check" /></div>
      <div className="preview-float-card float-card-two"><span className="float-icon violet-bg"><WandSparkles size={14} /></span><div><strong>Brand kit ready</strong><span>3 assets generated</span></div></div>
    </div>
  );
}

function FeatureVisual({ type }: { type: string }) {
  if (type === "ideas") {
    return <div className="feature-visual ideas-visual"><div className="ideas-orbit orbit-one" /><div className="ideas-orbit orbit-two" /><div className="ideas-center"><Lightbulb size={22} /><span>one signal</span></div><div className="orbit-pill pill-one"><span className="pill-dot" />"quiet luxury"</div><div className="orbit-pill pill-two"><span className="pill-dot" />creator economy</div><div className="orbit-pill pill-three"><span className="pill-dot" />weekly ritual</div></div>;
  }
  if (type === "brand") {
    return <div className="feature-visual brand-visual"><div className="brand-visual-top"><span className="brand-swatch swatch-dark" /><span className="brand-swatch swatch-amber" /><span className="brand-swatch swatch-lilac" /><span className="brand-swatch swatch-cream" /></div><div className="brand-type">make<br /><i>your mark.</i></div><div className="brand-footer"><span className="brand-mini-mark"><LogoMark small /></span><span>voice / visual / point of view</span></div></div>;
  }
  return <div className="feature-visual retention-visual"><div className="retention-title"><span>FIRST 5 SECONDS</span><strong>Does your hook<br />earn the next beat?</strong></div><div className="retention-bars"><span style={{ height: "54%" }} /><span style={{ height: "72%" }} /><span style={{ height: "96%" }} /><span style={{ height: "82%" }} /><span style={{ height: "68%" }} /><span style={{ height: "42%" }} /><span style={{ height: "32%" }} /></div><div className="retention-axis"><span>0:00</span><span>0:03</span><span>0:05</span></div></div>;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [showDemo, setShowDemo] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [experiment] = useState<ExperimentAssignment>(() => getHeadlineExperiment());

  useEffect(() => {
    document.title = "CreatorOS — Make your next right thing";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowDemo(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    trackPageView(experiment);
    trackExperimentExposure(experiment);
  }, [experiment]);

  const price = useMemo(() => billing === "yearly" ? "24" : "29", [billing]);
  const activeHeadline = headlineCopy[experiment.variant];

  const handleBillingChange = (nextBilling: "monthly" | "yearly") => {
    if (nextBilling === billing) return;
    setBilling(nextBilling);
    trackEvent("pricing_billing_changed", { billing_cycle: nextBilling, experiment_variant: experiment.variant });
  };

  const handleEmailSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;
    trackEvent("email_signup_submitted", { placement: "final_cta", experiment_variant: experiment.variant });
    setSubmitted(true);
  };

  return (
    <div className="site-shell">
      <div className="grain" />
      <header className="site-header">
        <a href="#top" className="brand-lockup" aria-label="CreatorOS home"><LogoMark /><span>Creator<span className="brand-os">OS</span></span></a>
        <nav className={`desktop-nav ${menuOpen ? "mobile-nav-open" : ""}`} aria-label="Primary navigation">
          {navItems.map((item) => <a href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>)}
        </nav>
        <div className="header-actions"><a className="sign-in" href="#pricing" onClick={() => trackEvent("cta_clicked", { cta: "sign_in", placement: "header", experiment_variant: experiment.variant })}>Sign in</a><a className="button button-small button-amber" href="#pricing" onClick={() => trackEvent("cta_clicked", { cta: "start_free", placement: "header", experiment_variant: experiment.variant })}>Start for free <ArrowRight size={14} /></a></div>
        <button className="mobile-menu-button" onClick={() => { setMenuOpen((open) => !open); trackEvent("mobile_menu_toggled", { state: !menuOpen }); }} aria-label="Toggle navigation" aria-expanded={menuOpen}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
      </header>

      <main id="top">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <div className="eyebrow-pill"><span className="eyebrow-dot" />The operating system for modern creators</div>
            <h1>{activeHeadline.heading}</h1>
            <p className="hero-lede">{activeHeadline.lede}</p>
            <div className="hero-ctas"><a className="button button-amber button-large" href="#pricing" onClick={() => trackEvent("cta_clicked", { cta: "build_creator_system", placement: "hero", experiment_variant: experiment.variant })}>Build your creator system <ArrowRight size={16} /></a><button className="text-button" onClick={() => { setShowDemo(true); trackEvent("demo_opened", { placement: "hero", experiment_variant: experiment.variant }); }}><span className="play-icon"><Play size={12} fill="currentColor" /></span> See how it works</button></div>
            <div className="hero-reassurance"><div className="avatar-stack"><span>AK</span><span>JM</span><span>NS</span><span>+2k</span></div><span>Join creators building with intention.</span></div>
          </div>
          <HeroProductPreview />
          <div className="hero-scroll"><span>Scroll to explore</span><span className="scroll-line" /></div>
        </section>

        <section className="trust-strip"><div className="section-wrap trust-inner"><span className="trust-lead">Less noise.<br /><em>More momentum.</em></span><div className="trust-stat"><strong>01</strong><span>clearer<br />creative direction</span></div><div className="trust-stat"><strong>02</strong><span>stronger<br />audience signal</span></div><div className="trust-stat"><strong>03</strong><span>closer to<br />your first dollar</span></div></div></section>

        <section className="section-wrap product-section" id="product">
          <div className="section-intro"><SectionLabel>The creator advantage</SectionLabel><h2>Creativity is a practice.<br /><span>Your system protects it.</span></h2><p>Great creators don’t wait for inspiration. They build the conditions for it to show up, do its best work, and reach the people who need it.</p></div>
          <div className="feature-grid">{featureCards.map((feature) => { const Icon = feature.icon; return <article className={`feature-card accent-${feature.accent}`} key={feature.title}><div className="feature-card-top"><span className="feature-eyebrow">{feature.eyebrow}</span><span className="feature-icon"><Icon size={17} /></span></div><h3>{feature.title}</h3><p>{feature.body}</p><FeatureVisual type={feature.visual} /></article>; })}</div>
        </section>

        <section className="workflow-section" id="how-it-works"><div className="section-wrap workflow-grid"><div className="workflow-copy"><SectionLabel>A calmer way to grow</SectionLabel><h2>From blank page<br />to <span>body of work.</span></h2><p>The hard part is not having ideas. It’s knowing which one to trust, how to shape it, and what to do after you hit publish. CreatorOS keeps the whole loop in view.</p><a className="inline-link" href="#pricing" onClick={() => trackEvent("cta_clicked", { cta: "full_workflow", placement: "workflow", experiment_variant: experiment.variant })}>See the full workflow <ArrowRight size={14} /></a></div><div className="workflow-steps">{workflow.map((step, index) => { const Icon = step.icon; return <div className="workflow-step" key={step.number}><div className={`workflow-number ${index === 1 ? "is-active" : ""}`}>{step.number}</div><div className="workflow-step-content"><div className="workflow-step-title"><Icon size={16} /><h3>{step.title}</h3></div><p>{step.body}</p></div></div>; })}<div className="workflow-progress"><span /><span /><span /><span /><span /></div></div></div></section>

        <section className="audience-section section-wrap" id="audience"><div className="audience-panel"><div className="audience-copy"><SectionLabel>Built for your next chapter</SectionLabel><h2>Whether you’re starting<br />from zero or <span>scaling signal.</span></h2><p>CreatorOS meets you at the stage you’re in—and keeps the system useful as your ambitions get bigger.</p><div className="audience-list"><div><CircleCheck size={16} /><span><strong>The first-dollar creator</strong> needs a path that turns energy into progress.</span></div><div><CircleCheck size={16} /><span><strong>The consistent creator</strong> needs a system that turns output into recognition.</span></div><div><CircleCheck size={16} /><span><strong>The growing creator</strong> needs leverage without losing their point of view.</span></div></div></div><div className="audience-art"><div className="art-orbit orbit-large" /><div className="art-orbit orbit-small" /><div className="art-core"><LogoMark /><span>YOUR<br /><em>signal</em></span></div><div className="art-label art-label-one"><span>voice</span><i /></div><div className="art-label art-label-two"><span>craft</span><i /></div><div className="art-label art-label-three"><span>growth</span><i /></div><div className="art-caption">The work compounds<br /><em>when the system does.</em></div></div></div></section>

        <section className="pricing-section section-wrap" id="pricing"><div className="pricing-header"><div><SectionLabel>Start with the next step</SectionLabel><h2>More clarity.<br /><span>Less creative drift.</span></h2></div><div className="billing-switch" role="group" aria-label="Billing interval"><button className={billing === "monthly" ? "selected" : ""} onClick={() => handleBillingChange("monthly")}>Monthly</button><button className={billing === "yearly" ? "selected" : ""} onClick={() => handleBillingChange("yearly")}>Yearly <span>save 17%</span></button></div></div><div className="pricing-grid"><article className="price-card price-free"><div className="price-card-heading"><span className="price-kicker">START HERE</span><h3>Free</h3><p>The first signal is on us.</p></div><div className="price"><strong>$0</strong><span>/ forever</span></div><ul><li><Check size={15} />Core creator workspace</li><li><Check size={15} />Brand starter tools</li><li><Check size={15} />Idea pipeline</li></ul><a className="button button-dark-outline" href="#top" onClick={() => trackEvent("cta_clicked", { cta: "free_plan", placement: "pricing", experiment_variant: experiment.variant })}>Start building <ArrowRight size={14} /></a></article><article className="price-card price-pro"><div className="price-popular">MOST CREATORS START HERE</div><div className="price-card-heading"><span className="price-kicker">FIND YOUR FLOW</span><h3>Creator Pro</h3><p>Everything you need to turn output into momentum.</p></div><div className="price"><strong>${price}</strong><span>/ month{billing === "yearly" ? ", billed yearly" : ""}</span></div><ul><li><Check size={15} />Unlimited projects & ideas</li><li><Check size={15} />Retention Lab + hook rewrites</li><li><Check size={15} />AI-powered content studio</li><li><Check size={15} />Growth roadmap & reports</li></ul><a className="button button-amber" href="#top" onClick={() => trackEvent("cta_clicked", { cta: "creator_pro", placement: "pricing", billing_cycle: billing, experiment_variant: experiment.variant })}>Try Creator Pro <ArrowRight size={14} /></a><small>7-day free trial · Cancel anytime</small></article></div></section>

        <section className="faq-section section-wrap"><div className="faq-intro"><SectionLabel>Questions, answered</SectionLabel><h2>Good systems<br />feel <span>obvious.</span></h2><p>Still curious? We kept the important details close by.</p></div><div className="faq-list">{faqs.map((faq, index) => <div className={`faq-item ${activeFaq === index ? "open" : ""}`} key={faq.q}><button onClick={() => { const opening = activeFaq !== index; setActiveFaq(opening ? index : -1); if (opening) trackEvent("faq_opened", { faq_index: index + 1, question: faq.q }); }}><span>{faq.q}</span><ChevronDown size={17} /></button><div className="faq-answer"><p>{faq.a}</p></div></div>)}</div></section>

        <section className="final-cta section-wrap"><div className="final-cta-inner"><div className="final-cta-glow" /><SectionLabel>Make the work count</SectionLabel><h2>You already have<br /><span>the next idea.</span></h2><p>Now give it a system that can carry it further.</p><form className="email-form" onSubmit={handleEmailSubmit}>{submitted ? <div className="submitted-message"><CircleCheck size={17} /> You’re on the list. We’ll be in touch.</div> : <><input type="email" placeholder="Your email address" value={email} onChange={(event) => setEmail(event.target.value)} aria-label="Email address" required /><button className="button button-amber" type="submit">Start for free <ArrowRight size={14} /></button></>}</form><span className="form-note">No credit card required · Cancel anytime</span></div></section>
      </main>

      <footer className="site-footer"><div className="section-wrap footer-top"><a href="#top" className="brand-lockup footer-brand"><LogoMark /><span>Creator<span className="brand-os">OS</span></span></a><div className="footer-note">A calmer operating system<br />for making your mark.</div><div className="footer-links"><div><span>Explore</span><a href="#product">Product</a><a href="#how-it-works">How it works</a><a href="#pricing">Pricing</a></div><div><span>Connect</span><a href="mailto:hello@creatoros.app">Contact</a><a href="#top">Instagram</a><a href="#top">YouTube</a></div></div></div><div className="section-wrap footer-bottom"><span>© 2026 CreatorOS. All rights reserved.</span><span>Built for the long game.</span><div><a href="#top">Privacy</a><a href="#top">Terms</a></div></div></footer>

      {showDemo && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="CreatorOS demo" onClick={() => { setShowDemo(false); trackEvent("demo_closed", { method: "backdrop" }); }}><div className="demo-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => { setShowDemo(false); trackEvent("demo_closed", { method: "close_button" }); }} aria-label="Close demo"><X size={18} /></button><div className="demo-video"><div className="demo-play"><Play size={22} fill="currentColor" /></div><span>CreatorOS in 60 seconds</span></div><div className="demo-modal-copy"><span className="section-label">A quick look inside</span><h3>Make space for better work.</h3><p>Shape your signal, build your next idea, and keep the whole growth loop in one place.</p><a className="button button-amber" href="#pricing" onClick={() => { setShowDemo(false); trackEvent("cta_clicked", { cta: "demo_get_started", placement: "demo_modal", experiment_variant: experiment.variant }); }}>Get started <ArrowRight size={14} /></a></div></div></div>}
      <div className="analytics-status" aria-label="Anonymous analytics enabled"><span /> Anonymous analytics</div>
    </div>
  );
}

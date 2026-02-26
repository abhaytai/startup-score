import { useState, useEffect, useRef } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

const STEPS = [
  { id: "idea", label: "The Idea", icon: "💡" },
  { id: "competitors", label: "Competition", icon: "⚔️" },
  { id: "revenue", label: "Revenue Model", icon: "💰" },
  { id: "team", label: "Your Team", icon: "👥" },
  { id: "roadmap", label: "Roadmap", icon: "🗺️" },
];

const SCORE_TIERS = [
  { min: 0, max: 299, label: "ABORT MISSION", color: "#ff1744", emoji: "🚫", verdict: "Stop. This idea needs a complete rethink.", bg: "rgba(255,23,68,0.08)" },
  { min: 300, max: 499, label: "HIGH RISK", color: "#ff6d00", emoji: "⚠️", verdict: "Pause and reconsider. Major gaps exist.", bg: "rgba(255,109,0,0.08)" },
  { min: 500, max: 699, label: "PROCEED WITH CAUTION", color: "#ffd600", emoji: "🔶", verdict: "Potential exists but needs significant refinement.", bg: "rgba(255,214,0,0.08)" },
  { min: 700, max: 849, label: "GREEN LIGHT", color: "#00e676", emoji: "✅", verdict: "Strong foundation. Address the gaps and go build.", bg: "rgba(0,230,118,0.08)" },
  { min: 850, max: 1000, label: "UNICORN POTENTIAL", color: "#00e5ff", emoji: "🦄", verdict: "Exceptional. Execute fast before someone else does.", bg: "rgba(0,229,255,0.08)" },
];

function getTier(score) {
  return SCORE_TIERS.find(t => score >= t.min && score <= t.max) || SCORE_TIERS[0];
}

// Animated counter
function AnimatedScore({ target, tier }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    let start = 0;
    const duration = 2200;
    const startTime = performance.now();
    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCurrent(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    }
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [target]);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <svg width="220" height="220" viewBox="0 0 220 220">
        <circle cx="110" cy="110" r="100" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="110" cy="110" r="100"
          fill="none"
          stroke={tier.color}
          strokeWidth="8"
          strokeDasharray={`${(current / 1000) * 628} 628`}
          strokeLinecap="round"
          transform="rotate(-90 110 110)"
          style={{ transition: "stroke-dasharray 0.1s", filter: `drop-shadow(0 0 12px ${tier.color}60)` }}
        />
      </svg>
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        textAlign: "center"
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: "52px", fontWeight: 800, color: tier.color,
          letterSpacing: "-2px", lineHeight: 1
        }}>{current}</div>
        <div style={{
          fontSize: "11px", color: "rgba(255,255,255,0.4)",
          fontFamily: "'JetBrains Mono', monospace", marginTop: "4px", letterSpacing: "2px"
        }}>/ 1000</div>
      </div>
    </div>
  );
}

// Auth error overlay (shown when sign-in fails)
function AuthErrorOverlay({ message, onClose }) {
  if (!message) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
      animation: "fadeIn 0.2s ease"
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "min(420px, 90vw)", borderRadius: "16px",
        background: "#202124", border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        padding: "32px", textAlign: "center", animation: "slideUp 0.3s ease"
      }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "50%",
          background: "rgba(255,23,68,0.15)", margin: "0 auto 16px",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#ff1744" strokeWidth="2"/>
            <line x1="12" y1="8" x2="12" y2="13" stroke="#ff1744" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="16.5" r="1" fill="#ff1744"/>
          </svg>
        </div>
        <p style={{ fontSize: "15px", color: "#e8eaed", margin: "0 0 8px" }}>Sign-in failed</p>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: "0 0 24px" }}>{message}</p>
        <button onClick={onClose} style={{
          padding: "10px 28px", borderRadius: "8px",
          border: "none", background: "#8ab4f8",
          color: "#202124", fontSize: "14px", fontWeight: 600,
          cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
        }}>Try Again</button>
      </div>
    </div>
  );
}

// Google Sign-In Button
function GoogleButton({ onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: "14px",
        padding: "16px 36px", borderRadius: "60px",
        border: "1px solid rgba(255,255,255,0.12)",
        background: hover ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
        color: "#fff", fontSize: "16px", fontFamily: "'DM Sans', sans-serif",
        cursor: "pointer", transition: "all 0.3s",
        fontWeight: 500, letterSpacing: "0.3px",
        transform: hover ? "translateY(-2px)" : "none",
        boxShadow: hover ? "0 8px 32px rgba(0,0,0,0.3)" : "none"
      }}
    >
      <svg width="22" height="22" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      Continue with Google
    </button>
  );
}

function TextArea({ label, placeholder, value, onChange, rows = 4 }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: "20px" }}>
      <label style={{
        display: "block", marginBottom: "8px", fontSize: "13px",
        color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "1.5px", textTransform: "uppercase"
      }}>{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: "100%", padding: "16px", borderRadius: "12px",
          border: `1px solid ${focused ? "rgba(0,229,255,0.4)" : "rgba(255,255,255,0.08)"}`,
          background: "rgba(255,255,255,0.03)", color: "#fff",
          fontSize: "15px", fontFamily: "'DM Sans', sans-serif",
          resize: "vertical", outline: "none",
          transition: "border-color 0.3s",
          boxSizing: "border-box",
          lineHeight: 1.6
        }}
      />
    </div>
  );
}

function Input({ label, placeholder, value, onChange, type = "text" }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: "20px" }}>
      <label style={{
        display: "block", marginBottom: "8px", fontSize: "13px",
        color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "1.5px", textTransform: "uppercase"
      }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "16px", borderRadius: "12px",
          border: `1px solid ${focused ? "rgba(0,229,255,0.4)" : "rgba(255,255,255,0.08)"}`,
          background: "rgba(255,255,255,0.03)", color: "#fff",
          fontSize: "15px", fontFamily: "'DM Sans', sans-serif",
          outline: "none", transition: "border-color 0.3s",
          boxSizing: "border-box"
        }}
      />
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("landing"); // landing | form | loading | results
  const [step, setStep] = useState(0);
  const [userName, setUserName] = useState("");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [formData, setFormData] = useState({
    ideaName: "", ideaDescription: "", problemSolving: "", targetAudience: "", uniqueValue: "",
    competitors: "", competitorWeakness: "", marketSize: "",
    revenueModel: "", pricing: "", customerAcquisition: "",
    teamSize: "", teamSkills: "", founderExperience: "",
    mvpTimeline: "", milestones: "", fundingNeeded: ""
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const update = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  // Listen for auth state changes (persistence across refreshes)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setUserName(firebaseUser.displayName || firebaseUser.email.split("@")[0]);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setAuthError("");
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      setUserName(firebaseUser.displayName || firebaseUser.email.split("@")[0]);
      setPage("form");
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setAuthError(err.message);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    setUserName("");
    setPage("landing");
  };

  const [analysisPhase, setAnalysisPhase] = useState(""); // tracks current phase for loading UI

  const callClaude = async (messages, tools) => {
    const body = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages,
    };
    if (tools) body.tools = tools;
    const response = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `API error ${response.status}`);
    }
    return response.json();
  };

  const startupDetails = () => `STARTUP DETAILS:
- Name: ${formData.ideaName}
- Description: ${formData.ideaDescription}
- Problem: ${formData.problemSolving}
- Target Audience: ${formData.targetAudience}
- Unique Value: ${formData.uniqueValue}
- Competitors: ${formData.competitors}
- Competitor Weaknesses: ${formData.competitorWeakness}
- Market Size: ${formData.marketSize}
- Revenue Model: ${formData.revenueModel}
- Pricing: ${formData.pricing}
- Customer Acquisition: ${formData.customerAcquisition}
- Team Size: ${formData.teamSize}
- Team Skills: ${formData.teamSkills}
- Founder Experience: ${formData.founderExperience}
- MVP Timeline: ${formData.mvpTimeline}
- Key Milestones: ${formData.milestones}
- Funding Needed: ${formData.fundingNeeded}`;

  // ---- ALGORITHMIC SCORING (deterministic, formula-based) ----
  const computeAlgorithmicScore = () => {
    let score = { market: 0, problemFit: 0, competitive: 0, revenue: 0, team: 0 };

    // Market (0-200): reward specificity, numbers, growth keywords
    const marketText = `${formData.marketSize} ${formData.targetAudience}`.toLowerCase();
    if (/\$[\d,]+[bmk]/i.test(marketText) || /billion|million/i.test(marketText)) score.market += 60;
    if (/grow|cagr|yoy|increasing|expanding/i.test(marketText)) score.market += 40;
    if (formData.targetAudience.length > 30) score.market += 30;
    if (formData.marketSize.length > 15) score.market += 30;
    if (/niche|specific|segment/i.test(marketText)) score.market += 20;
    score.market = Math.min(score.market, 200);

    // Problem-Solution Fit (0-200)
    const problemText = `${formData.problemSolving} ${formData.uniqueValue} ${formData.ideaDescription}`.toLowerCase();
    if (formData.problemSolving.length > 50) score.problemFit += 40;
    if (formData.uniqueValue.length > 40) score.problemFit += 40;
    if (formData.ideaDescription.length > 60) score.problemFit += 30;
    if (/pain|frustrat|expensive|slow|broken|inefficient|manual/i.test(problemText)) score.problemFit += 30;
    if (/unique|first|only|patent|proprietary|novel/i.test(problemText)) score.problemFit += 30;
    if (/data|ai|automat|platform/i.test(problemText)) score.problemFit += 15;
    score.problemFit = Math.min(score.problemFit, 200);

    // Competitive Advantage (0-200)
    const compText = `${formData.competitors} ${formData.competitorWeakness}`.toLowerCase();
    if (formData.competitors.length > 30) score.competitive += 40; // knows competitors = good
    if (formData.competitorWeakness.length > 40) score.competitive += 40;
    if (/moat|barrier|switching cost|network effect|patent|lock-in/i.test(compText)) score.competitive += 50;
    if (/slow|expensive|outdated|complex|poor ux/i.test(compText)) score.competitive += 30;
    if (/no competitor|no direct|blue ocean/i.test(compText)) score.competitive += 20;
    score.competitive = Math.min(score.competitive, 200);

    // Revenue (0-200)
    const revText = `${formData.revenueModel} ${formData.pricing} ${formData.customerAcquisition}`.toLowerCase();
    if (/saas|subscription|recurring|mrr|arr/i.test(revText)) score.revenue += 50;
    if (/\$\d+/i.test(revText) || /free tier|freemium|trial/i.test(revText)) score.revenue += 40;
    if (formData.customerAcquisition.length > 40) score.revenue += 35;
    if (/content|seo|referral|viral|partnership|outbound/i.test(revText)) score.revenue += 30;
    if (/enterprise|b2b/i.test(revText)) score.revenue += 20;
    if (/marketplace|transaction fee|commission/i.test(revText)) score.revenue += 25;
    score.revenue = Math.min(score.revenue, 200);

    // Team (0-200)
    const teamText = `${formData.teamSize} ${formData.teamSkills} ${formData.founderExperience}`.toLowerCase();
    if (/co-founder|cofounder|2\+|3\+|partner/i.test(teamText)) score.team += 40;
    if (/engineer|developer|technical|cto/i.test(teamText)) score.team += 35;
    if (/startup|founded|exit|yc|techstars|venture/i.test(teamText)) score.team += 45;
    if (/industry|domain|expert|years|experience/i.test(teamText)) score.team += 30;
    if (formData.founderExperience.length > 40) score.team += 25;
    if (/solo|alone|just me|1 person/i.test(teamText)) score.team = Math.max(score.team - 30, 0);
    score.team = Math.min(score.team, 200);

    return score;
  };

  const handleSubmit = async () => {
    setPage("loading");
    setError("");
    setAnalysisPhase("research");

    const details = startupDetails();

    try {
      // ===== PHASE 1: WEB SEARCH — Industry benchmarks & market reality =====
      setAnalysisPhase("research");
      let marketIntel = "No additional market data found.";
      try {
        const searchQuery = `${formData.ideaName} ${formData.targetAudience} market size competitors 2025`;
        const searchRes = await callClaude(
          [{ role: "user", content: `Search the web for real market data about this startup space and summarize key findings in 3-5 bullet points. Query context: "${searchQuery}". Startup: ${formData.ideaName} - ${formData.ideaDescription}. Respond with ONLY a plain text summary, no JSON.` }],
          [{ type: "web_search_20250305", name: "web_search" }]
        );
        marketIntel = searchRes.content?.map(i => i.text || "").filter(Boolean).join("\n") || marketIntel;
      } catch (e) {
        console.warn("Web search phase skipped:", e);
      }

      // ===== PHASE 2: ALGORITHMIC SCORE (deterministic) =====
      setAnalysisPhase("algorithm");
      await new Promise(r => setTimeout(r, 600)); // brief pause for UX
      const algoScores = computeAlgorithmicScore();
      const algoTotal = Object.values(algoScores).reduce((a, b) => a + b, 0);

      // ===== PHASE 3: DUAL AI EVALUATION (2 independent passes, averaged) =====
      setAnalysisPhase("ai_pass_1");

      const aiPrompt = (passNum) => `You are a ruthless but fair startup evaluator (Pass ${passNum}/2). Analyze this startup idea using BOTH the founder's input AND the real market research below. Respond ONLY with valid JSON (no markdown, no backticks).

${details}

REAL MARKET INTELLIGENCE (from web search):
${marketIntel}

ALGORITHMIC PRE-SCORE (formula-based, for reference):
Market: ${algoScores.market}/200 | Problem Fit: ${algoScores.problemFit}/200 | Competitive: ${algoScores.competitive}/200 | Revenue: ${algoScores.revenue}/200 | Team: ${algoScores.team}/200 | Total: ${algoTotal}/1000

Use the algorithmic score as a baseline but adjust based on your deeper qualitative analysis and the market research. Be brutally honest. Score each dimension 0-200.

Respond with this exact JSON structure:
{
  "score": <number 0-1000>,
  "breakdown": {
    "market": { "score": <0-200>, "comment": "<1 sentence>" },
    "problemFit": { "score": <0-200>, "comment": "<1 sentence>" },
    "competitive": { "score": <0-200>, "comment": "<1 sentence>" },
    "revenue": { "score": <0-200>, "comment": "<1 sentence>" },
    "team": { "score": <0-200>, "comment": "<1 sentence>" }
  },
  "verdict": "<2-3 sentence overall verdict, reference the market data found>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "recommendations": ["<action 1>", "<action 2>", "<action 3>", "<action 4>"],
  "marketInsight": "<1-2 sentences about what the real market data reveals>",
  "killOrContinue": "<KILL or CONTINUE or PIVOT>"
}`;

      // AI Pass 1
      const ai1Res = await callClaude([{ role: "user", content: aiPrompt(1) }]);
      const ai1Text = ai1Res.content?.map(i => i.text || "").join("") || "";
      const ai1 = JSON.parse(ai1Text.replace(/```json|```/g, "").trim());

      // AI Pass 2
      setAnalysisPhase("ai_pass_2");
      const ai2Res = await callClaude([{ role: "user", content: aiPrompt(2) }]);
      const ai2Text = ai2Res.content?.map(i => i.text || "").join("") || "";
      const ai2 = JSON.parse(ai2Text.replace(/```json|```/g, "").trim());

      // ===== PHASE 4: BLEND ALL THREE SCORES =====
      setAnalysisPhase("blending");
      await new Promise(r => setTimeout(r, 400));

      // Weights: Algorithm 20%, AI Pass 1: 40%, AI Pass 2: 40%
      const blend = (dim) => Math.round(
        (algoScores[dim] || 0) * 0.2 +
        (ai1.breakdown?.[dim]?.score || 0) * 0.4 +
        (ai2.breakdown?.[dim]?.score || 0) * 0.4
      );

      const blendedBreakdown = {
        market: { score: blend("market"), comment: ai1.breakdown?.market?.comment || "" },
        problemFit: { score: blend("problemFit"), comment: ai1.breakdown?.problemFit?.comment || "" },
        competitive: { score: blend("competitive"), comment: ai1.breakdown?.competitive?.comment || "" },
        revenue: { score: blend("revenue"), comment: ai1.breakdown?.revenue?.comment || "" },
        team: { score: blend("team"), comment: ai1.breakdown?.team?.comment || "" },
      };

      const blendedTotal = Object.values(blendedBreakdown).reduce((a, b) => a + b.score, 0);

      // Determine kill/continue by majority
      const votes = [ai1.killOrContinue, ai2.killOrContinue];
      const killVotes = votes.filter(v => v === "KILL").length;
      const pivotVotes = votes.filter(v => v === "PIVOT").length;
      let finalVerdict = "CONTINUE";
      if (killVotes >= 2) finalVerdict = "KILL";
      else if (pivotVotes >= 1 || killVotes >= 1) finalVerdict = "PIVOT";

      // Confidence: how close were the two AI scores?
      const scoreDiff = Math.abs((ai1.score || 0) - (ai2.score || 0));
      const confidence = scoreDiff < 50 ? "HIGH" : scoreDiff < 120 ? "MEDIUM" : "LOW";

      const finalResult = {
        score: blendedTotal,
        breakdown: blendedBreakdown,
        verdict: ai1.verdict || ai2.verdict || "",
        strengths: ai1.strengths || ai2.strengths || [],
        weaknesses: ai1.weaknesses || ai2.weaknesses || [],
        recommendations: [...new Set([...(ai1.recommendations || []), ...(ai2.recommendations || [])])].slice(0, 6),
        marketInsight: ai1.marketInsight || ai2.marketInsight || "",
        killOrContinue: finalVerdict,
        // Meta: transparency data
        meta: {
          algorithmScore: algoTotal,
          aiPass1Score: ai1.score || 0,
          aiPass2Score: ai2.score || 0,
          confidence,
          scoreDiff,
          methodology: "Hybrid: 20% Algorithm + 40% AI Pass 1 + 40% AI Pass 2"
        }
      };

      setResult(finalResult);
      setPage("results");
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Please try again.");
      setPage("form");
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <>
            <Input label="Startup Name" placeholder="e.g. NeuralMatch" value={formData.ideaName} onChange={v => update("ideaName", v)} />
            <TextArea label="Describe Your Idea" placeholder="What does your product/service do? Be specific..." value={formData.ideaDescription} onChange={v => update("ideaDescription", v)} />
            <TextArea label="What Problem Does It Solve?" placeholder="What pain point are you addressing?" value={formData.problemSolving} onChange={v => update("problemSolving", v)} rows={3} />
            <Input label="Target Audience" placeholder="Who are your ideal customers?" value={formData.targetAudience} onChange={v => update("targetAudience", v)} />
            <TextArea label="Unique Value Proposition" placeholder="Why would someone choose you over alternatives?" value={formData.uniqueValue} onChange={v => update("uniqueValue", v)} rows={3} />
          </>
        );
      case 1:
        return (
          <>
            <TextArea label="Known Competitors" placeholder="List your main competitors and what they do..." value={formData.competitors} onChange={v => update("competitors", v)} />
            <TextArea label="Their Weaknesses" placeholder="Where do existing solutions fall short?" value={formData.competitorWeakness} onChange={v => update("competitorWeakness", v)} />
            <Input label="Estimated Market Size" placeholder="e.g. $2B TAM, growing 15% YoY" value={formData.marketSize} onChange={v => update("marketSize", v)} />
          </>
        );
      case 2:
        return (
          <>
            <TextArea label="Revenue Model" placeholder="How will you make money? (SaaS, marketplace, ads, etc.)" value={formData.revenueModel} onChange={v => update("revenueModel", v)} rows={3} />
            <Input label="Pricing Strategy" placeholder="e.g. $29/mo starter, $99/mo pro, enterprise custom" value={formData.pricing} onChange={v => update("pricing", v)} />
            <TextArea label="Customer Acquisition Strategy" placeholder="How will you get your first 100 customers?" value={formData.customerAcquisition} onChange={v => update("customerAcquisition", v)} rows={3} />
          </>
        );
      case 3:
        return (
          <>
            <Input label="Team Size" placeholder="e.g. 2 co-founders + 1 engineer" value={formData.teamSize} onChange={v => update("teamSize", v)} />
            <TextArea label="Team Skills & Background" placeholder="What relevant skills does your team bring?" value={formData.teamSkills} onChange={v => update("teamSkills", v)} />
            <TextArea label="Founder Experience" placeholder="Previous startups, industry experience, domain expertise..." value={formData.founderExperience} onChange={v => update("founderExperience", v)} />
          </>
        );
      case 4:
        return (
          <>
            <Input label="MVP Timeline" placeholder="e.g. 3 months to launch beta" value={formData.mvpTimeline} onChange={v => update("mvpTimeline", v)} />
            <TextArea label="Key Milestones (Next 12 Months)" placeholder="What are your major goals and deadlines?" value={formData.milestones} onChange={v => update("milestones", v)} />
            <Input label="Funding Needed" placeholder="e.g. $500K seed round, bootstrapped, etc." value={formData.fundingNeeded} onChange={v => update("fundingNeeded", v)} />
          </>
        );
    }
  };

  // Show nothing while Firebase checks auth state
  if (authLoading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0a0a0f 0%, #0d1117 40%, #0a0f1a 100%)",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "50%",
          border: "3px solid rgba(255,255,255,0.08)",
          borderTopColor: "#00e5ff",
          animation: "spin 0.8s linear infinite"
        }} />
      </div>
    );
  }

  // LANDING PAGE
  if (page === "landing") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0a0a0f 0%, #0d1117 40%, #0a0f1a 100%)",
        color: "#fff", fontFamily: "'DM Sans', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "40px 20px", position: "relative", overflow: "hidden"
      }}>
        {/* Background grid */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.03,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />
        {/* Glow */}
        <div style={{
          position: "absolute", top: "-200px", left: "50%", transform: "translateX(-50%)",
          width: "600px", height: "600px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)",
          pointerEvents: "none"
        }} />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "680px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "8px 20px", borderRadius: "40px",
            border: "1px solid rgba(0,229,255,0.2)",
            background: "rgba(0,229,255,0.05)",
            fontSize: "13px", color: "rgba(0,229,255,0.8)",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "1px", marginBottom: "40px",
            textTransform: "uppercase"
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00e5ff", display: "inline-block", animation: "pulse 2s infinite" }} />
            Hybrid AI Engine
          </div>

          <h1 style={{
            fontSize: "clamp(42px, 7vw, 72px)", fontWeight: 800,
            lineHeight: 1.05, margin: "0 0 24px 0",
            fontFamily: "'Instrument Serif', 'Playfair Display', Georgia, serif",
            letterSpacing: "-1.5px"
          }}>
            Should You Build
            <br />
            <span style={{
              background: "linear-gradient(135deg, #00e5ff, #00e676)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
            }}>That Startup?</span>
          </h1>

          <p style={{
            fontSize: "18px", color: "rgba(255,255,255,0.45)",
            lineHeight: 1.7, margin: "0 auto 48px", maxWidth: "500px"
          }}>
            Hybrid scoring engine: weighted algorithm + dual AI evaluation + live market research. No sugarcoating. No BS.
          </p>

          <GoogleButton onClick={handleGoogleSignIn} />
          <AuthErrorOverlay message={authError} onClose={() => setAuthError("")} />

          <div style={{
            display: "flex", justifyContent: "center", gap: "48px",
            marginTop: "64px", flexWrap: "wrap"
          }}>
            {[
              { n: "1,000", l: "Point Score" },
              { n: "3", l: "Scoring Layers" },
              { n: "5", l: "Dimensions" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: "28px", fontWeight: 700, color: "#00e5ff",
                  fontFamily: "'JetBrains Mono', monospace"
                }}>{s.n}</div>
                <div style={{
                  fontSize: "12px", color: "rgba(255,255,255,0.3)",
                  letterSpacing: "1px", textTransform: "uppercase", marginTop: "4px"
                }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  // FORM PAGE
  if (page === "form") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0a0a0f 0%, #0d1117 40%, #0a0f1a 100%)",
        color: "#fff", fontFamily: "'DM Sans', sans-serif",
        padding: "40px 20px"
      }}>
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "48px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "2px", textTransform: "uppercase" }}>
                Step {step + 1} of {STEPS.length}
              </div>
              <div style={{ fontSize: "28px", fontWeight: 700, marginTop: "4px", fontFamily: "'Instrument Serif', Georgia, serif" }}>
                {STEPS[step].icon} {STEPS[step].label}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>
                Hey, {userName} 👋
              </span>
              <button onClick={handleSignOut} style={{
                padding: "6px 12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent", color: "rgba(255,255,255,0.4)", fontSize: "12px",
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s"
              }}>Sign out</button>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{
            display: "flex", gap: "6px", marginBottom: "40px"
          }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: "3px", borderRadius: "2px",
                background: i <= step ? "linear-gradient(90deg, #00e5ff, #00e676)" : "rgba(255,255,255,0.06)",
                transition: "background 0.4s"
              }} />
            ))}
          </div>

          {error && (
            <div style={{
              padding: "14px 20px", borderRadius: "12px",
              background: "rgba(255,23,68,0.08)", border: "1px solid rgba(255,23,68,0.2)",
              color: "#ff6b6b", fontSize: "14px", marginBottom: "24px"
            }}>{error}</div>
          )}

          {/* Form fields */}
          {renderStepContent()}

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "32px", gap: "16px" }}>
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  padding: "14px 32px", borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent", color: "rgba(255,255,255,0.6)",
                  fontSize: "15px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500
                }}
              >← Back</button>
            )}
            <button
              onClick={() => {
                if (step < STEPS.length - 1) setStep(s => s + 1);
                else handleSubmit();
              }}
              style={{
                padding: "14px 36px", borderRadius: "12px",
                border: "none", marginLeft: "auto",
                background: step === STEPS.length - 1
                  ? "linear-gradient(135deg, #00e5ff, #00e676)"
                  : "rgba(255,255,255,0.08)",
                color: step === STEPS.length - 1 ? "#0a0a0f" : "#fff",
                fontSize: "15px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700, letterSpacing: "0.3px"
              }}
            >
              {step === STEPS.length - 1 ? "🔍 Analyze My Idea" : "Next →"}
            </button>
          </div>
        </div>

      </div>
    );
  }

  // LOADING PAGE
  if (page === "loading") {
    const phases = [
      { id: "research", label: "Researching Market Data", desc: "Searching for real industry benchmarks & competitors...", icon: "🔍" },
      { id: "algorithm", label: "Running Algorithm", desc: "Computing formula-based scores across 5 dimensions...", icon: "⚙️" },
      { id: "ai_pass_1", label: "AI Evaluation — Pass 1", desc: "First independent AI analysis with market context...", icon: "🧠" },
      { id: "ai_pass_2", label: "AI Evaluation — Pass 2", desc: "Second independent AI pass for consistency...", icon: "🧠" },
      { id: "blending", label: "Blending Scores", desc: "Combining algorithm + dual AI scores (20/40/40 weight)...", icon: "🔬" },
    ];
    const currentIdx = phases.findIndex(p => p.id === analysisPhase);

    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0a0a0f 0%, #0d1117 40%, #0a0f1a 100%)",
        color: "#fff", fontFamily: "'DM Sans', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "40px 20px"
      }}>
        <div style={{ maxWidth: "440px", width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "50%",
              border: "3px solid rgba(255,255,255,0.05)",
              borderTopColor: "#00e5ff",
              animation: "spin 1s linear infinite",
              margin: "0 auto 24px"
            }} />
            <div style={{
              fontSize: "24px", fontWeight: 700,
              fontFamily: "'Instrument Serif', Georgia, serif"
            }}>Analyzing Your Startup</div>
            <div style={{
              fontSize: "13px", color: "rgba(255,255,255,0.35)", marginTop: "8px",
              fontFamily: "'JetBrains Mono', monospace"
            }}>Hybrid Engine: Algorithm + Dual AI + Web Search</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {phases.map((phase, i) => {
              const isActive = i === currentIdx;
              const isDone = i < currentIdx;
              return (
                <div key={phase.id} style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  padding: "14px 18px", borderRadius: "12px",
                  background: isActive ? "rgba(0,229,255,0.06)" : isDone ? "rgba(0,230,118,0.04)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isActive ? "rgba(0,229,255,0.2)" : isDone ? "rgba(0,230,118,0.1)" : "rgba(255,255,255,0.04)"}`,
                  transition: "all 0.4s"
                }}>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "8px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "16px",
                    background: isDone ? "rgba(0,230,118,0.1)" : isActive ? "rgba(0,229,255,0.1)" : "rgba(255,255,255,0.03)"
                  }}>
                    {isDone ? "✓" : isActive ? phase.icon : "○"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: "14px", fontWeight: 600,
                      color: isDone ? "#00e676" : isActive ? "#00e5ff" : "rgba(255,255,255,0.25)"
                    }}>{phase.label}</div>
                    {isActive && (
                      <div style={{
                        fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "2px"
                      }}>{phase.desc}</div>
                    )}
                  </div>
                  {isActive && (
                    <div style={{
                      width: "18px", height: "18px", borderRadius: "50%",
                      border: "2px solid rgba(0,229,255,0.3)",
                      borderTopColor: "#00e5ff",
                      animation: "spin 0.8s linear infinite"
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // RESULTS PAGE
  if (page === "results" && result) {
    const tier = getTier(result.score);
    const breakdownItems = [
      { label: "Market", data: result.breakdown?.market, max: 200 },
      { label: "Problem Fit", data: result.breakdown?.problemFit, max: 200 },
      { label: "Competitive Edge", data: result.breakdown?.competitive, max: 200 },
      { label: "Revenue", data: result.breakdown?.revenue, max: 200 },
      { label: "Team", data: result.breakdown?.team, max: 200 },
    ];

    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0a0a0f 0%, #0d1117 40%, #0a0f1a 100%)",
        color: "#fff", fontFamily: "'DM Sans', sans-serif",
        padding: "40px 20px"
      }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          {/* Verdict banner */}
          <div style={{
            textAlign: "center", padding: "48px 24px",
            borderRadius: "20px", border: `1px solid ${tier.color}20`,
            background: tier.bg, marginBottom: "32px", position: "relative", overflow: "hidden"
          }}>
            <div style={{
              position: "absolute", top: "-100px", left: "50%", transform: "translateX(-50%)",
              width: "400px", height: "400px", borderRadius: "50%",
              background: `radial-gradient(circle, ${tier.color}08 0%, transparent 70%)`,
              pointerEvents: "none"
            }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{
                display: "inline-block", padding: "6px 16px", borderRadius: "20px",
                background: `${tier.color}15`, border: `1px solid ${tier.color}30`,
                fontSize: "12px", fontFamily: "'JetBrains Mono', monospace",
                color: tier.color, letterSpacing: "2px", fontWeight: 700,
                marginBottom: "24px"
              }}>{tier.emoji} {tier.label}</div>

              <div style={{ margin: "24px 0" }}>
                <AnimatedScore target={result.score} tier={tier} />
              </div>

              <p style={{
                fontSize: "17px", color: "rgba(255,255,255,0.6)",
                maxWidth: "480px", margin: "16px auto 0", lineHeight: 1.6
              }}>{result.verdict}</p>
            </div>
          </div>

          {/* Kill / Continue / Pivot badge */}
          {result.killOrContinue && (
            <div style={{
              textAlign: "center", marginBottom: "32px"
            }}>
              <span style={{
                display: "inline-block", padding: "10px 28px", borderRadius: "10px",
                fontSize: "16px", fontWeight: 800, letterSpacing: "3px",
                fontFamily: "'JetBrains Mono', monospace",
                background: result.killOrContinue === "KILL" ? "rgba(255,23,68,0.12)" :
                  result.killOrContinue === "PIVOT" ? "rgba(255,214,0,0.12)" : "rgba(0,230,118,0.12)",
                color: result.killOrContinue === "KILL" ? "#ff1744" :
                  result.killOrContinue === "PIVOT" ? "#ffd600" : "#00e676",
                border: `1px solid ${result.killOrContinue === "KILL" ? "rgba(255,23,68,0.3)" :
                  result.killOrContinue === "PIVOT" ? "rgba(255,214,0,0.3)" : "rgba(0,230,118,0.3)"}`
              }}>
                {result.killOrContinue === "KILL" ? "🛑 KILL THE IDEA" :
                  result.killOrContinue === "PIVOT" ? "🔄 PIVOT REQUIRED" : "🚀 CONTINUE BUILDING"}
              </span>
            </div>
          )}

          {/* Breakdown bars */}
          <div style={{
            padding: "28px", borderRadius: "16px",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            marginBottom: "24px"
          }}>
            <div style={{
              fontSize: "12px", color: "rgba(255,255,255,0.35)",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "2px", textTransform: "uppercase", marginBottom: "20px"
            }}>Score Breakdown</div>
            {breakdownItems.map((item, i) => (
              <div key={i} style={{ marginBottom: i < breakdownItems.length - 1 ? "18px" : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>{item.label}</span>
                  <span style={{
                    fontSize: "14px", fontFamily: "'JetBrains Mono', monospace",
                    color: tier.color, fontWeight: 600
                  }}>{item.data?.score || 0}/{item.max}</span>
                </div>
                <div style={{
                  height: "6px", borderRadius: "3px",
                  background: "rgba(255,255,255,0.04)"
                }}>
                  <div style={{
                    height: "100%", borderRadius: "3px",
                    width: `${((item.data?.score || 0) / item.max) * 100}%`,
                    background: `linear-gradient(90deg, ${tier.color}, ${tier.color}80)`,
                    transition: "width 1.5s ease-out",
                    transitionDelay: `${i * 0.15}s`
                  }} />
                </div>
                {item.data?.comment && (
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
                    {item.data.comment}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Market Intelligence from web search */}
          {result.marketInsight && (
            <div style={{
              padding: "24px", borderRadius: "16px",
              background: "rgba(138,180,248,0.04)", border: "1px solid rgba(138,180,248,0.1)",
              marginBottom: "24px"
            }}>
              <div style={{
                fontSize: "12px", fontFamily: "'JetBrains Mono', monospace",
                color: "rgba(138,180,248,0.9)", letterSpacing: "2px", marginBottom: "12px"
              }}>🌐 LIVE MARKET INTELLIGENCE</div>
              <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
                {result.marketInsight}
              </div>
            </div>
          )}

          {/* Methodology Transparency */}
          {result.meta && (
            <div style={{
              padding: "24px", borderRadius: "16px",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              marginBottom: "24px"
            }}>
              <div style={{
                fontSize: "12px", fontFamily: "'JetBrains Mono', monospace",
                color: "rgba(255,255,255,0.35)", letterSpacing: "2px", marginBottom: "16px"
              }}>📊 SCORING METHODOLOGY</div>
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px"
              }}>
                {[
                  { label: "Algorithm", value: result.meta.algorithmScore, weight: "20%", color: "#ffd600" },
                  { label: "AI Pass 1", value: result.meta.aiPass1Score, weight: "40%", color: "#00e5ff" },
                  { label: "AI Pass 2", value: result.meta.aiPass2Score, weight: "40%", color: "#bb86fc" },
                ].map((m, i) => (
                  <div key={i} style={{
                    padding: "14px", borderRadius: "10px",
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                    textAlign: "center"
                  }}>
                    <div style={{
                      fontSize: "11px", color: "rgba(255,255,255,0.35)",
                      fontFamily: "'JetBrains Mono', monospace", letterSpacing: "1px",
                      marginBottom: "6px"
                    }}>{m.label} ({m.weight})</div>
                    <div style={{
                      fontSize: "24px", fontWeight: 700, color: m.color,
                      fontFamily: "'JetBrains Mono', monospace"
                    }}>{m.value}</div>
                    <div style={{
                      fontSize: "10px", color: "rgba(255,255,255,0.2)",
                      fontFamily: "'JetBrains Mono', monospace"
                    }}>/ 1000</div>
                  </div>
                ))}
              </div>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginTop: "16px", padding: "12px 16px", borderRadius: "8px",
                background: "rgba(255,255,255,0.02)"
              }}>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
                  AI Consistency: <span style={{
                    color: result.meta.confidence === "HIGH" ? "#00e676" :
                      result.meta.confidence === "MEDIUM" ? "#ffd600" : "#ff1744",
                    fontWeight: 600
                  }}>{result.meta.confidence}</span>
                  <span style={{ color: "rgba(255,255,255,0.2)", marginLeft: "8px", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>
                    (Δ{result.meta.scoreDiff} pts between passes)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Strengths & Weaknesses */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div style={{
              padding: "24px", borderRadius: "16px",
              background: "rgba(0,230,118,0.04)", border: "1px solid rgba(0,230,118,0.1)"
            }}>
              <div style={{
                fontSize: "12px", fontFamily: "'JetBrains Mono', monospace",
                color: "#00e676", letterSpacing: "2px", marginBottom: "16px"
              }}>✦ STRENGTHS</div>
              {result.strengths?.map((s, i) => (
                <div key={i} style={{
                  fontSize: "14px", color: "rgba(255,255,255,0.6)",
                  marginBottom: "10px", paddingLeft: "12px",
                  borderLeft: "2px solid rgba(0,230,118,0.2)", lineHeight: 1.5
                }}>{s}</div>
              ))}
            </div>
            <div style={{
              padding: "24px", borderRadius: "16px",
              background: "rgba(255,23,68,0.04)", border: "1px solid rgba(255,23,68,0.1)"
            }}>
              <div style={{
                fontSize: "12px", fontFamily: "'JetBrains Mono', monospace",
                color: "#ff1744", letterSpacing: "2px", marginBottom: "16px"
              }}>✦ WEAKNESSES</div>
              {result.weaknesses?.map((w, i) => (
                <div key={i} style={{
                  fontSize: "14px", color: "rgba(255,255,255,0.6)",
                  marginBottom: "10px", paddingLeft: "12px",
                  borderLeft: "2px solid rgba(255,23,68,0.2)", lineHeight: 1.5
                }}>{w}</div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div style={{
            padding: "28px", borderRadius: "16px",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            marginBottom: "32px"
          }}>
            <div style={{
              fontSize: "12px", fontFamily: "'JetBrains Mono', monospace",
              color: "rgba(0,229,255,0.8)", letterSpacing: "2px", marginBottom: "20px"
            }}>📋 RECOMMENDATIONS</div>
            {result.recommendations?.map((r, i) => (
              <div key={i} style={{
                display: "flex", gap: "14px", alignItems: "flex-start",
                marginBottom: "14px"
              }}>
                <div style={{
                  minWidth: "28px", height: "28px", borderRadius: "8px",
                  background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontFamily: "'JetBrains Mono', monospace",
                  color: "#00e5ff", fontWeight: 700
                }}>{i + 1}</div>
                <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{r}</div>
              </div>
            ))}
          </div>

          {/* Start over */}
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => {
                setPage("form");
                setStep(0);
                setFormData({
                  ideaName: "", ideaDescription: "", problemSolving: "", targetAudience: "", uniqueValue: "",
                  competitors: "", competitorWeakness: "", marketSize: "",
                  revenueModel: "", pricing: "", customerAcquisition: "",
                  teamSize: "", teamSkills: "", founderExperience: "",
                  mvpTimeline: "", milestones: "", fundingNeeded: ""
                });
                setResult(null);
              }}
              style={{
                padding: "14px 36px", borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent", color: "rgba(255,255,255,0.6)",
                fontSize: "15px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500
              }}
            >🔄 Evaluate Another Idea</button>
          </div>
        </div>

      </div>
    );
  }

  return null;
}

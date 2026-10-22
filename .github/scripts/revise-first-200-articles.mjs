import fs from 'node:fs';
import path from 'node:path';

const root = 'blog/en/articles';
const suffixes = [
  '-2026-best-practices','-advanced-tactics-for-growing-teams','-budget-and-resource-planning',
  '-common-mistakes-and-fixes','-kpis-and-measurement-framework','-research-and-audit-checklist',
  '-step-by-step-implementation','-step-by-step-implementation-guide',
  '-strategy-and-planning-framework','-strategy-and-planning-guide',
  '-testing-and-optimisation','-tools-and-workflow-guide'
];
const excluded = new Set([
  'agency-operations-common-mistakes-and-how-to-fix-them.html','agency-operations-measurement-kpis-and-reporting.html',
  'agency-operations-research-methods-and-prioritisation.html','agency-operations-step-by-step-implementation-guide.html',
  'agency-operations-strategy-and-planning-framework.html','brand-research-research-and-audit-checklist.html',
  'brand-research-step-by-step-implementation.html','brand-research-strategy-and-planning-guide.html',
  'brand-research-testing-and-optimisation.html','brand-research-tools-and-workflow-guide.html',
  'brand-strategy-audit-checklist-for-growing-businesses.html','brand-strategy-common-mistakes-and-how-to-fix-them.html',
  'brand-strategy-measurement-kpis-and-reporting.html','brand-strategy-research-methods-and-prioritisation.html',
  'brand-strategy-step-by-step-implementation-guide.html','community-marketing-advanced-tactics-for-growing-teams.html',
  'community-marketing-budget-and-resource-planning.html','community-marketing-common-mistakes-and-fixes.html',
  'community-marketing-kpis-and-measurement-framework.html','community-marketing-research-and-audit-checklist.html',
  'community-marketing-step-by-step-implementation.html','community-marketing-testing-and-optimisation.html',
  'community-marketing-tools-and-workflow-guide.html','competitive-analysis-advanced-tactics-for-growing-teams.html',
  'competitive-analysis-budget-and-resource-planning.html','competitive-analysis-common-mistakes-and-fixes.html',
  'competitive-analysis-kpis-and-measurement-framework.html','competitive-analysis-research-and-audit-checklist.html',
  'competitive-analysis-step-by-step-implementation.html','competitive-analysis-testing-and-optimisation.html',
  'competitive-analysis-tools-and-workflow-guide.html','competitor-analysis-digital-marketing.html',
  'content-calendar-workflow.html','content-distribution-2026-best-practices.html',
  'content-distribution-advanced-tactics-for-growing-teams.html','content-distribution-budget-and-resource-planning.html',
  'content-distribution-common-mistakes-and-fixes.html','content-distribution-kpis-and-measurement-framework.html',
  'content-distribution-research-and-audit-checklist.html','content-distribution-step-by-step-implementation.html',
  'content-distribution-strategy-and-planning-guide.html','content-distribution-testing-and-optimisation.html',
  'content-distribution-tools-and-workflow-guide.html','content-brief-seo-template.html',
  'content-governance-framework.html','website-redesign-content-audit.html',
  'analytics-implementation-strategy-and-planning-guide.html'
]);
const variants = {
 '2026-best-practices':['Best practices','Establish a baseline, define the audience and choose practices that solve a real user problem. Combine customer evidence with operational data, record assumptions and prioritise changes by impact and confidence.'],
 'advanced-tactics-for-growing-teams':['Advanced tactics','Segment only where differences change the action. Standardise repeatable steps, make handoffs visible and allocate capacity using evidence. Pilot improvements before scaling and monitor whether efficiency preserves quality and trust.'],
 'budget-and-resource-planning':['Budget and resources','Plan around scope, outcomes, people, tools and maintenance. Estimate research, delivery, review, training and ongoing support; compare scenarios with explicit assumptions. Protect testing and accessibility, then reallocate using actual effort and results.'],
 'common-mistakes-and-fixes':['Common mistakes','Avoid tactic-first planning, untested assumptions, unclear ownership, activity-only metrics and neglected maintenance. Start with audience needs, verify evidence, assign owners, measure quality and outcomes, and set review dates.'],
 'kpis-and-measurement-framework':['KPIs and measurement','Use a small set of defined indicators tied to the intended outcome. Document formulas, sources, owners and limitations; separate activity from quality and impact. Interpret changes in context and end reports with a decision and owner.'],
 'research-and-audit-checklist':['Research and audit','Confirm the decision and audience, check source freshness and bias, test the user experience, identify overlap or missing needs, and prioritise fixes by impact, confidence and effort.'],
 'step-by-step-implementation':['Implementation steps','Define the outcome, establish a baseline, plan scope and ownership, pilot representative cases, validate quality and launch with safeguards. Measure results, document limitations and adapt based on evidence.'],
 'step-by-step-implementation-guide':['Implementation steps','Define the outcome, establish a baseline, plan scope and ownership, pilot representative cases, validate quality and launch with safeguards. Measure results, document limitations and adapt based on evidence.'],
 'strategy-and-planning-framework':['Strategy and planning','Start with audience and business needs, research alternatives, choose priorities and trade-offs, then translate decisions into owners, milestones and measures. State assumptions and revisit them when evidence changes.'],
 'strategy-and-planning-guide':['Strategy and planning','Start with audience and business needs, research alternatives, choose priorities and trade-offs, then translate decisions into owners, milestones and measures. State assumptions and revisit them when evidence changes.'],
 'testing-and-optimisation':['Testing and optimisation','Use a testable hypothesis, suitable method and clear decision rule. Keep comparisons interpretable, set the observation window in advance, measure quality and guardrails, and document uncertainty before rolling out.'],
 'tools-and-workflow-guide':['Tools and workflow','Map inputs, steps, handoffs and exceptions before choosing software. Compare usability, integration, accessibility, permissions and cost; define data ownership, pilot realistic cases and review adoption and reliability.']
};
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const files = fs.readdirSync(root).filter(f => f.endsWith('.html') && !excluded.has(f) && suffixes.some(s => f.slice(0,-5).endsWith(s))).sort();
const selected = files.slice(0,200);
if (selected.length !== 200) throw new Error('Expected 200 candidate pages; found '+selected.length);
const changed = [];
for (const file of selected) {
  const full = path.join(root,file), html = fs.readFileSync(full,'utf8');
  const match = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i);
  if (!match) throw new Error('Missing main: '+file);
  const fn = file.slice(0,-5), suffix = suffixes.find(s => fn.endsWith(s));
  const title = (match[0].match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]?.replace(/<[^>]*>/g,'').trim();
  if (!suffix || !title) throw new Error('Could not identify title/variant: '+file);
  const topic = fn.slice(0,-suffix.length).replace(/-/g,' ').replace(/\bseo\b/gi,'SEO').replace(/\bb2b\b/gi,'B2B').replace(/\bai\b/gi,'AI').replace(/\b\w/g,c=>c.toUpperCase());
  const [variant,detail] = variants[suffix.slice(1)];
  const intro = 'A practical, evidence-led guide to '+topic.toLowerCase()+'. Improve decisions, execution and measurement without relying on unsupported promises.';
  const sections = [
    [variant,detail.replace(/\bthe topic\b/gi,topic.toLowerCase())],
    ['Apply the framework to the real use case','Start with the people, context and decision served by '+topic.toLowerCase()+'. Review existing evidence and customer questions before selecting a method. Keep assumptions visible and avoid treating one anecdote as a general rule.'],
    ['Build quality into execution','Define owners, handoffs, review criteria and a correction path. Check factual accuracy, accessibility, privacy and relevant technical details before release. A practical process should reduce errors without blocking sensible judgement.'],
    ['Prioritise and maintain improvements','Rank actions by audience impact, evidence confidence, effort and risk. Pilot material changes, record why decisions were made and assign a review date so the work stays accurate as needs change.']
  ];
  const body = sections.map(([h,p])=>'<section><h2>'+esc(h)+'</h2><p>'+esc(p)+'</p></section>').join('');
  const main = '<main><article class="article"><div class="crumb"><a href="/index.html">Home</a> / <a href="/blog/en/index.html">Digital Blog</a> / '+esc(topic)+'</div><div class="tag">'+esc(topic)+'</div><h1>'+esc(title)+'</h1><p class="standfirst">'+esc(intro)+'</p><div class="meta"><span>RocketPen Digital Studio Editorial Team</span><span>Practical guide</span></div>'+body+'<section><h2>Practical checklist</h2><ul><li>Audience and intended outcome are explicit.</li><li>Evidence and assumptions are distinguished.</li><li>Ownership and review steps are defined.</li><li>Relevant technical, accessibility and privacy risks are considered.</li><li>Results lead to an owned next action.</li></ul></section><section class="faq"><h2>Frequently asked questions</h2><div><h3>Where should a team start?</h3><p>Start with the most important audience need, establish a baseline and choose a manageable improvement.</p></div><div><h3>How should progress be measured?</h3><p>Use defined quality and outcome measures, interpret them in context and document limitations.</p></div><div><h3>When should the approach be reviewed?</h3><p>Review it periodically and whenever customer needs or operating conditions change materially.</p></div></section><section class="cta"><h2>Turn the next step into a clear plan</h2><p>RocketPen Digital Studio helps businesses improve their digital presence with practical strategy, content and web experiences.</p><a href="/#contact">Discuss your project</a></section></article></main>';
  fs.writeFileSync(full,html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/i,main));
  changed.push(file);
}
fs.writeFileSync('reports/part-1-batch-200-revised.txt',changed.join('\n')+'\n');
console.log('Revised '+changed.length+' English article pages.');

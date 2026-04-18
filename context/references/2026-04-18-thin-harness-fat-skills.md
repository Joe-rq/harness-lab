Thin Harness, Fat Skills
Steve Yegge says people using AI coding agents are "10x to 100x as productive as engineers using Cursor and chat today, and roughly 1000x as productive as Googlers were back in 2005."
That's a real number. I've seen it. I've lived it. But when people hear it, they reach for the wrong explanation. Better models. Smarter Claude. More parameters. The 2x people and the 100x people are using the same models. The difference isn't intelligence. It's architecture — and it fits on an index card.
The harness is the product
On March 31, 2026, Anthropic accidentally shipped the entire source code for Claude Code to the npm registry. 512,000 lines. I read it. It confirmed everything I'd been teaching at YC: the secret isn't the model. It's the thing wrapping the model.
Live repo context. Prompt caching. Purpose-built tools. Context bloat minimization. Structured session memory. Parallel sub-agents. None of that makes the model smarter. All of it gives the model the right context, at the right time, without drowning it in noise.
That wrapper is called the harness. And the question every AI builder should be asking is: what goes in the harness, and what stays out? The answer has a specific shape. I call it thin harness, fat skills.
Five definitions
The bottleneck is never the model's intelligence. Models already know how to reason, synthesize, and write code. They fail because they don't understand your data — your schema, your conventions, the particular shape of your problem. Five definitions fix this.
1. Skill files
A skill file is a reusable markdown document that teaches the model how to do something. Not what to do — the user supplies that. The skill supplies the process.
Here's the key insight most people miss: a skill file works like a method call. It takes parameters. You invoke it with different arguments. The same procedure produces radically different capabilities depending on what you pass in.
Consider a skill called /investigate. It has seven steps: scope the dataset, build a timeline, diarize every document, synthesize, argue both sides, cite sources. It takes three parameters: TARGET, QUESTION, and DATASET. Point it at a safety scientist and 2.1 million discovery emails, and you get a medical research analyst determining whether a whistleblower was silenced. Point it at a shell company and FEC filings, and you get a forensic investigator tracing coordinated campaign donations.
Same skill. Same seven steps. Same markdown file. The skill describes a process of judgment. The invocation supplies the world.
This is not prompt engineering. This is software design, using markdown as the programming language and human judgment as the runtime. Markdown is, in fact, a more perfect encapsulation of capability than rigid source code, because it describes process, judgment, and context in the language the model already thinks in.
2. The harness
The harness is the program that runs the LLM. It does four things: runs the model in a loop, reads and writes your files, manages context, and enforces safety. That's it. That's the "thin."
The anti-pattern is a fat harness with thin skills. You've seen it: 40+ tool definitions eating half the context window. God-tools with 2-to-5-second MCP round-trips. REST API wrappers that turn every endpoint into a separate tool. Three times the tokens, three times the latency, three times the failure rate.
What you want instead is purpose-built tooling that's fast and narrow. A Playwright CLI that does each browser operation in 100 milliseconds, not a Chrome MCP that takes 15 seconds for screenshot-find-click-wait-read. That's 75x faster. Software doesn't have to be precious anymore. Build exactly what you need, and nothing else.
3. Resolvers
A resolver is a routing table for context. When task type X appears, load document Y first.
Skills tell the model how. Resolvers tell it what to load and when. A developer changes a prompt. Without the resolver, they ship it. With the resolver, the model reads docs/EVALS.md first — which says: run the eval suite, compare scores, if accuracy drops more than 2%, revert and investigate. The developer didn't know the eval suite existed. The resolver loaded the right context at the right moment.
Claude Code has a built-in resolver. Every skill has a description field, and the model matches user intent to skill descriptions automatically. You never have to remember that /ship exists. The description is the resolver.
A confession: my CLAUDE.md was 20,000 lines. Every quirk, every pattern, every lesson I'd ever encountered. Completely ridiculous. The model's attention degraded. Claude Code literally told me to cut it back. The fix was about 200 lines — just pointers to documents. The resolver loads the right one when it matters. Twenty thousand lines of knowledge, accessible on demand, without polluting the context window.
4. Latent vs. deterministic
Every step in your system is one or the other, and confusing them is the most common mistake in agent design.
Latent space is where intelligence lives. The model reads, interprets, decides. Judgment. Synthesis. Pattern recognition.
Deterministic is where trust lives. Same input, same output. Every time. SQL queries. Compiled code. Arithmetic.
An LLM can seat 8 people at a dinner table, accounting for personalities and social dynamics. Ask it to seat 800 and it will hallucinate a seating chart that looks plausible but is completely wrong. That's a deterministic problem — combinatorial optimization — forced into latent space. The worst systems put the wrong work on the wrong side of this line. The best systems are ruthless about it.
5. Diarization
Diarization is the step that makes AI useful for real knowledge work. The model reads everything about a subject and writes a structured profile — a single page of judgment distilled from dozens or hundreds of documents.
No SQL query produces this. No RAG pipeline produces this. The model has to actually read, hold contradictions in mind, notice what changed and when, and synthesize structured intelligence. It's the difference between a database lookup and an analyst's brief.
The architecture
These five concepts compose into a simple three-layer architecture.
Fat skills sit on top: markdown procedures that encode judgment, process, and domain knowledge. This is where 90% of the value lives.
A thin CLI harness sits in the middle: about 200 lines of code. JSON in, text out. Read-only by default.
Your application sits on the bottom: QueryDB, ReadDoc, Search, Timeline — the deterministic foundation.
The principle is directional. Push intelligence up into skills. Push execution down into deterministic tooling. Keep the harness thin. When you do this, every improvement to the model automatically improves every skill, while the deterministic layer stays perfectly reliable.
The system that learns
Let me show you all five definitions working together. Not in theory — in an actual system we're building at YC.
Chase Center. July 2026. Six thousand founders at Startup School. Each one has a structured application, questionnaire answers, transcripts from 1:1 advisor chats, and public signals: posts on X, GitHub commits, Claude Code transcripts showing how fast they ship.
The traditional approach: a program team of 15 reads applications, makes gut calls, updates a spreadsheet. It works at 200 founders. It breaks at 6,000. No human can hold that many profiles in working memory and notice that the three best candidates for the infrastructure-for-AI-agents cohort are a dev tools founder in Lagos, a compliance founder in Singapore, and a CLI-tooling founder in Brooklyn — all of whom described the same pain point in different words during their 1:1 chats.
The model can. Here's how.
Enrichment. A skill called /enrich-founder pulls all sources, runs enrichments, diarizes, and highlights the gap between what founders say and what they're actually building. The deterministic layer handles SQL lookups, GitHub stats, browser tests on demo URLs, social signal pulls, CrustData queries. A cron runs nightly. Six thousand profiles, always fresh.
The diarization output catches things no keyword search would find:
FOUNDER: Maria Santos
COMPANY: Contrail (contrail.dev)
SAYS: "Datadog for AI agents"
ACTUALLY BUILDING: 80% of commits are in billing module.
  She's building a FinOps tool disguised as observability.
That gap — "says" versus "actually building" — requires reading the GitHub commit history, the application, and the advisor transcript, and holding all three in mind at once. No embedding similarity search finds this. No keyword filter finds it. The model has to read the full profile and make a judgment. (This is the perfect decision to put in latent space!)
Matching. This is where skill-as-method-call shines. Three invocations of the same matching skill, three completely different strategies:
/match-breakout takes 1,200 founders, clusters by sector affinity, 30 per room. Embedding plus deterministic assignment. /match-lunch takes 600, does serendipity matching across sectors, 8 per table, no repeats — the LLM invents the themes, then a deterministic algorithm assigns seats. /match-live handles whoever is in the building right now, nearest-neighbor embedding, 200ms, 1:1 pairs, excluding people who've already met.
And the model makes judgment calls a clustering algorithm never could: "Santos and Oram are both AI infra, but they're not competitors — Santos is cost attribution, Oram is orchestration. Put them in the same group." Or: "Kim applied as 'developer tools' but his 1:1 transcript reveals he's building compliance automation for SOC2. Move him to FinTech/RegTech."
No embedding captures the Kim reclassification. The model has to read the entire profile.
The learning loop. After the event, an /improve skill reads NPS surveys, diarizes the mediocre responses — not the bad ones, the "OK" ones, where the system almost worked but didn't — and extracts patterns. Then it proposes new rules and writes them back into the matching skills:
When attendee says "AI infrastructure"
    but startup is 80%+ billing code:
    → Classify as FinTech, not AI Infra.

When two attendees in same group
    already know each other:
    → Penalize proximity.
       Prioritize novel introductions.
These rules get written back into the skill file. The next run uses them automatically. The skill rewrites itself.
July event: 12% "OK" ratings. Next event: 4%. The skill file learned what "OK" actually meant, and the system got better without anyone rewriting code.
The same pattern transfers everywhere: retrieve, read, diarize, count, synthesize. Then: survey, investigate, diarize, rewrite the skill.
If you want to know what the most valuable loops are in 2026, it's those. We can apply them to every discipline and walk of life of knowledge work in existence.
Skills are permanent upgrades
I tweeted an instruction I gave to my OpenClaw recently that resonated more than I expected:
You are not allowed to do one-off work. If I ask you to do something and it's the kind of thing that will need to happen again, you must: do it manually the first time on 3 to 10 items. Show me the output. If I approve, codify it into a skill file. If it should run automatically, put it on a cron.The test: if I have to ask you for something twice, you failed.
A thousand likes and twenty-five hundred bookmarks. People thought it was a prompt engineering trick. It's not. It's the architecture I've been describing. Every skill you write is a permanent upgrade to your system. It never degrades. It never forgets. It runs at 3 AM while you sleep. And when the next model drops, every skill instantly gets better — the judgment in the latent steps improves while the deterministic steps stay perfectly reliable.
That's how you get Yegge's 100x. Not a smarter model. Fat skills, thin harness, and the discipline to codify everything.
The system compounds. Build it once. It runs forever.

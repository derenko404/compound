// Chapter guides, transcribed from the Engineer Skills Roadmap doc.
import type { ChapterId } from '@/lib/types'

export type ResourceKind = 'book' | 'course' | 'video' | 'article' | 'tool' | 'doc' | 'practice' | 'podcast' | 'other'
export interface Resource { title: string; url?: string; kind?: ResourceKind; note?: string; free?: boolean }
export interface ResourceGroup { title: string; intro?: string; items: Resource[] }
export interface Checklist { title: string; items: string[] }
export interface ChapterGuide {
  why?: string            // why this chapter matters / summary paragraph
  outcomes?: string[]     // what you'll be able to do / goals
  groups: ResourceGroup[] // resource sections, in doc order (by topic or by quarter/month as in the doc)
  checklists?: Checklist[] // e.g. accent checklist rows, prep checklist, craving tactics, diet rules, workout A/B
  tips?: string[]
}
export interface ProjectDetail { goal: string; steps?: string[]; done?: string; stack?: string }
export interface Overview { intro?: string; schedule?: { day: string; what: string }[]; skills?: { chapter: ChapterId; skills: string[] }[]; principles?: string[] }

export const GUIDES: Partial<Record<ChapterId, ChapterGuide>> = {
  tech: {
    why: 'System design, highload backend, cloud, operations, security and AI engineering. Technical is the main focus in Q1, Q3 and Q6; in the other quarters it runs as a light track of about 30 minutes a week. The plan runs November 2026 to April 2028.',
    outcomes: [
      'Design and run a scalable backend on AWS',
      'Pass a system design interview',
    ],
    groups: [
      {
        title: 'System design and highload backend: YouTube',
        intro: 'These 14 topics cover most highload and system design interviews and real scaling work; learn them in this order (see the topic checklist below).',
        items: [
          { title: 'ByteByteGo', url: 'https://www.youtube.com/@ByteByteGo', kind: 'video', note: 'Short animated explainers of every topic above.', free: true },
          { title: 'System Design for Beginners (freeCodeCamp)', url: 'https://www.youtube.com/watch?v=m8Icp_Cid5o', kind: 'video', note: 'Full course in one video.', free: true },
          { title: 'Hussein Nasser', url: 'https://www.youtube.com/@hnasr', kind: 'video', note: 'Deep dives into databases, proxies and networking.', free: true },
          { title: 'Arpit Bhayani', url: 'https://www.youtube.com/@AsliEngineering', kind: 'video', note: 'How real companies built their systems.', free: true },
          { title: 'Martin Kleppmann, Distributed Systems lectures', url: 'https://www.youtube.com/playlist?list=PLeKd45zvjcDFUEv_ohr_HdUFe97RItdiB', kind: 'video', note: 'The theory, from the DDIA author.', free: true },
          { title: 'CMU Database Group', url: 'https://www.youtube.com/@CMUDatabaseGroup', kind: 'video', note: 'University database courses, free.', free: true },
        ],
      },
      {
        title: 'System design: free courses and guides',
        items: [
          { title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', kind: 'course', note: 'The classic free guide, with practice problems.', free: true },
          { title: 'Hello Interview: System Design in a Hurry', url: 'https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction', kind: 'course', note: 'A short, modern interview guide.', free: true },
          { title: 'roadmap.sh: Backend', url: 'https://roadmap.sh/backend', kind: 'doc', note: 'A map of what to learn.', free: true },
          { title: 'roadmap.sh: System Design', url: 'https://roadmap.sh/system-design', kind: 'doc', note: 'A map of what to learn.', free: true },
          { title: 'MIT 6.824 Distributed Systems', url: 'https://pdos.csail.mit.edu/6.824/', kind: 'course', note: 'Advanced, with labs in Go.', free: true },
        ],
      },
      {
        title: 'System design: books',
        items: [
          { title: 'Designing Data-Intensive Applications by Martin Kleppmann', url: 'https://dataintensive.net/', kind: 'book', note: 'The single most important book here.' },
          { title: 'System Design Interview, Vol. 1 and 2, by Alex Xu', kind: 'book', note: 'Worked examples.' },
          { title: 'Release It! by Michael Nygard', kind: 'book', note: 'How systems fail in production.' },
          { title: 'Database Internals by Alex Petrov', kind: 'book', note: 'Storage engines and distributed databases.' },
        ],
      },
      {
        title: 'System design: articles',
        items: [
          { title: 'Latency numbers every programmer should know', url: 'https://gist.github.com/jboner/2841832', kind: 'article', free: true },
          { title: 'Stripe: Scaling your API with rate limiters', url: 'https://stripe.com/blog/rate-limiters', kind: 'article', free: true },
          { title: 'Discord: How we store trillions of messages', url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages', kind: 'article', free: true },
          { title: 'Jepsen: Consistency models', url: 'https://jepsen.io/consistency', kind: 'article', free: true },
          { title: 'AWS Builders\' Library', url: 'https://aws.amazon.com/builders-library/', kind: 'article', note: 'How Amazon builds resilient systems.', free: true },
          { title: 'Awesome Scalability', url: 'https://github.com/binhnguyennus/awesome-scalability', kind: 'article', note: 'A huge list of real-world engineering posts.', free: true },
          { title: 'ByteByteGo blog', url: 'https://blog.bytebytego.com/', kind: 'article', free: true },
          { title: 'High Scalability', url: 'https://highscalability.com/', kind: 'article', free: true },
        ],
      },
      {
        title: 'Cloud, AWS, Docker and Terraform: YouTube',
        intro: 'Learn cloud by deploying your own projects; set a budget alarm before you create anything. Topics, in order: IAM and accounts → networking (VPC, subnets, security groups) → compute (EC2, Lambda, ECS Fargate) → storage (S3, DynamoDB, RDS) → messaging (SQS, SNS, EventBridge) → Docker → infrastructure as code (Terraform) → CI/CD → cost control → Well-Architected review.',
        items: [
          { title: 'AWS Cloud Practitioner course, CLF-C02 (freeCodeCamp)', url: 'https://www.youtube.com/watch?v=NhDYbskXRgc', kind: 'video', note: 'A full free course on AWS basics.', free: true },
          { title: 'Be a Better Dev', url: 'https://www.youtube.com/@BeABetterDev', kind: 'video', note: 'Practical AWS service walkthroughs.', free: true },
          { title: 'TechWorld with Nana', url: 'https://www.youtube.com/@TechWorldwithNana', kind: 'video', note: 'Docker, Kubernetes, CI/CD and DevOps.', free: true },
          { title: 'AWS Events', url: 'https://www.youtube.com/@AWSEventsChannel', kind: 'video', note: 're:Invent talks; search "deep dive" for any service.', free: true },
        ],
      },
      {
        title: 'Cloud: free courses and guides',
        items: [
          { title: 'AWS Skill Builder', url: 'https://skillbuilder.aws/', kind: 'course', note: 'Official training, with many free courses.', free: true },
          { title: 'AWS Workshops', url: 'https://catalog.workshops.aws/', kind: 'practice', note: 'Free hands-on labs.', free: true },
          { title: 'AWS Free Tier', url: 'https://aws.amazon.com/free/', kind: 'doc', note: 'What you can run at no cost.', free: true },
          { title: 'Docker: Get Started', url: 'https://docs.docker.com/get-started/', kind: 'doc', free: true },
          { title: 'Terraform: Get Started on AWS', url: 'https://developer.hashicorp.com/terraform/tutorials/aws-get-started', kind: 'doc', free: true },
          { title: 'The Cloud Resume Challenge', url: 'https://cloudresumechallenge.dev/', kind: 'practice', note: 'A well-known starter cloud project.', free: true },
        ],
      },
      {
        title: 'Cloud: articles',
        items: [
          { title: 'AWS Well-Architected Framework', url: 'https://aws.amazon.com/architecture/well-architected/', kind: 'article', note: 'Six pillars for judging any design.', free: true },
          { title: 'AWS caching best practices', url: 'https://aws.amazon.com/caching/best-practices/', kind: 'article', free: true },
        ],
      },
      {
        title: 'Go',
        intro: 'Go, databases, operations, security and testing are the everyday backend skills; each one has a short free resource and one book.',
        items: [
          { title: 'A Tour of Go', url: 'https://go.dev/tour/', kind: 'course', note: 'The official start.', free: true },
          { title: 'Effective Go', url: 'https://go.dev/doc/effective_go', kind: 'doc', note: 'The official start.', free: true },
          { title: 'Go by Example', url: 'https://gobyexample.com/', kind: 'doc', note: 'Short, runnable examples.', free: true },
          { title: 'Learn Go with Tests', url: 'https://quii.gitbook.io/learn-go-with-tests', kind: 'course', note: 'Learn Go and TDD together.', free: true },
          { title: 'Learning Go by Jon Bodner', kind: 'book' },
          { title: '100 Go Mistakes and How to Avoid Them by Teiva Harsanyi', kind: 'book' },
        ],
      },
      {
        title: 'Databases',
        items: [
          { title: 'PostgreSQL tutorial (official)', url: 'https://www.postgresql.org/docs/current/tutorial.html', kind: 'doc', free: true },
          { title: 'Use the Index, Luke', url: 'https://use-the-index-luke.com/', kind: 'book', note: 'SQL performance and indexes, free online book.', free: true },
          { title: 'Redis docs', url: 'https://redis.io/docs/latest/', kind: 'doc', free: true },
          { title: 'Kafka introduction', url: 'https://kafka.apache.org/intro', kind: 'doc', free: true },
        ],
      },
      {
        title: 'Operations and SRE',
        items: [
          { title: 'Google SRE book', url: 'https://sre.google/sre-book/table-of-contents/', kind: 'book', note: 'Free online.', free: true },
          { title: 'SRE Workbook', url: 'https://sre.google/workbook/table-of-contents/', kind: 'book', note: 'Free online.', free: true },
          { title: 'OpenTelemetry docs', url: 'https://opentelemetry.io/docs/', kind: 'doc', note: 'Standard for traces and metrics.', free: true },
          { title: 'k6 load testing docs', url: 'https://grafana.com/docs/k6/latest/', kind: 'doc', free: true },
        ],
      },
      {
        title: 'Security',
        items: [
          { title: 'OWASP Top 10', url: 'https://owasp.org/www-project-top-ten/', kind: 'doc', free: true },
          { title: 'OWASP Cheat Sheets', url: 'https://cheatsheetseries.owasp.org/', kind: 'doc', free: true },
          { title: 'PortSwigger Web Security Academy', url: 'https://portswigger.net/web-security', kind: 'practice', note: 'Free hands-on labs, the best free security course.', free: true },
        ],
      },
      {
        title: 'Code review and testing',
        items: [
          { title: 'Google\'s code review guide', url: 'https://google.github.io/eng-practices/review/', kind: 'doc', free: true },
          { title: 'The Practical Test Pyramid (Martin Fowler)', url: 'https://martinfowler.com/articles/practical-test-pyramid.html', kind: 'article', free: true },
          { title: 'Microservices (Martin Fowler)', url: 'https://martinfowler.com/articles/microservices.html', kind: 'article', note: 'When to split a system and when not to.', free: true },
        ],
      },
      {
        title: 'AI agents and AI features: YouTube',
        intro: 'Two skills: getting the most out of coding agents, and building LLM features into products. Topics: how LLMs work → prompt and context engineering → tool use and MCP → agent patterns (workflows vs agents) → RAG → evals → cost, latency and caching → safety and guardrails.',
        items: [
          { title: 'Intro to Large Language Models (Andrej Karpathy)', url: 'https://www.youtube.com/watch?v=zjkBMFhNj_g', kind: 'video', note: 'A 1-hour overview.', free: true },
          { title: 'Deep Dive into LLMs like ChatGPT (Andrej Karpathy)', url: 'https://www.youtube.com/watch?v=7xTGNNLPyMI', kind: 'video', note: 'How models are trained, in depth.', free: true },
        ],
      },
      {
        title: 'AI: free courses',
        items: [
          { title: 'Anthropic Academy', url: 'https://anthropic.skilljar.com/', kind: 'course', note: 'Free courses on the Claude API, MCP and Claude Code.', free: true },
          { title: 'Hugging Face Agents Course', url: 'https://huggingface.co/learn/agents-course', kind: 'course', free: true },
          { title: 'DeepLearning.AI short courses', url: 'https://www.deeplearning.ai/short-courses/', kind: 'course', note: '1–2 hour courses on RAG, agents and evals.', free: true },
        ],
      },
      {
        title: 'AI: articles and docs',
        items: [
          { title: 'Building effective agents (Anthropic)', url: 'https://www.anthropic.com/engineering/building-effective-agents', kind: 'article', free: true },
          { title: 'Effective context engineering for AI agents (Anthropic)', url: 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents', kind: 'article', free: true },
          { title: 'Claude Code best practices (Anthropic)', url: 'https://www.anthropic.com/engineering/claude-code-best-practices', kind: 'article', free: true },
          { title: 'Claude Code docs', url: 'https://code.claude.com/docs/en/overview', kind: 'doc', free: true },
          { title: 'Model Context Protocol', url: 'https://modelcontextprotocol.io/', kind: 'doc', free: true },
          { title: 'Prompt engineering guide (Claude docs)', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview', kind: 'doc', free: true },
          { title: 'Claude cookbooks', url: 'https://github.com/anthropics/claude-cookbooks', kind: 'doc', free: true },
          { title: 'Your AI product needs evals (Hamel Husain)', url: 'https://hamel.dev/blog/posts/evals/', kind: 'article', free: true },
          { title: 'Patterns for building LLM-based systems (Eugene Yan)', url: 'https://eugeneyan.com/writing/llm-patterns/', kind: 'article', free: true },
          { title: 'Chip Huyen\'s blog', url: 'https://huyenchip.com/blog/', kind: 'article', free: true },
        ],
      },
      {
        title: 'AI: book',
        items: [
          { title: 'AI Engineering by Chip Huyen', kind: 'book', note: 'The most complete book on building with foundation models.' },
        ],
      },
    ],
    checklists: [
      {
        title: 'Plan: 18 months',
        items: [
          'Q1 (Nov–Jan), main focus, system design and cloud foundations. Nov: Watch freeCodeCamp\'s System Design for Beginners and the first 10 ByteByteGo videos. Read the System Design Primer up to "Performance vs scalability". Draw your company\'s main product architecture on one page.',
          'Q1 Dec: Do freeCodeCamp\'s AWS Cloud Practitioner course. Create your AWS account with MFA and a budget alarm. Finish Docker\'s Get Started guide.',
          'Q1 Jan: Do the Go Tour and the first 8 chapters of Learn Go with Tests. Start project T1 (URL shortener on AWS).',
          'Q2 (Feb–Apr), light track, Go and databases. Feb–Mar: Finish T1. Read Use the Index, Luke and the official PostgreSQL tutorial.',
          'Q2 Apr: Read DDIA chapters 1–3.',
          'Q3 (May–Jul), main focus, highload backend. May: Learn replication and partitioning: DDIA chapters 5–6 and Hussein Nasser\'s database videos.',
          'Q3 Jun: Learn caching, queues and rate limiting (Redis, SQS/Kafka, Stripe\'s rate limiter post). Build project T2 (rate limiter).',
          'Q3 Jul: Learn consistency and distributed systems: DDIA chapters 7–9 and Kleppmann\'s lectures 1–4. Load-test T1 with k6 and fix the first bottleneck.',
          'Q4 (Aug–Oct), light track, Terraform and CI/CD: Do the Terraform Get Started tutorials. Rebuild T1 with Terraform and deploy it from a CI/CD pipeline.',
          'Q5 (Nov–Jan), light track, operations and security. Nov–Dec: Learn observability: OpenTelemetry and SRE book chapters 1–6. Add tracing and one alert to T1 (project T6).',
          'Q5 Jan: Learn the OWASP Top 10 and do 10 PortSwigger labs. Run a security review of T1.',
          'Q6 (Feb–Apr), main focus, AI engineering and capstone. Feb: Read Anthropic\'s agent and Claude Code guides. Build project T3 (your own MCP server).',
          'Q6 Mar: Learn evals, RAG and LLM cost and latency (Hamel Husain, Eugene Yan, one DeepLearning.AI short course).',
          'Q6 Apr: Build capstone T4 (ticket → agent → merge request pipeline on AWS). Do 2 mock system design interviews. T5 is optional, for later.',
        ],
      },
      {
        title: 'Backend topics, in order',
        items: [
          'Scalability basics: vertical vs horizontal scaling, stateless services, latency vs throughput',
          'Load balancing: L4 vs L7, round robin vs least connections, health checks, sticky sessions',
          'Caching: CDN, Redis, cache-aside vs write-through, invalidation, thundering herd',
          'Databases: SQL vs NoSQL, indexes, query plans, transactions and isolation levels',
          'Replication: leader-follower, multi-leader, read replicas, replication lag',
          'Partitioning and sharding: hash vs range keys, hot keys, rebalancing, consistent hashing',
          'Consistency: CAP and PACELC, strong vs eventual consistency, idempotency',
          'Queues and streams: SQS vs Kafka, at-least-once delivery, backpressure, dead-letter queues',
          'Rate limiting: token bucket, sliding window, per-user and global limits',
          'API design: REST vs gRPC, pagination, versioning, webhooks',
          'Resilience: timeouts, retries with backoff, circuit breakers, bulkheads',
          'Observability: logs, metrics, traces, SLOs and error budgets',
          'Performance: latency numbers, profiling, load testing, capacity planning',
          'Distributed systems: consensus (Raft), leader election, clocks, distributed transactions',
        ],
      },
    ],
    tips: [
      'Backend topic map: a request flows from the top down; data lives at the bottom, and observability covers every layer.',
      'Optional milestone: the AWS Solutions Architect Associate exam in month 6–9. The exam is paid; all preparation material above is free.',
      'Six practice projects, each building on the last; T1 grows all year and T4 is the capstone. Write a 1-page design doc before each one.',
    ],
  },

  product: {
    why: 'Deciding what to build, designing how it works for users, and knowing your domain. Product and UX is the main focus in Q2 (Feb–Apr); in the other quarters it runs as a light track of about 30 minutes a week.',
    outcomes: [
      'Write a spec and a prototype that a PM and designer would sign off',
    ],
    groups: [
      {
        title: 'Product sense and discovery: YouTube and podcasts',
        intro: 'Product sense means knowing which problem is worth solving and what "good" looks like for the user and the business. Topics: user problems vs feature requests → customer interviews → jobs to be done → prioritization (RICE, impact vs effort) → product metrics (North Star, funnels, retention) → experiments and A/B tests → writing PRDs → roadmaps.',
        items: [
          { title: 'Lenny\'s Podcast', url: 'https://www.youtube.com/@LennysPodcast', kind: 'podcast', note: 'Interviews with top product leaders.', free: true },
          { title: 'Product School', url: 'https://www.youtube.com/@ProductSchool', kind: 'video', note: 'Talks by PMs at big tech companies.', free: true },
        ],
      },
      {
        title: 'Product sense: free courses',
        items: [
          { title: 'Digital Product Management (UVA Darden, Coursera)', url: 'https://www.coursera.org/learn/uva-darden-digital-product-management', kind: 'course', note: 'Free to audit.', free: true },
          { title: 'Atlassian product management guide', url: 'https://www.atlassian.com/agile/product-management', kind: 'doc', free: true },
        ],
      },
      {
        title: 'Product sense: books',
        items: [
          { title: 'Inspired by Marty Cagan', kind: 'book', note: 'How strong product teams work.' },
          { title: 'Continuous Discovery Habits by Teresa Torres', kind: 'book', note: 'Weekly habits for talking to users.' },
          { title: 'The Mom Test by Rob Fitzpatrick', kind: 'book', note: 'How to ask users questions without getting lied to.' },
          { title: 'Hooked by Nir Eyal', kind: 'book', note: 'How habit-forming products work.' },
        ],
      },
      {
        title: 'Product sense: articles',
        items: [
          { title: 'How to develop product sense (Lenny\'s Newsletter)', url: 'https://www.lennysnewsletter.com/p/how-to-develop-product-sense', kind: 'article', free: true },
          { title: 'SVPG articles (Marty Cagan)', url: 'https://www.svpg.com/articles/', kind: 'article', free: true },
          { title: 'Product Talk blog (Teresa Torres)', url: 'https://www.producttalk.org/blog/', kind: 'article', free: true },
          { title: 'Reforge blog', url: 'https://www.reforge.com/blog', kind: 'article', note: 'Growth and product strategy.', free: true },
        ],
      },
      {
        title: 'From idea to measured feature: tools',
        intro: 'Tools to learn, all with free tiers.',
        items: [
          { title: 'PostHog', url: 'https://posthog.com/docs/experiments', kind: 'tool', note: 'Analytics, feature flags and experiments in one.', free: true },
          { title: 'GrowthBook', url: 'https://docs.growthbook.io/', kind: 'tool', note: 'Open-source A/B testing.', free: true },
          { title: 'Amplitude', kind: 'tool', free: true },
          { title: 'Mixpanel', kind: 'tool', free: true },
        ],
      },
      {
        title: 'Idea to feature: videos',
        items: [
          { title: 'How to Talk to Users (YC Startup School)', url: 'https://www.youtube.com/watch?v=z1iF1c8w5Lg', kind: 'video', free: true },
          { title: 'Eric Migicovsky: How to Talk to Users', url: 'https://www.youtube.com/watch?v=MT4Ig2uqjTc', kind: 'video', free: true },
        ],
      },
      {
        title: 'Idea to feature: free courses',
        items: [
          { title: 'A/B Testing by Google (Udacity)', url: 'https://www.udacity.com/course/ab-testing--ud257', kind: 'course', note: 'Free; the best intro to experiment design and statistics.', free: true },
        ],
      },
      {
        title: 'Idea to feature: articles and guides',
        items: [
          { title: 'The North Star Playbook (Amplitude)', url: 'https://amplitude.com/books/north-star', kind: 'book', note: 'Free book on choosing your key metric.', free: true },
          { title: 'How not to run an A/B test (Evan Miller)', url: 'https://www.evanmiller.org/how-not-to-run-an-ab-test.html', kind: 'article', free: true },
          { title: 'Evan Miller\'s sample size calculator', url: 'https://www.evanmiller.org/ab-testing/sample-size.html', kind: 'tool', free: true },
          { title: 'How to know if you\'ve got product-market fit (Lenny\'s Newsletter)', url: 'https://www.lennysnewsletter.com/p/how-to-know-if-youve-got-productmarket', kind: 'article', free: true },
          { title: 'The only thing that matters (Marc Andreessen)', url: 'https://pmarchive.com/guide_to_startups_part4.html', kind: 'article', note: 'The classic essay on product-market fit.', free: true },
          { title: 'PostHog for product engineers', url: 'https://posthog.com/product-engineers', kind: 'article', note: 'Product skills written for developers.', free: true },
          { title: 'Andrew Chen', url: 'https://andrewchen.com/', kind: 'article', note: 'Blog: growth.', free: true },
          { title: 'Statsig blog', url: 'https://www.statsig.com/blog', kind: 'article', note: 'Experiments and analytics.', free: true },
          { title: 'Mixpanel blog', url: 'https://mixpanel.com/blog/', kind: 'article', note: 'Experiments and analytics.', free: true },
        ],
      },
      {
        title: 'Idea to feature: books',
        items: [
          { title: 'Trustworthy Online Controlled Experiments by Kohavi, Tang and Xu', url: 'https://experimentguide.com/', kind: 'book', note: 'The A/B testing bible, from Microsoft, Google and LinkedIn experts.' },
          { title: 'Lean Analytics by Alistair Croll and Benjamin Yoskovitz', url: 'https://leananalyticsbook.com/', kind: 'book', note: 'Which metrics matter at each stage.' },
          { title: 'The Lean Product Playbook by Dan Olsen', kind: 'book', note: 'A step-by-step process to product-market fit.' },
        ],
      },
      {
        title: 'UI/UX design: YouTube',
        intro: 'As a frontend engineer you already build UI; the goal is to judge and design it, not only implement it. Topics: UX principles and heuristics → user research and usability testing → information architecture and user flows → wireframes and prototypes in Figma → visual design (layout, typography, color, spacing) → design systems → accessibility.',
        items: [
          { title: 'Figma', url: 'https://www.youtube.com/@Figma', kind: 'video', note: 'Official tutorials.', free: true },
          { title: 'DesignCourse', url: 'https://www.youtube.com/@DesignCourse', kind: 'video', note: 'UI design for developers.', free: true },
          { title: 'Flux Academy', url: 'https://www.youtube.com/@FluxAcademy', kind: 'video', note: 'Web design and UX.', free: true },
        ],
      },
      {
        title: 'UI/UX: free courses',
        items: [
          { title: 'Foundations of User Experience Design (Google, Coursera)', url: 'https://www.coursera.org/learn/foundations-user-experience-design', kind: 'course', note: 'Course 1 of the Google UX Design certificate, free to audit.', free: true },
          { title: 'Google UX Design certificate', url: 'https://www.coursera.org/professional-certificates/google-ux-design', kind: 'course', note: 'Free to audit.', free: true },
          { title: 'Introduction to User Experience Design (Georgia Tech, Coursera)', url: 'https://www.coursera.org/learn/user-experience-design', kind: 'course', note: 'Free to audit.', free: true },
          { title: 'Hack Design', url: 'https://hackdesign.org/', kind: 'course', note: 'Free design lessons.', free: true },
          { title: 'Figma Help Center', url: 'https://help.figma.com/hc/en-us', kind: 'doc', free: true },
        ],
      },
      {
        title: 'UI/UX: guides and articles',
        items: [
          { title: 'Laws of UX', url: 'https://lawsofux.com/', kind: 'article', note: 'The key psychology principles, one page each.', free: true },
          { title: 'Nielsen Norman Group articles', url: 'https://www.nngroup.com/articles/', kind: 'article', note: 'The reference for UX research.', free: true },
          { title: 'Material Design 3', url: 'https://m3.material.io/', kind: 'doc', note: 'A big design system to learn from.', free: true },
          { title: 'Apple Human Interface Guidelines', url: 'https://developer.apple.com/design/human-interface-guidelines', kind: 'doc', note: 'A big design system to learn from.', free: true },
        ],
      },
      {
        title: 'UI/UX: books',
        items: [
          { title: 'Don\'t Make Me Think by Steve Krug', kind: 'book', note: 'Usability, short and practical.' },
          { title: 'Refactoring UI by Adam Wathan and Steve Schoger', url: 'https://www.refactoringui.com/', kind: 'book', note: 'Visual design for developers (paid).', free: false },
          { title: 'The Design of Everyday Things by Don Norman', kind: 'book', note: 'The classic on design thinking.' },
        ],
      },
      {
        title: 'Adtech',
        intro: 'Deep domain knowledge plus building skill is rare. Topics: advertisers, publishers, SSPs, DSPs, ad exchanges → real-time bidding (OpenRTB) → header bidding (Prebid) → video ads (VAST, VPAID, outstream) → pricing (CPM, CPC, eCPM, fill rate) → privacy (cookies, consent, identity) → ad fraud.',
        items: [
          { title: 'The Ad Tech Book (Clearcode)', url: 'https://adtechbook.clearcode.cc/', kind: 'book', note: 'A free online book covering the whole industry.', free: true },
          { title: 'IAB Tech Lab: VAST', url: 'https://iabtechlab.com/standards/vast/', kind: 'doc', note: 'A core standard.', free: true },
          { title: 'IAB Tech Lab: OpenRTB', url: 'https://iabtechlab.com/standards/openrtb/', kind: 'doc', note: 'A core standard.', free: true },
          { title: 'Prebid docs', url: 'https://docs.prebid.org/', kind: 'doc', note: 'Header bidding in practice.', free: true },
          { title: 'AdExchanger', url: 'https://www.adexchanger.com/', kind: 'article', note: 'News.', free: true },
          { title: 'AdMonsters', url: 'https://www.admonsters.com/', kind: 'article', note: 'News.', free: true },
          { title: 'Digiday', url: 'https://digiday.com/', kind: 'article', note: 'News.', free: true },
        ],
      },
      {
        title: 'Writing specs and design docs',
        intro: 'Clear specs make you the person who defines the work instead of only doing it.',
        items: [
          { title: 'Google Technical Writing courses', url: 'https://developers.google.com/tech-writing', kind: 'course', note: 'Free, about 2 hours each.', free: true },
          { title: 'Design Docs at Google', url: 'https://www.industrialempathy.com/posts/design-docs-at-google/', kind: 'article', free: true },
          { title: 'Write Simply (Paul Graham)', url: 'https://paulgraham.com/simply.html', kind: 'article', free: true },
          { title: 'Shape Up (Basecamp)', url: 'https://basecamp.com/shapeup', kind: 'book', note: 'Free book on shaping work before building it.', free: true },
          { title: 'On Writing Well by William Zinsser', kind: 'book' },
        ],
      },
    ],
    checklists: [
      {
        title: 'Plan: 18 months',
        items: [
          'Q1 (Nov–Jan), light track, product basics: Read Lenny\'s post on developing product sense and 5 SVPG articles. For every ticket you get, write down who the user is and what problem it solves.',
          'Q2 (Feb–Apr), main focus, discovery and UX. Feb: Read Inspired and Continuous Discovery Habits. Interview 5 real users of your product (editors, publishers) and write down their top 3 problems.',
          'Q2 Mar: Audit the first course of Google\'s UX Design certificate. Read Don\'t Make Me Think and study Laws of UX. Learn Figma basics.',
          'Q2 Apr: Apply Refactoring UI principles. Redesign one confusing screen at work in Figma and test it with 3 people (project P2).',
          'Q3 (May–Jul), light track, metrics and A/B tests: Do the Udacity A/B Testing course and read the North Star Playbook. Do project P5.',
          'Q4 (Aug–Oct), light track, specs and usability: Do Google\'s Technical Writing One course. Write a PRD for a real feature (project P1) and run a usability test with 5 users on something you built.',
          'Q5 (Nov–Jan), light track, your own product\'s UX: Use everything above on the Chapter 4 launch: user interviews, landing page, onboarding and pricing page (project P3).',
          'Q6 (Feb–Apr), light track, adtech depth: Read The Ad Tech Book and the VAST and OpenRTB specs. Write the adtech explainer (project P4).',
        ],
      },
      {
        title: 'From idea to measured feature: the product loop',
        items: [
          'Start a product. Pick a painful problem for a specific group, not a feature idea. Talk to 10+ potential users before building. Define the one outcome that means it works, then build an MVP in weeks, not months.',
          'Find which features users need. Run interviews about past behavior ("tell me about the last time…"), not opinions. Use Jobs to Be Done to learn what users hire your product for. Mine support tickets, sales calls and churn reasons. Prioritize with RICE or impact vs effort.',
          'Track metrics for features. Pick a North Star metric plus 3–5 input metrics. Instrument events (feature_viewed, feature_used, task_completed). Watch adoption, activation funnels, retention cohorts and time to value. Define the success metric before you ship.',
          'Run A/B tests. Write a hypothesis ("Changing X will raise Y by Z% because…"). Calculate sample size first, randomize per user, and run for full weeks. Never stop early because results look good. Add guardrail metrics (errors, revenue, latency), then decide and record what you learned.',
          'Launch and learn. Ship behind feature flags, roll out gradually, compare cohorts, and write a short post-launch review: what you expected, what happened, what\'s next.',
        ],
      },
    ],
    tips: [
      'The product loop has five steps: find a real problem, build the smallest thing that tests it, measure what users do, experiment, and repeat.',
      'Four practice projects (plus P5) that each produce something you can show a PM, a designer or an interviewer.',
    ],
  },

  mgmt: {
    why: 'Delivering projects, leading a team, and influencing people with and without authority. Management and leadership is the main focus in Q4 (Aug–Oct); in the other quarters it runs as a light reading track plus small practice at work.',
    outcomes: [
      'Lead a project with 3+ people from idea to launch',
    ],
    groups: [
      {
        title: 'Project management: free courses and guides',
        intro: 'Project management means getting a defined result delivered on time with the people you have. Topics: scoping and non-goals → breaking work down → estimation and buffers → risks and dependencies → agile, Scrum and Kanban → status updates for stakeholders → launches and retros.',
        items: [
          { title: 'Foundations of Project Management (Google, Coursera)', url: 'https://www.coursera.org/learn/project-management-foundations', kind: 'course', note: 'Course 1 of the Google Project Management certificate, free to audit.', free: true },
          { title: 'Google Project Management certificate', url: 'https://www.coursera.org/professional-certificates/google-project-management', kind: 'course', note: 'Free to audit.', free: true },
          { title: 'Atlassian Agile Coach', url: 'https://www.atlassian.com/agile', kind: 'doc', note: 'Agile, Scrum and Kanban explained.', free: true },
          { title: 'Atlassian Team Playbook', url: 'https://www.atlassian.com/team-playbook', kind: 'practice', note: 'Ready-to-run workshops (retros, kickoffs, roles).', free: true },
          { title: 'The Scrum Guide', url: 'https://scrumguides.org/scrum-guide.html', kind: 'doc', note: 'The official 14-page definition.', free: true },
          { title: 'Shape Up (Basecamp)', url: 'https://basecamp.com/shapeup', kind: 'book', note: 'A free book on an alternative to Scrum, good for small teams.', free: true },
        ],
      },
      {
        title: 'Project management: books',
        items: [
          { title: 'Making Things Happen by Scott Berkun', kind: 'book', note: 'Project management for software teams.' },
          { title: 'The Phoenix Project by Gene Kim', kind: 'book', note: 'A novel about how IT work flows, or doesn\'t.' },
          { title: 'Team Topologies by Matthew Skelton and Manuel Pais', kind: 'book', note: 'How to organize teams around systems.' },
        ],
      },
      {
        title: 'Team management: YouTube',
        intro: 'Team management means getting results through other people: helping them grow, giving honest feedback, and building trust. Topics: 1:1s → feedback (praise and criticism) → delegation → motivation → hiring and interviewing → performance and career growth → handling conflict → team health and psychological safety.',
        items: [
          { title: 'Manager Tools', url: 'https://www.youtube.com/@ManagerTools', kind: 'video', note: 'Practical management basics (1:1s, feedback, delegation).', free: true },
          { title: 'Harvard Business Review', url: 'https://www.youtube.com/@HarvardBusinessReview', kind: 'video', note: 'Short videos on management topics.', free: true },
        ],
      },
      {
        title: 'Team management: free courses and guides',
        items: [
          { title: 'Inspiring and Motivating Individuals (University of Michigan, Coursera)', url: 'https://www.coursera.org/learn/motivate-people-teams', kind: 'course', note: 'Free to audit.', free: true },
          { title: 'Google re:Work', url: 'https://rework.withgoogle.com/', kind: 'doc', note: 'Google\'s research-backed guides on managers and teams.', free: true },
          { title: 'Engineering management resources (charlax)', url: 'https://github.com/charlax/engineering-management', kind: 'doc', note: 'A huge curated list.', free: true },
        ],
      },
      {
        title: 'Team management: blogs',
        items: [
          { title: 'Lara Hogan', url: 'https://larahogan.me/blog/', kind: 'article', note: 'Engineering management, feedback, team building.', free: true },
          { title: 'Rands in Repose', url: 'https://randsinrepose.com/', kind: 'article', note: 'Stories and lessons from a long-time engineering leader.', free: true },
          { title: 'Irrational Exuberance (Will Larson)', url: 'https://lethain.com/', kind: 'article', note: 'The tech lead and staff path.', free: true },
          { title: 'StaffEng guides', url: 'https://staffeng.com/guides/', kind: 'article', note: 'The tech lead and staff path.', free: true },
          { title: 'Radical Candor', url: 'https://www.radicalcandor.com/', kind: 'podcast', note: 'Podcast and articles on feedback.', free: true },
        ],
      },
      {
        title: 'Team management: books',
        items: [
          { title: 'The Manager\'s Path by Camille Fournier', kind: 'book', note: 'From tech lead to CTO, step by step.' },
          { title: 'High Output Management by Andy Grove', kind: 'book', note: 'The classic management book.' },
          { title: 'Radical Candor by Kim Scott', kind: 'book', note: 'Caring personally while challenging directly.' },
          { title: 'The Five Dysfunctions of a Team by Patrick Lencioni', kind: 'book', note: 'A short story about team trust.' },
          { title: 'An Elegant Puzzle by Will Larson', kind: 'book', note: 'Systems thinking for engineering managers.' },
        ],
      },
      {
        title: 'Leadership and influence: videos',
        intro: 'Leadership is getting people to follow a direction because they want to, often with no formal authority over them. Topics: credibility and trust → vision ("start with why") → persuasion principles (reciprocity, social proof, authority, consistency) → leading without authority → negotiation → making decisions and owning outcomes → handling resistance and politics.',
        items: [
          { title: 'How great leaders inspire action (Simon Sinek, TED)', url: 'https://www.ted.com/talks/simon_sinek_how_great_leaders_inspire_action', kind: 'video', free: true },
        ],
      },
      {
        title: 'Leadership: free courses',
        items: [
          { title: 'Influencing People (University of Michigan, Coursera)', url: 'https://www.coursera.org/learn/influencing-people', kind: 'course', note: 'Free to audit.', free: true },
          { title: 'Successful Negotiation (University of Michigan, Coursera)', url: 'https://www.coursera.org/learn/negotiation-skills', kind: 'course', note: 'Free to audit.', free: true },
        ],
      },
      {
        title: 'Leadership: books',
        items: [
          { title: 'How to Win Friends and Influence People by Dale Carnegie', kind: 'book', note: 'The classic on getting along with people.' },
          { title: 'Influence: The Psychology of Persuasion by Robert Cialdini', kind: 'book', note: 'The 7 principles of persuasion.' },
          { title: 'Never Split the Difference by Chris Voss', kind: 'book', note: 'Negotiation from an FBI hostage negotiator.' },
          { title: 'Extreme Ownership by Jocko Willink and Leif Babin', kind: 'book', note: 'Owning results as a leader.' },
          { title: 'Turn the Ship Around! by L. David Marquet', kind: 'book', note: 'Leading by giving control away.' },
          { title: 'Start with Why by Simon Sinek', kind: 'book', note: 'How a clear purpose makes people follow.' },
          { title: 'The Staff Engineer\'s Path by Tanya Reilly', kind: 'book', note: 'Technical leadership without managing people.' },
        ],
      },
    ],
    checklists: [
      {
        title: 'Plan: 18 months',
        items: [
          'Q1 (Nov–Jan), light track, read and observe: Read How to Win Friends and Influence People. Each week, notice one meeting: who leads it, and how they get agreement.',
          'Q2 (Feb–Apr), light track, run team rituals: Read The Manager\'s Path (the tech lead chapters first). Run your team\'s next retro, planning or demo (project M4).',
          'Q3 (May–Jul), light track, plan big work: Read Shape Up and the Scrum Guide. Break your next big task into a plan with milestones and share it before starting.',
          'Q4 (Aug–Oct), main focus. Aug: Project management. Audit Google\'s Project Management Foundations course. Lead one feature end to end as project M1: scope, estimate, plan, weekly status, launch.',
          'Q4 Sep: Team management. Read Radical Candor and High Output Management. Start mentoring a junior or new teammate weekly (project M2).',
          'Q4 Oct: Influence. Read Influence by Cialdini and audit Coursera\'s Influencing People course.',
          'Q5 (Nov–Jan), light track, influence in practice: Drive one cross-team decision with an RFC (project M3). Keep mentoring.',
          'Q6 (Feb–Apr), light track, step up: Read The Staff Engineer\'s Path or An Elegant Puzzle. Talk to your manager about a tech lead path and agree on 2 concrete steps.',
        ],
      },
    ],
    tips: [
      'You learn management and leadership only by doing them; the four practice projects fit inside a normal developer job.',
    ],
  },

  biz: {
    why: 'How companies make money and decisions, and how to start and run your own business, online or offline. Business is the main focus in Q5 (Nov–Jan), when you launch a small paid product; before that it runs as a light track of reading and studying your own company.',
    outcomes: [
      'Read a P&L',
      'Explain your company\'s business model',
      'Launch one small paid product',
    ],
    groups: [
      {
        title: 'How companies work: YouTube',
        intro: 'Knowing how your company makes money and decisions tells you which work matters and how to get your ideas funded.',
        items: [
          { title: 'Modern MBA', url: 'https://www.youtube.com/@ModernMBA', kind: 'video', note: 'How big tech companies make money, explained simply.', free: true },
          { title: 'Business Casual', url: 'https://www.youtube.com/@BusinessCasual', kind: 'video', note: 'Company stories and business models.', free: true },
          { title: 'Aswath Damodaran', url: 'https://www.youtube.com/@AswathDamodaranonValuation', kind: 'video', note: 'Free NYU finance and valuation classes.', free: true },
          { title: 'Acquired podcast', url: 'https://www.acquired.fm/', kind: 'podcast', note: 'Long histories of how great companies were built.', free: true },
        ],
      },
      {
        title: 'How companies work: free courses and guides',
        items: [
          { title: 'Wharton Business Foundations (Coursera)', url: 'https://www.coursera.org/specializations/wharton-business-foundations', kind: 'course', note: 'Marketing, accounting, finance and operations, free to audit.', free: true },
          { title: 'Khan Academy: Economics and Finance', url: 'https://www.khanacademy.org/economics-finance-domain', kind: 'course', free: true },
          { title: 'AccountingCoach', url: 'https://www.accountingcoach.com/', kind: 'course', note: 'Free accounting lessons, with financial statements explained.', free: true },
          { title: 'Corporate Finance Institute', url: 'https://corporatefinanceinstitute.com/', kind: 'course', note: 'Free intro finance courses and guides.', free: true },
          { title: 'Business Model Canvas (Strategyzer)', url: 'https://www.strategyzer.com/library/the-business-model-canvas', kind: 'tool', free: true },
          { title: 'Stratechery', url: 'https://stratechery.com/', kind: 'article', note: 'Tech strategy (free weekly articles).', free: true },
        ],
      },
      {
        title: 'How companies work: books',
        items: [
          { title: 'The Personal MBA by Josh Kaufman', kind: 'book', note: 'A whole business education in one book.' },
          { title: 'Good Strategy Bad Strategy by Richard Rumelt', kind: 'book', note: 'What real strategy is.' },
          { title: '7 Powers by Hamilton Helmer', kind: 'book', note: 'The 7 sources of lasting advantage.' },
          { title: 'Measure What Matters by John Doerr', kind: 'book', note: 'OKRs.' },
          { title: 'The Goal by Eliyahu Goldratt', kind: 'book', note: 'A novel about bottlenecks in any organization.' },
        ],
      },
      {
        title: 'Tech startups: YouTube',
        intro: 'A startup is a company built to grow fast; the core skill is finding a problem people will pay to solve before you run out of time or money. Topics: finding ideas → validating with users → MVP → product-market fit → pricing → first customers and sales → growth channels → co-founders and equity → bootstrapping vs fundraising.',
        items: [
          { title: 'Y Combinator', url: 'https://www.youtube.com/@ycombinator', kind: 'video', note: 'Startup School lectures and founder talks.', free: true },
          { title: 'How to Start a Startup, Lecture 1 (Sam Altman, Dustin Moskovitz)', url: 'https://www.youtube.com/watch?v=CBYhVcO4WgI', kind: 'video', note: 'The Stanford course, free.', free: true },
          { title: 'How to Start a Startup, Lecture 3: Before the Startup (Paul Graham)', url: 'https://www.youtube.com/watch?v=ii1jcLg-eIQ', kind: 'video', note: 'The Stanford course, free.', free: true },
          { title: 'Greg Isenberg', url: 'https://www.youtube.com/@GregIsenberg', kind: 'video', note: 'Small internet business ideas and how to validate them.', free: true },
          { title: 'My First Million', url: 'https://www.youtube.com/@MyFirstMillionPod', kind: 'podcast', note: 'Business ideas and how people made money with them.', free: true },
          { title: 'The single biggest reason why start-ups succeed (Bill Gross, TED)', url: 'https://www.youtube.com/watch?v=bNpx7gpSqbY', kind: 'video', free: true },
        ],
      },
      {
        title: 'Tech startups: free courses and guides',
        items: [
          { title: 'YC Startup School', url: 'https://www.startupschool.org/', kind: 'course', free: true },
          { title: 'YC Startup Library', url: 'https://www.ycombinator.com/library', kind: 'article', free: true },
          { title: 'MIT 15.390 New Enterprises (MIT OpenCourseWare)', url: 'https://ocw.mit.edu/courses/15-390-new-enterprises-spring-2013/', kind: 'course', free: true },
          { title: 'Indie Hackers', url: 'https://www.indiehackers.com/', kind: 'article', note: 'Founders sharing revenue numbers and lessons.', free: true },
          { title: 'levels.io', url: 'https://levels.io/', kind: 'article', note: 'A solo founder who builds and runs profitable products alone.', free: true },
        ],
      },
      {
        title: 'Tech startups: essays',
        items: [
          { title: 'How to Get Startup Ideas (Paul Graham)', url: 'https://paulgraham.com/startupideas.html', kind: 'article', free: true },
          { title: 'Do Things That Don\'t Scale (Paul Graham)', url: 'https://paulgraham.com/ds.html', kind: 'article', free: true },
          { title: 'Startup = Growth (Paul Graham)', url: 'https://paulgraham.com/growth.html', kind: 'article', free: true },
        ],
      },
      {
        title: 'Tech startups: books',
        items: [
          { title: 'The Mom Test by Rob Fitzpatrick', url: 'https://www.momtestbook.com/', kind: 'book', note: 'How to validate ideas by talking to people.' },
          { title: 'The Lean Startup by Eric Ries', kind: 'book', note: 'Build, measure, learn.' },
          { title: 'Zero to One by Peter Thiel', kind: 'book', note: 'Building something new instead of copying.' },
          { title: 'Traction by Gabriel Weinberg and Justin Mares', kind: 'book', note: '19 channels for getting customers.' },
          { title: '$100M Offers by Alex Hormozi', kind: 'book', note: 'How to make an offer people can\'t refuse.' },
          { title: 'The Hard Thing About Hard Things by Ben Horowitz', kind: 'book', note: 'What running a startup is really like.' },
        ],
      },
      {
        title: 'Small, medium and offline businesses: YouTube',
        intro: 'Most businesses are not startups: they are shops, agencies, services and local companies that aim to be profitable, not to grow 10×. The skills overlap, but the focus is on cash flow, operations and people. Topics: choosing a business (service, product, local, online) → legal setup and taxes in your country → pricing and margins → cash flow and profit → marketing and sales for small business → hiring the first employees → systems and processes so it runs without you → buying an existing business → growing from small to medium.',
        items: [
          { title: 'Alex Hormozi', url: 'https://www.youtube.com/@AlexHormozi', kind: 'video', note: 'Offers, sales and scaling service businesses.', free: true },
          { title: 'Codie Sanchez', url: 'https://www.youtube.com/@CodieSanchezCT', kind: 'video', note: 'Buying and running "boring" offline businesses (laundromats, car washes, local services).', free: true },
          { title: 'The Diary of a CEO', url: 'https://www.youtube.com/@TheDiaryOfACEO', kind: 'podcast', note: 'Long interviews with founders of all sizes.', free: true },
        ],
      },
      {
        title: 'Small business: free guides',
        items: [
          { title: 'US SBA business guide', url: 'https://www.sba.gov/business-guide', kind: 'doc', note: 'A step-by-step plan, launch and manage guide. US-specific in places, but the steps apply anywhere.', free: true },
          { title: 'SCORE', url: 'https://www.score.org/', kind: 'other', note: 'Free mentoring and templates for small businesses (US).', free: true },
          { title: 'Shopify blog', url: 'https://www.shopify.com/blog', kind: 'article', note: 'E-commerce and retail basics.', free: true },
        ],
      },
      {
        title: 'Small business: books',
        items: [
          { title: 'The E-Myth Revisited by Michael Gerber', kind: 'book', note: 'Why most small businesses fail, and how to build systems.' },
          { title: 'Profit First by Mike Michalowicz', kind: 'book', note: 'Simple cash management for small businesses.' },
          { title: 'Built to Sell by John Warrillow', kind: 'book', note: 'Building a business that runs without you.' },
          { title: 'Company of One by Paul Jarvis', kind: 'book', note: 'Staying small on purpose.' },
          { title: 'Buy Then Build by Walker Deibel', kind: 'book', note: 'Buying an existing business instead of starting from zero.' },
          { title: 'Traction by Gino Wickman', kind: 'book', note: 'The EOS system for running a small or medium company.' },
          { title: 'Scaling Up by Verne Harnish', kind: 'book', note: 'Growing from small to medium.' },
          { title: 'Rework by Jason Fried and David Heinemeier Hansson', kind: 'book', note: 'Running a calm, profitable company.' },
        ],
      },
    ],
    checklists: [
      {
        title: 'Plan: 18 months',
        items: [
          'Q1 (Nov–Jan), light track, company basics: Read The Personal MBA. Draw your company\'s org chart and write one line per department on how it makes or saves money.',
          'Q2 (Feb–Apr), light track, read finances: Learn to read financial statements (AccountingCoach, Khan Academy). Explain the P&L of one public adtech company from its annual report.',
          'Q3 (May–Jul), light track, strategy: Read Good Strategy Bad Strategy. Fill in a Business Model Canvas for your company (project B1). Interview a local business owner (project B4).',
          'Q4 (Aug–Oct), light track, startup ideas: Watch the first 6 lectures of How to Start a Startup and read The Mom Test and The Lean Startup. Keep an idea list and interview 10 people about the top 2 ideas.',
          'Q5 (Nov–Jan), main focus, launch something small. Nov: Pick one idea, build a landing page, and get 50 waitlist sign-ups or 5 pre-orders (project B2).',
          'Q5 Dec: Build the MVP in 4 weekends and charge from day one.',
          'Q5 Jan: Launch publicly (project B3).',
          'Q6 (Feb–Apr), light track, first customers: Get your first 10 paying customers, then write a public post about what you learned. Read The E-Myth Revisited and Profit First for running a business long term.',
        ],
      },
      {
        title: 'How companies and organizations work: topics',
        items: [
          'Business models: who pays, for what, and why (subscriptions, ads, marketplaces, services)',
          'Org structure: what engineering, product, sales, marketing, finance, HR and ops each do, and how they depend on each other',
          'Money basics: revenue, costs, gross margin, profit, cash flow; reading a P&L, balance sheet and cash flow statement',
          'Unit economics: CAC, LTV, payback period, churn',
          'Strategy: competitive advantage (moats), positioning, why some companies win',
          'Goals and decisions: OKRs, budgets, headcount planning, who decides what',
          'Careers inside companies: levels, promotions, performance reviews, how your work becomes visible',
        ],
      },
    ],
    tips: [
      'Four practice projects take you from understanding a business to running a tiny one yourself.',
    ],
  },

  eng: {
    why: 'Fluent English for team, technical and business talk, and the skill of communicating with people in any language. English runs every day for all 18 months, 20 minutes a day; speaking practice matters more than extra input.',
    outcomes: [
      'Lead a meeting and give a 10-minute talk in English with confidence',
    ],
    groups: [
      {
        title: 'Pronunciation resources',
        intro: 'Aim for clear, easy-to-understand English, not zero accent. Many top engineers have an accent; what matters is fixing the sounds and rhythm that cause misunderstandings.',
        items: [
          { title: 'Rachel\'s English', url: 'https://www.youtube.com/@RachelsEnglish', kind: 'video', note: 'The best channel for American sounds, rhythm and shadowing.', free: true },
          { title: 'Pronunciation with Emma', url: 'https://www.youtube.com/@pronunciationwithemma', kind: 'video', note: 'Clear lessons on single sounds.', free: true },
          { title: 'English with Jennifer', url: 'https://www.youtube.com/@EnglishwithJennifer', kind: 'video', note: 'Pronunciation and grammar from a careful teacher.', free: true },
          { title: 'BBC Learning English: pronunciation series', url: 'https://www.bbc.co.uk/learningenglish/english/features/pronunciation', kind: 'video', note: 'British English, short videos.', free: true },
          { title: 'Sounds American', url: 'https://www.soundsamerican.net/', kind: 'course', note: 'An American pronunciation course with free materials.', free: true },
          { title: 'YouGlish', url: 'https://youglish.com/', kind: 'tool', note: 'Hear any word said by real people in YouTube videos.', free: true },
          { title: 'Cambridge Dictionary', url: 'https://dictionary.cambridge.org/', kind: 'tool', note: 'Audio and stress marks for every word.', free: true },
          { title: 'ELSA Speak', url: 'https://elsaspeak.com/en/', kind: 'tool', note: 'An AI app that scores your pronunciation (free tier).', free: true },
          { title: 'English Pronunciation in Use (Cambridge)', kind: 'book' },
          { title: 'American Accent Training by Ann Cook', kind: 'book' },
          { title: 'Ship or Sheep? by Ann Baker', kind: 'book' },
        ],
      },
      {
        title: 'Daily communication: channels and podcasts',
        items: [
          { title: 'BBC Learning English', url: 'https://www.youtube.com/@bbclearningenglish', kind: 'video', note: 'Short daily lessons.', free: true },
          { title: '6 Minute English', url: 'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english', kind: 'podcast', note: 'Short daily lessons.', free: true },
          { title: 'English with Lucy', url: 'https://www.youtube.com/@EnglishwithLucy', kind: 'video', note: 'Natural, everyday spoken English.', free: true },
          { title: 'Speak English with Vanessa', url: 'https://www.youtube.com/@SpeakEnglishWithVanessa', kind: 'video', note: 'Natural, everyday spoken English.', free: true },
          { title: 'engVid', url: 'https://www.engvid.com/', kind: 'video', note: 'Thousands of free lessons on every topic.', free: true },
          { title: 'All Ears English', url: 'https://www.allearsenglish.com/', kind: 'podcast', note: 'A podcast on real conversation and connection.', free: true },
          { title: 'italki', url: 'https://www.italki.com/', kind: 'practice', note: 'Practice partners: paid tutors, from about $10 an hour.', free: false },
          { title: 'Tandem', url: 'https://www.tandem.net/', kind: 'practice', note: 'Practice partners: free language exchange.', free: true },
        ],
      },
      {
        title: 'Technical and business English: YouTube and podcasts',
        intro: 'Work English is a small set of situations: stand-ups, meetings, emails, demos, negotiations. Practice the phrases for each one until they come out automatically.',
        items: [
          { title: 'Business English Pod', url: 'https://www.youtube.com/@BusinessEnglishPod', kind: 'podcast', note: 'Lessons on meetings, negotiations, presentations and calls.', free: true },
          { title: 'Business English Pod (site)', url: 'https://www.businessenglishpod.com/', kind: 'podcast', free: true },
          { title: 'Software Engineering Daily', url: 'https://softwareengineeringdaily.com/', kind: 'podcast', note: 'Real tech and product English at native speed.', free: true },
          { title: 'Lenny\'s Podcast', url: 'https://www.youtube.com/@LennysPodcast', kind: 'podcast', note: 'Real tech and product English at native speed.', free: true },
        ],
      },
      {
        title: 'Business English: free courses',
        items: [
          { title: 'Business English Communication Skills (University of Washington, Coursera)', url: 'https://www.coursera.org/specializations/business-english', kind: 'course', note: 'Free to audit.', free: true },
          { title: 'Business English: Basics (Coursera)', url: 'https://www.coursera.org/learn/business-english-intro', kind: 'course', note: 'Free to audit.', free: true },
          { title: 'Speak English Professionally (Coursera)', url: 'https://www.coursera.org/learn/speak-english-professionally', kind: 'course', note: 'Free to audit.', free: true },
          { title: 'English for Career Development (UPenn, Coursera)', url: 'https://www.coursera.org/learn/careerdevelopment', kind: 'course', note: 'Free to audit.', free: true },
          { title: 'Google Technical Writing courses', url: 'https://developers.google.com/tech-writing', kind: 'course', note: 'Clear technical English.', free: true },
        ],
      },
      {
        title: 'Business English: tools',
        items: [
          { title: 'Hemingway Editor', url: 'https://hemingwayapp.com/', kind: 'tool', note: 'Makes your writing shorter and clearer.' },
          { title: 'Claude', kind: 'tool', note: 'Paste your email or message and ask "make this sound natural and polite for a native speaker, and explain the changes".' },
        ],
      },
      {
        title: 'Business English: books',
        items: [
          { title: 'Business Vocabulary in Use (Cambridge University Press)', kind: 'book' },
          { title: 'Email English by Paul Emmerson', kind: 'book' },
        ],
      },
      {
        title: 'Communicating with people: videos',
        intro: 'These skills work in any language: listening, building rapport, handling hard conversations and speaking in front of others. Topics: active listening → small talk and rapport → asking good questions → giving and receiving feedback → difficult conversations and conflict → explaining technical things to non-technical people → storytelling → public speaking and presentations → body language and voice.',
        items: [
          { title: 'How to Speak (Patrick Winston, MIT)', url: 'https://www.youtube.com/watch?v=Unzc731iCUY', kind: 'video', note: 'The best free lecture on presenting.', free: true },
          { title: 'How to speak so that people want to listen (Julian Treasure, TED)', url: 'https://www.ted.com/talks/julian_treasure_how_to_speak_so_that_people_want_to_listen', kind: 'video', free: true },
          { title: '10 ways to have a better conversation (Celeste Headlee, TED)', url: 'https://www.ted.com/talks/celeste_headlee_10_ways_to_have_a_better_conversation', kind: 'video', free: true },
          { title: 'TED\'s secret to great public speaking (Chris Anderson, TED)', url: 'https://www.ted.com/talks/chris_anderson_ted_s_secret_to_great_public_speaking', kind: 'video', free: true },
          { title: 'Charisma on Command', url: 'https://www.youtube.com/@CharismaOnCommand', kind: 'video', note: 'Confidence and social skills, explained through examples.', free: true },
        ],
      },
      {
        title: 'Communicating with people: free courses',
        items: [
          { title: 'Introduction to Public Speaking (University of Washington, Coursera)', url: 'https://www.coursera.org/learn/public-speaking', kind: 'course', note: 'Free to audit.', free: true },
          { title: 'Improving Communication Skills (Wharton, Coursera)', url: 'https://www.coursera.org/learn/wharton-communication-skills', kind: 'course', note: 'Free to audit.', free: true },
          { title: 'Toastmasters', url: 'https://www.toastmasters.org/', kind: 'practice', note: 'Local clubs for practicing public speaking, cheap and often in English.' },
        ],
      },
      {
        title: 'Communicating with people: books',
        items: [
          { title: 'Crucial Conversations by Patterson, Grenny, McMillan and Switzler', kind: 'book', note: 'Talking when stakes are high and emotions run strong.' },
          { title: 'Never Split the Difference by Chris Voss', kind: 'book', note: 'Listening and negotiation.' },
          { title: 'Nonviolent Communication by Marshall Rosenberg', kind: 'book', note: 'Expressing needs without blame.' },
          { title: 'Talk Like TED by Carmine Gallo', kind: 'book', note: 'Presentation techniques from the best TED talks.' },
          { title: 'Made to Stick by Chip and Dan Heath', kind: 'book', note: 'Why some ideas are remembered and others forgotten.' },
          { title: 'How to Win Friends and Influence People by Dale Carnegie', kind: 'book', note: 'The classic on rapport.' },
        ],
      },
    ],
    checklists: [
      {
        title: 'Daily 20-minute routine',
        items: [
          '7 min, Listen: one podcast or video in English at 1× speed: tech, business or BBC 6 Minute English',
          '7 min, Shadow: pick 1 minute of it and repeat each sentence aloud right after the speaker, copying rhythm and intonation',
          '6 min, Speak or write: explain your workday aloud and record it, or write 5 sentences, then check them (Claude can correct them)',
        ],
      },
      {
        title: 'Quarterly focus',
        items: [
          'Q1 (Nov–Jan): sounds and vowels. Rows 2–7 of the Slavic-speaker checklist below, one sound a week. Record yourself on day 1 (project E1).',
          'Q2 (Feb–Apr): stress and intonation. Rows 1 and 8–12 of the checklist. Shadow Rachel\'s English daily.',
          'Q3 (May–Jul): fluent daily speaking. Two 30-minute conversations a week with a tutor or language partner (italki, Tandem). Start 100 days of speaking (project E2).',
          'Q4 (Aug–Oct): business English. Audit a Coursera business English course. Make the work phrases below automatic.',
          'Q5 (Nov–Jan): meetings in English. Lead one meeting a week in English, or rehearse it aloud. Join a Toastmasters club.',
          'Q6 (Feb–Apr): presenting. Give a 10-minute talk in English (project E3). Re-record your day 1 text and compare.',
        ],
      },
      {
        title: 'Notes for Slavic speakers: 12 accent issues',
        items: [
          'Word stress. Habit: stress on the wrong syllable makes known words unrecognizable. Fix: learn stress with every new word; check it on YouGlish or Cambridge Dictionary. Practice: DEvelop→deVElop, COMfortable, deTERmine, ANalysis',
          'Short vs long vowels. Habit: no difference in length. Fix: long vowels are longer and tenser; short ones are relaxed. Practice: ship / sheep, full / fool, live / leave',
          '/æ/ as in "cat". Habit: said like "e". Fix: open the jaw wide, lips spread. Practice: bad / bed, man / men, sat / set',
          'th /θ/ and /ð/. Habit: replaced with s, z, t, d or f. Fix: tip of the tongue between the teeth, push air out. Practice: think / sink, three / tree, they / day',
          'w vs v. Habit: "wery" for very, "vork" for work. Fix: w = round lips, teeth don\'t touch; v = top teeth on bottom lip. Practice: west / vest, wine / vine, while / vile',
          'Unstressed vowels (schwa). Habit: every vowel pronounced fully. Fix: reduce unstressed vowels to a quick "uh"; learn weak forms. Practice: bəNANə, "to" as tə, "can" as kən',
          'Final voiced consonants. Habit: devoiced at the end of words. Fix: keep the voice on and make the vowel before it longer. Practice: bad / bat, dog / dock, eyes / ice',
          'h. Habit: harsh "kh" (like Russian х) or voiced like Ukrainian г. Fix: English h is just a breath, like fogging a mirror. Practice: hot, house, how',
          'r. Habit: rolled or tapped with the tongue tip. Fix: tongue doesn\'t touch anything; curl it back slightly. Practice: right, very, world',
          'p, t, k. Habit: said without a puff of air, so they sound like b, d, g. Fix: add a puff of air at the start of stressed syllables. Practice: pin / bin, time / dime, cold / gold',
          '-ng /ŋ/. Habit: "sing-g" or "sin". Fix: end in the nose; no g sound after. Practice: sing, thing, working',
          'Intonation. Habit: flat or always falling, which can sound bored or rude. Fix: stress key words; raise and lower pitch more; polite questions rise. Practice: "Could you HELP me with THIS?"',
        ],
      },
      {
        title: 'Phrases to make automatic',
        items: [
          'Stand-up: "Yesterday I wrapped up…", "Today I\'m focusing on…", "I\'m blocked on…, could someone help with…?"',
          'Disagreeing politely: "I see your point, but I\'m worried that…", "Have we considered…?", "Could we look at it from another angle?"',
          'Asking for clarity: "Just to make sure I understand, you mean…?", "Could you walk me through…?"',
          'Buying time: "Good question, let me think for a second.", "Let me get back to you on that by Friday."',
          'Pushing back on scope: "We can do X by Friday, or X and Y by next Wednesday. Which matters more?"',
          'Emails: "Quick update on…", "Action needed:…", "Let me know if you have any questions."',
          'Presenting: "The key takeaway is…", "Let me show you…", "To sum up…"',
        ],
      },
    ],
    tips: [
      'Switch your phone, IDE and Claude Code to English, and write commit messages, tickets and Slack messages in English where your team allows it.',
      'The 12 Slavic accent issues: fix them roughly in order; the first five matter most for being understood.',
      'Four practice projects make your progress visible, mostly through recordings you can compare over time.',
    ],
  },

  money: {
    why: 'How to earn more, keep more, and make your money work, plus how money and the economy work. Money runs as a light track for all 18 months: about 30 minutes a week plus a monthly check-in. Set up the system once, then let it run automatically.',
    outcomes: [
      '6-month emergency fund',
      'Automatic monthly investing',
      'One negotiated raise',
      'First side income',
    ],
    groups: [
      {
        title: 'Earning more: articles',
        intro: 'Your salary is usually your biggest lever: a 20% raise often beats years of careful saving. Pay follows value you can prove, market rate, and your willingness to negotiate or move. Topics: how companies set pay (levels, bands, market data) → knowing your market rate → documenting your impact → negotiating offers and raises → when to switch jobs → remote work for foreign companies → contractor vs employee (taxes, benefits, risk).',
        items: [
          { title: 'Salary Negotiation: Make More Money, Be More Valued (patio11)', url: 'https://www.kalzumeus.com/2012/01/23/salary-negotiation/', kind: 'article', note: 'The classic guide for engineers.', free: true },
          { title: 'Ten Rules for Negotiating a Job Offer (Haseeb Qureshi)', url: 'https://haseebq.com/my-ten-rules-for-negotiating-a-job-offer/', kind: 'article', free: true },
          { title: 'Don\'t Call Yourself A Programmer (patio11)', url: 'https://www.kalzumeus.com/2011/10/28/dont-call-yourself-a-programmer/', kind: 'article', note: 'How to talk about your value in business terms.', free: true },
          { title: 'levels.fyi', url: 'https://www.levels.fyi/', kind: 'tool', note: 'Real salary data for tech jobs worldwide.', free: true },
        ],
      },
      {
        title: 'Earning more: free course',
        items: [
          { title: 'Successful Negotiation (University of Michigan, Coursera)', url: 'https://www.coursera.org/learn/negotiation-skills', kind: 'course', note: 'Free to audit.', free: true },
        ],
      },
      {
        title: 'Earning more: books',
        items: [
          { title: 'Never Split the Difference by Chris Voss', kind: 'book', note: 'Negotiation.' },
          { title: 'The Software Engineer\'s Guidebook by Gergely Orosz', kind: 'book', note: 'Careers, levels and promotions in tech.' },
        ],
      },
      {
        title: 'Saving and budgeting: free courses and channels',
        intro: 'Saving is a system, not willpower: move money out automatically on payday, then spend what\'s left.',
        items: [
          { title: 'Khan Academy: Personal Finance', url: 'https://www.khanacademy.org/college-careers-more/personal-finance', kind: 'course', note: 'Budgeting, saving, debt, taxes.', free: true },
          { title: 'The Money Guy Show', url: 'https://www.youtube.com/@MoneyGuyShow', kind: 'video', note: 'A clear order of steps for your money (US-focused, but the logic is universal).', free: true },
        ],
      },
      {
        title: 'Saving and budgeting: books',
        items: [
          { title: 'The Psychology of Money by Morgan Housel', kind: 'book', note: 'How behavior matters more than knowledge.' },
          { title: 'I Will Teach You to Be Rich by Ramit Sethi', kind: 'book', note: 'Automate your finances in a few hours.' },
          { title: 'Your Money or Your Life by Vicki Robin', kind: 'book', note: 'What your spending costs in hours of your life.' },
        ],
      },
      {
        title: 'Investing and how money works: videos and channels',
        intro: 'Understand the economy first (inflation, interest, cycles), then invest simply: broad, low-cost index funds held for years beat most active strategies. This is education, not financial advice: check what\'s legal and taxed how in your country. Topics: what money is → inflation and why cash loses value → interest rates and central banks → compound interest → economic cycles → stocks, bonds, funds → index funds and diversification → risk vs return → fees and taxes → investing in practice (brokers, accounts) → what to avoid (hype, leverage, "get rich quick").',
        items: [
          { title: 'How The Economic Machine Works (Ray Dalio)', url: 'https://www.youtube.com/watch?v=PHe0bXAIuk0', kind: 'video', note: 'The whole economy in 30 minutes.', free: true },
          { title: 'Ben Felix', url: 'https://www.youtube.com/@BenFelixCSI', kind: 'video', note: 'Evidence-based investing, explained calmly.', free: true },
          { title: 'The Plain Bagel', url: 'https://www.youtube.com/@ThePlainBagel', kind: 'video', note: 'Finance concepts explained simply.', free: true },
          { title: 'Patrick Boyle', url: 'https://www.youtube.com/@PBoyle', kind: 'video', note: 'Markets and financial news, with real expertise.', free: true },
          { title: 'Economics Explained', url: 'https://www.youtube.com/@EconomicsExplained', kind: 'video', note: 'How countries\' economies work.', free: true },
        ],
      },
      {
        title: 'Investing: free courses and guides',
        items: [
          { title: 'Financial Markets (Robert Shiller, Yale, Coursera)', url: 'https://www.coursera.org/learn/financial-markets-global', kind: 'course', note: 'A Nobel laureate\'s course, free to audit.', free: true },
          { title: 'Bogleheads wiki', url: 'https://www.bogleheads.org/wiki/Main_Page', kind: 'doc', note: 'The reference for simple index investing.', free: true },
          { title: 'Investopedia', url: 'https://www.investopedia.com/', kind: 'doc', note: 'A dictionary of every finance term.', free: true },
          { title: 'Collaborative Fund blog (Morgan Housel)', url: 'https://collabfund.com/blog/', kind: 'article', free: true },
        ],
      },
      {
        title: 'Investing: books',
        items: [
          { title: 'The Simple Path to Wealth by JL Collins', kind: 'book', note: 'Index investing made simple.' },
          { title: 'The Little Book of Common Sense Investing by John Bogle', kind: 'book', note: 'From the founder of index funds.' },
          { title: 'The Intelligent Investor by Benjamin Graham', kind: 'book', note: 'The classic on investing temperament.' },
          { title: 'Principles for Dealing with the Changing World Order by Ray Dalio', kind: 'book', note: 'Big economic cycles.' },
        ],
      },
      {
        title: 'Making money beyond salary: resources',
        intro: 'Extra income comes from selling your time (freelancing, consulting), selling your knowledge (courses, writing), or selling products. Start with time, because it pays fastest; move toward products, which pay without your hours.',
        items: [
          { title: 'Indie Hackers', url: 'https://www.indiehackers.com/', kind: 'article', note: 'Real numbers from people earning outside a job.', free: true },
          { title: 'levels.io', url: 'https://levels.io/', kind: 'article', note: 'Real numbers from people earning outside a job.', free: true },
          { title: 'Alex Hormozi', url: 'https://www.youtube.com/@AlexHormozi', kind: 'video', note: 'Pricing and selling a service.', free: true },
          { title: 'My First Million', url: 'https://www.youtube.com/@MyFirstMillionPod', kind: 'podcast', note: 'Ideas for side businesses.', free: true },
          { title: 'Don\'t Call Yourself A Programmer (patio11)', url: 'https://www.kalzumeus.com/2011/10/28/dont-call-yourself-a-programmer/', kind: 'article', note: 'How to sell your skills as business value.', free: true },
        ],
      },
      {
        title: 'Making money beyond salary: books',
        items: [
          { title: 'Million Dollar Weekend by Noah Kagan', kind: 'book', note: 'Start a small business quickly.' },
          { title: '$100M Offers by Alex Hormozi', kind: 'book', note: 'How to price and package what you sell.' },
          { title: 'The Millionaire Fastlane by MJ DeMarco', kind: 'book', note: 'Why owning systems beats trading time for money.' },
          { title: 'Rich Dad Poor Dad by Robert Kiyosaki', kind: 'book', note: 'Assets vs liabilities. Popular and motivating, but read it critically.' },
        ],
      },
    ],
    checklists: [
      {
        title: 'Plan: 18 months',
        items: [
          'Q1 (Nov–Jan), see where your money goes: Track every expense for 30 days and build your finance dashboard (project F1). Calculate your savings rate: (income − spending) ÷ income. Do the Khan Academy personal finance unit.',
          'Q2 (Feb–Apr), emergency fund and automation: Set up separate accounts for spending, emergency fund and investing, with automatic transfers on payday. Read The Psychology of Money. Learn your country\'s tax rules for your type of work (for example FOP if you work in Ukraine).',
          'Q3 (May–Jul), earn more: Research your market rate and write your brag document. Read patio11\'s and Haseeb Qureshi\'s negotiation guides, practice aloud, then have the raise or rate conversation (project F2).',
          'Q4 (Aug–Oct), learn how money works: Watch Ray Dalio\'s How the Economic Machine Works. Learn index-fund investing (Bogleheads wiki, Ben Felix) and read The Simple Path to Wealth.',
          'Q5 (Nov–Jan), start investing: Write your personal investment policy and start automatic monthly investing once the emergency fund is full (project F3).',
          'Q6 (Feb–Apr), income beyond salary: Earn your first side income: freelancing, consulting or the Chapter 4 product (project F4). Review your 18-month net worth and savings rate.',
        ],
      },
      {
        title: 'Salary: rules that work',
        items: [
          'Keep a "brag document" of results with numbers ("cut page load by 40%", "shipped X used by Y editors"). Update it monthly.',
          'Never name a number first if you can avoid it. When you must, name a researched range and anchor high.',
          'Negotiate the whole package: base, bonus, equity, title, remote days, learning budget.',
          'Always have options: interview once or twice a year even when you\'re happy, to know your market value.',
        ],
      },
      {
        title: 'Saving: the order most guides agree on',
        items: [
          'Track spending for a month so you know your real numbers.',
          'Build a starter emergency fund of 1 month of expenses.',
          'Pay off expensive debt (credit cards, consumer loans).',
          'Grow the emergency fund to 3–6 months of expenses, in a safe account. Keep it in a stable currency if your local one is volatile.',
          'Invest a fixed share of every paycheck automatically (Q3 of the plan).',
          'When income rises, save at least half of each raise instead of spending it.',
        ],
      },
      {
        title: 'Paths to income beyond salary',
        items: [
          'Freelancing: paid per project or hour for dev work. Start with small frontend or AI-integration jobs from your network or freelance platforms. Speed to first money: weeks.',
          'Consulting: paid for expertise, not code: audits, architecture, adtech setup. Start with one niche you know deeply (video ads, header bidding, AI agents for teams). Speed to first money: 1–3 months.',
          'Teaching: courses, workshops, mentoring. Start with a paid workshop for your network on something you just learned well. Speed to first money: 1–3 months.',
          'Products: SaaS, templates, tools, apps. Start with Chapter 4 project B3. Speed to first money: 3–12 months.',
          'Content: blog, YouTube, newsletter; pays later through sponsors, clients or job offers. Start with Chapter 5 project E4. Speed to first money: 6–24 months.',
        ],
      },
    ],
    tips: [
      'A simple target split: about 50% needs, 30% wants, 20% or more saving and investing. Engineers can often push savings to 30–50%.',
      'Four practice projects that each leave a lasting system or result.',
    ],
  },

  smoke: {
    why: 'Not started yet: this tab is ready for the day you decide. When you do, set a quit date within 2 weeks and follow the prep list. Then track every day: watching the streak and the money add up is one of the strongest motivators.',
    groups: [
      {
        title: 'Quit apps',
        items: [
          { title: 'QuitGuide', url: 'https://smokefree.gov/tools-tips/apps/quitguide', kind: 'tool', free: true },
          { title: 'NHS Quit Smoking', url: 'https://www.nhs.uk/better-health/quit-smoking/', kind: 'tool', free: true },
        ],
      },
      {
        title: 'Resources',
        items: [
          { title: 'WHO: health benefits of quitting', url: 'https://www.who.int/news-room/questions-and-answers/item/tobacco-health-benefits-of-smoking-cessation', kind: 'article', free: true },
          { title: 'Smokefree.gov', url: 'https://smokefree.gov/', kind: 'tool', note: 'Free quit plans, apps and text support.', free: true },
          { title: 'NHS: Quit smoking', url: 'https://www.nhs.uk/better-health/quit-smoking/', kind: 'doc', free: true },
          { title: 'NHS stop smoking services', url: 'https://www.nhs.uk/live-well/quit-smoking/nhs-stop-smoking-services-help-you-quit/', kind: 'doc', free: true },
          { title: 'A simple way to break a bad habit (Judson Brewer, TED)', url: 'https://www.ted.com/talks/judson_brewer_a_simple_way_to_break_a_bad_habit', kind: 'video', note: 'Using curiosity to beat cravings.', free: true },
          { title: 'Allen Carr\'s Easy Way to Stop Smoking', kind: 'book', note: 'The best-known quit book.' },
          { title: 'Atomic Habits by James Clear', kind: 'book', note: 'On building and breaking habits.' },
        ],
      },
    ],
    checklists: [
      {
        title: 'Before quit day',
        items: [
          'Pick a quit date within the next 2 weeks and write it down.',
          'Write your 3 personal reasons for quitting (health, money, gym, family, smell, freedom).',
          'Work out your cost: cigarettes per day ÷ 20 × price per pack × 365 = money per year.',
          'List your triggers: coffee, after meals, stress, work breaks, alcohol, driving, other smokers.',
          'Plan one replacement for each trigger (a walk, water, gum, 10 push-ups, a call).',
          'Talk to a doctor or pharmacist about nicotine replacement (patches, gum) or prescription medication. Support and medication make quitting more likely to stick.',
          'The evening before: throw away all cigarettes, lighters and ashtrays.',
          'Tell 2 people you trust, and install a quit app (QuitGuide or NHS Quit Smoking).',
        ],
      },
      {
        title: 'What happens in your body (WHO timeline)',
        items: [
          '20 minutes: heart rate and blood pressure drop.',
          '12 hours: carbon monoxide in your blood drops to normal.',
          '2–12 weeks: circulation improves and lung function increases.',
          '1–9 months: coughing and shortness of breath decrease.',
          '1 year: risk of coronary heart disease is about half a smoker\'s.',
          '5–15 years: stroke risk falls to a nonsmoker\'s.',
          '10 years: lung cancer risk falls to about half a smoker\'s.',
          '15 years: coronary heart disease risk is a nonsmoker\'s.',
        ],
      },
      {
        title: 'When a craving hits: the 4 Ds',
        items: [
          'Delay: tell yourself "not now, in 10 minutes". The craving usually fades first.',
          'Deep breaths: breathe in for 4 seconds, out for 6, ten times.',
          'Drink water: slowly, a full glass.',
          'Do something else: walk, push-ups, brush your teeth, message a friend.',
        ],
      },
      {
        title: 'Motivation',
        items: [
          'Watch the money: put the daily cigarette money into a separate account and buy yourself something with it at day 30.',
          'Re-read your 3 reasons every morning for the first 2 weeks.',
          'Celebrate milestones: day 1, 3, 7, 14, 30, 90, 180, 365.',
          'Notice the wins: taste, smell, breath on the stairs, no smoke smell on clothes, no planning your day around breaks.',
          'Identity matters: say "I don\'t smoke", not "I\'m trying to quit".',
        ],
      },
    ],
    tips: [
      'Most cravings rise and then pass within minutes if you ride them out.',
      'Withdrawal (irritability, poor sleep, hunger, poor focus) is worst in the first days and usually eases over the following weeks. It\'s temporary, and it\'s a sign of healing.',
      'Coffee and alcohol are the strongest triggers for many people. Change the routine around them for the first month: another place, another time, tea instead.',
      'A slip is not a relapse. If you smoke one, don\'t "quit the quit": note the trigger, plan for it, and keep going the next hour.',
      'Exercise helps many quitters with cravings and mood, so this pairs well with Gym and diet.',
      'Quitting at about age 30 gains almost 10 years of life expectancy, according to the same WHO page.',
      'Track your numbers: quit date, cigarettes per day before, price per pack, money saved per month and per year.',
      'Day tracker for the first 30 days: mark Smoke-free or Slipped each day, rate cravings from 0 (none) to 5 (very strong), and note the main trigger. After day 30, switch to a weekly check-in until day 365.',
    ],
  },

  gym: {
    why: 'Not started yet: this tab is ready for when you are. The basics that bring most of the results: 3 strength workouts a week, 8,000+ steps a day, enough protein, a sensible calorie target and 7–9 hours of sleep, kept up for months. If you have any health conditions, check with a doctor before starting.',
    groups: [
      {
        title: 'Food logging apps',
        items: [
          { title: 'Cronometer', url: 'https://www.cronometer.com/', kind: 'tool', free: true },
          { title: 'MyFitnessPal', url: 'https://www.myfitnesspal.com/', kind: 'tool', free: true },
        ],
      },
      {
        title: 'Training and diet references',
        items: [
          { title: 'r/Fitness basic beginner routine', url: 'https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/', kind: 'doc', note: 'The beginner plan here is close to it.', free: true },
          { title: 'WHO: physical activity', url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity', kind: 'article', note: '150–300 minutes of moderate activity a week plus muscle-strengthening on 2 or more days.', free: true },
          { title: 'NHS guide to calories', url: 'https://www.nhs.uk/live-well/healthy-weight/managing-your-weight/understanding-calories/', kind: 'article', free: true },
          { title: 'WHO: healthy diet', url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet', kind: 'article', free: true },
        ],
      },
      {
        title: 'YouTube',
        items: [
          { title: 'Jeff Nippard', url: 'https://www.youtube.com/@JeffNippard', kind: 'video', note: 'Science-based training and nutrition.', free: true },
          { title: 'Jeremy Ethier', url: 'https://www.youtube.com/@JeremyEthier', kind: 'video', note: 'Clear workouts and form guides.', free: true },
          { title: 'Alan Thrall', url: 'https://www.youtube.com/@AlanThrall', kind: 'video', note: 'Barbell technique for beginners.', free: true },
          { title: 'Renaissance Periodization', url: 'https://www.youtube.com/@RenaissancePeriodization', kind: 'video', note: 'Training and diet from sports scientists.', free: true },
          { title: 'Huberman Lab', url: 'https://www.youtube.com/@hubermanlab', kind: 'podcast', note: 'Sleep, recovery and health science.', free: true },
        ],
      },
      {
        title: 'Guides',
        items: [
          { title: 'The Fitness Wiki', url: 'https://thefitness.wiki/', kind: 'doc', note: 'Beginner FAQ, routines and diet basics.', free: true },
          { title: 'Stronger by Science', url: 'https://www.strongerbyscience.com/', kind: 'article', note: 'Evidence-based articles on training and nutrition.', free: true },
          { title: 'NHS: Exercise', url: 'https://www.nhs.uk/live-well/exercise/', kind: 'doc', free: true },
        ],
      },
      {
        title: 'Books',
        items: [
          { title: 'Atomic Habits by James Clear', url: 'https://jamesclear.com/atomic-habits', kind: 'book', note: 'The habit system behind sticking with it.' },
          { title: 'Starting Strength by Mark Rippetoe', kind: 'book', note: 'The classic guide to barbell technique.' },
          { title: 'Bigger Leaner Stronger by Michael Matthews', kind: 'book', note: 'A simple all-in-one program and diet.' },
        ],
      },
    ],
    checklists: [
      {
        title: 'Before you start',
        items: [
          'Pick one main goal for the first 3 months: lose fat, build muscle, or both (the usual result for beginners).',
          'Take starting numbers: weight, waist measurement, front and side photos.',
          'Pick 3 fixed gym days and times (for example Mon, Wed, Fri at 19:00).',
          'Log your food for 2 weeks without changing anything (Cronometer or MyFitnessPal) to learn your real intake.',
          'Watch technique videos for squat, bench press, deadlift, overhead press and row before your first session.',
        ],
      },
      {
        title: 'Workout A',
        items: [
          'Squat',
          'Bench press',
          'Barbell row',
          'Extra (optional): plank, 3 × 30–60 s',
        ],
      },
      {
        title: 'Workout B',
        items: [
          'Deadlift (or Romanian deadlift)',
          'Overhead press',
          'Pull-ups or lat pulldown',
          'Extra (optional): biceps and triceps, 2 sets each',
        ],
      },
      {
        title: 'Diet basics',
        items: [
          'Calories decide weight. To lose fat, eat about 300–500 kcal a day below maintenance, which gives slow, sustainable loss. To build muscle, eat slightly above maintenance.',
          'Protein builds and keeps muscle. A common target for people who lift is about 1.6–2.2 g per kg of body weight a day, spread over 3–4 meals.',
          'The plate rule: half vegetables, a quarter protein, a quarter carbs, plus some healthy fat.',
          'WHO healthy diet basics: plenty of fruit and vegetables, free sugars under 10% of energy, less than 5 g of salt a day.',
          'Drink water, limit alcohol. Alcohol adds calories and hurts sleep and recovery.',
        ],
      },
      {
        title: 'What matters most, in order of impact',
        items: [
          'Consistency: a plan you follow for a year beats a perfect plan for a month.',
          'Calories: decide whether you lose or gain weight.',
          'Protein: decides how much of that change is muscle vs fat.',
          'Progressive overload: slowly lifting more is what makes muscles grow.',
          'Sleep: 7–9 hours; recovery and appetite control depend on it.',
          'Supplements: the least important. Creatine and protein powder are the only common ones with strong evidence, and both are optional.',
        ],
      },
      {
        title: 'Motivation and habits',
        items: [
          'Never miss twice: missing one workout is normal; missing two in a row starts a new habit.',
          'Make it easy: pack your gym bag the night before and keep fixed days.',
          'Track strength, not only weight: a log of your best lifts shows progress when the scale doesn\'t.',
          'Monthly photos: same light, same pose. Changes are invisible day to day but obvious month to month.',
          'Pair with quitting smoking: exercise helps with cravings and mood, and your stamina improves quickly once you stop smoking.',
        ],
      },
    ],
    tips: [
      'Beginner plan for the first 3 months: alternate workouts A and B, 3 times a week (week 1: A, B, A; week 2: B, A, B). Do 3 sets of 5–8 reps. When you hit 8 reps on all sets with good form, add the smallest weight step next time; this is progressive overload.',
      'The WHO recommends that adults get 150–300 minutes of moderate activity a week plus muscle-strengthening on 2 or more days. Three workouts plus daily walking covers it.',
      'Weight jumps 1–2 kg day to day from water, so judge by the weekly average.',
      'Beginners can build muscle and lose fat at the same time.',
      'Expect visible change in about 8–12 weeks, not 2.',
      'Weekly tracker for the first 12 weeks: one row per week with start date, workouts, average weight (average of daily morning weights), waist, average steps, average sleep, best lift and a note.',
    ],
  },
}

export const PROJECT_DETAILS: Record<string, ProjectDetail> = {
  T1: { goal: 'URL shortener on AWS: Go API on Lambda + API Gateway, DynamoDB, click stats', done: 'Live URL, README with an architecture diagram, under $1 a month', stack: 'Trains: Go, AWS basics, API design · Size: Small (2–3 weekends)' },
  T2: { goal: 'Distributed rate limiter: Go + Redis, token bucket and sliding window, as middleware for T1', done: 'Load test with k6 shows correct limits at 1,000 requests per second', stack: 'Trains: Caching, concurrency, highload · Size: Small' },
  T3: { goal: 'Your own MCP server in Go: exposes your notes or Jira tasks to Claude Code', done: 'Claude Code can call 3 tools from it', stack: 'Trains: AI tooling, protocols · Size: Small' },
  T4: { goal: 'Capstone: ticket → agent → merge request pipeline. Go webhook, SQS queue, Claude Code workers on ECS Fargate, DynamoDB job state, all in Terraform', done: 'A ticket on a sandbox repo becomes a reviewed MR with no manual steps', stack: 'Trains: System design, AWS, queues, agents, IaC · Size: Medium (6–8 weekends)' },
  T5: { goal: 'Ad event ingest: accept 10,000 events per second (impressions, clicks), aggregate per minute, store and query', done: 'Sustains the load in a k6 test; p99 latency under 100 ms', stack: 'Trains: Highload, streams, data modeling · Size: Medium' },
  T6: { goal: 'Observability and security pass on T1 + T4: traces, dashboards, one alert, OWASP review, chaos test (kill a worker)', done: 'Written post-mortem of one failure you injected', stack: 'Trains: SRE, security · Size: Small' },

  P1: { goal: 'PRD for a real feature at work: problem, users, metrics, scope, non-goals', done: 'Your PM says they would ship it as written, or tells you exactly why not', stack: 'Trains: Product sense, writing · Size: Small (1 week)' },
  P2: { goal: 'Redesign one confusing screen at work: interview 3 users, Figma prototype, usability test', done: 'Test users finish the task faster than on the old screen', stack: 'Trains: UX research, Figma, visual design · Size: Small (2–3 weeks)' },
  P3: { goal: 'Landing page, onboarding and pricing page for your Chapter 4 product', done: 'At least 5% of visitors sign up or join the waitlist', stack: 'Trains: UX, copywriting, conversion · Size: Small' },
  P4: { goal: 'Adtech explainer: a 1-page diagram plus write-up of how a video ad gets from auction to screen in your company\'s stack', done: 'A new teammate understands the flow from it alone', stack: 'Trains: Domain, writing · Size: Small' },
  P5: { goal: 'Measure and test a feature: add PostHog to a project, define a success metric, instrument events, build a funnel, run one A/B test with a precomputed sample size', done: 'A written result: hypothesis, numbers, decision, what you learned', stack: 'Trains: Metrics, analytics, experiments · Size: Small (2–3 weeks)' },

  M1: { goal: 'Lead one feature end to end: scope doc, estimate, milestone plan, weekly status update, launch, retro', done: 'Shipped within 20% of your estimate, retro written', stack: 'Trains: Project management, ownership · Size: Medium (4–8 weeks)' },
  M2: { goal: 'Mentor a junior or new teammate: a 30-minute weekly 1:1 for 2 months', done: 'They name one specific thing they improved thanks to it', stack: 'Trains: 1:1s, feedback, coaching · Size: Small, ongoing' },
  M3: { goal: 'Write an RFC for a cross-team technical decision and drive it to agreement', done: 'Decision made and recorded; the people who disagreed say they felt heard', stack: 'Trains: Influence, writing, leading without authority · Size: Small (2–3 weeks)' },
  M4: { goal: 'Run 3 team rituals: a retro, a planning session and a demo day', done: 'Each one ends with written action items that get done', stack: 'Trains: Facilitation, team health · Size: Small' },

  B1: { goal: 'Business teardown of your own company: Business Model Canvas, org chart, how each team earns or saves money, and a rough P&L', done: 'You can explain in 5 minutes how the company makes money and where your team fits', stack: 'Trains: How companies work, finance · Size: Small (2 weeks)' },
  B2: { goal: 'Validate a product idea: 10 interviews, a landing page, then 50 waitlist sign-ups or 5 pre-orders', done: 'Clear go or no-go decision, backed by numbers', stack: 'Trains: Validation, marketing, sales · Size: Small (3–4 weeks)' },
  B3: { goal: 'Launch a small paid product: a SaaS tool, template, course or service built with your skills (for example a dev tool or an adtech helper)', done: '10 paying customers or $100 in monthly recurring revenue', stack: 'Trains: Startups, pricing, selling · Size: Medium (2–3 months)' },
  B4: { goal: 'Offline business case study: interview the owner of a local business (cafe, gym, shop) about revenue, costs, staff and problems', done: 'A 1-page write-up of their unit economics and one idea software could fix', stack: 'Trains: Small business, interviewing · Size: Small' },

  E1: { goal: 'Accent before and after: record the same 2-minute text on day 1, then every quarter', done: '4 recordings; a native speaker or tutor confirms the later ones are clearer', stack: 'Trains: Pronunciation · Size: Small, ongoing' },
  E2: { goal: '100 days of speaking: a 2-minute daily voice note about your day, without stopping to translate', done: '100 recordings; you speak 2 minutes with no long pauses', stack: 'Trains: Fluency · Size: Small, daily' },
  E3: { goal: 'Give a 10-minute talk in English: a tech topic at a team meeting, meetup or Toastmasters', done: 'Talk given, recorded, and 3 people give you feedback', stack: 'Trains: Public speaking, English · Size: Small (2–3 weeks to prepare)' },
  E4: { goal: 'Write 6 public posts in English (LinkedIn or a blog), one every 2 months, about what you learned', done: '6 posts published', stack: 'Trains: Writing, personal brand · Size: Small' },

  F1: { goal: 'Personal finance dashboard: a spreadsheet (or a small app you build) with monthly income, spending by category, savings rate and net worth', done: 'Updated monthly for 6 months in a row', stack: 'Trains: Budgeting, tracking · Size: Small (1 weekend)' },
  F2: { goal: 'Raise or rate negotiation: market research, brag document, rehearsed conversation', done: 'Conversation held; result and lessons written down', stack: 'Trains: Negotiation, self-advocacy · Size: Small (1 month)' },
  F3: { goal: 'Personal investment policy: a 1-page doc covering goals, emergency fund, monthly amount, allocation and rules for when not to sell', done: 'Automatic monthly investing running for 3+ months', stack: 'Trains: Investing, discipline · Size: Small' },
  F4: { goal: 'First side income: one freelance, consulting or product deal', done: 'First payment received from a client who isn\'t your employer', stack: 'Trains: Selling, pricing · Size: Small to medium' },
}

export const OVERVIEW: Overview = {
  intro: 'AI agents are taking over the step from a clear spec to working code; the skills around that step keep you valuable. This is an 18-month program (November 2026 to April 2028) in six chapters at about 6 hours a week, followed by a habit of improving for good. How to use it: tick tasks as you go, swap any resource that doesn\'t click, and add notes anywhere you want changes.',
  schedule: [
    { day: 'Every day', what: '20 min: English routine (Chapter 5)' },
    { day: 'Mon, Wed', what: '45 min each: study for the focus chapter: a video, article or book chapter, plus notes' },
    { day: 'Thursday', what: '30 min: light track, one other chapter' },
    { day: 'Saturday', what: '2 h: practice project for the focus chapter' },
    { day: 'Sunday', what: '20 min: weekly review' },
  ],
  skills: [
    { chapter: 'tech', skills: ['System design', 'Highload backend', 'Cloud and AWS', 'Ops and SRE', 'Security', 'Testing and review', 'AI agents and AI features'] },
    { chapter: 'product', skills: ['Product sense', 'Discovery', 'UI/UX design', 'Adtech domain', 'Writing specs'] },
    { chapter: 'mgmt', skills: ['Project management', 'Team management', 'Leadership', 'Influence'] },
    { chapter: 'biz', skills: ['How companies work', 'Finance basics', 'Strategy', 'Startups', 'Small and offline business'] },
    { chapter: 'eng', skills: ['English (daily, technical, business)', 'Conversations', 'Conflict', 'Public speaking'] },
    { chapter: 'money', skills: ['Salary and negotiation', 'Saving', 'Investing', 'How money works', 'Side income'] },
  ],
  principles: [
    'Five chapters run in parallel, each with a quarter-by-quarter plan, topics, resources and practice projects.',
    'Every quarter has one main focus and lighter work on the rest, so nothing stalls and nothing overloads you.',
    'Courses and videos are free. Books may cost money; free alternatives are listed where they exist.',
    'Each skill has a project, because building and doing beats watching.',
    'About 6–7 hours a week: English every day, two short study sessions, one project block for the current focus chapter, and a short slot for one other chapter.',
    'When a week goes badly, keep only the two daily habits. Streaks beat intensity.',
    'Health, for later: Quit smoking and Gym and diet are ready to start whenever you choose. Each has a prep checklist, insights and a tracker. They aren\'t in the roadmap yet; when you start one, it replaces the light track for that quarter.',
    'Daily (2 min): write one line in a learning log: what you learned or did today.',
    'Weekly (Sunday, 30 min): tick finished tasks, note what worked and what didn\'t, and pick next week\'s 3 tasks.',
    'Monthly (1 h): ship one visible output (a blog post, demo, design doc or talk) and re-score the skill matrix.',
    'Quarterly (2 h): run a retro, ask 2 people for honest feedback, update your CV and LinkedIn, then adjust the next quarter.',
    'Yearly: a big retro. Keep the chapters that pay off, drop the rest, and pick next year\'s focus.',
    'Learn in public. Post one short write-up a month on LinkedIn or a blog, in English. It trains writing, English and your reputation at once.',
    'Skill matrix: score yourself 1–5 (1 = never done it, 3 = can do it alone, 5 = can teach it) on System design, Highload backend, Cloud and AWS, Ops/security/testing, AI agents and AI features, Product sense, UI/UX design, Product metrics and A/B tests, Adtech domain, Project management, Team management, Leadership and influence, How companies work, Startups and business, English speaking and pronunciation, English writing, Public speaking, Personal finance. Fill the Start column this week, then re-score each quarter.',
  ],
}

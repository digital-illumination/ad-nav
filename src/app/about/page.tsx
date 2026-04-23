import type { Metadata } from "next";
import NeonCard from "@/components/NeonCard";
import GlitchText from "@/components/GlitchText";
import Image from "next/image";
import { Target, Users, Wrench, Sparkles } from "lucide-react";
import { BASE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Adam Stacey — Head of Technology at Compare the Market, AI transformation leader, and agent-first builder.",
  alternates: { canonical: "/about" },
};

const profilePageJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  dateCreated: "2026-04-01",
  dateModified: new Date().toISOString().split("T")[0],
  mainEntity: {
    "@type": "Person",
    "@id": `${BASE_URL}/#adam`,
    name: "Adam Stacey",
    alternateName: "Adam",
    description:
      "Head of Technology at Compare the Market. AI transformation leader, agent-first builder, and digital strategist with over 20 years in technology.",
    image: `${BASE_URL}/images/adam-headshot.jpg`,
    jobTitle: "Head of Technology",
    worksFor: {
      "@type": "Organization",
      name: "Compare the Market",
      url: "https://www.comparethemarket.com",
    },
    url: `${BASE_URL}/about`,
    sameAs: [
      "https://www.linkedin.com/in/adamcstacey/",
      "https://github.com/digital-illumination",
    ],
    knowsAbout: [
      "AI Agents",
      "Model Context Protocol",
      "Digital Transformation",
      "Engineering Leadership",
      "Cloud Architecture",
      "Salesforce CPQ",
      "Agent-First Development",
    ],
  },
};

const competencies = [
  { label: "Agent-First Delivery" },
  { label: "AI & ML Strategy" },
  { label: "Organisational Design" },
  { label: "Manager of Managers" },
  { label: "Cloud (AWS, Azure, GCP)" },
  { label: "Regulated Environments" },
  { label: "C-Suite Stakeholder Influence" },
  { label: "Spec-Driven Development" },
  { label: "Salesforce CPQ" },
  { label: "Digital Transformation" },
];

const stats = [
  { value: "20+", label: "Years in Tech", color: "text-neon-purple" },
  { value: "4", label: "Teams Led", color: "text-neon-pink" },
  { value: "300+", label: "Engineers Coordinated", color: "text-neon-cyan" },
  { value: "6", label: "AI Agents Built", color: "text-neon-purple" },
];

const timeline = [
  { year: "2000", title: "BSc Computer Science", desc: "University of Nottingham", color: "border-neon-cyan" },
  { year: "2003", title: "Founded Niddocks", desc: "Web agency. BMW, MINI, 3M, University of Oxford. Seven years.", color: "border-neon-purple" },
  { year: "2007", title: "Young Entrepreneur of the Year", desc: "Recognised while running Niddocks at twenty-five.", color: "border-neon-pink" },
  { year: "2012", title: "Lead Engineer → Technical Director", desc: "UK Kitchens, then Brickhunter. E-commerce platforms, CRM builds, legacy modernisation.", color: "border-neon-cyan" },
  { year: "2017", title: "Founded Digital Illumination", desc: "Technology consultancy. Solution architecture, Salesforce, platform modernisation.", color: "border-neon-purple" },
  { year: "2017", title: "Head of Development, Barbon Insurance", desc: "Microservices platform, CI/CD, API-driven integrations. Contract role.", color: "border-neon-pink" },
  { year: "2020", title: "Staff Engineer, Compare the Market", desc: "Architecture for Energy and Home Insurance. Auto-fill product for conversion.", color: "border-neon-cyan" },
  { year: "2022", title: "Head of Technology, Compare the Market", desc: "Multiple engineering teams. Agent-first transformation. Partner platform strategy.", color: "border-neon-purple" },
  { year: "2024", title: "AI & Data Science Apprenticeship + PicoPouch", desc: "Level 7 Masters-equivalent. Six AI agents. Agent-first SaaS on GCP.", color: "border-neon-pink" },
];

export default function AboutPage() {
  return (
    <div className="page-transition py-16 px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profilePageJsonLd) }}
      />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-mono text-neon-cyan mb-4 tracking-widest uppercase">
            // about.md
          </p>
          <GlitchText
            text="Adam Stacey"
            as="h1"
            className="text-4xl sm:text-5xl font-mono font-bold neon-text-purple mb-4"
          />
          <p className="text-xl text-text-secondary font-mono">
            Head of Technology &bull; AI Transformation Leader &bull; Agent-First Builder
          </p>
        </div>

        {/* Introduction */}
        <NeonCard className="mb-8">
          <h2 className="text-lg font-mono font-bold text-neon-cyan mb-4">
            // introduction
          </h2>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 shrink-0 rounded-lg overflow-hidden border border-neon-purple/50 shadow-[0_0_15px_var(--neon-purple-glow)]">
              <Image
                src="/images/adam-headshot.jpg"
                alt="Adam Stacey"
                width={144}
                height={144}
                sizes="(max-width: 640px) 112px, 144px"
                className="object-cover w-full h-full brightness-90 saturate-[0.85]"
              />
            </div>
            <div>
              <p className="text-text-secondary leading-relaxed mb-4">
                I lead partner engineering at Compare the Market, multiple teams
                building the platform that connects comparison partners to
                millions of customers. Before that I spent two decades doing
                variations of the same job: figuring out what a business
                actually needs from its technology and then building it.
              </p>
              <p className="text-text-secondary leading-relaxed">
                Right now I&apos;m also completing a Level 7 AI and Data Science
                apprenticeship, building PicoPouch (an agent-first SaaS platform
                on GCP with six purpose-built AI agents), and using this site as
                a testing ground for how agents and humans should work together.
                Tea breaks are non-negotiable.
              </p>
            </div>
          </div>
        </NeonCard>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center py-6 rounded-lg border border-border-glow bg-[#0d0d1a]/60 backdrop-blur-sm"
              style={{
                animation: `contact-card-enter 0.5s ease-out ${index * 100}ms both`,
              }}
            >
              <p className={`text-3xl sm:text-4xl font-mono font-bold ${stat.color} mb-1`}
                style={{ textShadow: "0 0 20px currentColor" }}
              >
                {stat.value}
              </p>
              <p className="text-xs font-mono text-text-dim uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Neon Divider */}
        <div className="relative w-full h-24 sm:h-32 overflow-hidden mb-8 rounded-lg">
          <Image
            src="/images/neon-divider.jpg"
            alt=""
            fill
            className="object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-transparent to-[#0a0a0f]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-transparent to-[#0a0a0f]" />
        </div>

        {/* What I Bring */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {[
            {
              icon: <Target className="w-7 h-7 shrink-0" />,
              title: "Transformation at Scale",
              color: "text-neon-purple",
              body: "I coordinated 300+ engineers across every product vertical for a zero-downtime regulatory release at a major comparison platform. Introduced rehearsals, runbooks, and premortems that became standard practice for all high-risk releases. The strategy matters more than the technology, and I've learned that the hard way.",
            },
            {
              icon: <Users className="w-7 h-7 shrink-0" />,
              title: "Leadership with Heart",
              color: "text-neon-pink",
              body: "Hire for behaviours, develop for skills. I reshaped a top-heavy engineering org from an inverted seniority pyramid to a sustainable talent pipeline using natural attrition, graduate investment, and agent-first tooling. Doing that in the middle of a transformation that changed what it means to be an engineer on my teams is probably the thing I'm proudest of.",
            },
            {
              icon: <Wrench className="w-7 h-7 shrink-0" />,
              title: "Problem Solver",
              color: "text-neon-cyan",
              body: 'I built an ML-based partner onboarding platform that cut integration effort by 60%. Designed the auto-fill product for home insurance that improved conversion. Built financial control systems for the University of Oxford that saved over £1M in audit findings. The common thread: someone said "this is a mess" and I said "right, let\u2019s fix it."',
            },
            {
              icon: <Sparkles className="w-7 h-7 shrink-0" />,
              title: "Agent-First Believer",
              color: "text-neon-purple",
              body: "Agent-first isn't a productivity tool. It's a delivery model. My engineers work at the architecture and verification layer while AI agents handle implementation. We've seen significant cycle time reductions without adding headcount. Force multiplication, not linear scaling. PicoPouch and this site are both built the same way.",
            },
          ].map((card, index) => (
            <div
              key={card.title}
              style={{
                animation: `contact-card-enter 0.6s ease-out ${index * 150}ms both`,
              }}
            >
              <NeonCard>
                <h3 className={`text-lg font-mono font-bold ${card.color} mb-3 flex items-center gap-3`}>
                  {card.icon}
                  {card.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {card.body}
                </p>
              </NeonCard>
            </div>
          ))}
        </div>

        {/* Career Highlights */}
        <NeonCard className="mb-8">
          <h2 className="text-lg font-mono font-bold text-neon-cyan mb-4">
            // career_highlights
          </h2>
          <ul className="space-y-3">
            {[
              "Pioneered agent-first delivery across multiple engineering teams, shifting engineers to architecture and verification roles",
              "Coordinated 300+ engineers for a zero-downtime cross-platform regulatory release under FCA pressure",
              "Reshaped team structure from inverted seniority pyramid to sustainable talent pipeline while maintaining delivery",
              "Built ML partner onboarding platform reducing integration effort by 60%",
              "Delivered solutions for BMW, MINI, 3M, and the University of Oxford through Niddocks and Digital Illumination",
              "Young Entrepreneur of the Year 2007. Founded a web agency at 21 that ran for seven years",
              "Building PicoPouch: six AI agents handling data ingestion, bank statement processing, and vault automation",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm text-text-secondary"
              >
                <span className="text-neon-purple font-mono mt-0.5">&gt;</span>
                {item}
              </li>
            ))}
          </ul>
        </NeonCard>

        {/* Core Competencies */}
        <NeonCard className="mb-8">
          <h2 className="text-lg font-mono font-bold text-neon-cyan mb-4">
            // core_competencies
          </h2>
          <div className="flex flex-wrap gap-3">
            {competencies.map((c) => (
              <span
                key={c.label}
                className="px-3 py-1.5 text-xs font-mono border border-border-glow rounded-full text-neon-purple hover:bg-neon-purple/10 transition-colors"
              >
                {c.label}
              </span>
            ))}
          </div>
        </NeonCard>

        {/* The Journey — Timeline */}
        <div className="mb-8">
          <h2 className="text-lg font-mono font-bold text-neon-cyan mb-8 px-4">
            // the_journey
          </h2>
          <div className="relative pl-8 sm:pl-12">
            {/* Vertical neon line */}
            <div
              className="absolute left-3 sm:left-5 top-0 bottom-0 w-px"
              style={{
                background: "linear-gradient(to bottom, #b829e3, #00f0ff, #ff2d95, #b829e3)",
                boxShadow: "0 0 6px #b829e340, 0 0 12px #b829e320",
              }}
            />

            <div className="space-y-6">
              {timeline.map((item, index) => (
                <div
                  key={`${item.year}-${item.title}`}
                  className="relative"
                  style={{
                    animation: `contact-card-enter 0.4s ease-out ${index * 80}ms both`,
                  }}
                >
                  {/* Glowing node */}
                  <div
                    className={`absolute -left-5 sm:-left-7 top-1 w-3 h-3 rounded-full ${item.color} border-2 bg-[#0a0a0f]`}
                    style={{ boxShadow: "0 0 8px currentColor" }}
                  />

                  <div className="pb-2">
                    <span className="text-xs font-mono text-text-dim">{item.year}</span>
                    <h3 className="text-sm font-mono font-bold text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Personal Note */}
        <NeonCard>
          <h2 className="text-lg font-mono font-bold text-neon-cyan mb-4">
            // off_the_clock
          </h2>
          <p className="text-text-secondary leading-relaxed">
            When I&apos;m not at work, I&apos;m either tinkering with my enduro
            bike, building PicoPouch, or being called &ldquo;Ad-Nav&rdquo; by
            my family. It&apos;s a play on sat-nav, because I always seem to
            find a way out of anything. Gemma, Isaac, and Eleanor came up
            with it. It stuck.
          </p>
        </NeonCard>
      </div>
    </div>
  );
}

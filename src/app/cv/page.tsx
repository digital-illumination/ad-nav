import type { Metadata } from "next";
import NeonCard from "@/components/NeonCard";
import GlitchText from "@/components/GlitchText";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import Image from "next/image";
import { Briefcase, GraduationCap, Award, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "CV",
  description:
    "Career timeline of Adam Stacey — 20+ years in technology leadership, AI transformation, and engineering at scale.",
  alternates: { canonical: "/cv" },
};

interface Role {
  title: string;
  period: string;
  bullets: string[];
}

interface ExperienceEntry {
  company: string;
  overallPeriod: string;
  subtitle?: string;
  color: "purple" | "pink" | "cyan";
  roles: Role[];
}

const experience: ExperienceEntry[] = [
  {
    company: "Compare the Market",
    overallPeriod: "2020 – Present",
    color: "purple",
    roles: [
      {
        title: "Head of Technology",
        period: "2022 – Present",
        bullets: [
          "Lead multiple engineering teams delivering partner platform strategy across several product verticals",
          "Pioneered agent-first delivery across all teams, shifting engineers to architecture and verification roles while AI agents handle implementation",
          "Coordinated 300+ engineers for a zero-downtime cross-platform regulatory release under FCA pressure. Introduced rehearsals, runbooks, and premortems that became standard practice",
          "Reshaped engineering org from inverted seniority pyramid to sustainable talent pipeline using natural attrition, graduate investment, and agent-first tooling",
          "Partnered with CCO, CGO, and Product Directors on strategic trade-offs, roadmap prioritisation, and commercial alignment",
        ],
      },
      {
        title: "Senior Engineering Manager",
        period: "2022",
        bullets: [
          "Managed engineering teams across Home and Car Insurance",
          "Maintained uptime during the Energy market crisis while planning a full platform rebuild",
        ],
      },
      {
        title: "Staff Engineer / Application Architect",
        period: "2020 – 2022",
        bullets: [
          "Led architecture and design for large-scale products in Energy and Home Insurance",
          "Designed and delivered an auto-fill product feature for Home Insurance that improved conversion",
          "Introduced architectural patterns improving system resilience and foundations for data-driven decisioning",
        ],
      },
    ],
  },
  {
    company: "PicoPouch",
    overallPeriod: "2024 – Present",
    subtitle: "Personal Project",
    color: "cyan",
    roles: [
      {
        title: "AI Product Builder",
        period: "2024 – Present",
        bullets: [
          "Designing and building an agent-driven SaaS platform for life admin and digital estate planning on GCP/Firebase",
          "Six purpose-built AI agents handling data ingestion, bank statement processing, natural language search, and vault automation",
          "Architected forwarding-based email system using SendGrid Inbound Parse with two-role collaboration model",
        ],
      },
    ],
  },
  {
    company: "Digital Illumination",
    overallPeriod: "2017 – 2020",
    color: "pink",
    roles: [
      {
        title: "Technology Consultant",
        period: "2017 – 2020",
        bullets: [
          "Independent technology consultant delivering solution architecture, Salesforce implementation, and platform modernisation",
          "Clients across insurance, e-commerce, and IoT sectors",
          "Salesforce Certified Advanced Administrator",
        ],
      },
    ],
  },
  {
    company: "Barbon Insurance Group",
    overallPeriod: "2017 – 2020",
    subtitle: "Contract",
    color: "cyan",
    roles: [
      {
        title: "Head of Development / Solution Architect",
        period: "2017 – 2020",
        bullets: [
          "Led architecture and build of a microservices-based referencing and insurance platform",
          "Introduced CI/CD, API-driven integrations, and modern DevOps practices",
        ],
      },
    ],
  },
];

const earlierCareer = [
  { role: "Technical Director", company: "Brickhunter", period: "2015 – 2017", desc: "Modernised legacy systems, developed bespoke CRM, migrated to Magento 2" },
  { role: "Solution Architect", company: "Wireless Logic", period: "2014 – 2015", desc: "Architected B2B billing platform integrating Salesforce, Sage, and telecom APIs" },
  { role: "Lead Software Engineer", company: "UK Kitchens", period: "2012 – 2014", desc: "Built e-commerce platform that doubled turnover to £4M" },
  { role: "Founder", company: "Niddocks", period: "2003 – 2010", desc: "Web agency. BMW, MINI, 3M, University of Oxford. Young Entrepreneur of the Year 2007" },
];

const skills: Record<string, { items: string[]; color: "purple" | "pink" | "cyan" }> = {
  "AI & Agents": { items: ["Agentic AI Architecture", "LLM Integration", "Agent-First Delivery", "ML Pipelines", "Prompt Engineering", "RAG Systems"], color: "purple" },
  "Leadership": { items: ["Manager of Managers", "Organisational Design", "Team Restructuring", "Coaching & Mentoring", "C-Suite Influence", "Performance Management"], color: "pink" },
  "Platforms": { items: ["AWS", "Azure", "GCP / Firebase", "Docker", "Kubernetes", "Kafka", "Terraform"], color: "cyan" },
  "Engineering": { items: ["Python", "Java", "C# / .NET", "React / TypeScript", "SQL / NoSQL", "Spec-Driven Development"], color: "purple" },
  "Domain": { items: ["Insurance (Personal Lines)", "Partner Integration", "Fintech", "Comparison Platforms", "FCA-Regulated Environments"], color: "pink" },
  "Transformation": { items: ["Large-Scale Change", "Regulatory Delivery", "Rehearsal & Premortem Methods", "Salesforce (Certified)", "Stakeholder Frameworks"], color: "cyan" },
};

const education: { qualification: string; institution: string; period: string; note?: string }[] = [
  { qualification: "Level 7 AI & Data Science Apprenticeship", institution: "Cambridge Spark", period: "2024 – 2026", note: "Masters-equivalent, completing" },
  { qualification: "Oxford Algorithmic Trading Programme", institution: "Sa\u00efd Business School, University of Oxford", period: "2018" },
  { qualification: "BSc Computer Science", institution: "University of Nottingham", period: "2000 – 2003" },
];

const certifications: Record<string, { name: string; date?: string }[]> = {
  "Cambridge Spark": [
    { name: "Explainable AI", date: "Jan 2026" },
    { name: "Neural Networks & Deep Learning", date: "Jan 2026" },
    { name: "Intermediate Machine Learning", date: "Dec 2025" },
    { name: "Machine Learning Foundations", date: "Jul 2025" },
    { name: "Data Science Foundations", date: "Feb 2025" },
  ],
  "Salesforce": [
    { name: "Advanced Administrator", date: "Jun 2023" },
    { name: "Platform App Builder" },
    { name: "Business Analyst" },
    { name: "Administrator", date: "Feb 2023" },
    { name: "Associate", date: "Nov 2022" },
  ],
};

const community = [
  "Technical consultancy to Florence Nightingale Foundation supporting leadership programmes for nurses and midwives",
  "Mentored a Birmingham University student for 6 months on commercial considerations in large technology projects",
  "Presented seminars on technology and careers at Central College Nottingham and Nottingham High School",
];

const achievements = [
  { value: "Major", label: "Cycle Reduction", sub: "partner pipeline", color: "text-neon-purple" },
  { value: "300+", label: "Engineers Coordinated", sub: "zero-downtime release", color: "text-neon-pink" },
  { value: "60%", label: "Effort Reduced", sub: "ML onboarding platform", color: "text-neon-cyan" },
  { value: "Zero", label: "Downtime", sub: "FCA regulatory release", color: "text-neon-purple" },
];

const colorMap = {
  purple: { text: "text-neon-purple", border: "border-neon-purple", bg: "bg-neon-purple", hex: "#b829e3" },
  pink: { text: "text-neon-pink", border: "border-neon-pink", bg: "bg-neon-pink", hex: "#ff2d95" },
  cyan: { text: "text-neon-cyan", border: "border-neon-cyan", bg: "bg-neon-cyan", hex: "#00f0ff" },
};

export default function CVPage() {
  return (
    <div className="page-transition py-16 px-4">
      <BreadcrumbJsonLd name="CV" path="/cv" />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-mono text-neon-cyan mb-4 tracking-widest uppercase">
            // curriculum_vitae.md
          </p>
          <GlitchText
            text="Career Timeline"
            as="h1"
            className="text-4xl sm:text-5xl font-mono font-bold neon-text-purple mb-4"
          />
          <p className="text-xl text-text-secondary font-mono">
            AI &amp; Engineering Transformation Leader
          </p>
        </div>

        {/* Summary */}
        <NeonCard className="mb-8">
          <h2 className="text-lg font-mono font-bold text-neon-cyan mb-4">
            // summary
          </h2>
          <p className="text-text-secondary leading-relaxed mb-4">
            Senior technology leader with 20+ years of experience across engineering
            leadership, platform architecture, and AI-driven transformation. Currently
            Head of Technology at Compare the Market, leading multiple engineering teams
            through an agent-first delivery transformation that has changed how the
            organisation builds software.
          </p>
          <p className="text-text-secondary leading-relaxed">
            Completing a Level 7 (Masters-equivalent) AI and Data Science Apprenticeship
            alongside hands-on development of PicoPouch, a personal AI-agent-driven SaaS
            platform. Track record includes coordinating 300+ engineers across a regulated,
            zero-downtime platform release at one of the UK&apos;s largest comparison
            platforms.
          </p>
        </NeonCard>

        {/* Key Achievements */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {achievements.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center py-5 rounded-lg border border-border-glow bg-[#0d0d1a]/60 backdrop-blur-sm"
              style={{
                animation: `contact-card-enter 0.5s ease-out ${index * 100}ms both`,
              }}
            >
              <p
                className={`text-2xl sm:text-3xl font-mono font-bold ${stat.color} mb-1`}
                style={{ textShadow: "0 0 20px currentColor" }}
              >
                {stat.value}
              </p>
              <p className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-[10px] font-mono text-text-dim mt-0.5">
                {stat.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Employer Bar */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4">
            {[
              "Compare the Market",
              "Digital Illumination",
              "BMW",
              "MINI",
              "3M",
              "University of Oxford",
            ].map((name, index) => (
              <span
                key={name}
                className="text-sm font-mono text-text-dim/40 hover:text-neon-purple hover:drop-shadow-[0_0_8px_var(--neon-purple-glow)] transition-all duration-300 cursor-default"
                style={{
                  animation: `contact-card-enter 0.4s ease-out ${index * 100 + 400}ms both`,
                }}
              >
                {name}
              </span>
            ))}
          </div>
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

        {/* Career Progression */}
        <div className="mb-8">
          <div className="relative py-4">
            {/* Track */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border-glow -translate-y-1/2" />
            {/* Animated fill */}
            <div
              className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 progression-fill"
              style={{
                background: "linear-gradient(90deg, #b829e3, #ff2d95, #00f0ff)",
                boxShadow: "0 0 8px #b829e340, 0 0 16px #b829e320",
              }}
            />
            {/* Nodes */}
            <div className="relative flex justify-between">
              {[
                { label: "Developer", color: "border-neon-purple", active: true },
                { label: "Lead", color: "border-neon-purple", active: true },
                { label: "Architect", color: "border-neon-pink", active: true },
                { label: "Manager", color: "border-neon-pink", active: true },
                { label: "Head of Tech", color: "border-neon-cyan", active: true },
              ].map((node, i) => (
                <div key={node.label} className="flex flex-col items-center gap-2">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 ${node.color} bg-[#0a0a0f]`}
                    style={{
                      boxShadow: "0 0 8px currentColor",
                      animation: `contact-card-enter 0.4s ease-out ${i * 200 + 800}ms both`,
                    }}
                  />
                  <span
                    className="text-[10px] font-mono text-text-dim whitespace-nowrap"
                    style={{
                      animation: `contact-card-enter 0.4s ease-out ${i * 200 + 1000}ms both`,
                    }}
                  >
                    {node.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Experience */}
        <div className="mb-8">
          <h2 className="text-lg font-mono font-bold text-neon-cyan mb-8 flex items-center gap-3">
            <Briefcase className="w-5 h-5" />
            // experience
          </h2>
          <div className="space-y-6">
            {experience.map((entry, entryIndex) => {
              const colors = colorMap[entry.color];
              return (
                <div
                  key={entry.company}
                  style={{
                    animation: `contact-card-enter 0.5s ease-out ${entryIndex * 120}ms both`,
                  }}
                >
                  <NeonCard>
                    {/* Company header */}
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">
                      <h3 className={`text-lg font-mono font-bold ${colors.text}`}>
                        {entry.company}
                      </h3>
                      {entry.subtitle && (
                        <span className="text-xs font-mono text-text-dim px-2 py-0.5 border border-border-glow rounded-full">
                          {entry.subtitle}
                        </span>
                      )}
                      <span className="text-xs font-mono text-text-dim ml-auto">
                        {entry.overallPeriod}
                      </span>
                    </div>

                    {/* Roles */}
                    <div className={entry.roles.length > 1 ? "relative pl-8" : ""}>
                      {/* Connecting line for multi-role companies */}
                      {entry.roles.length > 1 && (
                        <div
                          className="absolute left-3 top-2 bottom-2 w-0.5 rounded-full"
                          style={{ backgroundColor: `${colors.hex}40` }}
                        />
                      )}
                      <div className={entry.roles.length > 1 ? "space-y-5" : ""}>
                        {entry.roles.map((role, roleIndex) => (
                          <div
                            key={role.title}
                            className={`relative ${
                              entry.roles.length === 1 && roleIndex > 0
                                ? "pt-4 border-t border-border-glow"
                                : ""
                            }`}
                          >
                            {/* Node dot for multi-role */}
                            {entry.roles.length > 1 && (
                              <div
                                className={`absolute -left-5 top-[5px] w-3 h-3 rounded-full border-2 ${colors.border} bg-[#0a0a0f]`}
                                style={{ boxShadow: `0 0 6px ${colors.hex}` }}
                              />
                            )}
                            <h4 className="text-sm font-mono font-bold text-foreground">
                              {role.title}
                            </h4>
                            <p className="text-xs font-mono text-text-dim mb-2">
                              {role.period}
                            </p>
                            <ul className="space-y-1.5">
                              {role.bullets.map((bullet) => (
                                <li
                                  key={bullet}
                                  className="flex items-start gap-2 text-sm text-text-secondary"
                                >
                                  <span className={`${colors.text} font-mono text-xs mt-1 shrink-0`}>&gt;</span>
                                  {bullet}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </NeonCard>
                </div>
              );
            })}
          </div>
        </div>

        {/* Earlier Career */}
        <NeonCard className="mb-8">
          <h3 className="text-sm font-mono font-bold text-neon-pink mb-4 uppercase tracking-wider">
            Earlier Career
          </h3>
          <div className="space-y-4">
            {earlierCareer.map((item, index) => (
              <div
                key={item.company}
                style={{
                  animation: `contact-card-enter 0.4s ease-out ${index * 100}ms both`,
                }}
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-neon-purple font-mono text-xs">&gt;</span>
                  <span className="text-sm font-mono font-bold text-foreground">{item.role}</span>
                  <span className="text-sm text-neon-pink font-mono">@ {item.company}</span>
                  <span className="text-xs font-mono text-text-dim ml-auto">{item.period}</span>
                </div>
                <p className="text-xs text-text-secondary ml-5 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </NeonCard>

        {/* Neon HR Divider */}
        <div className="my-8">
          <hr className="neon-hr" />
        </div>

        {/* Skills */}
        <div className="mb-8">
          <h2 className="text-lg font-mono font-bold text-neon-cyan mb-8">
            // skills
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(skills).map(([category, { items, color }], index) => {
              const colors = colorMap[color];
              return (
                <div
                  key={category}
                  style={{
                    animation: `contact-card-enter 0.4s ease-out ${index * 80}ms both`,
                  }}
                >
                  <NeonCard>
                    <h3 className={`text-sm font-mono font-bold ${colors.text} mb-3 uppercase tracking-wider`}>
                      {category}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {items.map((item) => (
                        <span
                          key={item}
                          className="px-2.5 py-1 text-xs font-mono border border-border-glow text-text-secondary rounded-full hover:text-neon-purple hover:border-neon-purple/50 transition-colors"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </NeonCard>
                </div>
              );
            })}
          </div>
        </div>

        {/* Education */}
        <div className="mb-8">
          <h2 className="text-lg font-mono font-bold text-neon-cyan mb-8 flex items-center gap-3">
            <GraduationCap className="w-5 h-5" />
            // education
          </h2>
          <NeonCard>
            <div className="space-y-4">
              {education.map((item) => (
                <div key={item.qualification} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                  <span className="text-xs font-mono text-neon-purple shrink-0 sm:w-28 sm:text-right">
                    {item.period}
                  </span>
                  <div>
                    <h3 className="text-sm font-mono font-bold text-foreground">
                      {item.qualification}
                    </h3>
                    <p className="text-xs text-text-secondary">{item.institution}</p>
                    {item.note && (
                      <p className="text-xs text-neon-cyan font-mono mt-0.5">{item.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </NeonCard>
        </div>

        {/* Certifications */}
        <div className="mb-8">
          <h2 className="text-lg font-mono font-bold text-neon-cyan mb-8 flex items-center gap-3">
            <Award className="w-5 h-5" />
            // certifications
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(certifications).map(([issuer, certs]) => (
              <NeonCard key={issuer}>
                <h3 className="text-sm font-mono font-bold text-neon-purple mb-3 uppercase tracking-wider">
                  {issuer}
                </h3>
                <div className="space-y-2">
                  {certs.map((cert) => (
                    <div key={cert.name} className="flex items-baseline justify-between gap-2">
                      <span className="text-sm text-text-secondary flex items-start gap-2">
                        <span className="text-neon-pink font-mono text-xs mt-0.5">&#9654;</span>
                        {cert.name}
                      </span>
                      {cert.date && (
                        <span className="text-xs font-mono text-text-dim shrink-0">{cert.date}</span>
                      )}
                    </div>
                  ))}
                </div>
              </NeonCard>
            ))}
          </div>
        </div>

        {/* Community */}
        <NeonCard animated>
          <h2 className="text-lg font-mono font-bold text-neon-cyan mb-4 flex items-center gap-3">
            <Heart className="w-5 h-5" />
            // community
          </h2>
          <ul className="space-y-3">
            {community.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-text-secondary">
                <span className="text-neon-purple font-mono mt-0.5">&gt;</span>
                {item}
              </li>
            ))}
          </ul>
        </NeonCard>
      </div>
    </div>
  );
}

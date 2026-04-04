import type { Metadata } from "next";
import NeonCard from "@/components/NeonCard";
import GlitchText from "@/components/GlitchText";
import Image from "next/image";
import { Bot, Globe, Briefcase, Code2 } from "lucide-react";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Showcase of projects by Adam Stacey — PicoPouch, Ad-Nav, and enterprise delivery at Compare the Market.",
  alternates: { canonical: "/projects" },
};

interface Project {
  name: string;
  status: string;
  description: string;
  highlight?: string;
  tech: string[];
  color: "purple" | "pink" | "cyan";
}

interface Section {
  heading: string;
  icon: ReactNode;
  projects: Project[];
}

const sections: Section[] = [
  {
    heading: "currently_building",
    icon: <Bot className="w-5 h-5" />,
    projects: [
      {
        name: "PicoPouch",
        status: "Building",
        description:
          "Agent-driven SaaS platform for life admin and digital estate planning. Six purpose-built AI agents (Ledger, Courier, Analyst, Controller, Oracle, Tella) handle data ingestion, bank statement processing, natural language search, and vault automation. In alpha, currently testing with family. Built on GCP with Firebase.",
        highlight: "6 AI agents, alpha testing",
        tech: ["GCP", "Firebase", "AI Agents", "Python", "TypeScript", "SendGrid"],
        color: "cyan",
      },
      {
        name: "Ad-Nav (This Site)",
        status: "Live",
        description:
          "Cyberpunk-themed personal portfolio doubling as a machine-readable context portfolio. Comes with an MCP server for Claude Desktop and Claude Code, REST APIs for agent consumption, and a blog. Built agent-first with Claude Code and deployed on GCP Cloud Run.",
        highlight: "MCP server + 10 context files",
        tech: ["Next.js", "TypeScript", "Tailwind CSS", "MCP", "GCP Cloud Run"],
        color: "purple",
      },
      {
        name: "Downton",
        status: "Building",
        description:
          "Personal AI agent host running on a Late 2018 Mac Mini. Six agents named after Edwardian household staff (Carson, Florence, Isabella, Jeeves, Daisy, Luca) orchestrated through OpenClaw and n8n. Carson acts as the head butler, orchestrating tasks across the roster.",
        highlight: "6 Edwardian-themed agents",
        tech: ["Mac Mini", "OpenClaw", "n8n", "AI Agents", "Self-Hosted"],
        color: "pink",
      },
    ],
  },
  {
    heading: "at_compare_the_market",
    icon: <Briefcase className="w-5 h-5" />,
    projects: [
      {
        name: "Agent-First Delivery Model",
        status: "Active",
        description:
          "Designed and rolled out an agent-first delivery model across multiple engineering teams. Engineers work at the architecture and verification layer while AI agents handle implementation. Full agentic development, not just copilot-style autocomplete. Force multiplication, not linear scaling.",
        highlight: "Significant cycle time reduction",
        tech: ["AI Agents", "Spec-Driven Dev", "Architecture"],
        color: "purple",
      },
      {
        name: "Partner AI Data Mapping",
        status: "Shipped",
        description:
          "Built a POC comparing a trained ML model against an agent-based approach for automating partner data mapping. Chose agents for maintainability, explainability, and FCA regulatory compliance over the technically impressive trained model. Reduced integration effort by 60% across multiple verticals.",
        highlight: "60% effort reduction",
        tech: ["ML", "AI Agents", "Claude", ".NET", "Azure"],
        color: "pink",
      },
      {
        name: "DNI Cross-Platform Release",
        status: "Shipped",
        description:
          "Led delivery of inclusive language changes (Mx titles, non-gendered job roles) across every product journey and partner integration. Coordinated 300+ engineers for a zero-downtime release under FCA pressure. Inherited a slipping programme six months before go-live. Introduced rehearsals, runbooks, and premortems.",
        highlight: "300+ engineers, zero downtime",
        tech: ["Programme Management", "Cross-Platform", "FCA", "Risk"],
        color: "cyan",
      },
      {
        name: "Partner Onboarding Dashboard",
        status: "Shipped",
        description:
          "Built a live stakeholder dashboard for the money vertical, making partner onboarding progress visible without engineers becoming the communication bottleneck. Partners tracked through onboarding stages with blockers and owners. Removed myself as the single point of failure for status updates.",
        highlight: "Visibility without bottlenecks",
        tech: ["Confluence", "Stakeholder Management", "Process Design"],
        color: "purple",
      },
      {
        name: "Home Insurance Auto-Fill",
        status: "Shipped",
        description:
          "Designed and delivered an auto-fill product feature for Home Insurance that improved conversion. Introduced architectural patterns that improved system resilience and laid foundations for data-driven decisioning.",
        highlight: "Conversion improvement",
        tech: [".NET", "Azure", "React", "APIs"],
        color: "pink",
      },
    ],
  },
  {
    heading: "client_work",
    icon: <Code2 className="w-5 h-5" />,
    projects: [
      {
        name: "Barbon Insurance Platform",
        status: "Delivered",
        description:
          "Led architecture and build of a microservices-based referencing and insurance platform. Introduced CI/CD, API-driven integrations, and modern DevOps practices. Contract role through Digital Illumination.",
        highlight: "Full platform rebuild",
        tech: ["Microservices", "CI/CD", ".NET", "APIs"],
        color: "pink",
      },
      {
        name: "University of Oxford Financial Controls",
        status: "Delivered",
        description:
          "Built bespoke financial control systems for the University of Oxford that saved over £1M in audit findings. Delivered through Niddocks as part of a seven-year client engagement.",
        highlight: "£1M+ audit savings",
        tech: ["Java", "Oracle", "Financial Systems"],
        color: "cyan",
      },
    ],
  },
  {
    heading: "back_burner",
    icon: <Globe className="w-5 h-5" />,
    projects: [
      {
        name: "Bike Boss",
        status: "Paused",
        description:
          "Bike-flipping side project with my son Isaac. Buy, fix, sell. The spreadsheet is ready but time is not. Parked until the apprenticeship wraps up.",
        highlight: "Father-son project",
        tech: ["Spreadsheets", "Patience", "Enduro Bikes"],
        color: "cyan",
      },
    ],
  },
];

const statusColors: Record<string, string> = {
  Building: "text-neon-pink border-neon-pink/30 bg-neon-pink/5",
  Live: "text-neon-cyan border-neon-cyan/30 bg-neon-cyan/5",
  Active: "text-neon-cyan border-neon-cyan/30 bg-neon-cyan/5",
  Shipped: "text-neon-purple border-neon-purple/30 bg-neon-purple/5",
  Delivered: "text-neon-purple border-neon-purple/30 bg-neon-purple/5",
  Paused: "text-text-dim border-border-glow bg-border-glow/5",
};

const colorTextMap = {
  purple: "text-neon-purple",
  pink: "text-neon-pink",
  cyan: "text-neon-cyan",
};

export default function ProjectsPage() {
  let cardIndex = 0;

  return (
    <div className="page-transition py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-mono text-neon-cyan mb-4 tracking-widest uppercase">
            // projects.md
          </p>
          <GlitchText
            text="Projects"
            as="h1"
            className="text-4xl sm:text-5xl font-mono font-bold neon-text-purple mb-4"
          />
          <p className="text-text-secondary font-mono">
            From enterprise delivery to personal AI experiments.
          </p>
        </div>

        {sections.map((section, sectionIndex) => {
          const isLast = sectionIndex === sections.length - 1;
          return (
            <div key={section.heading}>
              {/* Section heading */}
              <h2 className="text-lg font-mono font-bold text-neon-cyan mb-8 flex items-center gap-3">
                {section.icon}
                // {section.heading}
              </h2>

              {/* Project cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {section.projects.map((project) => {
                  const delay = cardIndex * 100;
                  cardIndex++;
                  return (
                    <div
                      key={project.name}
                      style={{
                        animation: `contact-card-enter 0.5s ease-out ${delay}ms both`,
                      }}
                    >
                      <NeonCard className="h-full">
                        {/* Header row */}
                        <div className="flex items-start justify-between mb-1">
                          <h3 className={`text-lg font-mono font-bold ${colorTextMap[project.color]}`}>
                            {project.name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-mono border rounded shrink-0 ml-3 ${statusColors[project.status]}`}
                          >
                            {project.status}
                          </span>
                        </div>

                        {/* Impact highlight */}
                        {project.highlight && (
                          <p
                            className={`text-xs font-mono ${colorTextMap[project.color]} mb-3`}
                            style={{ textShadow: "0 0 10px currentColor" }}
                          >
                            {project.highlight}
                          </p>
                        )}

                        {/* Description */}
                        <p className="text-sm text-text-secondary leading-relaxed mb-4">
                          {project.description}
                        </p>

                        {/* Tech tags */}
                        <div className="flex flex-wrap gap-1.5 mt-auto">
                          {project.tech.map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 text-xs font-mono border border-border-glow text-text-dim rounded hover:text-neon-purple hover:border-neon-purple/50 transition-colors"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </NeonCard>
                    </div>
                  );
                })}
              </div>

              {/* Section divider */}
              {!isLast && (
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

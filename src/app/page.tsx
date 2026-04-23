import type { Metadata } from "next";
import GlitchText from "@/components/GlitchText";
import TypingText from "@/components/TypingText";
import NeonCard from "@/components/NeonCard";
import Link from "next/link";
import Image from "next/image";
import { Briefcase, Bot, FileCode } from "lucide-react";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    absolute:
      "Ad-Nav | Adam Stacey — Mapping Success for Teams, Technology, and Transformation",
  },
  description:
    "Head of Technology at Compare the Market. AI apprentice, digital transformation leader, and agent-first builder.",
  alternates: { canonical: "/" },
};

const highlights: { icon: ReactNode; title: string; description: string; color: string }[] = [
  {
    icon: <Briefcase className="w-8 h-8" />,
    title: "20+ Years in Tech",
    description:
      "From Capital One to Compare the Market, navigating the ever-evolving world of technology.",
    color: "neon-purple",
  },
  {
    icon: <Bot className="w-8 h-8" />,
    title: "Agent-First Journey",
    description:
      "Building PicoPouch, studying AI & Data Science, and exploring the frontier of AI agents.",
    color: "neon-pink",
  },
  {
    icon: <FileCode className="w-8 h-8" />,
    title: "Context Portfolio",
    description:
      "This site doubles as a machine-readable context portfolio for MCP and AI agents.",
    color: "neon-cyan",
  },
];

export default function Home() {
  return (
    <div className="page-transition">
      {/* Hero Section */}
      <section className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 text-center relative">
        {/* Radial glow behind hero */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] lg:w-[600px] lg:h-[600px] bg-neon-purple/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-4xl">
          <p className="text-sm font-mono text-neon-cyan mb-4 tracking-widest uppercase">
            // initialising connection...
          </p>

          <div className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-6 rounded-full overflow-hidden border-2 border-neon-purple hero-photo-pulse">
            <Image
              src="/images/adam-headshot.jpg"
              alt="Adam Stacey"
              width={160}
              height={160}
              sizes="(max-width: 640px) 128px, 160px"
              className="object-cover w-full h-full brightness-90 saturate-[0.85]"
              priority
            />
          </div>

          <GlitchText
            text="Ad-Nav"
            as="h1"
            className="text-6xl sm:text-8xl font-mono font-bold neon-text-purple hero-text-pulse mb-6"
          />

          <h2 className="text-xl sm:text-2xl font-mono text-text-secondary mb-8 min-h-[3.5rem] sm:min-h-[2rem]">
            <TypingText
              phrases={[
                "Head of Technology @ Compare the Market",
                "AI & Data Science Apprentice",
                "Digital Transformation Navigator",
                "Building the agent-first future",
                "Grumpy-yet-charming since 1982",
              ]}
              className="text-neon-pink"
            />
          </h2>

          <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Mapping Success for Teams, Technology, and Transformation.
            <br />
            <span className="text-text-dim">
              Tech leader, problem solver, and occasional grumbler. Always
              with charm, obviously.
            </span>
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/about"
              className="px-6 py-3 font-mono text-sm bg-neon-purple/10 border border-neon-purple text-neon-purple rounded-lg hover:bg-neon-purple/20 hover:shadow-[0_0_20px_var(--neon-purple-glow)] transition-all duration-300"
            >
              About Me
            </Link>
            <Link
              href="/blog"
              className="px-6 py-3 font-mono text-sm bg-neon-pink/10 border border-neon-pink text-neon-pink rounded-lg hover:bg-neon-pink/20 hover:shadow-[0_0_20px_var(--neon-pink-glow)] transition-all duration-300"
            >
              Read the Blog
            </Link>
            <Link
              href="/context"
              className="px-6 py-3 font-mono text-sm bg-neon-cyan/10 border border-neon-cyan text-neon-cyan rounded-lg hover:bg-neon-cyan/20 hover:shadow-[0_0_20px_var(--neon-cyan-glow)] transition-all duration-300"
            >
              Agent Context
            </Link>
          </div>
        </div>
      </section>

      {/* Neon Divider */}
      <div className="relative w-full h-40 sm:h-56 overflow-hidden">
        <Image
          src="/images/neon-divider.jpg"
          alt=""
          fill
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-transparent to-[#0a0a0f]" />
      </div>

      {/* Highlights Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-mono font-bold text-center mb-12">
            <span className="text-neon-cyan">// </span>
            <span className="gradient-text">quick_overview</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {highlights.map((item) => (
              <NeonCard key={item.title}>
                <div className={`text-${item.color} mb-4 flex justify-center`}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-mono font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {item.description}
                </p>
              </NeonCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <NeonCard animated>
            <h2 className="text-2xl font-mono font-bold neon-text-purple mb-4 neon-flicker">
              Let&apos;s Connect
            </h2>
            <p className="text-text-secondary mb-6">
              Whether it&apos;s digital transformation, AI agents, or technology
              strategy, I&apos;m always up for a conversation over a virtual
              coffee (or a proper tea).
            </p>
            <Link
              href="/contact"
              className="inline-block px-8 py-3 font-mono text-sm bg-neon-purple text-white rounded-lg hover:shadow-[0_0_30px_var(--neon-purple-glow)] transition-all duration-300"
            >
              Get in Touch
            </Link>
          </NeonCard>
        </div>
      </section>
    </div>
  );
}

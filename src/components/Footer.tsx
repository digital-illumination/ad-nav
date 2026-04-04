import Link from "next/link";
import { Mail, Rss } from "lucide-react";

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-border-glow bg-[#0a0a0f]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <span className="text-xl font-mono font-bold neon-text-purple">
              Ad-Nav
            </span>
            <p className="mt-2 text-sm text-text-secondary">
              Mapping Success for Teams, Technology, and Transformation.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-mono text-neon-cyan mb-3">
              // navigation
            </h3>
            <div className="grid grid-cols-2 gap-1">
              {[
                { href: "/about", label: "About" },
                { href: "/cv", label: "CV" },
                { href: "/blog", label: "Blog" },
                { href: "/projects", label: "Projects" },
                { href: "/context", label: "Context" },
                { href: "/contact", label: "Contact" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-text-secondary hover:text-neon-purple transition-colors font-mono"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-sm font-mono text-neon-cyan mb-3">
              // connect
            </h3>
            <div className="flex flex-col gap-1">
              <a
                href="mailto:adam@ad-nav.co.uk"
                className="text-sm text-text-secondary hover:text-neon-pink transition-colors font-mono flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                adam@ad-nav.co.uk
              </a>
              <a
                href="https://www.linkedin.com/in/adamcstacey/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-secondary hover:text-neon-pink transition-colors font-mono flex items-center gap-2"
              >
                <LinkedinIcon className="w-4 h-4" />
                LinkedIn
              </a>
              <a
                href="https://github.com/digital-illumination"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-secondary hover:text-neon-pink transition-colors font-mono flex items-center gap-2"
              >
                <GithubIcon className="w-4 h-4" />
                GitHub
              </a>
              <a
                href="/feed.xml"
                className="text-sm text-text-secondary hover:text-neon-pink transition-colors font-mono flex items-center gap-2"
              >
                <Rss className="w-4 h-4" />
                RSS Feed
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border-glow flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-text-dim font-mono">
            &copy; {new Date().getFullYear()} Adam Stacey. All rights reserved.
          </p>
          <p className="text-xs text-text-dim font-mono">
            <span className="text-neon-purple/50">&#9632;</span> Built with
            purpose. Powered by curiosity.
          </p>
        </div>
      </div>
    </footer>
  );
}

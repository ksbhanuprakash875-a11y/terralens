import { Github, Sparkles } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border/50 py-8 md:py-10" role="contentinfo">
    <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
      <span className="font-semibold gradient-text">🛰️ TerraLens</span>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full glass text-xs">
          <Sparkles className="w-3 h-3 text-primary" aria-hidden="true" /> Built with AI
        </span>
        <a
          href="https://github.com/Aniket886/terralens"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
          aria-label="View source on GitHub"
        >
          <Github className="w-4 h-4" />
        </a>
      </div>
    </div>
  </footer>
);

export default Footer;

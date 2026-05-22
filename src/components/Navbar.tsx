import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Menu, X, FlaskConical, User, LogOut, Sun, Moon, ShieldCheck } from "lucide-react";
import { useHealthCheck } from "@/hooks/useHealthCheck";
import { isDemoMode, setDemoMode } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useTheme } from "@/hooks/useTheme";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const links = [
  { to: "/", label: "Home" },
  { to: "/enhance", label: "Enhance" },
  { to: "/gallery", label: "Gallery" },
  { to: "/map-gallery", label: "Map" },
  { to: "/about", label: "About" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { connected, demoMode, recheck } = useHealthCheck();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useAdminCheck();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleDemo = () => {
    setDemoMode(!isDemoMode());
    recheck();
  };

  const statusColor = demoMode
    ? "bg-amber-400"
    : connected === null
    ? "bg-muted-foreground animate-pulse"
    : connected
    ? "bg-emerald-400"
    : "bg-destructive animate-pulse";

  const statusLabel = demoMode
    ? "Demo Mode — simulating API responses"
    : connected === null
    ? "Checking API..."
    : connected
    ? "API Connected"
    : "API Disconnected";

  const tooltipAction = demoMode
    ? "disable demo mode and use real API"
    : connected
    ? "enable demo mode"
    : "enable demo mode (recommended — backend unavailable)";

  return (
    <>
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled ? "glass glow-cyan-sm" : "bg-transparent"
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-bold"
            aria-label="TerraLens Home"
          >
            <span className="text-2xl" aria-hidden="true">🛰️</span>
            <span className="gradient-text">TerraLens</span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "nav-underline px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === l.to
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={location.pathname === l.to ? "page" : undefined}
              >
                {l.label}
              </Link>
            ))}

            {/* Demo toggle + health indicator — only visible when demo mode is off */}
            {!demoMode && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleDemo}
                    className={cn(
                      "ml-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all btn-press",
                      !connected && connected !== null
                        ? "bg-destructive/15 text-destructive border border-destructive/30"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-label={`${statusLabel}. Click to ${tooltipAction}.`}
                  >
                    <span className={cn("w-2 h-2 rounded-full transition-colors", statusColor)} />
                    {!connected && connected !== null && "Disconnected"}
                    {connected && "API"}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-[220px] text-center">
                  {statusLabel}
                  <br />
                  <span className="text-muted-foreground">Click to {tooltipAction}</span>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Auth link */}
            {!authLoading && (
              user ? (
                <>
                  <Link
                    to="/dashboard"
                    className={cn(
                      "ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all btn-press",
                      location.pathname === "/dashboard"
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <User className="w-4 h-4" />
                    Dashboard
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all btn-press",
                        location.pathname === "/admin"
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Admin
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  to="/auth"
                  className="ml-2 px-4 py-1.5 rounded-xl text-sm font-semibold btn-gradient text-primary-foreground transition-all btn-press shimmer"
                >
                  Sign in
                </Link>
              )
            )}

            {/* Theme toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleTheme}
                  className="ml-2 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all btn-press"
                  aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Switch to {theme === "dark" ? "light" : "dark"} mode
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Mobile toggle */}
          <div className="flex md:hidden items-center gap-2">
            {!demoMode && (
              <button
                onClick={toggleDemo}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all text-muted-foreground"
                aria-label={`${statusLabel}. Tap to toggle.`}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", statusColor)} />
                API
              </button>
            )}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              className="text-foreground btn-press p-2 rounded-lg"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile slide-in drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[55] bg-background/60 backdrop-blur-sm md:hidden"
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-[60] w-64 glass border-l border-border/50 md:hidden flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <span className="gradient-text font-bold">Menu</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground btn-press"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="flex flex-col p-4 gap-1">
                {links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className={cn(
                      "px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                      location.pathname === l.to
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                    aria-current={location.pathname === l.to ? "page" : undefined}
                  >
                    {l.label}
                  </Link>
                ))}

                {/* Mobile auth link */}
                {!authLoading && (
                  user ? (
                    <>
                      <Link
                        to="/dashboard"
                        className={cn(
                          "px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center gap-2",
                          location.pathname === "/dashboard"
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                      >
                        <User className="w-4 h-4" /> Dashboard
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          className={cn(
                            "px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center gap-2",
                            location.pathname === "/admin"
                              ? "text-primary bg-primary/10"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                          )}
                        >
                          <ShieldCheck className="w-4 h-4" /> Admin
                        </Link>
                      )}
                    </>
                  ) : (
                    <Link
                      to="/auth"
                      className="px-4 py-3 rounded-xl text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                    >
                      Sign in
                    </Link>
                  )
                )}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;

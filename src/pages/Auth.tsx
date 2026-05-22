import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2, ArrowLeft, CheckCircle2, Lock, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMethod, setAuthMethod] = useState<"password" | "magic">("password");
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setSending(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setSending(false);
      if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      } else {
        toast({ title: "Check your email", description: "We sent you a verification link to confirm your account." });
        setSent(true);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setSending(false);
      if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });

    setSending(false);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setSent(true);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="glass rounded-2xl p-8 md:p-10 border border-border/50">
            {!sent ? (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                    <Mail className="w-7 h-7 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    {isSignUp ? "Create your" : "Sign in to"}{" "}
                    <span className="gradient-text">TerraLens</span>{" "}
                    {isSignUp ? "account" : ""}
                  </h1>
                </div>

                <Tabs
                  value={authMethod}
                  onValueChange={(v) => setAuthMethod(v as "password" | "magic")}
                  className="mb-4"
                >
                  <TabsList className="grid w-full grid-cols-2 rounded-xl">
                    <TabsTrigger value="password" className="rounded-lg text-xs">
                      <Lock className="w-3.5 h-3.5 mr-1.5" />
                      Email & Password
                    </TabsTrigger>
                    <TabsTrigger value="magic" className="rounded-lg text-xs">
                      <Mail className="w-3.5 h-3.5 mr-1.5" />
                      Magic Link
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="password" className="mt-4">
                    <form onSubmit={handlePasswordAuth} className="space-y-4">
                      <div>
                        <Label htmlFor="email-pw" className="text-sm font-medium text-foreground">
                          Email address
                        </Label>
                        <Input
                          id="email-pw"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={sending}
                          className="mt-1.5 rounded-xl bg-muted/50 border-border"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password" className="text-sm font-medium text-foreground">
                          Password
                        </Label>
                        <div className="relative mt-1.5">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={sending}
                            minLength={6}
                            className="rounded-xl bg-muted/50 border-border pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={sending || !email.trim() || !password.trim()}
                        className="w-full rounded-xl btn-gradient text-primary-foreground font-semibold py-5 shimmer"
                      >
                        {sending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {isSignUp ? "Creating account..." : "Signing in..."}
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            {isSignUp ? "Create Account" : "Sign In"}
                          </>
                        )}
                      </Button>

                      {!isSignUp && (
                        <p className="text-xs text-muted-foreground text-center">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!email.trim()) {
                                toast({ variant: "destructive", title: "Enter your email", description: "Please enter your email address first." });
                                return;
                              }
                              setSending(true);
                              const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                                redirectTo: `${window.location.origin}/reset-password`,
                              });
                              setSending(false);
                              if (error) {
                                toast({ variant: "destructive", title: "Error", description: error.message });
                              } else {
                                toast({ title: "Check your email", description: "We sent you a password reset link." });
                              }
                            }}
                            className="text-primary hover:underline font-medium"
                          >
                            Forgot password?
                          </button>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground text-center">
                        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                        <button
                          type="button"
                          onClick={() => setIsSignUp(!isSignUp)}
                          className="text-primary hover:underline font-medium"
                        >
                          {isSignUp ? "Sign in" : "Sign up"}
                        </button>
                      </p>
                    </form>
                  </TabsContent>

                  <TabsContent value="magic" className="mt-4">
                    <form onSubmit={handleMagicLink} className="space-y-4">
                      <div>
                        <Label htmlFor="email-magic" className="text-sm font-medium text-foreground">
                          Email address
                        </Label>
                        <Input
                          id="email-magic"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={sending}
                          className="mt-1.5 rounded-xl bg-muted/50 border-border"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={sending || !email.trim()}
                        className="w-full rounded-xl btn-gradient text-primary-foreground font-semibold py-5 shimmer"
                      >
                        {sending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Magic Link
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-muted-foreground text-center">
                        No password needed. We'll email you a secure sign-in link.
                      </p>
                    </form>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="text-center py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                >
                  <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
                </motion.div>
                <h2 className="text-xl font-bold text-foreground mb-2">Check your inbox</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  We sent {authMethod === "magic" ? "a magic link" : "a verification link"} to{" "}
                  <span className="text-foreground font-medium">{email}</span>
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSent(false)}
                  className="rounded-xl"
                >
                  Try a different email
                </Button>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-border/30 text-center">
              <Link
                to="/"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to home
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default Auth;

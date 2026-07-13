import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, User, ArrowRight, ShieldCheck, KeyRound } from "lucide-react";

type AuthMode = "signin" | "signup" | "forgot" | "reset";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation();
  const signupMutation = trpc.auth.signup.useMutation();
  const requestResetMutation = trpc.auth.requestPasswordReset.useMutation();
  const resetPasswordMutation = trpc.auth.resetPassword.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signin") {
        await loginMutation.mutateAsync({ email, password });
        toast.success("Welcome back to LARO!");
        await utils.auth.me.invalidate();
      } else if (mode === "signup") {
        await signupMutation.mutateAsync({ email, password, name });
        toast.success("Account created! Welcome to LARO.");
        await utils.auth.me.invalidate();
      } else if (mode === "forgot") {
        await requestResetMutation.mutateAsync({ email });
        toast.success("If an account exists for that email, a reset code has been sent.");
        setMode("reset");
      } else if (mode === "reset") {
        await resetPasswordMutation.mutateAsync({ email, code, newPassword });
        toast.success("Password reset. You can now sign in.");
        setPassword("");
        setCode("");
        setNewPassword("");
        setMode("signin");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<AuthMode, string> = {
    signin: "Sign In",
    signup: "Create Account",
    forgot: "Reset Password",
    reset: "Enter Reset Code",
  };
  const descriptions: Record<AuthMode, string> = {
    signin: "Enter your credentials to access your legal dashboard",
    signup: "Join LARO to start consolidating your legal evidence",
    forgot: "Enter your email and we'll send you a 6-digit reset code",
    reset: "Enter the code from your email and choose a new password",
  };
  const submitLabels: Record<AuthMode, string> = {
    signin: "Sign In",
    signup: "Sign Up",
    forgot: "Send Reset Code",
    reset: "Reset Password",
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 shadow-2xl shadow-primary/10">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white uppercase letter-spacing-widest">LARO</h1>
          </div>
          <p className="text-muted-foreground">Your self-hosted legal evidence agent</p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">{titles[mode]}</CardTitle>
            <CardDescription>{descriptions[mode]}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="John Doe"
                      type="text"
                      className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Email — shown for every mode except the final reset step,
                  where it's locked to the address the code was sent to. */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    placeholder="name@example.com"
                    type="email"
                    className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={mode === "reset"}
                  />
                </div>
              </div>

              {mode === "reset" && (
                <div className="space-y-2">
                  <Label htmlFor="code">Reset Code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="code"
                      placeholder="123456"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className="pl-10 h-12 tracking-[0.5em] bg-background/50 border-border/50 focus:border-primary/50"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      required
                    />
                  </div>
                </div>
              )}

              {(mode === "signin" || mode === "signup") && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      placeholder="••••••••"
                      type="password"
                      className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {mode === "reset" && (
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      placeholder="At least 8 characters"
                      type="password"
                      minLength={8}
                      className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {mode === "signin" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-4">
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {submitLabels[mode]}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>

              <div className="text-center space-y-2">
                {(mode === "signin" || mode === "signup") && (
                  <button
                    type="button"
                    onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                  >
                    {mode === "signin"
                      ? "Don't have an account? Sign up"
                      : "Already have an account? Sign in"}
                  </button>
                )}

                {mode === "reset" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="block w-full text-sm text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                  >
                    Didn't get a code? Resend
                  </button>
                )}

                {(mode === "forgot" || mode === "reset") && (
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="block w-full text-sm text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                  >
                    Back to sign in
                  </button>
                )}
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

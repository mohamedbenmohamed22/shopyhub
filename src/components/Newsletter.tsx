import { Button } from "@/components/ui/button";
import { TrophyIcon } from "./TrophyIcon";
import { Mail, Bell, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const Newsletter = () => {
  const [email, setEmail] = useState("");

  const subscribe = useMutation({
    mutationFn: (value: string) => api.subscribe(value),
    onSuccess: () => {
      toast.success("You're subscribed!", {
        description: "Get ready for weekly product discoveries in your inbox.",
      });
      setEmail("");
    },
    onError: (err: Error) => {
      toast.error("Subscription failed", { description: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) subscribe.mutate(email);
  };

  return (
    <section id="subscribe" className="py-20 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />

      <div className="container relative mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Icon */}
          <div
            className="w-20 h-20 mx-auto rounded-2xl gradient-gold flex items-center justify-center shadow-gold animate-float opacity-0 animate-fade-up"
            style={{ animationFillMode: "forwards" }}
          >
            <Bell className="w-10 h-10 text-primary-foreground" />
          </div>

          {/* Content */}
          <div className="space-y-4 opacity-0 animate-fade-up delay-100" style={{ animationFillMode: "forwards" }}>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
              Never Miss a Winner
            </h2>
            <p className="text-muted-foreground text-lg">
              Get the Product of the Week delivered straight to your inbox every Monday. 
              Join thousands of product enthusiasts staying ahead of the curve.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto opacity-0 animate-fade-up delay-200"
            style={{ animationFillMode: "forwards" }}
          >
            <div className="relative flex-1">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
            </div>
            <Button type="submit" variant="gold" size="lg" disabled={subscribe.isPending}>
              <Sparkles className="w-5 h-5" />
              {subscribe.isPending ? "Subscribing…" : "Subscribe"}
            </Button>
          </form>

          {/* Trust signals */}
          <p className="text-sm text-muted-foreground opacity-0 animate-fade-up delay-300" style={{ animationFillMode: "forwards" }}>
            ✨ Free forever · No spam · Unsubscribe anytime
          </p>
        </div>
      </div>
    </section>
  );
};

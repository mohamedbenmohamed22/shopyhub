import { TrophyIcon } from "./TrophyIcon";
import { Heart } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
              <TrophyIcon size="md" className="text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                Product<span className="text-primary">Weekly</span>
              </h3>
              <p className="text-xs text-muted-foreground">Discover winning products</p>
            </div>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6">
            <a
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </a>
            <a
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Submit Product
            </a>
            <a
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Archive
            </a>
          </nav>

          {/* Made with */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            Made with <Heart className="w-4 h-4 text-primary fill-primary" /> for product lovers
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ProductWeekly. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

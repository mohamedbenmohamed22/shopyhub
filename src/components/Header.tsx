import { HashLink as Link } from "react-router-hash-link";
import { TrophyIcon } from "./TrophyIcon";
import { Badge } from "@/components/ui/badge";
import { CartSheet } from "./CartSheet";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shadow-gold">
              <TrophyIcon size="md" className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground">
                Product<span className="text-primary">Weekly</span>
              </h1>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/shop"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Shop
            </Link>
            <Link
              to="/#this-week"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              This Week
            </Link>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-2">
            <Badge variant="winner" className="hidden sm:flex">
              Week 50, 2024
            </Badge>
            <CartSheet />
          </div>
        </div>
      </div>
    </header>
  );
};

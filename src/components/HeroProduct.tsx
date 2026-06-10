import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrophyIcon } from "./TrophyIcon";
import { Product } from "./ProductCard";
import { Sparkles, ArrowUpRight, ShoppingCart } from "lucide-react";

interface HeroProductProps {
  product: Product;
}

export const HeroProduct = ({ product }: HeroProductProps) => {
  return (
    <section className="relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />

      <div className="container relative mx-auto px-4 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="space-y-6 opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>
            {/* Week indicator */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-primary">
                <TrophyIcon size="lg" />
                <Badge variant="winner" className="text-xs">
                  Product of the Week
                </Badge>
              </div>
            </div>

            {/* Week number */}
            <div className="flex items-center gap-2">
              <Badge variant="week">
                Week {product.weekNumber}, {product.year}
              </Badge>
              <Badge variant="gold">{product.category}</Badge>
            </div>

            {/* Product name */}
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              {product.name}
            </h1>

            {/* Tagline */}
            <p className="text-xl md:text-2xl text-muted-foreground font-light">
              {product.tagline}
            </p>

            {/* Description */}
            <p className="text-muted-foreground/80 text-lg max-w-xl leading-relaxed">
              {product.description}
            </p>

            {/* Price & Stats */}
            <div className="flex items-center gap-6 py-4">
              <div className="text-center">
                <div className="text-3xl font-heading font-bold text-primary">
                  {product.price} TND
                </div>
                <div className="text-sm text-muted-foreground">price</div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <div className="text-3xl font-heading font-bold text-foreground">
                  {product.votes.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">votes</div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <div className="text-3xl font-heading font-bold text-primary">
                  #1
                </div>
                <div className="text-sm text-muted-foreground">this week</div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-wrap gap-4 pt-2">
              <Button variant="gold" size="lg" asChild>
                <Link to={`/product/${product.id}`}>
                  <ShoppingCart className="w-5 h-5" />
                  Order Now
                  <ArrowUpRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="gold-outline" size="lg">
                Share Winner
              </Button>
            </div>
          </div>

          {/* Product image */}
          <div
            className="relative opacity-0 animate-fade-up delay-200"
            style={{ animationFillMode: "forwards" }}
          >
            <div className="relative rounded-3xl overflow-hidden border border-border group">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              
              <div className="relative rounded-3xl overflow-hidden border border-primary/20">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full aspect-[4/3] object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Winner overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                
                {/* Floating badge */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center justify-between bg-card/90 backdrop-blur-sm rounded-2xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center shadow-gold">
                        <TrophyIcon size="md" className="text-primary-foreground" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{product.name}</div>
                        <div className="text-sm text-muted-foreground">Week {product.weekNumber} Winner</div>
                      </div>
                    </div>
                    <Badge variant="gold" className="animate-pulse-glow">
                      🏆 #1
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

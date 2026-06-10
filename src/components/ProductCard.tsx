import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrophyIcon } from "./TrophyIcon";
import { ArrowUpRight, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";

const LOW_STOCK_THRESHOLD = 5;

export interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  imageUrl: string;
  category: string;
  weekNumber: number;
  year: number;
  votes: number;
  link: string;
  isCurrentWinner?: boolean;
  price?: number;
  stock?: number;
  images?: string[];
  properties?: Record<string, unknown>;
  tags?: { id: string; name: string; slug?: string; color?: string | null }[];
}

interface ProductCardProps {
  product: Product;
  index?: number;
}

export const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const isWinner = product.isCurrentWinner;
  const { add } = useCart();
  const { toast } = useToast();

  const hasStock = typeof product.stock === "number";
  const outOfStock = hasStock && product.stock! <= 0;
  const lowStock = hasStock && product.stock! > 0 && product.stock! <= LOW_STOCK_THRESHOLD;

  const handleAdd = () => {
    add(product, 1);
    toast({ title: "Added to cart", description: product.name });
  };

  return (
    <Card
      variant={isWinner ? "winner" : "default"}
      className={`group overflow-hidden opacity-0 animate-fade-up ${
        isWinner ? "animate-pulse-glow" : ""
      }`}
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: "forwards" }}
    >
      <div className="relative">
        {/* Product Image */}
        <div className="relative h-48 overflow-hidden bg-muted">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Winner badge */}
          {isWinner && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold shadow-gold">
                <TrophyIcon size="sm" className="text-primary-foreground" />
                <span>Winner</span>
              </div>
            </div>
          )}

          {/* Week badge */}
          <div className="absolute top-4 right-4">
            <Badge variant="week" className="backdrop-blur-sm bg-background/80">
              Week {product.weekNumber}
            </Badge>
          </div>

          {/* Stock badge */}
          {hasStock && (
            <div className="absolute bottom-4 left-4">
              {outOfStock ? (
                <Badge variant="destructive" className="backdrop-blur-sm">
                  Out of stock
                </Badge>
              ) : lowStock ? (
                <Badge className="backdrop-blur-sm bg-amber-500 text-white hover:bg-amber-500">
                  Only {product.stock} left
                </Badge>
              ) : (
                <Badge variant="secondary" className="backdrop-blur-sm bg-background/80">
                  In stock
                </Badge>
              )}
            </div>
          )}
        </div>

        <CardContent className="p-5">
          {/* Category */}
          <Badge variant="gold" className="mb-3">
            {product.category}
          </Badge>

          {/* Product info */}
          <h3 className="font-heading text-xl font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-muted-foreground text-sm mb-3 line-clamp-1">
            {product.tagline}
          </p>
          <p className="text-muted-foreground/80 text-sm line-clamp-2 mb-4">
            {product.description}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{product.price ? `${product.price} TND` : `${product.votes.toLocaleString()} votes`}</span>
            </div>
            <Link
              to={`/product/${product.id}`}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Details
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Add to cart */}
          <Button
            variant={outOfStock ? "outline" : "default"}
            className="w-full mt-4"
            disabled={outOfStock || !product.price}
            onClick={handleAdd}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {outOfStock ? "Out of stock" : "Add to cart"}
          </Button>
        </CardContent>
      </div>
    </Card>
  );
};

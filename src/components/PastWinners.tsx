import { ProductCard, Product } from "./ProductCard";
import { TrophyIcon } from "./TrophyIcon";

interface PastWinnersProps {
  products: Product[];
}

export const PastWinners = ({ products }: PastWinnersProps) => {
  return (
    <section id="past-winners" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-12 space-y-4 opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>
          <div className="flex items-center justify-center gap-2 text-primary">
            <TrophyIcon size="md" />
            <span className="text-sm font-semibold uppercase tracking-wider">Hall of Fame</span>
          </div>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            Past Winners
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover the products that made waves in previous weeks. Each one earned its place through innovation and community votes.
          </p>
        </div>

        {/* Products grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index + 1} />
          ))}
        </div>
      </div>
    </section>
  );
};

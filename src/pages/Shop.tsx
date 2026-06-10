import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { SearchCommand } from "@/components/SearchCommand";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { api, type ProductSort, type TagMatchMode } from "@/lib/api";

const PAGE_SIZE = 12;

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "votes", label: "Most Voted" },
];

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // ---- Filters read from the URL (single source of truth) ----
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const sort = (searchParams.get("sort") as ProductSort | null) ?? "newest";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const tagMode = (searchParams.get("tagMode") as TagMatchMode | null) ?? "any";
  const inStock = searchParams.get("inStock") === "true";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const tags = useMemo(
    () => (searchParams.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    [searchParams],
  );

  // ---- Search command palette (⌘K / Ctrl+K) ----
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** Merge changes into the URL. Any filter change (except page) resets to page 1. */
  const updateParams = (changes: Record<string, string | string[] | null>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(changes)) {
          const serialized = Array.isArray(value) ? value.join(",") : value;
          if (!serialized) next.delete(key);
          else next.set(key, serialized);
        }
        if (!("page" in changes)) next.delete("page");
        return next;
      },
      { replace: true },
    );
  };

  // ---- Debounced text inputs (search + price) ----
  const [searchInput, setSearchInput] = useState(search);
  const [priceInput, setPriceInput] = useState({ min: minPrice, max: maxPrice });
  useEffect(() => setSearchInput(search), [search]);
  useEffect(() => setPriceInput({ min: minPrice, max: maxPrice }), [minPrice, maxPrice]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (searchInput !== search) updateParams({ search: searchInput || null });
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (priceInput.min !== minPrice || priceInput.max !== maxPrice) {
        updateParams({ minPrice: priceInput.min || null, maxPrice: priceInput.max || null });
      }
    }, 450);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceInput]);

  // ---- Data ----
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.getCategories,
  });
  const { data: allTags = [] } = useQuery({ queryKey: ["tags"], queryFn: api.getTags });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products", { search, category, tags, tagMode, minPrice, maxPrice, inStock, sort, page }],
    queryFn: () =>
      api.getProducts({
        search,
        category,
        tags,
        tagMode,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        inStock,
        sort,
        page,
        limit: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const products = data?.data ?? [];
  const meta = data?.meta;

  const toggleTag = (slug: string) => {
    const next = tags.includes(slug) ? tags.filter((t) => t !== slug) : [...tags, slug];
    updateParams({ tags: next });
  };

  const activeCount =
    (search ? 1 : 0) +
    (category ? 1 : 0) +
    tags.length +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (inStock ? 1 : 0);
  const clearFilters = () => setSearchParams({}, { replace: true });

  // ---- Filter panel (shared between desktop sidebar and mobile sheet) ----
  const filterPanel = (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search products…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Availability */}
      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
        <Checkbox
          checked={inStock}
          onCheckedChange={(c) => updateParams({ inStock: c ? "true" : null })}
        />
        In stock only
      </label>

      {/* Categories */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Categories</h3>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => updateParams({ category: null })}
            className={`text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
              !category ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            All categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => updateParams({ category: c.slug })}
              className={`flex items-center justify-between text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                category === c.slug
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <span>{c.name}</span>
              {c.productCount != null && (
                <span className="text-xs text-muted-foreground/70">{c.productCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Price (TND)</h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            placeholder="Min"
            value={priceInput.min}
            onChange={(e) => setPriceInput((p) => ({ ...p, min: e.target.value }))}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            min={0}
            placeholder="Max"
            value={priceInput.max}
            onChange={(e) => setPriceInput((p) => ({ ...p, max: e.target.value }))}
          />
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">Tags</h3>
            {tags.length > 1 && (
              <div className="flex rounded-md border border-border overflow-hidden text-xs">
                {(["any", "all"] as TagMatchMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateParams({ tagMode: mode === "any" ? null : mode })}
                    className={`px-2 py-0.5 capitalize transition-colors ${
                      tagMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map((t) => {
              const active = tags.includes(t.slug);
              return (
                <button key={t.id} onClick={() => toggleTag(t.slug)}>
                  <Badge
                    variant={active ? "default" : "outline"}
                    className="cursor-pointer"
                    style={
                      active && t.color ? { backgroundColor: t.color, borderColor: t.color } : undefined
                    }
                  >
                    {t.name}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10">
        {/* Title */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Shop</h1>
            <p className="text-muted-foreground mt-1">
              Browse every product. Filter by category, tags and price to find your favorite.
            </p>
          </div>
          {/* Search palette trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="group flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 md:w-72"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search products…</span>
            <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
          {/* ---- Desktop filters sidebar ---- */}
          <aside className="hidden lg:block space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 px-2 text-xs text-muted-foreground"
                  onClick={clearFilters}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            {filterPanel}
          </aside>

          {/* ---- Results ---- */}
          <section>
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                {/* Mobile filters trigger */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden">
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      Filters
                      {activeCount > 0 && (
                        <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                          {activeCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px] overflow-y-auto">
                    <SheetHeader className="mb-4 flex-row items-center justify-between">
                      <SheetTitle>Filters</SheetTitle>
                      {activeCount > 0 && (
                        <Button variant="ghost" size="sm" className="text-xs" onClick={clearFilters}>
                          Clear all
                        </Button>
                      )}
                    </SheetHeader>
                    {filterPanel}
                  </SheetContent>
                </Sheet>
                <p className="text-sm text-muted-foreground">
                  {meta ? `${meta.total} product${meta.total === 1 ? "" : "s"}` : " "}
                </p>
              </div>
              <Select value={sort} onValueChange={(v) => updateParams({ sort: v })}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active tag chips */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {tags.map((slug) => {
                  const tag = allTags.find((t) => t.slug === slug);
                  return (
                    <Badge key={slug} variant="secondary" className="gap-1">
                      {tag?.name ?? slug}
                      <button onClick={() => toggleTag(slug)} aria-label={`Remove ${slug}`}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Grid / states */}
            {isError ? (
              <div className="py-24 text-center text-destructive">
                {(error as Error)?.message ?? "Failed to load products."}
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-[460px] rounded-xl" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="py-24 text-center">
                <p className="text-lg font-medium text-foreground">No products found</p>
                <p className="text-muted-foreground mt-1">Try adjusting your filters.</p>
                {activeCount > 0 && (
                  <Button variant="outline" className="mt-4" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {meta && meta.pages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => updateParams({ page: String(page - 1) })}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {meta.page} of {meta.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.pages}
                  onClick={() => updateParams({ page: String(page + 1) })}
                >
                  Next
                </Button>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />

      <SearchCommand
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSubmitQuery={(q) => {
          setSearchInput(q);
          updateParams({ search: q || null });
        }}
      />
    </div>
  );
};

export default Shop;

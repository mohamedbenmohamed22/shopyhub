import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command as CommandPrimitive } from "cmdk";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { api } from "@/lib/api";

interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user submits the raw query (e.g. "See all results"). */
  onSubmitQuery?: (query: string) => void;
}

const MIN_CHARS = 2;

export const SearchCommand = ({ open, onOpenChange, onSubmitQuery }: SearchCommandProps) => {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const navigate = useNavigate();

  // Reset the input each time the dialog opens.
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query]);

  const enabled = debounced.length >= MIN_CHARS;
  const { data, isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => api.getProducts({ search: debounced, limit: 6, sort: "votes" }),
    enabled,
    placeholderData: keepPreviousData,
  });

  const results = enabled ? data?.data ?? [] : [];

  const goToProduct = (id: string) => {
    onOpenChange(false);
    navigate(`/product/${id}`);
  };

  const seeAll = () => {
    if (!debounced) return;
    onOpenChange(false);
    onSubmitQuery?.(debounced);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg sm:max-w-xl">
        {/* shouldFilter=false: results come from the server, not cmdk's local filter. */}
        <CommandPrimitive
          shouldFilter={false}
          className="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2"
        >
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandPrimitive.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search products…"
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            {isFetching && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <CommandList className="max-h-[60vh] overflow-y-auto overflow-x-hidden">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              {!enabled
                ? `Type at least ${MIN_CHARS} characters…`
                : isFetching
                  ? "Searching…"
                  : "No products found."}
            </CommandEmpty>

            {results.length > 0 && (
              <CommandGroup heading="Products">
                {results.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.id}
                    onSelect={() => goToProduct(p.id)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-10 w-10 rounded object-cover bg-muted shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-1">{p.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{p.tagline}</p>
                    </div>
                    {p.price ? (
                      <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                        {p.price} TND
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {enabled && (
              <CommandGroup>
                <CommandItem
                  value="__see_all__"
                  onSelect={seeAll}
                  className="cursor-pointer text-primary"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  See all results for “{debounced}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
};

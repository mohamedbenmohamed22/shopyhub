import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { HeroProduct } from "@/components/HeroProduct";
import { PastWinners } from "@/components/PastWinners";
import { Newsletter } from "@/components/Newsletter";
import { Footer } from "@/components/Footer";
import { api } from "@/lib/api";

const Index = () => {
  const { data: currentWinner, isLoading: loadingWinner } = useQuery({
    queryKey: ["current-winner"],
    queryFn: api.getCurrentWinner,
  });

  const { data: pastWinners = [] } = useQuery({
    queryKey: ["past-winners"],
    queryFn: api.getPastWinners,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {currentWinner ? (
          <HeroProduct product={currentWinner} />
        ) : (
          <div className="container mx-auto px-4 py-24 text-center text-muted-foreground">
            {loadingWinner ? "Loading this week's winner…" : "No winner has been crowned yet."}
          </div>
        )}
        <PastWinners products={pastWinners} />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

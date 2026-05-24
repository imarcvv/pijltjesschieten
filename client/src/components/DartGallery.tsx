import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PaperDart, DartSponsor } from "./PaperDart";
import { DartUnfoldModal } from "./DartUnfoldModal";

export function DartGallery() {
  const { data: recentDarts, isLoading } = trpc.darts.recent.useQuery(
    { limit: 20 },
    { refetchInterval: 5000 } // Poll every 5 seconds for real-time feel
  );

  const [selectedSponsor, setSelectedSponsor] = useState<DartSponsor | null | undefined>(undefined);

  const handleDartClick = (sponsor: DartSponsor | null) => {
    setSelectedSponsor(sponsor);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="paper-card rounded-xl p-3 animate-pulse">
            <div className="h-8 bg-amber-200 rounded-full mb-2" />
            <div className="h-3 bg-amber-100 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!recentDarts || recentDarts.length === 0) {
    return (
      <div className="text-center py-12 font-retro text-amber-700 opacity-70">
        <div className="text-5xl mb-3">🎯</div>
        <p className="text-lg">Nog geen pijltjes geschoten.</p>
        <p className="text-sm mt-1">Wees de eerste!</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {recentDarts.map((dart, i) => {
          const sponsor = dart.sponsor as DartSponsor | null;
          const timeAgo = getTimeAgo(new Date(dart.firedAt));

          return (
            <button
              key={dart.id}
              className="paper-card rounded-xl p-3 text-left hover:scale-105 active:scale-95
                transition-transform duration-150 cursor-pointer group animate-fade-in-up"
              style={{ animationDelay: `${i * 40}ms` }}
              onClick={() => handleDartClick(sponsor)}
              aria-label={`Pijltje van ${sponsor?.name ?? "onbekend"}`}
            >
              {/* Dart visual */}
              <div className="flex justify-center mb-2 group-hover:animate-wiggle">
                <PaperDart
                  sponsor={sponsor}
                  width={90}
                  height={30}
                />
              </div>

              {/* Sponsor name */}
              <p className="font-display text-xs truncate text-center" style={{ color: "#5c3d1e" }}>
                {sponsor?.name ?? "Vrij pijltje"}
              </p>

              {/* Time */}
              <p className="font-retro text-xs text-center opacity-50 mt-0.5" style={{ color: "#8b6914" }}>
                {timeAgo}
              </p>

              {/* Shooter */}
              {dart.shooterName && (
                <p className="font-retro text-xs text-center opacity-40 truncate" style={{ color: "#5c3d1e" }}>
                  door {dart.shooterName}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Unfold modal */}
      {selectedSponsor !== undefined && (
        <DartUnfoldModal
          sponsor={selectedSponsor}
          onClose={() => setSelectedSponsor(undefined)}
        />
      )}
    </>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "zojuist";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m geleden`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}u geleden`;
  return `${Math.floor(seconds / 86400)}d geleden`;
}

export default DartGallery;

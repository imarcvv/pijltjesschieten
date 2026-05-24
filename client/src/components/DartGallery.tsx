import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PaperDart, DartSponsor } from "./PaperDart";
import { DartUnfoldModal } from "./DartUnfoldModal";

interface SelectedDartInfo {
  sponsor: DartSponsor | null;
  isGolden: boolean;
}

export function DartGallery() {
  const { data: recentDarts, isLoading } = trpc.darts.recent.useQuery(
    { limit: 20 },
    { refetchInterval: 5000 } // Poll every 5 seconds for real-time feel
  );

  const [selectedDartInfo, setSelectedDartInfo] = useState<SelectedDartInfo | null>(null);

  const handleDartClick = (sponsor: DartSponsor | null, isGolden: boolean) => {
    setSelectedDartInfo({ sponsor, isGolden });
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
          const isGolden = dart.isGolden ?? false;
          const timeAgo = getTimeAgo(new Date(dart.firedAt));

          return (
            <button
              key={dart.id}
              className="rounded-xl p-3 text-left hover:scale-105 active:scale-95
                transition-transform duration-150 cursor-pointer group animate-fade-in-up relative"
              style={{
                animationDelay: `${i * 40}ms`,
                background: isGolden
                  ? "linear-gradient(135deg, #8B6914 0%, #C8A96E 40%, #FFD700 60%, #FFA500 80%, #C8A96E 100%)"
                  : undefined,
                border: isGolden ? "2px solid #FFD700" : undefined,
                boxShadow: isGolden
                  ? "0 0 12px rgba(255,215,0,0.5), 3px 3px 0 rgba(0,0,0,0.2)"
                  : undefined,
              }}
              onClick={() => handleDartClick(sponsor, isGolden)}
              aria-label={`${isGolden ? "Gouden pijltje" : "Pijltje"} van ${sponsor?.name ?? "onbekend"}`}
            >
              {/* Golden badge */}
              {isGolden && (
                <div
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                  style={{ background: "#FFD700", border: "2px solid #8B6914", zIndex: 1 }}
                  title="Gouden pijltje!"
                >
                  🏆
                </div>
              )}

              {/* Dart visual */}
              <div className={`flex justify-center mb-2 ${!isGolden ? "group-hover:animate-wiggle paper-card rounded-xl p-3" : ""}`}>
                <PaperDart
                  sponsor={sponsor}
                  isGolden={isGolden}
                  width={90}
                  height={30}
                />
              </div>

              {/* Sponsor name */}
              <p className="font-display text-xs truncate text-center"
                style={{ color: isGolden ? "#3d2800" : "#5c3d1e" }}>
                {sponsor?.name ?? "Vrij pijltje"}
              </p>

              {/* Time */}
              <p className="font-retro text-xs text-center opacity-50 mt-0.5"
                style={{ color: isGolden ? "#5c3d1e" : "#8b6914" }}>
                {timeAgo}
              </p>

              {/* Shooter */}
              {dart.shooterName && (
                <p className="font-retro text-xs text-center opacity-40 truncate"
                  style={{ color: isGolden ? "#3d2800" : "#5c3d1e" }}>
                  door {dart.shooterName}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Unfold modal */}
      {selectedDartInfo !== null && (
        <DartUnfoldModal
          sponsor={selectedDartInfo.sponsor}
          isGolden={selectedDartInfo.isGolden}
          onClose={() => setSelectedDartInfo(null)}
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

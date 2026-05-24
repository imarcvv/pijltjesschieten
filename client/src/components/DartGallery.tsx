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
    { refetchInterval: 5000 }
  );

  const [selectedDartInfo, setSelectedDartInfo] = useState<SelectedDartInfo | null>(null);

  const handleDartClick = (sponsor: DartSponsor | null, isGolden: boolean) => {
    setSelectedDartInfo({ sponsor, isGolden });
  };

  if (isLoading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 6 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            background: "#f5f0e8",
            border: "1px solid #c8b89a",
            padding: "8px",
            textAlign: "center",
          }}>
            <div style={{ height: 22, background: "#ddd", marginBottom: 4 }} />
            <div style={{ height: 10, background: "#eee", width: "70%", margin: "0 auto" }} />
          </div>
        ))}
      </div>
    );
  }

  if (!recentDarts || recentDarts.length === 0) {
    return (
      <div style={{
        textAlign: "center",
        padding: "20px 0",
        fontFamily: "Verdana, Arial, sans-serif",
        fontSize: 12,
        color: "#666",
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
        <p style={{ margin: 0, fontWeight: "bold" }}>Nog geen pijltjes geschoten.</p>
        <p style={{ margin: "4px 0 0", color: "#999" }}>Wees de eerste!</p>
      </div>
    );
  }

  return (
    <>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
        gap: 4,
      }}>
        {recentDarts.map((dart, i) => {
          const sponsor = dart.sponsor as DartSponsor | null;
          const isGolden = dart.isGolden ?? false;
          const timeAgo = getTimeAgo(new Date(dart.firedAt));

          return (
            <button
              key={dart.id}
              onClick={() => handleDartClick(sponsor, isGolden)}
              title={`${isGolden ? "🏆 Gouden pijltje" : "Pijltje"} van ${sponsor?.name ?? "onbekend"} — klik om te openen`}
              style={{
                display: "block",
                width: "100%",
                padding: "6px 4px",
                textAlign: "center",
                background: isGolden
                  ? "linear-gradient(135deg, #fff8dc 0%, #ffe066 50%, #fff8dc 100%)"
                  : "#fff",
                border: isGolden ? "2px solid #e6a800" : "1px solid #c8b89a",
                cursor: "pointer",
                position: "relative",
                fontFamily: "Verdana, Arial, sans-serif",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => {
                if (!isGolden) (e.currentTarget as HTMLButtonElement).style.background = "#fffbe6";
              }}
              onMouseLeave={e => {
                if (!isGolden) (e.currentTarget as HTMLButtonElement).style.background = "#fff";
              }}
            >
              {/* Golden badge */}
              {isGolden && (
                <div style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#FFD700",
                  border: "2px solid #8B6914",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  zIndex: 1,
                }}>
                  🏆
                </div>
              )}

              {/* Dart image */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                <PaperDart
                  sponsor={sponsor}
                  isGolden={isGolden}
                  width={110}
                  height={22}
                />
              </div>

              {/* Sponsor name */}
              <div style={{
                fontSize: 10,
                fontWeight: "bold",
                color: isGolden ? "#8B6914" : "#003399",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {sponsor?.name ?? "Vrij pijltje"}
              </div>

              {/* Time */}
              <div style={{ fontSize: 9, color: "#999", marginTop: 1 }}>
                {timeAgo}
              </div>

              {/* Shooter */}
              {dart.shooterName && (
                <div style={{
                  fontSize: 9,
                  color: "#666",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  door {dart.shooterName}
                </div>
              )}
            </button>
          );
        })}
      </div>

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

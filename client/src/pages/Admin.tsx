import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { PaperDart } from "@/components/PaperDart";
import { toast } from "sonner";
import { Link } from "wouter";

const RETRO_FONT = "Verdana, Tahoma, Arial, sans-serif";

const COLORS = [
  { label: "Warm Beige", value: "#e8d5a3" },
  { label: "Amber", value: "#c8a96e" },
  { label: "Geel", value: "#e8b84b" },
  { label: "Rood", value: "#d4472a" },
  { label: "Blauw", value: "#2a6dd4" },
  { label: "Groen", value: "#2ab84b" },
  { label: "Paars", value: "#7a2ad4" },
  { label: "Roze", value: "#d42a8a" },
];

interface SponsorFormData {
  name: string;
  message: string;
  clickUrl: string;
  color: string;
  logoUrl?: string;
  goldenChance: number;
  prizeText: string;
  prizeClaimUrl: string;
}

const EMPTY_FORM: SponsorFormData = {
  name: "",
  message: "",
  clickUrl: "https://",
  color: "#e8d5a3",
  goldenChance: 0.05,
  prizeText: "",
  prizeClaimUrl: "https://",
};

// Retro panel header component
function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "#003399", color: "#fff",
      padding: "4px 10px", fontSize: 12, fontWeight: "bold",
      fontFamily: RETRO_FONT, borderBottom: "1px solid #001a66",
      display: "flex", alignItems: "center", gap: 6,
    }}>
      {children}
    </div>
  );
}

// Retro panel box
function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      border: "1px solid #aaa", background: "#fff",
      marginBottom: 10, ...style,
    }}>
      {children}
    </div>
  );
}

// Retro input style
const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid #999", padding: "3px 6px",
  fontSize: 12, fontFamily: RETRO_FONT, background: "#fff",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: "bold", color: "#333",
  fontFamily: RETRO_FONT, display: "block", marginBottom: 2,
};

export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const [form, setForm] = useState<SponsorFormData>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: sponsors, isLoading: sponsorsLoading } = trpc.sponsors.listAll.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });
  const { data: stats } = trpc.darts.stats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });
  const { data: siteStatus, refetch: refetchSiteStatus } = trpc.site.isActive.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });
  const setActiveMutation = trpc.site.setActive.useMutation({
    onSuccess: (data) => {
      refetchSiteStatus();
      toast.success(data.active ? "✅ Site is nu ACTIEF" : "⏸️ Site is nu UITGESCHAKELD");
    },
    onError: (e) => toast.error(`Fout: ${e.message}`),
  });

  const createMutation = trpc.sponsors.create.useMutation({
    onSuccess: () => { utils.sponsors.listAll.invalidate(); utils.sponsors.listActive.invalidate(); toast.success("Sponsor aangemaakt!"); resetForm(); },
    onError: (e) => toast.error(`Fout: ${e.message}`),
  });
  const updateMutation = trpc.sponsors.update.useMutation({
    onSuccess: () => { utils.sponsors.listAll.invalidate(); utils.sponsors.listActive.invalidate(); toast.success("Sponsor bijgewerkt!"); resetForm(); },
    onError: (e) => toast.error(`Fout: ${e.message}`),
  });
  const deleteMutation = trpc.sponsors.delete.useMutation({
    onSuccess: () => { utils.sponsors.listAll.invalidate(); utils.sponsors.listActive.invalidate(); toast.success("Sponsor verwijderd."); },
  });
  const uploadLogoMutation = trpc.sponsors.uploadLogo.useMutation({
    onSuccess: (data) => { setForm(f => ({ ...f, logoUrl: data.url })); toast.success("Logo geüpload!"); },
    onError: (e) => toast.error(`Logo upload mislukt: ${e.message}`),
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.message || !form.clickUrl) {
      toast.error("Vul alle verplichte velden in.");
      return;
    }
    if (editingId) {
      await updateMutation.mutateAsync({
        id: editingId, name: form.name, message: form.message,
        clickUrl: form.clickUrl, color: form.color,
        goldenChance: form.goldenChance,
        prizeText: form.prizeText || null,
        prizeClaimUrl: form.prizeClaimUrl && form.prizeClaimUrl !== "https://" ? form.prizeClaimUrl : null,
      });
      if (logoFile) {
        const base64 = await fileToBase64(logoFile);
        await uploadLogoMutation.mutateAsync({ sponsorId: editingId, base64, mimeType: logoFile.type, filename: logoFile.name });
      }
    } else {
      const { id } = await createMutation.mutateAsync({
        name: form.name, message: form.message, clickUrl: form.clickUrl,
        color: form.color, goldenChance: form.goldenChance,
        prizeText: form.prizeText || undefined,
        prizeClaimUrl: form.prizeClaimUrl && form.prizeClaimUrl !== "https://" ? form.prizeClaimUrl : undefined,
      });
      if (logoFile && id) {
        const base64 = await fileToBase64(logoFile);
        await uploadLogoMutation.mutateAsync({ sponsorId: id, base64, mimeType: logoFile.type, filename: logoFile.name });
      }
    }
  };

  const handleEdit = (sponsor: any) => {
    setForm({
      name: sponsor.name, message: sponsor.message, clickUrl: sponsor.clickUrl,
      color: sponsor.color, logoUrl: sponsor.logoUrl,
      goldenChance: sponsor.goldenChance ?? 0.05,
      prizeText: sponsor.prizeText ?? "",
      prizeClaimUrl: sponsor.prizeClaimUrl ?? "https://",
    });
    setLogoPreview(sponsor.logoUrl ?? null);
    setEditingId(sponsor.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Auth guard — loading
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#e8e8e8", fontFamily: RETRO_FONT }}>
        <div style={{ fontSize: 32 }}>⏳ Laden...</div>
      </div>
    );
  }

  // Auth guard — not logged in
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: "#e8e8e8", fontFamily: RETRO_FONT }}>
        {/* Hyves-style header */}
        <div style={{ background: "#003399", borderBottom: "3px solid #ffcc00", padding: "4px 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <PaperDart width={55} height={11} />
          <span style={{ color: "#ffcc00", fontWeight: "bold", fontSize: 14 }}>Pijltjesschieten.nl</span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginLeft: 4 }}>— Admin Panel</span>
        </div>
        <div style={{ maxWidth: 400, margin: "60px auto", padding: "0 16px" }}>
          <Panel>
            <PanelHeader>🔒 Admin toegang vereist</PanelHeader>
            <div style={{ padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
              <p style={{ fontSize: 12, color: "#333", marginBottom: 16, fontFamily: RETRO_FONT }}>
                Log in om sponsors en pijltjes te beheren.
              </p>
              <a href={getLoginUrl()} style={{
                display: "inline-block", background: "#003399", color: "#ffcc00",
                fontWeight: "bold", fontSize: 13, padding: "6px 20px",
                border: "2px solid #001a66", textDecoration: "none", fontFamily: RETRO_FONT,
              }}>
                Inloggen »
              </a>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  // Auth guard — not admin
  if (user?.role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", background: "#e8e8e8", fontFamily: RETRO_FONT }}>
        <div style={{ background: "#003399", borderBottom: "3px solid #ffcc00", padding: "4px 12px" }}>
          <span style={{ color: "#ffcc00", fontWeight: "bold", fontSize: 14 }}>Pijltjesschieten.nl — Admin</span>
        </div>
        <div style={{ maxWidth: 400, margin: "60px auto", padding: "0 16px" }}>
          <Panel>
            <PanelHeader>⛔ Geen toegang</PanelHeader>
            <div style={{ padding: 20, textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "#333", marginBottom: 16, fontFamily: RETRO_FONT }}>
                Je hebt geen admin rechten. Vraag de eigenaar om je te promoveren.
              </p>
              <Link href="/">
                <button style={{
                  background: "#ffcc00", color: "#003399", fontWeight: "bold",
                  border: "2px solid #cc9900", padding: "4px 16px", cursor: "pointer", fontFamily: RETRO_FONT,
                }}>← Terug</button>
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#e8e8e8", fontFamily: RETRO_FONT }}>
      {/* ── Hyves-style top header ─────────────────────────────────────────── */}
      <div style={{
        background: "#003399", borderBottom: "3px solid #ffcc00",
        padding: "4px 12px", display: "flex", alignItems: "center", gap: 8,
      }}>
        <Link href="/">
          <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <PaperDart width={55} height={11} />
            <span style={{ color: "#ffcc00", fontWeight: "bold", fontSize: 13, fontFamily: RETRO_FONT }}>
              Pijltjesschieten.nl
            </span>
          </div>
        </Link>
        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.3)", margin: "0 4px" }} />
        <span style={{ color: "#fff", fontWeight: "bold", fontSize: 13 }}>Admin Panel</span>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
          Welkom, {user.name ?? "Admin"}
        </div>
      </div>

      {/* ── Hyves-style sub-nav ─────────────────────────────────────────────── */}
      <div style={{ background: "#001a66", borderBottom: "1px solid #000" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 8px", display: "flex" }}>
          {["Overzicht", "Sponsors", "Statistieken"].map((item, i) => (
            <div key={item} style={{
              padding: "3px 12px", fontSize: 11, fontWeight: "bold",
              color: i === 0 ? "#ffcc00" : "rgba(255,255,255,0.7)",
              cursor: "pointer", borderRight: "1px solid rgba(255,255,255,0.1)",
              fontFamily: RETRO_FONT,
            }}>
              {item}
            </div>
          ))}
          <Link href="/">
            <div style={{
              padding: "3px 12px", fontSize: 11, color: "rgba(255,255,255,0.5)",
              cursor: "pointer", marginLeft: "auto", fontFamily: RETRO_FONT,
            }}>
              ← Terug naar site
            </div>
          </Link>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "8px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 8 }}>

          {/* Left column: Stats + Form + Sponsors list */}
          <div>
            {/* Site on/off toggle panel */}
            <Panel>
              <PanelHeader>⚡ Site Aan/Uit</PanelHeader>
              <div style={{ padding: 12, display: "flex", alignItems: "center", gap: 16, fontFamily: RETRO_FONT }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: siteStatus?.active ? "#00cc44" : "#cc0000",
                  border: "2px solid #333", flexShrink: 0,
                  boxShadow: siteStatus?.active ? "0 0 6px #00cc44" : "0 0 6px #cc0000",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: "bold", color: siteStatus?.active ? "#006622" : "#990000" }}>
                    {siteStatus?.active ? "ACTIEF — pijltjes schieten is ingeschakeld" : "UITGESCHAKELD — pijltjes schieten is gepauzeerd"}
                  </div>
                  <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>
                    {siteStatus?.active
                      ? "Zet uit om data- en serverkosten te minimaliseren als je de site niet gebruikt."
                      : "Zet aan om de site te activeren voor een demo of campagne."}
                  </div>
                </div>
                <button
                  onClick={() => setActiveMutation.mutate({ active: !siteStatus?.active })}
                  disabled={setActiveMutation.isPending || siteStatus === undefined}
                  style={{
                    background: siteStatus?.active ? "#cc0000" : "#006622",
                    color: "#fff", border: "2px solid #333",
                    padding: "6px 18px", fontSize: 12, fontWeight: "bold",
                    cursor: "pointer", fontFamily: RETRO_FONT,
                    opacity: setActiveMutation.isPending ? 0.6 : 1,
                  }}
                >
                  {setActiveMutation.isPending ? "..." : (siteStatus?.active ? "⏸ Zet UIT" : "▶ Zet AAN")}
                </button>
              </div>
            </Panel>

            {/* Stats panel */}
            {stats && (
              <Panel>
                <PanelHeader>📊 Statistieken</PanelHeader>
                <div style={{ padding: 8, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {[
                    { label: "Totaal pijltjes", value: stats.total, emoji: "🎯" },
                    { label: "Vandaag", value: stats.today, emoji: "🔥" },
                    { label: "Gouden pijltjes", value: (stats as any).golden ?? 0, emoji: "🏆" },
                    { label: "Actieve sponsors", value: sponsors?.filter(s => s.active).length ?? 0, emoji: "🏷️" },
                  ].map(stat => (
                    <div key={stat.label} style={{
                      border: "1px solid #ccc", background: "#f5f5f5",
                      padding: "8px 4px", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 20 }}>{stat.emoji}</div>
                      <div style={{ fontSize: 20, fontWeight: "bold", color: "#003399", fontFamily: RETRO_FONT }}>{stat.value}</div>
                      <div style={{ fontSize: 9, color: "#666", fontFamily: RETRO_FONT }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {/* Sponsor form */}
            <Panel>
              <PanelHeader>
                {editingId ? "✏️ Sponsor bewerken" : "➕ Nieuwe sponsor toevoegen"}
                {!showForm && (
                  <button
                    onClick={() => setShowForm(true)}
                    style={{
                      marginLeft: "auto", background: "#ffcc00", color: "#003399",
                      border: "1px solid #cc9900", padding: "1px 8px",
                      fontSize: 11, fontWeight: "bold", cursor: "pointer", fontFamily: RETRO_FONT,
                    }}
                  >
                    + Toevoegen
                  </button>
                )}
              </PanelHeader>

              {showForm && (
                <div style={{ padding: 10 }}>
                  <form onSubmit={handleSubmit}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={labelStyle}>Naam sponsor *</label>
                        <input
                          type="text" value={form.name} required
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="Bijv. Wehkamp"
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Website URL *</label>
                        <input
                          type="url" value={form.clickUrl} required
                          onChange={e => setForm(f => ({ ...f, clickUrl: e.target.value }))}
                          placeholder="https://www.mijnmerk.nl"
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <label style={labelStyle}>Boodschap (zichtbaar als pijltje wordt geopend) *</label>
                      <textarea
                        value={form.message} required rows={3}
                        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                        placeholder="Jouw inspirerende boodschap of advertentietekst..."
                        style={{ ...inputStyle, resize: "vertical" }}
                      />
                    </div>

                    {/* Color picker */}
                    <div style={{ marginBottom: 8 }}>
                      <label style={labelStyle}>Pijltje kleur</label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {COLORS.map(c => (
                          <button
                            key={c.value} type="button" title={c.label}
                            onClick={() => setForm(f => ({ ...f, color: c.value }))}
                            style={{
                              width: 24, height: 24, background: c.value, cursor: "pointer",
                              border: form.color === c.value ? "3px solid #003399" : "2px solid #999",
                              outline: form.color === c.value ? "1px solid #fff" : "none",
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Logo upload */}
                    <div style={{ marginBottom: 8 }}>
                      <label style={labelStyle}>Logo (optioneel)</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {logoPreview && (
                          <img src={logoPreview} alt="Logo preview" style={{
                            width: 40, height: 40, objectFit: "contain",
                            border: "1px solid #ccc", background: "#fff", padding: 2,
                          }} />
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            background: "#f0f0f0", border: "1px solid #999",
                            padding: "3px 10px", fontSize: 11, cursor: "pointer", fontFamily: RETRO_FONT,
                          }}
                        >
                          📎 Logo uploaden
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoChange} />
                      </div>
                    </div>

                    {/* Golden Dart Section */}
                    <div style={{
                      border: "2px solid #e6a800", background: "#fffbe6",
                      padding: 10, marginBottom: 8,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: "bold", color: "#8B6914", marginBottom: 8, fontFamily: RETRO_FONT }}>
                        🏆 Gouden Pijltje Instellingen
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        <label style={labelStyle}>
                          Kans op gouden pijltje: <strong>{Math.round(form.goldenChance * 100)}%</strong>
                        </label>
                        <input
                          type="range" min="0" max="0.5" step="0.01"
                          value={form.goldenChance}
                          onChange={e => setForm(f => ({ ...f, goldenChance: parseFloat(e.target.value) }))}
                          style={{ width: "100%" }}
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#999", fontFamily: RETRO_FONT }}>
                          <span>0% (geen)</span><span>50% (elk 2e pijltje)</span>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <label style={labelStyle}>Prijs tekst</label>
                          <input
                            type="text" value={form.prizeText}
                            onChange={e => setForm(f => ({ ...f, prizeText: e.target.value }))}
                            placeholder="Win €10 korting!"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Prijs claim URL</label>
                          <input
                            type="url" value={form.prizeClaimUrl}
                            onChange={e => setForm(f => ({ ...f, prizeClaimUrl: e.target.value }))}
                            placeholder="https://mijnmerk.nl/prijs"
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    <div style={{
                      background: "#f5f5f5", border: "1px solid #ccc",
                      padding: 8, textAlign: "center", marginBottom: 8,
                    }}>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 4, fontFamily: RETRO_FONT }}>Voorbeeld pijltje:</div>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <PaperDart
                          sponsor={form.name ? {
                            id: 0, name: form.name, logoUrl: logoPreview,
                            color: form.color, message: form.message, clickUrl: form.clickUrl,
                          } : null}
                          width={160} height={32}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        style={{
                          flex: 1, background: "#003399", color: "#ffcc00",
                          border: "2px solid #001a66", padding: "5px 0",
                          fontWeight: "bold", fontSize: 13, cursor: "pointer", fontFamily: RETRO_FONT,
                        }}
                      >
                        {createMutation.isPending || updateMutation.isPending ? "Opslaan..." : editingId ? "Bijwerken" : "Aanmaken"}
                      </button>
                      <button
                        type="button" onClick={resetForm}
                        style={{
                          background: "#f0f0f0", border: "1px solid #999",
                          padding: "5px 16px", cursor: "pointer", fontSize: 12, fontFamily: RETRO_FONT,
                        }}
                      >
                        Annuleren
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </Panel>

            {/* Sponsors list */}
            <Panel>
              <PanelHeader>🏷️ Sponsors ({sponsors?.length ?? 0})</PanelHeader>
              <div style={{ padding: 0 }}>
                {sponsorsLoading ? (
                  <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "#666", fontFamily: RETRO_FONT }}>
                    Laden...
                  </div>
                ) : sponsors?.length === 0 ? (
                  <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "#999", fontFamily: RETRO_FONT }}>
                    Nog geen sponsors. Voeg er een toe!
                  </div>
                ) : (
                  sponsors?.map((sponsor, i) => (
                    <div key={sponsor.id} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 10px",
                      borderBottom: i < (sponsors.length - 1) ? "1px solid #eee" : "none",
                      background: i % 2 === 0 ? "#fff" : "#f9f9f9",
                    }}>
                      {/* Dart preview */}
                      <PaperDart
                        sponsor={{
                          id: sponsor.id, name: sponsor.name, logoUrl: sponsor.logoUrl,
                          color: sponsor.color, message: sponsor.message, clickUrl: sponsor.clickUrl,
                        }}
                        width={80} height={16}
                      />

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: "bold", color: "#003399", fontFamily: RETRO_FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {sponsor.name}
                        </div>
                        <div style={{ fontSize: 10, color: "#666", fontFamily: RETRO_FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {sponsor.clickUrl}
                        </div>
                      </div>

                      {/* Status */}
                      <span style={{
                        fontSize: 10, padding: "1px 6px", fontFamily: RETRO_FONT,
                        background: sponsor.active ? "#d4f5d4" : "#f5d4d4",
                        color: sponsor.active ? "#1a5c1a" : "#5c1a1a",
                        border: `1px solid ${sponsor.active ? "#1a5c1a" : "#5c1a1a"}`,
                      }}>
                        {sponsor.active ? "Actief" : "Inactief"}
                      </span>

                      {/* Actions */}
                      <button
                        onClick={() => handleEdit(sponsor)}
                        style={{
                          background: "#ffcc00", border: "1px solid #cc9900",
                          padding: "2px 8px", fontSize: 11, cursor: "pointer", fontFamily: RETRO_FONT,
                        }}
                      >
                        ✏️ Bewerk
                      </button>
                      <button
                        onClick={() => { if (confirm(`Sponsor "${sponsor.name}" verwijderen?`)) deleteMutation.mutate({ id: sponsor.id }); }}
                        style={{
                          background: "#f5d4d4", border: "1px solid #cc0000",
                          padding: "2px 8px", fontSize: 11, cursor: "pointer", fontFamily: RETRO_FONT,
                        }}
                      >
                        🗑️ Verwijder
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>

          {/* Right column: Help + info panels */}
          <div>
            {/* Startpagina-style info panel */}
            <Panel>
              <PanelHeader>ℹ️ Hoe werkt het?</PanelHeader>
              <div style={{ padding: 8 }}>
                {[
                  { icon: "1.", text: "Voeg een sponsor toe met naam, boodschap en logo" },
                  { icon: "2.", text: "Stel de pijltjeskleur in die past bij het merk" },
                  { icon: "3.", text: "Optioneel: activeer het Gouden Pijltje voor prijzen" },
                  { icon: "4.", text: "Bezoekers schieten pijltjes met hun microfoon" },
                  { icon: "5.", text: "Klik op een pijltje om de sponsor-boodschap te zien" },
                ].map(item => (
                  <div key={item.icon} style={{
                    display: "flex", gap: 6, padding: "4px 0",
                    borderBottom: "1px solid #eee", fontSize: 11,
                    color: "#333", fontFamily: RETRO_FONT,
                  }}>
                    <span style={{ fontWeight: "bold", color: "#003399", minWidth: 16 }}>{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* RTB info */}
            <Panel>
              <PanelHeader>🎯 RTB Integratie</PanelHeader>
              <div style={{ padding: 8 }}>
                <p style={{ fontSize: 11, color: "#333", fontFamily: RETRO_FONT, marginBottom: 8 }}>
                  Voeg deze snippet toe aan elke website om pijltjes te laten vliegen:
                </p>
                <div style={{
                  background: "#1a1a1a", color: "#00ff88", padding: 8,
                  fontSize: 10, fontFamily: "Courier New, monospace",
                  border: "1px solid #333", overflowX: "auto",
                }}>
                  {'<script src="https://pijltjesschieten.nl/embed.js"></script>'}
                </div>
                <p style={{ fontSize: 10, color: "#666", fontFamily: RETRO_FONT, marginTop: 6 }}>
                  Pijltjes vliegen over bestaande RTB-banners heen via z-index overlay.
                </p>
              </div>
            </Panel>

            {/* Gouden pijltje info */}
            <Panel>
              <PanelHeader>🏆 Gouden Pijltje</PanelHeader>
              <div style={{ padding: 8 }}>
                <p style={{ fontSize: 11, color: "#333", fontFamily: RETRO_FONT, marginBottom: 6 }}>
                  Een klein percentage pijltjes heeft een gouden binnenkant. Als een bezoeker zo'n pijltje opent, wint hij een prijs!
                </p>
                <div style={{ background: "#fffbe6", border: "1px solid #e6a800", padding: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: "bold", color: "#8B6914", fontFamily: RETRO_FONT }}>
                    💡 Tip voor sponsors:
                  </div>
                  <div style={{ fontSize: 10, color: "#666", fontFamily: RETRO_FONT, marginTop: 4 }}>
                    Stel een kans in van 5-10% voor een goede balans tussen engagement en kosten.
                  </div>
                </div>
              </div>
            </Panel>

            {/* Quick links */}
            <Panel>
              <PanelHeader>🔗 Snelle links</PanelHeader>
              <div style={{ padding: 8 }}>
                {[
                  { label: "← Terug naar site", href: "/" },
                  { label: "🗞️ Demo NU.nl pagina", href: "/demo" },
                ].map(link => (
                  <Link key={link.label} href={link.href}>
                    <div style={{
                      padding: "4px 0", fontSize: 11, color: "#003399",
                      fontFamily: RETRO_FONT, cursor: "pointer",
                      borderBottom: "1px solid #eee",
                      textDecoration: "underline",
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.color = "#cc0000"}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.color = "#003399"}
                    >
                      {link.label}
                    </div>
                  </Link>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        background: "#003399", borderTop: "3px solid #ffcc00",
        padding: "8px 12px", marginTop: 16, textAlign: "center",
        fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: RETRO_FONT,
      }}>
        Pijltjesschieten.nl Admin Panel — © 2025 — Alle rechten voorbehouden
      </div>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

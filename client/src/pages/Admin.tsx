import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { PaperDart } from "@/components/PaperDart";
import { toast } from "sonner";
import { Link } from "wouter";

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
        id: editingId,
        name: form.name,
        message: form.message,
        clickUrl: form.clickUrl,
        color: form.color,
        goldenChance: form.goldenChance,
        prizeText: form.prizeText || null,
        prizeClaimUrl: form.prizeClaimUrl && form.prizeClaimUrl !== "https://" ? form.prizeClaimUrl : null,
      });
      // Upload logo if changed
      if (logoFile) {
        const base64 = await fileToBase64(logoFile);
        await uploadLogoMutation.mutateAsync({
          sponsorId: editingId,
          base64,
          mimeType: logoFile.type,
          filename: logoFile.name,
        });
      }
    } else {
      const { id } = await createMutation.mutateAsync({
        name: form.name,
        message: form.message,
        clickUrl: form.clickUrl,
        color: form.color,
        goldenChance: form.goldenChance,
        prizeText: form.prizeText || undefined,
        prizeClaimUrl: form.prizeClaimUrl && form.prizeClaimUrl !== "https://" ? form.prizeClaimUrl : undefined,
      });
      // Upload logo if provided
      if (logoFile && id) {
        const base64 = await fileToBase64(logoFile);
        await uploadLogoMutation.mutateAsync({
          sponsorId: id,
          base64,
          mimeType: logoFile.type,
          filename: logoFile.name,
        });
      }
    }
  };

  const handleEdit = (sponsor: any) => {
    setForm({
      name: sponsor.name,
      message: sponsor.message,
      clickUrl: sponsor.clickUrl,
      color: sponsor.color,
      logoUrl: sponsor.logoUrl,
      goldenChance: sponsor.goldenChance ?? 0.05,
      prizeText: sponsor.prizeText ?? "",
      prizeClaimUrl: sponsor.prizeClaimUrl ?? "https://",
    });
    setLogoPreview(sponsor.logoUrl ?? null);
    setEditingId(sponsor.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Auth guard
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.96 0.03 78)" }}>
        <div className="animate-spin text-4xl">🎯</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4" style={{ background: "oklch(0.96 0.03 78)" }}>
        <PaperDart width={120} height={40} />
        <div className="paper-card rounded-2xl p-8 text-center max-w-sm">
          <h2 className="font-display text-2xl mb-2" style={{ color: "#3d2800" }}>Admin toegang</h2>
          <p className="font-retro text-sm mb-4" style={{ color: "#8b6914" }}>Log in om sponsors te beheren</p>
          <a href={getLoginUrl()} className="btn-retro block py-3 px-6 rounded-xl font-display text-lg text-center"
            style={{ background: "oklch(0.52 0.18 40)", color: "#fff", textDecoration: "none" }}>
            Inloggen
          </a>
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4" style={{ background: "oklch(0.96 0.03 78)" }}>
        <div className="paper-card rounded-2xl p-8 text-center max-w-sm">
          <h2 className="font-display text-2xl mb-2" style={{ color: "#3d2800" }}>Geen toegang</h2>
          <p className="font-retro text-sm mb-4" style={{ color: "#8b6914" }}>
            Je hebt geen admin rechten. Vraag de eigenaar om je te promoveren.
          </p>
          <Link href="/">
            <button className="btn-retro py-2 px-4 rounded-lg font-display" style={{ background: "oklch(0.82 0.16 85)", color: "#3d2800" }}>
              ← Terug
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.96 0.03 78)" }}>
      {/* Header */}
      <header style={{ background: "oklch(0.52 0.18 40)", borderBottom: "4px solid oklch(0.35 0.12 40)" }}>
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="btn-retro rounded-lg px-3 py-1.5 text-sm font-display"
                style={{ background: "oklch(0.82 0.16 85)", color: "#3d2800" }}>
                ← Pijltjesschieten.nl
              </button>
            </Link>
            <h1 className="font-display text-2xl text-white">Admin Panel</h1>
          </div>
          <div className="font-retro text-xs text-amber-200">
            Welkom, {user.name ?? "Admin"}
          </div>
        </div>
      </header>

      <div className="container py-8 space-y-8">
        {/* Stats */}
          {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Totaal pijltjes", value: stats.total, emoji: "🎯" },
              { label: "Vandaag geschoten", value: stats.today, emoji: "🔥" },
              { label: "Gouden pijltjes", value: (stats as any).golden ?? 0, emoji: "🏆" },
              { label: "Actieve sponsors", value: sponsors?.filter(s => s.active).length ?? 0, emoji: "🏷️" },
            ].map(stat => (
              <div key={stat.label} className="paper-card rounded-xl p-4 text-center">
                <div className="text-3xl mb-1">{stat.emoji}</div>
                <div className="font-display text-2xl" style={{ color: "#3d2800" }}>{stat.value}</div>
                <div className="font-retro text-xs opacity-60" style={{ color: "#8b6914" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Sponsor form */}
        <div className="paper-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl" style={{ color: "#3d2800" }}>
              {editingId ? "✏️ Sponsor bewerken" : "➕ Nieuwe sponsor"}
            </h2>
            {!showForm && (
              <button
                className="btn-retro rounded-lg px-4 py-2 font-display text-sm"
                style={{ background: "oklch(0.52 0.18 40)", color: "#fff" }}
                onClick={() => setShowForm(true)}
              >
                + Toevoegen
              </button>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="font-retro text-xs uppercase tracking-wider block mb-1" style={{ color: "#5c3d1e" }}>
                    Naam *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Bijv. Wehkamp"
                    required
                    className="w-full rounded-lg px-3 py-2 font-retro text-sm border-2 border-amber-300 bg-amber-50 focus:outline-none focus:border-amber-500"
                    style={{ color: "#3d2800" }}
                  />
                </div>

                {/* Click URL */}
                <div>
                  <label className="font-retro text-xs uppercase tracking-wider block mb-1" style={{ color: "#5c3d1e" }}>
                    Website URL *
                  </label>
                  <input
                    type="url"
                    value={form.clickUrl}
                    onChange={e => setForm(f => ({ ...f, clickUrl: e.target.value }))}
                    placeholder="https://www.mijnmerk.nl"
                    required
                    className="w-full rounded-lg px-3 py-2 font-retro text-sm border-2 border-amber-300 bg-amber-50 focus:outline-none focus:border-amber-500"
                    style={{ color: "#3d2800" }}
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="font-retro text-xs uppercase tracking-wider block mb-1" style={{ color: "#5c3d1e" }}>
                  Boodschap *
                </label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Jouw inspirerende boodschap of advertentietekst..."
                  required
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 font-retro text-sm border-2 border-amber-300 bg-amber-50 focus:outline-none focus:border-amber-500 resize-none"
                  style={{ color: "#3d2800" }}
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="font-retro text-xs uppercase tracking-wider block mb-2" style={{ color: "#5c3d1e" }}>
                  Pijltje kleur
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        background: c.value,
                        borderColor: form.color === c.value ? "#3d2800" : "rgba(0,0,0,0.2)",
                        transform: form.color === c.value ? "scale(1.2)" : undefined,
                        boxShadow: form.color === c.value ? "0 0 0 2px #3d2800" : undefined,
                      }}
                      onClick={() => setForm(f => ({ ...f, color: c.value }))}
                    />
                  ))}
                </div>
              </div>

              {/* Logo upload */}
              <div>
                <label className="font-retro text-xs uppercase tracking-wider block mb-2" style={{ color: "#5c3d1e" }}>
                  Logo (optioneel)
                </label>
                <div className="flex items-center gap-3">
                  {logoPreview && (
                    <img src={logoPreview} alt="Logo preview" className="w-12 h-12 object-contain rounded-lg border-2 border-amber-300 bg-white p-1" />
                  )}
                  <button
                    type="button"
                    className="btn-retro rounded-lg px-3 py-2 font-retro text-sm"
                    style={{ background: "oklch(0.91 0.05 80)", color: "#3d2800" }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📎 Logo uploaden
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </div>
              </div>

              {/* Golden Dart Section */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.1), rgba(200,169,110,0.15))", border: "2px solid rgba(255,215,0,0.4)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🏆</span>
                  <h3 className="font-display text-base" style={{ color: "#3d2800" }}>Gouden Pijltje Instellingen</h3>
                </div>

                {/* Golden chance slider */}
                <div>
                  <label className="font-retro text-xs uppercase tracking-wider block mb-1" style={{ color: "#5c3d1e" }}>
                    Kans op gouden pijltje: <strong>{Math.round(form.goldenChance * 100)}%</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={form.goldenChance}
                    onChange={e => setForm(f => ({ ...f, goldenChance: parseFloat(e.target.value) }))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between font-retro text-xs opacity-50" style={{ color: "#8b6914" }}>
                    <span>0% (geen)</span><span>50% (elk 2e pijltje)</span>
                  </div>
                </div>

                {/* Prize text */}
                <div>
                  <label className="font-retro text-xs uppercase tracking-wider block mb-1" style={{ color: "#5c3d1e" }}>
                    Prijs tekst
                  </label>
                  <input
                    type="text"
                    value={form.prizeText}
                    onChange={e => setForm(f => ({ ...f, prizeText: e.target.value }))}
                    placeholder="Bijv. Win €10 korting op je volgende bestelling!"
                    className="w-full rounded-lg px-3 py-2 font-retro text-sm border-2 border-amber-300 bg-amber-50 focus:outline-none focus:border-amber-500"
                    style={{ color: "#3d2800" }}
                  />
                </div>

                {/* Prize claim URL */}
                <div>
                  <label className="font-retro text-xs uppercase tracking-wider block mb-1" style={{ color: "#5c3d1e" }}>
                    Prijs claim URL
                  </label>
                  <input
                    type="url"
                    value={form.prizeClaimUrl}
                    onChange={e => setForm(f => ({ ...f, prizeClaimUrl: e.target.value }))}
                    placeholder="https://www.mijnmerk.nl/prijs"
                    className="w-full rounded-lg px-3 py-2 font-retro text-sm border-2 border-amber-300 bg-amber-50 focus:outline-none focus:border-amber-500"
                    style={{ color: "#3d2800" }}
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl p-4 text-center" style={{ background: "rgba(0,0,0,0.05)" }}>
                <p className="font-retro text-xs mb-2 opacity-60" style={{ color: "#5c3d1e" }}>Voorbeeld pijltje</p>
                <div className="flex justify-center">
                  <PaperDart
                    sponsor={form.name ? {
                      id: 0,
                      name: form.name,
                      logoUrl: logoPreview,
                      color: form.color,
                      message: form.message,
                      clickUrl: form.clickUrl,
                    } : null}
                    width={160}
                    height={52}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-retro flex-1 py-3 rounded-xl font-display text-lg"
                  style={{ background: "oklch(0.52 0.18 40)", color: "#fff" }}
                >
                  {createMutation.isPending || updateMutation.isPending ? "Opslaan..." : editingId ? "Bijwerken" : "Aanmaken"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-retro px-4 py-3 rounded-xl font-display"
                  style={{ background: "oklch(0.91 0.05 80)", color: "#3d2800" }}
                >
                  Annuleren
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sponsors list */}
        <div className="paper-card rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4" style={{ color: "#3d2800" }}>
            🏷️ Sponsors ({sponsors?.length ?? 0})
          </h2>

          {sponsorsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-xl bg-amber-100 animate-pulse" />
              ))}
            </div>
          ) : sponsors?.length === 0 ? (
            <p className="font-retro text-center py-8 opacity-50" style={{ color: "#8b6914" }}>
              Nog geen sponsors. Voeg er een toe!
            </p>
          ) : (
            <div className="space-y-3">
              {sponsors?.map(sponsor => (
                <div
                  key={sponsor.id}
                  className="flex items-center gap-4 rounded-xl p-3 border-2"
                  style={{ background: sponsor.color + "33", borderColor: sponsor.color }}
                >
                  {/* Dart preview */}
                  <PaperDart
                    sponsor={{
                      id: sponsor.id,
                      name: sponsor.name,
                      logoUrl: sponsor.logoUrl,
                      color: sponsor.color,
                      message: sponsor.message,
                      clickUrl: sponsor.clickUrl,
                    }}
                    width={80}
                    height={26}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-base truncate" style={{ color: "#3d2800" }}>{sponsor.name}</p>
                    <p className="font-retro text-xs truncate opacity-60" style={{ color: "#5c3d1e" }}>
                      {sponsor.clickUrl}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span
                    className="font-retro text-xs px-2 py-0.5 rounded-full border"
                    style={{
                      background: sponsor.active ? "#d4f5d4" : "#f5d4d4",
                      color: sponsor.active ? "#1a5c1a" : "#5c1a1a",
                      borderColor: sponsor.active ? "#1a5c1a" : "#5c1a1a",
                    }}
                  >
                    {sponsor.active ? "Actief" : "Inactief"}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      className="btn-retro rounded-lg px-3 py-1.5 font-retro text-xs"
                      style={{ background: "oklch(0.82 0.16 85)", color: "#3d2800" }}
                      onClick={() => handleEdit(sponsor)}
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-retro rounded-lg px-3 py-1.5 font-retro text-xs"
                      style={{ background: "#f5d4d4", color: "#5c1a1a" }}
                      onClick={() => {
                        if (confirm(`Sponsor "${sponsor.name}" verwijderen?`)) {
                          deleteMutation.mutate({ id: sponsor.id });
                        }
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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

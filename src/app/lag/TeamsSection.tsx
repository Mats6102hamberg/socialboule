"use client";

import { useState, FormEvent } from "react";

interface Player {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  player: Player;
}

interface Team {
  id: string;
  name: string;
  members: TeamMember[];
}

interface TeamsSectionProps {
  initialTeams: Team[];
  allPlayers: Player[];
}

export function TeamsSection({ initialTeams, allPlayers }: TeamsSectionProps) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPlayers, setEditPlayers] = useState<string[]>([]);

  async function handleCreateTeam(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!newTeamName.trim()) {
      setError("Lagnamn krävs");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeamName,
          playerIds: selectedPlayers,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Kunde inte skapa lag");
        return;
      }

      const team = await res.json();
      setTeams([...teams, team].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTeamName("");
      setSelectedPlayers([]);
    } catch {
      setError("Ett oväntat fel inträffade");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteTeam(teamId: string) {
    if (!confirm("Är du säker på att du vill ta bort detta lag?")) return;

    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setTeams(teams.filter((t) => t.id !== teamId));
      }
    } catch {
      setError("Kunde inte ta bort lag");
    }
  }

  function startEditing(team: Team) {
    setEditingTeam(team.id);
    setEditName(team.name);
    setEditPlayers(team.members.map((m) => m.player.id));
  }

  function cancelEditing() {
    setEditingTeam(null);
    setEditName("");
    setEditPlayers([]);
  }

  async function handleSaveEdit(teamId: string) {
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          playerIds: editPlayers,
        }),
      });

      if (res.ok) {
        const updatedTeam = await res.json();
        setTeams(
          teams
            .map((t) => (t.id === teamId ? updatedTeam : t))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        cancelEditing();
      }
    } catch {
      setError("Kunde inte uppdatera lag");
    }
  }

  function togglePlayer(playerId: string, list: string[], setList: (v: string[]) => void) {
    if (list.includes(playerId)) {
      setList(list.filter((id) => id !== playerId));
    } else {
      setList([...list, playerId]);
    }
  }

  return (
    <div className="space-y-6">
      {/* Skapa nytt lag */}
      <form
        onSubmit={handleCreateTeam}
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h2 className="text-base font-medium">Skapa nytt lag</h2>

        <div className="space-y-1">
          <label htmlFor="teamName" className="text-sm font-medium">
            Lagnamn
          </label>
          <input
            id="teamName"
            type="text"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="T.ex. Lag Röd"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Välj spelare</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {allPlayers.map((player) => (
              <label
                key={player.id}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                  selectedPlayers.includes(player.id)
                    ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPlayers.includes(player.id)}
                  onChange={() => togglePlayer(player.id, selectedPlayers, setSelectedPlayers)}
                  className="sr-only"
                />
                <span>{player.name}</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {submitting ? "Skapar..." : "Skapa lag"}
        </button>
      </form>

      {/* Lista över lag */}
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-base font-medium">Befintliga lag ({teams.length})</h2>

        {teams.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Inga lag skapade ännu.
          </p>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                {editingTeam === team.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    />
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {allPlayers.map((player) => (
                        <label
                          key={player.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition ${
                            editPlayers.includes(player.id)
                              ? "border-zinc-900 bg-zinc-200 dark:border-zinc-100 dark:bg-zinc-700"
                              : "border-zinc-200 dark:border-zinc-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={editPlayers.includes(player.id)}
                            onChange={() => togglePlayer(player.id, editPlayers, setEditPlayers)}
                            className="sr-only"
                          />
                          <span>{player.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(team.id)}
                        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                      >
                        Spara
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium dark:border-zinc-700"
                      >
                        Avbryt
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium">{team.name}</h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {team.members.length === 0
                          ? "Inga spelare"
                          : team.members.map((m) => m.player.name).join(", ")}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditing(team)}
                        className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        Redigera
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        Ta bort
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

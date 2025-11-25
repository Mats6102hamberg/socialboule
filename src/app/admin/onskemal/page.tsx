import { prisma } from "@/lib/prisma";

export default async function PlayRequestsAdminPage() {
  const requests = await prisma.playRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Önskemål om speldagar</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Den här sidan är avsedd för arrangören. Här visas de senaste önskemålen om
            speldagar som spelare har skickat in via formuläret.
          </p>
        </header>

        {requests.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Inga önskemål har skickats in ännu.
          </p>
        ) : (
          <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <ul className="space-y-2">
              {requests.map((req) => (
                <li
                  key={req.id}
                  className="space-y-1 rounded border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {req.name || "(namn ej angivet)"}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(req.createdAt).toLocaleString("sv-SE", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  {req.preferredDate && (
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      Önskat datum: {new Date(req.preferredDate).toLocaleDateString("sv-SE", {
                        dateStyle: "medium",
                      })}
                    </p>
                  )}
                  {req.message && (
                    <p className="text-[11px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                      {req.message}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

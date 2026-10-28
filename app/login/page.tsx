import { signIn } from "@/app/actions";

// Reads the session on every request: blocking on the server is fine for a personal app.
export const instant = false;

const input = "rounded-lg border border-slate-700 bg-transparent px-3 py-2";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 p-4 pt-24">
      <h1 className="text-2xl font-semibold">Flightlog</h1>
      <form action={signIn} className="flex flex-col gap-3">
        <input className={input} name="email" type="email" autoComplete="email" placeholder="Email" aria-label="Email" required />
        <input className={input} name="password" type="password" autoComplete="current-password" placeholder="Password" aria-label="Password" required />
        {error && <p className="text-sm text-red-400">Wrong email or password.</p>}
        <button className="rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-900">Sign in</button>
      </form>
    </main>
  );
}

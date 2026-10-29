import { signIn } from "@/app/actions";
import { Arrow, Plane, Plate } from "@/components/pictograms";
import { getI18n } from "@/lib/i18n";

// Reads the session on every request: blocking on the server is fine for a personal app.
export const instant = false;

const field = "block w-full border-2 border-ink bg-white px-3 py-2.5 text-lg";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [{ error }, { t }] = await Promise.all([searchParams, getI18n()]);
  return (
    <main className="flex flex-1 flex-col">
      <div className="flex items-center gap-4 bg-sign px-4 py-6">
        <Plate>
          <Plane className="size-9" />
        </Plate>
        <h1 className="text-5xl leading-none font-extrabold tracking-tight">Flightlog</h1>
      </div>
      <form action={signIn} className="mx-auto flex w-full max-w-sm flex-col gap-4 px-4 py-10">
        <label>
          <span className="block text-sm font-semibold">{t.email}</span>
          <input className={field} name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          <span className="block text-sm font-semibold">{t.password}</span>
          <input className={field} name="password" type="password" autoComplete="current-password" required />
        </label>
        {error && (
          <p role="alert" className="border-2 border-alert px-3 py-2 font-semibold text-alert">
            {t.wrongLogin}
          </p>
        )}
        <button className="mt-2 flex items-center justify-center gap-3 bg-ink px-4 py-3.5 text-lg font-semibold text-white hover:bg-sign hover:text-ink">
          {t.signIn}
          <Arrow className="size-5" />
        </button>
      </form>
    </main>
  );
}

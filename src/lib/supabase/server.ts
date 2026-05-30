import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Client Supabase pour les Composants Serveur, Server Actions et Route
 * Handlers. Branché sur le cookie store de Next pour lire/rafraîchir la
 * session.
 *
 * Note : l'écriture de cookies depuis un Server Component lève (RSC en
 * lecture seule). On l'ignore : le rafraîchissement effectif des cookies
 * est assuré par le middleware (updateSession), qui s'exécute avant le
 * rendu. C'est le pattern recommandé par @supabase/ssr.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Appelé depuis un Server Component : sans effet, le middleware
            // rafraîchira la session.
          }
        },
      },
    },
  );
}

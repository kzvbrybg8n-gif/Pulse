import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Identité de l'utilisateur extraite **localement** du JWT.
 *
 * Pourquoi pas `getUser()` ici : `getUser()` interroge le serveur d'auth
 * Supabase à chaque appel (revalidation distante du JWT) — un aller-retour
 * réseau bloquant. Multiplié par le layout + chaque page, c'était la cause
 * principale de la lenteur ressentie au changement de vue.
 *
 * `getClaims()` vérifie le JWT en local grâce aux clés de signature
 * asymétriques (la JWKS est récupérée une fois puis mise en cache) : aucun
 * appel réseau par navigation. La garde d'authentification réelle reste
 * assurée une seule fois par le middleware (updateSession), qui appelle bien
 * `getUser()` sur chaque requête.
 */
export async function getAuthClaims(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  return {
    id: (claims?.sub as string | undefined) ?? "",
    email: (claims?.email as string | undefined) ?? "",
  };
}

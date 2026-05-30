# Supabase — guide local

Pulse utilise Supabase en cloud uniquement (pas de Docker local). Les
migrations sont versionnées dans `supabase/migrations/` et appliquées via
la CLI `supabase`.

## Pré-requis

```bash
brew install supabase/tap/supabase
supabase --version    # ≥ 2.102
```

## Setup initial (une seule fois par poste)

1. **Créer le projet cloud** sur https://supabase.com → Sign in → New project.
   - Région : Frankfurt (eu-central-1) recommandé (latence FR + RGPD)
   - Mot de passe DB : générer fort, à garder en lieu sûr (demandé à chaque
     `supabase db push`)
   - Récupérer le **Project Ref** dans Project Settings → General

2. **S'authentifier sur la CLI** :
   ```bash
   supabase login
   ```
   (ouvre le navigateur ; ne se fait qu'une fois)

3. **Lier le repo au projet cloud** :
   ```bash
   supabase link --project-ref <ton-ref>
   ```
   Demande le mot de passe DB (l'écho est masqué).

4. **Renseigner `.env.local`** (copier depuis `.env.example`) :
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   ```
   Les deux se trouvent dans Project Settings → API.

## Workflow quotidien

### Appliquer les migrations existantes
```bash
supabase db push
```

### Créer une nouvelle migration
```bash
supabase migration new <nom_court>
# édite supabase/migrations/<timestamp>_<nom_court>.sql
supabase db push
```

### Voir l'état de la base
```bash
supabase migration list      # quelles migrations sont appliquées en cloud
supabase db diff             # diff entre schéma local et cloud
```

### Tester les RLS

Tout test passe par un JWT utilisateur. Recette rapide :

1. Dashboard → Authentication → Users → Add user (crée alice + bob)
2. SQL editor (rôle `postgres` → contourne RLS, OK pour seeder) :
   ```sql
   insert into public.tasks (user_id, title) values
     ('<alice-uuid>', 'Tâche d''Alice'),
     ('<bob-uuid>',   'Tâche de Bob');
   ```
3. Récupérer un JWT pour Alice : Authentication → Users → ⋯ → "Send magic
   link" puis se connecter, OU utiliser `supabase.auth.signInWithPassword`
   en script
4. Tester via curl :
   ```bash
   curl "https://<ref>.supabase.co/rest/v1/tasks?select=*" \
     -H "apikey: <anon-key>" \
     -H "Authorization: Bearer <alice-jwt>"
   ```
   → Doit retourner uniquement la tâche d'Alice.

## Règles immuables

- **Une migration n'est jamais modifiée après push** — toute correction passe
  par une nouvelle migration `supabase migration new <fix>`.
- **RLS activée + policy `user_id = auth.uid()` sur chaque nouvelle table**.
  Aucune exception, même en mono-user (défense en profondeur).
- **Pas de secret en clair dans le repo**. Le mot de passe DB et la
  service-role key ne sont jamais versionnés.
- **Pas de `supabase db reset` en cloud** — c'est destructif. Utiliser
  uniquement en local Docker (qu'on n'utilise pas dans ce projet).

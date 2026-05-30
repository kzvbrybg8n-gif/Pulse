/**
 * Layout des routes d'authentification (publiques).
 * Centre le contenu sur le fond papier. Le middleware redirige déjà un
 * utilisateur connecté vers « / ».
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper-2 px-4">
      {children}
    </div>
  );
}

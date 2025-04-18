'use client';

export function Footer() {
  return (
    <footer className="p-4 text-center text-sm  border-t">
      &copy; {new Date().getFullYear()} MonApp. Tous droits réservés.
    </footer>
  );
}

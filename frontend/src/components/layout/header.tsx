import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-(--font-plus-jakarta) items-center justify-between px-4 sm:px-6 lg:px-8 max-w-[1200px]">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={32} className="h-8 w-auto" />
            <span className="text-xl font-bold tracking-tight text-text-primary font-serif">
              Ginhawa
            </span>
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/features"
            className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
          >
            Features
          </Link>
          <Link
            href="/doctors"
            className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
          >
            Find a Doctor
          </Link>
          <Link
            href="/for-doctors"
            className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
          >
            For Doctors
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

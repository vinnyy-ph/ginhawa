import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-(--font-plus-jakarta) items-center justify-between px-4 sm:px-6 lg:px-8 max-w-[1200px]">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.svg"
              alt="Ginhawa Logo"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
            <span className="text-xl font-bold tracking-tight text-text-primary font-serif">
              Ginhawa
            </span>
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="#features"
            className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
          >
            Features
          </Link>
          <Link
            href="/for-doctors"
            className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
          >
            For Doctors
          </Link>
          <Link
            href="#"
            className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
          >
            About Us
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/auth/login">Log in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

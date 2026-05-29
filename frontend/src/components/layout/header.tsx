"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CalendarIcon, FileTextIcon, PersonIcon, ExitIcon, BellIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-light to-brand flex items-center justify-center text-white text-sm font-bold">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function Header() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const name = session?.user?.name || session?.user?.email || "User";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={32} className="h-8 w-auto" />
            <span className="text-xl font-bold tracking-tight text-text-primary font-serif">Ginhawa</span>
          </Link>
        </div>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-6">
          {role === "PATIENT" ? (
            <>
              <Link href="/doctors" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Find a Doctor</Link>
              <Link href="/recommendations" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">AI Symptom Checker</Link>
            </>
          ) : role !== "DOCTOR" ? (
            <>
              <Link href="/features" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Features</Link>
              <Link href="/doctors" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Find a Doctor</Link>
              <Link href="/for-doctors" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">For Doctors</Link>
            </>
          ) : null}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {status === "loading" ? null : role === "PATIENT" ? (
            <>
              <Link href="/notifications" aria-label="Notifications" className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors">
                <BellIcon className="w-5 h-5" />
              </Link>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger aria-label="Account menu" className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <Avatar name={name} />
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-[200px] rounded-xl border border-outline-variant bg-surface-white p-1.5 shadow-lifted">
                    <div className="px-3 py-2 text-xs text-on-surface-variant truncate">{name}</div>
                    <DropdownMenu.Item asChild>
                      <Link href="/appointments" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-surface-container outline-none cursor-pointer"><CalendarIcon className="w-4 h-4" /> My Appointments</Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href="/records" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-surface-container outline-none cursor-pointer"><FileTextIcon className="w-4 h-4" /> Medical Records</Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href="/profile" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-surface-container outline-none cursor-pointer"><PersonIcon className="w-4 h-4" /> Profile</Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="my-1 h-px bg-outline-variant" />
                    <DropdownMenu.Item onSelect={() => signOut({ callbackUrl: "/login" })} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-error hover:bg-error/5 outline-none cursor-pointer"><ExitIcon className="w-4 h-4" /> Log out</DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </>
          ) : role === "DOCTOR" ? (
            <>
              <Button variant="ghost" size="sm" asChild><Link href="/doctor/dashboard">Go to Dashboard</Link></Button>
              <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>Log out</Button>
            </>
          ) : (
            <>
              <Link href="/signup/doctor" className="hidden lg:inline text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Sign up as a doctor</Link>
              <Button variant="ghost" size="sm" asChild><Link href="/login">Log in</Link></Button>
              <Button size="sm" asChild><Link href="/signup">Sign up</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

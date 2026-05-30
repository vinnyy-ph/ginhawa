/**
 * Footer — site-wide footer for public landing pages.
 *
 * Renders the Ginhawa brand, a product links column, a legal links column,
 * and a copyright line. Legal pages (Privacy Policy, Terms of Service) are
 * not yet live — they are rendered as non-linked spans. Used on the marketing
 * home page and other public routes.
 */
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

/** Renders the four-column footer with brand, links, and dynamic copyright year. */
export function Footer() {
  return (
    <footer className="bg-background border-t border-outline-variant py-12">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Logo size={24} className="h-6 w-auto" />
              <span className="text-lg font-bold tracking-tight text-text-primary font-serif">
                Ginhawa
              </span>
            </Link>
            <p className="max-w-xs text-sm text-on-surface-variant">
              Ginhawa is a telehealth platform dedicated to providing ease and relief through accessible, guided healthcare for everyone in the Philippines.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-4 font-serif">Product</h3>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li><Link href="/features" className="hover:text-primary transition-colors">Features</Link></li>
              <li><Link href="/for-doctors" className="hover:text-primary transition-colors">For Doctors</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-4 font-serif">Legal</h3>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li><span className="hover:text-primary transition-colors cursor-not-allowed">Privacy Policy</span></li>
              <li><span className="hover:text-primary transition-colors cursor-not-allowed">Terms of Service</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-outline-variant pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-on-surface-variant">
            © {new Date().getFullYear()} Ginhawa Telehealth. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

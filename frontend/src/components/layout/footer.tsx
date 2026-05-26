import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-background border-t border-outline-variant py-12">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image
                src="/logo.svg"
                alt="Ginhawa Logo"
                width={24}
                height={24}
                className="h-6 w-auto"
              />
              <span className="text-lg font-bold tracking-tight text-text-primary font-serif">
                Ginhawa
              </span>
            </Link>
            <p className="max-w-xs text-sm text-on-surface-variant">
              Ginhawa is a telehealth platform dedicated to providing ease and relief through accessible, guided healthcare for everyone in the Philippines.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary mb-4 uppercase tracking-wider">Product</h4>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li><Link href="#features" className="hover:text-primary transition-colors">Features</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">For Doctors</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">AI Recommendations</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary mb-4 uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li><Link href="#" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-outline-variant pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-on-surface-variant">
            © {new Date().getFullYear()} Ginhawa Telehealth. All rights reserved.
          </p>
          <div className="flex gap-6 grayscale opacity-50">
            {/* Placeholder icons for trust badges */}
            <div className="h-6 w-20 bg-on-surface-variant/20 rounded" />
            <div className="h-6 w-20 bg-on-surface-variant/20 rounded" />
          </div>
        </div>
      </div>
    </footer>
  );
}

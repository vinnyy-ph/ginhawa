import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function DoctorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}

import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import BentoGrid from "@/components/BentoGrid";
import Footer from "@/components/Footer";

const Index = () => (
  <div className="min-h-screen bg-background relative">
    {/* Light-mode subtle grid texture behind all sections */}
    <div className="absolute inset-0 light-texture pointer-events-none" aria-hidden="true" />
    <Navbar />
    <HeroSection />
    <HowItWorks />
    <BeforeAfterSlider />
    <BentoGrid />
    <Footer />
  </div>
);

export default Index;

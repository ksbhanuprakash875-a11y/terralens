import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import PageLoader from "@/components/PageLoader";
import NovaChat from "@/components/NovaChat";
import ScrollToTop from "@/components/ScrollToTop";
import usePageMeta from "@/hooks/usePageMeta";
import useScrollRestoration from "@/hooks/useScrollRestoration";
import { EnhanceProvider } from "@/context/EnhanceContext";

const Index = lazy(() => import("./pages/Index"));
const Enhance = lazy(() => import("./pages/Enhance"));
const Results = lazy(() => import("./pages/Results"));
const About = lazy(() => import("./pages/About"));
const Auth = lazy(() => import("./pages/Auth"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const MapGallery = lazy(() => import("./pages/MapGallery"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

const AnimatedRoutes = () => {
  const location = useLocation();
  usePageMeta();
  useScrollRestoration();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/enhance" element={<Enhance />} />
            <Route path="/results" element={<Results />} />
            <Route path="/about" element={<About />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/map-gallery" element={<MapGallery />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <EnhanceProvider>
        <Toaster />
        <Sonner position="top-right" />
        <BrowserRouter>
          <ScrollToTop />
          <AnimatedRoutes />
          <NovaChat />
        </BrowserRouter>
      </EnhanceProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

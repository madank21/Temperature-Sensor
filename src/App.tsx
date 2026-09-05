import { AnimatePresence, motion } from "framer-motion";
import { Backdrop } from "./components/Backdrop";
import { TabBar } from "./components/TabBar";
import HistoryScreen from "./screens/HistoryScreen";
import HomeScreen from "./screens/HomeScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { AppProvider, useApp } from "./state/app";

/** Ambient depth inside the console itself — orbs + faint grid behind the glass. */
function InnerAmbience() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute -top-[18%] left-1/2 h-[340px] w-[120%] -translate-x-1/2 blur-2xl"
        style={{ background: "radial-gradient(ellipse, var(--orb-1), transparent 65%)" }}
      />
      <div
        className="absolute -bottom-[12%] -right-[30%] h-[300px] w-[300px] blur-2xl"
        style={{ background: "radial-gradient(circle, var(--orb-3), transparent 62%)" }}
      />
      <div
        className="absolute -left-[25%] top-[30%] h-[280px] w-[280px] blur-2xl"
        style={{ background: "radial-gradient(circle, var(--orb-2), transparent 62%)" }}
      />
      <div className="bg-grid mask-fade-bottom absolute inset-0 opacity-60" />
    </div>
  );
}

function Shell() {
  const { tab } = useApp();

  return (
    <div className="relative z-10 flex h-dvh w-full items-center justify-center md:p-6">
      {/* device frame — edge-to-edge on mobile, floating console on desktop */}
      <div
        className="noise relative flex h-dvh w-full flex-col overflow-hidden md:h-[min(880px,calc(100dvh-3.5rem))] md:w-[404px] md:rounded-[44px] md:border md:border-white/10"
        style={{ background: "var(--bg-base)", transition: "background-color 0.5s ease" }}
      >
        {/* desktop frame detailing */}
        <div className="pointer-events-none absolute inset-0 z-40 hidden rounded-[44px] shadow-[0_0_140px_-20px_rgba(94,140,255,0.35),0_60px_120px_-40px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(255,255,255,0.05)] md:block" />
        <div className="absolute left-1/2 top-2.5 z-40 hidden h-[5px] w-20 -translate-x-1/2 rounded-full bg-white/[0.08] md:block" />

        <InnerAmbience />

        <main className="relative z-10 min-h-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              className="h-full"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.38, ease: [0.215, 0.61, 0.355, 1] }}
            >
              {tab === "home" && <HomeScreen />}
              {tab === "history" && <HistoryScreen />}
              {tab === "settings" && <SettingsScreen />}
            </motion.div>
          </AnimatePresence>
        </main>

        <TabBar />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Backdrop />
      <Shell />
    </AppProvider>
  );
}

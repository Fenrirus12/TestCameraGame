import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Marquee from "./components/Marquee";
import MotionGame from "./components/MotionGame";
import Pipeline from "./components/Pipeline";
import StackSection from "./components/StackSection";
import CodeSection from "./components/CodeSection";
import Roadmap from "./components/Roadmap";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div id="top" className="noise relative min-h-screen bg-void text-white antialiased">
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <MotionGame />
        <Pipeline />
        <StackSection />
        <Marquee reverse />
        <CodeSection />
        <Roadmap />
      </main>
      <Footer />
    </div>
  );
}

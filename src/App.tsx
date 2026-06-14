import { BGPattern } from "@/components/ui/bg-pattern";

function App() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Grid background with fade — visible at center, fades toward edges */}
      <BGPattern variant="grid" mask="fade-edges" size={40} fill="#1a2227" />

      {/* Hero content */}
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <div className="max-w-3xl space-y-6">
          <h1 className="text-7xl font-bold tracking-tight sm:text-8xl md:text-9xl">
            Sahil
            <span className="block">Sahran</span>
          </h1>
          <p className="text-muted-foreground mx-auto max-w-xl text-lg">
            A beautiful background pattern component with multiple variants and
            fade masks — ready to use in your next project.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-lg px-8 text-sm font-medium transition-colors">
              Get Started
            </button>
            <button className="border-input hover:bg-accent hover:text-accent-foreground inline-flex h-11 items-center justify-center rounded-lg border bg-transparent px-8 text-sm font-medium transition-colors">
              Learn More
            </button>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-24 grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "6 Variants",
              desc: "Grid, dots, stripes, lines, checkerboard — pick your pattern.",
            },
            {
              title: "Fade Masks",
              desc: "Fade edges, center, top, bottom or any direction with CSS masks.",
            },
            {
              title: "Customizable",
              desc: "Control size, color, and mask — all via simple props.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-card text-card-foreground rounded-xl border p-6 text-left shadow-sm"
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;

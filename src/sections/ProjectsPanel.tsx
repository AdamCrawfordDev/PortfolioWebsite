const projects = [
  {
    number: "01",
    title: "PlanIt Festival",
    description:
      "A full-stack festival platform for organisers and attendees, with an offline-first mobile companion.",
    stack: [
      "Django",
      "DRF",
      "React",
      "Flutter",
    ],
    languages: [
      "Python",
      "TypeScript",
      "Dart",
    ],
  },
  {
    number: "02",
    title: "Self-Driving Car",
    description:
      "A reinforcement learning agent trained to navigate and improve its route around a 2D racing environment.",
    stack: [
      "PyTorch",
      "Pygame",
      "DQN",
    ],
    languages: [
      "Python",
    ],
  },
]

function ProjectsPanel() {
  return (
    <div className="relative pl-6 font-comic">
      <div
        className="
          absolute
          left-0
          top-1
          h-[calc(100%-8px)]
          w-px
          bg-white/15
        "
      />

      <div className="mb-4 text-xs tracking-wide text-white/30">
        /projects
      </div>

      <h2 className="font-comic-serif text-3xl text-white">
        Projects
      </h2>

      <p className="mt-2 text-sm text-white/45">
        A few things I've built.
      </p>

      <div className="mt-6">
        {projects.map((project, index) => (
          <div
            key={project.title}
            className={`
              py-5
              first:pt-0
              ${
                index !== projects.length - 1
                  ? "border-b border-dashed border-white/10"
                  : ""
              }
            `}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-white/25">
                {project.number} /
              </span>

              <h3 className="font-comic-serif text-xl text-white">
                {project.title}
              </h3>
            </div>

            <p className="mt-3 max-w-xl text-sm leading-6 text-white/50">
              {project.description}
            </p>

            <div className="mt-4 space-y-2 text-xs">
              <div>
                <span className="mr-3 text-white/25">
                  stack
                </span>

                <span className="text-white/50">
                  {project.stack.join(" · ")}
                </span>
              </div>

              <div>
                <span className="mr-3 text-white/25">
                  languages
                </span>

                <span className="text-white/50">
                  {project.languages.join(" · ")}
                </span>
              </div>
            </div>

            <div className="mt-4 text-right">
              <button
                type="button"
                className="
                  text-xs
                  text-white/40
                  transition-all
                  duration-150
                  hover:translate-x-1
                  hover:text-white
                "
              >
                open &gt;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProjectsPanel


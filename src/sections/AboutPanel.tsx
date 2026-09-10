function AboutPanel() {
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
        /about
      </div>

      <h2 className="font-comic-serif text-3xl text-white">
        Hi, I'm Adam.
      </h2>

      <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55">
        I'm a Computer Science graduate interested in building reliable,
        useful software across backend systems, machine learning and modern
        web applications.
      </p>

      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
        I enjoy working on projects where there is something interesting
        happening underneath the interface, whether that is reinforcement
        learning, offline-first applications or data-driven systems.
      </p>

      <div className="mt-6 border-t border-dashed border-white/10 pt-4">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/30">
          <span>
            status:{" "}
            <span className="text-white/55">
              available
            </span>
          </span>

          <span>
            focus:{" "}
            <span className="text-white/55">
              software + ML
            </span>
          </span>

          <span>
            location:{" "}
            <span className="text-white/55">
              London, UK
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

export default AboutPanel

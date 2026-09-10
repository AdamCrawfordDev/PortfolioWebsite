import List from "./List"

function Container() {
  return (
<main className="min-h-screen bg-navy-dark px-4 pb-6 pt-3 md:px-8 md:pb-8 md:pt-5">      <section className="mx-auto max-w-4xl">

        <fieldset
          className="
            w-full
            min-h-[440px]
            rounded-[8px_18px_10px_22px]
            border-2
            border-white/75
            px-5
            pb-5
            shadow-[8px_8px_0_rgba(255,255,255,0.06)]

            md:min-h-[470px]
            md:px-8
            md:pb-7
          "
        >
          <legend className="ml-2 px-2 md:ml-4">
            <div className="relative px-2">

              {/* Soft left border ending */}
              <span
                className="
                  absolute
                  -left-2
                  top-1/2
                  h-3
                  w-3
                  -translate-y-1/2
                  rotate-[-45deg]
                  rounded-full
                  border-2
                  border-white/75
                  border-b-transparent
                  border-r-transparent
                "
              />

              <h1
                className="
                  font-comic-serif
                  text-3xl
                  leading-none
                  text-white
                  md:text-5xl
                "
              >
                Adam Crawford
              </h1>

              {/* Soft right border ending */}
              <span
                className="
                  absolute
                  -right-2
                  top-1/2
                  h-3
                  w-3
                  -translate-y-1/2
                  rotate-[45deg]
                  rounded-full
                  border-2
                  border-white/75
                  border-b-transparent
                  border-l-transparent
                "
              />

            </div>
          </legend>

          <div
            className="
              relative
              flex
              min-h-[365px]
              flex-col
              pt-5
              md:min-h-[380px]
              md:pt-6
            "
          >
            <div className="absolute right-0 top-0 font-comic text-xs text-white/25">
              [ _ ] [ □ ] [ × ]
            </div>

            <div className="mb-5 md:mb-7">
              <p className="font-comic text-xs text-white/35 md:text-sm">
                interactive_portfolio
              </p>

              <p className="mt-1 font-comic text-sm text-white/60 md:text-base">
                Select a directory to continue.
              </p>
            </div>

            <div className="flex-1">
              <List />
            </div>
          </div>
        </fieldset>

        <p className="mt-2 rotate-[-1deg] text-right font-comic text-xs text-white/20">
          keyboard recommended :)
        </p>

      </section>
    </main>
  )
}

export default Container
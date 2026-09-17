import type {
  ReactNode,
} from "react"

import {
  isMiniGame,
} from "./types/minigames"

import type {
  MiniGameId,
} from "./types/minigames"

import type {
  NavigationItem,
} from "./types/navigation"


type SectionPanelProps = {
  item: NavigationItem

  onLaunchMiniGame:
    (game: MiniGameId) => void
}


function SectionPanel({
  item,
  onLaunchMiniGame,
}: SectionPanelProps) {

  // ========================================
  // ABOUT
  // ========================================

  if (
    item.id ===
    "about"
  ) {
    return (
      <PanelShell
        path={
          item.path
        }
      >
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
      </PanelShell>
    )
  }


  // ========================================
  // CONTACT
  // ========================================

  if (
    item.id ===
    "contact"
  ) {
    return (
      <PanelShell
        path={
          item.path
        }
      >
        <h2 className="font-comic-serif text-3xl text-white">
          Say hello.
        </h2>

        <p className="mt-4 max-w-xl text-sm leading-7 text-white/55">
          Want to talk about a project, an opportunity, or something
          interesting? You can find me here.
        </p>

        <div className="mt-6 space-y-3">

          <ContactLink
            label="email"
            value="adam@crawfordclan.org.uk"
            href="mailto:adam@crawfordclan.org.uk"
          />

          <ContactLink
            label="linkedin"
            value="adam-crawford-dev"
            href="https://linkedin.com/in/adam-crawford-234964419/"
          />

          <ContactLink
            label="github"
            value="AdamCrawfordDev"
            href="https://github.com/AdamCrawfordDev"
          />

        </div>

        <div className="mt-6 border-t border-dashed border-white/10 pt-4">
          <span className="font-comic text-xs text-white/25">
            status:{" "}

            <span className="text-white/50">
              open to opportunities
            </span>
          </span>
        </div>
      </PanelShell>
    )
  }


  // ========================================
  // DIRECTORY PREVIEW
  // ========================================

  if (
    item.children
      ?.length
  ) {
    return (
      <PanelShell
        path={
          item.path
        }
      >
        <h2 className="font-comic-serif text-3xl text-white">
          {item.name}
        </h2>

        {item.description && (
          <p className="mt-4 max-w-md text-sm leading-7 text-white/55">
            {item.description}
          </p>
        )}

        <div className="mt-5 font-comic text-xs text-white/30">
          {item.children.length}{" "}

          {item.children.length ===
          1
            ? "item"
            : "items"}
        </div>

        <div className="mt-6 border-t border-dashed border-white/10 pt-4">
          <div className="flex items-center gap-2 font-comic text-xs">

            <span className="text-white/25">
              ENTER
            </span>

            <span className="text-white/50">
              &gt; open directory
            </span>

          </div>
        </div>
      </PanelShell>
    )
  }


  // ========================================
  // MINIGAME EXECUTABLE
  // ========================================

  if (
    isMiniGame(
      item.id
    )
  ) {
    /*
     * NavigationItem.id is normally just
     * `string`, but isMiniGame() proves that
     * this particular value is a MiniGameId.
     *
     * Capture it here so TypeScript keeps
     * the narrowed type inside the callback.
     */

    const gameId: MiniGameId =
      item.id


    return (
      <MiniGamePanel
        item={
          item
        }
        onRun={() =>
          onLaunchMiniGame(
            gameId
          )
        }
      />
    )
  }


  // ========================================
  // PROJECT / EXPERIENCE
  // ========================================

  if (
    item.description ||
    item.subtitle ||
    item.highlights
  ) {
    return (
      <PanelShell
        path={
          item.path
        }
      >
        <h2 className="font-comic-serif text-3xl text-white">
          {item.name ===
          "Freelance IT"
            ? "Freelance IT Consultant"
            : item.name}
        </h2>


        {item.subtitle && (
          <p className="mt-1 text-sm text-white/45">
            {item.subtitle}
          </p>
        )}


        {(item.date ||
          item.location) && (
          <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-white/30">

            {item.date && (
              <span>
                {item.date}
              </span>
            )}

            {item.date &&
              item.location && (
              <span>
                ·
              </span>
            )}

            {item.location && (
              <span>
                {item.location}
              </span>
            )}

          </div>
        )}


        {item.description && (
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/55">
            {item.description}
          </p>
        )}


        {item.highlights && (
          <div className="mt-5 space-y-3">

            {item.highlights.map(
              (
                highlight
              ) => (
                <div
                  key={
                    highlight
                  }
                  className="
                    flex
                    gap-3
                    text-sm
                    leading-6
                    text-white/45
                  "
                >
                  <span className="shrink-0 text-white/25">
                    &gt;
                  </span>

                  <p>
                    {highlight}
                  </p>
                </div>
              )
            )}

          </div>
        )}


        {(item.stack ||
          item.languages) && (
          <div className="mt-6 border-t border-dashed border-white/10 pt-4">

            <div className="space-y-2 text-xs">

              {item.stack && (
                <div>
                  <span className="text-white/25">
                    stack:{" "}
                  </span>

                  <span className="text-white/55">
                    {item.stack.join(
                      " · "
                    )}
                  </span>
                </div>
              )}


              {item.languages && (
                <div>
                  <span className="text-white/25">
                    languages:{" "}
                  </span>

                  <span className="text-white/55">
                    {item.languages.join(
                      " · "
                    )}
                  </span>
                </div>
              )}

            </div>
          </div>
        )}

      </PanelShell>
    )
  }


  // ========================================
  // FALLBACK
  // ========================================

  return (
    <PanelShell
      path={
        item.path
      }
    >
      <h2 className="font-comic-serif text-3xl text-white">
        {item.name}
      </h2>

      <p className="mt-4 text-sm text-white/45">
        Content coming soon...
      </p>
    </PanelShell>
  )
}


// ========================================
// MINIGAME PANEL
// ========================================

type MiniGamePanelProps = {
  item: NavigationItem

  onRun: () => void
}


function MiniGamePanel({
  item,
}: MiniGamePanelProps) {

  return (
    <PanelShell
      path={
        item.path
      }
    >
      {/* ======================================== */}
      {/* GAME NAME */}
      {/* ======================================== */}

      <div
        className="
          font-comic
          text-[10px]
          tracking-[0.18em]
          text-emerald-200/45
        "
      >
        EXECUTABLE
      </div>

      <h2
        className="
          mt-1
          font-comic-serif
          text-3xl
          leading-none
          text-white
        "
      >
        {item.name}
      </h2>


      {/* ======================================== */}
      {/* DESCRIPTION */}
      {/* ======================================== */}

      {item.description && (
        <p className="mt-4 max-w-xl text-sm leading-7 text-white/55">
          {item.description}
        </p>
      )}

    </PanelShell>
  )
}


// ========================================
// PANEL SHELL
// ========================================

type PanelShellProps = {
  path: string

  children: ReactNode
}


function PanelShell({
  path,
  children,
}: PanelShellProps) {

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
        {path}
      </div>

      {children}

    </div>
  )
}


// ========================================
// CONTACT LINK
// ========================================

type ContactLinkProps = {
  label: string

  value: string

  href: string
}


function ContactLink({
  label,
  value,
  href,
}: ContactLinkProps) {

  const external =
    href.startsWith(
      "http"
    )


  return (
    <a
      href={
        href
      }
      target={
        external
          ? "_blank"
          : undefined
      }
      rel={
        external
          ? "noreferrer"
          : undefined
      }
      className="
        group
        flex
        max-w-md
        items-center
        gap-3
        font-comic
        text-sm
      "
    >
      <span
        className="
          text-white/25
          transition-all
          duration-150
          group-hover:translate-x-1
          group-hover:text-white/60
        "
      >
        &gt;
      </span>

      <span className="w-16 shrink-0 text-white/30">
        {label}
      </span>

      <span
        className="
          text-white/60
          underline
          decoration-white/15
          underline-offset-4
          transition-colors
          duration-150
          group-hover:text-white
          group-hover:decoration-white/50
        "
      >
        {value}
      </span>

    </a>
  )
}


export default SectionPanel
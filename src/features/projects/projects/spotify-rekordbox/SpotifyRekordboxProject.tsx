import ProjectReadme from "../../components/ProjectReadme"
import ProjectHeader from "../../components/ProjectHeader"
import ProjectSection from "../../components/ProjectSection"
import ProjectCallout from "../../components/ProjectCallout"
import ProjectFeature from "../../components/ProjectFeature"
import ProjectStack from "../../components/ProjectStack"

type SpotifyRekordboxProjectProps = {
  onBack?: () => void
}

export default function SpotifyRekordboxProject({
  onBack,
}: SpotifyRekordboxProjectProps) {
  return (
    <ProjectReadme
      projectId="spotify-rekordbox"
      onBack={onBack}
    >
      <ProjectHeader
        title="Spotify → Rekordbox Sync"
        subtitle="A Python tool for turning Spotify playlists into locally matched DJ libraries."
        stack={[
          "Python",
          "Spotify API",
          "Soulseek",
        ]}
        links={[
          {
            label: "GitHub",
            href: "https://github.com/AdamCrawfordDev/DjSoftware",
          },
        ]}
      />

      <ProjectSection title="From playlist to DJ library">
        Moving a playlist from a streaming service into DJ
        software is surprisingly awkward. This project
        automates that process by reading playlist metadata,
        locating candidate tracks and matching the results
        back to the original Spotify library.
      </ProjectSection>

      <ProjectCallout
        value="~90%"
        label="automatic track matching rate"
      />

      <ProjectSection title="Matching imperfect data">
        Track names are rarely represented consistently across
        different services. Artist formatting, featured artists,
        remixes and alternative versions all make a simple
        exact-string comparison unreliable.

        The matching pipeline therefore has to determine which
        candidate most closely represents the track the user
        actually requested.
      </ProjectSection>

      {/*
        This would be a good place for a diagram showing:

        Spotify Playlist
              ↓
        Metadata Extraction
              ↓
        Track Search
              ↓
        Candidate Matching
              ↓
        Local Library
      */}

      <ProjectFeature title="Automating the boring part">
        The goal was not simply to download a collection of
        files. The interesting problem was reducing how much
        manual work remained after processing a playlist, while
        still dealing sensibly with tracks that could not be
        matched confidently.
      </ProjectFeature>

      <ProjectStack
        groups={[
          {
            label: "Core",
            items: [
              "Python",
              "Spotify API",
            ],
          },
          {
            label: "Discovery",
            items: [
              "Soulseek",
              "Metadata Matching",
            ],
          },
        ]}
      />
    </ProjectReadme>
  )
}
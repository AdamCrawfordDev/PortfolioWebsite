import ProjectReadme from "../../components/ProjectReadme"
import ProjectHeader from "../../components/ProjectHeader"
import ProjectSection from "../../components/ProjectSection"
import ProjectFeature from "../../components/ProjectFeature"
import ProjectStack from "../../components/ProjectStack"

type PlanItProjectProps = {
  onBack?: () => void
}

export default function PlanItProject({
  onBack,
}: PlanItProjectProps) {
  return (
    <ProjectReadme
      projectId="planit"
      onBack={onBack}
    >
      <ProjectHeader
        title="PlanIt Festival"
        subtitle="A festival management platform built for organisers and attendees across web and mobile."
        stack={[
          "Django",
          "React",
          "TypeScript",
          "Flutter",
        ]}
        links={[
          {
            label: "GitHub",
            href: "YOUR_GITHUB_URL",
          },
        ]}
      />

      <ProjectSection title="One festival, two experiences">
        PlanIt gives festival organisers the tools to
        manage stages, artists and schedules while
        providing attendees with a completely separate
        experience for exploring the line-up and planning
        their day.
      </ProjectSection>

      {/*
        Add a large screenshot here later:

        <ProjectImage
          src={dashboard}
          alt="PlanIt organiser dashboard"
          caption="The festival organiser dashboard."
        />
      */}

      <ProjectSection title="Building the schedule">
        Sets are organised around their real start and end
        times to create an interactive festival timetable.
        Attendees can move between days and stages while
        keeping track of the performances they want to see.
      </ProjectSection>

      {/*
        Great place for:

        <ProjectImageGrid
          images={[
            { src: schedule, alt: "Festival schedule" },
            { src: mobile, alt: "Mobile schedule" },
          ]}
        />
      */}

      <ProjectFeature title="Built for the festival field">
        Festival sites are not exactly known for reliable
        mobile data. The Flutter companion therefore keeps
        festival information locally, supports optimistic
        interactions and can continue to provide useful
        schedule information without a reliable connection.
      </ProjectFeature>

      <ProjectStack
        groups={[
          {
            label: "Backend",
            items: [
              "Django",
              "Django REST Framework",
              "PostgreSQL",
            ],
          },
          {
            label: "Web",
            items: [
              "React",
              "TypeScript",
              "Tailwind CSS",
            ],
          },
          {
            label: "Mobile",
            items: [
              "Flutter",
              "Riverpod",
              "Drift",
            ],
          },
        ]}
      />
    </ProjectReadme>
  )
}
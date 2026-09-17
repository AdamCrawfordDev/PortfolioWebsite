import ProjectReadme from "../../components/ProjectReadme"
import ProjectHeader from "../../components/ProjectHeader"
import ProjectSection from "../../components/ProjectSection"
import ProjectFeature from "../../components/ProjectFeature"
import ProjectStack from "../../components/ProjectStack"

type RestaurantManagementProjectProps = {
  onBack?: () => void
}

export default function RestaurantManagementProject({
  onBack,
}: RestaurantManagementProjectProps) {
  return (
    <ProjectReadme
      projectId="restaurant-management"
      onBack={onBack}
    >
      <ProjectHeader
        title="Restaurant Management System"
        subtitle="A full-stack restaurant platform built by a seven-person development team."
        stack={[
          "React",
          "Spring",
          "WebSockets",
          "Stripe",
        ]}
        links={[
          {
            label: "GitHub",
            href: "YOUR_GITHUB_URL",
          },
        ]}
      />

      <ProjectSection title="Running a restaurant in real time">
        The system brings ordering, payments and restaurant
        operations together in one application. Changes made
        by customers or staff can be reflected throughout the
        system without relying on constant manual refreshes.
      </ProjectSection>

      {/*
        Put a wide screenshot of the application here.
      */}

      <ProjectFeature title="Real-time communication">
        WebSockets were used where different parts of the
        restaurant needed to react immediately to changing
        information, creating a more responsive experience
        across the application.
      </ProjectFeature>

      <ProjectSection title="Building it as a team">
        The project was developed by a seven-person team using
        Scrum. I worked as Scrum Master while also contributing
        directly to the software, balancing implementation with
        coordinating work across the team.
      </ProjectSection>

      {/*
        An image grid could show:
        - customer ordering
        - staff interface
        - payment flow
      */}

      <ProjectStack
        groups={[
          {
            label: "Frontend",
            items: [
              "React",
              "JavaScript",
              "CSS",
            ],
          },
          {
            label: "Backend",
            items: [
              "Spring",
              "Java",
              "WebSockets",
            ],
          },
          {
            label: "Payments",
            items: [
              "Stripe",
            ],
          },
          {
            label: "Development",
            items: [
              "Scrum",
              "Git",
              "Team Development",
            ],
          },
        ]}
      />
    </ProjectReadme>
  )
}
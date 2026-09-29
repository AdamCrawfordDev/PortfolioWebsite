import ProjectReadme from "../../components/ProjectReadme"
import ProjectHeader from "../../components/ProjectHeader"
import ProjectFeature from "../../components/ProjectFeature"
import ProjectSection from "../../components/ProjectSection"
import ProjectStack from "../../components/ProjectStack"

import oaxacaImage from "../../assets/restaurant-management/oaxaca.webp"


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
    href: "",
    unavailableMessage:
      "This was a university team project, so the source repository isn't publicly available.",
  },
]}
      />


      <ProjectFeature
        title="Running a restaurant in real time"
        image={oaxacaImage}
        imageAlt="Restaurant management system application interface"
        mediaSide="right"
      >
        The system brings ordering, payments and restaurant
        operations together in one application. Changes made
        by customers or staff can be reflected throughout the
        system without relying on constant manual refreshes.
      </ProjectFeature>


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

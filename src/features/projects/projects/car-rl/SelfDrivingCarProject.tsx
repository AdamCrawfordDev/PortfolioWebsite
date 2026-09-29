import ProjectReadme from "../../components/ProjectReadme"
import ProjectHeader from "../../components/ProjectHeader"
import ProjectSection from "../../components/ProjectSection"
import ProjectFeature from "../../components/ProjectFeature"
import ProjectCallout from "../../components/ProjectCallout"
import ProjectStack from "../../components/ProjectStack"

import carDriveVideo from "../../assets/car-rl/car_drive.webm"


type SelfDrivingCarProjectProps = {
  onBack?: () => void
}


export default function SelfDrivingCarProject({
  onBack,
}: SelfDrivingCarProjectProps) {
  return (
    <ProjectReadme
      projectId="car-rl"
      onBack={onBack}
    >

      <ProjectHeader
        title="Self-Driving Car"
        subtitle="A reinforcement learning agent trained to navigate and optimise its route around a custom 2D racing environment."
        stack={[
          "Python",
          "PyTorch",
          "Pygame",
          "DQN",
        ]}
        links={[
          {
            label: "GitHub",
            href: "https://github.com/AdamCrawfordDev/CarGame",
          },
        ]}
      />


      {/* ========================================
          INTRODUCTION + VIDEO
      ======================================== */}

      <ProjectFeature
        title="Teaching a car to race"
        video={carDriveVideo}
        videoAlt="Self-driving reinforcement learning agent navigating the custom Pygame racing environment"
        videoCaption="The trained agent navigating the custom racing environment."
      >
        Rather than defining a racing line or scripting how the
        car should move around the circuit, I built an agent that
        learns through reinforcement. The car observes its
        environment, chooses an action and receives feedback based
        on how successfully it progresses around the track.
      </ProjectFeature>


      {/* ========================================
          TRAINING ENVIRONMENT
      ======================================== */}

      <ProjectSection title="A custom training environment">
        The racing environment was built from scratch using Pygame.
        It handles the car's movement, rotation, track collisions,
        checkpoints and lap progression while exposing the state
        required by the reinforcement learning agent.

        Building the environment myself also gave me control over
        the reward system, making it possible to change what the
        model was encouraged to learn as training progressed.
      </ProjectSection>


      <ProjectCallout
        value="DQN"
        label="PyTorch reinforcement learning agent trained directly inside the custom racing environment."
      />


      <ProjectSection title="Learning the whole circuit">
        A model that can drive from one starting position is not
        necessarily a robust driver. Training was extended to use
        different starting points around the circuit, forcing the
        agent to learn how to recover and navigate individual
        sections rather than depending on a single memorised
        sequence from the start line.
      </ProjectSection>


      <ProjectFeature title="From finishing laps to driving faster">
        Once the agent could navigate the circuit reliably, simply
        rewarding completion became less useful. I introduced
        sector timing so that different parts of a lap could be
        evaluated independently.

        The agent can then receive additional feedback based on how
        its sector time compares with a baseline. Faster sectors are
        rewarded while slower ones are penalised, shifting the
        objective from merely surviving the circuit towards finding
        a more efficient route through it.
      </ProjectFeature>


      <ProjectSection title="Why sector timing matters">
        Measuring individual sectors makes optimisation much more
        targeted than relying only on a final lap time. An
        improvement through one part of the circuit can be
        recognised immediately instead of being hidden by mistakes
        made much later in the lap.

        It also makes training easier to inspect. I can see which
        areas of the track the model has improved and where its
        behaviour still needs work.
      </ProjectSection>


      <ProjectStack
        groups={[
          {
            label: "Machine Learning",
            items: [
              "PyTorch",
              "Deep Q-Network",
              "Reinforcement Learning",
              "Experience Replay",
            ],
          },
          {
            label: "Environment",
            items: [
              "Python",
              "Pygame",
              "Collision Detection",
              "Checkpoints",
            ],
          },
          {
            label: "Training",
            items: [
              "Epsilon-Greedy Exploration",
              "Random Starts",
              "Sector Rewards",
              "Model Snapshots",
            ],
          },
          {
            label: "Optimisation",
            items: [
              "Sector Timing",
              "Baseline Comparison",
              "Reward Shaping",
              "Fine-Tuning",
            ],
          },
        ]}
      />

    </ProjectReadme>
  )
}

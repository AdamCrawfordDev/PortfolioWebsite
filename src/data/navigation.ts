import type {
  NavigationItem,
} from "../types/navigation"

import underline1 from "../assets/underlines/underline-1.svg"
import underline2 from "../assets/underlines/underline-2.svg"
import underline3 from "../assets/underlines/underline-3.svg"
import underline4 from "../assets/underlines/underline-4.svg"
import underline5 from "../assets/underlines/underline-5.svg"


// ========================================
// UNDERLINES
// ========================================

export const underlines = [
  underline1,
  underline2,
  underline3,
  underline4,
  underline5,
]


// ========================================
// NAVIGATION
// ========================================

export const navigation:
  NavigationItem[] = [

  // ========================================
  // ABOUT
  // ========================================

  {
    id: "about",
    name: "About",
    path: "/about",
  },


  // ========================================
  // PROJECTS
  // ========================================

  {
    id: "projects",
    name: "Projects",
    path: "/projects",

    description:
      "Things I've built, experimented with and learnt from.",

    children: [
      {
        id: "planit",
        name: "PlanIt Festival",
        path: "/projects/planit",

        description:
          "A full-stack festival scheduling system with a companion Flutter iOS application designed to remain useful without connectivity.",

        stack: [
          "Django",
          "DRF",
          "React",
          "Flutter",
          "SQLite",
        ],

        languages: [
          "Python",
          "TypeScript",
          "Dart",
        ],
      },

      {
        id: "car-rl",
        name: "Self-Driving Car",
        path: "/projects/car-rl",

        description:
          "A reinforcement learning agent trained to navigate and optimise its route around a custom 2D racing environment.",

        stack: [
          "PyTorch",
          "Pygame",
          "DQN",
        ],

        languages: [
          "Python",
        ],
      },

      {
        id: "restaurant",
        name: "Restaurant System",
        path: "/projects/restaurant",

        description:
          "A real-time restaurant management system developed by a seven-person team, connecting customer, front-of-house and kitchen clients.",

        stack: [
          "React",
          "Spring Boot",
          "WebSockets",
          "Stripe",
          "GitLab",
        ],

        languages: [
          "TypeScript",
          "Java",
        ],
      },

      {
        id: "rekordbox",
        name: "Rekordbox Sync",
        path: "/projects/rekordbox",

        description:
          "A Python pipeline for synchronising Spotify playlists with Rekordbox and automatically sourcing missing tracks through Soulseek.",

        stack: [
          "Spotify API",
          "Rekordbox",
          "Soulseek",
        ],

        languages: [
          "Python",
        ],
      },
    ],
  },


  // ========================================
  // EXPERIENCE
  // ========================================

  {
    id: "experience",
    name: "Experience",
    path: "/experience",

    description:
      "A bit of what I've done outside the code editor.",

    children: [
      {
        id: "freelance-it",
        name: "Freelance IT",
        path: "/experience/freelance-it",

        subtitle:
          "Consolidation Consultancy Limited",

        date:
          "2025",

        location:
          "London, UK",

        description:
          "Designed and deployed a Linux-based file synchronisation solution across multiple client workspaces.",

        highlights: [
          "Reviewed the client's requirements and designed the synchronisation architecture.",
          "Deployed Syncthing with centralised network storage for automatic file synchronisation.",
          "Delivered a system that has operated reliably for more than 18 months with minimal intervention.",
        ],

        stack: [
          "Linux",
          "Syncthing",
          "Network Storage",
        ],
      },

      {
        id: "bar-supervisor",
        name: "Bar Supervisor",
        path: "/experience/bar-supervisor",

        subtitle:
          "Royal Holloway Students' Union",

        date:
          "2024 – 2026",

        location:
          "Egham, UK",

        description:
          "Promoted from Bar Team Member to Bar Supervisor, taking responsibility for large teams during busy club nights and events.",

        highlights: [
          "Led teams of up to 40 staff, delegating responsibilities and adapting priorities throughout service.",
          "Coordinated bar staff, Duty Managers and security during time-sensitive incidents.",
          "Developed practical leadership, communication and decision-making experience in a fast-moving environment.",
        ],
      },
    ],
  },


  // ========================================
  // MINIGAMES
  // ========================================

  {
    id: "minigames",
    name: "Minigames",
    path: "/minigames",

    description:
      "Small distractions built for absolutely no good reason.",

    children: [

      // ========================================
      // CI/CD DEFENSE
      // ========================================

      {
        id: "ci-cd-defense",
        name: "CI/CD Defense",
        path:
          "/minigames/ci-cd-defense",

        description:
          "Defend the CI/CD pipeline from bugs as they move through each stage towards production.",

        subtitle:
          "interactive game",
      },


      // ========================================
      // PACKET POLICE
      // ========================================

      {
        id: "packet-police",
        name: "Packet Police",
        path:
          "/minigames/packet-police",

        description:
          "Patrol the network and intercept corrupted packets before they crash a protected service.",

        subtitle:
          "interactive game",
      },


      // ========================================
      // MEMORY LEAK
      // ========================================

      {
        id: "memory-leak",
        name: "Memory Leak",
        path:
          "/minigames/memory-leak",

        description:
          "Your memory is disappearing one block at a time. Remember the pattern before everything gets garbage collected.",

        subtitle:
          "tiny game · coming soon",
      },
    ],
  },


  // ========================================
  // CONTACT
  // ========================================

  {
    id: "contact",
    name: "Contact",
    path: "/contact",
  },
]
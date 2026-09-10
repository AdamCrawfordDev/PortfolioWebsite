import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
function Containor() {
  return (
    <div className="relative bg-navy-light pt-5 min-h-screen">

      <div className="relative m-4">

        <h1 className="absolute -top-5 left-4 bg-navy-light px-2 font-comic-serif text-4xl text-white font-bold">
          Adam Crawford
        </h1>

        <div className="border border-white min-h-64 p-6">
          Content goes here
        </div>

      </div>

    </div>
  )
}

export default Containor


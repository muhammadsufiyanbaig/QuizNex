import React from 'react'
import Pic from "../../utils/assets/landingpage.jpg";

const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-12 md:pb-32 md:pt-52 bg-white flex items-center justify-center  h-full">
        <div className="mx-auto lg:max-w-[1600px] w-full px-5 sm:px-10 md:px-12 lg:px-5 flex flex-col lg:flex-row gap-10 lg:gap-12 items-center justify-center">
          <div className="absolute w-full lg:w-1/2 inset-y-0 lg:right-0 hidden lg:block">
            <span className="absolute -left-6 md:left-4 top-24 lg:top-28 w-24 h-24 rotate-90 skew-x-12 rounded-3xl bg-teal-400 blur-xl opacity-60 lg:opacity-95 lg:block hidden"></span>
            <span className="absolute right-4 bottom-12 w-24 h-24 rounded-3xl bg-teal-400 blur-xl opacity-80"></span>
          </div>
          <span className="w-4/12 lg:w-2/12 aspect-square bg-gradient-to-tr from-teal-400 to-teal-100 absolute -top-5 lg:left-0 rounded-full skew-y-12 blur-2xl opacity-40 skew-x-12 rotate-90"></span>
          <div className="relative flex flex-col items-center text-center lg:text-left lg:py-7 xl:py-8 lg:items-start lg:max-w-none max-w-3xl mx-auto lg:mx-0 lg:flex-1 lg:w-1/2">
            <h1 className="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-bold text-gray-900">
              Challenge your <span className="block py-2"> mind with </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-teal-500 to-teal-800">
                Quizzical-Keen
              </span>
            </h1>
            <p className="mt-8 text-gray-700 text-lg max-w-96">
              Experience a secure and engaging quiz platform where teachers
              create and manage quizzes effortlessly, and students challenge
              themselves in a fair, cheat-proof environment. Join us and elevate
              your learning today!
            </p>
          </div>
          <div className="flex flex-1 lg:w-1/2 lg:h-auto bg-teal-50 relative lg:max-w-none lg:mx-0 mx-auto max-w-3xl rounded-2xl shadow-lg">
            <img
              src={Pic}
              alt="Hero image"
              width="500"
              height="1000"
              className="lg:w-full rounded-3xl object-cover lg:max-h-[640px] max-h-60"
            />
          </div>
        </div>
      </section>
  )
}

export default HeroSection

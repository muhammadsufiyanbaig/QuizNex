import React from "react";
import Pic from "../utils/assets/landingPage.png";
import Navbar from "./Navbar";
const LandingPage = () => {
  return (
    <section className="relative py-32 lg:py-36 bg-white flex items-center justify-center h-screen">
      <Navbar />
      <div className="mx-auto lg:max-w-7xl w-full px-5 sm:px-10 md:px-12 lg:px-5 flex flex-col lg:flex-row gap-10 lg:gap-12 items-center justify-center">
        <div className="absolute w-full lg:w-1/2 inset-y-0 lg:right-0 hidden lg:block">
          <span className="absolute -left-6 md:left-4 top-24 lg:top-28 w-24 h-24 rotate-90 skew-x-12 rounded-3xl bg-teal-500 blur-xl opacity-60 lg:opacity-95 lg:block hidden"></span>
          <span className="absolute right-4 bottom-12 w-24 h-24 rounded-3xl bg-Teal-600 blur-xl opacity-80"></span>
        </div>
        <span className="w-4/12 lg:w-2/12 aspect-square bg-gradient-to-tr from-Teal-600 to-green-400 absolute -top-5 lg:left-0 rounded-full skew-y-12 blur-2xl opacity-40 skew-x-12 rotate-90"></span>
        <div className="relative flex flex-col items-center text-center lg:text-left lg:py-7 xl:py-8 lg:items-start lg:max-w-none max-w-3xl mx-auto lg:mx-0 lg:flex-1 lg:w-1/2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-bold text-gray-900">
            Challenge your <span className="block py-2"> mind with </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-500 from-20% via-Teal-600 via-30% to-teal-600">
              Quizzical-Keen
            </span>{" "}
          </h1>
          <p className="mt-8 text-gray-700">
            Lorem ipsum, dolor sit amet consectetur adipisicing elit. Dolores
            repellat perspiciatis aspernatur quis voluptatum porro incidunt,
            libero sequi quos eos velit
          </p>
        </div>
        <div className="flex flex-1 lg:w-1/2 lg:h-auto relative lg:max-w-none lg:mx-0 mx-auto max-w-3xl  rounded-2xl shadow-lg">
          <img
            src={Pic}
            alt="Hero image"
            width="2350"
            height="2359"
            className=" lg:w-full lg:h-full rounded-3xl object-cover lg:max-h-none max-h-96"
          />
        </div>
      </div>
    </section>
  );
};

export default LandingPage;

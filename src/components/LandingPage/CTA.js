import React from "react";
import { Link } from "react-router-dom";
import pic from '../../utils/assets/about.jpg';

const CTA = () => {
  return (
    <div className="mx-auto max-w-screen-2xl px-4 md:px-8 ">
      <div className="flex flex-col overflow-hidden rounded-xl sm:flex-row md:h-80 shadow-lg bg-teal-50">
        {/* content - start */}
        <div className="flex w-full flex-col p-4 sm:w-1/2 sm:p-8 lg:w-2/5">
          <h2 className="mb-4 text-lg font-bold text-gray-900 sm:text-xl md:text-2xl lg:text-4xl">  
            Ignite Learning with
            <br />
            Engaging Quizzes!
          </h2>

          <p className="mb-8 max-w-md text-gray-400">
          Create impactful assessments effortlessly. Engage students and track their progress with ease.{" "}
            <Link
              to={"/teacher/auth/signup"}
              className="duration-300 ease-linear hover:text-teal-600 font-bold"
            >
              Sign Up Now
            </Link>{" "}
            to enhance your teaching!
          </p>

          <div className="mt-auto">
            <Link
              to="/teacher/auth/signup"
              className="flex justify-center items-center w-full sm:w-max px-6 h-12 rounded-md outline-none relative overflow-hidden border duration-300 ease-linear after:absolute after:inset-x-0 after:aspect-square after:scale-0 after:opacity-70 after:origin-center after:duration-300 after:ease-linear after:rounded-full after:top-0 after:left-0 after:bg-teal-600 hover:after:opacity-100 hover:after:scale-[2.5] bg-teal-500 border-transparent hover:border-teal-500"
            >
              <span className="relative z-10 text-white">Get Started</span>
            </Link>
          </div>
        </div>
        {/* content - end */}

        {/* image - start */}
        <div className="order-first h-48 w-full bg-gray-700 sm:order-none sm:h-auto sm:w-1/2 lg:w-3/5">
          <img
            src={pic}
            loading="lazy"
            alt="Teacher conducting a quiz"
            className="h-full w-full object-cover object-center rounded-r-xl"
          />
        </div>
        {/* image - end */}
      </div>
    </div>
  );
};

export default CTA;

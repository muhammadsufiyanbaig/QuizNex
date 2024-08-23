import React from "react";
import logo from '../../utils/assets/logo.png';
import { Link } from "react-router-dom";
const Footer = () => {
  return (
    <footer className="bg-white rounded-lg shadow-lg dark:bg-gray-900 m-4">
      <div className="w-full max-w-screen-xl mx-auto p-4 md:py-3">
        <div className="sm:flex sm:items-center sm:justify-between">
          {/* logo */}
          <div className="min-w-max inline-flex relative">
            <Link to="/" className="relative flex items-center gap-3">
              <div className="flex flex-1 relative mx-auto max-w-3xl">
                <img
                  src={logo}
                  alt="Logo"
                  width="50"
                  height="50"
                  className="rounded-xl object-cover h-10 w-10"
                />
              </div>
              <div className="inline-flex text-2xl font-medium font-serif text-gray-600">QuizNex</div>
            </Link>
          </div>
          <ul className="flex flex-wrap items-center mb-6 text-sm font-medium text-gray-500 sm:mb-0 dark:text-gray-400">
            <li>
              <a href="#home" className="duration-300 font-medium  hover:text-teal-600 hover:underline me-4 md:me-6">
                Home
              </a>
            </li>
            <li>
              <a href="#about" className="duration-300 font-medium  hover:text-teal-600 hover:underline me-4 md:me-6">
                About
              </a>
            </li>
            <li>
              <a href="#features" className="duration-300 font-medium  hover:text-teal-600 hover:underline me-4 md:me-6">
                Features
              </a>
            </li>
            <li>
              <a href="#contact" className="duration-300 font-medium  hover:text-teal-600 hover:underline">
                Contact
              </a>
            </li>
          </ul>
        </div>
        <hr className="my-6 border-gray-200 sm:mx-auto dark:border-gray-700 lg:my-8" />
        <span className="block text-sm text-gray-500 sm:text-center dark:text-gray-400">
          ©{new Date().getFullYear()}{" "}
          <Link to="https://muhammadsufiyanbaig.vercel.app/" target="_blank" className="duration-300 font-medium ease-linear hover:text-teal-600 hover:underline">
            Muhammad Sufiyan Baig
          </Link>
          . All Rights Reserved.
        </span>
      </div>
    </footer>
  );
};

export default Footer;

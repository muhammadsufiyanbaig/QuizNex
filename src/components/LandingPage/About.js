import React from "react";
import Pic from "../../utils/assets/cta.jpg";

const About = () => {
  return (
    <div id="about" className="pt-5 md:pt-20">
      <h1 className="text-center text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-bold text-gray-900">
        About Us
      </h1>
      <div className="relative py-10 bg-white flex items-center justify-center">
        <div className="mx-auto lg:max-w-[1600px] w-full px-5 sm:px-6 md:px-12 lg:px-5 flex flex-col lg:flex-row gap-10 lg:gap-12 items-center justify-center">
          <div className="flex flex-1 bg-teal-50 rounded-2xl shadow-lg lg:shadow-none">
            <img
              src={Pic}
              alt="Hero image"
              className="w-full h-full object-cover rounded-3xl"
            />
          </div>
          <div className="flex flex-1 flex-col lg:text-left lg:py-7 xl:py-8 lg:items-start lg:max-w-none max-w-3xl mx-auto lg:mx-0">
            <p className="text-gray-700 text-lg mb-6">
              At our core, we are committed to creating a safe and engaging
              quiz platform designed to enrich the learning experience for
              both educators and students. Our primary mission is to empower
              educators by providing them with an intuitive and efficient tool
              to craft and manage quizzes. By streamlining the quiz creation
              process, we enable teachers to focus more on delivering quality
              education and less on the complexities of quiz administration.
            </p>
            <p className="text-gray-700 text-lg mb-6">
              For students, our platform offers a reliable and secure
              environment where they can confidently test their knowledge. We
              understand the importance of a fair testing space and have
              meticulously designed our system to uphold the highest standards
              of security and integrity. This dedication ensures that students
              can engage in their assessments without concerns about unfair
              practices or technical issues.
            </p>
            <p className="text-gray-700 text-lg">
              Our commitment to fairness and integrity is reflected in
              every aspect of our platform. We have implemented robust
              measures to safeguard the quiz-taking process, ensuring that
              each quiz is conducted under secure conditions. By doing so, we
              allow students to concentrate on their learning and performance,
              rather than being distracted by potential disruptions. Through
              our thoughtful and secure approach, we aim to support educators
              in their mission to foster effective learning environments and
              to assist students in reaching their educational goals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;

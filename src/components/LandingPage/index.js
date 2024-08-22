import React from "react";
import Navbar from "./Navbar";
import HeroSection from "./HeroSection";
import Footer from "./Footer";
import CTA from "./CTA";
import FeaturesSection from "./FeaturesSection";
import About from "./About";
import Contact from "./Contact";

const LandingPage = () => {
  return (
    <>
      <Navbar />
      <HeroSection/>
      <CTA/>
      <About/>
      <FeaturesSection/>
      <Contact/>
      <Footer/>
    </>
  );
};

export default LandingPage;

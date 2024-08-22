import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../utils/assets/logo.png';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const teacherId = localStorage.getItem('TeacherId');
    if (userId) {
      setRole('user');
    } else if (teacherId) {
      setRole('teacher');
    }
  }, []);

  const checkingRole = () => {
    const userId = localStorage.getItem('userId');
    const teacherId = localStorage.getItem('TeacherId');
    if (userId) {
      setRole('user');
      navigate('/portal');
    } else if (teacherId) {
      setRole('teacher');
      navigate('/teacher/portal');
    } else{
      navigate('/auth/login')
    }
  }

  const toggleNavbar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <header className="absolute inset-x-0 top-0 z-50 h-14 py-4">
      <div className="mx-auto lg:max-w-[1600px] w-full px-5 sm:px-10 md:px-12 lg:px-5">
        <nav className="w-full flex justify-between gap-6 relative">
          {/* logo */}
          <div className="min-w-max inline-flex relative">
            <Link to="/" className="relative flex items-center gap-1 md:gap-3">
              <div className="flex flex-1 relative mx-auto max-w-96 md:max-w-3xl">
                <img
                  src={logo}
                  alt="Logo"
                  width="80"
                  height="80"
                  className="rounded-xl md:h-10 md:w-10 h-8 w-8 object-cover"
                />
              </div>
              <div className="inline-flex text-2xl font-medium font-serif text-gray-500">QuizNex</div>
            </Link>
          </div>

          <div
            aria-hidden={!isOpen}
            className={`fixed inset-0 lg:!hidden bg-gray-800/60 bg-opacity-50 backdrop-filter backdrop-blur-xl ${isOpen ? '' : 'hidden'}`}
          ></div>
          <div
            className={`flex ${isOpen ? 'visible opacity-100 translate-y-0 scale-y-100' : 'invisible opacity-0 translate-y-10 overflow-hidden'
              } lg:visible lg:opacity-100 lg:-translate-y-0 lg:scale-y-100 duration-300 ease-linear flex-col gap-y-6 gap-x-4 lg:flex-row w-full lg:justify-between lg:items-center absolute lg:relative top-full lg:top-0 bg-white lg:!bg-transparent border-x border-x-gray-100 lg:border-x-0`}
          >
            <ul className="border-t border-gray-100 lg:border-t-0 px-6 lg:px-0 pt-6 lg:pt-0 flex flex-col lg:flex-row gap-y-4 gap-x-3 lg:space-x-7 text-lg text-gray-700 w-full lg:justify-center lg:items-center">
              <li>
                <Link to="#aboutus" className="duration-300 text-gray-700 font-medium ease-linear hover:text-teal-600 py-3">
                  About us
                </Link>
              </li>
              <li>
                <Link to="#contact" className="duration-300 text-gray-700 font-medium ease-linear hover:text-teal-600 py-3">
                  Features
                </Link>
              </li>
              <li>
                <Link to="#contact" className="duration-300 text-gray-700 font-medium ease-linear hover:text-teal-600 py-3">
                  Contact Us
                </Link>
              </li>
            </ul>

            
              <div className="lg:min-w-max flex items-center sm:w-max w-full pb-6 lg:pb-0 border-b border-gray-100 lg:border-0 px-6 lg:px-0">
                <button
                  to= {role === 'user'? "/portal": role === "teacher" ? "/teacher/portal" :"/auth/login"}
                  onClick={checkingRole}
                  className="flex justify-center items-center w-full sm:w-max px-6 h-12 rounded-full outline-none relative overflow-hidden border duration-300 ease-linear after:absolute after:inset-x-0 after:aspect-square after:scale-0 after:opacity-70 after:origin-center after:duration-300 after:ease-linear after:rounded-full after:top-0 after:left-0 after:bg-teal-600 hover:after:opacity-100 hover:after:scale-[2.5] bg-teal-500 border-transparent hover:border-teal-500"
                >
                  <span className="relative z-10 text-white">{role === 'user'? "Portal": role === "teacher" ? "Teacher Portal" :"Login"}</span>
                </button>
              </div>
            
          </div>

          <div className="min-w-max flex items-center gap-x-3">
            <button
              onClick={toggleNavbar}
              className="lg:hidden lg:invisible outline-none w-7 h-auto flex flex-col relative"
            >
              <span
                className={`w-6 h-0.5 rounded-full bg-gray-700 transition-all duration-300 ease-linear ${isOpen ? 'translate-y-1.5 rotate-45' : ''
                  }`}
              ></span>
              <span
                className={`w-6 origin-center mt-1 h-0.5 rounded-ful bg-gray-700 transition-all duration-300 ease-linear ${isOpen ? 'scale-x-0 opacity-0' : ''
                  }`}
              ></span>
              <span
                className={`w-6 mt-1 h-0.5 rounded-ful bg-gray-700 transition-all duration-300 ease-linear ${isOpen ? '-translate-y-1.5 -rotate-45' : ''
                  }`}
              ></span>
              <span className="sr-only">togglenav</span>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;

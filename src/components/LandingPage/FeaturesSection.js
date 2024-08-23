import React from 'react';

const features = [
  // {
  //   title: 'Growth',
  //   description: 'Easily track and measure your progress with detailed analytics and insights.',
  //   icon: (
  //     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  //     </svg>
  //   ),
  // },
  // {
  //   title: 'Security',
  //   description: 'Ensure a secure testing environment with robust security measures in place.',
  //   icon: (
  //     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  //     </svg>
  //   ),
  // },
  {
    title: 'Cloud',
    description: 'Store and access your quizzes and data securely in our database through teacher portal.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
  },
  {
    title: 'Speed',
    description: 'Experience fast and responsive quiz performance for a smooth user experience.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Support',
    description: 'Get help and support whenever you need it with our dedicated customer service.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  // {
  //   title: 'Dark Mode',
  //   description: 'Switch to dark mode for a comfortable viewing experience in low light conditions.',
  //   icon: (
  //     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  //     </svg>
  //   ),
  // },
];

const FeaturesSection = () => {
  return (
    <div id='features' className="bg-white py-6 sm:py-8 lg:py-12">
      <div className="mx-auto max-w-screen-2xl px-4 md:px-8">
        {/* Text */}
        <div className="mb-10 md:mb-16">
          <h2 className="mb-4 text-center text-2xl font-bold text-gray-800 md:mb-6 lg:text-3xl">Our Features</h2>
          <p className="mx-auto max-w-screen-sm text-center text-gray-500 md:text-lg">
            Discover the key features that make our quiz platform exceptional for both teachers and students.
          </p>
        </div>

        <div className="grid gap-12 sm:grid-cols-2 xl:grid-cols-3 xl:gap-16">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-teal-500 text-white shadow-lg md:h-14 md:w-14 md:rounded-xl">
                {feature.icon}
              </div>
              <h3 className="mb-2 text-center text-lg font-semibold md:text-xl text-teal-800">{feature.title}</h3>
              <p className="mb-2 text-center text-gray-500 max-w-72">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturesSection;

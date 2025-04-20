import React, { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const Help: React.FC = () => {
  const slides = [
    "/1.png",
    // "/2.png",
    "/3.png",
    "/4.png",
    "/5.png",
    "/6.png",
    "/7.png",
    "/8.png",
    "/9.png",
    "/10.png",
    "/11.png",
    "/12.png",
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  return (
    <div className="container mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Manual</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Guide to using DinDin AI system
        </p>
      </header>

      <div className="relative mx-auto" style={{ maxWidth: '90vw', height: '80vh' }}>
        <div className="relative h-full bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
          <img
            src={slides[currentSlide]}
            alt={`Guide slide ${currentSlide + 1}`}
            className="w-full h-full object-contain"
          />
          
          {/* ปุ่มเลื่อนซ้าย */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all"
            aria-label="Previous slide"
          >
            <FaChevronLeft className="w-8 h-8" />
          </button>

          {/* ปุ่มเลื่อนขวา */}
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all"
            aria-label="Next slide"
          >
            <FaChevronRight className="w-8 h-8" />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all
                  ${currentSlide === index 
                    ? 'bg-white scale-125' 
                    : 'bg-white/50 hover:bg-white/75'}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 text-center text-base text-gray-600 dark:text-gray-400">
          Slide {currentSlide + 1} of {slides.length}
        </div>
      </div>
    </div>
  );
};

export default Help; 
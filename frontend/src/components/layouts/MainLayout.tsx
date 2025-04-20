import React, { useState } from 'react';
import Header from '../header/header';
import Sidebar from '../sidebar/sidebar';
import { FaBars } from 'react-icons/fa';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900">
      <div 
        className={`
          fixed top-0 left-0 z-40 w-64 h-full bg-white dark:bg-gray-800 transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:min-w-[16rem] lg:w-64 lg:flex-shrink-0 border-r border-gray-200 dark:border-gray-700
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-400 dark:scrollbar-track-gray-700
        `}
      >
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex flex-col flex-1 w-full min-w-0">
        <div className="fixed top-0 right-0 left-0 lg:left-64 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center px-4 h-16">
            <button
              className="p-2 lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <FaBars className="h-6 w-6 dark:text-gray-200" />
            </button>
            <Header />
          </div>
        </div>

        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-45 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-auto mt-16 lg:mt-16 bg-white dark:bg-gray-800 scrollbar scrollbar-thumb-gray-500 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-400 dark:scrollbar-track-gray-700 pb-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout; 
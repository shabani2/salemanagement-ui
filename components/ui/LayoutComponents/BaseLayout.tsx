// 'use client';

// import { useState, ReactNode, useEffect, useRef, useCallback } from 'react';
// import { Navbar } from './Navbar';
// import { Sidebar } from './Sidebar';
// import { Footer } from './Footer';
// import { usePathname, useRouter } from 'next/navigation';
// import { useDispatch, useSelector } from 'react-redux';
// //import { selectAuthUser } from '@/stores/slices/auth/authSlice';
// import { ClipLoader } from 'react-spinners';
// import { AppDispatch, RootState } from '@/stores/store';
// import {
//   fetchOrganisations,
//   selectCurrentOrganisation,
// } from '@/stores/slices/organisation/organisationSlice';
// import { ThemeProvider } from '@/app/providers/ThemeProvider';

// interface LayoutProps {
//   children: ReactNode;
// }

// export default function BaseLayout({ children }: LayoutProps) {
//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const pathname = usePathname();
//   const noLayoutPages = ['/login'];
//   const router = useRouter();
//   const dispatch = useDispatch<AppDispatch>();
//   const currentOrganisation = useSelector((state: RootState) => selectCurrentOrganisation(state));
//   const mainRef = useRef<HTMLDivElement>(null);
//  //const router = useRouter();
//  const [navigationLoading, setNavigationLoading] = useState(false);
//   useEffect(() => {
//     dispatch(fetchOrganisations());
//   }, [dispatch, currentOrganisation]);

//    useEffect(() => {
//     const handleStart = () => setNavigationLoading(true);
//     const handleComplete = () => setNavigationLoading(false);

//     router.events.on('routeChangeStart', handleStart);
//     router.events.on('routeChangeComplete', handleComplete);
//     router.events.on('routeChangeError', handleComplete);

//     return () => {
//       router.events.off('routeChangeStart', handleStart);
//       router.events.off('routeChangeComplete', handleComplete);
//       router.events.off('routeChangeError', handleComplete);
//     };
//   }, [router]);

//     const handleNavigation = useCallback((path: string) => {
//     if (pathname !== path) {
//       router.push(path);
//     }
//   }, [pathname, router]);

//   useEffect(() => {
//     if (loading) {
//       setLoading(false);
//     }
//   }, [loading, pathname]);

//   useEffect(() => {
//     if (!mainRef.current) return;
//     const mainEl = mainRef.current;
//     const handleResize = () => {
//       if (mainEl.scrollWidth > mainEl.clientWidth) {
//         mainEl.style.width = '100%';
//       } else {
//         mainEl.style.width = 'auto';
//       }
//     };
//     handleResize();
//     const resizeObserver = new ResizeObserver(handleResize);
//     resizeObserver.observe(mainEl);
//     return () => resizeObserver.disconnect();
//   }, [sidebarOpen]);

//   if (noLayoutPages.includes(pathname)) {
//     return <div className="w-full h-full">{children}</div>;
//   }

//   const handleNavigation = (path: string) => {
//     if (pathname !== path) {
//       setLoading(true);
//       router.push(path);
//     }
//   };

//   return (
//     <ThemeProvider>
//       <div className="flex flex-col min-h-screen bg-gray-200 w-full text-[10px]">
//         <Navbar
//           isOpen={sidebarOpen}
//           onMenuClick={() => setSidebarOpen(!sidebarOpen)}
//           onNavigate={handleNavigation}
//         />
//         <div className="flex flex-1 min-w-0">
//           <Sidebar
//             isOpen={sidebarOpen}
//             onClose={() => setSidebarOpen(false)}
//             setLoading={setLoading}
//           />
//           <div
//             className={`flex flex-col flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}
//           >
//             <main ref={mainRef} className="flex-1 p-6 mt-16">
//               {loading ? (
//                 <div className="flex justify-center items-center h-full">
//                   <ClipLoader color="#22c55e" size={60} />
//                 </div>
//               ) : (
//                 children
//               )}
//             </main>
//             <footer className="h-[72px] w-full bg-gray-50 dark:bg-gray-50 flex items-center justify-center border-t">
//               <Footer />
//             </footer>
//           </div>
//         </div>
//       </div>
//     </ThemeProvider>
//   );
// }

'use client';

import { useState, ReactNode, useEffect, useRef, useTransition } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { ClipLoader } from 'react-spinners';
import { AppDispatch, RootState } from '@/stores/store';
import {
  fetchOrganisations,
  selectCurrentOrganisation,
} from '@/stores/slices/organisation/organisationSlice';
import { ThemeProvider } from '@/app/providers/ThemeProvider';

interface LayoutProps {
  children: ReactNode;
}

export default function BaseLayout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const currentOrganisation = useSelector((state: RootState) => selectCurrentOrganisation(state));
  const mainRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  // Chargement initial des organisations si nécessaire
  useEffect(() => {
    if (!currentOrganisation) {
      dispatch(fetchOrganisations());
    }
  }, [dispatch, currentOrganisation]);

  // Redimensionnement du contenu principal à l'ouverture du sidebar
  useEffect(() => {
    if (!mainRef.current) return;
    const mainEl = mainRef.current;
    const handleResize = () => {
      mainEl.style.width = mainEl.scrollWidth > mainEl.clientWidth ? '100%' : 'auto';
    };
    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mainEl);
    return () => resizeObserver.disconnect();
  }, [sidebarOpen]);

  // Pages sans layout
  const noLayoutPages = ['/login', '/subscription'];
  if (noLayoutPages.includes(pathname)) {
    return <div className="w-full h-full">{children}</div>;
  }

  const handleNavigation = (path: string) => {
    if (pathname !== path) {
      startTransition(() => {
        router.push(path);
      });
    }
  };

  return (
    <ThemeProvider>
      <div className="flex flex-col min-h-screen bg-gray-200 w-full text-[10px]">
        <Navbar
          isOpen={sidebarOpen}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onNavigate={handleNavigation}
        />
        <div className="flex flex-1 min-w-0">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div
            className={`flex flex-col flex-1 transition-all duration-300 ${
              sidebarOpen ? 'ml-64' : 'ml-0'
            }`}
          >
            <main ref={mainRef} className="flex-1 p-6 mt-16">
              {isPending ? (
                <div className="flex justify-center items-center h-full">
                  <ClipLoader color="#22c55e" size={60} />
                </div>
              ) : (
                children
              )}
            </main>
            {/* <main ref={mainRef} className="flex-1 p-6 mt-16">
  {children}
</main> */}

            <footer className="h-[72px] w-full bg-gray-50 dark:bg-gray-50 flex items-center justify-center border-t">
              <Footer />
            </footer>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

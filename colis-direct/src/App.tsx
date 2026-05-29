import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CartProvider } from './contexts/CartContext';
import { UserSpaceProvider, useUserSpace, userHasDualClientProAccess } from './contexts/UserSpaceContext';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import HowItWorksPage from './pages/HowItWorksPage';
import BecomeRelayPage from './pages/BecomeRelayPage';
import RelayApplicationPage from './pages/RelayApplicationPage';
import BecomeTransporterPage from './pages/BecomeTransporterPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelPage from './pages/PaymentCancelPage';
import PricingPage from './pages/PricingPage';
import TrackingPage from './pages/TrackingPage';
import MapPage from './pages/MapPage';
import AboutPage from './pages/AboutPage';
import CreateShipmentPage from './pages/CreateShipmentPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import RelayDashboard from './pages/RelayDashboard';
import TransporterLoginPage from './pages/TransporterLoginPage';
import TransporterPickupPage from './pages/TransporterPickupPage';
import ProDashboard from './pages/ProDashboard';
import CustomerSupportDashboard from './pages/support/CustomerSupportDashboard';
import MyProfilePage from './pages/MyProfilePage';
import MyShipmentsPage from './pages/MyShipmentsPage';
import MyAddressBookPage from './pages/MyAddressBookPage';
import MyAddressesPage from './pages/MyAddressesPage';
import MyPurchasesPage from './pages/MyPurchasesPage';
import MessageriesPage from './pages/MessageriesPage';
import CartPage from './pages/CartPage';
import CareerPage from './pages/CareerPage';
import CGVPage from './pages/CGVPage';
import CGUPage from './pages/CGUPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import InsurancePolicyPage from './pages/InsurancePolicyPage';
import LegalNoticePage from './pages/LegalNoticePage';
import UserMenu from './components/UserMenu';
import LoadingSpinner from './components/LoadingSpinner';
import ConsentBanner from './components/ConsentBanner';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type PageType = 'home' | 'how-it-works' | 'become-relay' | 'relay-application' | 'become-transporter' | 'pricing' | 'tracking' | 'map' | 'about' | 'create-shipment' | 'login' | 'admin-dashboard' | 'relay-dashboard' | 'transporter-login' | 'transporter-pickup' | 'pro-dashboard' | 'support-dashboard' | 'payment-success' | 'payment-cancel' | 'my-profile' | 'my-shipments' | 'my-address-book' | 'my-addresses' | 'my-purchases' | 'messageries' | 'cart' | 'career' | 'cgv' | 'cgu' | 'privacy-policy' | 'insurance-policy' | 'legal-notice';

const LAST_PAGE_STORAGE_KEY = 'colisdirect:last-page';
const ALL_PAGES: PageType[] = [
  'home',
  'how-it-works',
  'become-relay',
  'relay-application',
  'become-transporter',
  'pricing',
  'tracking',
  'map',
  'about',
  'create-shipment',
  'login',
  'admin-dashboard',
  'relay-dashboard',
  'transporter-login',
  'transporter-pickup',
  'pro-dashboard',
  'support-dashboard',
  'payment-success',
  'payment-cancel',
  'career',
  'my-profile',
  'my-shipments',
  'my-address-book',
  'my-addresses',
  'my-purchases',
  'messageries',
  'cart',
  'cgv',
  'cgu',
  'privacy-policy',
  'insurance-policy',
  'legal-notice',
];

const isValidPage = (value: unknown): value is PageType =>
  typeof value === 'string' && (ALL_PAGES as string[]).includes(value);

function AppContentWrapper() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const { user, loading } = useAuth();
  const { activeSpace } = useUserSpace();

  const navigate = (page: string) => {
    if (isValidPage(page)) setCurrentPage(page);
  };

  // Make setCurrentPage available globally for transporter pages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).onNavigate = (page: string) => {
        if (isValidPage(page)) {
          setCurrentPage(page);
        }
      };
    }
  }, []);

  // Handle hash routing for payment redirects (only once on mount)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    if (hash.startsWith('#/payment-success')) {
      setCurrentPage('payment-success');
      return;
    }
    if (hash.startsWith('#/payment-cancel')) {
      setCurrentPage('payment-cancel');
      return;
    }

    const stored = window.localStorage?.getItem(LAST_PAGE_STORAGE_KEY) ?? null;
    if (stored && isValidPage(stored)) {
      setCurrentPage(stored);
    }
  }, []);

  // Redirect based on user role (only when user changes and not loading)
  useEffect(() => {
    if (loading) return;

    if (!user) {
      // After logout: redirect away from protected pages
      const protectedPages: PageType[] = ['admin-dashboard', 'relay-dashboard', 'transporter-login', 'transporter-pickup', 'pro-dashboard', 'support-dashboard', 'my-profile', 'my-shipments', 'my-address-book', 'my-addresses', 'my-purchases', 'messageries'];
      if (protectedPages.includes(currentPage)) {
        setCurrentPage('home');
      }
      return;
    }

    // Transporters: only allowed on their own pages
    if (user.role === 'transporter') {
      const allowedPages: PageType[] = ['transporter-login', 'transporter-pickup'];
      if (!allowedPages.includes(currentPage)) {
        setCurrentPage('transporter-login');
        return;
      }
    }

    // Admin: redirect to dashboard if on home or login
    if (user.role === 'admin') {
      if (currentPage === 'home' || currentPage === 'login') {
        setCurrentPage('admin-dashboard');
        return;
      }
      // Block admin from relay/transporter/support dashboards
      if (currentPage === 'relay-dashboard' || currentPage === 'support-dashboard') {
        setCurrentPage('admin-dashboard');
        return;
      }
    }

    // Support: redirect to support dashboard
    if (user.role === 'support') {
      if (currentPage === 'home' || currentPage === 'login') {
        setCurrentPage('support-dashboard');
        return;
      }
      if (currentPage === 'admin-dashboard' || currentPage === 'relay-dashboard' || currentPage === 'transporter-login' || currentPage === 'transporter-pickup') {
        setCurrentPage('support-dashboard');
        return;
      }
    }

    // Relay partner: redirect to relay dashboard
    if (user.role === 'relay_partner') {
      if (currentPage === 'home' || currentPage === 'login') {
        setCurrentPage('relay-dashboard');
        return;
      }
      // Block relay from admin/support/transporter dashboards
      if (currentPage === 'admin-dashboard' || currentPage === 'support-dashboard' || currentPage === 'transporter-login' || currentPage === 'transporter-pickup') {
        setCurrentPage('relay-dashboard');
        return;
      }
    }

    // Client/Pro: redirect away from admin/relay/support dashboards
    if (user.role === 'client' || user.role === 'pro') {
      if (currentPage === 'admin-dashboard' || currentPage === 'relay-dashboard' || currentPage === 'support-dashboard') {
        setCurrentPage('home');
        return;
      }
      if (currentPage === 'login') {
        if (userHasDualClientProAccess(user) && activeSpace === 'pro') {
          setCurrentPage('pro-dashboard');
        } else {
          setCurrentPage('home');
        }
        return;
      }
    }
  }, [user, loading, activeSpace, currentPage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LAST_PAGE_STORAGE_KEY, currentPage);
  }, [currentPage]);

  const renderPage = () => {
    // Block transporters from accessing client pages
    if (user && user.role === 'transporter') {
      const allowedPages: PageType[] = ['transporter-login', 'transporter-pickup'];
      if (!allowedPages.includes(currentPage)) {
        return <TransporterLoginPage onNavigate={navigate} />;
      }
    }

    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={navigate} />;
      case 'how-it-works':
        return <HowItWorksPage onNavigate={navigate} />;
      case 'become-relay':
        return <BecomeRelayPage onNavigate={navigate} />;
      case 'relay-application':
        return <RelayApplicationPage onNavigate={navigate} />;
      case 'become-transporter':
        return <BecomeTransporterPage onNavigate={navigate} />;
      case 'pricing':
        return <PricingPage onNavigate={navigate} />;
      case 'tracking':
        return <TrackingPage onNavigate={navigate} />;
      case 'map':
        return <MapPage />;
      case 'about':
        return <AboutPage />;
      case 'career':
        return <CareerPage onNavigate={navigate} />;
      case 'cgv':
        return <CGVPage onNavigate={navigate} />;
      case 'cgu':
        return <CGUPage onNavigate={navigate} />;
      case 'privacy-policy':
        return <PrivacyPolicyPage onNavigate={navigate} />;
      case 'insurance-policy':
        return <InsurancePolicyPage onNavigate={navigate} />;
      case 'legal-notice':
        return <LegalNoticePage onNavigate={navigate} />;
      case 'create-shipment':
        return <CreateShipmentPage onNavigate={navigate} />;
      case 'login':
        return <LoginPage onNavigate={navigate} />;
      case 'admin-dashboard':
        return <AdminDashboard onNavigate={navigate} />;
      case 'relay-dashboard':
        return <RelayDashboard onNavigate={navigate} />;
        case 'transporter-login':
          return <TransporterLoginPage onNavigate={navigate} />;
        case 'transporter-pickup':
          return <TransporterPickupPage />;
      case 'pro-dashboard':
        return <ProDashboard onNavigate={navigate} />;
      case 'support-dashboard':
        return <CustomerSupportDashboard onNavigate={navigate} />;
      case 'payment-success':
        return <PaymentSuccessPage onNavigate={navigate} />;
      case 'payment-cancel':
        return <PaymentCancelPage onNavigate={navigate} />;
      case 'my-profile':
        return <MyProfilePage onNavigate={navigate} />;
      case 'my-shipments':
        return <MyShipmentsPage onNavigate={navigate} />;
      case 'my-address-book':
        return <MyAddressBookPage onNavigate={navigate} />;
      case 'my-addresses':
        return <MyAddressesPage onNavigate={navigate} />;
      case 'my-purchases':
        return <MyPurchasesPage onNavigate={navigate} />;
      case 'messageries':
        return <MessageriesPage onNavigate={navigate} />;
      case 'cart':
        return <CartPage onNavigate={navigate} />;
      default:
        return <HomePage onNavigate={navigate} />;
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Chargement..." />;
  }

  // Pages that have their own header (dashboards, create-shipment for pro users)
      const pagesWithOwnHeader = ['admin-dashboard', 'relay-dashboard', 'transporter-login', 'transporter-pickup', 'pro-dashboard', 'support-dashboard'];
  const hasOwnHeader = pagesWithOwnHeader.includes(currentPage);
  
  // User pages that should have the standard header
  const userPages = ['my-profile', 'my-shipments', 'my-address-book', 'my-addresses', 'my-purchases', 'messageries'];
  const isUserPage = userPages.includes(currentPage);

  // Don't show header for transporters (they have their own interface)
  const isTransporter = user && user.role === 'transporter';

  return (
    <div className="min-h-screen bg-white">
      {!hasOwnHeader && !isTransporter && <Header currentPage={currentPage as any} onNavigate={navigate} />}
      {isUserPage && !isTransporter ? (
        <div className="flex">
          <UserMenu currentPage={currentPage} onNavigate={navigate} />
          <div className="flex-1 min-w-0 pb-16 md:pb-0">
            {renderPage()}
          </div>
        </div>
      ) : (
        renderPage()
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserSpaceProvider>
          <CartProvider>
            <AppContentWrapper />
            <ConsentBanner />
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              pauseOnHover
              draggable
            />
          </CartProvider>
        </UserSpaceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

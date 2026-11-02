import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import { AuthProvider } from './features/auth/AuthProvider';
import { GoogleAnalyticsTracker } from './components/analytics/GoogleAnalyticsTracker';
import { CookieConsentBanner } from './components/common/CookieConsentBanner';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GoogleAnalyticsTracker />
        <AppRoutes />
        <CookieConsentBanner />
      </AuthProvider>
    </BrowserRouter>
  );
}


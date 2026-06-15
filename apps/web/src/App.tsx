import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuth } from './hooks/useAuth';
import { usePermissions } from './hooks/usePermissions';
import { AdminPage } from './pages/AdminPage';
import { GuestReaderPage } from './pages/GuestReaderPage';
import { LoginPage } from './pages/LoginPage';
import { ReaderPage } from './pages/ReaderPage';
import { RegisterPage } from './pages/RegisterPage';
import { SearchPage } from './pages/SearchPage';
import { SettingsPage } from './pages/SettingsPage';
import { ShelfPage } from './pages/ShelfPage';
import { SourceEditorPage } from './pages/SourceEditorPage';
import { SourcesPage } from './pages/SourcesPage';
import { SourceStorePage } from './pages/SourceStorePage';
import { SourceWizardPage } from './pages/SourceWizardPage';
import { UploadPage } from './pages/UploadPage';
import { OnboardingModal } from './components/OnboardingModal';

function AppRoutes() {
  const { user, loading, logout } = useAuth();
  const { can } = usePermissions(user);

  if (loading) {
    return <div className="p-8 text-center">加载中...</div>;
  }

  return (
    <>
      {user && <OnboardingModal user={user} />}
      <Layout user={user} onLogout={logout} can={can}>
        <Routes>
          <Route path="/" element={<Navigate to="/shelf" replace />} />
          <Route path="/shelf" element={<ShelfPage user={user} />} />
          <Route path="/search" element={<SearchPage user={user} canSearch={can('searchBooks')} />} />
          <Route path="/source-store" element={<SourceStorePage user={user} canImport={can('importSources')} />} />
          <Route path="/sources" element={<SourcesPage user={user} canImport={can('importSources')} />} />
          {can('sourceWizard') && <Route path="/source-wizard" element={<SourceWizardPage user={user} />} />}
          {user && <Route path="/source-editor/:id" element={<SourceEditorPage />} />}
          <Route path="/upload" element={<UploadPage user={user} canUpload={can('cloudUpload')} canLocal={can('localBooks')} />} />
          <Route path="/settings" element={<SettingsPage user={user} />} />
          <Route path="/read/:bookId" element={<ReaderPage />} />
          <Route path="/read/guest/:shelfItemId" element={<GuestReaderPage />} />
          {user?.role === 'ADMIN' && can('adminPanel') && <Route path="/admin" element={<AdminPage />} />}
          <Route path="/login" element={user ? <Navigate to="/shelf" replace /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to="/shelf" replace /> : <RegisterPage />} />
          <Route path="*" element={<Navigate to="/shelf" replace />} />
        </Routes>
      </Layout>
    </>
  );
}

export default function App() {
  return <AppRoutes />;
}

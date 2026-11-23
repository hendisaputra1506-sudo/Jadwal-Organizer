import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginPage } from './pages/Login/LoginPage';
import { WeeklySchedulePage } from './pages/WeeklySchedule/WeeklySchedulePage';
import { CalendarPage } from './pages/Calendar/CalendarPage';
import { MyDutiesPage } from './pages/MyDuties/MyDutiesPage';
import { AllEventsPage } from './pages/AllEvents/AllEventsPage';
import { EventDetailPage } from './pages/EventDetail/EventDetailPage';
import { EventFormPage } from './pages/EventForm/EventFormPage';
import { TentativeEventsPage } from './pages/TentativeEvents/TentativeEventsPage';
import { PrintSchedulePage } from './pages/PrintSchedule/PrintSchedulePage';
import { ManageCategoriesPage } from './pages/Admin/ManageCategoriesPage';
import { ManageLocationsPage } from './pages/Admin/ManageLocationsPage';
import { ManageUsersPage } from './pages/Admin/ManageUsersPage';
import { LetterTemplatesPage } from './pages/Letters/LetterTemplatesPage';

// Lazy-loaded Archive & Guide pages (aturan performa: kode halaman hanya dimuat saat menu dibuka!)
const ArchivePage = lazy(() => import('./pages/Archive/ArchivePage'));
const GuidePage = lazy(() => import('./pages/Guide/GuidePage'));

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/weekly" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes within AppLayout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Default redirect to Weekly Schedule */}
              <Route index element={<Navigate to="/weekly" replace />} />

              {/* Primary Schedule View */}
              <Route path="weekly" element={<WeeklySchedulePage />} />

              {/* Calendar Views */}
              <Route path="calendar" element={<CalendarPage />} />

              {/* My Assigned Duties Schedule */}
              <Route path="my-duties" element={<MyDutiesPage />} />

              {/* Events Views (Accessible by both Admin & Staff) */}
              <Route path="events" element={<AllEventsPage />} />
              <Route path="events/new" element={<EventFormPage />} />
              <Route path="events/:id" element={<EventDetailPage />} />
              <Route path="events/:id/edit" element={<EventFormPage />} />

              {/* Tentative Schedules */}
              <Route path="tentative" element={<TentativeEventsPage />} />

              {/* Archive & Documentation (Lazy-loaded) */}
              <Route
                path="archive"
                element={
                  <Suspense
                    fallback={
                      <div className="min-h-[60vh] flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    }
                  >
                    <ArchivePage />
                  </Suspense>
                }
              />

              {/* Print View */}
              <Route path="print" element={<PrintSchedulePage />} />

              {/* Letter Templates & Bulk Print */}
              <Route path="letters" element={<LetterTemplatesPage />} />

              {/* User Guide & Feature Documentation (Lazy-loaded) */}
              <Route
                path="guide"
                element={
                  <Suspense
                    fallback={
                      <div className="min-h-[60vh] flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    }
                  >
                    <GuidePage />
                  </Suspense>
                }
              />

              {/* Admin Only Routes */}
              <Route
                path="admin/users"
                element={
                  <AdminRoute>
                    <ManageUsersPage />
                  </AdminRoute>
                }
              />
              <Route
                path="admin/categories"
                element={
                  <AdminRoute>
                    <ManageCategoriesPage />
                  </AdminRoute>
                }
              />
              <Route
                path="admin/locations"
                element={
                  <AdminRoute>
                    <ManageLocationsPage />
                  </AdminRoute>
                }
              />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/weekly" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

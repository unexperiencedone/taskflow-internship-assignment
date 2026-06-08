import { AuthProvider } from '@/context/AuthContext';
import './globals.css';

export const metadata = {
  title: 'TaskFlow | Secure, Scalable Task Workspace',
  description: 'A premium full-stack Task Management System featuring role-based access control, secure JWT cookies, input validation, and Redis caching.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

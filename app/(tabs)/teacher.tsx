import { Redirect } from 'expo-router';
import { useAuth } from '@/store/auth';

export default function TeacherTabRedirect() {
  const isAdmin = useAuth((s) => s.profile?.role === 'admin');
  if (!isAdmin) return <Redirect href="/(tabs)" />;
  return <Redirect href={'/teacher' as any} />;
}

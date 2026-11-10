import { Redirect } from 'expo-router';
import { useSession } from '../store/session';

// Any unknown or blocked address goes to the right screen for the current user
export default function NotFound() {
  const status = useSession((s) => s.status);
  const profileComplete = useSession((s) => s.profileComplete);

  if (status === 'loading') return null;
  if (status === 'signedIn') {
    return <Redirect href={profileComplete ? '/home' : '/profile-setup'} />;
  }
  return <Redirect href="/" />;
}
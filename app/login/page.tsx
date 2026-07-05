import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/auth';
import { AuthForm } from '@/components/AuthForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getCurrentUserId()) redirect('/');
  return <AuthForm mode="login" />;
}

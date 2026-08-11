import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';

export default async function CreateLayout({ children }) {
  if (!(await getCurrentUser())) {
    redirect('/login?next=/create');
  }

  return children;
}

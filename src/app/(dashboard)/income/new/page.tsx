import { redirect } from 'next/navigation';

export default function NewIncomePage() {
  redirect('/transactions/new?type=INCOME');
}

import { redirect } from 'next/navigation';

export default function NewExpensePage() {
  redirect('/transactions/new?type=EXPENSE');
}

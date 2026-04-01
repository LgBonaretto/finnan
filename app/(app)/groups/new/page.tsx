import { redirect } from 'next/navigation'

// Creation is now handled via dialog on /groups page
export default function NewGroupPage() {
  redirect('/groups')
}

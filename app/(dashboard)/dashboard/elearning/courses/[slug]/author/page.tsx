import { redirect } from 'next/navigation'

export default function AuthorRedirectPage({ params }: { params: { slug: string } }) {
  redirect(`/dashboard/elearning/courses/${params.slug}/edit`)
}

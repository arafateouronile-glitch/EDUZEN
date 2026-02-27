import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type StudentsDistributionItem = {
  name: string
  students: number
  fullLabel: string
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()

    if (userError || !userRow?.organization_id) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    const organizationId = userRow.organization_id

    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, name, code')
      .eq('organization_id', organizationId)

    if (classesError || !classes || classes.length === 0) {
      return NextResponse.json([] as StudentsDistributionItem[])
    }

    const classIds = classes.map((c: { id: string }) => c.id).filter(Boolean)
    if (classIds.length === 0) {
      return NextResponse.json([] as StudentsDistributionItem[])
    }

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('class_id')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .in('class_id', classIds)

    if (studentsError) {
      return NextResponse.json([] as StudentsDistributionItem[])
    }

    const counts = new Map<string, number>()
    for (const row of students || []) {
      if (!row.class_id) continue
      counts.set(row.class_id, (counts.get(row.class_id) || 0) + 1)
    }

    const payload: StudentsDistributionItem[] = classes
      .map((classItem: { id: string; name: string; code: string }) => {
        const count = counts.get(classItem.id) || 0
        const displayName = classItem.name.length > 20 ? `${classItem.name.substring(0, 20)}...` : classItem.name
        return {
          name: displayName,
          students: count,
          fullLabel: `${classItem.code} - ${classItem.name}`,
        }
      })
      .filter((item) => item.students > 0)
      .sort((a, b) => b.students - a.students)
      .slice(0, 10)

    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=30')
    return res
  } catch (error) {
    console.error('students distribution error', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

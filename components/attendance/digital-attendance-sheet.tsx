'use client'

export interface AttendancePerson {
  id: string
  name: string
  email: string
  status: 'present' | 'absent'
  timestamp: string
  signatureUrl?: string
}

function AttendanceRow({ person }: { person: AttendancePerson }) {
  const isAbsent = person.status === 'absent'
  const hasTimestamp = !!person.timestamp
  const [date, time] = hasTimestamp && person.timestamp.includes(' - ')
    ? person.timestamp.split(' - ')
    : [person.timestamp, '']

  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-3 px-4 last:border-b-0">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="font-medium text-gray-800 text-sm whitespace-nowrap">{person.name}</span>
          <span className="text-xs text-gray-400 truncate">{person.email}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        {isAbsent ? (
          <span className="border border-red-500 text-red-500 text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-widest select-none">
            ABSENT
          </span>
        ) : person.signatureUrl ? (
          <div className="w-[84px] h-9 flex items-center justify-center">
            <img
              src={person.signatureUrl}
              alt="Signature"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-[84px] h-9" />
        )}

        {hasTimestamp ? (
          <div className={`text-right text-xs leading-tight min-w-[72px] ${isAbsent ? 'text-red-500' : 'text-gray-400'}`}>
            <div className="font-medium">{date}</div>
            {time && <div>{time}</div>}
          </div>
        ) : (
          <div className="min-w-[72px]" />
        )}
      </div>
    </div>
  )
}

interface DigitalAttendanceSheetProps {
  trainers?: AttendancePerson[]
  learners?: AttendancePerson[]
}

export function DigitalAttendanceSheet({
  trainers = [],
  learners = [],
}: DigitalAttendanceSheetProps) {
  return (
    <div className="bg-white font-sans divide-y divide-gray-100">
      {trainers.length > 0 && (
        <section>
          <div className="flex items-center gap-2 bg-gray-100 border-b border-gray-200 py-2 px-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Formateurs</span>
            <span className="text-xs font-bold text-blue-500">{trainers.length}</span>
          </div>
          {trainers.map((person) => (
            <AttendanceRow key={person.id} person={person} />
          ))}
        </section>
      )}

      <section>
        <div className="flex items-center gap-2 bg-gray-100 border-b border-gray-200 py-2 px-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Apprenants</span>
          <span className="text-xs font-bold text-blue-500">{learners.length}</span>
        </div>
        {learners.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Aucun apprenant</p>
        ) : (
          learners.map((person) => (
            <AttendanceRow key={person.id} person={person} />
          ))
        )}
      </section>
    </div>
  )
}

'use client'

import { motion } from '@/components/ui/motion'
import { useMemo } from 'react'
import { format, subDays, startOfWeek, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'

interface AdminActivityHeatmapProps {
  activityData?: Array<{
    date: Date
    enrollments: number
    payments: number
    sessions: number
  }>
  weeks?: number
}

export function AdminActivityHeatmap({ activityData = [], weeks = 12 }: AdminActivityHeatmapProps) {
  const { grid, months, maxActivity } = useMemo(() => {
    const today = new Date()
    const startDate = subDays(today, weeks * 7)
    const weekStart = startOfWeek(startDate, { weekStartsOn: 1 })

    // Créer une map pour un accès rapide aux données
    const activityMap = new Map<string, { enrollments: number; payments: number; sessions: number }>()
    activityData.forEach(({ date, enrollments, payments, sessions }) => {
      const key = format(date, 'yyyy-MM-dd')
      activityMap.set(key, { enrollments, payments, sessions })
    })

    // Générer la grille
    const grid: Array<Array<{ date: Date; total: number; enrollments: number; payments: number; sessions: number; day: string }>> = []
    const months: Array<{ name: string; offset: number }> = []
    let currentMonth = ''
    let maxActivity = 0

    for (let week = 0; week < weeks; week++) {
      const weekData = []
      for (let day = 0; day < 7; day++) {
        const date = addDays(weekStart, week * 7 + day)
        const key = format(date, 'yyyy-MM-dd')
        const activity = activityMap.get(key) || {
          enrollments: Math.floor(Math.random() * 10),
          payments: Math.floor(Math.random() * 8),
          sessions: Math.floor(Math.random() * 5),
        }

        const total = activity.enrollments + activity.payments + activity.sessions

        if (total > maxActivity) maxActivity = total

        weekData.push({
          date,
          total,
          enrollments: activity.enrollments,
          payments: activity.payments,
          sessions: activity.sessions,
          day: format(date, 'EEE', { locale: fr }),
        })

        // Tracker les mois
        const monthName = format(date, 'MMM', { locale: fr })
        if (monthName !== currentMonth && day === 0) {
          months.push({ name: monthName, offset: week })
          currentMonth = monthName
        }
      }
      grid.push(weekData)
    }

    return { grid, months, maxActivity }
  }, [activityData, weeks])

  const getIntensityColor = (total: number) => {
    if (total === 0) return 'bg-gray-100'
    const intensity = Math.min(total / maxActivity, 1)
    if (intensity < 0.25) return 'bg-brand-blue/20'
    if (intensity < 0.5) return 'bg-brand-blue/40'
    if (intensity < 0.75) return 'bg-brand-blue/60'
    return 'bg-brand-blue'
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-flex flex-col gap-2 min-w-full">
        {/* Mois */}
        <div className="flex gap-1 pl-8 mb-1">
          {months.map((month, i) => (
            <div
              key={i}
              className="text-xs text-gray-500 font-medium"
              style={{ marginLeft: i > 0 ? `${(month.offset - months[i - 1].offset) * 14}px` : '0' }}
            >
              {month.name}
            </div>
          ))}
        </div>

        {/* Grille */}
        <div className="flex gap-1">
          {/* Jours de la semaine */}
          <div className="flex flex-col gap-1 justify-around text-xs text-gray-500 pr-2">
            <div>Lun</div>
            <div className="opacity-0">Mar</div>
            <div>Mer</div>
            <div className="opacity-0">Jeu</div>
            <div>Ven</div>
            <div className="opacity-0">Sam</div>
            <div className="opacity-0">Dim</div>
          </div>

          {/* Cellules d'activité */}
          {grid.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day, dayIndex) => (
                <motion.div
                  key={`${weekIndex}-${dayIndex}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    delay: (weekIndex * 7 + dayIndex) * 0.01,
                    duration: 0.3,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="group relative"
                >
                  <div
                    className={`
                      w-3 h-3 rounded-sm transition-all cursor-pointer
                      ${getIntensityColor(day.total)}
                      hover:ring-2 hover:ring-brand-blue hover:scale-125 hover:z-10
                    `}
                    title={`${format(day.date, 'dd MMM yyyy', { locale: fr })}: ${day.total} activités`}
                  />

                  {/* Tooltip premium on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20 scale-95 group-hover:scale-100">
                    <div className="bg-gray-900 text-white text-xs rounded-2xl px-5 py-4 whitespace-nowrap shadow-2xl border border-white/20 backdrop-blur-md">
                      <div className="font-display font-bold mb-2.5 text-center border-b border-white/20 pb-2.5 text-sm tracking-tight">
                        {format(day.date, 'dd MMM yyyy', { locale: fr })}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-5">
                          <span className="text-gray-400 font-medium tracking-tight">Inscriptions:</span>
                          <span className="font-bold text-brand-cyan text-sm">{day.enrollments}</span>
                        </div>
                        <div className="flex items-center justify-between gap-5">
                          <span className="text-gray-400 font-medium tracking-tight">Paiements:</span>
                          <span className="font-bold text-emerald-400 text-sm">{day.payments}</span>
                        </div>
                        <div className="flex items-center justify-between gap-5">
                          <span className="text-gray-400 font-medium tracking-tight">Sessions:</span>
                          <span className="font-bold text-purple-400 text-sm">{day.sessions}</span>
                        </div>
                        <div className="flex items-center justify-between gap-5 pt-2 border-t border-white/30">
                          <span className="text-white font-semibold tracking-tight">Total:</span>
                          <span className="font-display font-bold text-white text-base">{day.total}</span>
                        </div>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ))}
        </div>

        {/* Légende */}
        <div className="flex items-center gap-3 mt-4 pl-8">
          <span className="text-xs text-gray-600 font-medium tracking-tight">Moins d'activité</span>
          <div className="flex gap-1.5">
            <div className="w-3.5 h-3.5 bg-gray-100 rounded-sm shadow-sm" />
            <div className="w-3.5 h-3.5 bg-brand-blue/20 rounded-sm shadow-sm" />
            <div className="w-3.5 h-3.5 bg-brand-blue/40 rounded-sm shadow-sm" />
            <div className="w-3.5 h-3.5 bg-brand-blue/60 rounded-sm shadow-sm" />
            <div className="w-3.5 h-3.5 bg-brand-blue rounded-sm shadow-sm" />
          </div>
          <span className="text-xs text-gray-600 font-medium tracking-tight">Plus d'activité</span>
        </div>
      </div>
    </div>
  )
}

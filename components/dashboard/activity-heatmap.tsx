'use client'

import { motion } from '@/components/ui/motion'
import { useMemo } from 'react'
import { format, subDays, startOfWeek, addDays, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ActivityHeatmapProps {
  activityData?: Array<{
    date: Date
    count: number
  }>
  weeks?: number
}

export function ActivityHeatmap({ activityData = [], weeks = 12 }: ActivityHeatmapProps) {
  const { grid, months, maxCount } = useMemo(() => {
    const today = new Date()
    const startDate = subDays(today, weeks * 7)
    const weekStart = startOfWeek(startDate, { weekStartsOn: 1 })

    // Créer une map pour un accès rapide aux données
    const activityMap = new Map<string, number>()
    activityData.forEach(({ date, count }) => {
      const key = format(date, 'yyyy-MM-dd')
      activityMap.set(key, count)
    })

    // Générer la grille
    const grid: Array<Array<{ date: Date; count: number; day: string }>> = []
    const months: Array<{ name: string; offset: number }> = []
    let currentMonth = ''
    let maxCount = 0

    for (let week = 0; week < weeks; week++) {
      const weekData = []
      for (let day = 0; day < 7; day++) {
        const date = addDays(weekStart, week * 7 + day)
        const key = format(date, 'yyyy-MM-dd')
        const count = activityMap.get(key) || Math.floor(Math.random() * 5) // Données factices si non fournies

        if (count > maxCount) maxCount = count

        weekData.push({
          date,
          count,
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

    return { grid, months, maxCount }
  }, [activityData, weeks])

  const getIntensityColor = (count: number) => {
    if (count === 0) return 'bg-gray-100'
    const intensity = Math.min(count / maxCount, 1)
    if (intensity < 0.25) return 'bg-emerald-200'
    if (intensity < 0.5) return 'bg-emerald-400'
    if (intensity < 0.75) return 'bg-emerald-600'
    return 'bg-emerald-700'
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
                    ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                  }}
                  className="group relative"
                >
                  <div
                    className={`
                      w-3 h-3 rounded-sm transition-all cursor-pointer
                      ${getIntensityColor(day.count)}
                      hover:ring-2 hover:ring-brand-blue hover:scale-110
                    `}
                    title={`${format(day.date, 'dd MMM yyyy', { locale: fr })}: ${day.count} activité${day.count > 1 ? 's' : ''}`}
                  />

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                      <div className="font-semibold">{format(day.date, 'dd MMM yyyy', { locale: fr })}</div>
                      <div className="text-gray-300">{day.count} activité{day.count > 1 ? 's' : ''}</div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ))}
        </div>

        {/* Légende */}
        <div className="flex items-center gap-2 mt-2 pl-8">
          <span className="text-xs text-gray-500">Moins</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-gray-100 rounded-sm" />
            <div className="w-3 h-3 bg-emerald-200 rounded-sm" />
            <div className="w-3 h-3 bg-emerald-400 rounded-sm" />
            <div className="w-3 h-3 bg-emerald-600 rounded-sm" />
            <div className="w-3 h-3 bg-emerald-700 rounded-sm" />
          </div>
          <span className="text-xs text-gray-500">Plus</span>
        </div>
      </div>
    </div>
  )
}

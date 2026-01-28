'use client'

import { useMemo } from 'react'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { Calendar, TrendingUp, Flame } from 'lucide-react'
import { GlassCardPremium } from './glass-card-premium'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  format,
  startOfWeek,
  addDays,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns'
import { fr } from 'date-fns/locale'

interface DayActivity {
  date: Date
  count: number
}

interface ActivityHeatmapProps {
  activities: DayActivity[]
  weeks?: number // Nombre de semaines à afficher (défaut: 26 = ~6 mois)
  className?: string
}

// Couleurs du heatmap selon l'intensité (style GitHub mais avec notre palette)
const getIntensityColor = (count: number, maxCount: number) => {
  if (count === 0) return 'bg-slate-100 dark:bg-slate-800'
  const intensity = count / Math.max(maxCount, 1)
  if (intensity <= 0.25) return 'bg-[#34B9EE]/20'
  if (intensity <= 0.5) return 'bg-[#34B9EE]/40'
  if (intensity <= 0.75) return 'bg-[#34B9EE]/70'
  return 'bg-[#34B9EE]'
}

// Composant pour une cellule du heatmap
function HeatmapCell({
  date,
  count,
  maxCount,
  delay,
}: {
  date: Date
  count: number
  maxCount: number
  delay: number
}) {
  const isToday = isSameDay(date, new Date())
  const isFuture = date > new Date()

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            className={cn(
              'h-3 w-3 rounded-sm cursor-pointer transition-all duration-200',
              isFuture ? 'bg-slate-50 dark:bg-slate-900' : getIntensityColor(count, maxCount),
              isToday && 'ring-1 ring-[#274472] ring-offset-1',
              !isFuture && 'hover:scale-150 hover:z-10'
            )}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: delay, duration: 0.2, type: 'spring' }}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="font-medium">
            {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
          </div>
          <div className="text-slate-400">
            {isFuture
              ? 'Date future'
              : count === 0
              ? 'Aucune preuve'
              : `${count} preuve${count > 1 ? 's' : ''} collectée${count > 1 ? 's' : ''}`}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Labels des jours de la semaine
const DAY_LABELS = ['Lun', '', 'Mer', '', 'Ven', '', '']

export function ActivityHeatmap({
  activities,
  weeks = 26,
  className,
}: ActivityHeatmapProps) {
  // Calculer les données du heatmap
  const heatmapData = useMemo(() => {
    const today = new Date()
    const startDate = startOfWeek(subWeeks(today, weeks - 1), { weekStartsOn: 1 })
    const endDate = addDays(startOfWeek(today, { weekStartsOn: 1 }), 6)

    const allDays = eachDayOfInterval({ start: startDate, end: endDate })

    // Créer une map des activités par date
    const activityMap = new Map<string, number>()
    activities.forEach((a) => {
      const key = format(a.date, 'yyyy-MM-dd')
      activityMap.set(key, (activityMap.get(key) || 0) + a.count)
    })

    // Trouver le max pour le scaling des couleurs
    const maxCount = Math.max(...Array.from(activityMap.values()), 1)

    // Organiser par semaines
    const weeksData: { date: Date; count: number }[][] = []
    let currentWeek: { date: Date; count: number }[] = []

    allDays.forEach((day, index) => {
      const dayOfWeek = day.getDay() === 0 ? 6 : day.getDay() - 1 // Lundi = 0

      if (dayOfWeek === 0 && currentWeek.length > 0) {
        weeksData.push(currentWeek)
        currentWeek = []
      }

      currentWeek.push({
        date: day,
        count: activityMap.get(format(day, 'yyyy-MM-dd')) || 0,
      })

      if (index === allDays.length - 1) {
        weeksData.push(currentWeek)
      }
    })

    return { weeksData, maxCount }
  }, [activities, weeks])

  // Stats rapides
  const stats = useMemo(() => {
    const totalEvidences = activities.reduce((sum, a) => sum + a.count, 0)
    const activeDays = activities.filter((a) => a.count > 0).length

    // Calcul du streak actuel
    let currentStreak = 0
    const sortedDates = [...activities]
      .filter((a) => a.count > 0)
      .map((a) => a.date)
      .sort((a, b) => b.getTime() - a.getTime())

    for (let i = 0; i < sortedDates.length; i++) {
      const expectedDate = addDays(new Date(), -i)
      if (isSameDay(sortedDates[i], expectedDate)) {
        currentStreak++
      } else {
        break
      }
    }

    return { totalEvidences, activeDays, currentStreak }
  }, [activities])

  // Labels des mois
  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = []
    let lastMonth = ''

    heatmapData.weeksData.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0]
      if (firstDayOfWeek) {
        const month = format(firstDayOfWeek.date, 'MMM', { locale: fr })
        if (month !== lastMonth) {
          labels.push({ month, weekIndex })
          lastMonth = month
        }
      }
    })

    return labels
  }, [heatmapData.weeksData])

  return (
    <GlassCardPremium variant="default" className={cn('p-5', className)} delay={0.4}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#274472] to-[#1a2f4a]">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-space-grotesk font-bold text-[#274472]">
              Activité de Conformité
            </h3>
            <p className="text-xs text-slate-500">
              Régularité de la collecte des preuves
            </p>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-1 text-[#34B9EE]">
              <Flame className="h-4 w-4" />
              <span className="font-bold">{stats.currentStreak}</span>
            </div>
            <span className="text-xs text-slate-400">jours consécutifs</span>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-[#274472]">
              <TrendingUp className="h-4 w-4" />
              <span className="font-bold">{stats.totalEvidences}</span>
            </div>
            <span className="text-xs text-slate-400">preuves total</span>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Labels des mois */}
          <div className="flex ml-8 mb-1.5">
            {monthLabels.map(({ month, weekIndex }) => {
              // Calculer la marge en fonction de l'index de la semaine précédente
              let marginLeft = 0
              if (weekIndex > 0) {
                const currentIndex = monthLabels.findIndex(l => l.month === month && l.weekIndex === weekIndex)
                const previousWeekIndex = currentIndex > 0 ? monthLabels[currentIndex - 1].weekIndex : 0
                marginLeft = (weekIndex - previousWeekIndex - 1) * 16
              }
              
              return (
                <div
                  key={`${month}-${weekIndex}`}
                  className="text-xs text-slate-400 font-medium"
                  style={{
                    marginLeft: marginLeft > 0 ? `${marginLeft}px` : 0,
                  }}
                >
                  {month}
                </div>
              )
            })}
          </div>

          <div className="flex gap-0.5">
            {/* Labels des jours */}
            <div className="flex flex-col gap-0.5 mr-2">
              {DAY_LABELS.map((label, index) => (
                <div
                  key={index}
                  className="h-3 flex items-center text-[10px] text-slate-400"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Grille des semaines */}
            <div className="flex gap-0.5">
              {heatmapData.weeksData.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-0.5">
                  {week.map((day, dayIndex) => (
                    <HeatmapCell
                      key={`${weekIndex}-${dayIndex}`}
                      date={day.date}
                      count={day.count}
                      maxCount={heatmapData.maxCount}
                      delay={weekIndex * 0.01 + dayIndex * 0.01}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
        <span className="text-xs text-slate-400">Moins</span>
        <div className="flex items-center gap-0.5">
          <div className="h-3 w-3 rounded-sm bg-slate-100 dark:bg-slate-800" />
          <div className="h-3 w-3 rounded-sm bg-[#34B9EE]/20" />
          <div className="h-3 w-3 rounded-sm bg-[#34B9EE]/40" />
          <div className="h-3 w-3 rounded-sm bg-[#34B9EE]/70" />
          <div className="h-3 w-3 rounded-sm bg-[#34B9EE]" />
        </div>
        <span className="text-xs text-slate-400">Plus</span>
      </div>

      {/* Message d'amélioration continue */}
      <motion.div
        className="mt-3 p-3 rounded-xl bg-[#274472]/5 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <p className="text-xs text-[#274472]">
          <span className="font-semibold">Amélioration Continue :</span> Une
          activité régulière prouve à l'auditeur que vous travaillez toute
          l'année, pas seulement avant l'audit.
        </p>
      </motion.div>
    </GlassCardPremium>
  )
}

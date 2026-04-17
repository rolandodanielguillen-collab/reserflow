'use client'

import { useState, useEffect } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths
} from 'date-fns'
import { es } from 'date-fns/locale'
import { getScheduledCarousels, cancelScheduledPost } from '../services/schedule-post'

interface ScheduledItem {
  id: string
  title: string
  status: string
  scheduled_at: string | null
  published_at: string | null
  instagram_permalink: string | null
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  published: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programado',
  published: 'Publicado',
  failed: 'Fallido',
}

export function ContentCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [posts, setPosts] = useState<ScheduledItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ScheduledItem | null>(null)

  useEffect(() => {
    loadPosts()
  }, [])

  async function loadPosts() {
    setLoading(true)
    const result = await getScheduledCarousels()
    setPosts(result.data)
    setLoading(false)
  }

  async function handleCancel(id: string) {
    const result = await cancelScheduledPost(id)
    if (!result.error) {
      setSelected(null)
      await loadPosts()
    }
  }

  // Generar días del calendario
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  function getPostsForDay(day: Date) {
    return posts.filter(p => p.scheduled_at && isSameDay(new Date(p.scheduled_at), day))
  }

  const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="space-y-4">
      {/* Header del calendario */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            ←
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            →
          </button>
        </div>
      </div>

      {/* Grilla del calendario */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Días de la semana */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Días */}
        {loading ? (
          <div className="h-48 flex items-center justify-center text-sm text-gray-400">
            Cargando calendario...
          </div>
        ) : (
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
            {days.map(day => {
              const dayPosts = getPostsForDay(day)
              const inMonth = isSameMonth(day, currentMonth)
              const today = isToday(day)

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-20 p-2 ${!inMonth ? 'bg-gray-50' : ''}`}
                >
                  {/* Número del día */}
                  <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    today ? 'bg-blue-600 text-white' : inMonth ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    {format(day, 'd')}
                  </div>

                  {/* Posts del día */}
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 2).map(post => (
                      <button
                        key={post.id}
                        onClick={() => setSelected(post)}
                        className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded border truncate transition-colors ${STATUS_STYLES[post.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {post.title}
                      </button>
                    ))}
                    {dayPosts.length > 2 && (
                      <p className="text-[10px] text-gray-400 pl-1">+{dayPosts.length - 2} más</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Panel de detalle del post seleccionado */}
      {selected && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{selected.title}</h3>
              {selected.scheduled_at && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {format(new Date(selected.scheduled_at), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[selected.status]}`}>
                {STATUS_LABELS[selected.status]}
              </span>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            </div>
          </div>

          {selected.instagram_permalink && (
            <a
              href={selected.instagram_permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
            >
              Ver en Instagram →
            </a>
          )}

          {selected.status === 'scheduled' && (
            <button
              onClick={() => handleCancel(selected.id)}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Cancelar programación
            </button>
          )}
        </div>
      )}

      {/* Leyenda */}
      <div className="flex gap-4 text-xs text-gray-500">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded border ${STATUS_STYLES[key]}`} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

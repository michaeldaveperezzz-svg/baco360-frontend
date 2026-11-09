import { ChevronLeft, ChevronRight } from 'lucide-react'
import { calendarDateKey } from '../utils/communityCalendar'

interface CommunityCalendarProps {
  month: Date
  selectedDate: string
  eventDates: Set<string>
  language: 'en' | 'tl'
  onMonthChange: (month: Date) => void
  onDateSelect: (date: string) => void
}

export default function CommunityCalendar({ month, selectedDate, eventDates, language, onMonthChange, onDateSelect }: CommunityCalendarProps) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const startOffset = firstDay.getDay()
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const daysInPreviousMonth = new Date(month.getFullYear(), month.getMonth(), 0).getDate()
  const monthLabel = new Intl.DateTimeFormat(language === 'tl' ? 'fil-PH' : 'en-US', { month: 'long', year: 'numeric' }).format(month)
  const weekdays = language === 'tl' ? ['Li', 'Lu', 'Ma', 'Mi', 'H', 'B', 'S'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  function changeMonth(offset: number) {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + offset, 1))
  }

  return <div className="community-calendar">
    <header className="community-calendar-header">
      <button type="button" className="icon-button" aria-label={language === 'tl' ? 'Nakaraang buwan' : 'Previous month'} onClick={() => changeMonth(-1)}><ChevronLeft size={17} /></button>
      <h2>{monthLabel}</h2>
      <button type="button" className="icon-button" aria-label={language === 'tl' ? 'Susunod na buwan' : 'Next month'} onClick={() => changeMonth(1)}><ChevronRight size={17} /></button>
    </header>
    <div className="community-calendar-grid" role="grid" aria-label={monthLabel}>
      {weekdays.map((day, index) => <span className="community-calendar-weekday" role="columnheader" key={`${day}-${index}`}>{day}</span>)}
      {Array.from({ length: 42 }, (_, index) => {
        const dayNumber = index - startOffset + 1
        const isCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth
        const date = isCurrentMonth
          ? new Date(month.getFullYear(), month.getMonth(), dayNumber)
          : dayNumber < 1
            ? new Date(month.getFullYear(), month.getMonth() - 1, daysInPreviousMonth + dayNumber)
            : new Date(month.getFullYear(), month.getMonth() + 1, dayNumber - daysInMonth)
        const dateKey = calendarDateKey(date)
        const hasEvent = eventDates.has(dateKey)
        const isSelected = selectedDate === dateKey
        return <button
          type="button"
          role="gridcell"
          key={dateKey}
          className={`community-calendar-day${isCurrentMonth ? '' : ' is-outside'}${hasEvent ? ' has-event' : ''}${isSelected ? ' is-selected' : ''}`}
          aria-label={new Intl.DateTimeFormat(language === 'tl' ? 'fil-PH' : 'en-US', { dateStyle: 'full' }).format(date)}
          aria-pressed={isSelected}
          onClick={() => {
            if (!isCurrentMonth) onMonthChange(new Date(date.getFullYear(), date.getMonth(), 1))
            onDateSelect(dateKey)
          }}
        >
          <span>{date.getDate()}</span>{hasEvent && <i aria-hidden="true" />}
        </button>
      })}
    </div>
  </div>
}

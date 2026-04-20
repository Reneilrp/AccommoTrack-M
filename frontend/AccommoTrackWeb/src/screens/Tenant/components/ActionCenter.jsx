import React, { useState } from 'react';
import { AlertCircle, CalendarClock, ArrowRight, X, ChevronDown, ChevronUp } from 'lucide-react';

const AlertItem = ({ alert, onDismiss, onAction, isStandalone }) => {
  const getStyles = (priority) => {
    if (priority === 'high') return {
      bg: 'bg-red-50 dark:bg-red-500/10',
      text: 'text-red-800 dark:text-red-100',
      desc: 'text-red-700 dark:text-red-200/80',
      iconBg: 'bg-red-100 dark:bg-red-500/20',
      iconText: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-500/30',
      button: 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
    };
    if (priority === 'normal') return {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      text: 'text-amber-800 dark:text-amber-100',
      desc: 'text-amber-700 dark:text-amber-200/80',
      iconBg: 'bg-amber-100 dark:bg-amber-500/20',
      iconText: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-500/30',
      button: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
    };
    // Info / Blue
    return {
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      text: 'text-blue-900 dark:text-blue-100',
      desc: 'text-blue-700 dark:text-blue-200/80',
      iconBg: 'bg-blue-100 dark:bg-blue-500/20',
      iconText: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-500/30',
      button: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'
    };
  };

  const styles = getStyles(alert.priority);
  const Icon = alert.type === 'booking' ? CalendarClock : AlertCircle;

  return (
    <div className={`${isStandalone ? `rounded-[20px] border shadow-sm ${styles.border}` : ''} ${styles.bg} p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all`}>
      <div className="flex items-start md:items-center gap-4 flex-1">
        <div className={`${styles.iconBg} p-3 rounded-xl flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${styles.iconText}`} />
        </div>
        <div className="flex-1">
          <h3 className={`text-[15px] font-bold ${styles.text}`}>{alert.title}</h3>
          <p className={`text-[14px] ${styles.desc} mt-1 leading-relaxed`}>{alert.message}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto">
        {alert.actionText && (
          <button
            onClick={onAction}
            className={`flex-1 md:flex-none px-5 py-2.5 ${styles.button} text-white text-[14px] font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2`}
          >
            {alert.actionText} <ArrowRight className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onDismiss}
          className={`w-10 h-10 rounded-xl border ${styles.border} ${styles.iconText} hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0`}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const ActionCenter = ({ alerts, onDismiss, onAction }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!alerts || alerts.length === 0) return null;

  // Single alert case: show as a refined banner
  if (alerts.length === 1) {
    const alert = alerts[0];
    return (
      <AlertItem
        alert={alert}
        onDismiss={() => onDismiss(alert)}
        onAction={() => onAction(alert)}
        isStandalone={true}
      />
    );
  }

  const criticalAlerts = alerts.filter(a => a.priority === 'high');

  return (
    <div className="bg-white dark:bg-[#1e2332] border border-gray-200 dark:border-[#2a3045] rounded-[24px] overflow-hidden shadow-sm transition-all duration-300">
      {/* Header / Summary */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252b3b]/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`${criticalAlerts.length > 0 ? 'bg-red-100 dark:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-amber-100 dark:bg-amber-500/20'} p-3 rounded-full flex-shrink-0`}>
            <AlertCircle className={`w-6 h-6 ${criticalAlerts.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
              {alerts.length} Actions Required
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {criticalAlerts.length > 0
                ? `${criticalAlerts.length} high priority item${criticalAlerts.length > 1 ? 's' : ''} need${criticalAlerts.length === 1 ? 's' : ''} attention`
                : 'Please review your active bookings and payments'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-green-600 dark:text-green-400 hidden sm:block">
            {isExpanded ? 'Show Less' : 'View All'}
          </span>
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#2a3045] flex items-center justify-center transition-transform duration-300">
            {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </div>
        </div>
      </div>

      {/* Expandable List */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[1200px] opacity-100 pb-2' : 'max-h-0 opacity-0'}`}>
        <div className="mx-2 mb-2 rounded-2xl overflow-hidden border border-gray-100 dark:border-[#2a3045] divide-y divide-gray-100 dark:divide-[#2a3045]">
          {alerts.map((alert) => (
            <AlertItem
              key={alert.id}
              alert={alert}
              onDismiss={() => onDismiss(alert)}
              onAction={() => onAction(alert)}
              isStandalone={false}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActionCenter;

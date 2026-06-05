import { useState, useEffect } from 'react';
import { db } from '../db';
import type { TrainingSession } from '../types';

export default function TrainingHistory() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);

  useEffect(() => {
    db.trainingSessions.orderBy('date').reverse().limit(30).toArray().then(setSessions);
  }, []);

  const completedCount = sessions.filter((s) => s.completed).length;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">训练历史</h2>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">近30次训练</p>
            <p className="text-2xl font-bold text-blue-700">{completedCount}/{sessions.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">完成率</p>
            <p className="text-2xl font-bold text-blue-700">
              {sessions.length > 0 ? Math.round((completedCount / sessions.length) * 100) : 0}%
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-50">
        {sessions.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">还没有训练记录</div>
        ) : (
          sessions.map((s) => (
            <div key={s.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-700">{s.date}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {s.completed ? `RPE: ${s.actualRPE}/10` : '未完成'}
                  {s.notes && ` · ${s.notes}`}
                </p>
              </div>
              <span>{s.completed ? '✅' : '⬜'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

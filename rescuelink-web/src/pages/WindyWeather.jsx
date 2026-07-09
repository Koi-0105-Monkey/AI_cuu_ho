import React from 'react';
import Header from '../components/layout/Header';
import { CloudSun } from '@phosphor-icons/react';

export default function WindyWeather() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Giám Sát Thời Tiết Toàn Cảnh (Windy)" />
      <div className="flex-1 p-6 flex flex-col gap-4 min-h-0">
        <div className="bg-surface-2 border border-surface-4 p-4 rounded-2xl flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CloudSun size={20} className="text-sky-400" /> Hệ thống Bản đồ Động Windy.com
            </h2>
            <p className="text-xs text-slate-400">
              Giám sát trực quan hướng gió, luồng mây, lượng mưa và nhiệt độ thời gian thực trên khắp Việt Nam.
            </p>
          </div>
          <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-1 rounded-xl font-semibold">
            Dữ liệu vệ tinh toàn cầu
          </span>
        </div>

        <div className="flex-1 card p-0 border border-surface-4 rounded-2xl overflow-hidden shadow-2xl relative bg-slate-950">
          <iframe
            src="https://embed.windy.com/embed2.html?lat=16.069&lon=108.221&zoom=5&level=surface&overlay=wind&menu=&message=true&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange="
            className="w-full h-full border-none"
            title="Bản đồ thời tiết Windy"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { db } from '../db';
import type { DietRecord, MealType, FoodItem } from '../types';

const mealLabels: Record<MealType, string> = {
  breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐',
};

const commonFoods: FoodItem[] = [
  { name: '米饭', category: '主食', caloriesPer100g: 116, proteinPer100g: 2.6, carbsPer100g: 25.9, fatPer100g: 0.3, commonAmount: '1碗(200g)' },
  { name: '鸡胸肉', category: '肉类', caloriesPer100g: 133, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 1.2, commonAmount: '1块(150g)' },
  { name: '鸡蛋', category: '蛋类', caloriesPer100g: 144, proteinPer100g: 13.3, carbsPer100g: 2.8, fatPer100g: 8.8, commonAmount: '1个(50g)' },
  { name: '牛奶', category: '乳制品', caloriesPer100g: 54, proteinPer100g: 3, carbsPer100g: 5, fatPer100g: 3.2, commonAmount: '1杯(250ml)' },
  { name: '西兰花', category: '蔬菜', caloriesPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 6.6, fatPer100g: 0.4, commonAmount: '1碗(150g)' },
  { name: '香蕉', category: '水果', caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 22.8, fatPer100g: 0.3, commonAmount: '1根(120g)' },
  { name: '三文鱼', category: '肉类', caloriesPer100g: 208, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 13, commonAmount: '1块(150g)' },
  { name: '全麦面包', category: '主食', caloriesPer100g: 247, proteinPer100g: 13, carbsPer100g: 41, fatPer100g: 3.4, commonAmount: '2片(60g)' },
  { name: '牛肉（瘦）', category: '肉类', caloriesPer100g: 125, proteinPer100g: 22, carbsPer100g: 1, fatPer100g: 4, commonAmount: '1份(150g)' },
  { name: '燕麦', category: '主食', caloriesPer100g: 367, proteinPer100g: 13.5, carbsPer100g: 66, fatPer100g: 6.7, commonAmount: '1碗(50g干)' },
];

export default function DietPage() {
  const today = new Date().toISOString().split('T')[0];
  const [records, setRecords] = useState<DietRecord[]>([]);
  const [form, setForm] = useState({ date: today, mealType: 'breakfast' as MealType, foodName: '', amount: '' });

  useEffect(() => { loadRecords(); }, []);
  async function loadRecords() {
    setRecords(await db.dietRecords.orderBy('date').reverse().limit(30).toArray());
  }

  async function handleAdd() {
    if (!form.foodName) return;
    const food = commonFoods.find((f) => f.name === form.foodName);
    await db.dietRecords.add({
      date: form.date,
      mealType: form.mealType,
      foodName: form.foodName,
      amount: form.amount,
      calories: food?.caloriesPer100g,
      protein: food?.proteinPer100g,
      carbs: food?.carbsPer100g,
      fat: food?.fatPer100g,
    });
    loadRecords();
    setForm({ ...form, amount: '' });
  }

  const todayRecords = records.filter((r) => r.date === today);
  const todayCalories = todayRecords.reduce((s, r) => s + (r.calories || 0), 0);
  const todayProtein = todayRecords.reduce((s, r) => s + (r.protein || 0), 0);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">饮食记录</h2>

      {/* Today Summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-slate-500">今日热量</p>
            <p className="text-xl font-bold text-blue-700">{todayCalories}<span className="text-sm font-normal text-slate-400">kcal</span></p>
          </div>
          <div>
            <p className="text-xs text-slate-500">蛋白质</p>
            <p className="text-xl font-bold text-blue-700">{todayProtein}<span className="text-sm font-normal text-slate-400">g</span></p>
          </div>
          <div>
            <p className="text-xs text-slate-500">记录数</p>
            <p className="text-xl font-bold text-blue-700">{todayRecords.length}</p>
          </div>
        </div>
      </div>

      {/* Quick Add */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex gap-2">
          <input type="date" value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
        </div>

        <div>
          <label className="text-xs text-slate-500">餐次</label>
          <div className="flex gap-1 mt-1">
            {(Object.keys(mealLabels) as MealType[]).map((m) => (
              <button key={m} onClick={() => setForm({ ...form, mealType: m })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  form.mealType === m ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>{mealLabels[m]}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500">食物</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {commonFoods.map((food) => (
              <button key={food.name} onClick={() => setForm({ ...form, foodName: food.name })}
                className={`px-2 py-1 rounded-full text-xs ${
                  form.foodName === food.name ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>{food.name}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <input type="text" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="份量 (如: 200g / 1碗)"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          <button onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            添加
          </button>
        </div>
      </div>

      {/* Today's entries */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-medium text-slate-700 mb-3">今日饮食</h3>
        {todayRecords.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">还没有记录</p>
        ) : (
          <div className="space-y-2">
            {todayRecords.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50">
                <div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 mr-2">{mealLabels[r.mealType]}</span>
                  <span className="text-slate-700">{r.foodName}</span>
                  <span className="text-xs text-slate-400 ml-1">{r.amount}</span>
                </div>
                <span className="text-xs text-slate-500">{r.calories}kcal</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

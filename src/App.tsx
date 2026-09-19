import React, { useState, useEffect, useMemo } from 'react';
import { 
  Refrigerator, 
  Undo2, 
  Redo2, 
  Plus, 
  BookOpen, 
  Users, 
  Trash2,
  ChevronRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types & Data ---

type Shelf = 'Верхняя' | 'Средняя' | 'Нижняя' | 'Дверца';

interface Product {
  id: number;
  name: string;
  qty: number;
  shelf: Shelf;
  daysLeft: number;
}

const emojiMap: Record<string, string> = {
  'молоко': '🥛', 'сыр': '🧀', 'яйца': '🥚', 'томаты': '🍅', 'помидор': '🍅', 'помидоры': '🍅',
  'яблоко': '🍎', 'яблоки': '🍎', 'банан': '🍌', 'бананы': '🍌', 'колбаса': '🥩', 'мясо': '🥩',
  'рыба': '🐟', 'огурец': '🥒', 'огурцы': '🥒', 'лимон': '🍋', 'хлеб': '🍞', 'соус': '🥫', 'кетчуп': '🥫',
  'масло': '🧈', 'йогурт': '🍦', 'пиво': '🍺', 'вино': '🍷', 'сок': '🧃'
};

const getEmoji = (name: string) => {
  const cleanName = name.toLowerCase().trim();
  for (const key in emojiMap) {
    if (cleanName.includes(key)) return emojiMap[key];
  }
  return '📦';
};

const INITIAL_PRODUCTS: Product[] = [
  { id: 1, name: 'Молоко', qty: 2, shelf: 'Верхняя', daysLeft: 3 },
  { id: 2, name: 'Томаты', qty: 5, shelf: 'Нижняя', daysLeft: 7 },
  { id: 3, name: 'Сыр', qty: 1, shelf: 'Средняя', daysLeft: 1 },
  { id: 4, name: 'Яйца', qty: 10, shelf: 'Средняя', daysLeft: 12 },
  { id: 5, name: 'Соус', qty: 1, shelf: 'Дверца', daysLeft: 30 }
];

// --- Components ---

export default function App() {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('my_fridge_items');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [mode, setMode] = useState<'classic' | 'expiry' | 'alpha'>('classic');
  const [isGrouped, setIsGrouped] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newShelf, setNewShelf] = useState<Shelf>('Верхняя');
  const [newDays, setNewDays] = useState(5);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('my_fridge_items', JSON.stringify(products));
  }, [products]);

  const saveState = () => {
    setHistory(prev => [...prev.slice(-19), JSON.stringify(products)]);
    setRedoStack([]);
  };

  const undo = () => {
    if (history.length === 0) return;
    const prevState = history[history.length - 1];
    setRedoStack(prev => [...prev, JSON.stringify(products)]);
    setProducts(JSON.parse(prevState));
    setHistory(prev => prev.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setHistory(prev => [...prev, JSON.stringify(products)]);
    setProducts(JSON.parse(nextState));
    setRedoStack(prev => prev.slice(0, -1));
  };

  const addProduct = () => {
    if (!newName.trim()) return alert('Пожалуйста, напишите название продукта!');
    
    saveState();
    const existingIndex = products.findIndex(
      p => p.name.toLowerCase() === newName.toLowerCase() && p.shelf === newShelf
    );

    if (existingIndex > -1) {
      const updated = [...products];
      updated[existingIndex].qty += newQty;
      setProducts(updated);
    } else {
      setProducts(prev => [...prev, {
        id: Date.now(),
        name: newName,
        qty: newQty,
        shelf: newShelf,
        daysLeft: newDays
      }]);
    }

    // Reset & Close
    setNewName('');
    setNewQty(1);
    setNewDays(5);
    setIsModalOpen(false);
  };

  const removeProduct = (id: number) => {
    saveState();
    setProducts(prev => {
      const index = prev.findIndex(p => p.id === id);
      if (index === -1) return prev;
      
      const updated = [...prev];
      if (updated[index].qty > 1) {
        updated[index].qty -= 1;
        return updated;
      } else {
        return updated.filter(p => p.id !== id);
      }
    });
  };

  const displayItems = useMemo(() => {
    let items: Product[] = [];
    if (isGrouped) {
      items = [...products];
    } else {
      products.forEach(p => {
        for (let i = 0; i < p.qty; i++) {
          items.push({ ...p, qty: 1 });
        }
      });
    }

    if (mode === 'expiry') {
      items.sort((a, b) => a.daysLeft - b.daysLeft);
    } else if (mode === 'alpha') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    }
    return items;
  }, [products, isGrouped, mode]);

  return (
    <div className="bg-slate-100 font-sans min-h-screen text-slate-800">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl flex flex-col relative pb-20">
        
        {/* HEADER */}
        <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-xl font-bold flex items-center gap-2 text-indigo-600">
              <Refrigerator className="w-6 h-6" /> Холодильник
            </h1>
            <div className="flex gap-2">
              <button 
                onClick={undo}
                disabled={history.length === 0}
                className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-30 transition-opacity"
              >
                <Undo2 className="w-5 h-5" />
              </button>
              <button 
                onClick={redo}
                disabled={redoStack.length === 0}
                className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-30 transition-opacity"
              >
                <Redo2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1 text-sm scrollbar-none">
            {(['classic', 'expiry', 'alpha'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors",
                  mode === m ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {m === 'classic' ? 'Полки' : m === 'expiry' ? 'По сроку ⌛' : 'А-Я 🔤'}
              </button>
            ))}
            <button 
              onClick={() => setIsGrouped(!isGrouped)}
              className={cn(
                "px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors",
                !isGrouped ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {isGrouped ? 'Разгруппировать' : 'Сгруппировать'}
            </button>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-grow p-4 overflow-y-auto">
          {mode === 'classic' ? (
            (['Верхняя', 'Средняя', 'Нижняя', 'Дверца'] as Shelf[]).map(shelfName => {
              const shelfItems = displayItems.filter(item => item.shelf === shelfName);
              return (
                <div key={shelfName} className="mb-6">
                  <h4 className="text-xs font-bold text-slate-400 mb-2 px-1 uppercase tracking-wider">
                    {shelfName} полка
                  </h4>
                  <div className="shelf-border min-h-[96px] bg-slate-50/60 rounded-t-xl p-3 flex flex-wrap gap-4 items-end">
                    {shelfItems.length === 0 ? (
                      <span className="text-xs text-slate-300 italic mx-auto my-auto py-4">
                        Полка пуста
                      </span>
                    ) : (
                      shelfItems.map(item => (
                        <ProductCard 
                          key={`${item.id}-${Math.random()}`} 
                          item={item} 
                          onClick={() => removeProduct(item.id)}
                          isGrouped={isGrouped}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="grid grid-cols-4 gap-4 p-2">
              {displayItems.map(item => (
                <ProductCard 
                  key={`${item.id}-${Math.random()}`} 
                  item={item} 
                  onClick={() => removeProduct(item.id)}
                  isGrouped={isGrouped}
                />
              ))}
            </div>
          )}
        </main>

        {/* ADD BUTTON */}
        <div className="absolute bottom-24 right-4 z-20">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition transform hover:scale-105"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>

        {/* FOOTER NAV */}
        <footer className="bg-white border-t border-slate-200 p-3 grid grid-cols-3 text-center fixed bottom-0 w-full max-w-md shadow-lg z-10">
          <button className="flex flex-col items-center text-indigo-600 font-semibold">
            <Refrigerator className="w-6 h-6" />
            <span className="text-xs mt-1">Холодильник</span>
          </button>
          <button 
            onClick={() => alert('Книга рецептов находится в разработке!')}
            className="flex flex-col items-center text-slate-400 hover:text-slate-600"
          >
            <BookOpen className="w-6 h-6" />
            <span className="text-xs mt-1">Рецепты</span>
          </button>
          <button 
            onClick={() => alert('Функция совместного доступа будет добавлена на этапе подключения базы данных.')}
            className="flex flex-col items-center text-slate-400 hover:text-slate-600"
          >
            <Users className="w-6 h-6" />
            <span className="text-xs mt-1">Семья</span>
          </button>
        </footer>

        {/* MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-bold mb-4 text-slate-900">Добавить продукт</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Название продукта</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Например: Молоко, Сыр, Томаты" 
                    className="w-full border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Количество</label>
                    <input 
                      type="number" 
                      value={newQty}
                      onChange={(e) => setNewQty(parseInt(e.target.value) || 1)}
                      min="1" 
                      className="w-full border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Полка</label>
                    <select 
                      value={newShelf}
                      onChange={(e) => setNewShelf(e.target.value as Shelf)}
                      className="w-full border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="Верхняя">Верхняя</option>
                      <option value="Средняя">Средняя</option>
                      <option value="Нижняя">Нижняя</option>
                      <option value="Дверца">Дверца</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Срок годности (дней)</label>
                  <input 
                    type="number" 
                    value={newDays}
                    onChange={(e) => setNewDays(parseInt(e.target.value) || 0)}
                    min="0" 
                    className="w-full border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-lg text-sm transition-colors"
                  >
                    Отмена
                  </button>
                  <button 
                    onClick={addProduct}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors"
                  >
                    Добавить
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ item, onClick, isGrouped }: { item: Product, onClick: () => void, isGrouped: boolean }) {
  const isExpiring = item.daysLeft <= 1;
  
  return (
    <div 
      onClick={onClick}
      className={cn(
        "product-card relative flex flex-col items-center bg-white border border-slate-200 rounded-xl p-2 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 w-16 group transition-all",
        isExpiring && "bg-rose-50 border-rose-300"
      )}
    >
      <span className="text-3xl mb-1 select-none">{getEmoji(item.name)}</span>
      <span className="text-[10px] text-center font-medium truncate w-full text-slate-700">{item.name}</span>
      {item.qty > 1 && isGrouped && (
        <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
          {item.qty}
        </span>
      )}
      <span className={cn(
        "text-[8px] mt-0.5 font-semibold",
        isExpiring ? "text-rose-600 font-bold" : "text-slate-400"
      )}>
        {item.daysLeft} дн.
      </span>
      
      {/* Remove indicator on hover */}
      <div className="absolute inset-0 bg-rose-500/10 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center">
        <Trash2 className="w-4 h-4 text-rose-600 opacity-50" />
      </div>
    </div>
  );
}

import { createContext, useContext, useState } from 'react';

const TabsContext = createContext(null);

export function Tabs({ defaultValue, value, onValueChange, children, className = '' }) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = value ?? internalValue;

  const handleChange = (newValue) => {
    if (onValueChange) {
      onValueChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, onChange: handleChange }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '' }) {
  return (
    <div className={`flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto ${className}`}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className = '' }) {
  const context = useContext(TabsContext);
  const isActive = context?.value === value;

  return (
    <button
      type="button"
      onClick={() => context?.onChange(value)}
      className={`
        flex-1 min-w-0 px-4 py-2.5 min-h-[44px]
        flex items-center justify-center
        text-sm font-medium rounded-lg
        transition-colors whitespace-nowrap
        ${isActive
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-600 hover:text-gray-900'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className = '' }) {
  const context = useContext(TabsContext);

  if (context?.value !== value) {
    return null;
  }

  return (
    <div className={className}>
      {children}
    </div>
  );
}

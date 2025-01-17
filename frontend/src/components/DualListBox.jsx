import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, ChevronLeft } from 'lucide-react';

const DualListBox = ({ available, selected, onSelectionChange }) => {
  const [searchLeft, setSearchLeft] = useState('');
  const [searchRight, setSearchRight] = useState('');
  const [highlightedLeft, setHighlightedLeft] = useState([]);
  const [highlightedRight, setHighlightedRight] = useState([]);

  // Filter available items based on search
  const filteredAvailable = useMemo(() => {
    return available.filter(item => 
      !selected.includes(item) && 
      item.toLowerCase().includes(searchLeft.toLowerCase())
    );
  }, [available, selected, searchLeft]);

  // Filter selected items based on search
  const filteredSelected = useMemo(() => {
    return selected.filter(item => 
      item.toLowerCase().includes(searchRight.toLowerCase())
    );
  }, [selected, searchRight]);

  // Handle moving items from available to selected
  const handleMoveRight = () => {
    if (highlightedLeft.length === 0) return;
    const newSelected = [...selected, ...highlightedLeft];
    onSelectionChange(newSelected);
    setHighlightedLeft([]);
  };

  // Handle moving items from selected to available
  const handleMoveLeft = () => {
    if (highlightedRight.length === 0) return;
    const newSelected = selected.filter(item => !highlightedRight.includes(item));
    onSelectionChange(newSelected);
    setHighlightedRight([]);
  };

  // Toggle highlight status of an item
  const toggleHighlight = (item, side, highlighted, setHighlighted) => {
    if (highlighted.includes(item)) {
      setHighlighted(highlighted.filter(i => i !== item));
    } else {
      setHighlighted([...highlighted, item]);
    }
  };

  return (
    <div className="flex gap-4">
      {/* Available items */}
      <div className="flex-1 border rounded">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search available..."
              className="w-full pl-8 pr-2 py-1.5 border rounded"
              value={searchLeft}
              onChange={(e) => setSearchLeft(e.target.value)}
            />
          </div>
        </div>
        <div className="h-64 overflow-y-auto">
          {filteredAvailable.map(item => (
            <div
              key={item}
              className={`p-2 cursor-pointer hover:bg-gray-100 ${
                highlightedLeft.includes(item) ? 'bg-blue-100' : ''
              }`}
              onClick={() => toggleHighlight(item, 'left', highlightedLeft, setHighlightedLeft)}
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex flex-col justify-center gap-2">
        <button
          onClick={handleMoveRight}
          disabled={highlightedLeft.length === 0}
          className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={handleMoveLeft}
          disabled={highlightedRight.length === 0}
          className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Selected items */}
      <div className="flex-1 border rounded">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search selected..."
              className="w-full pl-8 pr-2 py-1.5 border rounded"
              value={searchRight}
              onChange={(e) => setSearchRight(e.target.value)}
            />
          </div>
        </div>
        <div className="h-64 overflow-y-auto">
          {filteredSelected.map(item => (
            <div
              key={item}
              className={`p-2 cursor-pointer hover:bg-gray-100 ${
                highlightedRight.includes(item) ? 'bg-blue-100' : ''
              }`}
              onClick={() => toggleHighlight(item, 'right', highlightedRight, setHighlightedRight)}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DualListBox;
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';
import { TMDBItem } from '../types';

interface MovieRowProps {
  title: string;
  items: TMDBItem[];
  onSelect: (item: TMDBItem) => void;
}

export default function MovieRow({ title, items, onSelect }: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4 py-4 group/row">
      <h2 className="text-xl md:text-2xl font-bold px-4 md:px-12 text-white/90 group-hover/row:text-white transition-colors">
        {title}
      </h2>
      
      <div className="relative px-4 md:px-12">
        <button
          className="absolute left-0 top-0 bottom-0 z-20 w-12 bg-black/50 opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center hover:bg-black/70"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>
        
        <div 
          ref={rowRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
        >
          {items.map((item, index) => (
            <MovieCard key={`${item.id}-${index}`} item={item} onSelect={onSelect} />
          ))}
        </div>

        <button
          className="absolute right-0 top-0 bottom-0 z-20 w-12 bg-black/50 opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center hover:bg-black/70"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>
      </div>
    </div>
  );
}

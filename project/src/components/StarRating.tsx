import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  className?: string;
}

const StarRating = ({ 
  rating, 
  maxRating = 5, 
  size = 'sm', 
  showNumber = true,
  className = ""
}: StarRatingProps) => {
  // Ensure rating is valid
  const validRating = isNaN(rating) ? 0 : Math.max(0, Math.min(rating, maxRating));
  
  // Size classes
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };
  
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // Calculate filled and empty stars
  const filledStars = Math.floor(validRating);
  const hasHalfStar = validRating % 1 >= 0.5;
  const emptyStars = maxRating - filledStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* Stars */}
      <div className="flex items-center gap-0.5">
        {/* Filled stars */}
        {Array.from({ length: filledStars }, (_, i) => (
          <Star 
            key={`filled-${i}`} 
            className={`${sizeClasses[size]} text-yellow-400 fill-current`} 
          />
        ))}
        
        {/* Half star */}
        {hasHalfStar && (
          <div className="relative">
            <Star className={`${sizeClasses[size]} text-gray-400`} />
            <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
              <Star className={`${sizeClasses[size]} text-yellow-400 fill-current`} />
            </div>
          </div>
        )}
        
        {/* Empty stars */}
        {Array.from({ length: emptyStars }, (_, i) => (
          <Star 
            key={`empty-${i}`} 
            className={`${sizeClasses[size]} text-gray-400`} 
          />
        ))}
      </div>
      
      {/* Rating number */}
      {showNumber && (
        <span className={`${textSizeClasses[size]} text-gray-300 font-medium`}>
          {validRating > 0 ? validRating.toFixed(1) : 'N/A'}
        </span>
      )}
    </div>
  );
};

export default StarRating;
